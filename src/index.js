const { Extension, type, api } = require('clipcc-extension');
const mp3 = require('./mp3');

class Lazyload extends Extension {
	constructor () {
        super();
	}
    onInit() {
		const runtime = api.getVmInstance().runtime;
		// @ts-ignore
		const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		api.addCategory({
			categoryId: 'java30433.lazyload.category',
			messageId: 'java30433.lazyload.category',
			color: '#BCAAA4'
		});
		const addBlock = function(blockJson){
			let opcode = "java30433.lazyload.block." + blockJson.opcode;
			api.addBlock({
				opcode: opcode,
				messageId: opcode,
				categoryId: 'java30433.lazyload.category',
				type: blockJson.type,
				param: blockJson.param,
				option: blockJson.option,
				function: blockJson.function
			});
		};
		//在项目停止时停止所有音乐的播放
		runtime.on('PROJECT_STOP_ALL', ()=>{
			Object.values(mp3.list).forEach(mp3ins=>{
				mp3ins.pause();
				mp3ins.time = 0;
			})
		});
		
		addBlock({
			opcode: 'loadMusic',
			type: type.BlockType.COMMAND,
			param: {
                url: {
                    type: type.ParameterType.STRING,
                    default: 'b4609e706e4d08f0cd7d220b5d2a634c.mp3'
                },
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: (args, util) => {
				let url = String(args.url); //务必把args当常量用，因为args是有缓存的。
				if (
				  runtime.version.startsWith('c')
				  ||
				  !url.includes('/')
				){
					url = "https://api.codingclip.com/v1/project/asset/" + url;
				}
				if (mp3.get(args.name) && mp3.get(args.name).url == url) return; //如果已经加载了一样的就不重复加载了
				return mp3.pushAudio(args.name, url);
			}
		});
		addBlock({
			opcode: 'playMusic',
			type: type.BlockType.COMMAND,
			param: {
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                },
				n: {
                    type: type.ParameterType.STRING,
					field: true,
                    menu: [{
						messageId: 'java30433.lazyload.menu.loop',
						value: 'loop'
					}, {
						messageId: 'java30433.lazyload.menu.unloop',
						value: 'unloop'
					}],
					default: 'unloop'
				}
			},
			function: args => {
				if (!mp3.get(args.name)) return;
				const mp3ins = mp3.get(args.name);
				mp3ins.loop = (args.n == 'loop');
				mp3ins.play();
			}
		});
		addBlock({
			opcode: 'pauseMusic',
			type: type.BlockType.COMMAND,
			param: {
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: (args, util) => {
				if (!mp3.get(args.name)) return;
				const mp3ins = mp3.get(args.name);
				if (!mp3ins.isPlaying) return;
				return new Promise((resolve, reject)=>{
					mp3ins.pause(()=>{
						const ctx = mp3.audioContext;
						mp3ins.isPlaying = false;
						mp3ins.stopTime = ctx.currentTime;
						mp3ins.time = (ctx.currentTime - mp3ins.startTime)*mp3ins.rate + mp3ins.time;
						resolve();
					});
				});
			}
		});
		addBlock({
			opcode: 'deleteMusic',
			type: type.BlockType.COMMAND,
			param: {
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: args => {
				if (!mp3.get(args.name)) return;
				mp3.get(args.name).pause();
				delete mp3.list[args.name];
			}
		});
		addBlock({
			opcode: 'setMusicEffect',
			type: type.BlockType.COMMAND,
			param: {
				n: {
                    type: type.ParameterType.STRING,
					field: true,
                    menu: [{
						messageId: 'java30433.lazyload.menu.currentTime',
						value: 'currentTime'
					}, {
						messageId: 'java30433.lazyload.menu.volume',
						value: 'volume'
					}, {
						messageId: 'java30433.lazyload.menu.panner',
						value: 'panner'
					}, {
						messageId: 'java30433.lazyload.menu.rate',
						value: 'rate'
					}],
					default: 'volume'
				},
                v: {
                    type: type.ParameterType.NUMBER,
                    default: 0
                },
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: args => {
				if (!mp3.get(args.name)) return;
				const mp3ins = mp3.get(args.name);
				const v = isNaN(args.v) ? 0 : Number(args.v);
				switch (args.n) {
					case 'currentTime':
						mp3ins.setTime(v);
						break;
					case 'volume':
						mp3ins.setVolume(v);
						break;
					case 'panner':
						mp3ins.setPanner(v);
						break;
					case 'rate':
						mp3ins.setRate(v);
						break;
				}
			}
		});
		addBlock({
			opcode: 'getMusicState',
			type: type.BlockType.REPORTER,
			param: {
				n: {
                    type: type.ParameterType.STRING,
					field: true,
                    menu: [{
						messageId: 'java30433.lazyload.menu.currentTime',
						value: 'currentTime'
					}, {
						messageId: 'java30433.lazyload.menu.duration',
						value: 'duration'
					}, {
						messageId: 'java30433.lazyload.menu.volume',
						value: 'volume'
					}, {
						messageId: 'java30433.lazyload.menu.rate',
						value: 'rate'
					}, {
						messageId: 'java30433.lazyload.menu.panner',
						value: 'panner'
					}],
					default: 'currentTime'
				},
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: args => {
				if (!mp3.get(args.name)) return "Error: Can't find audio";
				const mp3ins = mp3.get(args.name);
				switch (args.n) {
					case 'currentTime':
						return mp3ins.getNow();
					case 'duration':
						return mp3ins.duration;
					case 'volume':
						return mp3ins.getVolume();
					case 'rate':
						return mp3ins.rate;
					case 'panner':
						return mp3ins.getPanner();
				}
			}
		});
		addBlock({
			opcode: 'getMusicStateBool',
			type: type.BlockType.BOOLEAN,
			param: {
				n: {
                    type: type.ParameterType.STRING,
					field: true,
                    menu: [{
						messageId: 'java30433.lazyload.menu.ended',
						value: 'ended'
					}, {
						messageId: 'java30433.lazyload.menu.playing',
						value: 'playing'
					}, {
						messageId: 'java30433.lazyload.menu.loaded',
						value: 'loaded'
					}, {
						messageId: 'java30433.lazyload.menu.loop',
						value: 'loop'
					}],
					default: 'loaded'
				},
				name: {
                    type: type.ParameterType.STRING,
                    default: 'Ushio'
                }
			},
			function: args => {
				if (!mp3.get(args.name)) return false;
				const mp3ins = mp3.get(args.name);
				console.info(mp3ins);
				switch (args.n) {
					case 'ended':
						return mp3ins.getNow()>=mp3ins.duration;
					case 'playing':
						return mp3ins.isPlaying;
					case 'loaded':
						return true; //在第一行判断过了，没就false
					case 'loop':
						return mp3ins.loop;
				}
			}
		});
	}

    onUninit () {
        api.removeCategory('java30433.lazyload.category');
    }
}

module.exports = Lazyload;
