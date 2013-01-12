/*
This file contains configs for the NodeFuzz. 

config.init() function can be used to load set specific configurations. 
You can also add commandline-flags or platform specific configs like demonstrated below.

*/

/*
Required:

bufferSize: 			Used by nodefuzz.js. Defines how many previous testcases will be hold in previousTestCasesBuffer.
previousTestCasesBuffer:Used by nodefuzz.js. Holds n previous testcases sent to client. n is defined by config.bufferSize. You can save crash reproducing file from this buffer. See instrumentation-module for example.
defaultModuleDirectory: Used by moduleLoader.js. Defines default location where fuzzer-modules are loaded
						when -mp commandline argument is not used.
port: 					Used by nodefuzz.js. Defines port for HTTP-server.
timeout: 				Used by nodefuzz.js. Defines timeout after testcase request when client is considered not responding.
testCasesWithoutRestart:Used by nodefuzz.js. Defines how many testcases are sent in a row before actions are needed.			
clientFile: 			Used by nodefuzz.js. Holds a string that is sent to client software when it connects to HTTP-server.			 
*/

/*
Used in demo-stuff:

fuzzfile: 				Default client-file to be used as base for reBuildClientFile
target:   				Indicates what client software we are targeting. Used for client specific parts of testcase generation and for file names saved by instrumentation.
reBuildClientFile: 		Used when selected module needs alterations to client-file.
instrument: 			Instrumentation module is loaded in variable if interaction is needed.
launch_command: 		Used by instrumentations: Holds the command that starts the client software.
browser_args: 			Used by instrumentations: Holds the arguments that are given to client software when launched.
result_dir: 			Used by instrumentations: Directory where instrumentations save logs and repro-files.
asan_symbolize: 		Used by asan_instrumentations. Location for ASAN-symbolizer script.
*/

var config = {}

config.bufferSize=10
config.previousTestCasesBuffer=[]


config.pid=process.pid 
config.port=process.pid+2000

config.timeout=20000
config.testCasesWithoutRestart=100


config.fuzzfile='./NodeFuzz.html'
config.defaultModuleDirectory='./modules/'

config.target='chrome'


/*
reBuildClientFile modifies NodeFuzz.html content according to following values. 
the client-file NodeFuzz.html has more tricks in it than just html-loading. ;)
*/
config.reBuildClientFile=function (){
	//
	//Write your own function in here if needed.
	//
	var fs=require('fs')
	var baseFile=fs.readFileSync(config.fuzzfile).toString()
	var clientFile=baseFile.split('\n')
	for (i=0; i<clientFile.length; i++) {
		if(clientFile[i].indexOf('<script>')>-1){
    		clientFile[i]=clientFile[i]+' \nvar tagtype="'+config.tagtype+'" \nvar port='+config.port+'\n var type="'+config.type+'"\n'
    		break;
    	}
    };
    return clientFile.join('\n')
}

config.init=function(){

//Windows specific configurations.
if(process.platform=='win32'){
console.log('Loading windows-configuration.');
//
//Your configs.
//
}
else{
//Linux configs.
console.log('Loading linux-configuration.')
config.instrument = require('./instrumentations/instrumentation_linux_asan.js');
config.result_dir='../results/'
config.launch_command_firefox='objdir-ff-asan/dist/bin/firefox'
config.launch_command='google-chrome'//'/chrome/src/out/Release/chrome'  //NOTE: Demo instrumentation works only on ASAN-built browsers.
config.browser_args = ['--user-data-dir=/tmp/'+config.pid+'/chrome-prof','--no-sandbox','--disable-translate','--incognito', '--new-window','--no-default-browser-check','--allow-file-access-from-files', '--no-first-run' ,'--no-process-singleton-dialog' ,'http://127.0.0.1:'+config.port]
config.browser_args_firefox=['-P',config.pid,'-no-remote','http://127.0.0.1:'+config.port]
config.asan_symbolize='chrome/src/tools/valgrind/asan/asan_symbolize.py'
if(process.argv.indexOf('firefox')!=-1){
		config.target='firefox'
		config.launch_command=config.launch_command_firefox
		config.browser_args  =config.browser_args_firefox
}



config.type='text/html'
config.tagtype='html'

config.clientFile=config.reBuildClientFile()

setTimeout(function(){instrumentationEvents.emit('startClient')},1000)}

}



module.exports = config
