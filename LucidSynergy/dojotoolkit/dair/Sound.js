dojo.provide("dair.Sound");
dojo.require("dojox.av._Media");

(function(){
	
	dair.SoundMixer = {
		//	summary:
		//		The global object that controls ALL sound in a SWF (and reportedly, 
		//		all SWFs open in a browser).
		//	example:
		//		| dair.SoundMixer.init(0.6, 0.0); // volume and pan
		//
		//	_vol: Float
		//		The volume level, from 0 to 1.
		_vol: 0.9,
		//
		//	_pan: Float
		//		The left/right pan. From -1 to 1. 0 would be centered.
		_pan: 0.2,
		
		init: function(/*Float*/ volume, /*Float*/ pan){
			//	summary:
			//		Initialize global sound transform.
			if(!this.initialized){
				this._vol = (volume===undefined)?this._vol:volume;
				this._pan = (pan===undefined)?this._pan:pan;
				this.mixer = air.SoundMixer;
				this.trans = new air.SoundTransform(this._vol, this._pan);
				this.mixer.soundTransform = this.trans;
				this.initialized = true;
			}
		},
		volume: function(/*Float*/v){
			//	summary:
			//		Sets/Gets the global volume.
			if(v){
				this._vol = v;
				this.trans.volume = this._vol;
				this.mixer.soundTransform = this.trans;//new air.SoundTransform(this.volume, this.pan);
			}
			return this.mixer.soundTransform.volume; //Float
		},
		pan: function(/*Float*/p){
			//	summary:
			//		Sets/Gets the global left/right pan.
			if(p){
				this._pan = p;
				this.trans.pan = this._pan;
				this.mixer.soundTransform = this.trans;//new air.SoundTransform(this.volume, this.pan);
			}
			return this.mixer.soundTransform.pan; // Float
		},
		spectrum: function(){
			//	summary:
			//		Returns an array of Floats representing the 
			//		256 sound levels from the left and right channels
			//		(512 in all). Currently the SAMPLE var is using
			//		every 16th level, to keep it manageable.
			//	NOTE:
			//		Still very experimental.
			//
			// 	NOTE: 
			//		Lot of dev code left in here. Even though the test 
			//		is working, this isn't really finished. Returning values
			//		between -300 and 300.
			
			//console.log("air.ByteArray -- ", this.volume());
			var byteArray = new air.ByteArray();
	
			this.mixer.computeSpectrum(byteArray, false, 2);
			
			var CHANNEL_LENGTH = 512,
				SAMPLE = 16,
				realArray = [],
				w = 100,
				low = 1000,
				high = -1000,
				rlow = 1000,
				rhigh = -1000,
				devArray = [];
				
			for(var i=0;i<CHANNEL_LENGTH;i++){
				var abyte = byteArray.readFloat();
				devArray.push(abyte);
				if(i % SAMPLE == 0){
					//get the next byte
					value = abyte + 0;
					rlow = Math.min(rlow, value);
					rhigh = Math.max(rhigh, value);
					
					value *= 512;
	
					//normalize it to be a value between 0 and 256
					//value = (value * CHANNEL_LENGTH) << 0;
					realArray.push(value);
					low = Math.min(low, value);
					high = Math.max(high, value);
				}
			}
			
			//console.log(realArray);
			//console.log("low:", low, "high:", high, "rlow:", rlow, "rhigh:", rhigh);
			//console.log(devArray)
			return realArray; // Array
		},
		stop: function(){
			//	summary:
			//		Stops all sounds from playing.
			this.mixer.stopAll();
		}
	}
	dair.SoundMixer.init();
})();

dojo.declare("dair.Sound", [dojox.av._Media], {
	//	summary:
	//		Creates a sounds instance from the path passed to it.
	//	NOTE:
	//		This code is working well, but will undergo changes so that
	//		the API will more closely match that of Video.
	//
	// url: String
	//		The path to the media.
	url:"",
	//
	//	autoPlay: Boolean
	//		Whether the sound plays on load or waits for play().
	autoPlay:false, 
	//
	//	initalVolume: Float
	//		The volume at which the media will start playing.
	initalVolume:1,
	//
	//	statusReturnTime: Number
	// 		How often playing events are updated
	statusReturnTime:100, 
	//
	//	bufferTime: Number
	// 		The amount in time of the audio that will be downloaded 
	//		before the file begins to play. an attempt is made to maintain 
	//		this buffer amount while playing. 8000 is default.
	bufferTime:8000, 
	//
	// status: read-only-String
	//		The current status of the media
	status:"not loaded",
	
	constructor: function(options){
		//	summary:
		//		Initialize the sound object.
		this._channel = {position:0}; // the SoundChannel - holds the playback position
		this._position = 0; // the current time of the file in milliseconds - Not a getter.
		this._interval = null;// for timer
		this._bufferObject = null;
		this.bytesLoaded = 0;
		this.bytesTotal =  0.01;
		this.url = options.url;
		
		if(options.bufferTime){
			this._bufferObject = new air.SoundLoaderContext(options.bufferTime, true);
		}
		
		this._load();
	},
	initializeGlobalTransform: function(){
		//	summary:
		//		TBD
		if(!dair.SoundMixer.initialized){
			dair.SoundMixer.init();
			//dair.Sound.SoundMixer = air.SoundMixer;
			//SoundMixer.soundTransform = new air.SoundTransform(1, -1);	
		}
	},
	//  =============================  //
	//  Methods to control the sound   //
	//  =============================  //
	
	play: function(){
		//	summary:
		//		Plays or unpauses the sound
		this._channel = this.flashMedia.play(this._position);
		//console.log("CHANNEL:", this._channel);
		return this;//Object
	},
	pause: function(){
		//	summary:
		//		Pauses the sound.
		this._position = this._channel.position;
		this._channel.stop();
		return this;//Object
	},
	stop: function(){
		//	summary:
		//		Stops the sound. After stopping, a subsequent play
		//		call will start from the beginning.
		this._position = 0;
		this._channel.stop();
		//this._channel.position is not actually getting set to 0
		// until next play. Kinda kludgey. This will trigger onStop for now:
		this.status = "stopping";
		return this; //Object
	},
	
	//  ======================  //
	//  Sound Getters/Setters   //
	//  ======================  //
	
	position: function(/*Number*/ms){
		//	summary:
		//		Gets/Sets the playhead position.
		if(ms) {
			this._position = ms;
			this._channel.stop();
			//console.log("set position:", this._position);
			this.play();	
		}
		return this._channel.position; // Number
	},
	//  =============  //
	//  Sound Events   //
	//  =============  //
	
	onID3: function(evt){
		//	summary:
		//		Fired when the ID3 data is received.
	},

	
	//  ===============  //
	//  Private Methods  //
	//  ===============  //
	
	
	_load: function(){
		//	summary:
		//		Loads and initializes sound.
		//	TODO: 
		//		Will be broken into seperate methods, to 
		//		resemble Video.
		
		// New Sound:
		this.flashMedia = new air.Sound(new air.URLRequest(this.url), this._bufferObject);
		
		// Listen to download
		this.flashMedia.addEventListener(air.ProgressEvent.PROGRESS, dojo.hitch(this, function(evt){
			this.bytesLoaded = evt.bytesLoaded;
			this.bytesTotal = evt.bytesTotal;
			this.onDownloaded({
				bytesLoaded:this.bytesLoaded, 
				bytesTotal:this.bytesTotal,
				duration: this.flashMedia.length,
				percentLoaded:Math.ceil(this.bytesLoaded/this.bytesTotal*100),
				estDuration: Math.ceil(this.flashMedia.length / (this.bytesLoaded / this.bytesTotal)),
				durSeconds:this.toSeconds(Math.ceil(this.flashMedia.length / (this.bytesLoaded / this.bytesTotal))*.001)
			}); 																				 
		})); 
		
		// Listen for meta
		this.flashMedia.addEventListener(air.Event.ID3, dojo.hitch(this,function(evt){
			var o = evt.target.id3;
			this.onID3({
				album:o.TALB,
				artist:o.TPE1,
				comment:o.COMM,
				genre:o.TCON,
				songName:o.songName, // should be TIT2 - isn't working, this does though
				track: o.TRCK,
				year:o.TYER
			}); 
		})); 
		
		// Listen for download complete
		this.flashMedia.addEventListener(air.Event.COMPLETE, dojo.hitch(this, function(evt){
			//console.warn("COMPLETE")
			this.onDownloaded({
				bytesLoaded:this.bytesLoaded, 
				bytesTotal:this.bytesTotal,
				duration: this.flashMedia.length,
				durSeconds:this.toSeconds(this.flashMedia.length*.001)
			});
		})); 
		
		// Listen for errors
		this.flashMedia.addEventListener(air.IOErrorEvent.IO_ERROR, dojo.hitch(this, "onError")); 
		
		// Listen for end of file
		this.flashMedia.addEventListener(air.Event.SOUND_COMPLETE, dojo.hitch(this, "onEnd"));
		
		this.status = "ready";
		
		// FIXME: is this interval EVER stopped?
		this._interval = setInterval(dojo.hitch(this, function(){
			var pos = this._channel.position;
			
			if(this.status=="stopping"){
				// stop was fired, need to fake pos==0
				this.status = "stopped";
				this.onStop(this._eventFactory());
			}else if(pos===0 ){//|| this.status == "stopped"
				if(this.status == "ready"){
					//never played	
				}else{
					//stopped
					this.status = "stopped";
					if(this._prevStatus != "stopped"){
						this.onStop(this._eventFactory());	
					}
				}
			}else{
				// pos > 0
				if(this.status == "ready"){
					//started
					this.status = "started";
					this.onStart(this._eventFactory());
					this.onPlay(this._eventFactory());
				
				}else if(this.status == "started" || (this.status == "playing" &&  pos != this._prevPos)){
					this.status = "playing";
					this.onPosition(this._eventFactory());
				
				}else if(this.status == "playing" && pos == this._prevPos){
					this.status = "paused";
					if(this.status != this._prevStatus){
						this.onPause(this._eventFactory());	
					}
				
				}else if((this.status == "paused" ||this.status == "stopped") && pos != this._prevPos){
					this.status = "started";
					this.onPlay(this._eventFactory());
				}
			}

			this._prevPos = pos;
			this._prevStatus = this.status;
			this.onStatus(this.status);
		
		}),this.statusReturnTime);
		
	},
	_eventFactory: function(){
		//	summary:
		//		Internal. Returns a common event object.
		var evt = {
			position:this._channel.position,
			seconds:this.toSeconds(this._channel.position*.001),
			status:this.status,
			percentPlayed:this._getPercent()
		}
		return evt; // Object
	},
	_getPercent: function(){
		//	summary:
		//		Internal. Returns the percentage played. Necessary until
		//		media has downloaded 100%.
		return 100 * (this._channel.position / Math.ceil(this.flashMedia.length / (this.bytesLoaded / this.bytesTotal)));
	},
	toSeconds: function(time){
		//	summary:
		//		Internal. Converts milliseconds to a stringified
		//		two-decimal number.
		ts = time.toString()

		if(ts.indexOf(".")<0){
			ts += ".00"
		}else if(ts.length - ts.indexOf(".")==2){
			ts+="0"
		}else if(ts.length - ts.indexOf(".")>2){
			ts = ts.substring(0, ts.indexOf(".")+3)
		}
		return ts;
	}
	
});