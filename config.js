/*
This file contains configs for the NodeFuzz. 

config.init() function can be used to load set specific configurations. 
You can also add commandline-flags or platform specific configs like demonstrated below.

*/

/*
Required:

bufferSize: 			Used by nodefuzz.js. Defines how many previous testcases will be hold in previousTestCasesBuffer.
defaultModuleDirectory: Used by moduleLoader.js. Defines default location where fuzzer-modules are loaded
						when -mp commandline argument is not used.
port: 					Used by nodefuzz.js. Defines port for HTTP-server.
timeout: 				Used by nodefuzz.js. Defines timeout after testcase request when client is considered not responding.
testCasesWithoutRestart:Used by nodefuzz.js. Defines how many testcases are sent in a row before actions are needed.			
clientFile: 			Used by nodefuzz.js. Holds a string that is sent to client software when it connects to HTTP-server.			 
*/

/*
Optional:
previousTestCasesBuffer: 	Used by nodefuzz.js. Holds n previous testcases sent to client. n is defined by config.bufferSize. 
							You can save crash reproducing file from this buffer. See instrumentation-module for example.
							(Note: This variable is now defined in nodefuzz.js)
disableDefaultWsOnRequest: 	Boolean to enable/disable the default WebSocket.on('request') handler.
addCustomWebSocketHandler: 	Function that is executed if available on init. Get WebSocket server object as parameter.
httpRootDir: 				Root directory for the HTTP-server. (Note: Really poor implementation that did the trick in one of my experiments.) 
disableTestCaseBuffer: 		Boolean to enable/disable test case buffer. More info on changelog
*/

/*
Used in demo-stuff:

fuzzfile: 				Default client-file to be used as base for reBuildClientFile
reBuildClientFile: 		Used when selected module needs alterations to client-file.
result_dir: 			Used by instrumentations: Directory where instrumentations save logs and repro-files.
*/

var config = {}

config.bufferSize=10
//config.previousTestCasesBuffer=[]


config.pid=process.pid 
config.port=process.pid+2000

config.timeout=20000
config.testCasesWithoutRestart=100


config.fuzzfile='./NodeFuzz.html'
config.defaultModuleDirectory='./modules/'

/*

//Support for reporting to Grinder <https://github.com/stephenfewer/grinder>
//Needed for instrumentation_linux_asan_grinder.js
config.grinder_server="http://10.0.0.2/grinder"
config.grinder_key="AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPP"

// if set to true will not run asan_symbolize and will attempt to report crash for symbolizing later
config.no_symbolize=true
*/
config.asan_symbolize='/path/to/your/asan_symbolize_new.py'


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

	if(process.platform=='win32'){
		console.log('Loading windows-configuration.');
		//Windows specific configurations.

		//
		//Your configs.
		//
	}
	else if(process.platform=='darwin'){
		//OSX configs.

	}
	else{
		//Linux configs.
		console.log('Loading linux-configuration.')
		config.defaultInstrumentationFile = './instrumentations/instrumentation_linux_asan.js'
		config.result_dir='../results/'
		config.type='text/html'
		config.tagtype='html'


		//Configurations for the demo Instrumentation
		config.target='chrome'
		config.timeout=1000
		config.launchCommand='google-chrome'
		config.browserArgs = ['--user-data-dir=/tmp/'+config.pid+'/chrome-prof','--disable-translate','--incognito', '--new-window','--no-default-browser-check','--allow-file-access-from-files', '--no-first-run' ,'--no-process-singleton-dialog' ,'http://127.0.0.1:'+config.port]
		config.clientFile=config.reBuildClientFile()

	}

}




module.exports = config

