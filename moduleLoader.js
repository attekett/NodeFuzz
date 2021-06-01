const fs = require("fs");

//
// Function to detect if given path was file or folder and load files(s)
//
function loadModulesFromFolder(folder) {
  const returnArray = [];
  try {
    if (fs.statSync(folder).isDirectory()) {
      const files = fs.readdirSync(folder);
      for (let x = 0; x < files.length; x++) {
        const temp = requireModule(`${folder}/${files[x]}`);
        if (temp) {
          console.log(`Successfully required module ${files[x]}`);
          returnArray.push(temp);
        }
      }
    } else {
      const temp = requireModule(folder);
      if (temp) {
        console.log(`Successfully required module ${folder}`);
        returnArray.push(temp);
      }
    }
  } catch (e) {
    console.log(`Failed to get modules from ${folder} with error ${e}`);
  }

  return returnArray;
}

//
// Function to check if file given is compatible to NodeFuzz.
//
// Each module is required to export at least fuzz() method. Also init-method is recommended if module needs some initializing.
// If module exports init() method then the init is executed when detected.
//
function requireModule(fileName) {
  if (fs.statSync(fileName).isDirectory()) {
    console.log(
      `Will not handle directories in module-dir. Skipping ${fileName}`,
    );
    return null;
  }
  const temp = require(fileName);
  if (temp.fuzz) {
    if (temp.init) {
      console.log(`Found property init() from module ${fileName}`);
      temp.init();
    }
    return temp;
  }
  console.log(`Module ${fileName} has no exported property fuzz.`);
  return null;
}

function loadModules() {
  let returnArray;
  if (
    process.argv.indexOf("-m") !== -1 ||
    process.argv.indexOf("--module") !== -1
  ) {
    if (process.argv.indexOf("-m") !== -1)
      returnArray = loadModulesFromFolder(
        process.argv[process.argv.indexOf("-m") + 1],
      );
    else
      returnArray = loadModulesFromFolder(
        process.argv[process.argv.indexOf("--module") + 1],
      );
  } else {
    console.log(
      `No module folder given. Defaulting to ${config.defaultModuleDirectory} from config.js`,
    );
    returnArray = loadModulesFromFolder(config.defaultModuleDirectory);
  }

  if (returnArray.length === 0) {
    console.log("No usable modules were detected.\nExiting...");
    process.exit(1);
  }

  console.log(`We have ${returnArray.length} modules available.`);
  return returnArray;
}
module.exports = {
  loadModulesFromFolder,
  loadModules,
};
