
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var os = require('os');

var Adb = require('./adb')

var buffer_last=false;
var rooted = false;
var started=false
config.location = '"ws://'+getLocalAddress() + ':' + config.port + '"'
var address = 'http://' + getLocalAddress() + ':' + config.port
var client_address = '';
process.argv.forEach(function(arg) {
	if (arg.indexOf('targetip=') != -1) {
		client_address = arg.split('=')[1];
		console.log("Client: " + client_address);
	}
	if (arg.indexOf('rooted') != -1) rooted = true;
})
var adb = new Adb({rooted: rooted});

adb.connect(client_address, function(status) {
	console.log("Connected to " + client_address);

	if (adb.startLogcat()) {
		console.log("Logcat started");
	}
});

function startBrowser(){
	started=true
	buffer_last = config.previousTestCasesBuffer[config.previousTestCasesBuffer.length - 1];
	console.log("Starting browser with address: " + address);
	adb.open(address,function(err){
		if (err) {
			console.error("Start Error: " + err);
		}
	});
}

function restartBrowser(url){
	var buffer_current = config.previousTestCasesBuffer[config.previousTestCasesBuffer.length - 1]
	if (!buffer_last) buffer_last = buffer_current;
	else if (buffer_last == buffer_current) url = address;
	buffer_last = buffer_current;

	adb.respawn(url, function(err) {
		if (err) { 
			console.error("Restart Error: " + err);
		}
	});
}

instrumentationEvents.on('websocketTimeout',restartBrowser)
instrumentationEvents.on('startClient',startBrowser)
//instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)
instrumentationEvents.on('exiting', adb.kill)


// Logcat
var log=''
var ADBlogging=false
var SEGVLine=''
adb.on('logcat out', function(data) {
	var temp=data.toString()
	var lines=temp.split('\n')
	if(started){
		lines.forEach(function(line,index){
			if(!line.match(/GC_(CONCURRENT|EXPLICIT)/)){	
				if(ADBlogging==false && line.indexOf('Chrome build fingerprint:')!=-1){
					ADBlogging=true;
					log+=line+'\n'
				}
				else if (ADBlogging==true && line.indexOf('Zygote')!=-1){
					ADBlogging=false
					if(log.indexOf('(SIGSEGV),')!=-1){
						write_repro(cloneArray(config.previousTestCasesBuffer),log)
					}else{
						console.log('Something weird happened')
						console.log(log)
					}
					log=''
				}
				else if(ADBlogging==true && line!='' && line.indexOf("WakeLockMgr")==-1 &&  line.indexOf("DownloadManager")==-1 &&  line.indexOf("AtivityManager")==-1){
					log+=line+'\n'
				}
				
			}
		})
	}
	//	if(log!='')
//	console.log(log)
	//log=''
	//logging=false
})
adb.on('logcat exit', function(data) {
	console.log("Logcat exited");
})


// Helpers
function getLocalAddress() {
	var interfaces = os.networkInterfaces();
	var wlan0 = interfaces.wlan0;
	var eth0 = interfaces.eth0;

	if (wlan0) {
		for (var key in wlan0) {
			var addr = wlan0[key];
			if (addr.family == "IPv4") return addr.address;
		}
	}
	return 'localhost';
}

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




function write_repro(reproFiles,log){
	if (!fs.existsSync(config.result_dir+'/folders/')) {
    mkdirsSync(config.result_dir+'/folders/')
	}

	fs.mkdir(config.result_dir,function(error, stdout, stderr){
		

		var reproname='adroid-SEGV-'+(new Date().getTime()) 
		var current_repro=reproFiles[0]
		console.log('Checking for file '+reproname+'.txt Status ')
		if(!fs.existsSync(config.result_dir+config.target+'-'+reproname+".txt")){

			var index=0
			mkdirsSync(config.result_dir+'/folders/'+config.target+'-'+reproname)
			while(reproFiles.length){
			
    			repro=reproFiles.pop();
    			index++
				fs.writeFile(config.result_dir+'/folders/'+config.target+'-'+reproname+'/'+config.target+'-'+reproname+index+'.'+config.filetype, repro, function(err) {
					if(err) {
						console.log(err);
					
					}
				}); 
			}
			console.log(config.result_dir+config.target+'-'+reproname+'.'+config.filetype)
			fs.writeFile(config.result_dir+config.target+'-'+reproname+'.'+config.filetype, current_repro, function(err) {
				if(err) {
					console.log(err);
					
				}
			}); 
			fs.writeFile(config.result_dir+'/folders/'+config.target+'-'+reproname+'/'+config.target+'-'+reproname+".txt", log, function(err) {
				fs.writeFile(config.result_dir+config.target+'-'+reproname+".txt", log, function(err) {
					if(err) {
					} else {
						console.log("The file was saved!");
					}
				}); 
			}); 
		}
	});
}

config.addCustomWebSocketHandler= function(wsServer){
	wsServer.on("request",function(request) {
	    connection = request.accept('fuzz-protocol', request.origin);
	    connection.on('message', function(message) {
	    	setTimeout(function(){
	    		adb.respawn(address, function(err) {
					if (err) { 
						console.error("Restart Error: " + err);
					}
				});
	    	},config.timeout*5)
		})
	})


}