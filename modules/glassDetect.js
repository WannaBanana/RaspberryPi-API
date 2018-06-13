const logSystem = require('./logControl');

module.exports = function(rpio, config){

    var module = {}

    module.glassInit = function () {
        // connect relay and default power open and door close
        rpio.open(config.glass.powerPIN, rpio.OUTPUT, rpio.HIGH);
        rpio.open(config.glass.casePIN, rpio.INPUT);
        rpio.open(config.glass.detectPIN, rpio.INPUT);
    }

    // control functions

    module.glassPowerSwitch = function () {
        rpio.read(config.glass.powerPIN) == 0 ? rpio.write(config.glass.powerPIN, rpio.HIGH) : rpio.write(config.glass.powerPIN, rpio.LOW)

        return rpio.read(config.glass.powerPIN);
    }

    // listen event functions
    function glassDetectPush() {
        // push Line API
        // logging
    }

    function glassCasePush() {
        // push Line API
        // logging
    }

    return module;
}();