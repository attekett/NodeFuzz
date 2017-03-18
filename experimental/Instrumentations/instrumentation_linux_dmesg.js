

//
//
//Just a demo. This instrumentation works but I recommend you to write your own. :D
//
//


var spawn=require('child_process').spawn
var exec = require('child_process').exec
var path = require('path');


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


var log=''
var previousLine=''

function checkDmesg(init){
	if(init===undefined)
		init=false
	var log=''
	var dmesg=spawn('dmesg',['-t'])
	dmesg.stdout.on('data',function(data){
		log+=data
	})
	dmesg.stdin.end()

	dmesg.on('exit',function(){
		setTimeout(function(){
		var filename=''
		if(log.indexOf(config.target)>-1){
			var lines=log.split('\n')
			for(x=lines.length-1; x>0; x--){
				if(lines[x].indexOf(config.target)!=-1){
					if(lines[x]!=previousLine){
						previousLine=lines[x]
						filename=parseDmesgMessage(lines[x])
					}		
					break
				}
			}
			if(filename!='' && !init)
				saveFiles(filename)
			else if(!init)
				startBrowser()
		}
		else
			startBrowser()
		},300)
	})

}
function parseDmesgMessage(line){
	var filename=config.target
	try{
	if(line.indexOf('segfault')!=-1){
		var words=line.split(' ')
		var ip=words[words.indexOf('ip')+1]
		filename+='-segfault-'+words[words.indexOf('at')+1]+'-ip-'+ip.slice(ip.length-3,ip.length)
		return filename	
	}
	else if(line.indexOf('trap divide error')!=-1){
	    var words=line.split(' ')
	    var ip=words[words.indexOf('error')+1]
	    filename+='-trap-div-ip-'+ip.slice(ip.length-3,ip.length)
	    return filename 
	}
	else{
		//TODO: Add handler for other types of crash than segfault
		console.log('Unknown message for parsing: '+line)
		console.log('Fallback: timestamp')
		return filename+'-'+(new Date().getTime())
	}}
	catch(e){
		console.log('Unknown error '+e+' for parsing: '+line)
		console.log('Fallback: timestamp')
		return filename+'-'+(new Date().getTime())
	}
}

function saveFiles(filename){

	if (!fs.existsSync(config.result_dir+'/folders/'))
    	mkdirsSync(config.result_dir+'/folders/')
	
	fs.mkdir(config.result_dir,function(error, stdout, stderr){
		if(!fs.existsSync(config.result_dir+filename+'.'+config.filetype)){
			var status=fs.existsSync(config.result_dir+filename+'.'+config.filetype)? 'Exists':"Doesn't exist"
			console.log('Checking for file '+filename+'.'+config.filetype+'. Status: '+status)
			var currentTestCase=config.previousTestCasesBuffer[0]
			var index=0
			var time=new Date().getTime()
			mkdirsSync(config.result_dir+'/folders/'+time)
			while(config.previousTestCasesBuffer.length){
    			repro=config.previousTestCasesBuffer.pop();
    			index++
				fs.writeFileSync(config.result_dir+'/folders/'+time+'/'+filename+'-'+index+'.'+config.filetype, repro); 
			}
			fs.writeFileSync(config.result_dir+filename+'.'+config.filetype, currentTestCase); 
		}
		startBrowser()
	});
}

browserStartRetryRound=0
browser={}
var startBrowser = function(){
	if(browser._closesNeeded==browser._closesGot || browserStartRetryRound > 30){
		try{
			browser.removeAllListeners('exit');
			browser.kill('SIGKILL')
		}
		catch(e){}
		try{clearTimeout(timeoutBrowser);}catch(e){}
		browserStartRetryRound=0
		browser = spawn(config.launch_command, config.browser_args)	
		browser.on('exit',function(){
			checkDmesg()
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
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.kill('SIGKILL')
}

function clearBrowserEvents(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.removeAllListeners('exit');
	browser.kill('SIGKILL')
}

instrumentationEvents.on('websocketTimeout',restartBrowser)
instrumentationEvents.on('startClient',startBrowser)
instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)
