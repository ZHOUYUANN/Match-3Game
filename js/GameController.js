class GameController {
	constructor(gameState, gameRenderer, gameLogic, gameSound, skillManager, gameHistory) {
		this.state = gameState
		this.renderer = gameRenderer
		this.logic = gameLogic
		this.soundManager = gameSound
		this.skillManager = skillManager
		this.history = gameHistory

		this.touch = false
		this.animal = null
		this.draggingBlock = null
		this.dragStartX = null
		this.dragStartCol = null
		this.currentBlockGroup = null
		this.isSelectingSkillTarget = false

		this.restartBtn = document.getElementById('restartBtn')
		this.hintBtn = document.getElementById('hintBtn')

		this.skillTextElement = document.getElementById('skillText')
		this.gameMaskElement = document.getElementById('gameMask')
		this.maskCancelElement = document.getElementById('maskCancel')
	}

	setupEventListeners() {
		this.renderer.gameWrapper.addEventListener('mousedown', this.handleMouseDown.bind(this))
		this.renderer.gameWrapper.addEventListener('touchstart', this.handleMouseDown.bind(this))

		this.restartBtn.addEventListener('click', this.handleRestart.bind(this))
		this.hintBtn.addEventListener('click', this.handleHint.bind(this))

		// 添加技能按钮事件
		this.skillTextElement.addEventListener('click', this.handleSkillTextClick.bind(this))
		this.maskCancelElement.addEventListener('click', this.handleMaskCancelClick.bind(this))
	}

	handleMaskCancelClick() {
		this.isSelectingSkillTarget = false
		this.gameMaskElement.classList.remove('show')
	}

	handleSkillTextClick() {
		if (this.state.skill.skillPoint <= 0) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
		if (this.isSelectingSkillTarget || this.state.isFreezeMode || this.state.isAnimating || this.state.gameOver) {
			return
		}
		this.soundManager.play('falling')
		// 进入“等待选择技能目标”模式
		this.isSelectingSkillTarget = true
		this.gameMaskElement.classList.add('show')
	}

	handleMouseDown(e) {
		const block = e.target.closest('.block')
		if (!block) return
		if (e.type === 'mousedown' && e.which !== 1) return
		if (e.type === 'touchstart' && e.touches.length > 1) return
		if (this.state.isAnimating) return
		if (this.state.gameOver) {
			this.renderer.showMessage({ message: '游戏结束，请点击重新开始按钮！' })
			return
		}
		// 新增：处理技能目标选择
		if (this.isSelectingSkillTarget) {
			const row = Number(block.dataset.row)
			const col = Number(block.dataset.col)
			const blockData = this.state.board[row][col]

			this.gameMaskElement.classList.remove('show')

			// 找到有效的目标，激活技能
			this.isSelectingSkillTarget = false
			this.state.skill.skillPoint--

			// 更新阈值和最大值
			const newThreshold = this.state.skill.maxPoints - this.state.skill.threshold
			this.state.skill.maxPoints = this.state.skill.maxPoints + this.state.skill.threshold
			this.state.skill.currentPoints = this.state.skill.currentPoints - this.state.skill.threshold
			this.state.skill.threshold = newThreshold

			this.skillManager.activateSkill(blockData)

			return
		}

		this.draggingBlock = block
		this.dragStartX = this.getClientX(e)
		this.dragStartCol = Number(block.dataset.col)

		const blockId = Number(block.dataset.blockId)
		const row = Number(block.dataset.row)
		const col = Number(block.dataset.col)
		const length = Number(block.dataset.length)

		// 记录当前拖动的方块组信息
		this.currentBlockGroup = {
			id: blockId,
			row: row,
			startCol: col,
			length: length
		}

		// 设置默认的block位置显示
		const cellSize = this.state.cellSize
		const gap = this.state.gap
		const left = col * (cellSize + gap)
		const top = row * (cellSize + gap)
		const width = length * cellSize + (length - 1) * gap

		this.draggingBlock.classList.add('dragging')
		// 设置默认位置的block位置
		this.renderer.defaultBlockMarker.style.width = `${width}px`
		this.renderer.defaultBlockMarker.style.height = `${cellSize}px`
		this.renderer.defaultBlockMarker.style.transform = `translate(${left}px, ${top}px)`
		this.renderer.defaultBlockMarker.style.visibility = 'visible'

		// 设置拖拽的block位置
		this.renderer.dragBlockMarker.style.width = `${width}px`
		this.renderer.dragBlockMarker.style.transform = `translateX(${left}px)`
		this.renderer.dragBlockMarker.style.visibility = 'visible'

		// 设置触摸类型
		this.touch = e.type === 'touchstart'
		document.addEventListener(this.touch ? 'touchmove' : 'mousemove', this.handleMouseMove.bind(this)),
			{ passive: false }
		document.addEventListener(this.touch ? 'touchend' : 'mouseup', this.handleMouseUp.bind(this), false)
	}

	handleMouseMove(e) {
		if (!this.draggingBlock || !this.currentBlockGroup || this.state.isAnimating) return

		const deltaX = this.getClientX(e) - this.dragStartX

		const cellSize = this.state.cellSize
		const gap = this.state.gap
		// 计算最大可移动范围
		const maxLeft = this.calculateMaxLeftMove(this.currentBlockGroup)
		const maxRight = this.calculateMaxRightMove(this.currentBlockGroup)
		// 限制拖动范围
		const limitedDeltaX = Math.max(-maxLeft * (cellSize + gap), Math.min(maxRight * (cellSize + gap), deltaX))
		const transformX = this.currentBlockGroup.startCol * (cellSize + gap) + limitedDeltaX
		const transformY = this.currentBlockGroup.row * (cellSize + gap)

		const block = document.querySelector(`.block[data-block-id="${this.currentBlockGroup.id}"]`)
		let scaleX = 1
		if (block.dataset.direction) {
			if (block.dataset.direction === 'left') {
				scaleX = 1
			} else {
				scaleX = -1
			}
		} else {
			scaleX = 1
		}
		block.style.transform = `translate(${transformX}px, ${transformY}px) scaleX(${scaleX})`

		// 更新拖拽的block位置
		this.renderer.dragBlockMarker.style.transform = `translateX(${transformX}px)`
	}

	async handleMouseUp(e) {
		if (!this.draggingBlock || !this.currentBlockGroup || this.state.isAnimating) return

		const deltaX = this.getClientX(e) - this.dragStartX

		const cellSize = this.state.cellSize
		const gap = this.state.gap

		const maxLeft = this.calculateMaxLeftMove(this.currentBlockGroup)
		const maxRight = this.calculateMaxRightMove(this.currentBlockGroup)
		const limitedDeltaX = Math.max(-maxLeft * (cellSize + gap), Math.min(maxRight * (cellSize + gap), deltaX))

		let moveCells = Math.round(deltaX / (cellSize + gap))

		moveCells = Math.max(-maxLeft, Math.min(maxRight, moveCells))
		if (Math.abs(deltaX) < (cellSize + gap) / 3) {
			moveCells = 0
		}

		this.state.isAnimating = true
		this.draggingBlock.classList.remove('dragging')
		this.renderer.gameWrapper.classList.add('game-disabled')
		this.renderer.defaultBlockMarker.style.visibility = 'hidden'
		this.renderer.dragBlockMarker.style.visibility = 'hidden'

		// 执行移动动画
		await this.blockMove(this.currentBlockGroup.startCol + moveCells, limitedDeltaX)
		if (moveCells !== 0) {
			if (this.state.isFreezeMode) {
				this.state.freezeMovesLeft--

				await this.logic.processGameEffects()
				// 检查是否可以结束冰冻模式
				this.skillManager.checkFreezeModeEnd()
			} else {
				// 增加回合数
				this.state.round++

				await this.logic.processGameEffects()
				// 检查狮子方块
				await this.logic.checkLionBlock()
				await this.logic.addNewRow()
				await this.logic.processGameEffects()

				// 检测如果初始化游戏时都消除了，继续添加新行
				if (this.state.board[this.state.boardSizeH - 1].every((cell) => cell === null)) {
					console.log('全部方块清空了')
					await this.logic.addNewRow()
				}
			}
			this.renderer.updateScore()
		}

		// 重置连击计数
		this.state.currentCombo = 0
		this.renderer.gameWrapper.classList.remove('game-disabled')
		this.state.isAnimating = false

		// 保存历史记录
		this.history.save({
			state: {
				...this.state
			},
			nextRow: this.renderer.nextRow
		})
		this.draggingBlock = null
		this.dragStartX = null
		this.dragStartCol = null
		this.currentBlockGroup = null

		document.removeEventListener(this.touch ? 'touchmove' : 'mousemove', this.handleMouseMove, { passive: false })
		document.removeEventListener(this.touch ? 'touchend' : 'mouseup', this.handleMouseUp, false)
	}

	blockMove(targetStartCol, limitedDeltaX) {
		return new Promise(async (resolve) => {
			const row = this.currentBlockGroup.row
			const length = this.currentBlockGroup.length
			const startCol = this.currentBlockGroup.startCol

			// 更新数据
			const blockData = this.state.board[row][startCol]

			// 清除原位置
			for (let c = startCol; c < startCol + length; c++) {
				this.state.board[row][c] = null
			}

			// 放置到新位置
			for (let c = targetStartCol; c < targetStartCol + length; c++) {
				this.state.board[row][c] = {
					id: blockData.id,
					length: blockData.length,
					startCol: targetStartCol,
					animal: blockData.animal
				}
			}

			await this.renderer.animateBlock(
				[
					{
						blockId: blockData.id,
						startRow: row,
						endRow: row,
						startCol: startCol,
						endCol: targetStartCol,
						length: length,
						limitedDeltaX
					}
				],
				'move'
			)
			resolve()
		})
	}

	handleRestart() {
		this.state.reset()
		this.renderer.render()
		this.logic.initializeGame()
	}

	handleHint() {
		this.renderer.showMessage({ message: '正在开发中！' })
	}

	calculateMaxLeftMove(blockGroup) {
		let maxLeft = blockGroup.startCol
		for (let col = blockGroup.startCol - 1; col >= 0; col--) {
			if (this.state.board[blockGroup.row][col] === null) {
				maxLeft--
			} else {
				break
			}
		}
		return blockGroup.startCol - maxLeft
	}

	calculateMaxRightMove(blockGroup) {
		let maxRight = blockGroup.startCol + blockGroup.length - 1
		for (let col = maxRight + 1; col < this.state.boardSizeX; col++) {
			if (this.state.board[blockGroup.row][col] === null) {
				maxRight++
			} else {
				break
			}
		}
		return maxRight - (blockGroup.startCol + blockGroup.length - 1)
	}

	getClientX(e) {
		return e.touches ? (e.touches[0] || e.changedTouches[0]).clientX : e.clientX
	}
}
