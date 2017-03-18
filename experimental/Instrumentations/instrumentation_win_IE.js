var spawn = require('child_process').spawn
var exec = require('child_process').exec

var path=require('path')
var fs=require('fs')
var mkdirsSync = function (dirname, mode) {
  if (mode === undefined) mode = 0777 ^ process.umask();
  var pathsCreated = [], pathsFound = [];
  var fn = dirname;
  while (true) {
    try {
      var stats = fs.statSync(fn);
      if (stats.isDirectory())
        break;
      throw new Error('Unable to create directory at '+fn);
    }
    catch (e) {
      if (e.errno == 34) {
        pathsFound.push(fn);
        fn = path.dirname(fn);
      }
      else {
        throw e;
      }
    }
  }
  for (var i=pathsFound.length-1; i>-1; i--) {
    var fn = pathsFound[i];
    fs.mkdirSync(fn, mode);
    pathsCreated.push(fn);
  }
  return pathsCreated;
};

function cloneArray(obj){
        var copy = [];
        for (var i = 0; i < obj.length; ++i) {
            copy[i] = obj[i];
        }
        return copy;
}

var previousCrash
module.exports = {

analyze: function(testCaseBuffer,callback, browser){
		checkEventLog(testCaseBuffer,callback)
	}
}



function checkEventLog(callback,browser){
	setTimeout(function(){
	var logData=""
	var getEventLog=spawn('powershell',['-Command','(Get-EventLog –Logname Application -Source "Application Error" -Message *edgehtml* -Newest 1).Message'])
	getEventLog.stdout.on("data",function(data){logData+=data})
	getEventLog.stdin.end()
	getEventLog.on("exit",function(){
		parseLog(logData.toString().trim(),callback,browser)
	})
	},1000)
}

var codes=[
	["0xc0000005","0xc00000fd","0x4000001f"],
	["AccessViolation","StackOverflow","WOW64Breakpoint"]
]
var crashName=""
function parseLog(logText,callback,browser){
	var tmp=logText.split("\r\n")
	if(logText.indexOf("stopped interacting")==-1){
	var lines=[]
	for(var x=0; x<tmp.length;x++){
		if(tmp[x].length==79){
				lines.push((tmp[x]+tmp[x+1]))
				x++
		}
		else if(tmp[x].length>1){
			lines.push(tmp[x])
		}
	}
	var crashInfo={
		applicationName:"",
		moduleName:"",
		exceptionCode:"",
		faultOffset:"",
		applicationStartTime:""
	}
	lines.forEach(function(data){
		var lineStart=(data.split(":")[0].trim())
		var lineEnd=(data.split(":")[1].split(",")[0].trim())
		//console.log(lineStart)
		switch(lineStart){
			case "Faulting application name":
					crashInfo.applicationName=lineEnd
					break
			case "Faulting module name":
					crashInfo.moduleName=lineEnd
					break
			case "Exception code":
					crashInfo.exceptionCode=lineEnd
					break
			case "Fault offset":
					crashInfo.faultOffset=lineEnd
					break
			case "Faulting application start time":
					crashInfo.applicationStartTime=lineEnd
					break
		}
	})
	console.log('Previous: '+previousCrash)
	console.log('Current: '+crashInfo.applicationStartTime)
	if(previousCrash!==undefined && crashInfo.applicationStartTime!=previousCrash){
		var exceptionIndex=codes[0].indexOf(crashInfo.exceptionCode)
		if(exceptionIndex!=-1){
			var crashType=codes[1][exceptionIndex]
		}
		else{
			var crashType="Other"
		}

		var fileName=crashInfo.applicationName.split(".")[0].toLowerCase()+"-"+crashInfo.moduleName.split(".")[0].toLowerCase()+"-"+crashType+"-"+crashInfo.faultOffset.split("x")[1].substring(0,crashInfo.faultOffset.split("x")[1].length-2)
		previousCrash=crashInfo.applicationStartTime
		
		if(crashName==""){
			console.log('Initial crash: '+fileName)
		}
		if(crashName == "" || fileName==crashName ){
			console.log('Found: '+fileName)
			crashName=fileName
			instrumentationEvents.emit("crash")
			callback()
		}
		else{
			console.log('Found: '+fileName)
			console.log('Expected: '+crashName)
			callback()
		}
	}
	else{
		previousCrash=crashInfo.applicationStartTime
		callback()
	}
	}
	else{
		callback()	
	}
}

function write_repro(filename,callback,browser){
		try{browser.kill("SIGKILL")}catch(e){}
		
		
		var index=0
		var repro_buffer=cloneArray(config.previousTestCasesBuffer)
		if(!fs.existsSync(config.result_dir+'/'+filename)){
			mkdirsSync(config.result_dir+filename)
			while(repro_buffer.length){
    			repro=repro_buffer.pop();
    			index++
    			//config.target+'-'+reproname+index+'.'+config.filetype
				fs.writeFile(config.result_dir+filename+'/'+filename+index+'.'+config.filetype, repro, function(err) {
					if(err) {
						console.log(err);
					}
					if(path.existsSync("E:/CrashDumps")){
						var dumps=fs.readdirSync("E:/CrashDumps");
						var fileDate='1'
						var newestName=""
						dumps.forEach(function(file){
							var curFileDate=fs.statSync("E:/CrashDumps/"+file).mtime
							if(curFileDate>fileDate){
								fileDate=curFileDate
								newestName=file
							}
						})
						fs.writeFileSync(config.result_dir+filename+'/'+filename+'.dmp', fs.readFileSync("E:/CrashDumps/"+newestName))
					}
				}); 
			}
			
			callback()
		}
		else{
			callback()
		}

}

browserStartRetryRound=0
browser={}
startBrowser = function(){
		try{clearTimeout(connectionClosedTimeout);}catch(e){}
		exec('taskkill /F /IM '+config.target+'.exe',function(){
			exec('explorer.exe http://127.0.0.1:'+config.port,function(){})
		})
	
}

function restartBrowser(){
	console.log('Restart')
	checkEventLog(startBrowser,browser);
}

instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
	//console.log('Timeout')
	checkEventLog(startBrowser,browser);
})
var connectionClosedTimeout
instrumentationEvents.on('connectionClosed',function(testCaseBuffer){
	//console.log('Connection Closed')
	try{clearTimeout(connectionClosedTimeout);}catch(e){}
	connectionClosedTimeout=setTimeout(function(){checkEventLog(startBrowser,browser);console.log('close-event');},1000)
})	

instrumentationEvents.on('startClient',function(){
	console.log("Init")
	checkEventLog(startBrowser)
})
//instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',function(){
	//console.log('Trigger');
	restartBrowser()
})


config.fuzzfile='./NodeFuzz_IE.html'
config.reBuildClientFile()
//instrumentationEvents.emit('startClient')

