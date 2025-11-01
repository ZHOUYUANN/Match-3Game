class GameRenderer {
	constructor(gameState, gameSound) {
		this.state = gameState
		this.soundManager = gameSound
		this.gameWrapper = gameState.options.el

		this.maxBottom = 20
		this.lions = new Map()

		this.scoreElement = document.getElementById('score')

		// 新增UI元素
		this.gameBubbleElement = document.getElementById('gameBubble')
		this.pointsElement = document.getElementById('points')
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

		// 画布渲染之后设置 cellSize 大小
		const cell = document.querySelector('.cell')
		const rect = cell.getBoundingClientRect()

		this.state.cellSize = rect.width
	}

	renderPreview() {
		this.gameMarker.innerHTML = ''
		const fragment = document.createDocumentFragment()
		const fragment2 = document.createDocumentFragment()
		const row = 0
		const row2 = this.state.boardSizeH
		const newRow = this.state.generateNewRow()

		// 特殊行：包含连续的5个方块
		for (let col = 0; col < this.state.boardSizeX; col++) {
			const blockData = newRow[col]
			if (blockData !== null && blockData.startCol === col) {
				const block = this.createBlockElement(row, col, blockData, `marker`)
				const block2 = this.createBlockElement(row2, col, blockData, `block ${blockData.animal}`)
				fragment.appendChild(block)
				fragment2.appendChild(block2)
			}
		}

		this.nextRow = newRow

		this.gameMarker.appendChild(fragment)
		this.gameBoard.appendChild(fragment2)
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

	createTipElement(blockDom, className, oldLeft, oldTop) {
		const dom = document.createElement('div')
		dom.classList.add(className)

		const width = 20
		const height = 20
		const x = oldLeft + blockDom.offsetWidth / 2 - width / 2
		const y = oldTop + blockDom.offsetHeight / 2 - height / 2

		dom.style.width = `${width}px`
		dom.style.height = `${height}px`
		dom.style.transform = `translate(${x}px, ${y}px)`

		return {
			dom,
			x,
			y
		}
	}

	updateScore() {
		const { currentPoints, maxPoints, threshold } = this.state.skill
		this.roundElement.textContent = this.state.round
		this.scoreElement.textContent = this.state.score
		// 更新技能点显示
		this.pointsElement.textContent = this.state.freezeMovesLeft
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
		if (this.state.freezeMovesLeft > 0) {
			this.state.animate({
				keyframes: [
					{ offset: 0, value: 1 },
					{ offset: 0.5, value: 0.65 },
					{ offset: 0.7, value: 1.2 },
					{ offset: 1, value: 1 }
				],
				duration: 300,
				cubicBezier: [0.84, 0.0, 0.0, 1],
				onUpdate: (value) => {
					this.gameBubbleElement.style.transform = `scale(${value})`
				}
			})
		}
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
				const oldLeft = block.startCol * (cellSize + gap) + (block.limitedDeltaX ? block.limitedDeltaX : 0)
				const newLeft = block.endCol * (cellSize + gap)
				const oldTop = block.startRow * (cellSize + gap)
				const newTop = block.endRow * (cellSize + gap)
				// 设置水平翻转
				let scaleX = 1
				if (blockDom.dataset.direction) {
					if (blockDom.dataset.direction === 'left') {
						scaleX = 1
					} else {
						scaleX = -1
					}
				} else {
					scaleX = 1
				}
				// 下落，上升动画
				if (type === 'falling' || type === 'rising') {
					animates.push(
						this.state.animate({
							begin: oldTop,
							end: newTop,
							duration: type === 'rising' ? 300 : 120,
							onUpdate: (value) => {
								blockDom.style.transform = `translate(${newLeft}px, ${value}px) scaleX(${scaleX})`
							},
							onEnd: () => {
								blockDom.dataset.row = block.endRow
							}
						})
					)
				}
				// 移动动画
				if (type === 'move') {
					animates.push(
						this.state.animate({
							begin: oldLeft,
							end: newLeft,
							onUpdate: (value) => {
								blockDom.style.transform = `translate(${value}px, ${newTop}px) scaleX(${scaleX})`
							},
							onEnd: () => {
								blockDom.dataset.col = block.endCol
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
								if (blockDom.dataset.direction === 'right') {
									blockDom.style.transform = `translate(${oldLeft + oldWidth - value}px, ${oldTop}px) scaleX(-1)`
								}
							},
							onEnd: () => {
								blockDom.dataset.length = block.endLength
							}
						})
					)
				}
				// 使用技能
				if (type === 'skill') {
					const { dom: starDom, x: starX, y: starY } = this.createTipElement(blockDom, 'block-star', oldLeft, oldTop)
					blockDom.parentNode.insertBefore(starDom, blockDom)

					animates.push(
						this.state.animate({
							begin: 0,
							end: starY,
							duration: 1000,
							cubicBezier: [0.84, 0.0, 0.0, 1],
							onBefore: () => {
								starDom.style.visibility = 'visible'
								starDom.style.opacity = 1
							},
							onUpdate: (value) => {
								starDom.style.transform = `translate(${starX * (value / starY)}px, ${value}px)`
							},
							onEnd: () => {
								starDom.remove()
							}
						})
					)
				}
				// 狮子技能
				if (type === 'lion') {
					animates.push(this.lionAnimations(blockDom, block, oldLeft, oldTop))
				}
				// 大象技能
				if (type === 'elephant') {
					const oldWidth = block.startLength * cellSize + (block.startLength - 1) * gap
					const newWidth = block.endLength * cellSize + (block.endLength - 1) * gap
					const newWidth2 = block.endLength2 * cellSize + (block.endLength2 - 1) * gap

					// 计算初始中心位置
					const initialCenter = oldLeft + oldWidth / 2

					animates.push(
						this.state.animate({
							begin: oldWidth,
							end: newWidth,
							duration: 300,
							cubicBezier: [0.84, 0.0, 0.0, 1],
							onUpdate: (value) => {
								const currentTranslate = initialCenter - value / 2

								blockDom.style.width = `${value}px`
								blockDom.style.transform = `translate(${currentTranslate}px, ${oldTop}px) scaleX(1)`
							},
							onEnd: () => {
								const currentTranslate2 = initialCenter - newWidth2 / 2

								blockDom.style.width = `${newWidth2}px`
								blockDom.style.transform = `translate(${currentTranslate2}px, ${oldTop}px) scaleX(1)`
								blockDom.dataset.length = 1
								blockDom.dataset.col = block.endCol
							}
						})
					)
				}
				// 消除动画
				if (type === 'eliminating') {
					blockDom.dataset.value = block.comboMultiplier
					blockDom.dataset.length = block.length

					animates.push(this.eliminatingAnimations(blockDom, block, oldLeft, oldTop))
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

	async lionAnimations(blockDom, block, oldLeft, oldTop) {
		// 1. 执行第一段动画：从初始状态到掉头点，或直接到最终状态
		const cellSize = this.state.cellSize
		const gap = this.state.gap
		const firstEndState = block.plan.turnAroundState || block.plan.finalState

		const oldWidth = block.startLength * cellSize + (block.startLength - 1) * gap
		const newWidth = firstEndState.length * cellSize + (firstEndState.length - 1) * gap

		const direction = firstEndState.startCol < block.startCol ? 'left' : 'right'

		await this.state.animate({
			begin: oldWidth,
			end: newWidth,
			duration: 600,
			cubicBezier: [0.84, 0.0, 0.0, 1],
			onBefore: () => {
				blockDom.style.zIndex = 599
				const eatenBlockIds = block.plan.eatenBlockIdsFirst || []

				if (!eatenBlockIds.length) return
				this.soundManager.play('eat')
				eatenBlockIds.forEach((item) => {
					const eatenBlockDom = document.querySelector(`.block[data-block-id="${item}"]`)
					if (!eatenBlockDom) return
					eatenBlockDom.remove()
				})
			},
			onUpdate: (value) => {
				blockDom.style.width = `${value}px`
				blockDom.style.transform = `translate(${oldLeft}px, ${oldTop}px) scaleX(-1)`
				if (direction === 'left') {
					blockDom.style.transform = `translate(${oldLeft + oldWidth - value}px, ${oldTop}px) scaleX(1)`
				}
			},
			onEnd: () => {
				blockDom.style.zIndex = 399
				blockDom.dataset.direction = direction
				blockDom.dataset.length = firstEndState.length
				blockDom.dataset.col = firstEndState.startCol

				this.lions.set(block.blockId, { ...block, direction: blockDom.dataset.direction })
			}
		})

		await this.state.sleep(20)
		// 2. 如果发生了掉头，则执行第二段动画
		if (block.plan.turnAroundState) {
			if (
				block.plan.turnAroundState.startCol === block.plan.finalState.startCol &&
				block.plan.turnAroundState.length === block.plan.finalState.length
			) {
				return
			}
			const { length, startCol } = block.plan.finalState
			const newWidth2 = length * cellSize + (length - 1) * gap

			await this.state.animate({
				begin: newWidth,
				end: newWidth2,
				duration: 600,
				cubicBezier: [0.84, 0.0, 0.0, 1],
				onBefore: () => {
					const eatenBlockIds = block.plan.eatenBlockIdsSecond || []

					if (!eatenBlockIds.length) return
					this.soundManager.play('eat')
					eatenBlockIds.forEach((item) => {
						const eatenBlockDom = document.querySelector(`.block[data-block-id="${item}"]`)
						if (!eatenBlockDom) return
						eatenBlockDom.remove()
					})
				},
				onUpdate: (value) => {
					blockDom.style.width = `${value}px`
					blockDom.style.transform = `translate(0, ${oldTop}px) scaleX(-1)`
					// 掉头
					if (direction !== 'left') {
						blockDom.style.transform = `translate(${oldLeft + newWidth - value}px, ${oldTop}px) scaleX(1)`
					}
				},
				onEnd: () => {
					blockDom.style.zIndex = 399
					blockDom.dataset.direction = direction === 'left' ? 'right' : 'left'
					blockDom.dataset.length = length
					blockDom.dataset.col = startCol

					const lionData = this.lions.get(block.blockId)
					if (lionData && block.plan.finalState.length < 9) {
						lionData.direction = blockDom.dataset.direction
					}
				}
			})
		}
	}

	async eliminatingAnimations(blockDom, block, oldLeft, oldTop) {
		const { dom: starDom, x: starX, y: starY } = this.createTipElement(blockDom, 'block-star', oldLeft, oldTop)
		const { dom: numDom, x: numX, y: numY } = this.createTipElement(blockDom, 'block-num', oldLeft, oldTop)
		numDom.dataset.length = block.length
		numDom.innerHTML = block.comboMultiplier

		blockDom.parentNode.insertBefore(starDom, blockDom)
		blockDom.parentNode.insertBefore(numDom, blockDom)
		// 使用 await 等待每个动画完成，再执行下一个
		await this.state.animate({
			begin: 0,
			end: 15,
			duration: 600,
			cubicBezier: [0.635, 0.005, 0, 0.995],
			onBefore: () => {
				numDom.style.visibility = 'visible'
			},
			onUpdate: (value) => {
				numDom.style.transform = `translate(${numX}px, ${numY - value}px)`
			},
			onEnd: () => {
				numDom.remove()
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
		// 星星飞出动画
		this.state.animate({
			begin: starY,
			end: 0,
			duration: 500,
			cubicBezier: [0.04, 0.11, 0.6, 0.86],
			onBefore: () => {
				starDom.style.visibility = 'visible'
			},
			onUpdate: (value) => {
				starDom.style.transform = `translate(${starX * (value / starY)}px, ${value}px)`
			},
			onEnd: () => {
				starDom.remove()
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
