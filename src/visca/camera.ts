
import { v4 as uuid } from 'uuid'
import { EventEmitter } from 'events'
import { ViscaCommand as Command, ViscaCommand } from './command'
import { Constants as C } from './constants'
import * as utils from './utils'
import { ViscaTransport } from './transport'

// export class CameraCommandBuffer {
// 	constructor(
// 		public command: ViscaCommand,
// 		public addedAt: number,
// 	) {}
// }

export interface PTSpeed {
	panSpeed: number,
	tiltSpeed: number,
}

export interface PTPos {
	panPos: number,
	tiltPos: number,
}

export interface AFInterval {
	movementTime: number,
	intervalTime: number
}

export class PTStatus {
	public initStatus: number;
	public initializing: boolean;
	public ready: boolean;
	public fail: boolean;

	public moveStatus: number;
	public moveDone: boolean;
	public moveFail: boolean;

	public atMaxL: boolean;
	public atMaxR: boolean;
	public atMaxU: boolean;
	public atMaxD: boolean;
	public moving: boolean;

	constructor() { }

	static fromData(data: number[]): PTStatus {
		let ret = new PTStatus();

		let [p, q, r, s] = utils.nibbles(data);

		ret.moveStatus = (q & C.PAN_MOVE_FAIL) >> 2;
		ret.initStatus = (p & C.PAN_INIT_FAIL);

		ret.atMaxL = (s & C.PAN_MAXL) > 0;
		ret.atMaxR = (s & C.PAN_MAXR) > 0;
		ret.atMaxU = (s & C.PAN_MAXU) > 0;
		ret.atMaxD = (s & C.PAN_MAXD) > 0;

		ret.moving = ret.moveStatus == 1;
		ret.moveDone = ret.moveStatus == 2;
		ret.moveFail = ret.moveStatus == 3;

		ret.initializing = ret.initStatus == 1;
		ret.ready = ret.initStatus == 2;
		ret.fail = ret.initStatus == 3;
		
		return ret;
	}
}

export class CamLensData {
	public zooming: boolean;
	public zoomPos: number;
	public digitalZoomEnabled: boolean;

	public focusing: boolean;
	public focusPos: number;
	public focusNearLimit: number;
	public autoFocusMode: number;
	public autoFocusSensitivity: number;
	public autoFocusEnabled: boolean;

	public lowContrast: boolean;
	public loadingPreset: boolean;

	constructor() { }

	static fromData(data: number[]): CamLensData {
		let c = new CamLensData();
		c.zoomPos = utils.v2i(data.slice(0, 4));
		c.focusNearLimit = utils.v2i(data.slice(4, 6));
		c.focusPos = utils.v2i(data.slice(6, 10));

		// no data is in byte 10
		let ww = data[11]; // byte 11 is byte 13 of the original full packet

		// 0-normal, 1-interval, 2-trigger
		c.autoFocusMode = (ww & 0b11000) >> 3;

		// 0-slow, 1-normal
		c.autoFocusSensitivity = (ww & 0b100) >> 2;

		c.digitalZoomEnabled = utils.testBit(ww, 0b10);
		c.autoFocusEnabled = utils.testBit(ww, 0b1);

		let vv = data[12];

		c.lowContrast = utils.testBit(vv, 0b1000);
		c.loadingPreset = utils.testBit(vv, 0b100);
		c.focusing = utils.testBit(vv, 0b10);
		c.zooming = utils.testBit(vv, 0b1);

		return c;
	}
}

export class CamImageData {
	public gain: number;
	public gainr: number;
	public gainb: number;
	public wbMode: number;
	public exposureMode: number;
	public shutterPos: number;
	public irisPos: number;
	public gainPos: number;
	public brightness: number;
	public exposureCompPosition: number;

	public highResEnabled: boolean;
	public wideDEnabled: boolean;
	public backlightCompEnabled: boolean;
	public exposureCompEnabled: boolean;
	public slowShutterAutoEnabled: boolean;
	constructor() { }

	static fromData(data: number[]) {
		let c = new CamImageData();
		c.gainr = utils.v2i(data.slice(0, 2))
		c.gainb = utils.v2i(data.slice(2, 4))
		c.wbMode = data[4];
		c.gain = data[5];
		c.exposureMode = data[6];
		c.shutterPos = data[8];
		c.irisPos = data[9];
		c.gainPos = data[10];
		c.brightness = data[11];
		c.exposureCompPosition = data[12];

		let aa = data[7];
		c.highResEnabled = utils.testBit(aa, 0b100000);
		c.wideDEnabled = utils.testBit(aa, 0b10000);
		c.backlightCompEnabled = utils.testBit(aa, 0b100);
		c.exposureCompEnabled = utils.testBit(aa, 0b10);
		c.slowShutterAutoEnabled = utils.testBit(aa, 0b1);

		return c;
	}
}

export class CamWideDParams {
	public screenDisplay: number;
	public detectionSensitivity: number;
	public shadowCorrectionLevel: number;
	public highlightCorrectionLevel: number;
	public exposureRatio: number;
	constructor() { }

	static fromData(data: number[]) {
		let c = new CamWideDParams();
		c.screenDisplay = data[0];
		c.detectionSensitivity = data[1];
		c.shadowCorrectionLevel = data[2];
		c.highlightCorrectionLevel = data[3];
		c.exposureRatio = (data[4]<<4) | data[5]; // 1-64
		return c;
	}
}

// TODO: Convert most "number" fields to semantic names
// using an enum or at least semantic map on the constants class
export class CameraStatus {
	// fields obtained from PTStatus are only
	// inquire-able under that namespace, so
	// we leave them there
	panTiltStatus: PTStatus;

	// == fields obtained from CamLensData;
	zooming: boolean;
	zoomPos: number;
	digitalZoomEnabled: boolean;

	focusing: boolean;
	focusPos: number;
	focusNearLimit: number;
	autoFocusEnabled: boolean; // you can always send a "trigger" event for one-time autofocus
	autoFocusSensitivity: number;

	lowContrast: boolean;
	loadingPreset: boolean;

	// == fields obtained from CamImageData inquiry
	rGain: number;
	bGain: number;
	apertureGain: number;
	wbMode: number;
	exposureMode: number;
	shutterPos: number;
	irisPos: number;
	gainPos: number;
	brightness: number;
	
	highResEnabled: boolean;
	wideDEnabled: boolean; // block inquiry responds 0 for off, 1, for all others
	backlightCompEnabled: boolean;
	exposureCompEnabled: boolean;
	exposureCompPosition: number;
	slowShutterAutoEnabled: boolean;
	

	// == items only available through specific inquiries
	powerStatus: boolean;

	ptPos: PTPos;
	ptSpeed: PTSpeed;
	
	icrMode: boolean;
	icrAutoMode: boolean;
	icrThreshold: number;
	gainLimit: number;
	
	autoFocusMode: number; // 0x00, 0x01, 0x02 (normal (on movement), interval, on zoom)
	autoFocusIntervalTime: number;
	
	focusIRCorrection: number;
	wideDMode: number; // wide dynamic range mode can be on, off, auto (0), 
	wideDParams: CamWideDParams;
	
	noiseReductionLevel: number;
	highSensitivityEnabled: boolean;
	frozen: boolean;

	effect: number;
	digitalEffect: number;
	digitalEffectLevel: number;
	chromaSuppressLevel: number;

	cameraID: number;
	colorGain: number;
	colorHue: number;

	videoFormatNow: number;
	videoFormatNext: number;

	constructor() { }

	// takes CamImageData
	updateImageData(	imageData: CamImageData ) {
		this.rGain = imageData.gainr;
		this.bGain = imageData.gainb;
		this.apertureGain = imageData.gain;
		this.wbMode = imageData.wbMode;
		this.exposureMode = imageData.exposureMode;
		this.shutterPos = imageData.shutterPos;
		this.irisPos = imageData.irisPos;
		this.gainPos = imageData.gainPos;
		this.brightness = imageData.brightness;
		this.exposureCompPosition = imageData.exposureCompPosition;

		this.highResEnabled = imageData.highResEnabled;
		this.wideDEnabled = imageData.wideDEnabled;
		this.backlightCompEnabled = imageData.backlightCompEnabled;
		this.exposureCompEnabled = imageData.exposureCompEnabled;
		this.exposureCompPosition = imageData.exposureCompPosition;
		this.slowShutterAutoEnabled = imageData.slowShutterAutoEnabled;
	}

	updateLensData(lensData: CamLensData) {
		this.zooming = lensData.zooming;
		this.zoomPos = lensData.zoomPos;
		this.digitalZoomEnabled = lensData.digitalZoomEnabled;

		this.focusing = lensData.focusing;
		this.focusPos = lensData.focusPos;
		this.focusNearLimit = lensData.focusNearLimit;
		this.autoFocusMode = lensData.autoFocusMode;
		this.autoFocusSensitivity = lensData.autoFocusSensitivity;
		this.autoFocusEnabled = lensData.autoFocusEnabled;

		this.lowContrast = lensData.lowContrast;
		this.loadingPreset = lensData.loadingPreset;
	}

	// updatePTStatus() {
	// 	this.initStatus = ptStatus.initStatus;
	// 	this.initializing = ptStatus.initializing;
	// 	this.ready = ptStatus.ready;
	// 	this.fail = ptStatus.fail;

	// 	this.moveStatus = ptStatus.moveStatus;
	// 	this.moveDone = ptStatus.moveDone;
	// 	this.moveFail = ptStatus.moveFail;

	// 	this.atMaxL = ptStatus.atMaxL;
	// 	this.atMaxR = ptStatus.atMaxR;
	// 	this.atMaxU = ptStatus.atMaxU;
	// 	this.atMaxD = ptStatus.atMaxD;
	// 	this.moving = ptStatus.moving;
	// }
}

export class Camera extends EventEmitter {
	index: number;
	uuid: string;
	transport: ViscaTransport;

	// keep track of the camera status here
	status: CameraStatus;

	// used to track commands received by cameras
	cameraBuffers:{ [index:string]: ViscaCommand};

	// commands sent to camera waiting for ACK/DONE
	sentCommands: ViscaCommand[];

	// commands queued here before sending to camera
	commandQueue: ViscaCommand[];
	inquiryQueue: ViscaCommand[];
	
	// is this camera open to receiving commands?
	commandReady: boolean;
	inquiryReady: boolean;

	// we use the timer to send buffered commands
	updatetimer: NodeJS.Timeout;

	// transport should support the socket interface => .send(ViscaCommand)
	constructor(index: number, transport: ViscaTransport) {
		super();
		// typescript only infers these if the constructor arguments
		// use the public or private keyword
		this.index = index;
		this.transport = transport;
		this.cameraBuffers = {}
		this.sentCommands = [];            // FIFO stack for commands
		this.commandQueue = [];
		this.inquiryQueue = [];
		this.status = new CameraStatus();
		this.commandReady = true;             // true when camera can receive commands
		this.inquiryReady = true;

		// UDPTransports provide a unique uuid
		this.uuid = transport.uuid ?? index.toString();
	}

	_clear() { this.cameraBuffers = {}; this.sentCommands = []; }

	_update() {
		this.updatetimer = null;
		this._expireOldCommands();
		this._processQueue();
		this.emit('update');
	}

	_updateBooleans() {
		this.commandReady = !('1' in this.cameraBuffers || '2' in this.cameraBuffers);
		this.inquiryReady = !('0' in this.cameraBuffers);
	}

	// if a command in the stack is older than 200ms drop it
	_expireOldCommands() {
		let now = Date.now();

		// the first command is always the oldest
		while (this.sentCommands.length > 0) {
			if (now - this.sentCommands[0].sentAt < C.COMMAND_TIMEOUT) break;
			this.sentCommands.splice(0, 1);
		}

		// check all cameraBuffers
		for (let key of Object.keys(this.cameraBuffers)) {
			if (now - this.cameraBuffers[key].sentAt > C.COMMAND_TIMEOUT)
				delete this.cameraBuffers[key];
		}
	}

	_processQueue() {
		this._updateBooleans();
		if (this.commandReady && this.commandQueue.length > 0) {
			let [ cmd ] = this.commandQueue.splice(0, 1);
			this.sendCommand(cmd);
		}

		if (this.inquiryReady && this.inquiryQueue.length > 0) {
			let [ cmd ] = this.inquiryQueue.splice(0, 1);
			this.sendCommand(cmd);
		}
	}

	_scheduleUpdate() {
		if (this.updatetimer != null) return;
		if (this.inquiryQueue.length > 0 || this.commandQueue.length > 0) {
			this.updatetimer = setTimeout(this._update, 25);
		}
	}

	// treat commands that don't send ack as if
	// they were stored in camera socket 0
	// because the parsed response will have socket 0.
	// other commands will be put on the stack until
	// the ack tells us which socket received it
	sendCommand(command:ViscaCommand) {
		// update the header data
		command.source = 0;
		command.recipient = this.index;
		command.broadcast = false;

		command.addedAt = Date.now();

		let queued = false;

		// INTERFACE_DATA, ADDRESS_SET commands always get sent and aren't tracked
		// keep track of other commands in order, so we can match replies to commands
		if (command.msgType == C.MSGTYPE_INQUIRY) {
			// only allow one non-ack command at a time
			if (this.inquiryReady) {
				this.cameraBuffers['0'] = command; // no ACK, only complete / error
			} else {
				this.inquiryQueue.push(command);
				queued = true;
			}
		} else if (command.msgType == C.MSGTYPE_COMMAND) {
			if (this.commandReady) {
				this.sentCommands.push(command); // not in a buffer until we get ACK
			} else {
				this.commandQueue.push(command);
				queued = true;
			}
		}

		if (queued) {
			this._scheduleUpdate();
		} else {
			command.sentAt = Date.now();
			this.transport.write(command);
		}
	}

	ack(viscaCommand: ViscaCommand) {
		// get the first viscaCommand that expects an ACK
		let [cmd] = this.sentCommands.splice(0, 1); // gets the head
		cmd.ack(); // run the command ACK callback if it exists
		this.cameraBuffers[viscaCommand.socket] = cmd;
		this._scheduleUpdate();
	}

	complete(viscaCommand:ViscaCommand) {
		let key = viscaCommand.socket.toString();
		this.cameraBuffers[key].complete(viscaCommand.data);
		delete this.cameraBuffers[key];
		this._scheduleUpdate();
	}

	error(viscaCommand:ViscaCommand) {
		let message;
		let errorType = viscaCommand.data[0];
		let socketKey = viscaCommand.socket.toString();
		switch (errorType) {
			case C.ERROR_SYNTAX:
				message = `syntax error, invalid command`
				break;
			case C.ERROR_BUFFER_FULL:
				message = `command buffers full`
				break;
			case C.ERROR_CANCELLED:
				// command was cancelled
				message = 'cancelled';
				break;
			case C.ERROR_INVALID_BUFFER:
				message = `socket cannot be cancelled`
				break;
			case C.ERROR_COMMAND_FAILED:
				message = `command failed`
				break;
		}
		console.log(`camera ${this.index}-${viscaCommand.socket}: ${message}`);
		this.cameraBuffers[socketKey].error(message);
		delete (this.cameraBuffers[socketKey]);
		this._update();
	}

	inquireAll() {
		this.getPower();      // single command
		this.getPTStatus();  // block inquiry command
		this.getLensData();       // block inquiry
		this.getImageData();      // block inquiry
	
		// multiple individual queries
		this.getPTPos();
		this.getPTSpeed();
		this.getICRMode();
		this.getICRAutoMode();
		this.getICRThreshold();
		this.getGainLimit();
		this.getFocusAutoMode();
		this.getFocusAutoIntervalTime();
		this.getFocusIRCorrection();
		this.getWideDStatus();
		this.getWideDParams();
		this.getNoiseReductionStatus();
		this.getHighSensitivityStatus();
		this.getFreezeStatus();
		this.getEffect();
		this.getEffectDigital();
		this.getEffectDigitalLevel();
		this.getChromaSuppressStatus();
		this.getID();
		this.getColorGain();
		this.getColorHue();
		this.getVideoFormatNow();
		this.getVideoFormatNext();
	}

	// camera specific inquiry commands
	// ---------------- Inquiries ---------------------------
	getPower() { let v = Command.inqCameraPower(this.index, (data) => { this.status.powerStatus = data }); this.sendCommand(v); }
	getICRMode() { let v = Command.inqCameraICRMode(this.index, (data) => { this.status.icrMode = data }); this.sendCommand(v); }
	getICRAutoMode() { let v = Command.inqCameraICRAutoMode(this.index, (data) => { this.status.icrAutoMode = data }); this.sendCommand(v); }
	getICRThreshold() { let v = Command.inqCameraICRThreshold(this.index, (data) => { this.status.icrThreshold = data }); this.sendCommand(v); }
	getGainLimit() { let v = Command.inqCameraGainLimit(this.index, (data) => { this.status.gainLimit = data }); this.sendCommand(v); }
	getGain() { let v = Command.inqCameraGain(this.index, (data) => { this.status.apertureGain = data }); this.sendCommand(v); }
	getGainR() { let v = Command.inqCameraGainR(this.index, (data) => { this.status.rGain = data }); this.sendCommand(v); }
	getGainB() { let v = Command.inqCameraGainB(this.index, (data) => { this.status.bGain = data }); this.sendCommand(v); }

	getDZoomMode() { let v = Command.inqCameraDZoomMode(this.index, (data) => { this.status.digitalZoomEnabled = data }); this.sendCommand(v); }
	getZoomPos() { let v = Command.inqCameraZoomPos(this.index, (data) => { this.status.zoomPos = data }); this.sendCommand(v); }

	getFocusAutoStatus() { let v = Command.inqCameraFocusAutoStatus(this.index, (data) => { this.status.autoFocusEnabled = data }); this.sendCommand(v); }
	getFocusAutoMode() { let v = Command.inqCameraFocusAutoMode(this.index, (data) => { this.status.autoFocusMode = data }); this.sendCommand(v); }
	getFocusIRCorrection() { let v = Command.inqCameraFocusIRCorrection(this.index, (data) => { this.status.focusIRCorrection = data }); this.sendCommand(v); }
	getFocusPos() { let v = Command.inqCameraFocusPos(this.index, (data) => { this.status.focusPos = data }); this.sendCommand(v); }
	getFocusNearLimit() { let v = Command.inqCameraFocusNearLimit(this.index, (data) => { this.status.focusNearLimit = data }); this.sendCommand(v); }
	getFocusAutoIntervalTime() { let v = Command.inqCameraFocusAutoIntervalTime(this.index, (data) => { this.status.autoFocusIntervalTime = data }); this.sendCommand(v); }
	getFocusSensitivity() { let v = Command.inqCameraFocusSensitivity(this.index, (data) => { this.status.autoFocusSensitivity = data }); this.sendCommand(v); }

	getWBMode() { let v = Command.inqCameraWBMode(this.index, (data) => { this.status.wbMode = data }); this.sendCommand(v); }
	getExposureMode() { let v = Command.inqCameraExposureMode(this.index, (data) => { this.status.exposureMode = data }); this.sendCommand(v); }
	getShutterSlowMode() { let v = Command.inqCameraShutterSlowMode(this.index, (data) => { this.status.slowShutterAutoEnabled = data }); this.sendCommand(v); }
	getShutter() { let v = Command.inqCameraShutterPos(this.index, (data) => { this.status.shutterPos = data }); this.sendCommand(v); }
	getIris() { let v = Command.inqCameraIris(this.index, (data) => { this.status.irisPos = data }); this.sendCommand(v); }
	getBrightness() { let v = Command.inqCameraBrightness(this.index, (data) => { this.status.brightness = data }); this.sendCommand(v); }
	getExposureCompStatus() { let v = Command.inqCameraExposureCompStatus(this.index, (data) => { this.status.exposureCompEnabled = data }); this.sendCommand(v); }
	getExposureCompPosition() { let v = Command.inqCameraExposureCompPosition(this.index, (data) => { this.status.exposureCompPosition = data }); this.sendCommand(v); }
	getBacklightStatus() { let v = Command.inqCameraBacklightStatus(this.index, (data) => { this.status.backlightCompEnabled = data }); this.sendCommand(v); }

	getWideDStatus() { let v = Command.inqCameraWideDMode(this.index, (data) => { this.status.wideDMode = data; this.status.wideDEnabled = (data != 0); }); this.sendCommand(v); }
	getWideDParams() { let v = Command.inqCameraWideDParams(this.index, (data) => { this.status.wideDParams = data }); this.sendCommand(v); }

	getAperture() { let v = Command.inqCameraAperture(this.index, (data) => { this.status.apertureGain = data }); this.sendCommand(v); }
	getHighResStatus() { let v = Command.inqCameraHighResStatus(this.index, (data) => { this.status.highResEnabled = data }); this.sendCommand(v); }
	getNoiseReductionStatus() { let v = Command.inqCameraNoiseReductionStatus(this.index, (data) => { this.status.noiseReductionLevel = data }); this.sendCommand(v); }
	getHighSensitivityStatus() { let v = Command.inqCameraHighSensitivityStatus(this.index, (data) => { this.status.highSensitivityEnabled = data }); this.sendCommand(v); }
	getFreezeStatus() { let v = Command.inqCameraFreezeStatus(this.index, (data) => { this.status.frozen = data }); this.sendCommand(v); }
	getEffect() { let v = Command.inqCameraEffect(this.index, (data) => { this.status.effect = data }); this.sendCommand(v); }
	getEffectDigital() { let v = Command.inqCameraEffectDigital(this.index, (data) => { this.status.digitalEffect = data }); this.sendCommand(v); }
	getEffectDigitalLevel() { let v = Command.inqCameraEffectDigitalLevel(this.index, (data) => { this.status.digitalEffectLevel = data }); this.sendCommand(v); }

	getID() { let v = Command.inqCameraID(this.index, (data) => { this.status.cameraID = data }); this.sendCommand(v); }
	getChromaSuppressStatus() { let v = Command.inqCameraChromaSuppressStatus(this.index, (data) => { this.status.chromaSuppressLevel = data }); this.sendCommand(v); }
	getColorGain() { let v = Command.inqCameraColorGain(this.index, (data) => { this.status.colorGain = data }); this.sendCommand(v); }
	getColorHue() { let v = Command.inqCameraColorHue(this.index, (data) => { this.status.colorHue = data }); this.sendCommand(v); }

	// these use op commands
	getVideoFormatNow() { let v = Command.inqVideoFormatNow(this.index, (data) => { this.status.videoFormatNow = data }); this.sendCommand(v); }
	getVideoFormatNext() { let v = Command.inqVideoFormatNext(this.index, (data) => { this.status.videoFormatNext = data }); this.sendCommand(v); }

	getPTPos() { let v = Command.inqCameraPanTiltPos(this.index, (data) => { this.status.ptPos = data; }); this.sendCommand(v); }
	getPTSpeed() { let v = Command.inqCameraPanTiltSpeed(this.index, (data) => { this.status.ptSpeed = data }); this.sendCommand(v); }
	getPTStatus() { let v = Command.inqCameraPanTiltStatus(this.index, (data) => { this.status.panTiltStatus = data }); this.sendCommand(v); }

	// block inquiry commands
	getLensData() { let v = Command.inqCameraLens(this.index, (data) => { this.status.updateLensData(data); }); this.sendCommand(v); }
	getImageData() { let v = Command.inqCameraImage(this.index, (data) => { this.status.updateImageData(data); }); this.sendCommand(v); }
}
