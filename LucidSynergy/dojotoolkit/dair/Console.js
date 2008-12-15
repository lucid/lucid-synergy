dojo.provide("dair.Console");

//	summary:
//		Adds Firebug-like features to AIRIntrospector. Also adds ReCSS, that
//		can be called with control/command - r, or by calling window.recss().
//		Options can be set with djConfig.
//	description:
//		Available methods:
//			console.log
//			console.debug
//			console.info
//			console.warn
//			console.error
//			console.dir
//			console.dirxml
//			console.trace
//			console.assert
//			console.count
//			console.time
//			console.timeEnd
//			window.recss
//		Options can be set in the djConfig. See example.
//
//	example:
//		| djConfig={
//		| 	isDebug:true, 				// true debugs to Console or terminal, false, no output
//		| 	airConfig:{
//		| 		terminal:false,			// logs to terminal window, does not open Console
//		| 		debuggerKey:119,		// the keyCode that opens the Console in debugger mode (doesn't seem to work)
//		| 		introspectorKey:118, 	// the keyCode that opens the Console 
//		| 		showTimestamp:false,	// whether to show a timestamp on every line
//		| 		showSender:false		// whether to show the file on every line
//		| 	}
//		| }
//
//
(function(){
	
	userConfig = dojo.config.airConfig || {};
	
	var hasConsole, _c, cfg;
	
	if(air.Introspector !== undefined){
		// The Console output
		//
		hasConsole = true;
		_c = air.Introspector.Console;
		cfg = air.Introspector.config;
		cfg = air.Introspector.config = {};
	}else{
		// The Terminal output
		//
		hasConsole = false;
		_c = {
			argsToString:function(){
				var txt = "";
				for(var i=0;i<arguments.length;i++){
					txt+=arguments[i].toString()+" ";
				}
				return txt;
			},
			log: function(){
				air.trace(this.argsToString.apply(this, arguments));
			},
			debug: function(){
				air.trace(this.argsToString.apply(this, arguments));
			},
			info: function(){
				air.trace("[I] "+this.argsToString.apply(this, arguments));	
			},
			warn: function(){
				air.trace("[WARN] "+this.argsToString.apply(this, arguments));	
			},
			error: function(){
				air.trace("[ERROR] "+this.argsToString.apply(this, arguments));	
			},
			dump: function(obj){
				var txt = "";
				for(var nm in obj){
					txt+=nm+"="+obj[nm]+"\n";
				}
				air.trace(printObject(obj));	
			}
		};
		
	}
	var txt = ""
	var setProp = function(prop, _default){
		if(!hasConsole) return;
		txt += "\r"+prop+"="+userConfig[prop];
		if(userConfig[prop]!==undefined){
			txt+=" user:"+userConfig[prop];
			cfg[prop] = userConfig[prop];
		}else{
			txt+=" default:"+_default;
			cfg[prop] = _default;
		}
	}
	
	// DEBUGGER DEFAULT OPTIONS
	//
	// setProp will mixin user config
	// 	if userConfig prop is null, use setting here
	// 	
	setProp("showTimestamp", 			true);
	setProp("showSender", 				true);
	setProp("wrapColumns", 				2000);
	setProp("flashTabLabels", 			true);
	setProp("closeIntrospectorOnExit", 	true);
	setProp("debugRuntimeObjects", 		true);
	setProp("introspectorKey", 			122);
	setProp("debuggerKey", 				123);
	
	
	var timeMap = {};
	var countMap = {};
	//if(hasConsole){
	window.console = {
		
		log: function(){
			_c.log.apply(_c, arguments);
		},
		debug: function(){
			_c.log.apply(_c, arguments);
		},
		info: function(){
			_c.info.apply(_c, arguments);
		},
		warn: function(){
			_c.warn.apply(_c, arguments);
		},
		dir: function(){
			_c.dump.apply(_c, arguments);
		},
		dirxml: function(){
			_c.dump.apply(_c, arguments);
		},
		error: function(){
			_c.error.apply(_c, arguments);
		},
		trace: function(_value){
			var stackAmt = 3;
			var f = console.trace.caller; //function that called trace
			_c.log(">>> console.trace(stack)");
			for(var i=0;i<stackAmt;i++){
				var func = f.toString();
				var args = f.arguments;
				_c.dump({"function":func, "arguments":args});
				f = f.caller;
			}	
		},
		assert: function(truth, message){
			if(!truth){
				_c.error.apply(_c, ["Assertion Failure:"+message]);
			}
		},
		count: function(name){
			if(!countMap[name]) countMap[name] = 0;
			countMap[name]++;
			_c.log.apply(_c, [name+": "+countMap[name]]);
		},
		time: function(name){
			timeMap[name] = new Date().getTime();
		},
		timeEnd: function(name){
			if(name in timeMap){
				var delta = (new Date()).getTime() - timeMap[name];
				_c.log.apply(_c, [name+ ": " + delta+"ms"]);
				delete timeMap[name];
			}
		}
	}
	//}
	// Mix in the methods that are not supported
	var methods = ["group", "groupEnd", "profile", "profileEnd"];
	dojo.forEach(methods, function(m){
		console[m] = function(){
			console.warn(m+"() is not supported");	
		}
	});
	
	// For convenience, to refresh the CSS without having to recompile
	// Works only with link tags with the alt and type attributes set
	// does not work with @import
	window.recss = function(){
		var i,a,s;a=document.getElementsByTagName('link');
		for(i=0;i<a.length;i++){
			s=a[i];
			if(s.rel.toLowerCase().indexOf('stylesheet')>=0&&s.href) {
				var h=s.href.replace(/(&|%5C?)forceReload=\d+/,'');
				s.href=h+(h.indexOf('?')>=0?'&':'?')+'forceReload='+new Date().valueOf();
			}
		}
	}
	
	// Catching key so that ReCSS works with cmd/cntrl - r
	// You can also hook up a button and call recss()
	var cDown = false;
	dojo.connect(document, "keypress", 	function(evt){
		if(cDown && evt.keyCode==114){ // r
			recss();
		}
	});
	dojo.connect(document, "keydown", 	function(evt){ 
		//COMAND - 15,  CTRL - 17
		if(evt.keyCode==15||evt.keyCode==17){
			cDown = true;	
		}
	});
	dojo.connect(document, "keyup", 	function(evt){
		if(evt.keyCode==15||evt.keyCode==17){
			cDown = false;	
		}
	});
	
	if(hasConsole){
		air.Introspector.logError = function(){
			// summary: Overwriting AIR's error logger
			// AIR hides the important information in a clickable object
			// We're exposing that info, and then showing stack trace
			
			var a = arguments[0];
			console.error(a.name+":"+a.message+" - URL: "+a.sourceURL+" - LINE: "+a.line);
			if(a.stackTrace){
				console.error("Stack Trace:", a.stackTrace);
			}
		}
	}
	
	//												//
	// 	The following code is for Terminal output 	//
	//												//
	var isArray = function(it){
		return it && it instanceof Array || typeof it == "array";
	}
	var objectLength = function(o){
		var cnt = 0;
		for(var nm in o){
			cnt++;
		}
		return cnt;
	}
	var printObject = function(o, i, txt, used){
		// Recursively trace object, indenting to represent depth for display in object inspector
		var ind = " \t";
		txt = txt || "";
		i = (i===undefined) ? "" :  i;
		used = used || [];
		var opnCls;
		
		if(o && o.nodeType == 1){
			return "[NODE 1]";
		}
		
		var br=",\n", cnt = 0, length = objectLength(o);
		
		if(o instanceof Date){
			return i + o.toString() + br;
		}
		looking:
		for(var nm in o){
			cnt++;
			if(cnt==length){br = "\n";}
			if(o[nm] === window || o[nm] === document){
				continue;
			}else if(o[nm] === null){
				txt += i+nm + " : NULL" + br;
			}else if(o[nm] && o[nm].nodeType){
				if(o[nm].nodeType == 1){
					txt += i+nm + " : < "+o[nm].tagName+" id=\""+ o[nm].id+"\" />" + br;
				}else if(o[nm].nodeType == 3){
					txt += i+nm + " : [ TextNode "+o[nm].data + " ]" + br;
				}
			
			}else if(typeof o[nm] == "object" && (o[nm] instanceof String || o[nm] instanceof Number || o[nm] instanceof Boolean)){
				txt += i+nm + " : " + o[nm] + "," + br;
			
			}else if(o[nm] instanceof Date){
				txt += i+nm + " : " + o[nm].toString() + br;
				
			}else if(typeof(o[nm]) == "object" && o[nm]){
				for(var j = 0, seen; seen = used[j]; j++){
					if(o[nm] === seen){
						txt += i+nm + " : RECURSION" + br;
						continue looking;
					}
				}
				used.push(o[nm]);
				
				opnCls = (isArray(o[nm]))?["[","]"]:["{","}"];
				txt += i+nm +" : " + opnCls[0] + "\n";//non-standard break, (no comma)
				txt += printObject(o[nm], i+ind, "", used);
				txt += i + opnCls[1] + br;
			
			}else if(typeof o[nm] == "undefined"){
				txt += i+nm + " : undefined" + br;
			}else if(nm == "toString" && typeof o[nm] == "function"){
				var toString = o[nm]();
				if(typeof toString == "string" && toString.match(/function ?(.*?)\(/)){
					//toString = escapeHTML(getObjectAbbr(o[nm]));
				}
				txt += i+nm +" : " + toString + br;
			}else{
				txt += i+nm +" : "+ o[nm] + br;
			}
		}
		return txt;
	}
	
})();
