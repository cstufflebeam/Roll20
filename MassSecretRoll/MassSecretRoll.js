// Mass Secret Roll - This script iterates over all player-characters (referencing my Party script), and rolls
// a check/save for each player. Usage: !msr (Skill Name) (?show|save|public)
// Ex:
// !msr listen show // Roll a listen check, and show all players the result.
// !msr will save public // Roll a secret will save for all players, and show all players that a roll took place.
// !msr fortitute save show // Roll a fortitude save, and show the result to all players.

on("chat:message", function(msg) {   
    if (msg.type == "api" && isGM(msg.playerid) && msg.content.indexOf("!msr") !== -1) {
        var reg = /^!msr ([0-9a-zA-Z]+) ?([/0-9a-zA-Z ]*)/ig;
        var cmd = reg.exec(msg.content);
        if (!cmd) {
            sendChat("API", "/w " + msg.who + " You must specify a skill to roll. Usage: !msr skillOrSaveName optionalAruments (public, show, save)"); 
            return;
        }
        var skill = cmd[1];
        var args = cmd[2];
        var prefix = "/w gm ";
        var rollType = "check";
        if (args.indexOf("show") !== -1) {
            prefix = "";
        }
        if (args.indexOf("save") !== -1) {
            rollType = "save";
        }
        if (args.indexOf("public") !== -1) {
            sendChat("API", "Rolling " + skill + " " + rollType + "s.");
        }
        else {
            sendChat("API", prefix + "Rolling " + skill + " " + rollType + "s.");
        }
        for(var i=0;i<state.Party.length;i++) {
            var character = getObj("character", state.Party[i]);
            var formula = getAttrByName(character.id, skill);
            if (!formula) {
                sendChat("API", prefix + "You must specify a valid skill to roll.");
                return;
            }
            formula = formula.replace(new RegExp("@{", 'g'), "@{"+character.get("name")+"|");
            sendChat("API", prefix + character.get("name")+ ": [[1d20 + "+formula+"]]");
        }
    }
});
