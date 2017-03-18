var fs=require('fs')

var count=0;
var rounds=0;
var folderContent=[]
var files=[]
var folderName=''
if(process.argv.indexOf('-f')>-1){	
	try{
		folderName=process.argv[process.argv.indexOf('-f')+1]
		 var stats = fs.statSync(folderName);
      		if (stats.isDirectory()){
				folderContent=fs.readdirSync(folderName)
				for(var x in folderContent){
					if(!fs.statSync(folderName+'/'+folderContent[x]).isDirectory()){
						files.push(folderContent[x])
					}
				}
			}
			else{
				console.log('Error: '+folderName+' not a folder.')
			}
		
	}
	catch(e){
		console.log("Failed to get the file with error: "+e)
		process.exit(255)
	}
}

if(process.argv.indexOf('--rounds')>-1){
 rounds=process.argv[process.argv.indexOf('--rounds')+1]
}


module.exports ={
	fuzz:function(){
		if(count<files.length){
			console.log('\n'+files[count])
			var fileContent=fs.readFileSync(folderName+files[count])
			count++
		}		
		else{
			console.log("rounds: "+rounds)
			if(rounds>0)
				rounds--
			if(rounds==0)
				process.exit()
			count=0;
			console.log('\n'+files[count])
			var fileContent=fs.readFileSync(folderName+files[count])
			count++
		}
		return fileContent
	},
	init:function(){
		if(global.hasOwnProperty('config')){
			config.filetype='html'
			config.httpRootDir=folderName
			config.type='text/html; charset=utf-8;'
			config.tagtype='html'
			config.disableTestCaseBuffer=true
			config.clientTimeout=100
			config.timeout=20000
			config.testCasesWithoutRestart=5000
			config.clientFile=config.reBuildClientFile()
		}
		if(process.argv.indexOf('pdf')!=-1){
			console.log('pdf mode')
			config.type='application/pdf'
			config.filetype='pdf'
			
			config.clientFile=config.reBuildClientFile()
		}
		else if(process.argv.indexOf('img')!=-1){
			console.log('img')
			config.tagtype='img'
			config.filetype='img'
			config.clientFile=config.reBuildClientFile()
		}
		else if(process.argv.indexOf('video')!=-1){
			console.log('video')
			config.tagtype='video'
			config.filetype='video'
			config.clientFile=config.reBuildClientFile()
		}
	}
}