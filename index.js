const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require("./ENV.json");
const rpio = require('rpio');
const rfid = require('./modules/rfidReader')(config);
const door = require('./modules/doorControl')(rpio, config);
const logSystem = require('./modules/logControl');

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

rpio.init({mapping: 'physical'});

setInterval(function(){
    console.log(rfid.read());
}, 500);

var server = app.listen(config.main.port || 8080, function() {
    var port = server.address().port;
    console.log('API Server is running on port: ' + port + '!');
});