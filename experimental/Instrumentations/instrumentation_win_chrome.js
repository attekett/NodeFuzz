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
		//checkEventLog(testCaseBuffer,callback)
		browser.kill("SIGINT")
		callback()
	}
}



function checkEventLog(callback,browser){
	var logData=""
	var getEventLog=spawn("powershell.exe",["C:/NodeFuzz/Helpers/eventlog_chrome.ps1"])
	getEventLog.stdout.on("data",function(data){logData+=data})
	getEventLog.stdin.end()
	getEventLog.on("exit",function(){
		parseLog(logData.toString(),callback,browser)
	})
}

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
	console.log(crashInfo)
	if(previousCrash!==undefined && crashInfo.applicationStartTime!=previousCrash){
		if(crashInfo.exceptionCode=="0xc0000005"){var crashType="AccessViolation"}else{var crashType="Other"}
		var fileName=crashInfo.applicationName.split(".")[0].toLowerCase()+"-"+crashInfo.moduleName.split(".")[0].toLowerCase()+"-"+crashType+"-"+crashInfo.faultOffset.split("x")[1]
		console.log("Filename: "+fileName)
		previousCrash=crashInfo.applicationStartTime
		write_repro(fileName,callback,browser)
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
		try{browser.kill("SIGINT")}catch(e){}
		
		mkdirsSync(config.result_dir+filename)
		var index=0
		var repro_buffer=cloneArray(config.previousTestCasesBuffer)
		if(!fs.existsSync(config.result_dir+'/'+filename+"."+config.filetype)){
			while(repro_buffer.length){
    			repro=repro_buffer.pop();
    			index++
    			//config.target+'-'+reproname+index+'.'+config.filetype
				fs.writeFile(config.result_dir+filename+'/'+filename+index+'.'+config.filetype, repro, function(err) {
					if(err) {
						console.log(err);
					}
				}); 
			}
			
			callback()
		}
		else{
			callback()
		}

}
/*
function filterLogFile(logfile){
	var breakPoint=false
	var needToSave=false
	try{
	var log=fs.readFileSync(logfile).toString();
	lines=log.split('\n');
	for(i=0; i<lines.length; i++){
		if(lines[i].indexOf('This dump file has a breakpoint')>-1){
			breakPoint=true
		}
		else if(breakPoint===true && lines[i].indexOf('VerifierStopMessage')>-1){
			needToSave=true
		}
		else if(lines[i].indexOf('Attempt to read from address 00000000')>-1){
			return 'null-pointer'
		}
		else if(lines[i].indexOf('ExceptionAddress:')>-1){
			var filename=lines[i].split(' ')[2]
			var filenameprefix=''
			
			filename=filename.split('!')[1]
			if(filename.indexOf('+')!=-1){
				filenameprefix=filename.split('+')[1]
				filename=filename.split('+')[0]
				filenameprefix=filenameprefix.replace(/[^a-zA-Z 0-9]+/g,'');	
			}
			else{
				filename=filename.split('<')[0]
			}
			filename=filename.replace(/[^a-zA-Z 0-9 _]+/g,'');
			console.log('Hit: '+filename+filenameprefix.substr(filenameprefix.length-3,3))
		}
	}
	if(filename.indexOf('contentGpuChannelHostMessageFilterOnChannelError')!=-1){
		return 'pain-in-the-ass'
	}
	else if(!breakPoint || (breakPoint && needToSave))
		return filename+filenameprefix.substr(filenameprefix.length-3,3)
	else
		return 'breakpoint'
	}catch(e){console.log('parse failed! Going to fallback. '); return (new Date()).getTime();}
}*/

browserStartRetryRound=0
browser={}
startBrowser = function(){
	if(browser._closesNeeded==browser._closesGot || browserStartRetryRound > 30){
		crashHandling=0;
		browserStartRetryRound=0
		browser = spawn(config.launch_command, config.browser_args)
		browser.stderr.on('data',function(data){
			console.log('STDERR:')
			console.log(data.toString())
		})	
		browser.stdout.on('data',function(data){
			console.log('STDOUT:')
			console.log(data.toString())
		})	
		browser.on('exit',function(){
			exec('taskkill /IM chrome.exe',function(){
				console.log('killed')
				setTimeout(startBrowser,3000)
			})
		})

	}
	else{
		try{clearTimeout(timeoutBrowser);}catch(e){}
		browserStartRetryRound++
		if(browserStartRetryRound>=30){
			console.log('Waited long enough. Trying re-kill.')
			timeoutBrowser=setTimeout(startBrowser,1000)
			try{
				browser.kill('SIGINT')
			}
			catch(e){'Failed to kill with error:'+e}
		}
		else
			timeoutBrowser=setTimeout(startBrowser,200)
	}
}

function restartBrowser(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.kill('SIGINT')
}

function clearBrowserEvents(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.removeAllListeners('exit');
}

instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
	//console.log("Timeout")
	startBrowser()
	//checkEventLog(startBrowser,browser);
})
instrumentationEvents.on('startClient',function(){
	//console.log("Init")
	startBrowser()
	//checkEventLog(startBrowser)
})
instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)

