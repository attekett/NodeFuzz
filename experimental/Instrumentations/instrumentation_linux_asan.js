
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

function analyze(input,current,repro,callback){ 
	if(input.length<20){
		console.log('Not enough data...')
		crashHandling=0;asanlog='';
		callback()
	}else{
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
	var filt=spawn('c++filt')
	filt.stdout.on('data',function(data){output+=data.toString()})
	filt.stderr.on('data',function(data){console.log('Error Error:(filt) '+data)})
	filt.stdin.write(input);
	filt.stdin.end()
	filt.on('exit',function(){symbolized_asan_output=output; file_name_parse(output, current, repro,callback)});
	
}
function file_name_parse(data, current, repro,callback){
	try{
	var line_number=0;
	var file_name=''
	data=data.split('\n');
	var lines=data
	for(i=0; i<data.length; i++){
		if(data[i].indexOf('ERROR: AddressSanitizer')>-1){
				file_name+=data[i].split(' ')[2]+'-'
		}
		if(data[i].indexOf('#0 ')>-1){
		line_number=i;
		break;
		}

		
	}
	if(data[line_number].indexOf(' ?? ') > -1){
		line_number++;
	}
	//WTF::StringImpl::findIgnoringCase
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
	//output_stuff()

}

function output_stuff(){
	console.log(file_name)
	console.log(symbolized_asan_output)
}
/*
function append_pc(lines, current, repro, file_name,callback){
	try{
	var parse_line
	for(i=0; i<lines.length; i++){
		if(lines[i].indexOf('ERROR: AddressSanitizer')>-1){
		parse_line=lines[i]
		break;
		}
		
	}
	if( parse_line.indexOf("0007 (pc 0x000000425")==-1){
	var pc=parse_line.substr(parse_line.indexOf('pc '),20)
	pc=pc.split(' ')
	pc=pc[1].substr(pc[1].length-3,3)
	file_name+='-'+pc;
	write_repro(current, repro, file_name,callback)
	}
	else{
		crashHandling=0;asanlog='';
		callback()
	}
	}
	catch(e){
		console.log('Failed to parse PC. With error: ' +e+' From content: '+ lines); 
		write_repro(current, repro,  file_name,callback)
	}
}
*/
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
		//console.log('Checking for file '+reproname+'.txt Status ')
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
						crashHandling=0;asanlog='';
						callback()
					} else {
						ASAN_console_filter(symbolized_asan_output);
						console.log("The file "+config.target+'-'+reproname+" was saved!");
						crashHandling=0;asanlog='';
						callback()
					}
				}); 
			}); 
		}
		else{
			crashHandling=0;asanlog='';
			callback()
		}
	});


}}


deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
	files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.existsSync(curPath)){
            	if(fs.statSync(curPath).isDirectory()) { // recurse
                	deleteFolderRecursive(curPath);
            	} else { // delete file
                	fs.unlinkSync(curPath);
            	}
        	}
        });
        try{
        fs.rmdirSync(path);
    	}
    	catch(e){exec('rm -rf '+path,function(err){if(err !== null){console.log(err)}});}
    }
};

browserStartRetryRound=0
browser={}
var uberFailSafe={}
var startBrowser = function(){
	
		if(browser._closesNeeded==browser._closesGot || browserStartRetryRound > 30){
			try{clearTimeout(uberFailSafe)}catch(e){}
			uberFailSafe=setTimeout(function(){browser.kill()},300000)		
			try{
				browser.removeAllListeners('exit');
				browser.kill()
			}
			catch(e){}
			try{clearTimeout(timeoutBrowser);
				clearTimeout(disconnectTimeout)
			}catch(e){}
			browserStartRetryRound=0
			if(config.target=='firefox'){
					deleteFolderRecursive('/tmp/'+config.pid+'/.mozilla')
					deleteFolderRecursive('/tmp/'+config.pid+'/.cache')
			}
			exited=false
			browser = spawn(config.launch_command, config.browser_args)
			browser.stderr.on('data',function(data){
				if(crashHandling==1){
					asanlog+=data.toString()
				}
				else if((data.toString()).indexOf("ERROR: AddressSanitizer")>-1 && crashHandling==0){
					try{clearTimeout(timeoutGetNewTestcase)
						clearTimeout(disconnectTimeout)
					}catch(e){}
					asanlog='';
					asanlog+=data.toString() 
					crashHandling=1;
					setTimeout(function(){
					if(browser.killed==false)
						browser.kill('SIGKILL');
					},350)
				}	
			})	
			browser.on('exit',function(){
				exited=true;
				if(process.platform!='win32'){
					try{clearTimeout(timeoutGetNewTestcase)}catch(e){}
	    				if(crashHandling){
							if(asanlog.indexOf("ERROR: AddressSanitizer")>-1 && (asanlog.indexOf("address 0x00000000") == -1 || asanlog.indexOf("pc 0x00000000") > -1 ) && asanlog.indexOf("address 0x0000bbadbeef") == -1 && asanlog.indexOf("unknown address 0x0000977537dd") == -1 && asanlog.indexOf("cpy-param-overlap") == -1){		

								analyze(asanlog,config.previousTestCasesBuffer[0],cloneArray(config.previousTestCasesBuffer),startBrowser);
								asanlog='';
								crashHandling=0;
										
							}
							else{
								crashHandling=0;
								asanlog=''
								startBrowser()
							}
	    				}
	    				else{
	    					crashHandling=0;
	    					asanlog=''
	    					startBrowser()
	    				}
				}
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
					browser.kill()
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
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.kill()
	if(exited)
		startBrowser()
}

function clearBrowserEvents(){
	try{clearTimeout(timeoutBrowser);}catch(e){}
	browser.removeAllListeners('exit');
}

function handleFeedback(data){
	console.log(data)
}


instrumentationEvents.on('websocketTimeout',restartBrowser)
instrumentationEvents.on('startClient',startBrowser)
instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)
instrumentationEvents.on('feedbackMessage',handleFeedback)
