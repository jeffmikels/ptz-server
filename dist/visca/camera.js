const { v4: uuid } = require('uuid');
const { EventEmitter } = require('events');
const { Command, PTStatus, CamLensData, CamImageData } = require('./command');
const { Constants: C } = require('./constants');
class CameraStatus {
    constructor(pan = 0, tilt = 0, zoom = 0, dzoom = false, effect = 0) {
        this.pan = pan;
        this.tilt = tilt;
        this.zoom = zoom;
        this.dzoom = dzoom;
        this.effect = effect;
        this.updateImageData({});
        this.updateLensData({});
        this.updatePTStatus({});
    }
    // takes CamImageData
    updateImageData(imageData) {
        this.gain = imageData.gain;
        this.gainr = imageData.gainr;
        this.gainb = imageData.gainb;
        this.wbMode = imageData.wbMode;
        this.exposureMode = imageData.exposureMode;
        this.shutterPos = imageData.shutterPos;
        this.irisPos = imageData.irisPos;
        this.gainPos = imageData.gainPos;
        this.brightness = imageData.brightness;
        this.exposure = imageData.exposure;
        this.highResEnabled = imageData.highResEnabled;
        this.wideDEnabled = imageData.wideDEnabled;
        this.backlightCompEnabled = imageData.backlightCompEnabled;
        this.exposureCompEnabled = imageData.exposureCompEnabled;
        this.slowShutterAutoEnabled = imageData.slowShutterAutoEnabled;
    }
    updateLensData(lensData) {
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
    updatePTStatus(ptStatus) {
        this.initStatus = ptStatus.initStatus;
        this.initializing = ptStatus.initializing;
        this.ready = ptStatus.ready;
        this.fail = ptStatus.fail;
        this.moveStatus = ptStatus.moveStatus;
        this.moveDone = ptStatus.moveDone;
        this.moveFail = ptStatus.moveFail;
        this.atMaxL = ptStatus.atMaxL;
        this.atMaxR = ptStatus.atMaxR;
        this.atMaxU = ptStatus.atMaxU;
        this.atMaxD = ptStatus.atMaxD;
        this.moving = ptStatus.moving;
    }
}
class Camera extends EventEmitter {
    // transport should support the socket interface => .send(ViscaCommand)
    constructor(index, transport) {
        var _a;
        this.index = index;
        this.transport = transport;
        this.cameraBuffers = {};
        this.sentCommands = []; // FIFO stack for commands
        this.commandQueue = [];
        this.inquiryQueue = [];
        this.status = new CameraStatus();
        this.commandReady = true; // true when camera can receive commands
        this.inquiryReady = true;
        this.updatetimer = 0;
        this.uuid = (_a = transport.uuid) !== null && _a !== void 0 ? _a : index; // UDPTransports provide a unique uuid
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
        this.emit('update');
    }
    // if a command in the stack is older than 2 seconds drop it
    _clearOldCommands() {
        let now = Date.now();
        while (this.sentCommands.length > 0) {
            if (now - this.sentCommands[0].addedAt < 1000)
                break;
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
            }
            else {
                this.inquiryQueue.push(command);
                queued = true;
            }
        }
        else if (command.msgType == MSGTYPE_COMMAND) {
            if (this.commandReady) {
                this.sentCommands.push(command); // not in a buffer until we get ACK
            }
            else {
                this.commandQueue.push(command);
                queued = true;
            }
        }
        if (!queued)
            this.transport.send(command);
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
        delete (this.cameraBuffers[viscaCommand.socket]);
        this._update();
    }
    error(viscaCommand) {
        let message;
        let errorType = viscaCommand.data[0];
        switch (errorType) {
            case C.ERROR_SYNTAX:
                message = `syntax error, invalid command`;
                break;
            case C.ERROR_BUFFER_FULL:
                message = `command buffers full`;
                break;
            case C.ERROR_CANCELLED:
                // command was cancelled
                message = 'cancelled';
                break;
            case C.ERROR_INVALID_BUFFER:
                message = `socket cannot be cancelled`;
                break;
            case C.ERROR_COMMAND_FAILED:
                message = `command failed`;
                break;
        }
        console.log(`camera ${this.index}-${viscaCommand.socket}: ${message}`);
        this.cameraBuffers[viscaCommand.socket].error(errorType);
        delete (this.cameraBuffers[viscaCommand.socket]);
        this._update();
    }
    inquireAll() {
        this.getCameraPower();
        this.getCameraPanStatus();
        this.getCameraLens();
        this.getCameraImage();
        this.getCameraPanPos();
    }
    // camera specific inquiry commands
    // ---------------- Inquiries ---------------------------
    getCameraPower() { let v = Command.inqCameraPower(this.index, (data) => { this.status.powerStatus = data; }); this.sendCommand(v); }
    getCameraICRMode() { let v = Command.inqCameraICRMode(this.index, (data) => { this.status.icrMode = data; }); this.sendCommand(v); }
    getCameraICRAutoMode() { let v = Command.inqCameraICRAutoMode(this.index, (data) => { this.status.icrAutoMode = data; }); this.sendCommand(v); }
    getCameraICRThreshold() { let v = Command.inqCameraICRThreshold(this.index, (data) => { this.status.icrThreshold = data; }); this.sendCommand(v); }
    getCameraGainLimit() { let v = Command.inqCameraGainLimit(this.index, (data) => { this.status.gainLimit = data; }); this.sendCommand(v); }
    getCameraGain() { let v = Command.inqCameraGain(this.index, (data) => { this.status.gain = data; }); this.sendCommand(v); }
    getCameraGainR() { let v = Command.inqCameraGainR(this.index, (data) => { this.status.gainr = data; }); this.sendCommand(v); }
    getCameraGainB() { let v = Command.inqCameraGainB(this.index, (data) => { this.status.gainb = data; }); this.sendCommand(v); }
    getCameraDZoomMode() { let v = Command.inqCameraDZoomMode(this.index, (data) => { this.status.dzoom = data; }); this.sendCommand(v); }
    getCameraZoomPos() { let v = Command.inqCameraZoomPos(this.index, (data) => { this.status.zoomPos = data; }); this.sendCommand(v); }
    getCameraFocusAutoStatus() { let v = Command.inqCameraFocusAutoStatus(this.index, (data) => { this.status.focusAutoStatus = data; }); this.sendCommand(v); }
    getCameraFocusAutoMode() { let v = Command.inqCameraFocusAutoMode(this.index, (data) => { this.status.focusAutoMode = data; }); this.sendCommand(v); }
    getCameraFocusIRCorrection() { let v = Command.inqCameraFocusIRCorrection(this.index, (data) => { this.status.focusIRCorrection = data; }); this.sendCommand(v); }
    getCameraFocusPos() { let v = Command.inqCameraFocusPos(this.index, (data) => { this.status.focusPos = data; }); this.sendCommand(v); }
    getCameraFocusNearLimit() { let v = Command.inqCameraFocusNearLimit(this.index, (data) => { this.status.focusNearLimit = data; }); this.sendCommand(v); }
    getCameraFocusAutoIntervalTime() { let v = Command.inqCameraFocusAutoIntervalTime(this.index, (data) => { this.status.focusAutoIntervalTime = data; }); this.sendCommand(v); }
    getCameraFocusSensitivity() { let v = Command.inqCameraFocusSensitivity(this.index, (data) => { this.status.autoFocusSensitivity = data; }); this.sendCommand(v); }
    getCameraWBMode() { let v = Command.inqCameraWBMode(this.index, (data) => { this.status.wbMode = data; }); this.sendCommand(v); }
    getCameraExposureMode() { let v = Command.inqCameraExposureMode(this.index, (data) => { this.status.exposureMode = data; }); this.sendCommand(v); }
    getCameraShutterSlowMode() { let v = Command.inqCameraShutterSlowMode(this.index, (data) => { this.status.shutterSlowMode = data; }); this.sendCommand(v); }
    getCameraShutter() { let v = Command.inqCameraShutterPos(this.index, (data) => { this.status.shutterPos = data; }); this.sendCommand(v); }
    getCameraIris() { let v = Command.inqCameraIris(this.index, (data) => { this.status.irisPos = data; }); this.sendCommand(v); }
    getCameraBrightness() { let v = Command.inqCameraBrightness(this.index, (data) => { this.status.brightness = data; }); this.sendCommand(v); }
    getCameraExposureCompensationStatus() { let v = Command.inqCameraExposureCompensationStatus(this.index, (data) => { this.status.exposureCompEnabled = data; }); this.sendCommand(v); }
    getCameraExposureCompensation() { let v = Command.inqCameraExposureCompensation(this.index, (data) => { this.status.exposureCompLevel = data; }); this.sendCommand(v); }
    getCameraBacklightStatus() { let v = Command.inqCameraBacklightStatus(this.index, (data) => { this.status.backlightCompEnabled = data; }); this.sendCommand(v); }
    getCameraWideDStatus() { let v = Command.inqCameraWideDStatus(this.index, (data) => { this.status.wideDEnabled = data; }); this.sendCommand(v); }
    getCameraWideD() { let v = Command.inqCameraWideD(this.index, (data) => { this.status.wideDLevel = data; }); this.sendCommand(v); }
    getCameraAperture() { let v = Command.inqCameraAperture(this.index, (data) => { this.status.aperture = data; }); this.sendCommand(v); }
    getCameraHighResStatus() { let v = Command.inqCameraHighResStatus(this.index, (data) => { this.status.highResEnabled = data; }); this.sendCommand(v); }
    getCameraNoiseReductionStatus() { let v = Command.inqCameraNoiseReductionStatus(this.index, (data) => { this.status.noiseReductionEnabled = data; }); this.sendCommand(v); }
    getCameraHighSensitivityStatus() { let v = Command.inqCameraHighSensitivityStatus(this.index, (data) => { this.status.hightSensitivityEnabled = data; }); this.sendCommand(v); }
    getCameraFreezeStatus() { let v = Command.inqCameraFreezeStatus(this.index, (data) => { this.status.freeze = data; }); this.sendCommand(v); }
    getCameraEffect() { let v = Command.inqCameraEffect(this.index, (data) => { this.status.effect = data; }); this.sendCommand(v); }
    getCameraEffectDigital() { let v = Command.inqCameraEffectDigital(this.index, (data) => { this.status.digitalEffect = data; }); this.sendCommand(v); }
    getCameraEffectDigitalLevel() { let v = Command.inqCameraEffectDigitalLevel(this.index, (data) => { this.status.digitalEffectLevel = data; }); this.sendCommand(v); }
    getCameraID() { let v = Command.inqCameraID(this.index, (data) => { this.status.cameraID = data; }); this.sendCommand(v); }
    getCameraChromaSuppressStatus() { let v = Command.inqCameraChromaSuppressStatus(this.index, (data) => { this.status.chromaSuppresEnabled = data; }); this.sendCommand(v); }
    getCameraColorGain() { let v = Command.inqCameraColorGain(this.index, (data) => { this.status.colorGain = data; }); this.sendCommand(v); }
    getCameraColorHue() { let v = Command.inqCameraColorHue(this.index, (data) => { this.status.colorHue = data; }); this.sendCommand(v); }
    // these use op commands
    getVideoSystemNow() { let v = Command.inqVideoSystemNow(this.index, (data) => { this.status.videoSystemNow = data; }); this.sendCommand(v); }
    getVideoSystemNext() { let v = Command.inqVideoSystemNext(this.index, (data) => { this.status.videoSystemPending = data; }); this.sendCommand(v); }
    getCameraPanPos() { let v = Command.inqCameraPanPos(this.index, (data) => { this.status.panPos = data; }); this.sendCommand(v); }
    getCameraPanSpeed() { let v = Command.inqCameraPanSpeed(this.index, (data) => { this.status.panSpeed = data; }); this.sendCommand(v); }
    getCameraPanStatus() { let v = Command.inqCameraPanStatus(this.index, (data) => { this.status.updatePTStatus(data); }); this.sendCommand(v); }
    // block inquiry commands
    getCameraLens() { let v = Command.inqCameraLens(this.index, (data) => { this.status.updateLensData(data); }); this.sendCommand(v); }
    getCameraImage() { let v = Command.inqCameraImage(this.index, (data) => { this.status.updateImageData(data); }); this.sendCommand(v); }
}
module.exports = { Camera };
