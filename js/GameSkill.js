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
			// lion: this.handleLionSkill.bind(this),
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
		await skillHandler(block)
		this.state.isAnimating = false
	}

	async handleBearSkill(block) {
		let blocks = []
		let blocks2 = []
		// 计算可移动次数（棋盘上北极熊方块的数量）
		const bearBlocks = document.querySelectorAll('.block[data-animal="bear"]')
		this.state.freezeMovesLeft = bearBlocks.length

		if (this.state.freezeMovesLeft === 0) {
			this.renderer.showMessage({ message: '没有可用的北极熊！' })
			return
		}

		this.renderer.gameContainerElement.classList.add('winter')

		// 进入冰冻模式
		this.state.isFreezeMode = true
		this.renderer.showMessage({ message: `进入冰冻模式！可移动${this.state.freezeMovesLeft}次`, timer: 2000 })

		// 设置所有野牛长度为1
		for (let row = 0; row < this.state.boardSizeH; row++) {
			for (let col = 0; col < this.state.boardSizeX; col++) {
				const blockData = this.state.board[row][col]
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
			}
		}

		// 如果没有北极熊方块，直接返回
		if (!blocks.length) return

		await this.renderer.animateBlock(blocks, 'skill')
		await this.renderer.animateBlock(blocks2, 'buffalo')
		await this.state.sleep(500)
		this.logic.processGameEffects()
	}

	async handleLionSkill(block) {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleElephantSkill(block) {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleDeerSkill(block) {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleZebraSkill(block) {
		// 消耗技能点
		if (this.state.skill.skillPoint < 1) {
			this.renderer.showMessage({ message: '技能点不足！' })
			return
		}
	}

	async handleOstrichSkill(block) {
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
