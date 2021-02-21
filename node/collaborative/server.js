var fs = require("fs");
var path = require('path');
const { readdirSync } = require('fs')

var express = require('express');
var app = express();
var http = require('http').createServer(app).listen(process.env.PORT||3000,function(){
	console.log('Application running on port '+this.address().port);
});
var io = require('socket.io').listen(http);
var userlist = {};
var liveVideoCalls = {};
app.use(express.static(__dirname+'/static/'));
app.get('/',function(req,res){
	res.sendFile(__dirname+'/static/index.html');
});

const getDirectories = source =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

// reading images
imagesRoot = '../data/building_tiles/_alllayers/'
// getting all directories for images with with different resolutions
   
let imageData = {}

let resolutions = getDirectories(imagesRoot)

resolutions.forEach(resolution=>{
	   let currDir = imagesRoot+resolution+"/"
	   let rows = getDirectories(currDir)
	   imageData[resolution] = {}
	   // will read first row for now
	   let count = 0
	   rows.forEach(row=>{
		   if (count < 1) {
			   filenames = fs.readdirSync(currDir+row+"/")  
			   imageData[resolution][row]=filenames
		   }
		   count++
	   })

})

Object.keys(imageData).forEach(function(resolution, index){
	   let currDir = imagesRoot+resolution+"/"
	   Object.keys(imageData[resolution]).forEach(function(row, index){
		   data = []
		   imageData[resolution][row].forEach(filename=>{
			   let contents = fs.readFileSync(currDir+row+"/" + filename, {encoding: 'base64'}) 
			   data.push(contents)
		   })
		   imageData[resolution][row]=data
		   
	   })
})

var dictstring = JSON.stringify(imageData);
fs.writeFile("imageData.json", dictstring, function(err, result) {
	   if(err) console.log('error', err);
});
io.sockets.on('connection',function(socket){
	console.log('A user has connected!');
	socket.on('new user',function(data,callback){
		console.log('user wants to connect as '+data);
		if(data in userlist){
			callback(false);
		} else{
			callback(imageData);
			socket.username = data;
			userlist[socket.username] = socket;
			updateUserList();
		}
	});
	
	function updateUserList(){
		io.sockets.emit('users',Object.keys(userlist));
	}

	socket.on('disconnect',function(data){
		if(!socket.username)
			return;
		delete userlist[socket.username];
		updateUserList();
	});
	socket.on('new message',function(data, type){
		io.sockets.emit('message',{name:socket.username, msg:data, type:type});
		
	});
	
	socket.on('candidate',function(data){
		console.log('candidate call to '+data.targetUser+' with candidate'+data.candidate);
		io.sockets.emit('candidate',data);
	});
	socket.on('offersdp',function(data){
		console.log('offersdp to '+data.targetUser+' with offerSDP'+data.offerSDP);
		io.sockets.emit('offersdp',data);
	});
	socket.on('answersdp',function(data){
		console.log('answersdp to '+data.targetUser+' with answersdp'+data.answerSDP);
		io.sockets.emit('answersdp',data);
	});
});