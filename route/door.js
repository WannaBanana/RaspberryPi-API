var express = require('express');
var router = express.Router();

/* 查詢電源狀態 */
router.get('/power', function(req, res, next) {

});

/* 電源狀態切換 */
router.post('/power', function(req, res, next) {

});

/* 查詢門鎖狀態 */
router.get('/state', function(req, res, next) {

});

/* 門鎖狀態切換 */
router.get('/switch', function(req, res, next) {
    req.door.openSwitch('Request');
    res.send({'state':200})
});

module.exports = router;