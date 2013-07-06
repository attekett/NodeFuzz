NodeFuzz
========

More documentation available at http://code.google.com/p/ouspg/w/list

About:

NodeFuzz is a fuzzer harness for web browsers and browser like application fuzzing. There is two main ideas behind NodeFuzz. First one is to create a simple and fast way to fuzz different browsers. Second one is to have one harness that can be easily expanded, with new test case generators and client instrumentations, without modifications for the core of the fuzzer.

Usage:

	1.Install nodejs.

	2.Download NodeFuzz and run npm install in NodeFuzz root folder 
	(Note: If you see error about native code compile from websocket-module you can ignore it. 
	NodeFuzz doesn't use that feature of node-websocket.)

	3.Configure required parameters from config.js

	4.node nodefuzz.js [arguments] You can check the arguments available with node nodefuzz.js --help 
	(Not many arguments available yet.)

	5.see results in result-folder (default: ../results)

