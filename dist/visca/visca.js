// INSPIRED BY https://github.com/benelgiac/PyVisca3/blob/master/pyviscalib/visca.py
// 
// For this JavaScript version, we eliminate all synchronous reads to the socket
// in favor of using callbacks.
const { ViscaController } = require('./controller');
module.exports = { ViscaController };
