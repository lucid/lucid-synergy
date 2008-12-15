dojo.provide("dair.File");

dojo.declare("dair.File", null, {
	// summary:
	//		Exposes the AIR File API, making it easier to read and write files.
	// description:
	//		dAIR.File reads, writes, copys, and deletes plain-text files.
	//
	// untitled: String
	//		The string used when a file has yet to be titled.
	untitled: "Untitled",
	//
	// noFile: String
	//		The string used when there is no file avialable.
	noFile:"[ No File ]",
	//
	constructor: function(){
		this.fileStream = new air.FileStream();
		this.file = null;
		this.isTemp = false;
		this.myDocs = air.File.documentsDirectory;
		
		this.lastOpenPath = this.myDocs.nativePath;
		this.lastSavePath = this.myDocs.nativePath;
	},
	
	onNewFile: function(){
		// summary:
		//		Fired when a new file is created
	},
	onBrowse: function(){
		// summary:
		//		Fire when the system dialog is opened
	},
	onOpen: function(){
		// summary:
		//		Fires when a file is opened.
	},
	onSave: function(){
		// summary:
		//		Fires when a file is saved.
	},
	onCopy: function(){
		// summary:
		//		Fires when a file is copied.
	},
	onMove: function(){
		// summary:
		//		Fores when a file is moved.
	},
	onDelete: function(){
		// summary:
		//		Fire when a file is deleted.
	},
	onClose: function(){
		// summary:
		//		Fires when a file is closed.
	},
	onError: function(evt){
		// summary:
		//		Fires on errors.
	},
	
	
	getNewFile: function(/* String? */type){
		// 	summary:
		//		Internal. Get a new air.File instance.
		// type: String
		//		undefined, or 'save' or 'open' or  system path. 
		// description:
		//		'save' and 'open' will create a file with a link to 
		//		the last folder opened or saved to. A path will open 
		//		or save to that path. Undefined will use the default.
		var path = null;
		if(type=="save"){
			path = this.lastSavePath;
		}else if(type=="open"){
			path = this.lastOpenPath;
		}else if(type===undefined){
			//
		}else{
			path = type;	
		}
		return new air.File(path); // Object
	},
	
	getName: function( /Boolean?*/ fullname){
		// 	summary:
		//		Returns the name of the file. If there is no file.
		//		returns the string for this.noFile. If true is
		//		passed, returns full system path and file name.
		if(this.isTemp){
			return this.untitled;
		}else if(!this.file){
			return this.noFile;	
		}else{
			return fullname ? this.file.nativePath : this.file.name;
		}
		// returns String
	},
	getFullName: function(){
		//	summary
		//		See getName()
		return this.getName(true); //String
	},
	newFile: function(){
		//	summary:
		//		Closes any existing file and creates a new one.
		//
		this.close();
		this.file = air.File.createTempFile();
		this.isTemp = true;
		this.onNewFile();
	},
	
	open: function(/*String?*/ path){
		//	summary:
		//		Closes any existing file and opens a new one.
		//
		var def;
		if(path){
			this.file = this.getNewFile();
			this.openFile(path);
			def = this._defer(dojo.hitch(this, "readFile"));
		}else{
			def = new dojo.Deferred();
			
			this.file = this.getNewFile("open");
			var txtFilter = new air.FileFilter("Text", "*.as;*.css;*.html;*.txt;*.xml"); 
			var conSelect = dojo.connect(this.file, air.Event.SELECT, this, function(evt){
				this.file = evt.target;											
				def.callback(this.readFile());														   
				dojo.disconnect(conSelect);
			});
		
			this.file.browseForOpen("Open", new window.runtime.Array(txtFilter));
			
		}
		return def; // dojo.Deferred
	},
	openFile: function(/*String*/path){
		// summary:
		//		Opens the file based on the path argument.
		//
		this.file = this.file.resolvePath(path);
	},
	saveAs: function(str){
		//	summary:
		//		Saves the file to a new location by launching
		//		a system browse-for-save dialog
		this.isTemp = true;
		this.onBrowse();
		this.save(str);
	},
	save: function(str){
		//	summary:
		//		Saves the file. If the file has not been saved,
		//		opens the system browse-for-save dialog
		//
		if(this.isTemp){
			this.file = this.getNewFile("save");
			this.file.browseForSave("Save As...");
			dojo.connect(this.file, air.Event.SELECT, this, function(evt){
				console.log("SAVE EVENT:", evt);
				this.file = evt.target;
				this.fileStream.open(this.file, air.FileMode.WRITE);
				this.fileStream.writeUTFBytes(str);
				this.fileStream.close();
				this.lastSavePath = this.file.nativePath;
				this.isTemp = false;
			});
		}else{
		//	console.log("writing to file....");
			this.fileStream.open(this.file, air.FileMode.WRITE);
			this.fileStream.writeUTFBytes(str);
			this.fileStream.close();
		}
		this.onSave();
	},
	close: function(){
		// summary:
		//		Closes the file
		this.file = null;
		this.onClose();
	},
	copyTo: function(overwrite, isMove){
		//	summary:
		//		Copys or moves the file to a new path, maintaining
		//		the file name.
		var con = dojo.connect(this.myDocs, air.Event.SELECT, this, function(evt){
			dojo.disconnect(con);
			var path = evt.currentTarget.nativePath+"/"+this.file.name;
			//
			var temp = this.getNewFile(path);
			
			try{
				this.file.copyTo(temp, overwrite);
				if(isMove){
					this.remove(true);
					this.file = this.getNewFile(path);
					this.onMove();
				}else{
					this.file = temp;
					this.onCopy();
				}
			}catch(e){
				console.error("ERROR:", e);
				var type = isMove ? "move" : "copy"
				this.onError({type:type, message:"Could not "+type+". The file or folder may be locked."});
			}
			
		}); 
		this.myDocs.browseForDirectory("Select a folder"); 
		
	},
	moveTo: function(str){
		//	summary:
		//		Moves the file to a new path, maintaining
		//		the file name.
		var con1, con2, con3;
		this.copyTo(false, true);
	},
	remove: function(isMove){
		//	summary:
		//		Deletes the file
		try{
			this.file.deleteFile();
			this.file = null;
			if(!isMove) this.onDelete();
		}catch(e){
			this.onError({type:"delete", message:"Could not delete. The file or folder may be locked."});
		}
		
	},
	readFile: function(event) {
		// summary:
		//		Reads the file text into memeory and returns
		//		it as a string.
		this.fileStream.open(this.file, air.FileMode.READ);
		var str = this.fileStream.readMultiByte(this.fileStream.bytesAvailable, air.File.systemCharset);
		this.fileStream.close();
		this.lastOpenPath = this.file.nativePath;
		this.isTemp = false;		
		this.onOpen();
		return str; // Sting
	},
	freeSpace: function(){
		// 	summary:
		//		Returns space avaialable on the user's hard drive
		return air.File.applicationStorageDirectory.spaceAvailable;
	},
	_defer: function(data){ 
		//	summary:
		//		Internal. Fakes a deferred, to match a real deferred.
		//	description:
		// 		if an async deferred is not needed, this gives the 
		//		necessary pause for a deferred to return 
		var def = new dojo.Deferred();
		setTimeout(function(){
			def.callback(data);
		}, 0);
		return def;
	}
});