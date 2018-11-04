const logSystem = require('./logControl');
const gpio = require('rpi-gpio');

module.exports = function (rpio, config, database) {

    var module = {};

    var log = new logSystem(config.main.logDirectory, 'doorControl');
    var ref = database.ref('/space/' + config.main.college + '/' + config.main.spaceCode + '/equipment/doorLock')
    // 電源狀態, t開f關
    var powerState = false;
    // 門鎖狀態, t關f開 (lock = true為上鎖)
    var lockState = false;
    // 門狀態, t開啟f關閉
    var doorState = false;

/* 事件函式(訊息管理) Private */

    // 電源狀態通知
    function _doorPowerPush(state) {
        if(state == true) {
            // 電源啟動, 推到Line, 更新firebase
            console.log('Power ON');
            ref.update({'power': '啟動'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: '門鎖電源啟動' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        } else {
            // 電源關閉, 推到Line, 更新firebase
            console.log('Power OFF');
            ref.update({'power': '關閉'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: '門鎖電源關閉' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        }
    }

    // 門鎖狀態通知
    function _doorStatePush(state) {
        // 記錄資訊與回傳狀態
        if(state == false) {
            // 門鎖打開, 推到Line, 更新firebase
            console.log('LOCK ON');
            ref.update({'lock': '解鎖'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: '門鎖解鎖' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        } else {
            // 門鎖關閉, 推到Line, 更新firebase
            console.log('LOCK OFF');
            ref.update({'lock': '上鎖'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: '門鎖上鎖' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        }
    }

    // 上鎖狀態通知
    function _closeStatePush(state) {
        // 紀錄資訊與回傳狀態
        if(state == true) {
            // 門開啟, 推到Line, 更新firebase
            console.log('DOOR ON');
            ref.update({'door': '開啟'});
        } else {
            // 門關閉, 推到Line, 更新firebase
            console.log('DOOR OFF');
            ref.update({'door': '關閉'});
        }
    }

/* 設定GPIO監聽事件 */

    gpio.on('change', function(channel, value) {
        switch(channel) {
            case 37:
                let temp = doorState;
                doorState = (rpio.read(config.lock.doorPIN) ? true : false);
                // 若GPIO快速發出兩次訊號, 比對門的狀態避免發送兩次訊息
                if(temp == doorState) {
                    return;
                }
                if(doorState == true) {
                    _closeStatePush(true);
                    doorState = true;
                } else {
                    _closeStatePush(false);
                    doorState = false;
                }
                return;
            default:
                return;
        }
    });

    gpio.setup(37, gpio.DIR_IN, gpio.EDGE_BOTH);

/* 作動函式(裝置管理) Private */

    function _doorAttach() {
        if(powerState == true) {
            return false;
        }
        try {
            // 預設啟動電源上鎖, 不開啟
            rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.HIGH);
            rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.LOW);
            // 紀錄、更新電源狀態
            _reload();
            log.record('door_attach success');
            return true;
        } catch(err) {
            log.record('door_attach failed <Error>: ' + err);
            return false;
        }
    }

    function _doorDetach() {
        if(powerState == false) {
            return false;
        }
        try {
            // 關閉GPIO, 避免訊號異常導致開門
            rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
            rpio.close(config.lock.openPIN, rpio.PIN_RESET);
            gpio.destroy(function() {
                console.log('All pins unexported');
            });
            // 更新電源狀態
            _reload();
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
        if(powerState == false) {
            return false;
        }
        try {
            switch(state) {
                case 'open':
                    rpio.write(config.lock.openPIN, rpio.HIGH);
                    lockState = false;
                    _doorStatePush(false);
                    log.record('door_config open');
                    break;
                case 'close':
                    rpio.write(config.lock.openPIN, rpio.LOW);
                    lockState = true;
                    _doorStatePush(true)
                    log.record('door_config close');
                    break;
                case 'temp':
                    rpio.write(config.lock.openPIN, rpio.HIGH);
                    lockState = false;
                    _doorStatePush(false);
                    log.record('door_config open for ' + delay + ' ms');
                    _waiting(delay).then(() => {
                        rpio.write(config.lock.openPIN, rpio.LOW);
                        lockState = true;
                        _doorStatePush(true)
                        log.record('door_config close');
                    });
                    break;
                default:
                    log.record('door_config failed <Error>: Could not find method');
                    return false;
            }
            return true;
        } catch(err) {
            log.record('door_config failed <Error>: ' + err);
            return false;
        }
    }

    function _reload() {
        try {
            lockState = (rpio.read(config.lock.openPIN) ? false : true);
            powerState = (rpio.read(config.lock.powerPIN) ? true : false);
            doorState = (rpio.read(config.lock.doorPIN) ? true : false);
            _doorPowerPush(powerState);
            _doorStatePush(lockState);
            _closeStatePush(doorState);
            log.record('door_reload success');
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
                "lock": lockState,
                "door": doorState
            };
        } else {
            return false;
        }
    }

    // 門鎖切換
    module.lockSwitch = function(method, delay = 0) {
        return _doorConfig(method, delay);
    }

    module.state = function () {
        // 回傳電源繼電器狀態
        return {
            "power": powerState,
            "lock": lockState,
            "door": doorState
        };
    }

    return module;
};
