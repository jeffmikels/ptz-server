// import and create an alias
const { Constants: C } = require('./constants');

// according to the documentation:
// https://ptzoptics.com/wp-content/uploads/2014/09/PTZOptics-VISCA-over-IP-Commands-Rev1_0-5-18.pdf
// and from https://www.epiphan.com/userguides/LUMiO12x/Content/UserGuides/PTZ/3-operation/Commands.htm
// and from the Sony EVI H100S User Manual
//
// |------packet (3-16 bytes)---------|
// header     message        terminator
// (1 byte)   (1-14 bytes)     (1 byte)
// | X | X . . . . .  . . . . . X | X |

// HEADER:
// addressed header
// header bits:                  terminator:
// 1 s2 s1 s0 0 r2 r1 r0         0xff
// with r,s = recipient, sender msb first (big endian for bytes and bits)
//
// broadcast header is always 0x88!

// CONTROL MESSAGE FORMAT
// QQ RR ...
// QQ = 0x01 (Command) or 0x09 (Inquiry)
// RR = 0x00 (interface), 0x04 (camera), 0x06 (pan/tilt), 0x7(d|e) other
// ... data

// REPLY MESSAGE FORMAT
// Camera responses come in three types
// COMMAND ACK:      header 0x4y      0xff -- command accepted, y = socket (index of command in buffer)
// COMMAND COMPLETE: header 0x5y      0xff -- command executed, y = socket (index of buffered command)
// INQUIRY COMPLETE: header 0x50 data 0xff -- inquiry response data
class Command {
	constructor(opts = {}) {
		opts = this._mergeDefaults(opts)

		// header items
		this.source = opts.source & 0b111;       // only 0-7 allowed
		this.recipient = opts.recipient;         // -1 for broadcast
		this.broadcast = opts.broadcast == true;

		// message type is the QQ in the spec
		this.msgType = opts.msgType & 0b11111111; // one byte allowed
		this.socket = opts.socket & 0b111;

		// data might be empty
		this.dataType = opts.dataType;
		this.data = opts.data;

		this.onComplete = opts.onComplete;
		this.onError = opts.onError;
		this.onAck = opts.onAck;
		this.dataParser = opts.dataParser;
		this.status = 0;
	}

	static fromPacket(packet) {
		let v = new Command();
		v._parsePacket(packet);
		return v;
	}

	static raw(recipient, raw) {
		let v = new Command({ recipient });
		v._parsePacket([v.header(), ...raw, 0xff]);
		return v;
	}

	// use recipient -1 for broadcast
	static shortcut(recipient = -1, msgType = 0x00, dataType = 0x00, data = [], callbacks = {}) {
		let { onComplete, onError, onAck } = callbacks;
		let broadcast = (recipient == -1);
		let v = new Command({
			recipient, broadcast, msgType, dataType, data, onComplete, onError, onAck
		});
		return v;
	}

	// defaults to an invalid command
	_mergeDefaults(opts = {}) {
		if (opts.broadcast) opts.recipient = -1;
		if (opts.recipient > -1) opts.broadcast = false;
		let defaults = {
			source: 0,
			recipient: -1,
			broadcast: true,
			msgType: C.MSGTYPE_COMMAND,
			socket: 0,
			dataType: 0,
			data: [],
			onComplete: null,
			onError: null,
			onAck: null,
			dataParser: null,
		}
		for (let key in Object.keys(defaults)) {
			defaults[key] = opts[key] ?? defaults[key];
		}
		return defaults;
	}

	_parsePacket(packet) {
		let header = packet[0];
		this.source = (header & C.HEADERMASK_SOURCE) >> 4
		this.recipient = header & C.HEADERMASK_RECIPIENT; // replies have recipient
		this.broadcast = ((header & C.HEADERMASK_BROADCAST) >> 3) == 1;
		switch (packet[1]) {
			case C.MSGTYPE_COMMAND:
			case C.MSGTYPE_INQUIRY:
			case C.MSGTYPE_ADDRESS_SET:
			case C.MSGTYPE_NETCHANGE:
				this.msgType = packet[1];
				this.socket = 0;
				break;
			default:
				this.socket = packet[1] & 0b00001111;
				this.msgType = packet[1] & 0b11110000;
		}
		this.data = packet.slice(2, packet.length - 1); // might be empty, ignore terminator

		// if data is more than one byte, the first byte determines the dataType
		this.dataType = (data.length < 2) ? 0 : data.splice(0, 1);
	}

	// instance methods
	header() {
		let header = 0x88;
		// recipient overrides broadcast
		if (this.recipient > -1) this.broadcast = false;
		if (!this.broadcast) {
			header = 0b10000000 | (this.source << 4) | (this.recipient & 0x111);
		}
		return header;
	}

	toPacket() {
		let header = this.header();
		let qq = this.msgType | this.socket;
		let rr = this.dataType;
		if (rr > 0)
			return Buffer.from([header, qq, rr, ...this.data, 0xff]);
		else
			return Buffer.from([header, qq, ...this.data, 0xff]);
	}

	send(transport) {
		transport.write(this.toPacket());
	}

	ack() {
		this.status = C.MSGTYPE_ACK;
		if (this.onAck != null) this.onAck();
	}

	error() {
		this.status = C.MSGTYPE_ERROR;
		if (this.onError != null) this.onError();
	}

	// some command completions include data
	complete(data = null) {
		this.status = C.MSGTYPE_COMPLETE;
		if (this.dataParser != null && data != null) {
			data = this.dataParser(data);
		}
		if (this.onComplete != null) {
			if (data == null || data.length == 0)
				this.onComplete();
			else
				this.onComplete(data);
		}
	}

	// commands for each message type
	static addressSet() {
		return new Command({ msgType: C.MSGTYPE_ADDRESS_SET, data: [1] });
	}
	static cmd(recipient = -1, dataType, data = []) {
		return new Command({ msgType: C.MSGTYPE_COMMAND, dataType, recipient, data });
	}
	static inquire(recipient = -1, dataType, data, dataParser) {
		return new Command({ msgType: C.MSGTYPE_INQUIRY, dataType, recipient, data, dataParser });
	}
	static cancel(recipient = -1, socket = 0) {
		return new Command({ msgType: C.MSGTYPE_CANCEL | socket, recipient });
	}


	// commands for each datatype
	static cmdInterfaceClearAll(recipient = -1) {
		return Command.cmd(recipient, C.DATATYPE_INTERFACE, [0, 1]);
	}
	static cmdCamera(recipient = -1, data = []) {
		return Command.cmd(recipient, C.DATATYPE_CAMERA, data);
	}
	static cmdOp(recipient = -1, data = []) {
		return Command.cmd(recipient, C.DATATYPE_OPERATION, data);
	}
	static inqCamera(recipient = -1, query, dataParser) {
		return Command.inquire(recipient, C.DATATYPE_CAMERA, query, dataParser);
	}
	static inqOp(recipient = -1, query, dataParser) {
		return Command.inquire(recipient, C.DATATYPE_OPERATION, query, dataParser);
	}


	// ----------------------- Setters -------------------------------------

	// POWER ===========================
	static cmdCameraPower(recipient, enable = false) {
		let powerval = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subcmd = [C.CAM_POWER, powerval];
		return Command.cmdCamera(recipient, subcmd);
	}
	static cmdCameraPowerAutoOff(device, time = 0) {
		// time = minutes without command until standby
		// 0: disable
		// 0xffff: 65535 minutes
		let subcmd = [0x40, ...i2v(time)];
		return Command.cmdCamera(device, subcmd)
	}

	// PRESETS =========================
	// Store custom presets if the camera supports them
	// PTZOptics can store presets 0-127
	// Sony has only 0-5
	static cmdCameraPresetReset(device, preset = 0) {
		let subcmd = [C.CAM_MEMORY, 0x00, preset];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraPresetSet(device, preset = 0) {
		let subcmd = [C.CAM_MEMORY, 0x01, preset];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraPresetRecall(device, preset = 0) {
		let subcmd = [C.CAM_MEMORY, 0x02, preset];
		return Command.cmdCamera(device, subcmd);
	}

	// PAN/TILT ===========================
	// 8x 01 06 01 VV WW XX YY FF
	// VV = x(pan) speed  1-18
	// WW = y(tilt) speed 1-17
	// XX = x mode 01 (dec), 02 (inc), 03 (stop)
	// YY = y mode 01 (dec), 02 (inc), 03 (stop)
	// x increases rightward
	// y increases downward!!
	static cmdCameraPanTilt(device, xspeed, yspeed, xmode, ymode) {
		let subcmd = [C.OP_PAN_DRIVE, xspeed, yspeed, xmode, ymode];
		return Command.cmdOp(device, subcmd);
	}
	// x and y are signed 16 bit integers, 0x0000 is center
	// range is -2^15 - 2^15 (32768)
	// relative defaults to false
	static cmdCameraPanTiltDirect(device, xspeed, yspeed, x, y, relative = false) {
		let xpos = si2v(x);
		let ypos = si2v(y);
		let absrel = relative ? C.OP_PAN_RELATIVE : C.OP_PAN_ABSOLUTE;
		let subcmd = [absrel, xspeed, yspeed, ...xpos, ...ypos];
		return Command.cmdOp(device, subcmd);
	}
	static cmdCameraPanTiltHome(device) { return Command.cmdOp(device, [C.OP_PAN_HOME]) }
	static cmdCameraPanTiltReset(device) { return Command.cmdOp(device, [C.OP_PAN_RESET]) }
	// corner should be C.DATA_PANTILT_UR or C.DATA_PANTILT_BL
	static cmdCameraPanTiltLimitSet(device, corner, x, y) {
		x = si2v(x);
		y = si2v(y);
		let subcmd = [C.OP_PAN_LIMIT, 0x00, corner, ...x, ...y];
		return Command.cmdOp(device, subcmd);
	}
	static cmdCameraPanTiltLimitClear(device, corner) {
		let subcmd = [C.OP_PAN_LIMIT, 0x01, corner, 0x07, 0x0F, 0x0F, 0x0F, 0x07, 0x0F, 0x0F, 0x0F];
		return Command.cmdOp(device, subcmd);
	}

	// ZOOM ===============================
	/// offinout = 0x00, 0x02, 0x03
	/// speed = 0(low)..7(high) (-1 means default)
	static cmdCameraZoom(device, offinout = 0x00, speed = -1) {
		let data = offinout;
		if (speed > -1 && offinout != 0x00) data = (data << 8) + (speed & 0b111)
		let subcmd = [C.CAM_ZOOM, data];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraZoomStop(device) {
		return Command.cmdCameraZoom(device, 0x00);
	}
	/// zoom in with speed = 0..7 (-1 means default)
	static cmdCameraZoomIn(device, speed = -1) {
		return Command.cmdCameraZoom(device, C.DATA_ZOOMIN, speed);
	}
	/// zoom out with speed = 0..7 (-1 means default)
	static cmdCameraZoomOut(device, speed = -1) {
		return Command.cmdCameraZoom(device, C.DATA_ZOOMOUT, speed);
	}

	/// max zoom value is 0x4000 (16384) unless digital is enabled
	/// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
	static cmdCameraZoomDirect(device, zoomval) {
		let subcmd = [C.CAM_ZOOM_DIRECT, ...i2v(zoomval)];
		return Command.cmdCamera(device, subcmd);
	}

	// Digital Zoom enable/disable
	static cmdCameraDigitalZoom(device, enable = false) {
		let data = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subcmd = [C.CAM_DZOOM, data];
		return Command.cmdCamera(device, subcmd);
	}

	// Focus controls

	/// stopfarnear = 0x00, 0x02, 0x03
	/// speed = 0(low)..7(high) -1 means default
	static cmdCameraFocus(device, stopfarnear = 0x00, speed = -1) {
		let data = stopfarnear;
		if (speed > -1 && stopfarnear != 0x00) data = (data << 8) + (speed & 0b111)
		let subcmd = [C.CAM_ZOOM, data];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusStop(device) {
		return Command.cmdCameraFocus(device, 0x00);
	}
	/// zoom in with speed = 0..7 (-1 means default)
	static cmdCameraFocusFar(device, speed = -1) {
		return Command.cmdCameraFocus(device, C.DATA_FOCUSFAR, speed);
	}
	/// zoom out with speed = 0..7 (-1 means default)
	static cmdCameraFocusNear(device, speed = -1) {
		return Command.cmdCameraFocus(device, C.DATA_FOCUSNEAR, speed);
	}
	/// max focus value is 0xF000
	/// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
	static cmdCameraFocusDirect(device, focusval) {
		let subcmd = [C.CAM_FOCUS_DIRECT, ...i2v(focusval)];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusAuto(device, enable = true) {
		let data = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subcmd = [C.CAM_FOCUS_AUTO, data];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusAutoManual(device) {
		let subcmd = [C.CAM_FOCUS_AUTO, C.DATA_TOGGLEVAL];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusAutoTrigger(device) {
		let subcmd = [C.CAM_FOCUS_TRIGGER, 0x01];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusInfinity(device) {
		let subcmd = [C.CAM_FOCUS_TRIGGER, 0x02];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusSetNearLimit(device, limit = 0xf000) {
		// limit must have low byte 0x00
		limit = limit & 0xff00;
		let subcmd = [C.CAM_FOCUS_NEAR_LIMIT_POS, ...i2v(limit)]
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusAutoSensitivity(device, high = true) {
		let data = high ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subcmd = [C.CAM_FOCUS_SENSE_HIGH, data];
		return Command.cmdCamera(device, subcmd);
	}
	/// mode = 0 (normal), 1 (interval), 2 (trigger)
	static cmdCameraFocusAutoMode(device, mode = 0) {
		let subcmd = [C.CAM_FOCUS_AF_MODE, mode];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusAutoIntervalTime(device, movementTime = 0, intervalTime = 0) {
		let pqrs = (movementTime << 8) + intervalTime;
		let subcmd = [C.CAM_FOCUS_AF_INTERVAL, ...i2v(pqrs)];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraFocusIRCorrection(device, enable = false) {
		let data = enable ? 0x00 : 0x01;
		let subcmd = [C.CAM_FOCUS_IR_CORRECTION, data];
		return Command.cmdCamera(device, subcmd);
	}

	// combo zoom & focus
	static cmdCameraZoomFocus(device, zoomval = 0, focusval = 0) {
		let z = i2v(zoomval);
		let f = i2v(focusval);
		let subcmd = [C.CAM_ZOOM_DIRECT, ...z, ...f];
		return Command.cmdCamera(device, subcmd);
	}


	// OTHER IMAGE CONTROLS

	/// white balance
	/// mode = 0(auto),1(indoor),2(outdoor),3(trigger),5(manual) 
	static cmdCameraWBMode(device, mode = 0) {
		let subcmd = [C.CAM_WB_MODE, mode];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraWBTrigger(device) {
		let subcmd = [C.CAM_WB_TRIGGER, 0x05];
		return Command.cmdCamera(device, subcmd);
	}

	// VARIOUS EXPOSURE CONTROLS

	/// mode should be 'r' for RGain, 'b' for BGain. defaults to Gain
	/// resetupdown = 0, 2, 3
	/// value must be less than 0xff;
	static cmdCameraGain(device, mode = 'r', resetupdown = 0, directvalue = -1) {
		let subcmd;
		let gaintype;
		switch (mode) {
			case 'r':
				gaintype = C.CAM_RGAIN;
				break;
			case 'b':
				gaintype = C.CAM_BGAIN;
				break;
			default:
				gaintype = C.CAM_GAIN;
				break;
		}
		if (directvalue > 0) {
			gaintype += 0x40;
			subcmd = [gaintype, ...i2v(directvalue)]
		} else {
			subcmd = [gaintype, resetupdown]
		}
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraGainUp(device) { let mode = ''; return Command.cmdCameraGain(device, mode, C.DATA_ONVAL); }
	static cmdCameraGainDown(device) { let mode = ''; return Command.cmdCameraGain(device, mode, C.DATA_OFFVAL); }
	static cmdCameraGainReset(device) { let mode = ''; return Command.cmdCameraGain(device, mode, 0x00); }
	static cmdCameraGainDirect(device, value) { let mode = 'r'; return Command.cmdCameraGain(device, mode, 0x00, value); }
	static cmdCameraGainRUp(device) { let mode = 'r'; return Command.cmdCameraGain(device, mode, C.DATA_ONVAL); }
	static cmdCameraGainRDown(device) { let mode = 'r'; return Command.cmdCameraGain(device, mode, C.DATA_OFFVAL); }
	static cmdCameraGainRReset(device) { let mode = 'r'; return Command.cmdCameraGain(device, mode, 0x00); }
	static cmdCameraGainRDirect(device, value) { let mode = 'r'; return Command.cmdCameraGain(device, mode, 0x00, value); }
	static cmdCameraGainBUp(device) { let mode = 'b'; return Command.cmdCameraGain(device, mode, C.DATA_ONVAL); }
	static cmdCameraGainBDown(device) { let mode = 'b'; return Command.cmdCameraGain(device, mode, C.DATA_OFFVAL); }
	static cmdCameraGainBReset(device) { let mode = 'b'; return Command.cmdCameraGain(device, mode, 0x00); }
	static cmdCameraGainBDirect(device, value) { let mode = 'b'; return Command.cmdCameraGain(device, mode, 0x00, value); }
	/// gain value is from 4-F
	static cmdCameraGainLimit(device, value) {
		let subcmd = [C.CAM_GAIN_LIMIT, value];
		return Command.cmdCamera(device, subcmd);
	}

	// EXPOSURE =======================

	/// mode = 0, 3, A, B, D
	/// auto, manual, shutter priority, iris priority, bright
	static cmdCameraExposureMode(device, mode = 0x00) {
		let subcmd = [C.CAM_EXPOSURE_MODE, mode];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraExposureCompensationEnable(device, enable = true) {
		let subcmd = [C.CAM_EXP_COMP_ENABLE, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraExposureCompensationAdjust(device, resetupdown = 0x00) {
		let subcmd = [C.CAM_EXP_COMP, resetupdown];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraExposureCompensationUp(device) {
		return Command.cmdCameraExposureCompensationAdjust(device, 0x02);
	}
	static cmdCameraExposureCompensationDown(device) {
		return Command.cmdCameraExposureCompensationAdjust(device, 0x03);
	}
	static cmdCameraExposureCompensationReset(device) {
		return Command.cmdCameraExposureCompensationAdjust(device, 0x00);
	}
	static cmdCameraExposureCompensationDirect(device, directval = 0) {
		let subcmd = [C.CAM_EXP_COMP_DIRECT, ...i2v(directval)];
		return Command.cmdCamera(device, subcmd);
	}

	// BACKLIGHT =======================================
	static cmdCameraBacklightCompensation(device, enable = true) {
		let subcmd = [C.CAM_BACKLIGHT, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}

	// SHUTTER ========================================

	/// resetupdown = 0, 2, 3
	static cmdCameraShutter(device, resetupdown = 0x00, directvalue = -1) {
		let subcmd = [C.CAM_SHUTTER, resetupdown];
		if (directvalue > -1) {
			subcmd = [C.CAM_SHUTTER_DIRECT, ...i2v(directvalue)];
		}
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraShutterUp(device) { let r = 0x02; return Command.cmdCameraShutter(device, r) }
	static cmdCameraShutterDown(device) { let r = 0x03; return Command.cmdCameraShutter(device, r) }
	static cmdCameraShutterReset(device) { let r = 0x00; return Command.cmdCameraShutter(device, r) }
	static cmdCameraShutterDirect(device, value = 0) { let r = 0x00; return Command.cmdCameraShutter(device, r, value) }
	static cmdCameraShutterSlow(device, auto = true) {
		let subcmd = [C.CAM_SHUTTER_SLOW_AUTO, auto ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}

	/// IRIS ======================================
	/// resetupdown = 0, 2, 3
	static cmdCameraIris(device, resetupdown = 0x00, directvalue = -1) {
		let subcmd = [C.CAM_IRIS, resetupdown];
		if (directvalue > -1) {
			subcmd = [C.CAM_IRIS_DIRECT, ...i2v(directvalue)];
		}
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraIrisUp(device) { let r = 0x02; return Command.cmdCameraIris(device, r) }
	static cmdCameraIrisDown(device) { let r = 0x03; return Command.cmdCameraIris(device, r) }
	static cmdCameraIrisReset(device) { let r = 0x00; return Command.cmdCameraIris(device, r) }
	static cmdCameraIrisDirect(device, value = 0) { let r = 0x00; return Command.cmdCameraIris(device, r, value) }

	// APERTURE =====================================
	/// resetupdown = 0, 2, 3
	static cmdCameraAperture(device, resetupdown = 0x00, directvalue = -1) {
		let subcmd = [C.CAM_APERTURE, resetupdown];
		if (directvalue > -1) {
			subcmd = [C.CAM_APERTURE_DIRECT, ...i2v(directvalue)];
		}
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraApertureUp(device) { let r = 0x02; return Command.cmdCameraAperture(device, r) }
	static cmdCameraApertureDown(device) { let r = 0x03; return Command.cmdCameraAperture(device, r) }
	static cmdCameraApertureReset(device) { let r = 0x00; return Command.cmdCameraAperture(device, r) }
	static cmdCameraApertureDirect(device, value = 0) { let r = 0x00; return Command.cmdCameraAperture(device, r, value) }


	// QUALITY ==================================
	static cmdCameraHighResMode(device, enable = true) {
		let subcmd = [C.CAM_HIRES_ENABLE, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraHighSensitivityMode(device, enable = true) {
		let subcmd = [C.CAM_HIGH_SENSITIVITY, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}
	/// val = 0..5
	static cmdCameraNoiseReduction(device, val) {
		let subcmd = [C.CAM_NOISE_REDUCTION, val];
		return Command.cmdCamera(device, subcmd);
	}
	/// val = 0..4
	static cmdCameraGamma(device, val) {
		let subcmd = [C.CAM_GAMMA, val];
		return Command.cmdCamera(device, subcmd);
	}

	// EFFECTS ========================================
	/// effect types are enumerated in the constants file
	static cmdCameraEffect(device, effectType) {
		return Command.cmdCamera(device, [C.CAM_EFFECT, effectType]);
	}
	static cmdCameraEffectDigital(device, effectType) {
		return Command.cmdCamera(device, [C.CAM_EFFECT_DIGITAL, effectType]);
	}
	static cmdCameraEffectDigitalIntensity(device, level) {
		return Command.cmdCamera(device, [C.CAM_EFFECT_LEVEL, level]);
	}

	// basic effects
	static cmdCameraEffectOff(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_OFF);
	}
	static cmdCameraEffectPastel(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_PASTEL);
	}
	static cmdCameraEffectNegative(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_NEGATIVE);
	}
	static cmdCameraEffectSepia(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_SEPIA);
	}
	static cmdCameraEffectBW(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_BW);
	}
	static cmdCameraEffectSolar(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_SOLAR);
	}
	static cmdCameraEffectMosaic(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_MOSAIC);
	}
	static cmdCameraEffectSlim(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_SLIM);
	}
	static cmdCameraEffectStretch(device) {
		return Command.cmdCameraEffect(device, C.DATA_EFFECT_STRETCH);
	}

	// digital effects
	static cmdCameraEffectDigitalOff(device) {
		return Command.cmdCameraEffectDigital(device, C.DATA_EFFECT_OFF);
	}
	static cmdCameraEffectDigitalStill(device) {
		return Command.cmdCameraEffectDigital(device, C.DATA_EFFECT_STILL);
	}
	static cmdCameraEffectDigitalFlash(device) {
		return Command.cmdCameraEffectDigital(device, C.DATA_EFFECT_FLASH);
	}
	static cmdCameraEffectDigitalLumi(device) {
		return Command.cmdCameraEffectDigital(device, C.DATA_EFFECT_LUMI);
	}
	static cmdCameraEffectDigitalTrail(device) {
		return Command.cmdCameraEffectDigital(device, C.DATA_EFFECT_TRAIL);
	}


	// FREEZE ====================================
	static cmdCameraFreeze(device, enable = true) {
		let mode = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subcmd = [C.CAM_FREEZE, mode];
		return Command.cmdCamera(device, subcmd);
	}

	// ICR =======================================
	static cmdCameraICR(device, enable = true) {
		let subcmd = [C.CAM_ICR, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraICRAuto(device, enable = true) {
		let subcmd = [C.CAM_AUTO_ICR, enable ? 0x02 : 0x03];
		return Command.cmdCamera(device, subcmd);
	}
	static cmdCameraICRAutoThreshold(device, val = 0) {
		let subcmd = [C.CAM_AUTO_ICR_THRESHOLD, ...i2v(val)];
		return Command.cmdCamera(device, subcmd);
	}

	// ID write
	static cmdCameraIDWrite(device, data) {
		let subcmd = [C.CAM_ID_WRITE, ...i2v(data)];
		return Command.cmdCamera(device, subcmd);
	}

	// Chroma Suppress
	// value = 0(off), 1-3
	static cmdCameraChromaSuppress(device, value) {
		let subcmd = [C.CAM_CHROMA_SUPPRESS, value];
		return Command.cmdCamera(device, subcmd);
	}
	// value = 0h - Eh
	static cmdCameraColorGain(device, value) {
		let subcmd = [C.CAM_COLOR_GAIN, value];
		return Command.cmdCamera(device, subcmd);
	}
	// value = 0h - Eh
	static cmdCameraColorHue(device, value) {
		let subcmd = [C.CAM_COLOR_HUE, value];
		return Command.cmdCamera(device, subcmd);
	}

	// TODO:
	// CAM_WIDE_D
	// VIDEO_SYSTEM_SET
	// IR Receive
	// IR Receive Return
	// Information Display

	// ---------------- Inquiries ---------------------------
	static inqCameraPower = (recipient = -1) => Command.inqCamera(recipient, C.CAM_POWER);
	static inqCameraICRMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_ICR);
	static inqCameraICRAutoMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_AUTO_ICR);
	static inqCameraICRThreshold = (recipient = -1) => Command.inqCamera(recipient, C.CAM_AUTO_ICR_THRESHOLD, v2iParser);
	static inqCameraGainLimit = (recipient = -1) => Command.inqCamera(recipient, C.CAM_GAIN_LIMIT);
	static inqCameraGain = (recipient = -1) => Command.inqCamera(recipient, C.CAM_GAIN_DIRECT, v2iParser);
	static inqCameraGainR = (recipient = -1) => Command.inqCamera(recipient, C.CAM_RGAIN_DIRECT, v2iParser);
	static inqCameraGainB = (recipient = -1) => Command.inqCamera(recipient, C.CAM_BGAIN_DIRECT, v2iParser);

	static inqCameraDZoomMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_DZOOM);
	static inqCameraZoomPos = (recipient = -1) => Command.inqCamera(recipient, C.CAM_ZOOM_DIRECT, v2iParser);

	static inqCameraFocusAutoStatus = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_AUTO);
	static inqCameraFocusAutoMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_AF_MODE);
	static inqCameraFocusIRCorrection = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_IR_CORRECTION);
	static inqCameraFocusPos = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_DIRECT, v2iParser);
	static inqCameraFocusNearLimit = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_NEAR_LIMIT_POS, v2iParser);
	static inqCameraFocusAutoIntervalTime = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_AF_INTERVAL, AFIntervalParser);
	static inqCameraFocusSensitivity = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FOCUS_SENSE_HIGH);

	static inqCameraWBMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_WB_MODE);
	static inqCameraExposureMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EXPOSURE_MODE);
	static inqCameraShutterSlowMode = (recipient = -1) => Command.inqCamera(recipient, C.CAM_SHUTTER_SLOW_AUTO);
	static inqCameraShutter = (recipient = -1) => Command.inqCamera(recipient, C.CAM_SHUTTER_DIRECT, v2iParser);
	static inqCameraIris = (recipient = -1) => Command.inqCamera(recipient, C.CAM_IRIS_DIRECT, v2iParser);
	static inqCameraBrightness = (recipient = -1) => Command.inqCamera(recipient, C.CAM_BRIGHT_DIRECT, v2iParser);
	static inqCameraExposureCompensationStatus = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EXP_COMP_ENABLE);
	static inqCameraExposureCompensation = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EXP_COMP_DIRECT, v2iParser);
	static inqCameraBacklight = (recipient = -1) => Command.inqCamera(recipient, C.CAM_BACKLIGHT);

	static inqCameraWideDStatus = (recipient = -1) => Command.inqCamera(recipient, C.CAM_WIDE_D);
	static inqCameraWideD = (recipient = -1) => Command.inqCamera(recipient, C.CAM_WIDE_D_SET);

	static inqCameraAperture = (recipient = -1) => Command.inqCamera(recipient, C.CAM_APERTURE_DIRECT, v2iParser);
	static inqCameraHighResStatus = (recipient = -1) => Command.inqCamera(recipient, C.CAM_HIRES_ENABLE);
	static inqCameraNoiseReductionStatus = (recipient = -1) => Command.inqCamera(recipient, C.CAM_NOISE_REDUCTION);
	static inqCameraHighSensitivity = (recipient = -1) => Command.inqCamera(recipient, C.CAM_HIGH_SENSITIVITY);
	static inqCameraFreeze = (recipient = -1) => Command.inqCamera(recipient, C.CAM_FREEZE);
	static inqCameraEffect = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EFFECT);
	static inqCameraEffectDigital = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EFFECT_DIGITAL);
	static inqCameraEffectLevel = (recipient = -1) => Command.inqCamera(recipient, C.CAM_EFFECT_LEVEL);

	static inqCameraID = (recipient = -1) => Command.inqCamera(recipient, C.CAM_ID_WRITE, v2iParser);
	static inqCameraChromaSuppress = (recipient = -1) => Command.inqCamera(recipient, C.CAM_CHROMA_SUPPRESS);
	static inqCameraColorGain = (recipient = -1) => Command.inqCamera(recipient, C.CAM_COLOR_GAIN, v2iParser);
	static inqCameraColorHue = (recipient = -1) => Command.inqCamera(recipient, C.CAM_COLOR_HUE, v2iParser);

	// these use op commands
	static inqVideoSystemNow = (recipient = -1) => Command.inqOp(recipient, C.OP_VIDEO_FORMAT_I_NOW, VideoSystemParser);
	static inqVideoSystemNext = (recipient = -1) => Command.inqOp(recipient, C.OP_VIDEO_FORMAT_I_NEXT, VideoSystemParser);

	static inqCameraPanSpeed = (recipient = -1) => Command.inqOp(recipient, C.OP_PAN_MAX_SPEED, PTMaxSpeedParser);
	static inqCameraPan = (recipient = -1) => Command.inqOp(recipient, C.OP_PAN_POS, PTPosParser);
	static inqCameraPanStatus = (recipient = -1) => Command.inqOp(recipient, C.OP_PAN_STATUS, PTStatusParser);

	// block inquiry commands
	static inqCameraLens = (recipient = -1) => { let c = Command.raw(recipient, C.CAM_LENS_INQUIRY); c.dataParser = CamLensDataParser; return c; }
	static inqCameraImage = (recipient = -1) => { let c = Command.raw(recipient, C.CAM_IMAGE_INQUIRY); c.dataParser = CamImageDataParser; return c; }
}

// Parsers
class NoParser {
	static parse = (data) => data;
}
class v2iParser {
	static parse = (data) => v2i(data);
}
class v2siParser {
	static parse = (data) => v2si(data);
}
class PTMaxSpeedParser {
	static parse = (data) => Object.freeze({ xspeed: data[0], yspeed: data[1] });
}
class PTPosParser {
	static parse = (data) => Object.freeze({ x: v2si(data.slice(0, 4)), y: v2si(data.slice(4, 8)) });
}
class PTStatusParser {
	static parse = (data) => new PTStatus(data);
}
class PTStatus {
	initStatus;
	initializing;
	ready;
	fail;

	moveStatus;
	moveDone;
	moveFail;

	atMaxL;
	atMaxR;
	atMaxU;
	atMaxD;
	moving;

	constructor(data) {
		let [p, q, r, s] = nibbles(data);

		this.moveStatus = (q & C.PAN_MOVE_FAIL) >> 2;
		this.initStatus = (p & C.PAN_INIT_FAIL);

		this.atMaxL = (s & C.PAN_MAXL) > 0;
		this.atMaxR = (s & C.PAN_MAXR) > 0;
		this.atMaxU = (s & C.PAN_MAXU) > 0;
		this.atMaxD = (s & C.PAN_MAXD) > 0;

		this.moving = this.moveStatus == 1;
		this.moveDone = this.moveStatus == 2;
		this.moveFail = this.moveStatus == 3;

		this.initializing = this.initStatus == 1;
		this.ready = this.initStatus == 2;
		this.fail = this.initStatus == 3;
	}
}

class CamLensDataParser {
	static parse = (data) => new CamLensData(data);
}
class CamLensData {
	zooming;
	zoomPos;
	digitalZoomEnabled;

	focusing;
	focusPos;
	focusNearLimit;
	autoFocusMode;
	autoFocusSensitivity;
	autoFocusEnabled;

	lowContrast;
	loadingPreset;

	constructor(data) {
		this.zoomPos = v2i(data.slice(0, 4));
		this.focusNearLimit = v2i(data.slice(4, 6));
		this.focusPos = v2i(data.slice(6, 10));

		// no data is in byte 10
		let ww = data[11];

		// 0-normal, 1-interval, 2-trigger
		this.autoFocusMode = (ww & 0b11000) >> 3;

		// 0-slow, 1-normal
		this.autoFocusSensitivity = (ww & 0b100) >> 2;

		this.digitalZoomEnabled = testBit(ww, 0b10);
		this.autoFocusEnabled = testBit(ww, 0b1);

		let vv = data[12];
		this.lowContrast = testBit(vv, 0b1000);
		this.loadingPreset = testBit(vv, 0b100);
		this.focusing = testBit(vv, 0b10);
		this.zooming = testBit(vv, 0b1);
	}
}
class CamImageDataParser {
	static parse = (data) => new CamImageData(data);
}
class CamImageData {
	gain;
	gainr;
	gainb;
	wbMode;
	exposureMode;
	shutterPos;
	irisPos;
	gainPos;
	brightness;
	exposure;

	highResEnabled;
	wideDEnabled;
	backlightCompEnabled;
	exposureCompEnabled;
	slowShutterAutoEnabled;

	constructor(data) {
		this.gainr = v2i(data.slice(0, 2))
		this.gainb = v2i(data.slice(2, 4))
		this.wbMode = data[4];
		this.gain = data[5];
		this.exposureMode = data[6];
		this.shutterPos = data[8];
		this.irisPos = data[9];
		this.gainPos = data[10];
		this.brightness = data[11];
		this.exposure = data[12];

		let aa = data[7];
		this.highResEnabled = testBit(aa, 0b100000);
		this.wideDEnabled = testBit(aa, 0b10000);
		this.backlightCompEnabled = testBit(aa, 0b100);
		this.exposureCompEnabled = testBit(aa, 0b10);
		this.slowShutterAutoEnabled = testBit(aa, 0b1);
	}
}
// not implemented yet because this Video System codes are camera
// specific. We would need to implement a parser for every different
// camera individually.
class VideoSystemParser {
	static parse = (data) => data;
}
class VideoSystemMode {
	constructor(data) {

	}
}

// HELPER FUNCTIONS
testBit = (val, mask) => (val & mask) == mask;
function nibbles(data) {
	let result = [];
	for (let d of data) {
		let pq = d;
		let p = pq >> 4;
		let q = pq & 0b1111;
		result.push(p);
		result.push(q);
	}
	return result;
}
function si2v(value) {
	// first, handle the possibility of signed integer values
	if (value > 32767) value = 32767;
	if (value < -32768) value = -32768;
	if (value < 0) value = 0xffff + value + 1; // this is the magic
	return i2v(value);
}
// data must be a buffer or array
function v2si(data) {
	if (data.length == 2) data = [0, 0, ...data];
	let value = v2i(data);
	if (value > 32767) value = value - 0xffff - 1;
	return value;
}
function i2v(value) {
	// return word as dword in visca format
	// packets are not allowed to be 0xff
	// so for numbers the first nibble is 0b0000
	// and 0xfd gets encoded into 0x0f 0x0d
	let ms = (value & 0b1111111100000000) >> 8;
	let ls = value & 0b0000000011111111;
	let p = (ms & 0b11110000) >> 4;
	let r = (ls & 0b11110000) >> 4;
	let q = ms & 0b1111;
	let s = ls & 0b1111;
	return Buffer.from([p, q, r, s]);
}
// value must be a buffer or array
function v2i(data) {
	if (data.length == 2) data = [0, 0, ...data];
	let [p, q, r, s] = data;
	let ls = (r << 4) | (s & 0b1111);
	let ms = (p << 4) | (q & 0b1111);
	return (ms << 8) | ls;
}
function takeClosest(myList, myNumber) {
	/// Assumes myList is sorted. Returns closest value to myNumber.
	/// If two numbers are equally close, return the smallest number.
	let pos = 0;
	for (var i = 0; i < myList.length; i++) {
		if (myNumber < myList[i]) break;
		else pos = i;
	}

	if (pos == 0) return myList[0];
	if (pos == myList.length) return myList[-1];
	before = myList[pos - 1];
	after = myList[pos];
	if (after - myNumber < myNumber - before) return after;
	else return before;
}


module.exports = { Command, PTStatus, CamLensData, CamImageData }