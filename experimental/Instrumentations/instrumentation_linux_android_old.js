
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var os = require('os');

var network = os.networkInterfaces();
console.log(network.wlan0[0].address)
config.location='"ws://'+network.wlan0[0].address+':'+config.port+'"'
console.log(config.location)
var logcat
var init_address='-d '+network.wlan0[0].address+':'+config.port
var address = '';
var startCommand ='adb shell am start -a android.intent.action.VIEW -n com.chrome.beta/com.google.android.apps.chrome.Main '
var killCommand  ='adb shell am force-stop com.android.chrome'
var ret
var init=true;
// Clear logcat
var ret = exec('adb shell logcat -c',function(){

	logcat = spawn('adb', ['shell','logcat', '-c']);
	logcat.stdout.on('data', function(data) {
		console.log('stdout: ' + data);
	});
	startBrowser()

})
//console.dir(network);

//var address = 'http://' + network.wlan0[0].address + ':1337';

function startBrowser(){
	if(init){
		address=init_address
		init=false
	}
	else
		address=''
	ret = exec(startCommand + address,function(error, stdout, stderr){
		console.log('Errors: \n'+error+'\n Stdout: \n'+stdout+'\n Stderr: \n'+stderr)
	});
}

function restartBrowser(){
	console.log('Restarting browser with init: '+init)
	exec(killCommand,function(error, stdout, stderr){
		console.log('Errors: \n'+error+'\n Stdout: \n'+stdout+'\n Stderr: \n'+stderr)
		startBrowser()
	});
}

instrumentationEvents.on('websocketTimeout',restartBrowser)
instrumentationEvents.on('startClient',startBrowser)
//instrumentationEvents.on('exiting',clearBrowserEvents)
instrumentationEvents.on('testCasesWithoutRestartLimit',restartBrowser)
