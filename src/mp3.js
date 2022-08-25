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
			ctx.decodeAudioData(request.response, buffer => {
				//下面开始初始化mp3Instance
				mp3.list[name] = {};
				const mp3ins = mp3.list[name];
				mp3ins.src = url;
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
					if (mp3ins.isPlaying) {
						return (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
					} else {
						return mp3ins.time;
					}
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
						if (mp3ins.timeset) {
							mp3ins.time = mp3ins.timeset;
							mp3ins.play();
							mp3ins.timeset = 0;
						} else {
							mp3ins.time = (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
						}
					};
					
					mp3ins.source.connect(mp3ins.gainNode); //链接音量节点
					mp3ins.gainNode.connect(mp3ins.pannerNode); //链接平衡节点
					mp3ins.pannerNode.connect(ctx.destination); //链接输出
					
					mp3ins.source.start(0, mp3ins.time); //播放
					mp3ins.startTime = ctx.currentTime;
				};
				//暂停
				mp3ins.pause = function() {
					if(mp3ins.source) mp3ins.source.stop(); //停止
				}
				//设置当前播放进度 TODO
				mp3ins.setTime = function(s) {
					try {
						if(mp3ins.isPlaying) {
							mp3ins.timeset = s;
							mp3ins.pause();
						} else {
							mp3ins.time = s;
						}
					} catch(e) {} //No problem
				}
				
				//设置音乐音量 0~1
				mp3ins.setVolume = function(volume) {
					mp3ins.gainNode.gain.value = Math.min(Math.max(0,volume), 1);
				}
				mp3ins.getVolume = function(){
					return mp3ins.gainNode.gain.value;
				}
				
				//设置rate 动态更改可行，但会导致getNow无法获取准确时间 TODO
				mp3ins.setRate = function(rate) {
					mp3ins.rate = rate;
					if (mp3ins.isPlaying) mp3ins.source.playbackRate.value = rate;
				}
				
				//设置左右平衡
				mp3ins.setPanner = function(v) {
					mp3ins.pannerNode.pan.value = Math.min(Math.max(-1,v), 1);
				}
				mp3ins.getPanner = function() {
					return mp3ins.pannerNode.pan.value;
				}
				
				resolve(); //OVER!
			});
		};
		request.onerror = error => reject(error);
		request.send();
	});
};
mp3.get = function(name) {
	return mp3.list[name];
}

module.exports = mp3;
//const buffer = await _getBuffer(URL);
//buffer && playAudio(buffer);
