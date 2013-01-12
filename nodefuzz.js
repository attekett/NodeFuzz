#!/usr/bin/env node

if(process.argv.indexOf('help')!=-1 || process.argv.indexOf('-help')!=-1 || process.argv.indexOf('--help')!=-1){	
	console.log('NodeFuzz v0.1.1')
	console.log('Check config.js for about everything.')
	console.log('-mp | "ModulePath" where to load modules. (Note: can be file or folder)')
	process.exit(1)
}

//
//instrumentationEvents is global EventEmitter for events from NodeFuzz-core to instrumentation modules.
//
var events = require('events');
instrumentationEvents = new events.EventEmitter();

//
//Require for config and its init. (Note: config is required into global object so it can be used in 
//communication between modules without separate requires.)
//
config=require('./config.js')
if(config.hasOwnProperty('init'))
	config.init()
else
	console.log('config.js had no property init.')

//
//ModuleLoader for modules used as testcase generators.
//
var moduleLoader=require('./moduleLoader.js')
var fuzzModules=moduleLoader.loadModules()

var testCaseBuffer=[]
var previousTestCasesBuffer=config.previousTestCasesBuffer

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
//TODO: Allow HTTP-server to respond with other files also.
//
var http = require('http');
var server = http.createServer(function(request, response) {
	response.writeHead(200);
    response.write(config.clientFile)
    response.end();
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
//								
var testCaseCounter=0
var sending=false
wsServer.on('request', function(request) {
    connection = request.accept('fuzz-protocol', request.origin);
    connection.on('message', function(message) {
    	if(!sending){
	    		sending=true
	    		testCaseCounter++
	    	if(testCaseCounter > config.testCasesWithoutRestart){
	    		sending=false
				testCaseCounter=0
				instrumentationEvents.emit('testCasesWithoutRestartLimit')
	    	}
	    	else{
	    		try{clearTimeout(timeoutGetNewTestcase);}catch(e){}
				timeoutGetNewTestcase=setTimeout(function(){
					sending=false
					testCaseCounter=0
					instrumentationEvents.emit('websocketTimeout')
				},config.timeout);
	    		
	    		sendNewTestCase(connection)
	    	}
    	}
	})
})

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
	var currentTestCase
	if(testCaseBuffer.length==0){
		process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
		process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
		currentTestCase=(ra(fuzzModules).fuzz())
	}
	else if(testCaseBuffer.length>=2){
		currentTestCase=testCaseBuffer.pop()	
	}
	else{
		process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
		process.nextTick(function(){testCaseBuffer.push((ra(fuzzModules)).fuzz())});
		currentTestCase=testCaseBuffer.pop()
	}
	if(currentTestCase!=''){
		if(previousTestCasesBuffer.unshift(currentTestCase)>config.bufferSize){
			previousTestCasesBuffer.pop();
		}
		sending=false
		if(currentTestCase instanceof Buffer){
			connection.sendBytes(currentTestCase);
   		}
    	else{
    		var test=new Buffer(currentTestCase)
    		connection.sendBytes(test)
    	}
	}
	else{
		setTimeout(function(){
			sendNewTestCase(connection)
		},20)
	}
}



