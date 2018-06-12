const rfid = require('mfrc522-rpi');
const fs = require('fs');
const logSystem = require('./modules/logControl');

module.exports = rfidReader;

function rfidReader(config, door) {

    var module = {};

    // 讀取離線使用者資料
    var userData = JSON.parse(fs.readFileSync('../offlineData/user.json', 'utf8'));
    // 載入檔案紀錄系統
    var log = new logSystem(config.main.logDirectory, "rfid");

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

    function _verify(id) {
        let photoSrc;
        // 從每位學生的卡片資料中檢核是否為已登記的卡片
        for(let studentid in userData) {
            for(let index in userData[studentid].card) {
                if(userData[studentid].card[index].cardID == id) {
                    // 開啟門鎖
                    let state = door.doorOpenSwitch("message");
                    // 檢查是否成功開啟門鎖, 0為開啟 1為關閉
                    if(state == 0) {
                        log.record("verifySuccess " + id + " " + userData[studentid].departmentGrade + " " + userData[studentid].name + " openFailed" + photoSrc);
                        return;
                    } else {
                        log.record("verifySuccess " + id + " " + userData[studentid].departmentGrade + " " + userData[studentid].name + " openSuccess" + photoSrc);
                        return;
                    }
                }
            }
        }

        // 驗證失敗
        log.record("verifyFailed " + id + " Unknown " + photoSrc);
        return;
    }

    module.read = function () {
        // 重設RFID讀取氣
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
            return;
        }

        // 確認讀取後將卡片資料讀出
        const uid = response.data;

        // 將UID轉換成學生證編號
        var cardID = uid[3].toString(16).padStart(2, "0") + uid[2].toString(16).padStart(2, "0") + uid[1].toString(16).padStart(2, "0") + uid[0].toString(16).padStart(2, "0");

        // 丟入驗證程序
        return _verify(parseInt(cardID, 16));
    }

    module.jsonReload = function() {
        userData = JSON.parse(fs.readFileSync('../offlineData/user.json', 'utf8'));
    }

    return module;
};