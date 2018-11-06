const express = require('express');
const router = express.Router();
var ffmpeg = require('fluent-ffmpeg');

router.get('/', function(req, res) {
    var file = './snapshot.png';

    var proc = ffmpeg('rtmp://163.22.32.200:1935/live/R441')
        .on('end', function(files)
        {
            res.sendFile(file);
        })
        .on('error', function(err)
        {
            res.json({
                status : 'error',
                error : err.message
            });
        })
        .outputOptions(['-f image2', '-vframes 1', '-vcodec png', '-f rawvideo', '-s 640x480', '-ss 00:00:01'])
        .output(file)
        .run();
});

module.exports = router;