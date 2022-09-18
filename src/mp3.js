const mp3 = {};

mp3.audioContext = new AudioContext();
mp3.list = {}; //用于存储已加载音频

mp3.pushAudio = function(name, url) {
	const ctx = mp3.audioContext;
	const request = new XMLHttpRequest();
	return new Promise((resolve, reject) => {
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		request.onload = () => {
			try {
			ctx.decodeAudioData(request.response, buffer => {
				//下面开始初始化mp3Instance
				mp3.list[name] = {};
				const mp3ins = mp3.list[name];
				mp3ins.url = url;
				mp3ins.buffer = buffer;
				mp3ins.time = 0;
				mp3ins.startTime = ctx.currentTime;
				mp3ins.stopTime = ctx.currentTime;
				mp3ins.duration = mp3ins.buffer.duration;
				mp3ins.isPlaying = false;
				//初始化rate
				mp3ins.rate = 1;
				//初始化音量节点
				mp3ins.gainNode = ctx.createGain();
				mp3ins.gainNode.gain.value = 1;
				//初始化左右平衡节点
				mp3ins.pannerNode = ctx.createStereoPanner();
				
				
				//获取当前播放时长
				mp3ins.getNow = function() {
					let time;
					if (mp3ins.isPlaying) {
						time = (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
					} else {
						time = mp3ins.time;
					}
					return time%mp3ins.duration;
				}

				//开始播放
				mp3ins.play = function() {
					if(mp3ins.isPlaying) return;
					mp3ins.isPlaying = true;
					//初始化buffSource
					mp3ins.source = ctx.createBufferSource();
					mp3ins.source.buffer = mp3ins.buffer;
					mp3ins.source.loop = mp3ins.loop; //应用循环
					mp3ins.source.playbackRate.value = mp3ins.rate; //应用播放倍率
					//设置结束时的操作
					mp3ins.source.onended = function() {
						mp3ins.isPlaying = false;
						mp3ins.stopTime = ctx.currentTime;
						mp3ins.time = (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
						if (mp3ins.time > mp3ins.duration) {
							mp3ins.time = mp3ins.duration;
						}
					};
					
					mp3ins.source.connect(mp3ins.gainNode); //链接音量节点
					mp3ins.gainNode.connect(mp3ins.pannerNode); //链接平衡节点
					mp3ins.pannerNode.connect(ctx.destination); //链接输出
					
					mp3ins.source.start(0, mp3ins.time); //播放
					mp3ins.startTime = ctx.currentTime;
				};
				//暂停
				mp3ins.pause = function(callback) {
					if(mp3ins.source) {
						if (callback) {
							mp3ins.source.onended = function() {
								callback();
							};
						}
						mp3ins.source.stop(); //停止
					}
				}
				//设置当前播放进度 TODO
				mp3ins.setTime = function(s) {
					
					if (s > mp3ins.duration) s=mp3ins.duration; //限制最大不超过长度
					if (s < 0) {
						if (s < -mp3ins.duration) s=0;
						s += mp3ins.duration; //是负数则从长度减去
					}
					
					mp3ins.time = s;
					if(mp3ins.isPlaying) {
						mp3ins.pause(()=>{
							mp3ins.isPlaying = false;
							mp3ins.stopTime = ctx.currentTime;
							mp3ins.play();
						}); //停止并重放
					}
				}
				
				//设置音乐音量 0~100
				mp3ins.setVolume = function(volume) {
					volume = volume/100; //转数字并缩小一百倍
					mp3ins.gainNode.gain.value = Math.min(Math.max(0,volume), 1);
				}
				mp3ins.getVolume = function(){
					return mp3ins.gainNode.gain.value;
				}
				
				//设置rate 动态更改
				mp3ins.setRate = function(rate) {
					//mp3ins.rate = Math.min(Math.max(0, rate), 16);
					if (mp3ins.isPlaying) {
						mp3ins.pause(()=>{
							mp3ins.isPlaying = false;
							mp3ins.stopTime = ctx.currentTime;
							mp3ins.time = (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
							mp3ins.rate = rate;
							mp3ins.play();
						});
					} else {
						mp3ins.rate = rate;
					}
				}
				
				//设置左右平衡
				mp3ins.setPanner = function(v) {
					v = v/100; //转数字并缩小一百倍
					mp3ins.pannerNode.pan.value = Math.min(Math.max(-1,v), 1);
				}
				mp3ins.getPanner = function() {
					return mp3ins.pannerNode.pan.value;
				}
				
				resolve(); //OVER!
			});
			}
			catch(e) {
				if (mp3.list[name]) delete mp3.list[name];
				resolve();
			}
		};
		request.onerror = error => resolve();//只请求一次，失败就返回
		request.send();
	});
};
mp3.get = function(name) {
	return mp3.list[name];
}

module.exports = mp3;
