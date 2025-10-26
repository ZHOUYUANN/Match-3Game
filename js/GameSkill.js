class GameSkill {
	constructor(gameState, gameRenderer, gameLogic) {
		this.state = gameState
		this.renderer = gameRenderer
		this.logic = gameLogic

		// 技能映射表
		this.skillMap = {
			// ostrich: this.handleOstrichSkill.bind(this),
			// zebra: this.handleZebraSkill.bind(this),
			// deer: this.handleDeerSkill.bind(this),
			// elephant: this.handleElephantSkill.bind(this),
			lion: this.handleLionSkill.bind(this),
			bear: this.handleBearSkill.bind(this)
		}
	}

	// 处理技能点击
	async activateSkill(block) {
		const skillHandler = this.skillMap[block.animal]

		if (!skillHandler) return
		if (this.state.gameOver) return
		if (this.state.isAnimating) return

		this.state.isAnimating = true
		await skillHandler()
		this.state.isAnimating = false
	}

	// 北极熊技能：进入冰冻模式，所有野牛长度变为1，直到北极熊方块用完
	async handleBearSkill() {
		let blocks = []
		let blocks2 = []
		// 计算可移动次数（棋盘上北极熊方块的数量）
		const bearBlocks = document.querySelectorAll('.block[data-animal="bear"]')
		const nextRowBearBlocks = this.renderer.nextRow.reduce((acc, item) => {
			if (item && item.animal === 'bear' && !acc.includes(item.id)) {
				acc.push(item.id)
			}
			return acc
		}, []).length
		this.state.freezeMovesLeft = bearBlocks.length - nextRowBearBlocks

		if (this.state.freezeMovesLeft === 0) {
			this.renderer.showMessage({ message: '没有可用的北极熊！' })
			return
		}

		this.renderer.gameContainerElement.classList.add('winter')

		// 进入冰冻模式
		this.state.isFreezeMode = true

		// 设置所有野牛长度为1
		for (let row = 0; row < this.state.boardSizeH; row++) {
			for (let col = 0; col < this.state.boardSizeX; col++) {
				const blockData = this.state.board[row][col]
				if (blockData && blockData.animal === 'bear') {
					if (!blocks.find((b) => b.blockId === blockData.id)) {
						blocks.push({
							blockId: blockData.id,
							startRow: row,
							startCol: col,
							animal: blockData.animal
						})
					}
				}
				if (blockData && blockData.animal === 'buffalo') {
					this.state.board[row][col] = null
					if (!blocks2.find((b) => b.blockId === blockData.id)) {
						blocks2.push({
							blockId: blockData.id,
							startLength: blockData.length,
							endLength: 1,
							startRow: row,
							startCol: col,
							animal: blockData.animal
						})
						this.state.board[row][col] = {
							...blockData,
							length: 1
						}
					}
				}
			}
		}

		// 如果没有北极熊方块，直接返回
		if (!blocks.length) return

		await this.renderer.animateBlock(blocks, 'skill')
		await this.renderer.animateBlock(blocks2, 'buffalo')
		await this.state.sleep(500)
		this.logic.processGameEffects()
	}

	// --------------------------- 狮子技能 --------------------------
	// 狮子技能：延长并吞并相邻的动物
	async handleLionSkill() {
		let blocks = []

		// 查找所有狮子方块并处理
		for (let row = 0; row < this.state.boardSizeH; row++) {
			for (let col = 0; col < this.state.boardSizeX; col++) {
				const blockData = this.state.board[row][col]
				if (blockData && blockData.animal === 'lion') {
					if (!blocks.find((b) => b.blockId === blockData.id)) {
						const rowData = this.state.board[row]
						const initialDirection = this.getInitialDirection(rowData, blockData.startCol, blockData.length)
						const plan = this.processDirection(rowData, blockData, initialDirection)

						this.state.board[row] = plan.finalData
						blocks.push({
							blockId: blockData.id,
							startLength: blockData.length,
							startRow: row,
							startCol: col,
							animal: blockData.animal,
							plan
						})
					}
				}
			}
		}

		// 如果没有狮子方块，直接返回
		if (!blocks.length) return

		await this.renderer.animateBlock(blocks, 'skill')
		// 依次动画
		for (let block of blocks) {
			await this.renderer.animateBlock([block], 'lion')
		}

		await this.state.sleep(500)
		this.logic.processGameEffects()
	}

	// 获取初始移动方向
	getInitialDirection(data, targetStartCol, targetLength) {
		const targetEndCol = targetStartCol + targetLength - 1
		let leftDist = Infinity
		let rightDist = Infinity
		// 1. 边界检查
		if (targetStartCol === 0) return 'right'
		if (targetEndCol === data.length - 1) return 'left'
		for (let i = targetStartCol - 1; i >= 0; i--)
			if (data[i] !== null) {
				leftDist = targetStartCol - i
				break
			}
		for (let i = targetEndCol + 1; i < data.length; i++)
			if (data[i] !== null) {
				rightDist = i - targetEndCol
				break
			}
		return leftDist <= rightDist ? 'left' : 'right'
	}

	// 处理移动和吞并逻辑
	processDirection(data, predatorBlock, initialDirection) {
		const simData = JSON.parse(JSON.stringify(data))
		const simPredator = { ...predatorBlock }

		let direction = initialDirection
		let step = direction === 'left' ? -1 : 1
		let remainingEnergy = 1
		let nextIndex = direction === 'left' ? simPredator.startCol : simPredator.startCol + simPredator.length - 1

		let lookAheadPos = null
		let turnAroundState = null
		const eatenBlockIdsFirst = []
		const eatenBlockIdsSecond = []

		while (remainingEnergy > 0 || data[lookAheadPos] !== null) {
			const targetPos = nextIndex + step
			// 查看下个位置是否是可以捕食的边界
			lookAheadPos = targetPos + step
			if (targetPos < 0 || targetPos >= simData.length) {
				remainingEnergy--
				if (remainingEnergy < 0) break

				step = -step
				direction = direction === 'left' ? 'right' : 'left'
				nextIndex = step === 1 ? simPredator.startCol + simPredator.length - 1 : simPredator.startCol

				// 在掉头前，记录下当前的状态
				if (!turnAroundState) {
					turnAroundState = {
						startCol: simPredator.startCol,
						length: simPredator.length
					}
				}
				continue
			}
			nextIndex = targetPos
			if (simData[nextIndex] !== null) {
				const blockToEat = simData[nextIndex]
				const length = blockToEat.length
				const rangeToMerge = { start: blockToEat.startCol, end: blockToEat.startCol + length - 1 }

				if (blockToEat.id) {
					const eatenBlockIds = turnAroundState ? eatenBlockIdsSecond : eatenBlockIdsFirst
					eatenBlockIds.push(blockToEat.id)
				}
				this.mergeRangeIntoPredator(simData, simPredator, rangeToMerge, direction)
				remainingEnergy += length
				nextIndex = direction === 'left' ? rangeToMerge.start : rangeToMerge.end
			} else {
				const rangeToMerge = { start: nextIndex, end: nextIndex }
				this.mergeRangeIntoPredator(simData, simPredator, rangeToMerge, direction)
				remainingEnergy--
			}
		}

		// 返回结果对象
		return {
			finalData: simData,
			eatenBlockIdsFirst,
			eatenBlockIdsSecond,
			turnAroundState: turnAroundState,
			finalState: {
				startCol: simPredator.startCol,
				length: simPredator.length
			}
		}
	}

	// 合并范围到捕食者方块
	mergeRangeIntoPredator(data, predatorBlock, range, direction) {
		const { start, end } = range
		const lengthToAdd = end - start + 1

		const newLength = predatorBlock.length + lengthToAdd
		const newStartCol = direction === 'left' ? predatorBlock.startCol - lengthToAdd : predatorBlock.startCol

		for (let i = start; i <= end; i++) {
			data[i] = {
				...predatorBlock,
				length: newLength,
				startCol: newStartCol
			}
		}

		for (let i = 0; i < data.length; i++) {
			if (data[i] && data[i].id === predatorBlock.id) {
				data[i] = {
					...predatorBlock,
					length: newLength,
					startCol: newStartCol
				}
			}
		}

		predatorBlock.length = newLength
		predatorBlock.startCol = newStartCol
	}

	// -------------------------- 其他动物技能占位符 --------------------------

	async handleElephantSkill() {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleDeerSkill() {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleZebraSkill() {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleOstrichSkill() {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	// 检查是否可以结束冰冻模式
	checkFreezeModeEnd() {
		if (this.state.isFreezeMode && this.state.freezeMovesLeft === 0) {
			this.state.isFreezeMode = false
			this.renderer.gameContainerElement.classList.remove('winter')
		}
	}
}
