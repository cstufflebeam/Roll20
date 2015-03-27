// GM notes popup script
var gmn = gmn || {};
gmn.gmNotesBar = "bar2_value";

gmn.SanitizePopupData = function(x) {
    x = x.replace(new RegExp(" ", "g"), " "); // Replace space character with unicode non-breaking character
    x = x.replace(new RegExp("-", "g"), " "); // Replace the real dash with a unicode substitute (dash causes a linebreak).
    return x;
};

gmn.SetPopupData = function(data, token, bar, size) {
    // What follows is a hack to enable the use of a "bar" as a presentation-layer. 
    // this permits us to display special qualities to the GM upon clicking on a token, without having to open up gmnotes/etc.
    var fmt = "";
    if (size == 0)
        size++;
    var seperator = "              ".repeat(size+1); // Fill with unicode non-breaking spaces, adjusted for token size
    if (Object.prototype.toString.call(data) === '[object Array]' ) {
    for(var i=0;i<data.length;i++) {
            fmt = fmt.concat(seperator, gmn.SanitizePopupData(data[i]), " ");
    }
    }
    else {
    fmt = seperator.concat(gmn.SanitizePopupData(data));
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
	gmn.SetPopupData(decodeURIComponent(data).split("<br>"), obj, gmn.gmNotesBar, Math.ceil(obj.get("width")/70) - 1);
    else
	obj.set(gmNotesBar, "");
});
