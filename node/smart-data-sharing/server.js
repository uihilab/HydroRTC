// Muaz Khan   - www.MuazKhan.com
// MIT License - www.WebRTC-Experiment.com/licence
// Source Code - https://github.com/muaz-khan/WebRTC-Scalable-Broadcast

var fs = require("fs");
var path = require('path');
const { readdirSync } = require('fs')
var server_id = "abcd1234"
var file_data = ""
var app = require('http').createServer(function (request, response) {
    var uri = require('url').parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    var isWin = !!process.platform.match(/^win/);

    if (fs.statSync(filename).isDirectory()) {
        if(!isWin) filename += '/index.html';
        else filename += '\\index.html';
    }

    fs.exists(filename, function (exists) {
        if (!exists) {
            response.writeHead(404, {
                "Content-Type": "text/plain"
            });
            response.write('404 Not Found: ' + filename + '\n');
            response.end();
            return;
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200);
            response.write(file, 'binary');
            response.end();
        });
    });
});

const getDirectories = source =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
    
app = app.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", function() {
    var addr = app.address();
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
    console.log("Server listening at", addr.address + ":" + addr.port);
    
    require('./smart-data-sharing.js')(app, imageData, server_id);

        // reading data file that will be shared
    // fs.readFile('./sensor-data.txt', 'utf8' , (err, data) => {
    //     if (err) {
    //       console.error(err)
    //       return
    //     }
    //     file_data = data
    //     require('./smart-data-sharing.js')(app, file_data, server_id);
    //   })
});
