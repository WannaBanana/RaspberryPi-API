const config = require('./ENV.json');
const os = require('os');
const ipAddr = os.networkInterfaces()['eth0'][0].address;
const Stream = require('node-rtsp-stream');

stream = new Stream({
    name: config.main.college + config.main.space,
    streamUrl: 'rtsp://' + ipAddr + ':8555/unicast',
    wsPort: 9999
});