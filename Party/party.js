//
on("chat:message", function(msg) {   
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!PartyAdd") !== -1) {
        _.each(msg.selected, function (obj){
            obj = getObj("graphic", obj._id);
            if (!obj) return;
            if(!obj.get("represents")) {
                sendChat("API", "/w gm " + obj.get("name") + " does not have an associated character sheet.");
                return;
            }
            log(state.Party.indexOf(obj.id));
            if (state.Party.indexOf(obj.get("represents")) == -1) {
                state.Party.push(obj.get("represents"));
                sendChat("API", obj.get("name") + " has joined the party.");
            }
        });
    }
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!PartyClear") !== -1) {
        state.Party = new Array();
        sendChat("API", "Party cleared.");
    }
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!PartyPlace") !== -1) {
        sendChat("API", "/w gm Placing party: "+state.Party.length);
        var i = 0;
        while (i < state.Party.length) { // Process tokens with character sheets.
            var char = getObj("character", state.Party[i]);
            if(!char) {
                log("Couldn't look up "+state.Party[i]);
                continue;
            }
            var tokens = findObjs({
                _type:"graphic",
                represents:char.id,
                _pageid:Campaign().get("playerpageid")
            });
            if (tokens.length == 0) {
                var hp = findObjs({_type: "attribute",name: "hitpoints",_characterid: char.id});
                if(hp.length < 1) {
                    hp = "";
                }
                else {
                    hp = hp[0].id
                }
                createObj("graphic", {
                    name: char.get("name"),
                    _type:"graphic",
                    layer:"objects",
                    imgsrc:char.get("avatar").replace("med","thumb").replace("max","thumb"),
                    _pageid:Campaign().get("playerpageid"),
                    represents: state.Party[i],
                    bar1_link:hp,
                    top: 70 * (i+1),
                    left: 70,
                    width: 70,
                    height: 70
                });
            }
            i++;
        }
    }
});


on('ready',function(){
    state.Party = state.Party || new Array(); 
});
