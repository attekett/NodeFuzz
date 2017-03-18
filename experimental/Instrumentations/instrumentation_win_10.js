var spawn = require('child_process').spawn
var exec = require('child_process').exec

var path=require('path')
var fs=require('fs')
var fse=require('fs-extra')
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
if(!fs.existsSync('./ignoreList'+config.target))
	var ignoreList=[]
else
	var ignoreList=fs.readFileSync('./ignoreList'+config.target).toString().split(',')

module.exports = {

analyze: function(testCaseBuffer,callback, browser){ 
		checkEventLog(testCaseBuffer,callback,browser)
	}
}

var commandGetTime='((Get-EventLog –Logname Application -EntryType "Error" -Message *spartan_edge.exe* -Newest 1).TimeGenerated.ToUniversalTime().Ticks - 621355968000000000) / 10000000; break'

function init(callback){
		var test=spawn('powershell',['-Command',commandGetTime])
		LastCrashTime=''
		test.stdout.on('data',function(data){LastCrashTime+=data.toString().trim();})
		test.stdin.end()
		test.on('exit',function(){console.log('Init: LastCrashTime: '+LastCrashTime);callback()})
}

var codes=[
	["0xc0000005","0xc00000fd","0x4000001f"],
	["AccessViolation","StackOverflow","WOW64Breakpoint"]
]

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
	if(logText.indexOf('Faulting application name')!=-1){
		lines.forEach(function(data){
			var lineStart=(data.split(":")[0].trim())
			var lineEnd=(data.split(":")[1].split(",")[0].trim())
			
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
		var exceptionIndex=codes[0].indexOf(crashInfo.exceptionCode)
		if(exceptionIndex!=-1){
			var crashType=codes[1][exceptionIndex]
		}
		else{
			var crashType="Other"
		}
		return crashInfo.applicationName.split(".")[0].toLowerCase()+"-"+crashInfo.moduleName.split(".")[0].toLowerCase()+"-"+crashType+"-"+crashInfo.faultOffset.split("x")[1].substring(9,crashInfo.faultOffset.split("x")[1].length)
	}
	else{
	//	 config.dumpFolder=path.dirname(tmp.join('').match(/minidump=(.*)/)[1].replace("'",'')).split(require("path").sep).join("/")
		 return ""
	}
}


function checkEventLog(testCaseBuffer,callback,browser){
	clearBrowserEvents()
	var newTime=''
	exec('taskkill /F /IM '+config.target+'.exe',function(){})
	var test=spawn('powershell',['-Command',commandGetTime])
		test.stdout.on('data',function(data){newTime+=data.toString().trim()})
		test.stdin.end()
		test.on('exit',function(){
			if(LastCrashTime==newTime){
				setTimeout(function(){
					LastCrashTime=''
					var test2=spawn('powershell',['-Command',commandGetTime])
					test2.stdout.on('data',function(data){LastCrashTime+=data.toString().trim()})
					test2.stdin.end()
					test2.on('exit',function(){
						callback()
					})
				},2000)
			}
			else{
				LastCrashTime=newTime
				var logData=""
				var getEventLog=spawn("powershell.exe",["-Command",'(Get-EventLog –Logname Application -EntryType "Error" -Message *spartan_edge.exe* -Newest 1).Message; break'])
				getEventLog.stdout.on("data",function(data){logData+=data.toString()})
				getEventLog.stdin.end()
				getEventLog.on("exit",function(){
					fse.removeSync('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue\\')
					fse.mkdirsSync('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue\\')

					if(logData){
					var fingerPrint=parseLog(logData)
					if(fingerPrint=="" || ignoreList.indexOf(fingerPrint)==-1){
						console.log("["+((new Date()).toGMTString())+"] New "+fingerPrint)
						if(fingerPrint.indexOf("verifier.dll")==-1 && fingerPrint.indexOf("msvcrt")==-1 ){
							ignoreList.push(fingerPrint)
							fs.writeFileSync('./ignoreList'+config.target,ignoreList.toString())
						}
						spawn("powershell.exe",["-Command",'(get-WmiObject win32_networkadapter |where { $_.name -like "*advanced-n*"}).enable(); break'])
						setTimeout(function(){
							console.log('Checking for dump-file from '+config.dumpFolder)
						if(fs.existsSync(config.dumpFolder)){
						var dumps=fs.readdirSync(config.dumpFolder);
						var fileDate='1'
						var newestName=""
						dumps.forEach(function(file){
							if(file.search(new RegExp(config.target,'i'))!=-1 &&(path.extname(file)=='.dmp' || path.extname(file)=='.dump' || path.extname(file)=='.mdmp')){
								var curFileDate=fs.statSync(config.dumpFolder+"/"+file).size
								if(curFileDate>fileDate){
									fileDate=curFileDate
									newestName=file
								}
							}
						})
						var dir=config.dumpFolder+"/"+newestName
						logData=""
						console.log("Analyzing dump file "+dir)
						var analyze=spawn('C:/Program Files (x86)/Windows Kits/10/Debuggers/x64/cdb.exe',[ '-c' ,".ecxr; !analyze -v; .load winext/MSEC.dll; !exploitable -v; .detach",'-y','SRV*c:\\code\\mssymbols*http://msdl.microsoft.com/download/symbols;SRV*c:\\code\\chromsymbols*http://chromium-browser-symsrv.commondatastorage.googleapis.com' ,'-z' ,dir])
						analyze.stdout.on('data',function(data){logData+=data; if(data.toString().indexOf('chrome_child!base::debug::BreakDebugger')>-1){analyze.kill('SIGINT')};})
						analyze.on('exit',function(){
							spawn("powershell.exe",["-Command",'(get-WmiObject win32_networkadapter |where { $_.name -like "*advanced-n*"}).disable(); break'])
							
							fs.readdirSync(config.dumpFolder).forEach(function(file){
								fs.unlinkSync(config.dumpFolder+'/'+file)
							})
							var filename=filterLogFile(logData)
							console.log(filename)
						
							LastCrashTime=''
							var test2=spawn('powershell',['-Command',commandGetTime])
							test2.stdout.on('data',function(data){LastCrashTime+=data.toString().trim()})
							test2.stdin.end()
							test2.on('exit',function(){
								write_repro(testCaseBuffer,filename,logData,callback)
							})
						
							
						});
						}
						else{
							console.log("No dump folder...")
							callback()
						}
						},30000)
						//write_repro(testCaseBuffer,fingerPrint,logData,callback)
					}
					else{
						console.log("["+((new Date()).toGMTString())+"] Dupe "+fingerPrint)
						callback()
					}
			}
			else{
				console.log("Check eventlog "+(new Date()))
				callback()
			}
			});
			}
		});
}

function write_repro(repro_buffer, filename,logdata,callback){
	var resultdir=filename

	fse.mkdirsSync(config.result_dir+resultdir)
	var index=0
	if(!fs.existsSync(config.result_dir+'/'+resultdir+"-log_file.txt")){
		while(repro_buffer.length){
			repro=repro_buffer.pop();
			index++
			fs.writeFile(config.result_dir+resultdir+'/'+config.target+'-'+filename+'-'+index+'.'+config.filetype, repro, function(err) {
				if(err) {
					console.log(err);
				}
			}); 
		}
		fs.writeFileSync(config.result_dir+resultdir+'/'+resultdir+"-log_file.txt", logdata)
		fs.writeFile(config.result_dir+'/'+resultdir+"-log_file.txt", logdata, function(err) {
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
	//try{
	var log=logfile.toString();
	var prefix=''
	var majorminorcount=0;
	var verifier=false
	var memcpy=false
	var stacktext=false
	var shortDescription=""
	lines=log.split('\n');
	for(i=0; i<lines.length; i++){
		if(lines[i].indexOf('This dump file has a breakpoint')>-1){
			breakPoint=true
		}
		else if(lines[i].indexOf('VerifierStopMessage')>-1){
			console.log("Verifier Stop message")
			verifier=true
			needToSave=true
		}
		else if(lines[i].indexOf('BUGCHECK_STR:')!=-1 && (lines[i].indexOf('NULL_CLASS_PTR')!=-1 || lines[i].indexOf('NULL_POINTER')!=-1)){
			prefix=lines[i].split(' ')[lines[i].split(' ').length-1]
		}
		else if(lines[i].indexOf('Short Description:')>-1){
			shortDescription=lines[i].split(':')[1].replace(/ /g,"").trim()
		}
		else if(lines[i].indexOf('Exploitability Classification:')>-1){
			prefix=lines[i].split(':')[1].replace(/ /g,"").trim()+shortDescription
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
			if(filename=='memcpy')
				memcpy=true

		}
		else if((verifier || memcpy) && lines[i].indexOf('Major+Minor')!=-1){
			majorminorcount++;
			if(majorminorcount==3){
				var filename=lines[i].split(' ')[2]
				var filenameprefix=''
				
				filename=filename.split('!')[1]
				if(filename.indexOf('+')!=-1){
					filenameprefix=filename.split('+')[1]
					filename=filename.split('+')[0]
					filenameprefix=filenameprefix.replace(/[^a-zA-Z 0-9:]+/g,'');	
				}
				else{
					filename=filename.split('<')[0].replace(/:/g,'')
				}
			}
		}
		else if(memcpy && (lines[i].indexOf('STACK_TEXT:')!=-1 || stacktext)){
			stacktext=true
			majorminorcount++;
			if(majorminorcount==3){
				var filename=lines[i].split(' ')[lines[i].split(' ').length-1]
				console.log(filename)
				var filenameprefix=''
				
				filename=filename.split('!')[1]
				if(filename.indexOf('+')!=-1){
					filenameprefix=filename.split('+')[1]
					filename=filename.split('+')[0]
					filenameprefix=filenameprefix.replace(/[^a-zA-Z 0-9:]+/g,'');	
				}
				else{
					filename=filename.split('<')[0].replace(/:/g,'')
				}
			console.log('Final name: '+prefix+filename.replace(/:/g,'')+filenameprefix.substr(filenameprefix.length-3,3))
			}

		}
	}
	if(filename.indexOf('contentGpuChannelHostMessageFilterOnChannelError')!=-1){
		return 'pain-in-the-ass'
	}
	else if(!breakPoint || (breakPoint && needToSave)){
		return prefix+filename.replace(/:/g,'')+filenameprefix.substr(filenameprefix.length-3,3)
	}
	else
		return 'breakpoint'
	//}catch(e){console.log('parse failed! Going to fallback. '); if(logfile.toString().indexOf('This dump file has a breakpoint')==-1){return (new Date()).getTime();}else{return 'breakpoint'}}
}

browserStartRetryRound=0
browser={}

var exec=require('child_process').exec
crashHandling=false
startBrowser = function(){
	clearBrowserEvents()		
	crashHandling=0;
	resetBrowserEvents();
	fs.readdirSync(config.dumpFolder).forEach(function(file){
		fs.unlinkSync(config.dumpFolder+'/'+file)
	})
	setTimeout(function(){exec('explorer.exe http://127.0.0.1:'+config.port,function(){})},2000)
}

setInterval(function (){
	exec('taskkill /F /IM ApplicationFrameHost.exe',function(){})
},5*60*1000)

function restartBrowser(){
	clearBrowserEvents()
	checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
}
var timeout1
function resetBrowserEvents(){
	clearBrowserEvents()
	instrumentationEvents.once('websocketTimeout',function(testCaseBuffer){
		//console.log('websocketTimeout')
		checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
	});	
	instrumentationEvents.once('connectionClosed',function(testCaseBuffer){
		//console.log('Connection Closed')	

		if(testCaseBuffer){
			if(testCaseBuffer.length>0)
				checkEventLog(testCaseBuffer,startBrowser,browser);
		}			
		else
			checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);			
	});
	
}

function clearBrowserEvents(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	try{clearTimeout(timeout1);}catch(e){}
	instrumentationEvents.removeAllListeners('websocketTimeout');
	instrumentationEvents.removeAllListeners('connectionClosed');
}
/*
instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
	try{browser.kill('SIGKILL')}catch(e){'Failed to kill with error:'+e}
	clearBrowserEvents()
	checkEventLog(config.previousTestCasesBuffer,startBrowser,browser);
})*/
var initialized=false;
instrumentationEvents.on('startClient',function(){
	if(!initialized){
		initialized=true
		console.log("Init")
		spawn("powershell.exe",["-Command",'(get-WmiObject win32_networkadapter |where { $_.name -like "*advanced-n*"}).disable()'])
		init(startBrowser)
		instrumentationEvents.removeAllListeners('websocketTimeout');
	}
})

instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',function(){console.log('TestCases without restart');restartBrowser()})
instrumentationEvents.emit('startClient')