class GameRenderer {
	constructor(gameState, gameSound) {
		this.state = gameState
		this.soundManager = gameSound
		this.gameWrapper = gameState.options.el

		this.maxBottom = 20

		this.scoreElement = document.getElementById('score')

		// 新增UI元素
		this.skillTextElement = document.getElementById('skillText')
		this.skillPointElement = document.getElementById('skillPoint')
		this.buffaloCountdownElement = document.getElementById('buffaloCountdown')
		this.roundElement = document.getElementById('round')
		this.currentPointsElement = document.getElementById('currentPoints')
		this.nextThresholdElement = document.getElementById('nextThreshold')
		this.skillProgressFillElement = document.getElementById('skillProgressFill')
		this.animalsElement = document.getElementById('animals')
		this.gameContainerElement = document.getElementById('gameContainer')
	}

	// 初始渲染
	render() {
		this.renderUI()
		this.renderGrid()
		this.renderPreview()

		// 画布渲染之后设置 cellSize 大小
		const cell = document.querySelector('.cell')
		const rect = cell.getBoundingClientRect()
		this.state.cellSize = rect.width
		this.defaultBlockMarker.style.width = `${this.state.cellSize}px`
		this.defaultBlockMarker.style.height = `${this.state.cellSize}px`
		this.dragBlockMarker.style.width = `${this.state.cellSize}px`

		// 设置背景音乐
		// this.soundManager.play('background', {
		// 	loop: true
		// })
	}

	renderUI() {}

	renderGrid() {
		this.gameWrapper.innerHTML = ''
		const fragment = document.createDocumentFragment()
		const gameBoard = document.createElement('div')
		gameBoard.classList.add('game-board')
		gameBoard.style.gap = `${this.state.gap}px`
		gameBoard.style.gridTemplateRows = `repeat(${this.state.boardSizeH}, 1fr)`

		const gameMarker = document.createElement('div')
		gameMarker.classList.add('game-marker')

		for (let row = 0; row < this.state.boardSizeH; row++) {
			const rowDiv = document.createElement('div')
			rowDiv.className = 'row'
			rowDiv.style.gap = `${this.state.gap}px`
			rowDiv.style.gridTemplateColumns = `repeat(${this.state.boardSizeX}, 1fr)`

			for (let col = 0; col < this.state.boardSizeX; col++) {
				const cell = document.createElement('div')
				cell.className = 'cell'
				cell.dataset.row = row
				cell.dataset.col = col
				rowDiv.appendChild(cell)
			}

			fragment.appendChild(rowDiv)
		}

		// 创建两个标记，一个是默认的block位置，一个是拖拽的block位置
		const defaultBlockMarker = document.createElement('div')
		defaultBlockMarker.id = 'defaultBlockMarker'
		defaultBlockMarker.className = 'block-default-marker'

		const dragBlockMarker = document.createElement('div')
		dragBlockMarker.id = 'dragBlockMarker'
		dragBlockMarker.className = 'block-drag-marker'

		fragment.appendChild(defaultBlockMarker)
		fragment.appendChild(dragBlockMarker)
		gameBoard.appendChild(fragment)

		this.gameWrapper.appendChild(gameBoard)
		this.gameWrapper.appendChild(gameMarker)

		this.gameBoard = gameBoard
		this.gameMarker = gameMarker
		this.defaultBlockMarker = defaultBlockMarker
		this.dragBlockMarker = dragBlockMarker
	}

	renderPreview() {
		this.gameMarker.innerHTML = ''
		const fragment = document.createDocumentFragment()
		const row = 0
		const newRow = this.state.generateNewRow()

		// 特殊行：包含连续的5个方块
		for (let col = 0; col < this.state.boardSizeX; col++) {
			const blockData = newRow[col]
			if (blockData !== null && blockData.startCol === col) {
				const block = this.createBlockElement(row, col, blockData, `marker`)
				fragment.appendChild(block)
			}
		}

		this.nextRow = newRow
		this.gameMarker.appendChild(fragment)

		this.renderBlocks(newRow)
	}

	renderBlocks(newRowData) {
		const fragment = document.createDocumentFragment()
		const row = this.state.boardSizeH

		for (let col = 0; col < this.state.boardSizeX; col++) {
			const blockData = newRowData[col]
			if (blockData !== null && blockData.startCol === col) {
				const block = this.createBlockElement(row, col, blockData, `block ${blockData.animal}`)
				fragment.appendChild(block)
			}
		}

		this.gameBoard.appendChild(fragment)
	}

	async renderAnimals(blocks) {
		for (const [index, block] of blocks.entries()) {
			// 随机等待时间，确保第二波动物不会和第一波重叠
			await this.state.sleep(this.state.getRandomInt(300, 1300))
			// 随机时间
			const randomTime = this.state.getRandomInt(7000, 9000)
			// 固定高度
			const bottom = this.maxBottom - index

			const animal = document.createElement('div')
			animal.classList.add(`animal-${block.animal}`)
			animal.style.bottom = `${bottom}%`
			if (blocks.animal !== 'buffalo') {
				animal.style.animationDuration = `${randomTime}ms`
			}

			this.maxBottom = bottom
			this.animalsElement.appendChild(animal)

			this.manageAnimalLifecycle(animal, randomTime)
		}
	}

	async manageAnimalLifecycle(animal, duration) {
		// 等待动画结束
		await this.state.sleep(duration)
		this.animalsElement.removeChild(animal)
	}

	createBlockElement(row, col, blockData, className) {
		const block = document.createElement('div')
		block.className = className
		block.dataset.row = row
		block.dataset.col = col
		block.dataset.animal = blockData.animal
		block.dataset.length = blockData.length
		block.dataset.blockId = blockData.id

		const cellSize = this.state.cellSize
		const gap = this.state.gap
		const left = col * (cellSize + gap)
		const top = row * (cellSize + gap)
		const width = blockData.length * cellSize + (blockData.length - 1) * gap

		block.style.width = `${width}px`
		block.style.height = `${cellSize}px`
		block.style.transform = `translate(${left}px, ${top}px)`

		return block
	}

	updateScore() {
		const { currentPoints, maxPoints, threshold } = this.state.skill
		this.roundElement.textContent = this.state.round
		this.scoreElement.textContent = this.state.score
		// 更新技能点显示
		this.buffaloCountdownElement.textContent = this.state.nextBuffaloRound - this.state.round

		// 计算进度条比例
		const firstSegment = Math.min(currentPoints, threshold)
		const secondSegment = Math.max(0, currentPoints - threshold)

		const firstWidth = (firstSegment / threshold) * 100
		const secondWidth = (secondSegment / (maxPoints - threshold)) * 100

		this.currentPointsElement.textContent = currentPoints
		this.nextThresholdElement.textContent = threshold
		this.skillProgressFillElement.style.setProperty('--first-width', `${firstWidth}%`)
		this.skillProgressFillElement.style.setProperty('--second-width', `${secondWidth}%`)

		this.updateFreezeSkill()
		this.checkGameOver()
	}

	// 更新冻结技能按钮
	updateFreezeSkill() {
		if (this.state.skill.skillPoint > 0) {
			this.skillPointElement.classList.add('active')
			this.skillTextElement.classList.add('active')
		} else {
			this.skillPointElement.classList.remove('active')
			this.skillTextElement.classList.remove('active')
		}
	}

	checkGameOver() {
		// 检测是否游戏结束
		if (this.state.board[0].some((cell) => cell !== null)) {
			this.gameWrapper.classList.add('game-over')
			this.showMessage({ type: 'danger' })
		} else {
			this.gameWrapper.classList.remove('game-over')
		}
	}

	// 动画
	animateBlock(blocks, type) {
		return new Promise(async (resolve) => {
			const animates = []

			if (blocks.length === 0) {
				resolve()
			}

			blocks.forEach((block) => {
				const blockDom = document.querySelector(`.block[data-block-id="${block.blockId}"]`)

				const cellSize = this.state.cellSize
				const gap = this.state.gap
				const newLeft = block.endCol * (cellSize + gap)
				const oldTop = block.startRow * (cellSize + gap)
				const newTop = block.endRow * (cellSize + gap)

				// 下落，上升动画
				if (type === 'falling' || type === 'rising') {
					// 更新 block 的数据属性
					blockDom.dataset.row = block.endRow

					animates.push(
						this.state.animate({
							begin: oldTop,
							end: newTop,
							duration: type === 'rising' ? 300 : 120,
							onUpdate: (value) => {
								blockDom.style.transform = `translate(${newLeft}px, ${value}px)`
							}
						})
					)
				}
				// 移动动画
				if (type === 'move') {
					const oldLeft = block.startCol * (cellSize + gap) + block.limitedDeltaX
					blockDom.dataset.col = block.endCol

					animates.push(
						this.state.animate({
							begin: oldLeft,
							end: newLeft,
							onUpdate: (value) => {
								blockDom.style.transform = `translate(${value}px, ${newTop}px)`
							}
						})
					)
				}
				// 野牛消除一格
				if (type === 'buffalo') {
					const oldWidth = block.startLength * cellSize + (block.startLength - 1) * gap
					const newWidth = block.endLength * cellSize + (block.endLength - 1) * gap

					animates.push(
						this.state.animate({
							begin: oldWidth,
							end: newWidth,
							duration: 300,
							cubicBezier: [0.84, 0.0, 0.0, 1],
							onUpdate: (value) => {
								blockDom.style.width = `${value}px`
							}
						})
					)
				}
				// 消除动画
				if (type === 'eliminating') {
					blockDom.dataset.value = block.comboMultiplier
					blockDom.dataset.length = block.length

					animates.push(this.eliminatingAnimations(blockDom, block))
				}
			})
			await Promise.all(animates)
			if (type === 'falling' || type === 'move' || type === 'eliminating') {
				this.soundManager.play(type)
			}
			if (type === 'eliminating') {
				// 渲染动物
				this.renderAnimals(blocks)
			}
			// 重置 maxBottom
			this.maxBottom = 20
			resolve()
		})
	}

	async eliminatingAnimations(blockDom, block) {
		const dom = document.createElement('div')
		dom.classList.add('block-num')
		dom.dataset.length = block.length
		dom.innerHTML = block.comboMultiplier

		blockDom.appendChild(dom)
		// 使用 await 等待每个动画完成，再执行下一个
		await this.state.animate({
			begin: 0,
			end: 25,
			duration: 600,
			cubicBezier: [0.635, 0.005, 0, 0.995],
			onBefore: () => {
				dom.style.visibility = 'visible'
			},
			onUpdate: (value) => {
				dom.style.transform = `translate(-50%, calc(-50% - ${value}px))`
			},
			onEnd: () => {
				dom.style.visibility = 'hidden'
			}
		})
		await this.state.animate({
			keyframes: [
				{ offset: 0, value: 0 },
				{ offset: 0.2, value: 3 },
				{ offset: 0.4, value: -3 },
				{ offset: 0.6, value: 4 },
				{ offset: 0.8, value: -5 },
				{ offset: 1, value: 0 }
			],
			duration: 300,
			cubicBezier: [0.175, 0.885, 0.32, 1.275],
			onUpdate: (value) => {
				blockDom.style.left = `${value}px`
			}
		})
		await this.state.animate({
			begin: 1,
			end: 0,
			duration: 300,
			cubicBezier: [0.04, 0.11, 0.6, 0.86],
			onUpdate: (value) => {
				blockDom.style.opacity = value
			},
			onEnd: () => {
				blockDom.remove()
			}
		})
	}

	async showMessage({ body = this.gameWrapper, top = 30, message = '', type = 'primary', timer = 1200 }) {
		const offset = 10

		const dom = document.createElement('div')
		dom.classList.add('toast', 'toast-active', `toast-${type}`)
		dom.innerText = message

		body.insertBefore(dom, body.firstChild)

		const toasts = Array.from(document.querySelectorAll('.toast'))

		setTimeout(() => {
			toasts.forEach((item) => {
				item.style.top = `${top}px`
				top += item.offsetHeight + offset
			})
		}, 200)

		await this.state.sleep(timer)
		dom.classList.remove('toast-active')
		await this.state.sleep(400)
		body.removeChild(dom)
	}
}
