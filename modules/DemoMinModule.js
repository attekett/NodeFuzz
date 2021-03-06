//
// Generator function.
//
function generateTestCase() {
  let returnString = "<html><body><p>Hello Fuzz</p><script>\n";
  for (let x = 0; x < 10; x++) {
    returnString += `setTimeout(function(){document.body.style.zoom=${
      Math.random() * 3
    }},${Math.floor(Math.random() * 30)})\n`;
  }
  return `${returnString}</script></body></html>`;
}

//
// Necessary exports
//
module.exports = {
  //
  // fuzz:
  // Required synchronous function.
  // Must return a test case either as a Buffer or as a String
  //
  fuzz() {
    return generateTestCase();
  },
  //
  // init:
  // Optional function
  // Doesn't require a return-value.
  // Can be used to do initialisations required by the fuzz-module.
  init() {
    config.type = "text/html";
    config.tagtype = "html";
    config.clientFile = config.reBuildClientFile();
  },
};
