const logSystem = require('./logControl');
const gpio = require('rpi-gpio');

module.exports = function(rpio, config){

    var module = {}

    var log = new logSystem(config.main.logDirectory, 'glassDetect');

    var powerState = false;
    // 蓋子高電壓時為關上, 低電壓時為開啟
    var caseState = false;

/* 事件函式(訊息管理) Private */

    function _glassPowerPush(state) {
        if(state == true) {
            // 電源啟動, 推到Line, 更新firebase
            console.log('Power ON');
        } else {
            // 電源關閉, 推到Line, 更新firebase
            console.log('Power OFF');
        }
    }

    function _glassDetectPush() {
        // 觸發警告, 推到Line, 記錄到firebase
        console.log('Glass crack detect');
    }

    function _glassCasePush(state) {
        if(state == true) {
            // 盒子開啟, 推到Line, 記錄到firebase
            console.log('case ON');
        } else {
            // 盒子關閉, 推到Line, 記錄到firebase
            console.log('case OFF');
        }
    }

/* 設定GPIO監聽事件 */

    gpio.on('change', function(channel, value) {
        switch(channel) {
            case config.glass.casePIN:
                let temp = caseState;
                caseState = (rpio.read(config.glass.casePIN) ? false : true);
                // 若GPIO快速發出兩次訊號, 比對門的狀態避免發送兩次訊息
                if(temp == caseState) {
                    return;
                }
                if(caseState == true) {
                    // 盒子開啟
                    _glassCasePush(true)
                    caseState = true;
                } else {
                    // 盒子開啟
                    _glassCasePush(false)
                    caseState = false;
                }
                return;
            case config.glass.detectPIN:
                if(value == false) {
                    _glassDetectPush();
                }
                return;
            default:
                return;
        }
    });

    gpio.setup(config.glass.casePIN, gpio.DIR_IN, gpio.EDGE_BOTH);
    // 初始化五秒後再進行玻璃偵測事件綁定, 因為初始化設定時玻璃偵測會先觸發通電
    setTimeout(() => {
        gpio.setup(config.glass.detectPIN, gpio.DIR_IN, gpio.EDGE_BOTH);
    }, 5000);

/* 作動函式(裝置管理) Private */

    function _glassAttach() {
        if(powerState == true) {
            return false;
        }
        try {
            // 啟動所有訊號
            rpio.open(config.glass.powerPIN, rpio.OUTPUT, rpio.HIGH);
            _reload();
            log.record('glass_attach success');
            return true;
        } catch(err) {
            log.record('glass_attach failed <Error>: ' + err);
            return false;
        }
    }

    function _glassDetach() {
        if(powerState == false) {
            return false;
        }
        try {
            // 重置所有訊號
            rpio.close(config.glass.powerPIN, rpio.PIN_RESET);
            _reload();
            log.record('glass_detach success');
            return true;
        } catch(err) {
            log.record('glass_detach failed <Error>: ' + err);
            return false;
        }
    }

    function _reload() {
        try {
            powerState = (rpio.read(config.glass.powerPIN) ? true : false);
            caseState = (rpio.read(config.glass.casePIN) ? false : true);
            _glassPowerPush(powerState);
            _glassCasePush(caseState);
            log.record('glass_reload success')
            return true;
        } catch(err) {
            log.record('glass_reload failed <Error>: ' + err);
            return false;
        }
    }

/* 控制函式 Public 成功回傳 true, 失敗回傳 false */

    module.init = function () {
        return _glassAttach();
    }

    module.terminate = function () {
        return _glassDetach();
    }

    module.reload = function () {
        if(_reload()) {
            return {
                "power": powerState,
                "case": caseState
            };
        } else {
            return false;
        }
    }

    module.state = function () {
        return {
            "power": powerState,
            "case": caseState
        };
    }

    return module;
};
