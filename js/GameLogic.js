class GameLogic {
	constructor(gameState, gameRenderer, gameSound, gameHistory) {
		this.state = gameState
		this.renderer = gameRenderer
		this.soundManager = gameSound
		this.history = gameHistory
	}

	// 初始化游戏
	async initializeGame() {
		await this.addNewRow()
		await this.addNewRow()
		// 检测并处理初始状态下的掉落和消除
		await this.processGameEffects()

		// 检测如果初始化游戏时都消除了，继续添加新行
		if (this.state.board[this.state.boardSizeH - 1].every((cell) => cell === null)) {
			console.log('全部方块清空了')
			this.addNewRow()
		}

		// 更新回合显示
		this.renderer.updateScore()
	}

	// 添加新行并处理后续效果
	async addNewRow() {
		await this.moveAllBlocksUp()
		this.updateBoardState(this.renderer.nextRow)
		this.renderer.renderPreview()
	}

	moveAllBlocksUp() {
		return new Promise(async (resolve) => {
			let blocks = []
			let isBuffalo = false

			// 获取所有顶行的方块
			const blockDoms = document.querySelectorAll('.block[data-row="0"]')
			if (blockDoms.length) {
				this.state.gameOver = true
				this.renderer.showMessage({ message: '游戏结束！' })
				this.history.clearHistory()
				return
			}

			// 上升棋盘中 block
			for (let row = 0; row < this.state.boardSizeH; row++) {
				for (let col = 0; col < this.state.boardSizeX; col++) {
					if (this.state.board[row][col] === null || this.state.board[row][col].startCol !== col) continue
					const blockData = this.state.board[row][col]
					const blockLength = blockData.length
					blocks.push({
						blockId: blockData.id,
						startRow: row,
						endRow: row - 1,
						startCol: col,
						endCol: col,
						length: blockLength
					})
				}
			}
			// 上升隐藏的 nextRow block
			for (let col = 0; col < this.state.boardSizeX; col++) {
				if (this.renderer.nextRow[col] === null || this.renderer.nextRow[col].startCol !== col) continue
				const blockData = this.renderer.nextRow[col]
				const blockLength = blockData.length
				blocks.push({
					blockId: blockData.id,
					startRow: this.state.boardSizeH,
					endRow: this.state.boardSizeH - 1,
					startCol: col,
					endCol: col,
					length: blockLength
				})
				isBuffalo = blockData.animal === 'buffalo'
			}
			// 如果没有方块，直接返回
			if (!blocks.length) {
				resolve()
				return
			}
			// 如果新行是野牛，显示提示信息
			if (isBuffalo) {
				// 播放野牛音效
				this.soundManager.play('buffalo', {
					volume: 0.4
				})
				const buffalo = document.getElementById('gameBuffalo')
				const duration = 1600
				buffalo.classList.add('show')
				buffalo.style.animationDuration = `${duration}ms`
				setTimeout(() => buffalo.classList.remove('show'), duration)
			}
			await this.renderer.animateBlock(blocks, 'rising')
			resolve()
		})
	}

	// 检测狮子方块长度，并减少长度
	checkLionBlock() {
		return new Promise(async (resolve) => {
			const blocks = []

			// 检测狮子技能长度
			for (let row = 0; row < this.state.boardSizeH; row++) {
				for (let col = 0; col < this.state.boardSizeX; col++) {
					if (!this.state.board[row][col]) continue
					const blockData = this.state.board[row][col]
					const lionData = this.renderer.lions.get(blockData.id)
					if (lionData && blockData.length > 3) {
						if (!blocks.find((b) => b.blockId === blockData.id)) {
							const map = {
								left: {
									col: blockData.startCol + blockData.length - 1,
									endCol: col
								},
								right: {
									col: blockData.startCol,
									endCol: col + 1
								}
							}
							// 更新狮子方块数据
							this.state.board[row][map[lionData.direction].col] = null
							const data = {
								blockId: blockData.id,
								startRow: row,
								endRow: row,
								startCol: col,
								endCol: map[lionData.direction].endCol,
								startLength: blockData.length,
								endLength: blockData.length - 1,
								animal: blockData.animal
							}
							blocks.push(data)
						}
						// 只减少长度
						if (this.state.board[row][col]) {
							this.state.board[row][col].length = blockData.length - 1
							if (lionData.direction === 'right') {
								this.state.board[row][col].startCol = blockData.startCol + 1
							}
						}
					}
				}
			}

			// 如果没有方块，直接返回
			if (!blocks.length) {
				resolve()
				return
			}
			await this.renderer.animateBlock(blocks, 'buffalo')
			resolve()
		})
	}

	updateBoardState(newRow) {
		// 更新游戏状态中的board数组
		for (let row = 0; row < this.state.boardSizeH - 1; row++) {
			this.state.board[row] = [...this.state.board[row + 1]]
		}
		this.state.board[this.state.boardSizeH - 1] = newRow
	}

	// 处理游戏效果（掉落、消除等）
	async processGameEffects() {
		let hasChanges
		do {
			hasChanges = false

			// 应用重力
			const fell = await this.applyGravity()

			// 检查消除
			const eliminated = await this.checkEliminations()

			hasChanges = fell || eliminated
		} while (hasChanges)
	}

	// 应用重力（返回是否有方块掉落）
	applyGravity() {
		return new Promise(async (resolve) => {
			let moved
			let blocks = []
			do {
				moved = false

				// 从下往上检查
				for (let row = this.state.boardSizeH - 2; row >= 0; row--) {
					for (let col = 0; col < this.state.boardSizeX; col++) {
						// 只处理每个方块组的第一个格子
						if (this.state.board[row][col] === null || this.state.board[row][col].startCol !== col) continue

						const blockData = this.state.board[row][col]
						const blockLength = blockData.length

						// 检查下方是否有足够连续的空位
						let canFall = true
						for (let c = col; c < col + blockLength; c++) {
							if (this.state.board[row + 1][c] !== null) {
								canFall = false
								break
							}
						}

						// 如果可以下落，移动整个方块组
						if (canFall) {
							// 移动数据
							for (let c = col; c < col + blockLength; c++) {
								this.state.board[row + 1][c] = this.state.board[row][c]
								this.state.board[row][c] = null
							}

							// 记录移动的方块组
							const block = blocks.find((b) => b.blockId === blockData.id)
							if (block) {
								block.endRow = row + 1
							} else {
								blocks.push({
									blockId: blockData.id,
									startRow: row,
									endRow: row + 1,
									startCol: col,
									endCol: col,
									length: blockLength
								})
							}

							moved = true
							col += blockLength - 1 // 跳过已处理的方块组
						}
					}
				}
			} while (moved)

			await this.renderer.animateBlock(blocks, 'falling')
			resolve(moved)
		})
	}

	// 检查并执行消除（返回是否有消除发生）
	checkEliminations() {
		return new Promise(async (resolve) => {
			let blocks = []
			let blocks2 = []
			let elimination = false
			// 本次消除获得的积分
			let pointsEarned = 0
			let pointsEarned2 = 0

			for (let row = 0; row < this.state.boardSizeH; row++) {
				// 该行有空格，跳过
				if (this.state.board[row].some((cell) => cell === null)) continue
				// 该行无空格，执行消除
				elimination = true
				this.state.currentCombo++

				// 消除该行
				for (let col = 0; col < this.state.boardSizeX; col++) {
					if (!this.state.board[row][col]) continue

					// 计算连击倍数
					const index = Math.min(this.state.currentCombo - 1, this.state.multipliers.length - 1)
					const blockData = this.state.board[row][col]

					// 检查是否是野牛标记的方块
					if (blockData.animal !== 'buffalo') {
						if (!blocks.find((b) => b.blockId === blockData.id)) {
							const comboMultiplier = blockData.length * 10 * this.state.multipliers[index]
							blocks.push({
								blockId: blockData.id,
								startRow: row,
								endRow: row,
								startCol: col,
								endCol: col,
								length: blockData.length,
								animal: blockData.animal,
								comboMultiplier
							})
							// 计算积分：方块长度 × 10 × 连击倍数
							pointsEarned += comboMultiplier
							pointsEarned2 += blockData.length * 10
						}
						this.state.board[row][col] = null
					} else {
						if (!blocks2.find((b) => b.blockId === blockData.id)) {
							// 找到野牛方块的最后一个格子
							const lastCol = blockData.startCol + blockData.length - 1
							// 更新野牛方块数据
							this.state.board[row][lastCol] = null
							const data = {
								blockId: blockData.id,
								startRow: row,
								endRow: row,
								startCol: col,
								endCol: col,
								startLength: blockData.length,
								endLength: blockData.length - 1,
								animal: blockData.animal
							}
							// 如果野牛消除只剩下一格，积分固定200
							if (data.startLength === 1) {
								const comboMultiplier = 200 * this.state.multipliers[index]
								blocks.push({
									...data,
									length: 200,
									comboMultiplier
								})
								pointsEarned += comboMultiplier
								pointsEarned2 += 200
							} else {
								blocks2.push(data)
							}
						}
						// 只减少长度
						if (this.state.board[row][col]) {
							this.state.board[row][col].length = blockData.length - 1
						}
					}
				}
			}

			if (elimination) {
				const messages = {
					2: '双连击！',
					3: '三连击！！',
					4: '四连击！！！',
					5: '五连击！！！！超神！'
				}

				const message = messages[this.state.currentCombo] || `${this.state.currentCombo}连击！`
				if (messages[this.state.currentCombo]) {
					this.renderer.showMessage({ message })
				}
				// 添加积分
				this.state.addPoints(pointsEarned, pointsEarned2)

				const animations = [this.renderer.animateBlock(blocks, 'eliminating')]
				if (blocks2.length) {
					animations.push(this.renderer.animateBlock(blocks2, 'buffalo'))
				}

				await Promise.all(animations)
			}
			resolve(elimination)
		})
	}
}
