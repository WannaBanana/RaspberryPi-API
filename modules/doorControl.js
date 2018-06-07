module.exports = function (rpio, config) {

    var module = {};

    var log = new logSystem(config.main.logDirectory, doorControl);
    var powerState = false;

    function _doorAttach() {
        // connect relay and default power open and door close
        rpio.open(config.lock.powerPIN, rpio.OUTPUT, rpio.HIGH);
        rpio.open(config.lock.openPIN, rpio.OUTPUT, rpio.LOW);
        // let module allow be use
        powerState = true;
    }

    function _doorDetach() {
        // disconnect rpio
        rpio.close(config.lock.powerPIN, rpio.PIN_RESET);
        rpio.close(config.lock.openPIN, rpio.PIN_RESET);
        // let module disabled
        powerState = false;
    }

    // event functions
    function _doorPowerPush() {
        if(powerState == false) {

        } else {

        }
        // push Line API
        // logging
    }

    function _doorStatePush(state, message) {
        if(state == 0) {

        } else {

        }
        // push Line API
        // logging
    }

    module.doorInit = function () {
        _doorAttach();
    }

    // control functions

    module.doorPowerSwitch = function () {
        powerState == false ? _doorAttach() : _doorDetach();
        _doorPowerPush();

        return powerState;
    }

    module.doorOpenSwitch = function (message) {
        if(powerState == true) {
            rpio.read(config.lock.openPIN) == 0 ? rpio.write(config.lock.openPIN, rpio.HIGH) : rpio.write(config.lock.openPIN, rpio.LOW);
            let currentState = rpio.read(config.lock.openPIN);
            _doorStatePush(currentState, message);

            return currentState;
        } else {
            // log failed record
        }
    }

    module.doorPowerState = function () {
        return rpio.read(config.lock.powerPIN);
    }

    module.doorOpenState = function () {
        return rpio.read(config.lock.openPIN);
    }

    return module;
};