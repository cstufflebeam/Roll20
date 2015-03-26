// Combat flow script. Automatically rolls initiative for all player -
// characters (Referencing my Party script), as soon as the turn-order
// control is opened. This was one of the first roll20 scripts I wrote, and is 
// rather messy.

on("change:campaign:initiativepage", function(obj, prev) {
    if(Campaign().get("initiativepage")) {
        // Page opened.
        Campaign().set("turnorder", "[]");
        RerollInitiatives();
    }
});


on("chat:message", function(msg) {   
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!BeginCombat") !== -1) {
        Campaign().set("turnorder", "[]");
        RerollInitiatives();
        RerollInitiatives(msg);
    }
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!AddToCombat") !== -1) {
        RerollInitiatives(msg);
    }
});

var RerollInitiatives = function(msg) {
    var i = 0;
    if (typeof(msg) != "undefined") {
        while (typeof(msg.selected) != "undefined" && i < msg.selected.length) { // Process tokens without character sheets.
            var token = getObj("graphic", msg.selected[i]._id);
            if(!token) {
                log("Failed to look up "+msg.selected[i]._id);
                return;
            }
            var string = "I rolled a [[1d20]] for initiative. /gm";
            sendChat("character|"+token.get("name"), string, AutoInitCallback);
            i++;
        }
        return;
    }
    i = 0;
    while (i < state.Party.length) { // Process tokens with character sheets.
        var char = getObj("character", state.Party[i]);
        var tokens = findObjs({
            _type:"graphic",
            represents:char.id,
            _pageid:Campaign().get("playerpageid")
        });
        if (tokens.length < 1) {
            sendChat("API", "Couldn't find token representing "+char.id+".");
            return;
        }
        if (tokens.length >= 2) {
            sendChat("API", "Found too many tokens representing "+char.id+".");
            return;
        }
        var token = tokens[0];
        if (!char) {
            sendChat("API", "/w gm Failed to look up character sheet for "+token.get("name"));
            return;
        }
        var dexScore = parseInt(getAttrByName(char.id, "dex-base")) || 0;
        dexScore += parseInt(getAttrByName(char.id, "dex-misc")) || 0;
        dexScore += parseInt(getAttrByName(char.id, "dex-temp")) || 0;
        var dexMod = Math.floor((dexScore - 10) / 2);
        log(getAttrByName(char.id, "character_name") + "=" + getAttrByName(char.id, "dex-base"))
        var initMod = (getAttrByName(char.id, "initmiscmod"));
        var tb = (parseInt(dexMod) + parseInt(initMod)) * 0.01;
        var string = "I rolled a [[1d20 + " + initMod + " + " + dexMod + " + " + tb + "]] for initiative: ";
        sendChat("character|"+token.get("represents"), string, AutoInitCallback);
        i++;
    }
}


var AutoInitCallback = function(ops) {
    var rollresult = ops[0];
    result = rollresult.inlinerolls[1].results.total;
    var turnorder = [];
    if(Campaign().get("turnorder") == "") {
        turnorder = [];
    } else turnorder = JSON.parse(Campaign().get("turnorder"));
    var token = findObjs({
        _type:"graphic",
        name:rollresult["who"],
        _pageid:Campaign().get("playerpageid")
    })[0];
    if (typeof(token) == "undefined") {
        token = findObjs({
            _type:"graphic",
            name:rollresult["who"].slice(rollresult["who"].indexOf("|")+1,rollresult["who"].length),
            _pageid:Campaign().get("playerpageid")
        })[0];
        if (typeof(token) == "undefined") {
            sendChat("API", "/w gm Failed to look up character in auto-init callback.");   
            return;
        }
    }
    turnorder.push({
        id: token.get("id"),
        pr: result,
   });
    
    turnorder.sort(function(a,b) {
        first = a.pr;
        second = b.pr;
        return second - first;
    });
    
    Campaign().set("turnorder", JSON.stringify(turnorder));
    //log(rollresult);
    var roll = rollresult["inlinerolls"]["1"];
    var nat = roll["results"]["rolls"][0]["results"][0]["v"];
    var string = rollresult["content"].replace("$[[1]]", "[["+roll["results"]["total"]+"]]") + "("+roll["expression"]+")";
    //roll["expression"] + " = ("+nat+")" ++".";
    if (rollresult.content.indexOf("/gm") !== -1) {
        string = "/w gm "+string;
    }
    sendChat(rollresult["who"], string);
}
