dojo.provide("dair.AIR");
dojo.require("dair.Aliases"); 

(function(){
	// 	summary: 
	//	 	The AIR Helper package. Provides all necessary scripts to run an AIR 
	//		application; mainly AIRAliases, and AIRIntrospector, but also includes 
	//		Console, which extends AIRIntrospector, giving it Firebug-like features. 
	// 	description:
	//		Mostly a convenience class, by converting the AIR files into a dojo.require. 
	//		
	//		Include the djConfig first (and any AIR parameters - see Console), then the 
	//		dojo script tag, then dojo.require("dair.AIR") - then the rest of your 
	//		requires.
	// 		No public methods or properties.
	//	example:
	//		| dojo.require("dair.AIR");
	//
	var airscripts = {
		//this gets loaded twice, but needs to in order to work
		Aliases: dojo.moduleUrl("dair","Aliases.js"), 
		Introspector: dojo.moduleUrl("dair","AIRIntrospector.js"),
		Console: dojo.moduleUrl("dair","Console.js")
	};
	
	var getScriptElement = function(){
		var newScript = document.createElement('script');
		newScript.type = 'text/javascript';
		var head = document.getElementsByTagName("head")[0];
		if(!head){
			head = document.getElementsByTagName("html")[0];
		}
		head.appendChild(newScript);
		return newScript;
	};
	
	var loadScript = function(url){
		var d = new dojo.Deferred();
		var onLoadScript = function(){
			d.callback(url);
		};
		var s = getScriptElement();
		s.src = url;
		s.onload=onLoadScript;
		s.onreadystatechange=onLoadScript;
		return d;
	};
	var userConfig = dojo.config.airConfig || {};
	
	
	loadScript(airscripts.Aliases).addCallback(function(){
		if(dojo.config.isDebug){
			if(!userConfig.terminal){
				loadScript(airscripts.Introspector).addCallback(function(){
					loadScript(airscripts.Console);
				});
			}else{
				loadScript(airscripts.Console);
			}
		}
	});
	
})();