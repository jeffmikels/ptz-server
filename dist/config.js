const fs = require('fs');
let macros;
if (fs.existsSync('macros.json')) {
    try {
        macros = JSON.parse(fs.readFileSync('macros.json'));
    }
    catch (e) {
        macros = {};
    }
}
let config = {
    // serial port for talking to visca cameras
    viscaSerial: {
        port: 'COM8',
        baud: 38400,
    },
    // configuration for visca-ip cameras
    // {name, index, ip, port, [ptz | sony]}
    viscaIPCameras: [],
    // configuration for the visca ip translation server
    // the http server will reside at the basePort
    // udp servers will exist at basePort + cameraIndex
    viscaServer: {
        basePort: 52380,
    },
    // default controller configurations
    controllers: {
        'global': {},
        'sidewinderpp': {},
        'dualshock4': {}
    },
    macros
};
module.exports = config;
