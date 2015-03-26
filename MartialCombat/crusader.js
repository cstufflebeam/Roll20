// Crusader Maneuver Logic
// Sits in the background, watching for rolls on the "Crusader" rollable table. 
// This script simplifies life for anyone playing the Tome of Battle crusader class.
// If a roll is found, messages the appropriate player, and sets the generated maneuver's 
// weight to 0 (Effectively removing it from the pool). Once all maneuvers have been used, 
// all weights are reset to 1.
// All maneuvers are automatically reset to 1 upon combat beginning (Signified by the initiative widget being opened).
//
// At the moment, this script only works for one player at a time - This was written for my personal use.
// I'll clean this up / namespace this in the future.

var charName = "Kaladin";
var tableName = "Crusader";

function CheckAndResetManeuvers(clearAlways) {
    var theTable = findObjs({                              
        _type: "rollabletable",
        name: tableName
    })[0];
    log(theTable);
    var maneuvers = findObjs({
        _type: "tableitem",
        _rollabletableid: theTable.get("_id"),
        weight: 1
    });
    log(maneuvers);
    if (maneuvers.length == 0 || clearAlways) {
        ResetManeuvers(theTable);
    }
}

function ResetManeuvers(theTable, maneuvers) {
    log("Resetting all maneuvers...");
    maneuvers = findObjs({
        _type: "tableitem",
        _rollabletableid: theTable.get("_id"),
    });
    for(i=0;i<maneuvers.length;i++) {
        maneuvers[i].set("weight",1);
        log("Resetting " + maneuvers[i].get("name"));
    }
    sendChat("API", "/w " + charName + " Maneuvers Reset.");
}

on("chat:message", function (msg) {
    var player = getObj("player", msg.playerid);
    if (typeof player == "undefined" || player.get("_displayname") != charName) {
        return;
    }
    var cmdName = "!CrusaderReset",
    msgTxt = msg.content,
    targetTokenId,
    target,
    params;
    if (msg["type"] == "rollresult" || msg["type"] == "gmrollresult" || typeof msg["inlinerolls"] != "undefined") {
        //log("Found Roll Result");
        if (typeof msg["inlinerolls"] != "undefined") {
            for(k=0;k<msg["inlinerolls"].length;k++) {
                var content = msg["inlinerolls"][k]["results"];
                //log(content);
                ProcessSubRolls(msg, content);
            }
        }
        else {
            var content = JSON.parse(msg["content"]);
            //log(content);
            ProcessSubRolls(msg, content);
        }
    }
    // log("msgTxt: "+msgTxt);
    if (msg.type === "api" && msgTxt.indexOf(cmdName) !== -1) {
        CheckAndResetManeuvers(true);
    }
    
});

function ProcessSubRolls(msg, content) {
    for(i=0;i<content["rolls"].length;i++) {
        if (typeof content["rolls"][i]["table"] != "undefined" && content["rolls"][i]["table"] == tableName) {
            //log("Found Crusader roll: " + content["rolls"][i]);
            for(j=0;j<content["rolls"][i]["results"].length;j++) {
                var tableItem = content["rolls"][i]["results"][j]["tableItem"];
                if (typeof tableItem != "undefined" ) {
                    tableItem = getObj("tableitem", tableItem.id);
                    //log(tableItem);
                    tableItem.set("weight",0); // Effectively remove used maneuvers from the pool.
                    sendChat("API", "/w "+charName+" Removed "+tableItem.get("name")+" from the pool.");
                }
            }
            CheckAndResetManeuvers();
        }   
    }
}


on("change:campaign:initiativepage", function(obj, prev) {
    if(Campaign().get("initiativepage")) {
        // Page opened.
        CheckAndResetManeuvers(true);
    }
});
