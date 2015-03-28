// GM notes popup script
var gmn = gmn || {};
gmn.gmNotesBar = "bar2_value";
gmn.lineLength = 60;

gmn.SanitizePopupData = function(x) {
    x = x.replace(/ /g, " "); // Replace space character with unicode non-breaking character
    x = x.replace(/-/g, " "); // Replace the real dash with a unicode substitute (dash causes a linebreak).
    x = x.replace(/\(/g, "﹙"); // Replace left paren with unicode substitute (Causes linebreak)
    x = x.replace(/\)/g, "﹚"); // replace right paren with unicode substitute (Causes linebreak)
    return x;
};

gmn.LineWrap = function(seperator, sanitizedData) {
    var lineWrapReg = new RegExp(".{1,"+gmn.lineLength+"}","g");
    var output = "";
    var rr = sanitizedData.match(lineWrapReg);
    var wrapMode = false;
    if (rr && sanitizedData.length>gmn.lineLength) {
	log("Wrapping: " + sanitizedData);
	output = " "+seperator;
	for(var j=0;j<rr.length;j++) {
	    // Find last "space" (Unicode character, since data has already been sanitized).
	    var tr = /(.+) (.+?)$/.exec(rr[j]);
	    if (tr) {
		output = output.concat(tr[1], " ", seperator, tr[2]);
		wrapMode = true;
	    }
	    else {
		
		// No spaces - Just append entire string.
		output = output.concat((wrapMode)?" "+seperator:"", rr[j], " ", seperator);
		wrapMode = false;
	    }
	}
    }
    else {
	// less than lineLength characters long
	output = " ".concat(seperator, sanitizedData);
    }
    return output;
}

gmn.SetPopupData = function(data, token, bar, size) {
    // What follows is a hack to enable the use of a "bar" as a presentation-layer. 
    // this permits us to display special qualities to the GM upon clicking on a token, without having to open up gmnotes/etc.
    if (size == 0)
        size++;
    var seperator = "              ".repeat(size+1); // Fill with unicode non-breaking spaces, adjusted for token size
    var fmt = "";
    if (Object.prototype.toString.call(data) === '[object Array]' ) {
	for(var i=0;i<data.length;i++) {
            fmt += gmn.LineWrap(seperator, gmn.SanitizePopupData(data[i]));
	}
    }
    else {
	fmt = seperator.concat(gmn.LineWrap(seperator, gmn.SanitizePopupData(data)));
    }
    if (fmt.length <= 90)
	fmt = fmt.concat(seperator.repeat(Math.ceil((90-fmt.length)/14)));
    //log("Setting fmt to "+fmt);
    token.set(bar, fmt);
    // End presentation layer hack.
};


on("change:graphic:gmnotes", function(obj, prev) {
    var data = obj.get("gmnotes");
    if (data.length > 0)
	gmn.SetPopupData(unescape(data).split("<br>"), obj, gmn.gmNotesBar, Math.ceil(obj.get("width")/70) - 1);
    else
	obj.set(gmNotesBar, "");
});
