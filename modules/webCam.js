const logSystem = require('./modules/logControl');

module.exports = webCamControl;

function webCamControl() {

    var module = {};

    var log = new logSystem(config.main.logDirectory, "webcam");

    module.localStorage = function () {
        let time = new Date().toISOString();

        // 拍照
        // 儲存
        // 紀錄

        // 回傳路徑
        return photoSrc;
    }
}