module.exports = function (rpio, config) {

    var module = {};

    var log = new logSystem(config.main.logDirectory, doorControl);
    // 電源狀態
    var powerState = false;

    function _doorAttach() {
        // 預設啟動電源上鎖, 不開啟
        rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.HIGH);
        rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.LOW);
        // 紀錄電源狀態
        powerState = true;
    }

    function _doorDetach() {
        // 關閉GPIO, 避免訊號異常導致開門
        rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
        rpio.close(config.lock.openPIN, rpio.PIN_RESET);
        // 更新店員狀態
        powerState = false;
    }

    /* 事件函式(訊息管理) */

    // 電源狀態通知
    function _doorPowerPush() {
        if(powerState == false) {

        } else {

        }
        // push Line API
    }

    // 門鎖狀態通知
    function _doorStatePush(state) {
        if(state == 0) {

        } else {

        }
        // push Line API
    }

    // 啟動時連接GPIO
    module.doorInit = function () {
        _doorAttach();
    }

    /* 控制函式 */

    // 電源切換
    module.doorPowerSwitch = function () {
        powerState == false ? _doorAttach() : _doorDetach();
        // 更新電源狀態
        _doorPowerPush();

        return powerState;
    }

    // 門鎖切換
    module.doorOpenSwitch = function (message) {
        // 電源啟動情況下才執行開關門鎖
        if(powerState == true) {
            // 切換繼電器訊號
            rpio.read(config.lock.openPIN) == 0 ? rpio.write(config.lock.openPIN, rpio.HIGH) : rpio.write(config.lock.openPIN, rpio.LOW);
            // 讀取繼電器狀態
            let currentState = rpio.read(config.lock.openPIN);
            // 更新門鎖狀態
            _doorStatePush(currentState;

            // 記錄資訊與回傳狀態
            log.record();
            return currentState;
        } else {
            // 紀錄失敗訊息
            log.record();
        }
    }

    module.doorPowerState = function () {
        // 回傳電源繼電器狀態
        return rpio.read(config.lock.powerPIN);
    }

    module.doorOpenState = function () {
        // 回傳門鎖繼電器狀態
        return rpio.read(config.lock.openPIN);
    }

    return module;
};