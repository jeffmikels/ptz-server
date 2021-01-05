const SerialPort = require("serialport");
const Delimiter = require('@serialport/parser-delimiter');
const { EventEmitter } = require('events');

// the controller keeps track of the cameras connected by serial
// it also communicates with cameras over IP
// and it exposes a UDP server for each serially connected camera

class ViscaController extends EventEmitter {
	DEBUG = true;
	started = false;

	constructor(portname = "/dev/ttyUSB0", timeout = 1, baudRate = 9600) {
		if (this.started) return;
		this.portname = portname;
		this.timeout = timeout;
		this.baudRate = baudRate;

		this.cameras = {};       // indexed with integers starting at 1, so we use an object
		this.ipCameras = {};     // allows us to communicate with ip cameras too
		this.cameraCount = 0;

	}

	start() {
		if (this.started) return;

		// TODO: remove the hardcoded zoom settings
		// compute the zoom settings
		this.ZOOM_SETTINGS_INT = [];
		for (let a of this.ZOOM_SETTINGS) {
			let val = Buffer.from(a);
			this.ZOOM_SETTINGS_INT.push(val);
		}

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

	onOpen() { this.started = true; }
	onClose(e) { console.log(e); this.started = false; }
	onError(e) { console.log(e); this.started = false; }

	onData(packet) {
		// the socket parser gives us only full visca packets
		// (terminated with 0xff)
		console.log('Received: ', packet);
		// this.dump( packet, 'Received:' );

		// convert to command packet object
		let v = ViscaCommand.fromPacket(packet);

		// make sure we have this camera as an object
		if (!v.source in this.cameras) this.cameras[v.source] = new Camera();

		let camera = this.cameras[v.source];

		switch (v.msgType) {
			// the only time a reply is COMMAND is when the
			// command was IF_CLEAR
			case MSGTYPE_COMMAND:
				for (let cam of Object.values(this.cameras)) cam.clear()
				break;

			// network change message
			case MSGTYPE_NETCHANGE:
				// a camera issues this when it detects a change
				this.cmdAddressSet()
				break;

			// address set message, reset all cameras
			case MSGTYPE_ADDRESS_SET:
				this.cameraCount = v.data[0] - 1;
				this.cameras = {};
				for (let i = 0; i < this.cameraCount; i++) this.cameras[i + 1] = new Camera();
				this.inquireAll();
				break;

			// ack message, one of our commands was accepted and put in a buffer
			case MSGTYPE_ACK:
				camera.ack(v);
				return;

			// completion message
			case MSGTYPE_COMPLETE:
				camera.complete(v);
				break;

			// error messages
			case MSGTYPE_ERROR:
				camera.error(v);
				break;

			default:
				break;
		}

		this.emit('update');
	}

	// for debugging
	dump(packet, title = null) {
		if (!packet || packet.length == 0 || !this.DEBUG) return;

		header = packet[0];
		term = packet[packet.length - 2]; // last item
		qq = packet[1];

		sender = (header & 0b01110000) >> 4;
		broadcast = (header & 0b1000) >> 3;
		recipient = header & 0b0111;

		if (broadcast) recipient_s = "*";
		else recipient_s = str(recipient);

		console.log("-----");

		if (title) console.log(`packet (${title}) [${sender} => ${recipient_s}] len=${packet.length}: ${packet}`);
		else console.log(`packet [%d => %s] len=%d: %s` % (sender, recipient_s, packet.length, packet));

		console.log(` QQ.........: ${qq}`);

		if (qq == 0x01) console.log("              (Command)");
		if (qq == 0x09) console.log("              (Inquiry)");

		if (packet.length > 3) {
			rr = packet[2];
			console.log(` RR.........: ${rr}`);

			if (rr == 0x00) console.log("              (Interface)");
			if (rr == 0x04) console.log("              (Camera [1])");
			if (rr == 0x06) console.log("              (Pan/Tilter)");
		}
		if (packet.length > 4) {
			data = packet.slice(3);
			console.log(` Data.......: ${data}`);
		} else console.log(" Data.......: null");

		if (term !== 0xff) {
			console.log("ERROR: Packet not terminated correctly");
			return;
		}
		if (packet.length == 3 && (qq & 0b11110000) >> 4 == 4) {
			socketno = qq & 0b1111;
			console.log(` packet: ACK for socket ${socketno}`);
		}

		if (packet.length == 3 && (qq & 0b11110000) >> 4 == 5) {
			socketno = qq & 0b1111;
			console.log(` packet: COMPLETION for socket ${socketno}`);
		}

		if (packet.length > 3 && (qq & 0b11110000) >> 4 == 5) {
			socketno = qq & 0b1111;
			ret = packet.slice(2);
			console.log(` packet: COMPLETION for socket ${socketno}, data=${ret}`);
		}

		if (packet.length == 4 && (qq & 0b11110000) >> 4 == 6) {
			console.log(" packet: ERROR!");

			socketno = qq & 0b00001111;
			errcode = packet[2];

			//these two are special, socket is zero && has no meaning:
			if (errcode == 0x02 && socketno == 0) console.log("        : Syntax Error");
			if (errcode == 0x03 && socketno == 0) console.log("        : Command Buffer Full");

			if (errcode == 0x04) console.log(`        : Socket ${socketno}: Command canceled`);

			if (errcode == 0x05) console.log(`        : Socket ${socketno}: Invalid socket selected`);

			if (errcode == 0x41) console.log(`        : Socket ${socketno}: Command not executable`);
		}

		if (packet.length == 3 && qq == 0x38) console.log("Network Change - we should immediately issue a renumbering!");
	}

	write(packet) {
		if (!this.serialport.isOpen) return;
		this.serialport.write(packet);
		this.dump(packet, "Sent:");
	}

	// broadcast commands don't care about replies
	sendBroadcast(viscaCommand) {
		viscaCommand.broadcast = true;
		this.write(viscaCommand.toPacket());
	}

	sendToCamera(camera, viscaCommand) {
		camera.sendCommand(viscaCommand);
	}

	// for each camera queue all the inquiry commands
	// to get a full set of camera status data
	inquireAll() { }
}



module.exports = { ViscaController };