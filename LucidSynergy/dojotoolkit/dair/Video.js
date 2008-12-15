dojo.provide("dair.Video");
dojo.require("dijit._Widget");
dojo.require("dojox.av._Media");

dojo.declare("dair.Video", [dijit._Widget, dojox.av._Media], {
	// summary:
	//		Controls an Adobe AIR Video component. Plays the H264/M4V codec 
	//		with a little trickery: change the '.M4V' extension to '.flv'.
	//
	// example:
	//
	//		markup:
	//		|	<div id="vid" initialVolume=".7", 
	//		|		mediaUrl="../resources/Grog.flv" 
	//		|		dojoType="dair.Video"></div>
	//		programmatic:
	//		|	new dair.Video({
	//		|		initialVolume:.7, 
	//		|		mediaUrl:"../resources/Grog.flv"
	//		|	}, "vid");
	//
	//  mediaUrl: String
	// 		REQUIRED: The Url of the video file that will be played. 
	//		NOTE: Must be either an absolute URL or relative to the HTML file. 
	//		Relative paths will be converted to abslute paths
	
	
	// nodeId: String
	//		The node that the SWF will 'attach' to; mimicking its 
	//		x,y,w,h. In AIR, there is no SWF embedded in a node - 
	//		The Flash technology is in a hidden browser layer.
	nodeId:"",
	
	constructor: function(options, nodeId){
		// summary:
		//		Although this class inherits from _Widget, we are doing our
		//		own construction here, due to the AIR/HTML issues.
		this.nodeId = nodeId;
		setTimeout(dojo.hitch(this, "init"), 1);
	},
	
	init: function(){
		// summary:
		//		Initialize video. Needs to be called with a slight delay
		//		so that air video classes are ready.
		//
		var connection = new air.NetConnection();
		connection.addEventListener(air.NetStatusEvent.NET_STATUS, dojo.hitch(this, "onStatus"));
		connection.connect(null);
		
		var self = this;
		var client = {
			onMetaData: function(info){
				var o = {
					duration:info.duration,
					canSeekToEnd: info.canSeekToEnd, 
					audiocodecid: info.audiocodecid, 
					width: info.width, 
					videocodecid: info.videocodecid, 
					framerate: info.framerate, 
					audiodelay: info.audiodelay, 
					height: info.height, 
					videodatarate: info.videodatarate, 
					audiodatarate: info.audiodatarate 
				};	
				self.onMetaData(o);
			}
		};
		
		this.flashMedia = new air.NetStream(connection);
		this.flashMedia.addEventListener(air.NetStatusEvent.NET_STATUS, dojo.hitch(this, "onPlayerStatus"));
		this.flashMedia.addEventListener(air.AsyncErrorEvent.ASYNC_ERROR, dojo.hitch(this, "onError"));
		this.flashMedia.client = client;
		
		this.video = new air.Video();
		this.video.attachNetStream(this.flashMedia);
		window.htmlLoader.stage.addChild(this.video);
		
		var dim = dojo.coords(dojo.byId(this.nodeId));
		this.video.x = dim.x;
		this.video.y = dim.y;
		// TEMP CODE
		this.videoWidth = dim.w;
		
		//this.video.width = 50;
		//this.video.height = 25;
		
		this.isPlaying = false;
		this.isStopped = true;
		this._initStatus();
		this._update();
		
		if(this.autoPlay && this.mediaUrl){
			this.mediaUrl = this.mediaUrl;
			this.isPlaying = true;
			this.isStopped = false;
			this.flashMedia.play(this.mediaUrl);
		}
	},
	
	//  =============================  //
	//  Methods to control the player  //
	//  =============================  //
	
	
	play: function(newUrl /* Optional */){
		// summary:
		// 		Plays the video. If an url is passed in, plays the new link.
		if(newUrl){
			this.pause();
			this.mediaUrl = newUrl;
			this.flashMedia.play(this.mediaUrl);
		}else if(this.isStopped){
			this.flashMedia.play(this.mediaUrl);
		}else{
			this.flashMedia.resume();
		}
		this.isPlaying = true;
	},
	
	pause: function(){
		// summary:
		// 		Pauses the video
		this.flashMedia.pause();
		this.isPlaying = false;
	},
	
	seek: function(time /* Float */){
		// summary:
		// 		Goes to the time passed in the argument
		this.flashMedia.seek(time);
		if(!this.isPlaying){
			this.flashMedia.pause();
		}
	},
	
	//  =====================  //
	//  Player Getter/Setters  //
	//  =====================  //
	
	volume: function(vol){
		// summary:
		//		Sets the volume of the video to the time in the
		// argument - between 0 - 1.
		//
		if(vol!==undefined){
			if(this.flashMedia && this.flashMedia.soundTransform){
				var transform = this.flashMedia.soundTransform;
				transform.volume = this._normalizeVolume(vol);
				this.flashMedia.soundTransform = transform;
			}else{
				this.initialVolume = vol;	
			}
		}
		
		if(this.flashMedia && this.flashMedia.soundTransform){
			return this.flashMedia.soundTransform.volume;
		}else{
			return this.initialVolume;
		}
	},
	
	//  ==============  //
	//  Player Getters  //
	//  ==============  //
	
	getTime: function(){
		// summary:
		// 		Returns the current time of the video
		//	Note:
		//		Consider the onPosition event, which returns
		//		the time at a set interval. Too many trips to 
		//		the SWF could impact performance.
		return this.flashMedia.time; //Float
	},
	
	
	
	XXXonPlayerStatus: function(/* Object */data){
		// summary:
		// 		The status of the video from the SWF
		// 		playing, stopped, bufering, etc.
		//console.warn(" > STATUS:", data.info.code);
		
		// NOTE Fall-throughs!
		switch(data.info.code){
			case "NetStream.Play.StreamNotFound":
				this.onError({
					type:"HTTP",
					info:{
						code:"NetStream Not Found"	
					}
				}, this.mediaUrl);
				break;
			
			case "NetConnection.Connect.Success" :
				this.onLoad(data.info.code);
				break;
			
			case "NetStream.Play.Start":  
				this.isPlaying = true;
				this.isStopped = false;
				this.onStart(data.info.code);
				this.onPlay(data.info.code);
				break;
			case "NetStream.Buffer.Full":
				break;
			case "NetStream.Buffer.Empty":
			case "NetStream.Play.Stop":  // GO BY DURATION
			/*	if(!this.isBuffering){
					this.isPlaying = false;
					this.isStopped = true;
					//this.onStop();
					this.onEnd();
				}*/
			 break;
			case "NetStream.Buffer.Flush":
			break;
			default:
			break;
			
		}
	},
	
	onResize: function(playerDimensions){
		// summary:
		//		When player is resized, we need to push the 
		//		SWF around to maintain its location.
		var pw = playerDimensions.w;
		var x = (pw-this.videoWidth)/2;
		this.video.x = x;
		
	},
	//  ===============  //
	//  Private Methods  //
	//  ===============  //
	
	_checkBuffer: function(/* Float */time, /* Float */bufferLength){
		// summary:
		//		Checks that there is a proper buffer time between
		//		current playhead time and the amount of data loaded.
		//		Works only on FLVs with a duration (not older). Pauses
		//		the video while continuing download.
		//
		if(this.percentDownloaded == 100){
			if(this.isBuffering){
				this.onBuffer(false);
				this.flashMedia.resume();
			}
			return;
		}
		
		if(!this.isBuffering && bufferLength<0.1){
			this.onBuffer(true);
			this.flashMedia.pause();
			return;
		}
		
		var timePercentLoad = this.percentDownloaded*0.01*this.duration;
		
		// check if start buffer needed
		if(!this.isBuffering && time+this.minBufferTime*0.001>timePercentLoad){
			this.onBuffer(true);
			this.flashMedia.pause();
		
		// check if end buffer needed
		}else if(this.isBuffering && time+this.bufferTime*0.001<=timePercentLoad){
			this.onBuffer(false);
			this.flashMedia.resume();
		}
		
	},
	
	_update: function(){
		// summary:
		//		Helper function to fire onPosition, check download progress,
		//		and check buffer.
		var dObj = {
			buffer: this.flashMedia.bufferLength,
			bytesLoaded:this.flashMedia.bytesLoaded,
			bytesTotal:this.flashMedia.bytesTotal
		};
		this.percentDownloaded = Math.ceil(dObj.bytesLoaded/dObj.bytesTotal*100);
		this.onDownloaded(this.percentDownloaded);
		var time = this.flashMedia.time || 0;
		this.onPosition(time);
		if(this.duration){
			this._checkBuffer(time, dObj.buffer);	
		}
		setTimeout(dojo.hitch(this, "_update"), this.updateTime);
	},
	
	_normalizeVolume: function(vol){
		// summary:
		//		Ensures volume is less than one
		//
		if(vol>1){
			while(vol>1){
				vol*=0.1;	
			}
		}
		return vol;
	}
});