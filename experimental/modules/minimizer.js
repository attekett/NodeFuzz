
var fs=require("fs")
var originalFileContent
var fileName
var crash=false
var countWithoutCrash=0
var linesPerPass=[1000,100,50,10,5,3,2,1]
function cloneArray(obj){
        var copy = [];
        for (var i = 0; i < obj.length; ++i) {
            copy[i] = obj[i];
        }
        return copy;
}

if(process.argv.indexOf('-f')>-1){
	try{
		fileName=process.argv[process.argv.indexOf('-f')+1]
		console.log(fileName)
		originalFileContent=fs.readFileSync(fileName).toString()
		fileName=fileName.split('.')
	}
	catch(e){
		console.log("Failed to get the file with error: "+e)
		process.exit(255)
	}
}
else{
	console.log('No file specified. (Hint: use -f to specify file.)')
	process.exit()
}
if(process.argv.indexOf('-l')>-1)
	linesPerPass=process.argv[process.argv.indexOf('-l')+1].split(',')


var pass=1;
linesPerPass.reverse()
var divider='\n'

if(process.argv.indexOf('-d')>-1)
	divider=process.argv[process.argv.indexOf('-d')+1]
console.log('divider: '+divider)

var lines=originalFileContent.split(divider).filter(function(e){return e}); 

console.log('Starting total of '+(linesPerPass.length+1)+' passes with chunk sizes of '+linesPerPass.join(',')+ ' lines')
console.log('Original file size '+ lines.length+' lines.')
var linesThisPass=linesPerPass.pop()
console.log('Starting first pass with '+linesThisPass+' line chunks.')
var lineObjects=[]
var currentIteration=[]
var preserve=[]
var lastFalse
detectUnremovable(lines)
var previousIteration=lineObjects

function detectUnremovable(lines){
	lines.forEach(function(line,index){
		var lineObject={}
		if(line.trim().match(/(^for|^while|^setTimeout|^setInterval|^\})/)){
			lineObject.value=line
			lineObject.preserve=true
			preserve.push(true)
		}
		else{
			lineObject.value=line
			lineObject.preserve=false
			preserve.push(false)	
		}
		lineObjects.push(lineObject)
	})
}

function minimizeFurther(){
	
	var returnString=""
	currentIteration=cloneArray(previousIteration)
	if(lastFalse===undefined){
		lastFalse=currentIteration.length-linesThisPass
	}
	else{
		lastFalse-=linesThisPass;
	}
	var found=false
	for(x=lastFalse;x>=0;x--){
		var value=currentIteration[x]
		if(!value.preserve){
			found=true
			lastFalse=x
			break
		}

	}
	if(!found){
		if(linesPerPass.length>0){
			console.log("Pass "+pass+" finished.")
			pass++
			linesThisPass=linesPerPass.pop()
			console.log("Starting pass "+pass+" with "+linesThisPass+" line chunks.")
			console.log('Current file size '+currentIteration.length+' lines.')
			lastFalse=currentIteration.length-linesThisPass	
			
		}
		else{
			console.log("Finished minimizing!")
			console.log("Final file size "+currentIteration.length)

			fs.writeFileSync(fileName[0]+"-min."+fileName[1], buildTestCase(currentIteration));
			console.log("Minimized repro-file written. Exiting.")
			process.exit(1)
		}
	}
	currentIteration.splice(lastFalse,linesThisPass)
	return buildTestCase(currentIteration)
}

instrumentationEvents.on("crash",function(){
	crash=true	
})

function buildTestCase(list){
	var returnString=''
	list.forEach(function(value){
		returnString+=value.value+divider
	})
	return returnString
}

module.exports ={
	fuzz:function(){
		countWithoutCrash++
		if(crash){
			countWithoutCrash=0
			crash=false
			previousIteration=cloneArray(currentIteration)
			return minimizeFurther()	
		}
		else if(countWithoutCrash<3){
			countWithoutCrash++
			return buildTestCase(currentIteration)
		}
		else{
			countWithoutCrash=0
			if(previousIteration[lastFalse])
				previousIteration[lastFalse].preserve=true
			return minimizeFurther()
		}
	},
	init:function(){
		if(global.hasOwnProperty('config')){
			config.filetype='html'
			config.type='text/html'
			config.tagtype='html'
			config.clientTimeout=1000
			config.timeout=10000
			config.testCasesWithoutRestart=5000
			config.clientFile=config.reBuildClientFile()
		}
		if(process.argv.indexOf('pdf')!=-1){
			console.log('pdf mode')
			config.type='application/pdf'
			config.filetype='pdf'
			
			config.clientFile=config.reBuildClientFile()
		}
		if(process.argv.indexOf('svg')!=-1){
			console.log('svg mode')
			config.type='image/svg+xml'
			config.filetype='svg'
			
			config.clientFile=config.reBuildClientFile()
		}
		if(process.argv.indexOf('video')!=-1){
			console.log('video mode')
			config.type='video'
			config.tagtype='video	'
			config.filetype='video'
			
			config.clientFile=config.reBuildClientFile()
		}
	}
}

process.on('SIGINT', function() {
	fs.writeFileSync(fileName[0]+"-abortmin."+fileName[1], buildTestCase(currentIteration));
	console.log("Aborted minimization. Current iteration written.")
})


minimizeFurther()