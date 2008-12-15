dojo.provide("dair.Icon");

dojo.mixin(dair.Icon, {
	//	summary:
	//		A global, single object (since there is only one icon to an
	//		application).
	//		Controls the appearance of the system icon in the taskbar or dock.
	//		Also shows notifications by bouncing the dock icon (currently does not
	//		affect the windows taskbar as it should)
	//	Note:
	//		No initialization or parameters. Only methods and events to the 
	//		global object.
	//
	icon: air.NativeApplication.nativeApplication.icon,
	isDock: air.NativeApplication.supportsDockIcon,
	isTray: air.NativeApplication.supportsSystemTrayIcon,
	folderIcon: window.runtime.flash.desktop.Icon,
	
	//REF: window.runtime.flash.desktop.Icon.bitmaps = desktop icon bitmaps
	
	init: function(){
		// summary:
		//		Initilization.
		if(!this.initialized){
			this.aniSpeed = 100;
			this.loops = false;
			this.isAnimating = false;
			this.animateable = false;
			this.menuConnects = [];
			this.initialized = false;
			dojo.connect( this.icon, window.runtime.flash.events.Event.DEACTIVATE, this, "onBlur");
			dojo.connect( this.icon, window.runtime.flash.events.Event.ACTIVATE, this, "onFocus");
			
			// setIcon sometimes fails on launch. This seems to be a timing issue.
			// I have no idea how to check if things are actually ready
			setTimeout(dojo.hitch(this, "onReady"), 300);
			this.initialized = true;
		}
	},
	// ======= //
	//	EVENTS //
	// ======= //
	
	onReady: function(){
		//	summary:
		//		Fired when icon class is loaded and 
		//		ready for communication
		this.initialized = true;
	},
	onBlur: function(evt){
		//	summary:
		//		Fired when application loses focus.
	},
	onFocus: function(evt){
		//	summary:
		//		Fired when application receives focus.
	},
	
	/*
	Not hooked up - windows only 
	would detect clicks on the task icon
	but the menu handles that, so this is dubious
	onClick: function(evt){
		console.warn("EVT:", evt);
	},
	*/
	// ========================= //
	//	PUBLIC METHODS - SETTERS //
	// ========================= //
	
	setMenu: function(/*Object*/keyValues){
		//	summary:
		//		Sets the right/command click of the 
		//		dock/taskbar icon
		// arguments:
		// 		key/values of a label and a closure.
		// 	NOTE: 
		//		To add or remove items, it's necessary to 
		// 		rebuild the entire menu.
		var menu = new air.NativeMenu();
		
		if(this.menuConnects.length){
			dojo.forEach(this.menuConnects, function(c){
				dojo.disconnect(c);										 
			});
			this.menuConnects = [];
		}
		for(var label in keyValues){
			var item = menu.addItem(new air.NativeMenuItem(label));
			this.menuConnects.push(dojo.connect(item, air.Event.SELECT, keyValues[label]));
		}
		this.icon.menu = menu;
	},
	
	setTooltip: function(/*String*/message){
		//	summary:
		//		Sets the tooltip of the icon.
		if(this.isTray){
			this.icon.tooltip = message;
		}else{
			console.warn("Tooltip is not supported on a Mac.");
		}
	},
	
	backgroundAlert: function(/*Boolean?*/critical){
		// summary:
		//		Bounces dock icon. If critical=true, bounces repeatedly.
		//		Bug in windows. Taskbar does not flash.
		//
		var type = critical ? air.NotificationType.CRITICAL : air.NotificationType.INFORMATIONAL;
		if(this.isDock){
			 this.icon.bounce(type);
		}
		if(this.isTray){
			//should flash task bar item
			
			type = air.NotificationType.INFORMATIONAL;
			//		console.log("Attempt to notify:", air.NativeWindow.supportsNotification, type, air.NotificationType);
			
			 air.NativeWindow.notifyUser(type);
		}
	},
	removeIcon: function(){
		//	summary:
		// 		On Mac, reverts to original icon
		// 		On windows, removes it from sys tray
		this.icon.bitmaps = [];
	},
	setIcon: function(/*Array*/imgPaths, /*String*/which){
		//	summary:
		//		Sets the icon image.
		//	arguments:
		//	imgPaths: Array
		//		An array of paths to supoorted image types (usually PNGs)
		//		of different sizes: 16, 32, 48, 128 pixels square.
		//	which: String
		//		Attempt to support a desktop icon. Not working.
		//	returns:
		//		dojo.Deferred
		//
		//	console.log("SetIcon", imgPaths, imgPaths.length, "to:", which);
		if(!imgPaths || imgPaths.length===0){
			console.warn("No images passed to setIcon");
			return;
		}
	//	console.count("icon")
		// make copy of array, so we don't kill the original instance later
		imgPaths = imgPaths.concat();
		which = !which ? "bar" : which;
		//which = "bar"; //desktop icon doesn't seem to work
		this.stopAni();
		
		var def = new dojo.Deferred();
		if(!dojo.isArray(imgPaths)) {
	//		console.warn("One image will work, but the system expects four images: 16, 32, 48, and 128 pixels square.");
			imgPaths = [imgPaths];
		}

		var d = this.loadImages(imgPaths);
		d.addCallback(this, function(){
			var bitmaps;
			if(which=="folder"){
				this.folderIcon.bitmaps = this.images;
				bitmaps = this.folderIcon.bitmaps;
			}else if(which =="bar"){
				this.icon.bitmaps = this.images;
				bitmaps = this.icon.bitmaps;
			}else{//both
				this.folderIcon.bitmaps = this.images;
				this.icon.bitmaps = this.images;
				bitmaps = this.icon.bitmaps;
			}
			if(bitmaps.length > 1 && bitmaps[0].width == bitmaps[1].width){
				//console.log("ANIMATEABLE")
				this.animateable = true;
			}else{
				//console.log("NOT ANIMATEABLE")
				this.animateable = false;	
			}
			def.callback(this);
		});
		
		d.addErrback(this, function(evt){
			def.errback(evt);
		});
		return def; //dojo.Deferred
	},
	
	// =========================== //
	//	PUBLIC METHODS - ANIMATION //
	// =========================== //
	
	animationSpeed: function(/*Number*/ms){
		//	summary:
		//		Sets animation speed in milliseconds.
		//	Note:
		//		Long durations, such as 400ms are sufficient.
		if(ms){
			this.aniSpeed = ms;	
		}
		return ms;
	},
	animateOnce: function(){
		//	summary:
		//		Tells the animation object to complete
		//		one cycle.
		//
		this.loops = false;
		this.toggleAni();
	},
	animateLoop: function(){
		//	summary:
		//		Tells the animation object to loop.
		//
		this.loops = true;
		this.toggleAni();
	},
	toggleLoop: function(){
		//	summary:
		//		Toggles the animation object from play to pause,
		//		and tells it to loop.
		this.loops = true;
		this.toggleAni();
	},
	toggleOnce: function(){
		//	summary:
		//		Toggles the animation object from play to pause,
		//		but only animates once.
		this.loops = false;
		this.toggleAni();
	},
	toggleAni: function(){
		//	summary:
		//		Toggles the animation object from play to pause.
		if(this.isAnimating){
			this.stopAni();
		}else{
			this.startAni();
		}
	},
    startAni: function(event){
		//	summary:
		//		Starts animation.
		if(this.animateable){
			this.isAnimating = true;
			clearInterval(this.animTimer);
			this.animTimer = setInterval(dojo.hitch(this, "advanceFrame"), this.aniSpeed);
		}
	},
	stopAni: function(event){
		//	summary:
		//		Stops animation.
		this.isAnimating = false;
		clearInterval(this.animTimer);
	},
	
	
	
	// ================= //
	//	PRIVATE METHODS  //
	// ================= //
	
	
	advanceFrame: function(event){
		//	summary:
		//		Internal. Advances animation to next bitmap.
		if(this.currentFrame < this.images.length - 1){
			this.currentFrame++;
		} else {
			this.currentFrame = 0;
			if(!this.loops){
				this.stopAni();
			}
		}
		this.icon.bitmaps = [this.images[this.currentFrame]];
	},
    
	
	
	loadImages: function(imgUrls, def){
		//	summary:
		//		Internal.Loads an array of images.
		//
		if(!def){
			def = new dojo.Deferred();
			this.images = [];
			this.currentFrame = 0;
		}
		var url = imgUrls.pop();
		var d = this.loadImage(url);
		
		d.addCallback(this, function(bitmap){
			if(bitmap){ this.images.push(bitmap); }
			
			if(imgUrls.length > 0){
				this.loadImages(imgUrls, def);	
			}else{
				def.callback();
			}
		});
		d.addErrback(this, function(evt){
			def.errback(evt);  
		});
		
		return def; //dojo.Deferred
	},
	
	
	loadImage: function(imgPath){
		//	summary:
		//		Internal. Loads one image.
		//
		var def = new dojo.Deferred();
		var loader = new air.Loader();
		loader.contentLoaderInfo.addEventListener(air.IOErrorEvent, dojo.hitch(this, function(evt){
		//	console.error("ERROR loading url:", imgPath);
			def.errback(evt);
		}));
		loader.contentLoaderInfo.addEventListener(air.ProgressEvent, dojo.hitch(this, function(evt){
	//		console.log(" ProgressEvent----->:", evt);
		// FIXME: why is this event listener added?	
			//def.errback(evt);
		}));
		loader.contentLoaderInfo.addEventListener(air.Event.COMPLETE, dojo.hitch(this, function(evt){
			def.callback(evt.target.content.bitmapData);
		}), false, 0, true);
		loader.load(new air.URLRequest(imgPath));	
		
		return def; //dojo.Deferred
	}

	
	
});

dair.Icon.init();