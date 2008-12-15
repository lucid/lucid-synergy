dojo.provide("dair.Application");
dojo.require("dojox.storage.AirFileStorageProvider");
dojo.require("dair.Window");

(function(){

	var _windows = [];
	var _toaster = null;

	dojo.declare("dair.Application", null, {
		// summary: The Top level Dojo-AIR Application layer. 
		// descrtion:
		//		This is the Class used to control all aspects of your application
		//		code. R
		//
		//
		// icon: String
		//		dock icon in OSX, icon for taskbar in XP
		icon: "", 

		// initialPage: Object
		//		Create a root instance
		initialPage: null,

		// windowClass: String
		//		The fully-qualified Class name for the "Window" wrappers
		windowClass: "dair.Window",
		
		// autoExit: Boolean
		//		Does this Application close when all it's children are gone?
		autoExit: true,

		// hasStorage: Boolean
		//		Does this application have built-in storage
		hasStorage: true,
		
		// databaseFile: String
		//		Filename for our storage provider, if hasStorage=true
		databaseFile: "dair.db",
		
		// databaseName: String
		//		The default namespace to use for our database:
		databaseName: "dairApplication",
		
		// startHidden: Boolean
		// 		Hide the initial window. Set true to allow for splash-loading like behavior
		startHidden: true,
		
		constructor: function(args){
			dojo.mixin(this, args);
			if(this.initialPage){
				this.addWindow(this.initialPage);
			}
			
			if(this.startHidden){
				this.hide();
			}
			
			if(this.hasStorage && !this.storage){
				this.storage = new dojox.storage.AirFileStorageProvider();
				dojo.mixin(this.storage,{
					DATABASE_FILE: this.databaseFile,
					DEFAULT_NAMESPACE: this.databaseName
				});
			}
			
			// setting up the Toaster, becuase the first message is lost in onLoad land
			this.notify("init");
		},
		
		addWindow: function(/* dair.Window|Object */props){
			// summary: Add a window to this Application.
			// description: 
			//		A utility to add A dair.Window to your Application, which handles
			//		synchronizing the Notification system, storage provider, and tracking.
			//		If a window is added without passing through Application.addWindow(), 
			//		it will not contain the vital hookups between the other windows.
			//
			// props: Object|dair.Window
			//		Either a class-like object created that matches the windowClass setting in the
			//		Application, or an Object hash of values to be passed to a Window constructor
			//		to be created, then added. See `dair.Window` for details on construction.
			
			var c = dojo.getObject(this.windowClass);
			var thing = props && props.declaredClass ? props : new c(props);
			dojo.mixin(thing,{
				notifier: _toaster,
				notify: dojo.hitch(this, "notify"),
				inApp: this,
				provider: this.storage
			});
			_windows.push(thing);
			return thing; // dair.Window
		},
		
		removeWindow: function(/* dair.Window */obj){
			// summary: Remove a passed `dair.Window` from this application. 
			// description: 
			//		Removes a passed `dair.Window` instance from this Application. Application
			//		will close if `autoExit` defined and passed window is last available.
			
			if(obj && obj._pane){ 
				_windows = dojo.filter(_windows, function(w){
					return w && w._pane && w._pane != obj._pane;
				});
				if(!obj._pane.closed){
					obj._pane.close();
				}
				if(this.autoExit && _windows.length === 0){
					this.shutdown();
				}
			}
		},
		
		hide: function(){
			// summary: Hide the root Application window
			window.nativeWindow.visible = false;
		},
		
		alert: function(){
			// summary: [deprecated?] Either cause the sysdoc to bounce (osx) or flash (xp)
		},
		
		notify: function(message){
			// summary: Relay `message` through a global "Toaster" window, displaying
			//		a type of notification to the user. See `dojox.widget.Toaster` for
			// 		message syntax details
			if(!_toaster){
				var c = dojo.getObject(this.windowClass);
				var vp = dair.getViewport();
				_toaster = new c({
					transparent:true,
					size:{
						h:vp.sy - 10, w:275, l: vp.sx - 285, t:25
					},
					resizable:false, maximizable:false, minimizable:false,
					alwaysOnTop:true,
					href: dojo.moduleUrl("dair.resources","ToasterWindow.html")
				});
			}
			var doc = _toaster._window.window;
			if(doc.dojo){
				dojo.withDoc(doc.document, function(){
					try{
						doc.notify()(message);
					}catch(e){
						air.trace(e);
					}
				});	
			}
			_toaster._pane.activate();
			// FIXME: no _contentSetter
		},
		
		cascadeWindows: function(){
			// summary: Order all the windows in this Application starting in the Top/Left 
			//		corner of the screen.
			
			// Take all the windows, position their t/l incremeneted by a hair, and do the ordering
			var offset = 20;
			dojo.forEach(_windows, function(w, i){
				if(!w._pane.closed && w._pane.visible){
					w.attr("position", {
						t: offset * (i + 2),
						l: offset * (i + 1)
					});
					w._pane.orderToFront();
				}
			});
		},
		
		shutdown: function(){
			// summary: Shutdown this Application, closing all the windows and self.
			dojo.forEach(air.NativeApplication.nativeApplication.openedWindows, function(w){
				w.close();
			});
			window.nativeWindow.close();
		}

	});	
	
})();
