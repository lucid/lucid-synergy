dojo.provide("dair.Window");
dojo.require("dijit._base.place");
dojo.require("dojox.fx._core");

(function(){

	dair.getViewport = function(){
		// summary: Mixin screen resolutions into viewport sniffing code
		return dojo.mixin(dijit.getViewport(), { 
			sx: air.Capabilities.screenResolutionX, 
			sy: air.Capabilities.screenResolutionY
		});
	}

	dojo.declare("dair.Window", null, {
		// summary: A Window object, wrapping a NativeWindow with many convenience functions
		//		and communication abilities. Can be used standalone, or as part of a 
		//		`dair.Application`
		//
		// href: String
		//		URL to load into this window
		href:"",

		/*=====
		// size: Object
		//		A MarginBox like size including values for w:, h: (required) and t:, l: (optional)
		size:{},
		=====*/
		
		// resizable: Boolean
		//		Can this window be resized (ignored if systemChrome=none)
		resizable: true,

		// minimizable: Boolean
		//		Can this window be minimized (ignored if systemChrome=none)
		minimizable:true,

		// maximizable: Boolean
		// 		Can this window be maximized (ignored if systemChrome=none)
		maximizable:true,

		// type: String
		// 		The type of window unit. One of "normal", "lightweight", or "utility"
		type:"normal",
		
		// systemChrome: String
		//		The type of chrome to use for this window. "none" disables
		systemChrome:"standard",
		
		// transparent: Boolean
		//		If true, systemChrome="none" is assumed
		transparent:false,
	
		// fullscreen: Boolean
		//		Does this window start maximized
		fullscreen:false,
		
		// alwaysInFront: Boolean
		//		Set to true in order to set this Window on top of all other system windows
		alwaysInFront:false,

		constructor: function(args){
		
			dojo.mixin(this, args);
		
			// relay along options from args
			var options = new air.NativeWindowInitOptions(); 
			if(this.transparent || this.type == "lightweight"){ this.systemChrome = "none"; }
			if(!this.resizeable){
				this.maximizable = false;
			}
			dojo.forEach(
				["systemChrome","type","transparent","maximizable","minimizable","resizable"],
				function(opt){
					options[opt] = this[opt];
			},this);
			
			this.position = this._createBounds(this.size);
			this._window = air.HTMLLoader.createRootWindow(true, options, true, this.position);
			this._pane = this._window.window.nativeWindow;
			dojo.connect(this._pane, air.Event.CLOSING, this, "close");

			dojo.forEach(["alwaysInFront","fullscreen","href"],
				function(prop){
					if(this[prop] !== undefined){
						this.attr(prop, this[prop]);
					}
			},this);
			
			// hook closing event to this.close()
		
		},
	
		bringToFront: function(){
			// summary: Float this window to the top of the stack
			this._pane.orderToFront();
			return this; // dair.Window
		},

		activate: function(){
			// summary: Activate this pane (show if not visible, set focus)
			this._pane.activate();
			return this; // dair.Window
		},
		
		_fullscreenSetter: function(isFull){
			// summary: attr wrapper for setting fullscreen
			
			// FIXME: not sure if there is a "more fullscreen" than this, like overlaying OS stuff?
			// wouldn't trust that in linux though ...
			this.fullscreen = isFull;
			if(this.fullscreen){
				this.attr("position", { w:"100%", h:"100%", t:0, l:0 });
			}
		},
		

		_hrefSetter: function(url){
			// summary: attr wrapper for remote content setting
			this.href = url;
			url = new air.URLRequest(url);
			this._window.load(url);
			this._window.window.runtime = window.runtime; 
			this._window.window.getWindow = dojo.hitch(this, function(){ return this; });

		},

		_contentSetter: function(html){
			// summary: attr wrapper for content setting
			var body = this._window.document.getElementsByTagName("body")[0];
			body.innerHTML = html;
		},

		_alwaysInFrontSetter: function(/* Boolean */ami){
			// summary: attr wrapper for setting always 
			this.alwaysInFront = ami; 
			this._pane.alwaysInFront = ami;
		},

		_createBounds: function(/* Object */ts){
			// summary: Create a bounding box based on sizes passed.
			// ts: Object
			//		An object of sizes to use. All are optional.
			// returns: air.Rectangle
			
			var vp = dair.getViewport();
			var x = vp.sx, y = vp.sy;

			// FIXME: add support for b: and r: properties
			// 		* if l, w and r OR l and r override width
			//		* if l and w, or r and w, explicit size
			//		* if w only, center
			//		* if w is percentage, revisit all above after converting to px value
			// 		same applies for h/t/b
			
			var tp = this._pane || {};
			var w = (ts.w !== undefined ? ts.w : tp["width"] || undefined),
				h = (ts.h !== undefined ? ts.h : tp["height"] || undefined),
				t = (ts.t !== undefined ? ts.t : (tp.y >= 0 ? tp.y : (isNaN(h) ? 0 : (y - h)/2) )),
				l = (ts.l !== undefined ? ts.l : (tp.x >= 0 ? tp.x : (isNaN(w) ? 0 : (x - w)/2) ))
				;
			
			if(l < 0){ 
				alert(l);
			}
			if(!w || !h || isNaN(t) || isNaN(l)){
				return undefined; // will throw an error!
			}
			
			var recalc = false;
			if(dojo.isString(w)){
				w = x * (parseInt(w) / 100);
				while(w + l > x){ l--; }
				recalc = true;
			}
			if(dojo.isString(h)){
				h = y * (parseInt(h) / 100);
				while(h + t > y){ t--; }
				recalc = true;
			}
			
			if(recalc){
				return this._createBounds({ w:w, h:h, t:t, l:l });
			}else{
				return new air.Rectangle(l, t, w, h);
			}
			
		},
		
		_positionSetter: function(pos){
			// summary: attr wrapper for position setting/getting
			this.position = this._createBounds(pos);
			this._pane.bounds = this.position;
		},
	
		onClose: function(e){ 
			// summary: Event fired when window is being closed. Return false to prevent.
			return true; // Boolean
		},

		close: function(e){
			// summary: Close this window, checking onClose logic first
			if(this.onClose(e||undefined)){
				if(this.inApp && this.inApp.removeWindow){
					this.inApp.removeWindow(this);
				}else{
					this._pane.close();
				}
			}
		},
	
		/* the single API getter/setter */
		attr: function(attr, val){
			// summary: Attribute setter/getter for this window.
			// description: 
			//		A centralized API to handle all attribute getting/setting
			//		
			//	example:
			//	| thinger.attr("position"); // returns current bounding box
			//  example:
			//	| thinger.attr("position", { w: 200, h:200 }); // set the window to 200x200
			
			if(val !== undefined){
				if(dojo.isFunction(this["_" + attr + "Setter"])){
					this["_" + attr + "Setter"](val);
				}
				return this; // dair.Window
			}else{
				return this[attr] || undefined;
			}
		},
		
		notify: function(message){
			// summary: a stub overridden when this window is apart of an Application. .notify 
			// 		can be called from within the Application scope, or Window scope. 
		},
		
		center: function(){
			// summary: center this window in the viewport/screen
			var vp = dair.getViewport();
			var w = this._pane.width, h = this._pane.height;
			this.attr("position",{
				w: w,
				h: h,
				t: (vp.sy - h) / 2,
				l: (vp.sx - w) / 2
			});
		}

	});

	
})();