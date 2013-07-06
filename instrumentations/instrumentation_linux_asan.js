
var disconnectTimeout={}
//
//
//Just a demo. This instrumentation works but I recommend you to write your own. :D
//
//

crashHandling=0;
var spawn=require('child_process').spawn
var exec = require('child_process').exec
var path = require('path');


var path=require('path')
var fs=require('fs')
var mkdirsSync = function (dirname, mode) {
  if (mode === undefined) mode = 0777 ^ process.umask();
  var pathsCreated = []
  var pathsFound = [];
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

function analyze(input,current,repro,callback){ 
	if(input.length<20){
		console.log('Not enough data...')
		crashHandling=0;asanlog='';
		callback()
	}else{
	console.log('Symbolizing')
	var asan_output=''
	var symbolizer=spawn('python', [config.asan_symbolize])
	symbolizer.stdout.on('data',function(data){asan_output+=data.toString()})
	symbolizer.stderr.on('data',function(data){console.log('Error Error:(filt) '+data)})
	symbolizer.stdin.write(input);
	symbolizer.stdin.end()
	symbolizer.on('exit',function(){filt_output(asan_output, current, repro,callback);});
	}
}

function ASAN_console_filter(input){	
	   var temp = input.toString();
           var lines = temp.split('\n');

           for(var i = 0;i<lines.length;i++) {
                if(lines[i].indexOf("ERROR: AddressSanitizer")>-1){
                	console.log('Browser: '+config.target)
					for(var j=i; j<i+4; j++){
						if(lines[j] !== undefined){
							console.log(lines[j]);		
						}	
					}
				break;			
				}
            }
}

function filt_output(input, current, repro,callback){
	var output=''
	console.log('Filting')
	var filt=spawn('c++filt')
	filt.stdout.on('data',function(data){output+=data.toString()})
	filt.stderr.on('data',function(data){console.log('Error Error:(filt) '+data)})
	filt.stdin.write(input);
	filt.stdin.end()
	filt.on('exit',function(){symbolized_asan_output=output; file_name_parse(output, current, repro,callback)});
	
}

function file_name_parse(data, current, repro,callback){
	console.log('parsing')
	try{
	var line_number=0;
	var file_name=''
	data=data.split('\n');
	var lines=data
	for(i=0; i<data.length; i++){
		if(data[i].indexOf('ERROR: AddressSanitizer')>-1){
			if(config.target=='chrome')
				file_name+=data[i].split(' ')[2]+'-'
			else
				file_name+=data[i].split(' ')[3]+'-'
		}
		if(data[i].indexOf('#0 ')>-1){
		line_number=i;
		break;
		}

		
	}
	if(data[line_number].indexOf(' ?? ') > -1){
		line_number++;
	}
	data=data[line_number]
	data=data.split('(')[0]
	data=data.replace(/[^a-zA-Z 0-9]+/g,'');
	data=data.replace(/^\s+|\s+$/g, '');
	data=data.split(' ')

	file_name+=data[3];
	if(file_name.indexOf('void')> -1){	
		file_name=data[4];
	}
	if(file_name==''){
		var test=new Date()
		file_name=test.getTime()

	}
	write_repro(current, repro, file_name,callback)
	

	}
	catch(e){
		console.log('Failed to parse file_name: '+e);
		var test=new Date()
		file_name=test.getTime()
		write_repro(current, repro, file_name,callback)
	}

}

function write_repro(current_repro, repro_file, file_name,callback){

	if(file_name=='undefined'){
		crashHandling=0;asanlog='';
		callback()
	}
	else{
	var path = require('path');
	if (!fs.existsSync(config.result_dir+'/folders/')) {
    mkdirsSync(config.result_dir+'/folders/')
	}

	fs.mkdir(config.result_dir,function(error, stdout, stderr){

		var reproname=file_name
		if(!fs.existsSync(config.result_dir+config.target+'-'+reproname+".txt")){

			var index=0
			mkdirsSync(config.result_dir+'/folders/'+config.target+'-'+reproname)
			while(repro_file.length){
			
    			repro=repro_file.pop();
    			index++
				fs.writeFile(config.result_dir+'/folders/'+config.target+'-'+reproname+'/'+config.target+'-'+reproname+index+'.'+config.filetype, repro, function(err) {
					if(err) {
						console.log(err);
					
					}
				}); 
			}
			fs.writeFile(config.result_dir+config.target+'-'+reproname+'.'+config.filetype, current_repro, function(err) {
				if(err) {
					console.log(err);
					
				}
			}); 
			fs.writeFile(config.result_dir+'/folders/'+config.target+'-'+reproname+'/'+config.target+'-'+reproname+".txt", symbolized_asan_output, function(err) {
				fs.writeFile(config.result_dir+config.target+'-'+reproname+".txt", symbolized_asan_output, function(err) {
					if(err) {
						console.log(err);
						callback()
					} else {
						ASAN_console_filter(symbolized_asan_output);
						console.log("The file "+config.target+'-'+reproname+" was saved!");
		
						callback()
					}
				}); 
			}); 
		}
		else{
			callback()
		}
	});


}}

var browserStartRetryRound=0
var browser={}
var asanlog=''
var startBrowser = function(){
		if(browser._closesNeeded==browser._closesGot || browserStartRetryRound > 30){
			try{clearTimeout(timeoutBrowser);}catch(e){}
			setInstrumentationEvents()		
			browserStartRetryRound=0
			browser = spawn(config.launchCommand, config.browserArgs)
			browser.stderr.on('data',function(data){
				if(asanlog.length>0){
					asanlog+=data.toString()
				}
				else if((data.toString()).indexOf("ERROR: AddressSanitizer")>-1){
					browser.removeAllListeners('exit');
					clearInstrumentationEvents()
					asanlog+=data.toString() 
					setTimeout(function(){
							if(asanlog.indexOf("ERROR: AddressSanitizer")>-1 && (asanlog.indexOf("address 0x00000000") == -1 || asanlog.indexOf("pc 0x00000000") > -1 ) && asanlog.indexOf("address 0x0000bbadbeef") == -1 && asanlog.indexOf("cpy-param-overlap") == -1){		
								analyze(asanlog,config.previousTestCasesBuffer[0],cloneArray(config.previousTestCasesBuffer),startBrowser);	
								browser.kill()
							}
							else{
								browser.kill()
								startBrowser()
							}
							asanlog=''
					},350)
				}	
			})	
			browser.on('exit',function(){
				asanlog=''
				clearInstrumentationEvents()
				startBrowser()					
			})
			browser.on('err',function(e){
				console.log('Failed to start browser with error: '+e)
			})
		}
		else{
			try{clearTimeout(timeoutBrowser);}catch(e){}
			browserStartRetryRound++
			if(browserStartRetryRound>=30){
				browser.removeAllListeners('exit');
				asanlog=''
				console.log(process.pid+': Waited long enough. Trying re-kill browser pid: '+browser.pid)
				try{
					browser.kill('SIGKILL')		
				}
				catch(e){console.log('Failed to kill with error:'+e)}
				browser={}
				startBrowser()
			}
			else
				timeoutBrowser=setTimeout(startBrowser,200)
		}
	

}

function restartBrowser(){
	browser.kill('SIGKILL')
}

function clearBrowserEvents(){
	browser.removeAllListeners('exit');
}

function handleFeedback(data){
	console.log(data)
}

function clearInstrumentationEvents(){
	instrumentationEvents.removeListener('websocketTimeout',restartBrowser)
	instrumentationEvents.removeListener('exiting',clearBrowserEvents)
	instrumentationEvents.removeListener('testCasesWithoutRestartLimit',restartBrowser)
	instrumentationEvents.removeListener('feedbackMessage',handleFeedback)
	instrumentationEvents.removeListener('websocketDisconnected',restartBrowser)
}

function setInstrumentationEvents(){
	instrumentationEvents.on('websocketTimeout',restartBrowser)	
	instrumentationEvents.on('exiting',clearBrowserEvents)
	instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)
	instrumentationEvents.on('feedbackMessage',handleFeedback)
	instrumentationEvents.on('websocketDisconnected',restartBrowser)
}

instrumentationEvents.on('startClient',startBrowser)
