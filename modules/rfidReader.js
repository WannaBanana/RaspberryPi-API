const rfid = require('mfrc522-rpi');

module.exports = rfidReader;

function rfidReader(config) {

    var module = {};

    // listen to SPI channel 0
    rfid.initWiringPi(0);

    //*
    // @string.padStart(@number, @string)
    // padding left
    // parameter: @number(total length), @string(padding with which string)
    // return @string
    //*

    // prototype to add left padding
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

    module.verify = function() {

    }

    function read() {
        // reset card
        rfid.reset();

        // Scan for cards
        var response = rfid.findCard();
        if (!response.status) {
            return "No Card";
        }

        // Get the UID of the card
        response = rfid.getUid();
        if (!response.status) {
            return "UID Scan Error";
        }

        // If we have the UID, continue
        const uid = response.data;

        //# Rebuild uid to match card's ID
        var cardID = uid[3].toString(16).padStart(2, "0") + uid[2].toString(16).padStart(2, "0") + uid[1].toString(16).padStart(2, "0") + uid[0].toString(16).padStart(2, "0")
        return parseInt(cardID, 16);
    }

    return module;
};