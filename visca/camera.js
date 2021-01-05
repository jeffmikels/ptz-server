require('./constants');

class CameraStatus {
	constructor(pan = 0, tilt = 0, zoom = 0, dzoom = false, effect = 0) {
		this.pan = pan;
		this.tilt = tilt;
		this.zoom = zoom;
		this.dzoom = dzoom;
		this.effect = effect;
	}
}

class Camera {
	// connection should support the socket interface => .write()
	constructor(index, connection) {
		this.index = index;
		this.connection = connection;
		this.cameraBuffers = {}
		this.sentCommands = [];            // FIFO stack for commands
		this.commandQueue = [];
		this.inquiryQueue = [];
		this.status = new CameraStatus();
		this.commandReady = true;             // true when camera can receive commands
		this.inquiryReady = true;

		this.updatetimer = 0;
	}

	_clear() { this.cameraBuffers = {}; this.sentCommands = []; }
	_update() {
		this._clearOldCommands();
		this.commandReady = !(1 in this.cameraBuffers || 2 in this.cameraBuffers);
		this.inquiryReady = !(0 in this.cameraBuffers);
		this._processQueue();
		if (this.inquiryQueue.length > 0 || this.commandQueue.length > 0) {
			clearTimeout(this.updatetimer);
			this.updatetimer = setTimeout(this._update, 20);
		}
	}

	// if a command in the stack is older than 2 seconds drop it
	_clearOldCommands() {
		let now = Date.now();
		while (this.sentCommands.length > 0) {
			if (now - this.sentCommands[0].addedAt < 1000) break;
			this.sentCommands.splice(0, 1);
		}
		for (let key of Object.keys(this.cameraBuffers)) {
			if (now - this.cameraBuffers[key].addedAt > 1000)
				this.sentCommands.splice(0, 1);
		}
	}

	_processQueue() {
		if (this.commandReady && this.commandQueue.length > 0) {
			this.sendCommand(this.commandQueue.splice(0, 1));
		}

		if (this.inquiryReady && this.inquiryQueue.length > 0) {
			this.sendCommand(this.inquiryQueue.splice(0, 1));
		}
	}

	// treat commands that don't send ack as if
	// they were stored in camera socket 0
	// because the parsed response will have socket 0.
	// other commands will be put on the stack until
	// the ack tells us which socket received it
	sendCommand(command) {
		// update the header data
		command.source = 0;
		command.recipient = this.index;
		command.broadcast = false;

		// add metadata so we can expire old commands
		command.addedAt = Date.now();

		let queued = false;


		// INTERFACE_DATA, ADDRESS_SET commands always get sent and aren't tracked
		// keep track of other commands in order, so we can match replies to commands
		if (command.msgType == MSGTYPE_INQUIRY) {
			// only allow one non-ack command at a time
			if (this.inquiryReady) {
				this.cameraBuffers[0] = command; // no ACK, only complete / error
			} else {
				this.inquiryQueue.push(command);
				queued = true;
			}
		} else if (command.msgType == MSGTYPE_COMMAND) {
			if (this.commandReady) {
				this.sentCommands.push(command); // not in a buffer until we get ACK
			} else {
				this.commandQueue.push(command);
				queued = true;
			}
		}

		if (!queued) this.connection.write(command.toPacket());
		this._update();
	}

	ack(viscaCommand) {
		// get the first viscaCommand that expects an ACK
		let cmd = this.sentCommands.splice(0, 1); // pops the head
		cmd.ack(); // run the command ACK callback if it exists
		this.cameraBuffers[viscaCommand.socket] = cmd;
		this._update();
	}

	complete(viscaCommand) {
		this.cameraBuffers[viscaCommand.socket].complete(viscaCommand.data);
		del(this.cameraBuffers[viscaCommand.socket]);
		this._update();
	}

	error(viscaCommand) {
		let message;
		let errorType = viscaCommand.data[0];
		switch (errorType) {
			case ERROR_SYNTAX:
				message = `syntax error, invalid command`
				break;
			case ERROR_BUFFER_FULL:
				message = `command buffers full`
				break;
			case ERROR_CANCELLED:
				// command was cancelled
				message = 'cancelled';
				break;
			case ERROR_INVALID_BUFFER:
				message = `socket cannot be cancelled`
				break;
			case ERROR_COMMAND_FAILED:
				message = `command failed`
				break;
		}
		console.log(`camera ${this.index}-${viscaCommand.socket}: ${message}`);
		this.cameraBuffers[viscaCommand.socket].error(errorType);
		del(this.cameraBuffers[viscaCommand.socket]);
		this._update();
	}
}

module.exports = { Camera }