const logSystem = require('./logControl');

module.exports = function (rpio, config) {

    var module = {};

    var log = new logSystem(config.main.logDirectory, 'doorControl');
    // 電源狀態
    var powerState = false;

    function _doorAttach() {
        try {
            // 預設啟動電源上鎖, 不開啟
            rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.LOW);
            rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.HIGH);
            // 紀錄電源狀態
            powerState = true;
            log.record('door_attach success');
        } catch(err) {
            log.record('door_attach failed <Error>: ' + err);
        }
    }

    function _doorDetach() {
        try {
            // 關閉GPIO, 避免訊號異常導致開門
            rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
            rpio.close(config.lock.openPIN, rpio.PIN_RESET);
            // 更新店員狀態
            powerState = false;
            log.record('door_detach success');
        } catch(err) {
            log.record('door_detach failed <Error>: ' + err);
        }
    }

    /* 事件函式(訊息管理) */

    // 電源狀態通知
    function _doorPowerPush(state) {
        if(state == 0) {
            log.record('door_power on <Info>: Power up.');
        } else {
            log.record('door_power off <Info>: Power down.');
        }
        // 推至 Line API
    }

    // 門鎖狀態通知
    function _doorStatePush(state) {
        // 記錄資訊與回傳狀態
        if(state == 0) {
            log.record('door_switch open <Info>: Door open.');
        } else {
            log.record('door_switch close <Info>: Door close.');
        }
        // 推至 Line API
    }

    // 啟動時連接GPIO
    module.init = function () {
        _doorAttach();
    }

    /* 控制函式 */

    // 電源切換
    module.powerSwitch = function () {
        powerState == false ? _doorAttach() : _doorDetach();
        // 更新電源狀態
        _doorPowerPush(powerState);

        return powerState;
    }

    // 門鎖切換
    module.openSwitch = function(type) {
        // 電源啟動情況下才執行開關門鎖
        if(powerState == true) {
            try {
                // 讀取原始狀態
                let  = rpio.read(config.lock.openPIN);
                // 切換繼電器訊號
                rpio.read(config.lock.openPIN) == 0 ? rpio.write(config.lock.openPIN, rpio.HIGH) : rpio.write(config.lock.openPIN, rpio.LOW);
                // 讀取繼電器狀態
                let currentState = rpio.read(config.lock.openPIN);
                // 更新門鎖狀態
                _doorStatePush(currentState);

                return currentState;
            } catch(err) {
                log.record('door_switch failed <Error>: ' + err);
            }
        } else {
            // 紀錄失敗訊息
            log.record('door_switch failed <Error>: Power does not enabled');
        }
    }

    module.powerState = function () {
        // 回傳電源繼電器狀態
        return rpio.read(config.lock.powerPIN);
    }

    module.openState = function () {
        // 回傳門鎖繼電器狀態
        return rpio.read(config.lock.openPIN);
    }

    return module;
};