const logSystem = require('./logControl');
const NodeWebcam = require('node-webcam');

module.exports = function (config) {

    var module = {};

    var opts = {
        //Picture related
        width: 1280,
        height: 720,
        quality: 100,
        //Delay to take shot
        delay: 0,
        //Save shots in memory
        saveShots: true,
        // [jpeg, png] support varies
        // Webcam.OutputTypes
        output: "jpeg",
        //Which camera to use
        //Use Webcam.list() for results
        //false for default device
        device: "/dev/video1",
        // [location, buffer, base64]
        // Webcam.CallbackReturnTypes
        callbackReturn: "location",
        //Logging
        verbose: false
    };

    var webcam = NodeWebcam.create(opts);
    var log = new logSystem(config.main.logDirectory, "webcam");

    module.takePhoto = function (type) {
        return new Promise((resolve, reject) => {
            let time = new Date().toISOString();
            // 拍照
            webcam.capture(config.main.logDirectory + '/webcam/' + time + '.jpg', function(err, src) {
                if(err) {
                    log.record('takePhoto failed <Error>: ' + err);
                    reject(false);
                }
                log.record('takePhoto success <Info>: ' + type );
                resolve(src);
            });
        });
    }

    return module;
};