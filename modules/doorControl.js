module.exports = function (rpio, config) {

    var module = {};

    module.doorInit = function () {
        _doorAttach();
    }

    // control functions

    module.doorPowerSwitch = function () {
        rpio.read(config.lock.powerPIN) == 0 ? rpio.write(config.lock.powerPIN, rpio.HIGH) : rpio.write(config.lock.powerPIN, rpio.LOW)

        return rpio.read(config.lock.powerPIN);
    }

    module.doorOpenSwitch = function () {
        rpio.read(config.lock.openPIN) == 0 ? rpio.write(config.lock.openPIN, rpio.HIGH) : rpio.write(config.lock.openPIN, rpio.LOW)

        return rpio.read(config.lock.openPIN);
    }

    module.doorPowerState = function () {
        return rpio.read(config.lock.powerPIN);
    }

    module.doorOpenState = function () {
        return rpio.read(config.lock.openPIN);
    }

    function _doorAttach() {
        // connect relay and default power open and door close
        rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.HIGH);
        rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.LOW);
    }

    function _doorDetach() {
        rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
        rpio.close(config.lock.openPIN, rpio.PIN_RESET);
    }

    // listen event functions
    function _doorPowerPush() {
        // push Line API
        // logging
    }

    function _doorStatePush() {
        // push Line API
        // logging
    }

    return module;
};