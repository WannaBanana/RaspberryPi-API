const rfid = require('mfrc522-rpi');
const fs = require('fs');
const logSystem = require('./logControl');

module.exports = rfidReader;

function rfidReader(config, door, webcam) {

    var module = {};

    var rfidState = false;
    // 讀取離線使用者資料
    var userData = JSON.parse(fs.readFileSync('./offlineData/user.json', 'utf8'));
    // 載入檔案紀錄系統
    var log = new logSystem(config.main.logDirectory, 'rfid');
    // 儲存 setTimeout 事件
    var timer;
    // 紀錄失敗次數
    var failed = [];

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

    function _countFailed(total) {
        return total++;
    }

/* 訊息事件 */
    function _rfidStatePush(state) {
        if(state == true) {
            // 讀取啟動, 推到Line, 更新firebase
            console.log('Read ON');
        } else {
            // 讀取關閉, 推到Line, 更新firebase
            console.log('Read OFF');
        }
    }

    function _verifyNoticePush(id, photoSrc) {
        console.log('verify more than 3 times');
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
                    // 開啟門鎖
                    let state = door.openSwitch('rfid');
                    // 檢查是否成功開啟門鎖, 0為開啟 1為關閉
                    if(state == 0) {
                        log.record('verify success <Info>: ' + id + ' ' + userData[studentid].departmentGrade + ' ' + userData[studentid].name + ' open ' + photoSrc);
                        return;
                    } else {
                        log.record('verify success <Info>: ' + id + ' ' + userData[studentid].departmentGrade + ' ' + userData[studentid].name + ' close ' + photoSrc);
                        return;
                    }
                }
            }
        }

        if(failed.includes(id) || failed.length == 0) {
            // 若為同一個人連續錯誤逼卡，累計錯誤次數
            failed.push(id);
            if(failed.reduce(_countFailed) == 3) {
                // 清空錯誤數量
                failed = [];
                // 執行拍照
                webcam.takePhoto('rfid').then(photoSrc => {
                    _verifyNoticePush(id, photoSrc);
                    log.record('rfid_verify failed 3 times <Info>: ' + id + ' Unknown ' + photoSrc);
                    return;
                }).catch(err => {
                    log.record('rfid_takePhoto failed <Error>: ' + err);
                })
            }
        } else if(failed.length != 0 && failed.includes(id) == false) {
            // 不同卡片則清空
            failed = [];
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

        // 丟入驗證程序
        return _verify(parseInt(cardID, 16));
    }

    function _rfidAttach() {
        if(rfidState == false) {
            try {
                timer = setTimeout(_read, 1000);
                rfidState = true;
                _rfidStatePush(rfidState);
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
                _rfidStatePush(rfidState);
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

    module.state = function () {
        return rfidState;
    }

    module.jsonReload = function() {
        _rfidDetach();
        _reload();
        _rfidAttach();
    }

    return module;
};