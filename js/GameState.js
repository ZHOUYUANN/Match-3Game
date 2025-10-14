class GameState {
	constructor(options = {}) {
		this.options = options
		this.cellSize = 32
		this.boardSizeX = options.boardSize[0]
		this.boardSizeH = options.boardSize[1]
		this.gap = options.gap || 1
		this.allRound = options.allRound || 500
		this.multipliers = options.multipliers || [1, 1.2, 1.5, 2, 3]
		this.board = Array(options.boardSize[1])
			.fill()
			.map(() => Array(options.boardSize[0]).fill(null))
		this.score = 0
		this.level = 1
		this.round = 1
		this.gameOver = false
		this.nextBlockId = 1
		this.isAnimating = false
		// 连击状态
		this.currentCombo = 0

		// 新增技能相关属性
		this.skill = {
			currentPoints: 0,
			maxPoints: 2500,
			threshold: 1000,
			skillPoint: 0
		}

		this.isFreezeMode = false
		this.freezeMovesLeft = 0

		// 野牛生成配置
		this.buffaloIndex = 0
		this.buffaloLength = options.buffaloLength || 5
		// 默认模式: 第20回合开始，之后每6回合
		this.buffaloPattern = options.buffaloPattern || [20, 6]
		this.nextBuffaloRound = options.buffaloPattern.length ? options.buffaloPattern[0] : Infinity
	}

	reset() {
		this.board = Array(this.boardSizeH)
			.fill()
			.map(() => Array(this.boardSizeX).fill(null))
		this.score = 0
		this.level = 1
		this.round = 1
		this.gameOver = false
		this.nextBlockId = 1
		this.isAnimating = false
		this.currentCombo = 0

		// 重置技能状态
		this.skill = {
			currentPoints: 0,
			maxPoints: 2500,
			threshold: 1000,
			skillPoint: 0
		}

		this.isFreezeMode = false
		this.freezeMovesLeft = 0

		// 重置野牛生成
		this.buffaloIndex = 0
		this.nextBuffaloRound = this.buffaloPattern.length ? this.buffaloPattern[0] : Infinity
	}

	// 根据权重随机生成方块长度
	getWeightedRandomLength() {
		// 基础几率配置
		const chances = {
			1: 35, // 1格方块35%几率
			2: 30, // 2格方块30%几率
			3: 25, // 3格方块25%几率
			4: 10 // 4格方块10%几率
		}

		// 根据游戏进度调整几率（回合数越多，大方块几率越高）
		const progressFactor = Math.min(1, this.round / this.allRound) // 500回合后达到最大调整

		// 调整后的几率
		const adjustedChances = {
			1: Math.max(10, chances[1] - progressFactor * 20), // 1格几率减少
			2: Math.max(25, chances[2] - progressFactor * 10), // 2格几率减少
			3: Math.min(35, chances[3] + progressFactor * 10), // 3格几率增加
			4: Math.min(30, chances[4] + progressFactor * 20) // 4格几率增加
		}

		// 计算总几率
		const totalChance = adjustedChances[1] + adjustedChances[2] + adjustedChances[3] + adjustedChances[4]

		// 生成随机数
		const randomValue = Math.random() * totalChance

		// 根据几率选择方块长度
		let cumulative = 0

		cumulative += chances[1]
		if (randomValue <= cumulative) return 1

		cumulative += chances[2]
		if (randomValue <= cumulative) return 2

		cumulative += chances[3]
		if (randomValue <= cumulative) return 3

		return 4
	}

	// 生成新行
	generateNewRow() {
		// 检查并更新下一个野牛生成回合
		if (this.round === this.nextBuffaloRound) {
			if (this.buffaloIndex < this.buffaloPattern.length - 1) {
				this.buffaloIndex++
			}
			this.nextBuffaloRound += this.buffaloPattern[this.buffaloIndex]
		}
		// 检查是否需要生成野牛行
		if (this.round + 1 === this.nextBuffaloRound) {
			return this.generateBuffaloRow()
		}
		// 默认动物
		const animals = {
			1: 'ostrich', // 鸵鸟
			2: 'zebra,deer', // 斑马，麋鹿
			3: 'elephant,lion', // 大象，狮子
			4: 'bear' // 北极熊
		}
		// 创建新行数组
		const newRow = Array(this.boardSizeX).fill(null)
		// 随机生成方块组个数
		const groupCount = this.getRandomInt(2, 4)
		// 生成随机起始位置[0,2]，避免每次都是从第一个开始
		let usedCells = this.getRandomInt(0, 2)

		for (let i = 0; i < groupCount; i++) {
			if (usedCells >= this.boardSizeX) break
			// 使用智能几率生成方块长度
			const weightLength = this.getWeightedRandomLength()
			// 随机生成方块组的随机长度，最大不超过4格
			const maxLength = Math.min(4, this.boardSizeX - usedCells)
			// 随机生成方块组长度，最小为1，最大为maxLength
			const length = Math.min(weightLength, maxLength)
			const animalArray = animals[length].split(',')
			const animal = animalArray[Math.floor(Math.random() * animalArray.length)]
			const startCol = usedCells

			// 创建方块组
			const blockId = this.nextBlockId++
			for (let j = 0; j < length; j++) {
				newRow[startCol + j] = {
					id: blockId,
					length: length,
					startCol: startCol,
					animal
				}
			}
			// 生成后续间隔的格子数，随机间隔0-2格
			usedCells += length + this.getRandomInt(0, 2)
		}

		return newRow
	}

	// 生成野牛行
	generateBuffaloRow() {
		const newRow = Array(this.boardSizeX).fill(null)
		const startCol = this.getRandomInt(0, this.boardSizeX - this.buffaloLength)
		const blockId = this.nextBlockId++
		for (let j = 0; j < this.buffaloLength; j++) {
			newRow[startCol + j] = {
				id: blockId,
				length: this.buffaloLength,
				startCol: startCol,
				animal: 'buffalo' // 标记是野牛块
			}
		}

		return newRow
	}

	// 添加积分并检查是否获得技能点
	addPoints(points, points2) {
		this.score += points

		this.skill.currentPoints = Math.min(this.skill.currentPoints + points2, this.skill.maxPoints)

		// 计算技能点数
		this.skill.skillPoint = Math.floor(this.skill.currentPoints / this.skill.threshold)
	}

	// 获取区间内随机数
	getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min
	}

	// 阻塞
	sleep(timer = 300, param) {
		return new Promise((resolve) => {
			setTimeout(resolve, timer, param)
		})
	}

	// 精确的CSS缓动函数实现（动画核心引擎）
	preciseCubicBezier(t, p1, p2, p3, p4) {
		if (t <= 0) return 0
		if (t >= 1) return 1

		const calcBezier = (t, a, b, c, d) => {
			// 3次贝塞尔曲线标准公式
			const ti = 1 - t
			return ti * ti * ti * a + 3 * ti * ti * t * b + 3 * ti * t * t * c + t * t * t * d
		}

		const getSlope = (t, a, b, c, d) => {
			// 贝塞尔曲线的导数，用于牛顿迭代法
			const ti = 1 - t
			return 3 * ti * ti * (b - a) + 6 * ti * t * (c - b) + 3 * t * t * (d - c)
		}

		let guess = t
		for (let i = 0; i < 8; i++) {
			const currentSlope = getSlope(guess, 0, p1, p3, 1)
			if (currentSlope === 0) break

			const currentX = calcBezier(guess, 0, p1, p3, 1) - t
			guess -= currentX / currentSlope
		}

		return calcBezier(guess, 0, p2, p4, 1)
	}

	// 根据关键帧计算当前值的核心函数
	getValueFromKeyframes(progress, keyframes, defaultEasing) {
		// 确保关键帧是按offset排序的
		const sortedKeyframes = [...keyframes].sort((a, b) => a.offset - b.offset)

		// 处理边界情况
		if (progress <= 0) return sortedKeyframes[0].value
		if (progress >= 1) return sortedKeyframes[sortedKeyframes.length - 1].value

		// 1. 定位段落：找到当前进度所在的关键帧段落
		let segmentStartFrame = sortedKeyframes[0]
		let segmentEndFrame = sortedKeyframes[sortedKeyframes.length - 1]
		for (let i = 0; i < sortedKeyframes.length - 1; i++) {
			if (progress >= sortedKeyframes[i].offset && progress <= sortedKeyframes[i + 1].offset) {
				segmentStartFrame = sortedKeyframes[i]
				segmentEndFrame = sortedKeyframes[i + 1]
				break
			}
		}

		// 2. 计算局部进度
		const segmentDuration = segmentEndFrame.offset - segmentStartFrame.offset
		// 避免除以零的错误
		if (segmentDuration === 0) return segmentEndFrame.value

		const localProgress = (progress - segmentStartFrame.offset) / segmentDuration

		// 3. 应用缓动
		// 优先使用段落指定的缓动，否则使用全局默认缓动
		const easing = segmentStartFrame.easing || defaultEasing
		const easedLocalProgress = this.preciseCubicBezier(localProgress, ...easing)

		// 4. 计算最终值 (线性插值)
		const valueChange = segmentEndFrame.value - segmentStartFrame.value
		const currentValue = segmentStartFrame.value + valueChange * easedLocalProgress

		return currentValue
	}

	animate({
		begin,
		end,
		keyframes,
		duration = this.options.duration,
		cubicBezier = this.options.cubicBezier,
		onUpdate,
		onEnd,
		onBefore
	}) {
		return new Promise((resolve) => {
			// --- 兼容性处理 ---
			// 如果传入了 begin 和 change，则动态生成 keyframes
			if (begin !== undefined && end !== undefined && !keyframes) {
				keyframes = [
					{ offset: 0, value: begin },
					{ offset: 1, value: end }
				]
			}
			// 如果没有有效的关键帧，则报错
			if (!keyframes || keyframes.length < 2) {
				console.error('关键帧最短需要两个或更多')
				resolve(false)
				return
			}

			const startTime = performance.now()

			const frame = (currentTime) => {
				const elapsed = currentTime - startTime
				const totalProgress = Math.min(elapsed / duration, 1)

				// 使用新的核心计算函数
				const currentValue = this.getValueFromKeyframes(totalProgress, keyframes, cubicBezier)

				onUpdate && onUpdate(currentValue)

				if (totalProgress < 1) {
					requestAnimationFrame(frame)
				} else {
					onEnd && onEnd()
					resolve(true)
				}
			}

			onBefore && onBefore()
			requestAnimationFrame(frame)
		})
	}

	// 预加载所有图片
	preloadImages(data) {
		// let images = []

		// // 1. 从CSS中提取所有背景图片URL
		// const stylesheets = Array.from(document.styleSheets)
		// stylesheets.forEach((sheet) => {
		// 	try {
		// 		const rules = Array.from(sheet.cssRules || [])
		// 		rules.forEach((rule) => {
		// 			if (rule.style && rule.style.backgroundImage && rule.style.backgroundImage !== 'none') {
		// 				const url = rule.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/i)
		// 				if (url && url[1]) {
		// 					images.push(url[1])
		// 				}
		// 			}
		// 		})
		// 	} catch (e) {
		// 		console.warn('无法读取某些CSS规则:', e)
		// 		images = data
		// 	}
		// })

		// 2. 预加载所有图片
		const promises = data.map((url) => {
			return new Promise((resolve, reject) => {
				const img = new Image()
				img.src = url
				img.onload = resolve
				img.onerror = reject
			})
		})

		return Promise.all(promises)
	}
}
