#!/usr/bin/env node

if(process.argv.indexOf('help')!=-1 || process.argv.indexOf('-help')!=-1 || process.argv.indexOf('--help')!=-1){	
	console.log('NodeFuzz v0.1.5')
	console.log('Check config.js for about everything.')
	console.log('-m | --module           - "ModulePath" where to load modules. (Note: can be file or folder)')
	console.log('-c | --config           - Configuration-file path. (Note: Configuration-file must export config-object)')
	console.log('-i | --instrumentation  - Instrumentation-module path.')
	console.log('-n |                    - Name of the nodefuzz instance when reporting to grinder')
	console.log('-b |                    - Browser, either "chrome" or "firefox"')
	console.log('NodeFuzz is tested to work on nodejs 0.10.8')
	process.exit(1)
}

//
//instrumentationEvents is global EventEmitter for events from NodeFuzz-core to instrumentation modules.
//
var events = require('events');
instrumentationEvents = new events.EventEmitter();
var fs=require('fs')

//
//Require for config and its init. (Note: config is required into global object so it can be used in 
//communication between modules without separate requires.)
//
if(process.argv.indexOf('-c')!=-1 || process.argv.indexOf('--config')!=-1){
	try{
		console.log('Loading config-file: ')
		if(process.argv.indexOf('-c')!=-1){
			console.log(process.argv[process.argv.indexOf('-c')+1])			
			config=require(process.argv[process.argv.indexOf('-c')+1])
		}
		else{
			console.log(process.argv[process.argv.indexOf('--config')+1])			
			config=require(process.argv[process.argv.indexOf('--config')+1])
		}
	}
	catch(e){
		console.log('Error while loading given configuration-file.\n'+e)
		process.exit(1)
	}
}
else{
	console.log('Loading default configuration-file:\n./config.js')
	try{
		config=require('./config.js')
	}
	catch(e){
		console.log("Error: "+e+"\nI can't survive without configuration...")
		process.exit(1)
	}
}

//
// GRINDER
// Support for setting config.target
//
if( process.argv.indexOf('-b') != -1 ){
    try{
	if(process.argv.indexOf('-b')!=-1){
	    console.log("browser: " + process.argv[process.argv.indexOf('-b')+1]);
	    config.target = process.argv[process.argv.indexOf('-b')+1];
	}
    }
    catch(e){
	console.log('Error setting config.target: ' + e)
    }
}
else {
    // default to chrome
    config.target = 'chrome';
}
//
// GRINDER
// Support for fuzzer name to log to grinder
//
var os = require("os");
if( process.argv.indexOf('-n') != -1 ){
    try{
	if(process.argv.indexOf('-n')!=-1){
	    config.fuzzer_num = process.argv[process.argv.indexOf('-n')+1];
	    config.fuzzer_name = os.hostname() + " [" + config.target + "_" + config.fuzzer_num + "]";
	    console.log('Fuzzer name: ' + config.fuzzer_name);
	}
    }
    catch(e){
	console.log('Error setting fuzzer name: ' + e)
    }
}
else {
    config.fuzzer_name = os.hostname();
}
// END OF GRINDER SUPPORT
//


if(config.hasOwnProperty('init'))
	config.init()
else
	console.log('config.js had no property init.')

if(process.argv.indexOf('-i')!=-1 || process.argv.indexOf('--instrumentation')!=-1 ){
	try{
		console.log('Loading instrumentation-module: ')
		if(process.argv.indexOf('-i')!=-1){
			console.log(process.argv[process.argv.indexOf('-i')+1])			
			config.instrumentation=require(process.argv[process.argv.indexOf('-i')+1])
		}
		else{
			console.log(process.argv[process.argv.indexOf('--instrumentation')+1])			
			config.instrumentation=require(process.argv[process.argv.indexOf('--instrumentation')+1])
		}
	}
	catch(e){
		console.log('Error while loading given instrumentation-file.\n'+e)
	//	process.exit(1)
	}	
}
else{
	console.log('Loading default instrumentation-module:')
	if(config.defaultInstrumentationFile===undefined){
		console.log('No default instrumentation-module defined. Check configuration for config.defaultInstrumentationFile')
		//process.exit(1)
	}
	console.log(config.defaultInstrumentationFile)
	try{
		config.instrumentation=require(config.defaultInstrumentationFile)
	}
	catch(e){
		console.log('Error: '+e+'\n')
		console.log('No instrumentation-module is loaded.')
	}
}



//
//ModuleLoader for modules used as testcase generators.
//
var moduleLoader=require('./moduleLoader.js')
var fuzzModules=moduleLoader.loadModules()

var testCaseBuffer=[]
var previousTestCasesBuffer=config.previousTestCasesBuffer
var httpRootDirSet

function cloneArray(obj){
        var copy = [];
        for (var i = 0; i < obj.length; ++i) {
            copy[i] = obj[i];
        }
        return copy;
}

//
//HTTP-server.
//
//HTTP-server listens to port specified by config.port
//
//When requested HTTP-server will respond to client with the content specified in config.clientFile
//
//TODO: Allow HTTP-server to respond with other files also.(NOTE: poor implementation done.)
//

if(config.hasOwnProperty('httpRootDir')){
	try{
		if(fs.statSync(config.httpRootDir).isDirectory()){
		var httpRootDirFiles=fs.readdirSync(config.httpRootDir);
		httpRootDirSet=true
		}
	}
	catch(e){"Loading http rootdir failed "+e}
}


var http = require('http');
var websocketConnected=false
var server = http.createServer(function(request, response) {
	if(!websocketConnected){
		if(request.url!='/favicon.ico'){
			response.writeHead(200);
		    response.write(config.clientFile)
		    response.end();
		}
		else{
			response.writeHead(404);
			response.end();
		}
	}
	else{
		if(httpRootDirSet!==undefined && (httpRootDirFiles.indexOf(request.url.trim().slice(1))!=-1)){
			console.log(request.url)
			response.writeHead(200)
			var responseFile=fs.readFileSync(config.httpRootDir+request.url.trim().slice(1))
			response.end(responseFile)
		}
		else{
			response.writeHead(404);
			response.end();
		}
	}

});

server.listen(config.port, function(err) {
		console.log('Server listening port '+config.port)
});

//WebSocket inits.
try{
var WebSocketServer = require('websocket').server;
}catch(e){
	console.log('Failed to load websocket module. Run "npm install websocket" and try again.')
	console.log('Exiting...')
	process.exit(1)
}

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

if(config.addCustomWebSocketHandler)
	config.addCustomWebSocketHandler(wsServer)
//
//WebSocket server connection handler.
//
//Variables
//testCaseCounter: 	Counts testcases done without client restart. 
//sending: 			Tracks if testcase sending is already ongoing. Used to prevent errors because of multiple simultaneous requests. 
//
//Events
//testCasesWithoutRestartLimit: Triggered if amount of testcases without restart reaches config.testCasesWithoutRestart value.
//websocketTimeout:  			Triggered if client fails to request new testcase within time defined by config.timeout.
//websocketDisconnected: 		Triggered when the WebSocket-connection is disconnected
//
if(config.disableDefaultWsOnRequest!==true){								
	var testCaseCounter=0
	var sending=false
	wsServer.on('request', function(request) {
		websocketConnected=true
		if(request.requestedProtocols !== null && request.requestedProtocols[0] == 'fuzz-protocol'){
		    connection = request.accept('fuzz-protocol', request.origin);
		    connection.on('message', function(message) {
		    		if(!sending){
			    		sending=true
			    		testCaseCounter++
						try{clearTimeout(timeoutGetNewTestcase);}catch(e){}
			    	if(testCaseCounter > config.testCasesWithoutRestart){
			    		sending=false
						testCaseCounter=0
						instrumentationEvents.emit('testCasesWithoutRestartLimit')
			    	}
			    	else{
			    		timeoutGetNewTestcase=setTimeout(function(){
							sending=false
							testCaseCounter=0
							instrumentationEvents.emit('websocketTimeout')
						},config.timeout);
			    		
			    		sendNewTestCase(connection)
			    	}
		    	}
			})
		}
		else if(request.requestedProtocols !== null && request.requestedProtocols[0] == 'feedback-protocol'){
			feedbackConnection = request.accept('feedback-protocol', request.origin);
	    	feedbackConnection.on('message', function(message) {
		    		instrumentationEvents.emit('feedbackMessage',message.utf8Data)
			})
		}


	})
	wsServer.on('close',function(){
		websocketConnected=false
		testCaseCounter=0
		setTimeout(function(){instrumentationEvents.emit('websocketDisconnected')},500)
	})
}
//
//Helper function to get random element from array.
//
function ra(a) {
	return a[Math.floor(a.length*Math.random())]
}

//
//sendNewTestCase(connection)
//connection: WebSocket connection
//
//This function handles testcases and testcase sending to WebSocket. 
//
//Function holds few testcases in the testCaseBuffer variable to minimize the latency from modules used as
//testcase generators.
//
//Modules used as testcase generators are taken randomly from modules loaded into variable fuzzModules by moduleLoader.js
//
//This funtion also updates previousTestCasesBuffer which holds n previous testcases where n is defined by variable config.buffer
//
//If generator module returns empty string then this function will call itself with 20ms setTimeout. This feature
//can be used to poll generator modules that need more time to do stuff.
//
function sendNewTestCase(connection){

	// GRINDER support
	// update the variable to keep track of the current testcases per minute
	update_testcase_counter();
	//

	var currentTestCase
	if(!config.disableTestCaseBuffer){
		if(testCaseBuffer.length==0){
			process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
			process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
			currentTestCase=(ra(fuzzModules).fuzz())
		}
		else if(testCaseBuffer.length>=4){
			currentTestCase=testCaseBuffer.pop()	
		}
		else{
			process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
			process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
			currentTestCase=testCaseBuffer.pop()
		}
	}
	else{
		currentTestCase=(ra(fuzzModules).fuzz())
	}
	if(currentTestCase!==undefined && currentTestCase!=''){
		
		if(previousTestCasesBuffer.unshift(currentTestCase)>config.bufferSize){
			previousTestCasesBuffer.pop();
		}
		
		if(currentTestCase instanceof Buffer){
			connection.sendBytes(currentTestCase);
   		}
    	else{
    		var test=new Buffer(currentTestCase)
    		connection.sendBytes(test)
    	}
    	sending=false
	}
	else{
		setTimeout(function(){
			sendNewTestCase(connection)
		},50)
	}
}

//
// GRINDER
// Support for logging and reporting to grinder
//
var testcases_per_minute = 0;
var testcases_counter = 0;
var testcases_counter_old = 0;
function update_testcase_counter(){
	testcases_counter = testcases_counter + 1;
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
// every minute post an update to grinder with the current speed
setInterval(update_grinder, 60000);
function update_grinder(){
	try{
		testcases_per_minute = testcases_counter - testcases_counter_old;
		testcases_counter_old = testcases_counter;
		time = time_format();
		body = "action=update_job_status&node="+config.fuzzer_name+"&tcpm="+testcases_per_minute+"&key="+config.grinder_key+"&time=";
		body = encodeURI(body);
		body = body + time;
		XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
		req = new XMLHttpRequest();
		req.open("POST",config.grinder_server + "/status.php",true);
		req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		req.send(body);
		console.log("update_grinder: test cases per minute: " + testcases_per_minute);
	} catch(e){
		console.error("Grinder update_grinder error: " + e);
	}
}
// END OF GRINDER SUPPORT
//


instrumentationEvents.emit('startClient')
