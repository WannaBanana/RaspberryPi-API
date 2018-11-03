const logSystem = require('./logControl');
const gpio = require('rpi-gpio');

module.exports = function(rpio, config, database){

    var module = {}

    var log = new logSystem(config.main.logDirectory, 'glassDetect');
    var ref = database.ref('/space/' + config.main.college + '/' + config.main.spaceCode + '/equipment/glassDetect');
    var alert_ref = database.ref('/alert');

    var powerState = false;
    // 蓋子高電壓時為關上, 低電壓時為開啟
    var caseState = false;
    var caseEventNoticeID = undefined;

/* 事件函式(訊息管理) Private */

    function _glassPowerPush(state) {
        if(state == true) {
            // 電源啟動, 推到Line, 更新firebase
            console.log('Power ON');
            ref.update({'power': '啟動'});
        } else {
            // 電源關閉, 推到Line, 更新firebase
            console.log('Power OFF');
            ref.update({'power': '關閉'});
        }
    }

    function _glassDetectPush() {
        // 觸發警告, 推到Line, 記錄到firebase
        console.log('Glass crack detect');
        alert_ref.push({
            "type": "警報",
            "event": "玻璃感應器",
            "describe": "偵測到玻璃破碎",
            "state": "未處理",
            "time": new Date().toISOString(),
            "source": config.main.college + config.main.spaceCode
        });
    }

    function _glassCasePush() {
        caseState = (rpio.read(config.glass.casePIN) ? true : false);
        if(caseState == false) {
            // 盒子開啟, 推到Line, 記錄到firebase
            console.log('case ON');
            alert_ref.push({
                "type": "警告",
                "event": "玻璃感應器",
                "describe": "偵測到玻璃感應器被拆開",
                "state": "未處理",
                "time": new Date().toISOString(),
                "source": config.main.college + config.main.spaceCode
            }).then((snapshot) => {
                caseEventNoticeID = snapshot.key;
            });
        } else {
            console.log('case OFF');
            if(caseEventNoticeID) {
                alert_ref.child(caseEventNoticeID).update({'state': '已處理'});
                caseEventNoticeID = undefined;
            }
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
        console.log('glass_event binding success');
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
