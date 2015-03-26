// Misc. utility functions, common to my scripts.
Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};

function mergeArray(array1,array2) {
  for(item in array1) {
    array2[item] = array1[item];
  }
  return array2;
};

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.repeat = function( num ) {
    return new Array( num + 1 ).join( this );
};
