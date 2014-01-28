var disconnectTimeout={}
//
//External contribution by Ryan Baxendale
//
//Run "npm install buffer-crc32" and "npm install xmlhttprequest" in the NodeFuzz root folder
//to install the required module for reporting to Grinder.
//
//

crashHandling=0;
var spawn = require('child_process').spawn
var exec = require('child_process').exec
var path = require('path');
var fs = require('fs')
var crc32 = require('buffer-crc32');

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
		// decide what to do with the output of a crash
		if( config.no_symbolize ){
		    console.log("Not symbolizing ASAN output");

		    crash_name = "";
		    input = input.split('\n');
		    for(i=0; i<input.length; i++){
			if( input[i].indexOf('ERROR: AddressSanitizer')>-1 ){
			    //console.log("DEBUG line: [" + input[i] + "]");
			    // ERROR: AddressSanitizer: heap-use-after-free on address 0x7fffe82a3ef0
			    // ERROR: AddressSanitizer: SEGV on unknown address 0x00009f7537dd
			    crash_name = input[i].split(' ')[2];
			    // heap-use-after-free
			    //console.log("DEBUG crash_name: [" + crash_name + "]" );
			}
			if( input[i].indexOf('#0 ')>-1 ){
			    //console.log("DEBUG line: [" + input[i] + "]");
			    // #0 0x555559535186 (/home/user/asan-symbolized-linux-release-167422/chrome+0x3fe1186)
			    crash_loc = input[i].substring( input[i].indexOf('(')+1, input[i].indexOf(')') );
			    // /home/user/asan-symbolized-linux-release-167422/chrome+0x3fe1186
			    crash_loc = crash_loc.substring( crash_loc.lastIndexOf("/", crash_loc.lastIndexOf("/")-1) +1 );
			    // asan-symbolized-linux-release-167422/chrome+0x3fe1186
			    //console.log("DEBUG crash_loc: [" + crash_loc + "]");
	
			    crash_name += "_" + crash_loc.replace("/", "_").replace("+", "_");
	
			    // break out of for loop so we only look at the first line containing "#0 "
			    break;
			}
		    }
		    console.log("crash_name: [" + crash_name + "]");
	
		    // need to set symbolized_asan_output globally so write_repro() can write it to a file and for report_grinder()
		    symbolized_asan_output = "";
		    for(i=0; i<input.length; i++){
			symbolized_asan_output += input[i].toString() + "\n";
		    }
		    //console.log("DEBUG report_grinder typeof symbolized_asan_output: [" + typeof symbolized_asan_output + "]");
		    write_repro(current, repro, crash_name, callback);
		    // write_repro will call report_grinder then return to callback which is startBrowser()
		} else {
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
						report_grinder(symbolized_asan_output, repro_file, reproname);
						callback()
					}
				}); 
			}); 
		}
		else{
			report_grinder(symbolized_asan_output, repro_file, reproname);
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
							if(asanlog.indexOf("ERROR: AddressSanitizer")>-1 ){
//&& (asanlog.indexOf("address 0x00000000") == -1 || asanlog.indexOf("pc 0x00000000") > -1 ) && asanlog.indexOf("address 0x0000bbadbeef") == -1 && asanlog.indexOf("cpy-param-overlap") == -1){		
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

//
// GRINDER support
//
// post crash details to grinder
function time_format(){
    function pad(n){return n<10 ? '0'+n : n}
    d = new Date();
    return d.getFullYear()+'-'
    + pad(d.getMonth()+1)+'-'
    + pad(d.getDate())+'+'
    + pad(d.getHours())+'%3A'
    + pad(d.getMinutes())+'%3A'
    + pad(d.getSeconds())
}

function hash_getname(line){
    try{
	//console.log("hash_getname input: [" + line + "]");

	// if config.no_symbolize=true then there wont be a " in " to indicate the function etc
	// instead just hash the addresses after the "+"
	if( line.indexOf(" in ") == -1 ){
	    output = line.substring( line.lastIndexOf("+")+1, line.lastIndexOf(")") );
	    return output;
	}
	else {
	    start_str = " in ";
	    start = line.indexOf(start_str) + start_str.length;
	    end = line.indexOf(" ", start );
	    if( start != -1 && end != -1){
		output = line.substring(start, end);
		return output;
	    }
	    else {
	    // could not find the data to has so return null so it will still be recorded in grinder
		return "000000";
	    }
	}
    } catch(e){
	console.log(e)
    }
}

function report_grinder(symbolized_asan_output, repro_file, reproname){
    try{
	console.log("Posting crash to grinder");

	//console.log("DEBUG report_grinder input reproname : [" + reproname + "]");
	var os = require("os");
	node = os.hostname();
	//console.log("DEBUG report_grinder node: [" + node + "]");
	time = time_format();
	//console.log("DEBUG report_grinder time: [" + time + "]");

	crash_data = new Buffer(symbolized_asan_output).toString('base64');
	crash_data = crash_data.replace(/\+/g, '-');
	crash_data = crash_data.replace(/\//g, '_');
	crash_data = crash_data.replace(/=/g, ',');
	crash_data = crash_data.replace(/\n/g, '');
	//console.log("DEBUG report_grinder crash_data: [" + crash_data + "]");

	repro = repro_file[0];

	// huge crash file console.log("DEBUG report_grinder input repro_file: [" + repro_file + "]");
	// huge crash file console.log("DEBUG report_grinder repro: [" + repro + "]");

	log_data = new Buffer(repro).toString('base64');
	log_data = log_data.replace(/\+/g, '-');
	log_data = log_data.replace(/\//g, '_');
	log_data = log_data.replace(/=/g, ',');
	log_data = log_data.replace(/\n/g, '');
	//console.log("DEBUG report_grinder log_data: [" + log_data + "]");

	// write something here to find out your fuzzer name or just hardcode it and not care
	fuzzername = "unknown"

	// crc32 the name of the function that is crashed on
	// hash_quick is the function that crashed
	// hash_full is the last 5 functions
	asan_array = symbolized_asan_output.split("\n");
	hash_quick = "";
	hash_full = "";
	for(var i=0; i < asan_array.length; i++){
	    line = asan_array[i];
	    if( line.indexOf(" #0 ")>-1 || line.indexOf(" #1 ")>-1 || line.indexOf(" #2 ")>-1 || line.indexOf(" #3 ")>-1 || line.indexOf(" #4 ")>-1){
		hash_line = hash_getname(line);
		//console.log("hash_getname output: [" + hash_line + "]" );
		if( hash_line.length > 0 ){
		    hash_full = crc32( hash_line, hash_full);
		    //console.log("hash_full: " + hash_full.toString('hex'));
		}
	    }
	}
	hash_quick = crc32( reproname );

	//if the hash failed for some reason then set it to 000000.000000
	if( hash_quick == undefined ){
	    hash_quick = "00000000";
	}
	if( hash_full == undefined ){
	    hash_full = "00000000";
	}

	//console.log("report_grinder reproname: [" + reproname + "]");
	console.log("report_grinder hash_quick: [" + hash_quick.toString('hex') + "]");
	console.log("report_grinder hash_full: [" + hash_full.toString('hex') + "]");

	// now set hash_full as the %08X hex format
	hash_quick = hash_quick.toString('hex');
	hash_full = hash_full.toString('hex');

	body = "action=add_crash&key="+config.grinder_key+"&node="+node+"&browser="+config.target+"&type="+reproname+"&fuzzer="+fuzzername+"&hash_quick="+hash_quick+"&hash_full="+hash_full;
	//console.log("DEBUG body: [" + body + "]");
	body = encodeURI(body);
	//console.log("DEBUG body encoded: [" + body + "]");
	// dont url encode the time, crash_data, or log_data
	body = body + "&time="+time + "&crash_data="+crash_data + "&log_data="+log_data;
	//console.log("DEBUG body encoded with time etc: [" + body + "]");

	XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	req = new XMLHttpRequest();
	req.open("POST", config.grinder_server + "/status.php",true);
	req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	req.send(body);

	grinder_log_file = config.result_dir+config.target+'-'+reproname+'_grinder.txt';
	grinder_log_data = "action=add_crash\nkey="+config.grinder_key+"\nnode="+node+"\nbrowser="+config.target+"\ntype="+reproname+"\nfuzzer="+fuzzername+"\nhash_quick="+hash_quick+"\nhash_full="+hash_full+"\ntime="+time+"\ncrash_data="+crash_data+"\nlog_data="+log_data+"\n";

	console.log("writing grinder crash request to file: " + grinder_log_file);

	fs.writeFile(grinder_log_file, grinder_log_data, function(err) {
	    if(err) {
		console.log("error writing grinder log file: " + err);
	    }
	});

	console.log("Done posting crash to grinder");
    } catch(e){
	console.error(e);
    }
}

// Support for reporting speed to console
var testcases_counter_old = 0;
setInterval(report_fuzzing_speed, 60000);
function report_fuzzing_speed(){
    testcases_per_minute = config.speedCounter - testcases_counter_old;
    testcases_counter_old = config.speedCounter;
    console.log("Test cases per minute: " + testcases_per_minute);
    update_grinder(testcases_per_minute);
}

function time_format(){
    function pad(n){return n<10 ? '0'+n : n}
    var d = new Date();
    return d.getFullYear()+'-'
	+ pad(d.getMonth()+1)+'-'
	+ pad(d.getDate())+'+'
	+ pad(d.getHours())+'%3A'
	+ pad(d.getMinutes())+'%3A'
	+ pad(d.getSeconds())
}

function update_grinder(testcases_per_minute){
    try{
	time = time_format();
	var os = require("os");
	body = "action=update_job_status&node="+os.hostname()+"&tcpm="+testcases_per_minute+"&key="+config.grinder_key+"&time=";
	body = encodeURI(body);
	body = body + time;
	XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	req = new XMLHttpRequest();
	req.open("POST",config.grinder_server + "/status.php",true);
	req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	req.send(body);
    } catch(e){
	console.error("Grinder update_grinder error: " + e);
    }
}
//
// END of GRINDER support

instrumentationEvents.on('startClient',startBrowser)
