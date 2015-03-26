// Status monitoring script / blood placement script. 
// Will finish writing up documentation for this one later. 
// 

var StatusMonitor = StatusMonitor || {};
StatusMonitor.CurrentTurn = ""; //The current tokens turn
 
StatusMonitor.GetCurrentToken = function() {
    var to = JSON.parse(Campaign().get('turnorder'));
    if (!to.length) return null;
    return getObj('graphic', to.shift().id);
};

StatusMonitor.OnNewTurn = function(target) {
    var i = 0;
    while (i < state.StatusMonitor.length) {
        var tmp = state.StatusMonitor[i];
        log("Comparing "+tmp["id"] + " vs "+target.id);
        if (tmp["id"] == target.id) {
            if(tmp["duration"] > 0) { // Negative values never expire.
                tmp["duration"] = parseInt(tmp["duration"]) - 1;
            }
            if (tmp["duration"] == 0) {
                if (!StatusMonitor.StatusDel(target, tmp["name"])) {
                    sendChat("", "/w gm Status Monitor could not find status to automatically delete.");
                    return;
                }
                StatusMonitor.OnNewTurn(target);
            }
            else {
                var msg = StatusMonitor.FormatMessage(tmp);
                if (!tmp["gm"]) {
                    sendChat("", "/w " + tmp["name"]+" " + msg);
                }
                sendChat("", "/w gm " + msg);
            }
        }
        i++;
    }
}

StatusMonitor.FormatMessage = function(tmp) {
    var msg = "";
    msg += getObj("graphic", tmp["id"]).get("name") + " ";
    if (tmp["duration"] > 0) {
        msg += " has "+tmp["duration"] + " rounds of "+tmp["name"]+" remaining";
    }
    else {
        msg += " is still active.";
    }
    if (tmp["description"] !== "") {
        msg += "("+tmp["description"]+")";
    }
    msg += ".";
    return msg;
}

StatusMonitor.StatusList = function(msg) {
    var i = 0;
    while(i < state.StatusMonitor.length) {
        if (isGM(msg.playerid)) {
            // List all status effects.
            var tmp = StatusMonitor.FormatMessage(state.StatusMonitor[i])+ " Target: "+getObj("graphic", state.StatusMonitor[i]["id"]).get("name")
            sendChat("", "/w gm "+tmp);
        }
        else {
            sendChat("", "/desc " + getObj("graphic", state.StatusMonitor[i]["id"]).get("name")+"'s Status Effects:");
            sendChat("", StatusMonitor.FormatMessage(state.StatusMonitor[i]));
        }
        i++;
    }
}

StatusMonitor.StatusAdd = function(msg, target, name, duration, description, marker, gm) {
    var tmp = "/desc ";
    if(gm) {
        tmp = "/w gm "; 
    }
    sendChat("", tmp + msg.who + " added " + name + " to " + target.get("name")+".");
    state.StatusMonitor.push({
        'id': target.id, 
        'name': name, 
        'description': description, 
        'duration': duration,
        'gm': gm,
        'marker': marker,
    });
    var count = 1;
    var tmp = target.get("status_"+marker);
    if (tmp) {
        count = parseInt(tmp)+1;
    }
    target.set("status_"+marker, count);
}


StatusMonitor.StatusClear = function(msg) {
    var i = 0;
    while (i < state.StatusMonitor.length) {
        getObj("graphic", state.StatusMonitor[i]["id"]).set("status_"+state.StatusMonitor[i]["marker"], false);
        i++;
    }
    sendChat("", "/w GM Cleared "+i+" status effects.");
    state.StatusMonitor = new Array();
}

StatusMonitor.StatusDel = function(target, status) {
    var i = 0;
    while (i < state.StatusMonitor.length) {
        if (state.StatusMonitor[i]["id"] == target.id && state.StatusMonitor[i]["name"] == status) {
            target.set("status_"+state.StatusMonitor[i]["marker"], false);
            sendChat("", "/desc "+state.StatusMonitor[i]["name"] + " ceases to affect "+target.get("name"));;
            state.StatusMonitor.splice(i,1);
            return true;
        }
        i++;
    }
    return false;
}

StatusMonitor.GetTarget = function(msg, statusTarget) {
    var objs = findObjs({                              
                _pageid: Campaign().get("playerpageid"),
                _type: "graphic",
                name: statusTarget,
                });
    if (objs.length < 1) {
        sendChat("", "/w "+msg.who+" No such token found.");
        return null;
    }
    if (objs.length > 2) {
        sendChat("", "/w "+msg.who + " More than one token by that name found.");
        return null;
    }
    return objs[0];
}


on("change:campaign:turnorder", function() {
    var current = StatusMonitor.GetCurrentToken();
    if (!current) return;
    //If turn order was changed but it is still the same persons turn, exit
    if (current.id == StatusMonitor.CurrentTurn) return;
    StatusMonitor.CurrentTurn = current.id; 
    StatusMonitor.OnNewTurn(current);
});


on("chat:message", function(msg) {   
    if (msg.type == "api" && isGM(msg.playerid)) {
        if (msg.content.indexOf("!StatusClear") !== -1) {
            StatusMonitor.StatusClear(msg);
        }
    }
    
    // General Player Commands
    if (msg.content.indexOf("!StatusAdd") !== -1) {
        var reg = /^!StatusAdd ([a-zA-Z0-9_-]+) ([a-zA-Z0-9]+) (red|blue|green|brown|purple|pink|yellow|dead|skull|sleepy|half-heart|half-haze|interdiction|snail|lightning-helix|spanner|chained-heart|chemical-bolt|death-zone|drink-me|edge-crack|ninja-mask|stopwatch|fishing-net|overdrive|strong|fist|padlock|three-leaves|fluffy-wing|pummeled|tread|arrowed|aura|back-pain|black-flag|bleeding-eye|bolt-shield|broken-heart|cobweb|broken-shield|flying-flag|radioactive|trophy|broken-skull|frozen-orb|rolling-bomb|white-tower|grab|screaming|grenade|sentry-gun|all-for-one|angel-outfit|archery-target)?[ ]?([0-9-]+)[ ]?([^\/]*)[ \/]?(gm)?$/ig;
        var cmd = reg.exec(msg.content);
        if(!cmd) {
            sendChat("", "/w "+msg.who+" Syntax: !StatusAdd [Character_Name] [Status Name] [Status Icon (Default: purple) *] [Status Duration] [Status Description* ] [/gm *]. Parameters containing an asterick are optional");
            return;
        }
        var statusTarget = cmd[1];
        var statusName = cmd[2];
        var statusMarker = cmd[3];
        if(typeof(statusMarker) != "undefined") statusMarker = statusMarker.toLowerCase();
        var statusDuration = cmd[4];
        var statusDescription = cmd[5];
        var statusGM = (cmd[6] != null);
        cmd = cmd[0];
        var target = StatusMonitor.GetTarget(msg, statusTarget);
        if (!target) return;
        if (statusMarker == "") {
            statusMarker = "purple";
        } 
        StatusMonitor.StatusAdd(msg, target, statusName, statusDuration, statusDescription, statusMarker, statusGM);
    }
    if (msg.content.indexOf("!StatusDel") !== -1) {
        var reg = /^!StatusDel ([a-zA-Z0-9_-]+) ([a-zA-Z0-9]+)$/ig;
        var cmd = reg.exec(msg.content);
        if(!cmd) {
            sendChat("", "/w "+msg.who+" Invalid syntax.");
            return;
        }
        var target = StatusMonitor.GetTarget(msg, cmd[1]);
        if (!target) return;
        var statusName = cmd[2];
       if (!StatusMonitor.StatusDel(msg, target, statusName) ){
           sendChat("", "/w "+msg.who+" No status effect by that name found.");
       }
    }
    if (msg.content.indexOf("!StatusList") !== -1) {
        StatusMonitor.StatusList(msg);
    }
});  

on("change:graphic:bar1_value", function(obj, prev) {
    if(obj.get("bar1_max") === "") return;
    var dif = prev["bar1_value"] - obj.get("bar1_value");
    if(obj.get("_pageid") == Campaign().get("playerpageid") && 
                typeof(createSplat2)== "function" && 
                (dif > 0 && dif > obj.get("bar1_max") * 0.1)) {
        try {
            createSplat2(obj.get("_pageid"), obj.get("top"), obj.get("left"), obj.get("width") / 2, "blood");
        } catch(e) {
            log(e);
        }
    }
    if(obj.get("bar1_value") <= 0) {
        obj.set({
            status_dead: true,
            tint_color: "transparent"
        });
    }
    else if(obj.get("bar1_value") <= obj.get("bar1_max") / 2) {
        obj.set({
            tint_color: "#FF0000",
            status_dead: false
        });
    }
    else{
        obj.set({
            tint_color: "transparent",
            status_dead: false
        });
    }
});

on('ready',function(){
    state.StatusMonitor = state.StatusMonitor || new Array(); 
});
