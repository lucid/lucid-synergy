dojo.provide("synergy._base");

air.NativeApplication.nativeApplication.autoExit = false; 

synergy = {
    startup: function(){
        this.setupIcon();
    },
    makeIconMenu: function(){
        var menu = new air.NativeMenu();
        var exitCommand = menu.addItem(this.makeMenuItem("Exit", function(e){
            synergy.exit();
        }));

        return menu;
    },
    makeMenuItem: function(label, onClick){
        var item = new air.NativeMenuItem(label);
        item.addEventListener(air.Event.SELECT, onClick);
        return item;
    },
    setupIcon: function(){
        air.NativeApplication.nativeApplication.icon.tooltip = "Lucid Synergy";
        
        var iconLoad = new air.Loader();
        iconLoad.contentLoaderInfo.addEventListener(air.Event.COMPLETE, function(event){
            air.NativeApplication.nativeApplication.icon.bitmaps = new runtime.Array(event.target.content.bitmapData); 
        }); 
        iconLoad.load(new air.URLRequest("./22x22.png")); 
        air.NativeApplication.nativeApplication.icon.menu = this.makeIconMenu();
    },
    exit: function(){
        air.NativeApplication.nativeApplication.exit();
    }
};

dojo.addOnLoad(dojo.hitch(synergy, "startup"));
