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

var LastCrashTime=''
var ignoreList=[]
module.exports = {

analyze: function(testCaseBuffer,callback, browser){ 
		checkEventLog(testCaseBuffer,callback,browser)
	}
}

function init(callback){
		var test=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
		test.stdout.on('data',function(data){LastCrashTime=data;})
		test.stdin.end()
		test.on('exit',function(){callback()})
}

function parseLog(logText){
	var tmp=logText.split("\r\n")
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
	return crashInfo.applicationName+crashInfo.moduleName+crashInfo.faultOffset
}


function checkEventLog(testCaseBuffer,callback,browser){
	var newTime=''
	var test=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
		test.stdout.on('data',function(data){newTime+=data})
		test.stdin.end()
		test.on('exit',function(){
			if(LastCrashTime==newTime){
				try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
				setTimeout(function(){var test2=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
					test2.stdout.on('data',function(data){if(data.length<5){LastCrashTime=data}})
					test2.stdin.end()
					test2.on('exit',function(){
						callback()
					})
				},1000)
			}
			else{
				LastCrashTime=newTime
				var logData=""
				var getEventLog=spawn("powershell.exe",["C:/NodeFuzz/Helpers/eventlog_IE.ps1"])
				getEventLog.stdout.on("data",function(data){logData+=data})
				getEventLog.stdin.end()
				getEventLog.on("exit",function(){
					var fingerPrint=parseLog(logData)
					if(ignoreList.indexOf(fingerPrint)==-1){
						console.log("New "+fingerPrint)
						if(fingerPrint.indexOf("verifier.dll")==-1)
							ignoreList.push(fingerPrint)
						setTimeout(function(){
						if(fs.existsSync("E:/CrashDumps")){
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
						var dir="E:/CrashDumps/"+newestName
						var analyze=spawn('C:/Program Files (x86)/Debugging Tools for Windows (x86)/windbg.exe',[ '-c' ,"$<C:/NodeFuzz/Helpers/WinDBG.txt",'-y','SRV*c:\\code\\mssymbols*http://msdl.microsoft.com/download/symbols;SRV*c:\\code\\chromsymbols*http://chromium-browser-symsrv.commondatastorage.googleapis.com' ,'-z' ,dir, '-logo' ,'../log-file.txt'])
						analyze.on('exit',function(){
							fs.unlinkSync(dir)
							var filename=filterLogFile('../log-file.txt')
							console.log(filename)
							if(filename=='breakpoint'){
								console.log('Just a breakpoint...')
								try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
								
								var test2=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
								test2.stdout.on('data',function(data){LastCrashTime=data})
								test2.stdin.end()
								test2.on('exit',function(){
									callback()
								})
							}
							else if(filename=='null-pointer' || filename=='pain-in-the-ass'){
								console.log('Useless...')
								try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
								
								var test2=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
								test2.stdout.on('data',function(data){LastCrashTime=data})
								test2.stdin.end()
								test2.on('exit',function(){
									callback()
								})
							}
							else{
								try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
								var test2=spawn('powershell',['C:/NodeFuzz/Helpers/eventlog_IE_time.ps1'])
								test2.stdout.on('data',function(data){LastCrashTime=data})
								test2.stdin.end()
								test2.on('exit',function(){
									write_repro(testCaseBuffer,filename,callback)
								})
							}
							
						});
						}
						else{
							callback()
						}
						},20000)
					}
					else{
						console.log("Dupe "+fingerPrint)
						callback()
					}
			});
			}
		
		});
}

function write_repro(repro_buffer, filename,callback){
	var resultdir=filename

	mkdirsSync(config.result_dir+resultdir)
		var index=0
		if(!fs.existsSync(config.result_dir+'/'+resultdir+"-log_file.txt")){
			while(repro_buffer.length){
    			repro=repro_buffer.pop();
    			index++
    			//config.target+'-'+reproname+index+'.'+config.filetype
				fs.writeFile(config.result_dir+resultdir+'/'+config.target+'-repro-'+index+'.'+config.filetype, repro, function(err) {
					if(err) {
						console.log(err);
					}
				}); 
			}
		
			fs.writeFile(config.result_dir+'/'+resultdir+"-log_file.txt", fs.readFileSync('../log-file.txt'), function(err) {
				if(err) {
					console.log(err);
					callback()
				} else {
					console.log("The file was saved!");
					callback()
				}
			}); 
		}
		else{
			callback()
		}

	
}

function filterLogFile(logfile){
	var breakPoint=false
	var needToSave=false
	try{
	var log=fs.readFileSync(logfile).toString();
	var prefix=''
	lines=log.split('\n');
	for(i=0; i<lines.length; i++){
		if(lines[i].indexOf('This dump file has a breakpoint')>-1){
			breakPoint=true
		}
		else if(lines[i].indexOf('VerifierStopMessage')>-1){
			console.log("Verifier Stop message")
			return "VerifierStopMessage-"+(new Date().getTime())
		}
		else if(lines[i].indexOf('Attempt to read from address 00000000')>-1){
			return 'null-pointer'
		}
		else if(lines[i].indexOf('Short Description:')>-1){
			prefix+=lines[i].split(':')[1].replace(/ /g,"").trim()
		}
		else if(lines[i].indexOf('Exploitability Classification:')>-1){
			prefix=lines[i].split(':')[1].replace(/ /g,"").trim()+prefix
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
			
		}

	}
	if(filename.indexOf('contentGpuChannelHostMessageFilterOnChannelError')!=-1){
		return 'pain-in-the-ass'
	}
	else if(!breakPoint || (breakPoint && needToSave)){
		return prefix+filename+filenameprefix.substr(filenameprefix.length-3,3)
	}
	else
		return 'breakpoint'
	}catch(e){console.log('parse failed! Going to fallback. '); return (new Date()).getTime();}
}

browserStartRetryRound=0
browser={}
startBrowser = function(){
		
		crashHandling=0;
		browserStartRetryRound=0
		exec('taskkill /F /IM iexplore.exe',function(){clearBrowserEvents();resetBrowserEvents();browser = spawn(config.launch_command, config.browser_args)})
		

}

function restartBrowser(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
	checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
}

function resetBrowserEvents(){
	instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
		try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
		checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
	})	
}

function clearBrowserEvents(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	instrumentationEvents.removeAllListeners('websocketTimeout');
}
/*
instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
	try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
	clearBrowserEvents()
	checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
})*/
instrumentationEvents.on('startClient',function(){
	console.log("Init")
	init(startBrowser)
	instrumentationEvents.removeAllListeners('websocketTimeout');
})

instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)

config.launch_command='C:/Program Files/Internet Explorer/iexplore.exe' 
config.browser_args=['-private','http://127.0.0.1:'+config.port]
config.fuzzfile='./NodeFuzz_IE.html'
config.target="IE"
config.reBuildClientFile()
instrumentationEvents.emit('startClient')