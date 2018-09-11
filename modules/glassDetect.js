const logSystem = require('./logControl');

module.exports = function(rpio, config, database){

    var module = {}

    var log = new logSystem(config.main.logDirectory, 'glassDetect');
    var ref = database.ref('/space/' + config.main.collage + '/' + config.main.spaceCode + '/equipment/glassDetect');
    var alert_ref = database.ref('/alert');

    var powerState = false;

    var caseState = false;
    var caseEventNoticeID = undefined;

/* 事件函式(訊息管理) Private */

    function _glassPowerPush(state) {
        if(state == true) {
            // 電源啟動, 推到Line, 更新firebase
            console.log('Power ON');
            ref.child('power').set('啟動');
        } else {
            // 電源關閉, 推到Line, 更新firebase
            console.log('Power OFF');
            ref.child('power').set('關閉');
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
            "source": config.main.collage + config.main.spaceCode
        });
    }

    function _glassCasePush() {
        caseState = (rpio.read(config.glass.casePIN) ? true : false);
        if(caseState == true) {
            // 盒子開啟, 推到Line, 記錄到firebase
            console.log('case ON');
            alert_ref.push({
                "type": "警告",
                "event": "玻璃感應器",
                "describe": "偵測到玻璃感應器被拆開",
                "state": "未處理",
                "time": new Date().toISOString(),
                "source": config.main.collage + config.main.spaceCode
            }).then((snapshot) => {
                caseEventNoticeID = snapshot.key;
            });
        } else {
            if(caseEventNoticeID) {
                alert_ref.child(caseEventNoticeID).child('state').set('已處理');
            }
        }
    }

/* 作動函式(裝置管理) Private */

    function _glassAttach() {
        if(powerState == true) {
            return false;
        }
        try {
            // 啟動所有訊號
            rpio.open(config.glass.powerPIN, rpio.OUTPUT, rpio.HIGH);
            rpio.open(config.glass.casePIN, rpio.INPUT);
            rpio.open(config.glass.detectPIN, rpio.INPUT);
            // 綁定蓋子事件
            //rpio.poll(config.glass.casePIN, _glassCasePush, rpio.POLL_BOTH);
            // 綁定觸發事件
            //rpio.poll(config.glass.detectPIN, _glassDetectPush, rpio.POLL_HIGH);
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
            rpio.close(config.glass.casePIN, rpio.PIN_RESET);
            rpio.close(config.glass.detectPIN, rpio.PIN_RESET);
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
            caseState = (rpio.read(config.glass.casePIN) ? true : false);
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
