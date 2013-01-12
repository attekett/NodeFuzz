NodeFuzz
========

More documentation available at http://code.google.com/p/ouspg/w/list

Usage:

1.Install nodejs.
2.Download NodeFuzz and run npm install in NodeFuzz root folder (Note: If you see error about native code compile from websocket-module you can ignore it. NodeFuzz doesn't use that feature of node-websocket.)
3.Configure required parameters from config.js
4.node nodefuzz.js [arguments] You can check the arguments available with node nodefuzz.js --help (Not many arguments available yet.)
5.see results in result-folder (default: ../results)

Install nodejs:

Debian:

echo deb http://ftp.us.debian.org/debian/ sid main > /etc/apt/sources.list.d/sid.list
apt-get update
apt-get install nodejs npm 

Ubuntu:

Should also work on the default-version from packet manager, if not:

sudo apt-get install python-software-properties
sudo apt-add-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs npm

Others with package-manager:

Check https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
