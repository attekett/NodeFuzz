const entity_table = [
  "&quot;",
  "&amp;",
  "&lt;",
  "&gt;",
  "&#63;",
  "&#111;",
  "&nbsp;",
  "&iexcl;",
  "&cent;",
  "&pound;",
  "&curren;",
  "&yen;",
  "&brvbar;",
  "&sect;",
  "&uml;",
  "&copy;",
  "&ordf;",
  "&laquo;",
  "&not;",
  "&shy;",
  "&reg;",
  "&macr;",
  "&deg;",
  "&plusmn;",
  "&sup2;",
  "&sup3;",
  "&acute;",
  "&micro;",
  "&para;",
  "&middot;",
  "&cedil;",
  "&sup1;",
  "&ordm;",
  "&raquo;",
  "&frac14;",
  "&frac12;",
  "&frac34;",
  "&iquest;",
  "&Agrave;",
  "&Aacute;",
  "&Acirc;",
  "&Atilde;",
  "&Auml;",
  "&Aring;",
  "&AElig;",
  "&Ccedil;",
  "&Egrave;",
  "&Eacute;",
  "&Ecirc;",
  "&Euml;",
  "&Igrave;",
  "&Iacute;",
  "&Icirc;",
  "&Iuml;",
  "&ETH;",
  "&Ntilde;",
  "&Ograve;",
  "&Oacute;",
  "&Ocirc;",
  "&Otilde;",
  "&Ouml;",
  "&times;",
  "&Oslash;",
  "&Ugrave;",
  "&Uacute;",
  "&Ucirc;",
  "&Uuml;",
  "&Yacute;",
  "&THORN;",
  "&szlig;",
  "&agrave;",
  "&aacute;",
  "&acirc;",
  "&atilde;",
  "&auml;",
  "&aring;",
  "&aelig;",
  "&ccedil;",
  "&egrave;",
  "&eacute;",
  "&ecirc;",
  "&euml;",
  "&igrave;",
  "&iacute;",
  "&icirc;",
  "&iuml;",
  "&eth;",
  "&ntilde;",
  "&ograve;",
  "&oacute;",
  "&ocirc;",
  "&otilde;",
  "&ouml;",
  "&divide;",
  "&oslash;",
  "&ugrave;",
  "&uacute;",
  "&ucirc;",
  "&uuml;",
  "&yacute;",
  "&thorn;",
  "&yuml;",
  "&#264;",
  "&#265;",
  "&OElig;",
  "&oelig;",
  "&Scaron;",
  "&scaron;",
  "&#372;",
  "&#373;",
  "&#374;",
  "&#375;",
  "&Yuml;",
  "&fnof;",
  "&circ;",
  "&tilde;",
  "&Alpha;",
  "&Beta;",
  "&Gamma;",
  "&Delta;",
  "&Epsilon;",
  "&Zeta;",
  "&Eta;",
  "&Theta;",
  "&Iota;",
  "&Kappa;",
  "&Lambda;",
  "&Mu;",
  "&Nu;",
  "&Xi;",
  "&Omicron;",
  "&Pi;",
  "&Rho;",
  "&Sigma;",
  "&Tau;",
  "&Upsilon;",
  "&Phi;",
  "&Chi;",
  "&Psi;",
  "&Omega;",
  "&alpha;",
  "&beta;",
  "&gamma;",
  "&delta;",
  "&epsilon;",
  "&zeta;",
  "&eta;",
  "&theta;",
  "&iota;",
  "&kappa;",
  "&lambda;",
  "&mu;",
  "&nu;",
  "&xi;",
  "&omicron;",
  "&pi;",
  "&rho;",
  "&sigmaf;",
  "&sigma;",
  "&tau;",
  "&upsilon;",
  "&phi;",
  "&chi;",
  "&psi;",
  "&omega;",
  "&thetasym;",
  "&upsih;",
  "&piv;",
  "&ensp;",
  "&emsp;",
  "&thinsp;",
  "&zwnj;",
  "&zwj;",
  "&lrm;",
  "&rlm;",
  "&ndash;",
  "&mdash;",
  "&lsquo;",
  "&rsquo;",
  "&sbquo;",
  "&ldquo;",
  "&rdquo;",
  "&bdquo;",
  "&dagger;",
  "&Dagger;",
  "&bull;",
  "&hellip;",
  "&permil;",
  "&prime;",
  "&Prime;",
  "&lsaquo;",
  "&rsaquo;",
  "&oline;",
  "&frasl;",
  "&euro;",
  "&weierp;",
  "&image;",
  "&real;",
  "&trade;",
  "&alefsym;",
  "&larr;",
  "&uarr;",
  "&rarr;",
  "&darr;",
  "&harr;",
  "&crarr;",
  "&lArr;",
  "&uArr;",
  "&rArr;",
  "&dArr;",
  "&hArr;",
  "&forall;",
  "&part;",
  "&exist;",
  "&empty;",
  "&nabla;",
  "&isin;",
  "&notin;",
  "&ni;",
  "&prod;",
  "&sum;",
  "&minus;",
  "&lowast;",
  "&#8729;",
  "&radic;",
  "&prop;",
  "&infin;",
  "&ang;",
  "&and;",
  "&or;",
  "&cap;",
  "&cup;",
  "&int;",
  "&there4;",
  "&sim;",
  "&cong;",
  "&asymp;",
  "&ne;",
  "&equiv;",
  "&le;",
  "&ge;",
  "&sub;",
  "&sup;",
  "&nsub;",
  "&sube;",
  "&supe;",
  "&oplus;",
  "&otimes;",
  "&perp;",
  "&sdot;",
  "&lceil;",
  "&rceil;",
  "&lfloor;",
  "&rfloor;",
  "&lang;",
  "&rang;",
  "&#9642;",
  "&#9643;",
  "&loz;",
  "&#9702;",
  "&spades;",
  "&clubs;",
  "&hearts;",
  "&diams;",
];

function HTMLEscape(str) {
  let outj = ""; // javascript escaped hex
  let outh = ""; // html escaped decimal
  for (i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    outj += "\\u";
    outj += ((ch >> 12) & 15).toString(16);
    outj += ((ch >> 8) & 15).toString(16);
    outj += ((ch >> 4) & 15).toString(16);
    outj += (ch & 15).toString(16);
    outh += `&#${ch};`;
  } // for loop
  if (rint(3)) return outj;

  return outh;
}

string = function (max) {
  const letters =
    "abcdefghijklmnopqrstuvwxyzåäö-.+½!#¤%&/()=?}][{‚‰$£@0123456789ABCDEF".split(
      "",
    );
  let returnString = "";
  let rounds = rint(max);
  while (rounds--) {
    const prob = rint(20);
    if (prob > 15) {
      returnString += letters[Math.round(Math.random() * 67)];
    } else if (prob > 10) {
      returnString += ra(entity_table);
    } else if (prob > 5) {
      returnString += `&#${rint(10000)};`;
    } else {
      returnString += u(0);
    }
  }
  if (rint(2)) {
    return filterUnicode(returnString);
  }
  if (rint(2)) return HTMLEscape(returnString);
  return returnString;
};
function u(round) {
  round++;
  if (round > 10) {
    return "a";
  }
  try {
    num = Math.round(111411 * Math.random());
    const uni = eval(`"\\u${num.toString(16)}"`);
    return uni.length > 1 ? u(round) : uni;
  } catch (e) {
    return "a";
  }
}
const escapable =
  /[\x00-\x1f\ud800-\udfff\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufff0-\uffff]/g;

randbool = function () {
  return rint(2);
};

function filterUnicode(quoted) {
  escapable.lastIndex = 0;
  if (!escapable.test(quoted)) return quoted;

  return quoted.replace(escapable, (a) => "");
}

srint = function (upto) {
  return [-1, 1][(Math.random() * 2) | 0] * Math.floor(upto * Math.random());
};

rint = function (upto) {
  return Math.floor(upto * Math.random());
};
ra = function (a) {
  return a[rint(a.length)];
};
raPos = function (a) {
  return a[rint(a.length) + 1];
};

calcWidth = function () {
  return rint(1000);
};

getRandomColor = function () {
  const prob = rint(50);
  if (prob > 35) {
    if (rint(2)) {
      return `#${getRandomHex(6)}`;
    }
    return `#${getRandomHex(3)}`;
  }
  if (prob > 10 && prob < 35) {
    //			if(rint(2)){
    return `rgba(${colorValue()},${colorValue()},${colorValue()},${floatValue()})`;
    //			}
    //			else{
    //				return 'hsla('+colorValue()+','+colorValue()+','+colorValue()+','+floatValue()+')'
    //			}
  }
  //			if(rint(2)){
  //				return 'hsl('+colorValue()+','+colorValue()+','+colorValue()+')'
  //			}
  //			else{
  return `rgb(${colorValue()},${colorValue()},${colorValue()})`;
  //			}
};

function colorValue() {
  let returnString = "";
  if (rint(2)) {
    returnString = rgbInt();
  } else {
    returnString = percentValue();
  }
  if (!rint(200)) {
    returnString = `-${returnString}`;
  }
  return returnString;
}

getRandomHex = function (max) {
  const letters = "0123456789ABCDEF".split("");
  let hex = "";
  for (let i = 0; i < max; i++) {
    hex += letters[Math.round(Math.random() * 15)];
  }
  return hex;
};

floatValue = function () {
  const rand = rint(40);
  if (rand > 10) {
    return [-1, 1][(Math.random() * 2) | 0] * Math.random();
  }
  if (rand == 0) {
    return [-1, 1][(Math.random() * 2) | 0] * Math.random() * rint(100000);
  }
  if (rand == 1) {
    return (
      [-1, 1][(Math.random() * 2) | 0] * Math.random() * rint(100000) +
      rint(1000000)
    );
  }
  if (rand == 2) {
    return [-1, 1][(Math.random() * 2) | 0] * Math.random() + rint(1000000);
  }
  if (rand == 3) {
    return `${
      [-1, 1][(Math.random() * 2) | 0] * Math.random() * rint(100000)
    }${rint(1000000)}${rint(1000000)}`;
  }
  return [-1, 1][(Math.random() * 2) | 0] * Math.random() * rint(10);
};
randoms = function () {
  const rand = Math.floor(Math.random() * 25);
  if (rand > 10) {
    return rint(1000);
  }
  if (rand == 5) {
    return rint(100000);
  }
  if (rand == 0) {
    return floatValue();
  }
  if (rand == 1) {
    return `${[-1, 1][(Math.random() * 2) | 0] * rint(1000)}e${
      [-1, 1][(Math.random() * 2) | 0] * rint(1000)
    }`;
  }
  if (rand == 2) {
    return `${[-1, 1][(Math.random() * 2) | 0] * Math.random()}e${
      [-1, 1][(Math.random() * 2) | 0] * rint(3000)
    }`;
  }
  if (rand == 3) {
    return [-1, 1][(Math.random() * 2) | 0] * rint(1000000000000000);
  }
  if (rand == 4) {
    return `0x${getRandomHex(Math.floor(Math.random() * 20) + 1)}`;
  }
  return [-1, 1][(Math.random() * 2) | 0] * rint(1000);
};

/* var rounds=100000
while(rounds--){
	console.log(randoms())
} */

rgbInt = function () {
  return rint(255);
};

arrayWalk = function (input) {
  const obj = input;
  // console.log(obj)
  if (obj instanceof Array) {
    return arrayWalk(ra(obj));
  }
  if (obj instanceof Function) {
    return obj();
  }
  if (obj instanceof String || typeof obj === "string") {
    return obj;
  }
  return "\n\n\n\nBujaa!!! There is a bug!\n\n\n\n";
};

pxValue = function () {
  return typedDistanceValue("px");
};
degValue = function () {
  return typedDistanceValue("deg");
};
percentValue = function () {
  return typedDistanceValue("%");
};

function typedDistanceValue(type) {
  const prob = rint(100);
  if (prob > 50) {
    var distance = rint(500);
    if (rint(10)) {
      distance %= 100;
    }
    distance += type;
  } else if (prob > 30) {
    var distance = [-1, 1][(Math.random() * 2) | 0] * rint(500) + type;
  } else if (prob > 25) {
    var distance = randoms() + type;
  } else {
    var distance = floatValue() * (rint(10) + 1) * (rint(10) + 1) + type;
  }
  return distance;
}

distanceValue = function () {
  const types = ["em", "cm", "px", "mm", "in", "pc", "pt", "%", ""]; // ex
  const prob = rint(100);
  if (prob > 50) {
    var distance = rint(50000);
    if (rint(2)) {
      distance %= 100;
    }
    distance += ra(types);
  } else if (prob > 30) {
    var distance = [-1, 1][(Math.random() * 2) | 0] * rint(500) + ra(types);
  } else if (prob > 25) {
    var distance = randoms() + ra(types);
  } else {
    var distance = floatValue() * (rint(10) + 1) * (rint(10) + 1) + ra(types);
  }
  return distance;
};

function occurrences(string, subString, allowOverlapping) {
  string += "";
  subString += "";
  if (subString.length <= 0) return string.length + 1;

  let n = 0;
  let pos = 0;
  const step = allowOverlapping ? 1 : subString.length;

  while (true) {
    pos = string.indexOf(subString, pos);
    if (pos >= 0) {
      n++;
      pos += step;
    } else break;
  }
  return n;
}

/*
function benchMark(){
var num=20000
var output='Distance:'
var amount=num
while(num--){

	output+=' '+distanceValue()

}
//distanceValue= Amount: 20000 Negative: 2014 Positive: 17986 Floats: 718
//pxValue= Amount: 20000 Negative: 3076 Positive: 16924 Floats: 555
//randoms= Amount: 20000 Negative: 4842 Positive: 15158 Floats: 1607

var count_float = occurrences(output,'.',false)
var count_negative= occurrences(output,'-',false)
var count_zeropointX=occurrences(output,'0.',false)
var count_positive=amount-count_negative

console.log('Amount: '+amount+' Negative: '+count_negative+' Positive: '+count_positive+' Floats: '+count_float+' ZeroPoints: '+count_zeropointX)
console.log(output)
}

var num=20000
var poscount=0
var negcount=0
while(num--){
	var value=parseInt(percentValue())

	if(Math.abs(value)>100){poscount++}
	else{negcount++}
}

console.log('Over 100: '+poscount+' Under 100: '+negcount)


var num=200

while(num--){
	console.log(getRandomColor())
}

for(i=0;i<10;i++){
console.log(string(50))
}
*/
