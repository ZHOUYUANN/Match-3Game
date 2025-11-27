class Match3Game {
	constructor(options = {}) {
		this._eventListeners = {}
		this.lastState = null
		this.history = new GameHistory('luszy_match3_game')
		const historyData = this.history.getHistory()
		if (historyData && historyData.length > 0) {
			const userChoice = confirm(
				'检测到有上一次游戏缓存内容，是否恢复至上次关闭时的状态？\n\n点击“确定”将应用最后一步操作，点击“取消”将开始一个新游戏。'
			)

			if (userChoice) {
				const lastState = (this.lastState = historyData[historyData.length - 1])
				this.history.clearHistory()
				this.history.save({ ...lastState })
			} else {
				this.history.clearHistory()
			}
		}
		this.state = new GameState(options)
		this.soundManager = new SoundManager(this.state)
		this.renderer = new GameRenderer(this.state, this.soundManager)
		this.logic = new GameLogic(this, this.state, this.renderer, this.soundManager, this.history)
		this.skillManager = new GameSkill(this.state, this.renderer, this.logic)
		this.controller = new GameController(
			this.state,
			this.renderer,
			this.logic,
			this.soundManager,
			this.skillManager,
			this.history
		)

		// 设置默认音量
		this.soundManager.setVolume(0.7)
	}

	on(type, listener) {
		if (!this._eventListeners[type]) {
			this._eventListeners[type] = []
		}
		this._eventListeners[type].push(listener)
	}

	off(type, listenerToRemove) {
		if (!this._eventListeners[type]) return
		this._eventListeners[type] = this._eventListeners[type].filter((listener) => listener !== listenerToRemove)
	}

	trigger(type, data) {
		if (!this._eventListeners[type]) return
		// 执行所有注册过的监听器
		this._eventListeners[type].forEach((listener) => {
			listener(data) // 直接把数据传过去
		})
	}

	async start() {
		// 预加载图片资源
		try {
			// 预加载音效
			await this.soundManager.loadSounds({
				background: 'sounds/background.mp3',
				buffalo: 'sounds/buffalo.mp3',
				falling: 'sounds/falling.mp3',
				move: 'sounds/move.mp3',
				eat: 'sounds/eat.mp3',
				eliminating: 'sounds/eliminating.mp3'
			})

			// 所有图片加载完成后初始化你的游戏
			if (this.lastState) {
				this.renderer.render(this.lastState)
			} else {
				this.renderer.render()
				this.logic.initializeGame()
			}
			this.controller.setupEventListeners()
		} catch (error) {
			console.error('图片预加载失败:', error)
		}
	}

	restart() {
		this.history.clearHistory()
		this.state.reset()
		this.renderer.render()
		this.logic.initializeGame()
	}

	undo() {
		if (!this.history.canUndo()) return
		const prevState = this.history.undo()
		if (prevState) {
			this.renderer.render(prevState)
		}
	}

	suggestMove(data = null) {
		if (this.state.isAnimating) return
		const boardCopy = this.state.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
		const nextRow = this.renderer.nextRow.map((cell) => (cell ? { ...cell } : null))
		this.ai = new GameAI({ boardSize: [9, 11] })
		const suggestedMove = data || this.ai.getBestMove(boardCopy, nextRow)
		console.log(suggestedMove)
		if (suggestedMove.move) {
			const moveBlock = document.querySelector(
				`${suggestedMove.move.blockId ? `.block[data-block-id="${suggestedMove.move.blockId}"]` : ''}`
			)

			// 获取moveBlock的位置和宽度
			const cellSize = this.state.cellSize
			const gap = this.state.gap

			const row = Number(moveBlock.dataset.row)
			const col = Number(moveBlock.dataset.col)
			const length = Number(moveBlock.dataset.length)

			const left = col * (cellSize + gap)
			const top = row * (cellSize + gap)
			const width = length * cellSize + (length - 1) * gap

			// 设置默认位置的block位置
			this.renderer.defaultBlockMarker.style.width = `${width}px`
			this.renderer.defaultBlockMarker.style.height = `${cellSize}px`
			this.renderer.defaultBlockMarker.style.transform = `translate(${left}px, ${top}px)`
			this.renderer.defaultBlockMarker.style.visibility = 'visible'

			const suggestedBlockMarker = document.createElement('div')
			if (document.querySelector('.suggested-block-marker')) {
				document.querySelector('.suggested-block-marker').remove()
			}
			const row2 = Number(suggestedMove.move.fromRow)
			const col2 = Number(suggestedMove.move.toCol)
			const length2 = Number(suggestedMove.move.length)

			// 设置默认的block位置显示
			const left2 = col2 * (cellSize + gap)
			const top2 = row2 * (cellSize + gap)
			const width2 = length2 * cellSize + (length - 1) * gap

			suggestedBlockMarker.className = 'suggested-block-marker'
			suggestedBlockMarker.style.width = `${width2}px`
			suggestedBlockMarker.style.height = `${cellSize}px`
			suggestedBlockMarker.style.position = 'absolute'
			suggestedBlockMarker.style.border = '1px solid #fff'
			suggestedBlockMarker.style.transform = `translate(${left2}px, ${top2}px)`
			suggestedBlockMarker.style.boxShadow = '1px 1px 9px #ffb371'
			suggestedBlockMarker.style.animation = 'blink 2s infinite'
			suggestedBlockMarker.style.pointerEvents = 'none'

			moveBlock.parentNode.insertBefore(suggestedBlockMarker, moveBlock)
		} else {
			alert('没有找到可行的移动建议。请考虑使用技能！！')
		}
	}
}
