NodeFuzz
========

More documentation available at http://code.google.com/p/ouspg/w/list

About:

NodeFuzz is a fuzzer harness for web browsers and browser like applications. There is two main ideas behind NodeFuzz. First one is to create a simple and fast way to fuzz different browser. Second one is to have one harness that can be easily expanded, with new test case generators and client instrumentations, without modifications for the core.


Usage:

	1.Install nodejs.

	2.Download NodeFuzz and run npm install in NodeFuzz root folder 
	(Note: If you see error about native code compile from websocket-module you can ignore it. 
	NodeFuzz doesn't use that feature of node-websocket.)

	3.Run "npm install buffer-crc32" and "npm install xmlhttprequest" in the NodeFuzz root folder
	to install the required module for reporting to Grinder.

	4.Configure required parameters from config.js

	5.node nodefuzz.js [arguments] You can check the arguments available with node nodefuzz.js --help 
	(Not many arguments available yet.)

	6.see results in result-folder (default: ../results)

