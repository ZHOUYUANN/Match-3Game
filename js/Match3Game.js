class Match3Game {
	constructor(options = {}) {
		this.state = new GameState(options)
		this.soundManager = new SoundManager(this.state)
		this.renderer = new GameRenderer(this.state, this.soundManager)
		this.logic = new GameLogic(this.state, this.renderer, this.soundManager)
		this.controller = new GameController(this.state, this.renderer, this.logic, this.soundManager)

		// 设置默认音量
		this.soundManager.setVolume(0.7)
	}

	async start() {
		// 预加载图片资源
		try {
			// await this.state.preloadImages([
			// 	'img/bg-1.png',
			// 	'img/bgb-2.png',
			// 	'img/cao.png',
			// 	'img/ostrich.png',
			// 	'img/zebra.png',
			// 	'img/deer.png',
			// 	'img/elephant.png',
			// 	'img/lion.png',
			// 	'img/bear.png',
			// 	'img/buffalo.png',
			// 	'img/score.png',
			// 	'img/yeniu.png',
			// 	'img/skill.png',
			// 	'img/board.png',
			// 	'img/ostrich_icon.png',
			// 	'img/zebra_icon.png',
			// 	'img/deer_icon.png',
			// 	'img/elephant_icon.png',
			// 	'img/lion_icon.png',
			// 	'img/bear_icon.png',
			// 	'img/buffalo_icon.png',
			// 	'img/game_over.png',
			// 	'img/buffalo_warn.png'
			// ])
			// 预加载音效
			await this.soundManager.loadSounds({
				background: 'sounds/background.mp3',
				buffalo: 'sounds/buffalo.mp3',
				falling: 'sounds/falling.mp3',
				move: 'sounds/move.mp3',
				eliminating: 'sounds/eliminating.mp3'
			})

			// 所有图片加载完成后初始化你的游戏
			this.renderer.render()
			this.logic.initializeGame()
			this.controller.setupEventListeners()
		} catch (error) {
			console.error('图片预加载失败:', error)
		}
	}
}
