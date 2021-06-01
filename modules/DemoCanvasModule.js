require("./Helpers/randoms.js");

function generateTestCase() {
  var returnString =
    '<html>\n	<head>\n		<style></style>\n	</head>\n	<body>\n<canvas id="test"></canvas>';
  returnString += "</body>\n<script>\n";
  returnString += generateCanvas(1);
  returnString += "\n</script>\n</html>";
  return returnString;
}

function generateCanvas(num) {
  Array.prototype.shuffle = function () {
    var s = [];
    while (this.length) s.push(this.splice(Math.random() * this.length, 1));
    while (s.length) this.push(s.pop());
    return this;
  };

  var returnString = "";
  var returnArray = new Array();
  while (num--) {
    width = calcWidth();
    height = calcWidth();
    returnString +=
      'var canvas=document.getElementById("test");\nvar ctx=canvas.getContext("2d")\n';
    returnString +=
      'canvas.setAttribute("width",' +
      width +
      ')\ncanvas.setAttribute("height",' +
      height +
      ")\n";
    returnArray = returnArray.concat(getRandomCanvasFunction(10));
    returnArray = returnArray.shuffle();
    for (i = 0; i < returnArray.length; i++) {
      returnString += returnArray[i];
    }
  }
  returnString += "ctx.stroke();ctx.fill();";
  return returnString;
}

function getRandomCanvasFunction(num) {
  var returnArray = new Array();
  while (num--) {
    var method = ra(canvasMethods);
    returnArray = returnArray.concat(method(rint(10) + 3));
  }

  return returnArray;
}

var canvasMethods = [canvasPathCurve];

var canvasPath = [
  ["moveTo", widthheight],
  ["lineTo", widthheight],
  ["quadraticCurveTo", widthheight2],
  ["bezierCurveTo", widthheight3],
  ["arc", arcValue],
  ["arcTo", arcTo],
];

function canvasPathCurve(num) {
  var returnArray = new Array();
  returnArray = returnArray.concat("try{ctx.beginPath();}catch(e){}\n");

  while (num--) {
    var method = ra(canvasPath);
    returnArray = returnArray.concat(
      "try{ctx." + method[0] + "(" + method[1]() + ");}catch(e){}\n",
    );
  }
  returnArray = returnArray.concat(
    "try{ctx.closePath();ctx.stroke();}catch(e){}\n",
  );
  return returnArray;
}
function widthheight() {
  if (rint(10000)) {
    return " " + rint(width) + "," + rint(height) + " ";
  } else {
    var first = rint(100) ? rint(width) : randoms();
    var second = rint(100) ? rint(height) : randoms();
    return " " + first + "," + second + " ";
  }
}
function widthheight2() {
  return widthheight() + "," + widthheight();
}
function widthheight3() {
  return widthheight() + "," + widthheight() + "," + widthheight();
}
function arcValue() {
  var clockwise = ra(["true", "false"]);
  return (
    widthheight() +
    "," +
    randoms() +
    "," +
    Math.PI * Math.random() +
    "," +
    Math.PI * Math.random() +
    "," +
    clockwise
  );
}
function arcTo() {
  return widthheight2() + "," + randoms();
}

module.exports = {
  init: function () {
    //
    //These inits are for config.reBuildClientFile() and NodeFuzz.html
    //
    config.filetype = "html";
    config.type = "text/html";
    config.tagtype = "html";
    config.clientFile = config.reBuildClientFile();
    console.log(
      "You could have some inits in DemoCanvasModule.js and it would be executed now.",
    );
  },
  fuzz: function () {
    return generateTestCase();
  },
};
