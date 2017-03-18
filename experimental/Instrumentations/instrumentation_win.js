var spawn = require('child_process').spawn

var path=require('path')
var fs=require('fs')

var instrumentationPath="C:/NodeFuzz/instrumentation/"

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
module.exports = {

analyze: function(testCaseBuffer,callback, browser){ 
		checkEventLog(testCaseBuffer,callback,browser)
	}
}

function init(callback){
		var test=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
		test.stdout.on('data',function(data){LastCrashTime+=data;console.log('Last crash was on: '+LastCrashTime)})
		test.stdin.end()
		test.on('exit',function(){callback()})
}

function checkEventLog(testCaseBuffer,callback,browser){
	var newTime=''
	var test=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
		test.stdout.on('data',function(data){newTime+=data})
		test.stdin.end()
		test.on('exit',function(){
			if(LastCrashTime==newTime){
				browser.kill('SIGKILL')
				setTimeout(function(){var test2=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
					test2.stdout.on('data',function(data){if(data.length<5){LastCrashTime=data}})
					test2.stdin.end()
					test2.on('exit',function(){
						callback()
					})
				},1000)
			}
			else{
				LastCrashTime=newTime
				//console.log('Something fishy happened')
				var dir='C:\\'+process.env.HOMEPATH+'\\AppData\\Local\\Google\\CrashReports\\Chrome-last.dmp'
				var analyze=spawn('C:/Program Files/Debugging Tools for Windows (x64)/windbg.exe',[ '-c' ,"$<"+instrumentationPath+"/Helpers/WinDBG.txt",'-y','SRV*c:\\code\\mssymbols*http://msdl.microsoft.com/download/symbols;SRV*c:\\code\\chromsymbols*http://chromium-browser-symsrv.commondatastorage.googleapis.com' ,'-z' ,dir, '-logo' ,'../log-file.txt'])
				analyze.on('exit',function(){
					var filename=filterLogFile('../log-file.txt')
					if(filename=='breakpoint'){
						console.log('Just a breakpoint...')
						browser.kill('SIGKILL')
						
						var test2=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
						test2.stdout.on('data',function(data){LastCrashTime=data})
						test2.stdin.end()
						test2.on('exit',function(){
							callback()
						})
					}
					else if(filename=='null-pointer' || filename=='pain-in-the-ass'){
						console.log('Useless...')
						browser.kill('SIGKILL')
						
						var test2=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
						test2.stdout.on('data',function(data){LastCrashTime=data})
						test2.stdin.end()
						test2.on('exit',function(){
							callback()
						})
					}
					else{
						console.log(filename)
						browser.kill('SIGKILL')
						var test2=spawn('powershell',[instrumentationPath+'/Helpers/eventlog.ps1'])
						test2.stdout.on('data',function(data){LastCrashTime=data})
						test2.stdin.end()
						test2.on('exit',function(){
							write_repro(testCaseBuffer,filename,callback)
						})
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
}

browserStartRetryRound=0
browser={}
startBrowser = function(){
	console.log("Starting")
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
	}
	else{
		try{clearTimeout(timeoutBrowser);}catch(e){}
		browserStartRetryRound++
		if(browserStartRetryRound>=30){
			console.log('Waited long enough. Trying re-kill.')
			timeoutBrowser=setTimeout(startBrowser,1000)
			try{
				browser.kill('SIGKILL')
			}
			catch(e){'Failed to kill with error:'+e}
		}
		else
			timeoutBrowser=setTimeout(startBrowser,200)
	}
}

function restartBrowser(){
	console.log("Restart")
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.kill('SIGKILL')
}

function clearBrowserEvents(){
	console.log("clear")
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.removeAllListeners('exit');
}

instrumentationEvents.on('websocketTimeout',function(testCaseBuffer){
	//browser.kill('SIGKILL')
	console.log("timeout")	
	startBrowser()
})
instrumentationEvents.on('websocketClosed',function(testCaseBuffer){

	setTimeout(function(){
	console.log("socket closed")
	browser.kill('SIGKILL')	
	startBrowser()
	},500)
})
instrumentationEvents.on('startClient',function(){
	startBrowser()
})
instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)

