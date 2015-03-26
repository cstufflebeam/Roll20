// Treasure management script
// Usage: !treasure import all // Read over the "Treasure Import", "Item Import", and "Item Description Import" handouts,
//   and import a list of all magical items found. See my forum post for an example of formatting.
//   The regular expressions used to process this list are intended to process raw text directly 
//   copy/pasted out of the Magic Item Compendium - No manual data entry should be required.
// 
// After importation has succeeded, simply roll on one of the treasure tables.
//   /roll 3t[Treasure_5] // This would generate appropriate loot for three challenge-rating 5 encounters.
// !treasure clear-all // Remove all automatically generated treasure / item tables.


var TreasureManager = TreasureManager || {};

TreasureManager.defaultAvatar = "https://s3.amazonaws.com/files.d20.io/images/8359163/ADXFuK0w5WL9kbXn06pyOQ/thumb.jpg?1426893666";
TreasureManager.TableRegex = /^(Treasure|Items)-|_[\/\d]+$/i;
TreasureManager.uglyHack = "";

TreasureManager.CalcWeight = function(weight) {
    if (weight.indexOf("-") == -1)
    weight = 1;
    else {
    if (/[a-zA-Z.()]+/gi.exec(weight)) {
            TreasureMap.LogAndNotify("WARNING: Got non-basic math string for range: " + weight);
        return 0;
	}
	weight = eval(weight);
	if (weight < 0)
	    weight *= -1;
	weight++;
    }
    return weight;
}

TreasureManager.GetOrCreate = function(type, name, opt) {
    var ret = findObjs(mergeArray({
        _type:type,
        name:name
    }, opt));
    if (ret.length < 1) {
        ret = createObj(type, mergeArray({
            name: name,
        }, opt));
    }
    else {
        ret = ret[0];
    }
    return ret;
}


TreasureManager.ShowUsage = function(msg) {
    sendChat("API", "/w " + msg.who + " You must specify an argument for this command. Usage: (Enter this).");
};


TreasureManager.BadLine = function(type, line) {
    TreasureManager.LogAndNotify("Hit malformatted entry while processing " + type + ": '" + line+"'");
};

TreasureManager.LogAndNotify = function(text) {
    sendChat("Treasure Manager", "/w gm " + text);
    log("[TM]: " + text);
};



TreasureManager.ImportItems = function(cmd,args, handout) {
    var typeRegex = /^([\d\/]+)[a-z]*-Level Items$/i;
    var itemRegex = /^([-\d]+)\s+(\w\d+)\s+(.+)$/;
    var headerRegex = /^d% Page Item Name$/;
    TreasureManager.LogAndNotify("Importing items...");
    handout.get("notes", function(text) {
	text = text.replace(new RegExp("¡V", "g"), "-"); // Replace impostor with the real deal.
	text = text.replace(new RegExp("¡X", "g"), "-"); // Replace impostor with the real deal.	
	var lines = text.split("<br>");
	var table;
	var tableName = "";
	for(var i=0;i<lines.length;i++) {
	    if (lines[i].length <= 2)
		continue;
	    var rr = typeRegex.exec(lines[i]);
	    if (rr) {
		// New table.
		tableName = "Items_"+rr[1];
		table = TreasureManager.GetOrCreate("rollabletable", tableName, {showplayers:false});
		TreasureManager.LogAndNotify("Switched to table " + tableName);
		continue;
	    }
	    rr = itemRegex.exec(lines[i]);
	    if (rr) {
		// New item
		if(!table) {
		    TreasureManager.LogAndNotify("No table selected for " + JSON.stringify(rr));
		    return;
		}
		var weight = TreasureManager.CalcWeight(rr[1]);
		var cleanedName = rr[3].replace(/\(.*\)\s*$/, "");
		var name = "&{template:default} {{name=**"+cleanedName+"**: ";
		name += "[?](!treasure stat " + tableName+ " "+weight+")[+](!treasure lookup "+tableName+","+cleanedName+")[P](!treasure lookup "+tableName+","+cleanedName+"/public)}} ";
		var itemData = TreasureManager.Lookup(cleanedName);
		if (itemData) {
		    name += "{{Description="+itemData[2].replace(cleanedName,"")+"}} ";
		    name += "{{Cost="+itemData[3]+"}} ";
		}
		name += "{{Book/Page=["+rr[2]+"](http://google.com/#q="+escape("D&D 3.5 "+cleanedName+"")+")}}";
		var opt = {};
		var item = createObj("tableitem", {
		    name: name,
		    _rollabletableid:table.get("_id"),
		    avatar:TreasureManager.defaultAvatar,
		    weight: weight,
		});
		continue;
	    }
	    rr = headerRegex.exec(lines[i]);
	    if (!rr) {
		TreasureManager.BadLine("Item", lines[i]);
		return;
	    }
	}
    });
}


TreasureManager.ImportTreasure = function(cmd, args, handout) {
    var typeMaps = {
	"Treasure":/^CR d% Coins Goods Items$/ig,
    };
    var regexMap = {
	"Treasure":/^(\d*?)\s*?([-\d]+)\s+(-|[csgpd*\d, ]+)\s+([-ABCDEFGHI, ]+)\s+([-\/,\d ]+)$/,
    };
    TreasureManager.LogAndNotify("Importing Treasure...");
    handout.get("notes", function(text) {
	text = text.replace(new RegExp("¡V", "g"), "-"); // Replace impostor with the real deal.
	text = text.replace(new RegExp("¡X", "g"), "-"); // Replace impostor with the real deal.	
	text = text.replace(new RegExp("¡Ñ", "g"), "*"); //
	var treasure = {
	    "Treasure":[],
	};
	var lines = text.split("<br>");
	var type = "";
	var match = false;
	var cr=0;
	for(var i=0;i<lines.length;i++) {
	    if (lines[i].length <= 2)
		continue;
	    match = false;
	    for(t in typeMaps) { // Check to see if this line is a new "type".
		if (typeMaps[t].exec(lines[i])) {
		    type = t;
		    TreasureManager.LogAndNotify("Now processing " + type +"...");
		    match = true;
		}
	    }
	    if (!match) {
		if (!type) {
		    TreasureManager.LogAndNotify("Could not determine type for " + lines[i]);
		    return;
		}
		var rr = regexMap[type].exec(lines[i]);
		if (!rr) {
		    TreasureManager.BadLine(type, lines[i]);
		    return;
		}
		else {
		    if (rr[1])
			cr = rr[1];
		    var weight = TreasureManager.CalcWeight(rr[2]);
		    if (type == "Treasure") {
			var tmp = {
			    "cr":cr,
			    "weight":weight,
			    "coins":rr[3].replace(",","").replace("-",""),
			    "goods":rr[4].replace("-",""),
			    "items":rr[5].replace("-",""),
			};
			treasure[type].push(tmp);
		    }
		    match = true;
		}
	    }
	}
	// Done processing lines, now import treasure.
	for(t in treasure) {
	    TreasureManager.LogAndNotify("Importing " + t+"...");
	    var lastCr = 0;
	    var table;
	    for(var i=0;i<treasure[t].length;i++) {
		var cr = treasure[t][i]["cr"];
		if (cr != lastCr) {
		    TreasureManager.LogAndNotify("Switched to table " + t+"_"+cr+"...");
		    table = TreasureManager.GetOrCreate("rollabletable", t+"_"+cr, {showplayers:false});
		}
		var weight = treasure[t][i]["weight"];
		delete treasure[t][i]["weight"];
		delete treasure[t][i]["cr"];
		var name = JSON.stringify(treasure[t][i]);
		var opt = {
		    _rollabletableid:table.get("_id"),
		    avatar:TreasureManager.defaultAvatar,
		    weight: weight,
		};
		var item = TreasureManager.GetOrCreate("tableitem", name, opt);
		if(!item) {
		    TreasureManager.LogAndNotify("Failed to create treasure entry for "+name);
		}
		lastCr = cr;
	    }
	}
    });
};



TreasureManager.StartImport = function(msg, cmd, args)  {
    if (args == "all") {
	TreasureManager.StartImport(msg, cmd,"Treasure");
	TreasureManager.StartImport(msg, cmd,"Item");
	return;
    }
    var tmi = findObjs({
	_type: "handout",
	name: args+" Import",
    });
    if (tmi.length != 1 || typeof(tmi[0]) == "undefined") {
	TreasureManager.LogAndNotify("Failed to locate import handout! No handout named '"+args+" Import"+"' exists (Or more than one handout matching this name was found).");
	return;
    }
    tmi = tmi[0];
    if (args == "Treasure") {
	TreasureManager.ImportTreasure(cmd, args, tmi);
    }
    else if (args == "Item") {
	TreasureManager.ImportItems(cmd,args,tmi);
    }
    else {
	TreasureManager.ShowUsage(msg);
    }
}




TreasureManager.ProcessSubRolls = function ProcessSubRolls(msg, content) {
    var coins={"gp":0,
	       "sp":0,
	       "cp":0,
	       "pp":0,
	       "count":0
	      };
    for(var i=0;i<content["rolls"].length;i++) {
	var rr = /^Treasure_\d+$/i.exec(content["rolls"][0]["table"]);
        if (typeof content["rolls"][i]["table"] != "undefined" && rr) {
            //log("Found Crusader roll: " + content["rolls"][i]);
            for(var j=0;j<content["rolls"][i]["results"].length;j++) {
                var tableItem = content["rolls"][i]["results"][j]["tableItem"];
                if (typeof tableItem != "undefined" ) {
                    tableItem = getObj("tableitem", tableItem.id);
		    var item = JSON.parse(tableItem.get("name"));
		    var coinType = /[a-z]{2}\s*$/i.exec(item["coins"]);
		    sendChat(coinType, "/gmroll "+item["coins"], function(msg) {
			var rollContent = JSON.parse(msg[0]["content"]);
			var coin = msg[0].who[0];
			coins[coin] += rollContent["total"];
			coins["count"]++;
		    });
		    //sendChat("Treasure Manager", "/w gm Goods: [["+item["goods"]+"]]");
		    var items = item["items"].split(",");
		    if (items) {
			var itemStr = "";
			for(var ii = 0;ii<items.length;ii++) {
			    sendChat("Treasure Manager", "/gmroll 1t[Items_"+items[ii].replace(new RegExp(" ","g"),"")+"]", function(msg) {
				var rollContent = JSON.parse(msg[0]["content"]);
				//log(content);
				var name = rollContent["rolls"][0]["results"][0]["tableItem"]["name"];
				name = name.replace(new RegExp("NEWLINE","g"),"\n/w gm ");
				sendChat("Treasure Manager", "/w gm " + name);
			    });
			}
		    }
                }
            }
	    var timeout = 0;
	    var timer = setInterval(function() {
		if (coins["count"] == content["rolls"][0]["results"].length || timeout++ >= 8) {
		    sendChat("Treasure Manager", "/w gm [["+coins["pp"]+"]]pp, [["+coins["gp"]+"]]gp, [["+coins["sp"]+"]]sp, [["+coins["cp"]+"]]cp ("+coins["count"]+")");
		    clearInterval(timer);
		}
		else {
		    log("Waiting... Coins count: " + coins["count"] + " vs " + content["rolls"][0]["results"].length);
		}
	    }, 500);
        }
    }
}

on("chat:message", function(msg) {   
    if (msg["type"] == "rollresult" || msg["type"] == "gmrollresult" || typeof msg["inlinerolls"] != "undefined") {
	if (!/Treasure_\d+/i.exec(JSON.stringify(msg))) {
            //log("Ignoring non treasure Roll Result");
	    return;
	}
	
        if (typeof msg["inlinerolls"] != "undefined") {
            for(k=0;k<msg["inlinerolls"].length;k++) {
                var content = msg["inlinerolls"][k]["results"];
                //log(content);
                TreasureManager.ProcessSubRolls(msg, content);
            }
        }
        else {
            var content = JSON.parse(msg["content"]);
            //log(content);
            TreasureManager.ProcessSubRolls(msg, content);
        }
    }
    if (msg.type == "api" && msg.content.indexOf("!treasure") !== -1) {
	TreasureManager.Init();
	var showPublic = false;
        var reg = /^!treasure (import|generate|clear-all|stat|lookup) ?(.*)$/ig;
        var cmd = reg.exec(msg.content);
        if (!cmd) {
	    TreasureManager.ShowUsage(msg);
	    return;
        }
        var operation = cmd[1];
	if (!playerIsGM(msg.playerid)) {
	    sendChat("Treasure Manager", "/w " + msg.who + " Access Denied.");
	    TreasureManager.LogAndNotify(msg.who + " attempted to use the " + operation +" operation.");
	    return;
	}
        var args=cmd[2];
	if (args.indexOf("/public") !==-1) {
	    args = args.replace("/public","");
	    showPublic=true;
	}
        if (operation == "import") {
	    if (args == "") {
		TreasureManager.ShowUsage(msg);
		return;
	    }
	    TreasureManager.StartImport(msg, cmd, args);
        }
	if (operation == "clear-all") {
	    var tables = findObjs({
		_type:"rollabletable",
	    });

	    if (tables.length < 1) {
		TreasureManager.LogAndNotify("Could not find any tables!");
		return;
	    }
	    for(var i=0;i<tables.length;i++) {
		if (TreasureManager.TableRegex.exec(tables[i].get("name"))) {
		    TreasureManager.LogAndNotify("Deleting " + tables[i].get("name"));
		    tables[i].remove();
		}
	    }
	}
    }
    if (operation == "stat") {
	if(!args) {
	    TreasureManager.ShowUsage(msg);
	    return;
	}
	args = args.split(" ");
	var name = args[0];
	var weight = undefined;
	if (args.length == 2)
	    weight = args[1];
	// Show table statistics
	var table = findObjs({
	    _type:"rollabletable",
	    name:name
	});
	if (table.length < 1) {
	    TreasureManager.LogAndNotify("Could not find any tables matching " + name);
	    return;
	}
	table = table[0];
	var entries = findObjs({
	    _type:"tableitem",
	    _rollabletableid:table.get("_id"),
	});
	if (entries.length < 1 ) {
	    TreasureManager.LogAndNotify("No entries found for table " + name);
	    return;
	}
	var sum=0;
	for(var i=0;i<entries.length;i++) {
	    sum += entries[i].get("weight");
	}
	sendChat("Treasure Manager", "/w gm Table (" + name + ") has " + entries.length + " entries, totalling " + sum + " weights. This item has a weight of " + weight + ".");
    }
    if (operation == "lookup") {
	if (!args) {
	    TreasureManager.ShowUsage(msg);
	    return;
	}
	args = args.split(",");
	if (args.length <= 1 ) {
	    TreasureManager.ShowUsage(msg);
	    return;	    
	}
	var tableName = args[0];
	var cleanedName = args[1].replace(new RegExp("\\+", "g"),"\\+");
	var table = findObjs({
	    _type:"rollabletable",
	    name:tableName,
	});
	if(!table || typeof(table[0]) == "undefined") {
	    TreasureManager.LogAndNotify("Failed to look up table " + tableName);
	    return;
	}
	table = table[0];
	var entries = findObjs({
	    _type:"tableitem",
	    _rollabletableid:table.get("_id")
	});
	if(!entries) {
	    TreasureManager.LogAndNotify("No entries found for table " + name);
	    return;
	}
	var regexStr = "name=\\*\\*"+cleanedName+"\\*\\*";
	var nameRegex = new RegExp(regexStr, "i");
	for(var i=0;i<entries.length;i++) {
	    if(nameRegex.exec(entries[i].get("name"))) {
		// Found it!
		var prefix="/w gm ";
		if(showPublic) {
		    prefix="";
		}
		sendChat("Treasure Manager", prefix+entries[i].get("name"));
		return;
	    }
	}
	TreasureManager.LogAndNotify("Could not find any matches for " + cleanedName +" via |"+regexStr+"|");
    }
});



TreasureManager.Lookup = function(args) {
    var regStr = "(\\w\\d+)\\s+("+args.replace(new RegExp("\\+", "g"),"\\+")+".+?)([\\d,]+)\\+?<br>";
    var lookupRegex = new RegExp(regStr, "gi");
    return lookupRegex.exec(TreasureManager.uglyHack);
};

TreasureManager.Init = function() {
    if(TreasureManager.uglyHack.length >= 2)
	return; // Already initialized.
    var handout = findObjs({
	_type:"handout",
	name:"Item Descriptions Import"
    });
    if (!handout || typeof(handout[0]) == "undefined" ) {
	sendChat("Treasure Manager", "/w gm Could not find item descriptions handout!");
	return;
    }
    handout = handout[0];
    handout.get("notes", function(text) {
	TreasureManager.uglyHack = text;
    });
}
