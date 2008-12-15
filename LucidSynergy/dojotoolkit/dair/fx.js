dojo.provide("dair.fx");

dojo.require("dijit._base.place");
dojo.require("dojox.fx._core");
dojo.require("dojo.fx");

dojo.mixin(dair.fx, {
	// summary: Effects for NativeWindows (and dair.Window instances)

	animateWindow: function(/* Object */props){
		// summary: Creates an animation that will size and position of a passed dair.Window instance 
		//		(or a reference to a NativeWindow). Standard `dojo._Animation` properties apply,
		//		substituting `pane` for `node` in the property hash.
		
		var anims = [];
		if(props["height"] || props["width"]){
			anims.push(dair.fx.animateSize(props));
		}
		if(props["top"] || props["left"]){
			anims.push(dair.fx.animatePosition(props));
		}
		return dojo.fx.combine(anims); // dojo._Animation
	},
	
	animateSize: function(/* Object */props){
		// summary: Creates an animation that will adjust the width and height of a passed
		//		dair.Window (or NativeWindow) as the `pane` property. All other `dojo._Animation`
		//		properties apply.
		var pane = props.pane;
		if(pane.declaredClass && pane._pane){
			pane = pane._pane;
		}

		var endW = props["width"] || pane.width,
			endH = props["height"] || pane.height;

		var _line = new dojox.fx._Line(
			[pane.width, pane.height],
			[endW, endH]
		);

		return new dojo._Animation(dojo.mixin(props,{
			rate: 25,
			curve: _line,
			onAnimate: function(val){
				pane.width = Math.floor(val[0]);
				pane.height = Math.floor(val[1]);
			}
		})); // dojo._Animation

	},
	
	animatePosition: function(/* Object */props){
		// summary: Creates an animation that will adjust the top and left position of a passed
		//		dair.Window (or NativeWindow) as the `pane` property. All other `dojo._Animation`
		//		properties apply.
		// example:
		//	| dair.fx.animatePosition({ pane: myWindowRef, top: 50, left:50 }).play();
		var pane = props.pane;
		if(pane.declaredClass && pane._pane){
			pane = pane._pane;
		}

		var endT = props["top"] || pane.y,
			endL = props["left"] || pane.x;

		var _line = new dojox.fx._Line(
			[pane.y, pane.x],
			[endT, endL]
		);

		return new dojo._Animation(dojo.mixin(props,{
			curve: _line,
			rate: 25,
			onAnimate: function(val){
				pane.y = Math.floor(val[0]);
				pane.x = Math.floor(val[1]);
			}
		}));

	}

});
