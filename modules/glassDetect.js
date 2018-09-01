const logSystem = require('./logControl');

module.exports = function(rpio, config){

    var module = {}

    var log = new logSystem(config.main.logDirectory, 'glassDetect');

    var powerState = false;

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

    function _glassCasePush() {
        caseState = (rpio.read(config.glass.casePIN) ? true : false);
        if(caseState == true) {
            // 盒子開啟, 推到Line, 記錄到firebase
            console.log('case ON');
        } else {
            // 盒子關閉, 推到Line, 記錄到firebase
            console.log('case OFF');
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
