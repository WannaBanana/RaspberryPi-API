const express = require('express');
const router = express.Router();

/* 查詢玻璃感應器狀態 */
router.get('/glass', function(req, res) {
    let result = req.glass.state();
    if (result) {
        res.status(200).send(result);
    } else {
        res.status(500).send({
            "message": "狀態讀取失敗"
        });
    }
});

/* 啟動電源 */
router.put('/glass', function(req, res) {
    if(req.glass.init()) {
        res.status(200).send({
            "message": "玻璃感應器啟動成功"
        });
    } else {
        res.status(500).send({
            "message": "玻璃感應器啟動失敗"
        });
    }
});

/* 更新感應器狀態 */
router.patch('/glass', function(req, res) {
    let result = req.glass.reload();
    if (result) {
        res.status(200).send(result);
    } else {
        res.status(500).send({
            "message": "重新讀取狀態失敗"
        });
    }
});

/* 關閉電源 */
router.delete('/glass', function(req, res) {
    if(req.glass.terminate()) {
        res.status(200).send({
            "message": "玻璃感應器關閉成功"
        });
    } else {
        res.status(500).send({
            "message": "玻璃感應器關閉失敗"
        });
    }
});

module.exports = router;