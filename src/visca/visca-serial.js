const SerialPort = require("serialport");
const Delimiter = require('@serialport/parser-delimiter');
const { EventEmitter } = require('events');

// simply implements a visca transport over the serial interface
class SerialTransport extends EventEmitter {
	started = false;
	debug = false;

	constructor(portname = "/dev/ttyUSB0", timeout = 1, baudRate = 9600, debug = false) {
		if (this.started) return;
		this.portname = portname;
		this.timeout = timeout;
		this.baudRate = baudRate;
		this.debug = debug;
		this.start();
	}

	start() {
		if (this.started) return;

		// open the serial port
		try {
			this.serialport = new SerialPort(portname, { baudRate });
			this.parser = this.serialport.pipe(new Delimiter({ delimiter: [0xff] }))
			this.serialport.on('open', this.onOpen);   // provides error object
			this.serialport.on('close', this.onClose); // if disconnected, err.disconnected == true
			this.serialport.on('error', this.onError); // provides error object
			this.parser.on('data', this.onData);       // provides a Buffer object
		} catch (e) {
			console.log(`Exception opening serial port '${this.portname}' for (display) ${e}\n`);
		}
	}

	restart() { this.close(); this.init(); this.start(); }
	close() { this.serialport.close(); this.started = false; }

	onOpen() { this.started = true; this.emit('open'); }
	onClose(e) { console.log(e); this.started = false; this.emit('close'); }
	onError(e) { console.log(e); this.started = false; this.emit('error', e); }

	onData(packet) {
		// the socket parser gives us only full visca packets
		// (terminated with 0xff)
		console.log('Received: ', packet);
		if (this.debug) console.log('Received: ' + packet);

		// convert to command packet object
		let v = ViscaCommand.fromPacket(packet);

		this.emit('data', v);
	}

	send(viscaCommand) {
		if (!this.serialport.isOpen) return;
		let packet = viscaCommand.toPacket();
		this.serialport.write(packet);
		if (this.debug) console.log('Sent: ' + packet);
	}
}

module.exports = { SerialTransport };