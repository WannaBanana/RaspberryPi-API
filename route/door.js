const express = require('express');
const router = express.Router();

/* 查詢門鎖狀態 */
router.get('/door', function(req, res) {
    let result = req.door.reload();
    if (result) {
        res.status(200).send(result);
    } else {
        res.status(500).send({
            "message": "狀態重新讀取失敗"
        });
    }
});

/* 修改門鎖狀態 */
router.post('/door', function(req, res) {
    let requsetObject = req.body;
    if(requsetObject['method'] && (requsetObject['method'] != 'open' || requsetObject['method'] != 'close' || requsetObject['method'] != 'temp')) {
        if(requsetObject['method'] == 'temp') {
            if(requsetObject['delay'] && typeof(requsetObject['delay']) == 'number') {
                if(req.door.lockSwitch(requsetObject['method'], requsetObject['delay'])) {
                    res.status(200).send({
                        "message": "狀態修改成功"
                    });
                } else {
                    res.status(500).send({
                        "message": "狀態修改失敗"
                    });
                }
            } else {
                res.status(500).send({
                    "message": "缺少延遲秒數欄位或該欄位值不為數字"
                });
            }
        } else {
            if(req.door.lockSwitch(requsetObject['method'])) {
                res.status(200).send({
                    "message": "狀態修改成功"
                });
            } else {
                res.status(500).send({
                    "message": "狀態修改失敗"
                });
            }
        }
    } else {
        res.status(500).send({
            "message": "缺少狀態欄位或不合法的狀態"
        });
    }
});

/* 啟動電源 */
router.put('/door', function(req, res) {
    if(req.door.attach()) {
        res.status(200).send({
            "message": "門鎖裝置啟動成功"
        });
    } else {
        res.status(500).send({
            "message": "門鎖裝置啟動失敗"
        });
    }
});

/* 關閉電源 */
router.delete('/door', function(req, res) {
    if(req.door.detach()) {
        res.status(200).send({
            "message": "門鎖裝置關閉成功"
        });
    } else {
        res.status(500).send({
            "message": "門鎖裝置關閉失敗"
        });
    }
});

module.exports = router;