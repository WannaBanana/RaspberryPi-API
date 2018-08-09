const logSystem = require('./logControl');

module.exports = function (rpio, config) {

    var module = {};

    var log = new logSystem(config.main.logDirectory, 'doorControl');
    // 電源狀態, t開f關
    var powerState = false;
    // 門狀態, t關f開 (lock = true為關)
    var lockState = false;

    /* 事件函式(訊息管理) Private */

    // 電源狀態通知
    function _doorPowerPush(state) {
        if(state == true) {
            // 電源啟動, 推到Line, 更新firebase
        } else {
            // 電源關閉, 推到Line, 更新firebase
        }
    }

    // 門鎖狀態通知
    function _doorStatePush(state) {
        // 記錄資訊與回傳狀態
        if(state == false) {
            // 門鎖打開, 推到Line, 更新firebase
        } else {
            // 門鎖關閉, 推到Line, 更新firebase
        }
    }

    /* 作動函式(裝置管理) Private */

    function _doorAttach() {
        try {
            // 預設啟動電源上鎖, 不開啟
            rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.LOW);
            rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.HIGH);
            // 紀錄電源狀態
            powerState = true;
            lockState = true;
            // 狀態更新
            _doorPowerPush(true);
            _doorStatePush(true);
            log.record('door_attach success');
            return true;
        } catch(err) {
            log.record('door_attach failed <Error>: ' + err);
            return false;
        }
    }

    function _doorDetach() {
        try {
            // 關閉GPIO, 避免訊號異常導致開門
            rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
            rpio.close(config.lock.openPIN, rpio.PIN_RESET);
            // 更新電源狀態
            powerState = false;
            lockState = false;
            // 狀態更新
            _doorPowerPush(false);
            _doorStatePush(false);
            log.record('door_detach success');
            return true;
        } catch(err) {
            log.record('door_detach failed <Error>: ' + err);
            return false;
        }
    }

    function _waiting(ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        });
    }

    function _doorConfig(state, delay) {
        try {
            switch(state) {
                case 'on':
                    rpio.write(config.lock.openPIN, rpio.LOW);
                    lockState = false;
                    _doorStatePush(false);
                    log.record('door_config open');
                    break;
                case 'off':
                    rpio.write(config.lock.openPIN, rpio.HIGH);
                    lockState = true;
                    _doorStatePush(true)
                    log.record('door_config close');
                    break;
                case 'temp':
                    rpio.write(config.lock.openPIN, rpio.LOW);
                    lockState = false;
                    _doorStatePush(false);
                    log.record('door_config open for ' + delay + ' ms');
                    _waiting(delay).then(() => {
                        rpio.write(config.lock.openPIN, rpio.HIGH);
                        lockState = true;
                        _doorStatePush(true)
                        log.record('door_config close');
                    });
                    break;
            }
            return true;
        } catch(err) {
            log.record('door_config failed <Error>: ' + err);
            return false;
        }
    }

    function _reload() {
        try {
            lockState = (rpio.read(config.lock.openPIN) ? true : false);
            powerState = (rpio.read(config.lock.powerPIN) ? false : true);
            return true;
        } catch(err) {
            log.record('door_reload failed <Error>: ' + err);
            return false;
        }
    }

    /* 控制函式 Public 成功回傳 true, 失敗回傳 false */

    // 啟動時連接GPIO
    module.init = function () {
        // 啟動繼電器
        return _doorAttach();
    }

    // 電源切換
    module.terminate = function () {
        // 關閉繼電器
        return _doorDetach();
    }

    module.reload = function() {
        if(_reload()) {
            return {
                "power": powerState,
                "lock": lockState
            }
        } else {
            return false;
        }

    }

    // 門鎖切換
    module.lockSwitch = function(method, delay = 0) {
        return _doorConfig(method, delay);
    }

    module.powerState = function () {
        // 回傳電源繼電器狀態
        return powerState;
    }

    module.openState = function () {
        // 回傳門鎖繼電器狀態
        return lockState;
    }

    return module;
};