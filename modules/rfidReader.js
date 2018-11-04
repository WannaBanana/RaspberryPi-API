const rfid = require('mfrc522-rpi');
const fs = require('fs');
const logSystem = require('./logControl');
var request =require('request');

module.exports = function (door, webcam, config, database) {

    var module = {};

    var rfidState = false;
    // 讀取離線使用者資料
    var userData = JSON.parse(fs.readFileSync('./offlineData/user.json', 'utf8'));
    var setting = JSON.parse(fs.readFileSync('./offlineData/rfidSetting.json', 'utf8'));
    // 載入檔案紀錄系統
    var log = new logSystem(config.main.logDirectory, 'rfid');
    var ref = database.ref('/space/' + config.main.college + '/' + config.main.spaceCode + '/equipment/rfid');
    var alert_ref = database.ref('/alert');
    // 儲存 setTimeout 事件
    var timer;
    // 紀錄失敗次數
    var failed = [];
    // 紀錄錯誤嘗試timeout物件 / 開後即關方法之timeout物件
    var tryTimeout, doorTimeout;
    // 紀錄短時間連續讀取的次數
    var tryCount = 0;

    // 監聽SPI頻道0
    rfid.initWiringPi(0);

    //*
    // @string.padStart(@number, @string)
    // parameter: @number(總長度), @string(不足時填充什麼字串)
    // return @string
    //*

    // 字串左側填充Prototype
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength,padString) {
            targetLength = targetLength>>0; //truncate if number or convert non-number to 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            }
            else {
                targetLength = targetLength-this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0,targetLength) + String(this);
            }
        };
    }

/* 訊息事件 */
    function _rfidStatePush(state) {
        if(state == true) {
            // 讀取啟動, 推到Line, 更新firebase
            console.log('Read ON');
            ref.update({'state': '啟動'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: 'RFID電源開啟' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        } else {
            // 讀取關閉, 推到Line, 更新firebase
            console.log('Read OFF');
            ref.update({'state': '關閉'});
            var options = {
                method: 'POST',
                url: 'https://xn--pss23c41retm.tw/api/linebot/notify',
                headers:
                { 'Content-Type': 'application/json' },
                body:
                { department: config.main.college,
                    space: config.main.spaceCode,
                    message: { type: 'text', text: 'RFID電源關閉' } },
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
            });
        }
    }

    function _verifySuccessPush(id, photoSrc) {
        console.log('verify success ID:' + id + ' src:' + photoSrc);
    }

    function _verifyNoticePush(id, photoSrc) {
        console.log('verify more than 3 times');
        alert_ref.push({
            "type": "警告",
            "event": "RFID",
            "describe": "卡片編號: " + id + " 驗證失敗三次",
            "state": "未處理",
            "time": new Date().toISOString(),
            "source": config.main.college + config.main.spaceCode
        });
        // 記錄到 firebase
        // 推到 line
    }

/* RFID事件 */
    function _verify(id) {
        // 從每位學生的卡片資料中檢核是否為已登記的卡片
        for(let studentid in userData) {
            // 檢驗學生所有的卡片
            for(let index in userData[studentid].card) {
                if(userData[studentid].card[index].cardID == id) {
                    // 清除錯誤嘗試
                    failed = [];
                    clearTimeout(tryTimeout);
                    tryTimeout = undefined;
                    let doorState = door.state();
                    switch(setting.mode) {
                        case '開後即關':
                            if(doorState.lock == true) {
                                door.lockSwitch('open');
                                if(doorTimeout == undefined) {
                                    doorTimeout = setTimeout(()=>{
                                        door.lockSwitch('close');
                                        doorTimeout = undefined;
                                    }, 2000)
                                }
                            }
                            break;
                        case '一開一關':
                            if(doorState.lock == true) {
                                door.lockSwitch('open');
                            } else {
                                door.lockSwitch('close');
                            }
                            break;
                    }
                    webcam.takePhoto('rfid').then(photoSrc => {
                        _verifySuccessPush(id, photoSrc);
                        log.record('verify success <Info>: ' + id + ' ' + userData[studentid].departmentGrade + ' ' + userData[studentid].name + ' ' + photoSrc);
                        return;
                    }).catch(err => {
                        log.record('rfid_takePhoto failed <Error>: ' + err);
                    })
                    clearTimeout(tryTimeout);
                    tryTimeout = undefined;
                    return;
                }
            }
        }

        // 計算相同卡片嘗試
        if(failed.length == 0 || failed[failed.length - 1] == id) {
            failed.push(id);
        } else if(failed[failed.length - 1] != id) {
            // 不同卡片替換
            failed = [];
            failed.push(id);
            console.log('card change');
        }
        // 同張卡片嘗試三次錯誤
        if(failed.length > 3) {
            console.log('3 same error');
            // 送通知
            return;
        }

        // 計算60秒內多次卡片替換
        tryCount++;

        if(tryTimeout == undefined) {
            tryTimeout = setTimeout(()=>{
                tryCount = 0;
                clearTimeout(tryTimeout);
                tryTimeout = undefined;
            }, 60000);
        }

        if(tryCount >= 10) {
            console.log('try more 10 error');
            // 送通知
            tryCount = 0;
            tryTimeout = undefined;
            return;
        }

        // 非累計超過三次，則紀錄錯誤卡號即可
        log.record('rfid_verify failed <Info>: ' + id + ' Unknown_user ');
        return;
    }

    function _read() {
        // 重設RFID讀取器
        rfid.reset();

        // 掃描卡片
        var response = rfid.findCard();

        // 無卡片感應
        if (!response.status) {
            return;
        }

        // 獲得卡片UID
        response = rfid.getUid();
        // UID解析錯誤
        if (!response.status) {
            log.record('rfid_read failed <Error>: cannot read uid from card.');
            return;
        }

        // 確認讀取後將卡片資料讀出
        const uid = response.data;

        // 將UID轉換成學生證編號
        var cardID = uid[3].toString(16).padStart(2, '0') + uid[2].toString(16).padStart(2, '0') + uid[1].toString(16).padStart(2, '0') + uid[0].toString(16).padStart(2, '0');
        console.log(cardID);

        // 丟入驗證程序
        return _verify(parseInt(cardID, 16));
    }

    function _rfidAttach() {
        if(rfidState == false) {
            try {
                timer = setInterval(_read, 1000);
                rfidState = true;
                _rfidStatePush(true);
                log.record('rfid_attach success')
                return true;
            } catch(err) {
                log.record('rfid_attach failed <Error>: ' + err);
                return false;
            }
        } else {
            return false;
        }
    }

    function _rfidDetach() {
        if(rfidState == true) {
            try {
                clearTimeout(timer);
                rfidState = false;
                _rfidStatePush(false);
                log.record('rfid_detach success')
                return true;
            } catch(err) {
                log.record('rfid_detach failed <Error>: ' + err);
                return false;
            }
        } else {
            return false;
        }
    }

    function _reload() {
        try {
            userData = JSON.parse(fs.readFileSync('./offlineData/user.json', 'utf8'));
            setting = JSON.parse(fs.readFileSync('./offlineData/rfidSetting.json', 'utf8'));
            log.record('rfid_jsonReload success');
        } catch(err) {
            log.record('rfid_jsonReload failed <Error>:' + err);
        }
    }

    module.init = function () {
        _rfidAttach();
    }

    module.terminate = function () {
        _rfidDetach();
    }

    module.getState = function () {
        return rfidState;
    }

    module.jsonReload = function() {
        _rfidDetach();
        _reload();
        _rfidAttach();
	return true;
    }

    return module;
};
