class SoundManager {
	constructor(gameState) {
		this.state = gameState
		this.sounds = {} // 存储所有音效
		this.muted = false // 静音状态
		this.volume = 1 // 音量 (0-1)
		this.context = null // Web Audio API 上下文
		this.initialized = false // 是否已初始化
	}

	// 初始化音频上下文（解决浏览器自动播放限制）
	init() {
		if (this.initialized) return

		try {
			// 创建音频上下文
			const AudioContext = window.AudioContext || window.webkitAudioContext
			this.context = new AudioContext()

			// 解决iOS等设备的自动播放限制
			document.addEventListener(
				'click',
				() => {
					if (this.context.state === 'suspended') {
						this.context.resume()
					}
				},
				{ once: true }
			)

			this.initialized = true
		} catch (e) {
			console.error('Web Audio API is not supported', e)
		}
	}

	// 预加载音效
	async loadSound(name, url, options = {}) {
		if (!this.initialized) this.init()

		// 如果已加载，直接返回
		if (this.sounds[name]) return Promise.resolve()

		return new Promise((resolve, reject) => {
			const request = new XMLHttpRequest()
			request.open('GET', url, true)
			request.responseType = 'arraybuffer'

			request.onload = () => {
				if (request.status === 200) {
					this.context.decodeAudioData(
						request.response,
						(buffer) => {
							this.sounds[name] = {
								buffer,
								volume: options.volume || 1,
								loop: options.loop || false,
								playbackRate: options.playbackRate || 1
							}
							resolve()
						},
						(error) => {
							console.error('音频数据解析失败', error)
							reject(error)
						}
					)
				} else {
					reject(new Error(`加载音频资源失败: ${url}`))
				}
			}

			request.onerror = () => {
				reject(new Error(`加载音频资源失败: ${url}`))
			}

			request.send()
		})
	}

	// 播放音效
	async play(name, options = {}) {
		if (!this.initialized || this.muted || !this.sounds[name]) return null

		// 如果上下文被暂停，尝试恢复
		if (this.context && this.context.state === 'suspended') {
			try {
				await this.context.resume()
			} catch (e) {
				console.error('Failed to resume audio context:', e)
				return null
			}
		}

		const sound = this.sounds[name]
		const source = this.context.createBufferSource()
		const gainNode = this.context.createGain()

		source.buffer = sound.buffer
		source.loop = options.loop || sound.loop
		source.playbackRate.value = options.playbackRate || sound.playbackRate

		gainNode.gain.value = this.volume * (options.volume || sound.volume)

		source.connect(gainNode)
		gainNode.connect(this.context.destination)

		source.start(0)

		// 返回音频节点，可用于后续控制
		return {
			source,
			gainNode,
			stop: () => source.stop(),
			setVolume: (volume) => (gainNode.gain.value = this.volume * volume)
		}
	}

	// 停止所有音效
	stopAll() {
		Object.values(this.sounds).forEach((sound) => {
			if (sound.source) {
				sound.source.stop()
			}
		})
	}

	// 设置全局音量
	setVolume(volume) {
		this.volume = Math.max(0, Math.min(1, volume))
	}

	// 切换静音状态
	toggleMute() {
		this.muted = !this.muted
		return this.muted
	}

	// 预加载多个音效
	async loadSounds(soundMap) {
		const promises = []
		for (const [name, url] of Object.entries(soundMap)) {
			promises.push(this.loadSound(name, url))
		}
		return Promise.all(promises)
	}

	// 卸载音效释放内存
	unloadSound(name) {
		if (this.sounds[name]) {
			delete this.sounds[name]
		}
	}

	// 卸载所有音效
	unloadAll() {
		this.sounds = {}
	}
}
