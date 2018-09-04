const express = require('express');
const router = express.Router();

/* 獲取狀態 */
router.get('/rfid', function(req, res) {
    let state = req.rfid.getState()
    if(state) {
        res.status(200).send({
            "state": state
        });
    } else {
        res.status(500).send({
            "message": "RFID獲取狀態失敗"
        });
    }
});

/* 啟用讀取 */
router.put('/rfid', function(req, res) {
    if(req.rfid.init()) {
        res.status(200).send({
            "message": "RFID讀取啟動成功"
        });
    } else {
        res.status(500).send({
            "message": "RFID讀取啟動失敗"
        });
    }
});


/* 重新載入 */
router.patch('/rfid', function(req, res) {
    if(req.rfid.jsonReload()) {
        res.status(200).send({
            "message": "RFID重新載入成功"
        });
    } else {
        res.status(500).send({
            "message": "RFID重新載入失敗"
        });
    }
});

/* 停用讀取 */
router.delete('/rfid', function(req, res) {
    if(req.rfid.terminate()) {
        res.status(200).send({
            "message": "RFID讀取關閉成功"
        });
    } else {
        res.status(500).send({
            "message": "RFID讀取關閉失敗"
        });
    }
});

module.exports = router;