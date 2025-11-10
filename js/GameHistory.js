class GameHistory {
	constructor(storageKey, initialState) {
		if (!storageKey) {
			throw new Error('GameHistory 需要一个 storageKey。')
		}
		this.storageKey = storageKey
		this._loadFromStorage() // 初始化时加载数据

		if (initialState !== undefined) {
			this.save(initialState)
		}
	}

	// 从 localStorage 加载数据到内存
	_loadFromStorage() {
		try {
			const storedData = localStorage.getItem(this.storageKey)
			if (storedData) {
				const { history, currentIndex } = JSON.parse(storedData)
				// 简单的数据校验
				if (Array.isArray(history) && typeof currentIndex === 'number') {
					this._history = history
					this._currentIndex = currentIndex
				} else {
					// 数据格式不正确，重置
					this._resetState()
				}
			} else {
				// 没有存储的数据，使用初始状态
				this._resetState()
			}
		} catch (e) {
			console.error('从 localStorage 加载历史记录失败:', e)
			// 如果发生任何错误（如JSON解析失败），则重置为安全状态
			this._resetState()
		}
	}

	// 将内存中的数据保存到 localStorage
	_saveToStorage() {
		try {
			const dataToStore = {
				history: this._history,
				currentIndex: this._currentIndex
			}
			localStorage.setItem(this.storageKey, JSON.stringify(dataToStore))
		} catch (e) {
			// 可能是 localStorage 空间不足
			console.error('保存历史记录到 localStorage 失败:', e)
		}
	}

	// 重置管理器状态
	_resetState() {
		this._history = []
		this._currentIndex = -1
	}

	// 保存状态
	save(data) {
		if (this._currentIndex < this._history.length - 1) {
			this._history = this._history.slice(0, this._currentIndex + 1)
		}
		const dataCopy = this._deepClone(data)
		this._history.push(dataCopy)
		this._currentIndex = this._history.length - 1
		this._saveToStorage()
	}

	// 撤销
	undo() {
		if (this.canUndo()) {
			this._currentIndex--
			this._saveToStorage()
			return this._deepClone(this._history[this._currentIndex])
		}
		return null
	}

	// 重做
	redo() {
		if (this.canRedo()) {
			this._currentIndex++
			this._saveToStorage()
			return this._deepClone(this._history[this._currentIndex])
		}
		return null
	}

	// 获取当前状态
	getCurrent() {
		if (this._currentIndex >= 0 && this._currentIndex < this._history.length) {
			return this._deepClone(this._history[this._currentIndex])
		}
		return null
	}

	canUndo() {
		return this._currentIndex > 0
	}

	canRedo() {
		return this._currentIndex < this._history.length - 1
	}

	getHistory() {
		const storedData = localStorage.getItem(this.storageKey)
		let history = null
		if (storedData) {
			history = JSON.parse(storedData).history
		}
		return history
	}

	// 清除历史记录
	clearHistory() {
		localStorage.removeItem(this.storageKey)
		this._resetState()
	}

	// 深拷贝方法保持不变
	_deepClone(obj) {
		if (obj === null || typeof obj !== 'object') return obj
		return JSON.parse(JSON.stringify(obj))
	}
}
