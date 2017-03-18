var util = require('util');
var process = require('child_process');
var spawn = process.spawn;
var exec = process.exec;
var events = require('events');

var Adb = function(opts) {
	this.logcat = null;
	this.rooted = opts && opts.rooted;
	console.log(this.rooted);
	this.last_pids = [];

	console.log("Adb object created");
	events.EventEmitter.call(this);
}
util.inherits(Adb, events.EventEmitter);

Adb.prototype.connect = function(address, callback) {
	var self = this;

	var command = 'adb connect ' + address
	if(address!==undefined && address!=''){
		exec(command, function(err, stdout, stderr) {
			if (stdout.indexOf("connected to") != -1) {
				return callback(true);
			} else {
				return callback(false);
			}		
		})
	}
	else{
		return callback(true);
	}
}

Adb.prototype.startLogcat = function() {
	var self = this;
	if (this.logcat) return false;
	exec("adb logcat -c",function(){console.log('Cleaned logcat.')})
	this.logcat = spawn('adb', ['logcat']);
	//this.logcat.stdout.on('data', function(data) {
	//	self.emit('logcat err', data)
	//})
	this.logcat.stdout.on('data', function(data) {
		self.emit('logcat out', data)
	})
	this.logcat.on('exit', function(code) {
		console.log("Logcat exited with: " + code);
		self.emit('logcat exit', code);
	})
	return true;
}

Adb.prototype.stopLogcat = function() {
	if (this.logcat) {
		this.logcat.kill()
		this.logcat = null;
	}
}

Adb.prototype.open = function(url, callback) {
	var command = 'adb shell am start -a android.intent.action.VIEW -n com.chrome.beta/com.google.android.apps.chrome.Main'
	var clean = false;
	if (url!==undefined && url.length > 0) {
		command += ' -d ' + url; 
		clean = true;
	}
	this.cleanChrome(clean, function() {

		exec(command, function(error, stdout, stderr) {
			if (error) { 
				console.log("Open error: " + error);
				return callback(error);
			}
			if (stdout.indexOf('Error:') != -1) {
				return callback(new Error('Intent error'), stdout);
			}
			callback(null, stdout);
		})
	})
}

Adb.prototype.pids = function() {
	var self = this;
	self.last_pids = [];
	var command = 'adb shell ps | grep com.android.chrome';
	var ps = exec(command, function() {
		ps.split('\n').forEach(function(line) {
			var pid = line.split(/\s+/)[1];
			if (pid) self.last_pids.push(pid);
			callback && callback(self.last_pids)
		})
	})
}

// HOX!!! This clean method needs root access (with non-rooted devices this will silently fail)
Adb.prototype.cleanChrome = function(clean, callback) {
	if (!clean || !this.rooted) return callback && callback()
	console.log("Root cleaning chrome");
	var self = this;
	var command = "adb shell su -c 'rm /data/data/com.android.chrome/files/*'";
	exec(command, function(error, stdout, stderr) {
		callback && callback()
	})
}

Adb.prototype.kill = function(callback) {
	var command = 'adb shell am force-stop com.chrome.beta'
//	var command = 'adb shell pkill com.android.chrome';
	var intent = exec(command, function(error, stdout, stderr) {
		callback && callback(error)
	})
}

Adb.prototype.respawn = function(url, callback) {
	var self = this;
	self.kill(function(err) {
		if (err) return callback && callback(err)
		self.open(url, callback)
	})
}

module.exports = Adb;

