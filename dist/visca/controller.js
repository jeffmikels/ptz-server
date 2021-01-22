const { EventEmitter } = require('events');
const { Constants: C } = require('./constants');
const { Command } = require("./command");
const { SerialTransport } = require('./visca-serial');
const { UDPTransport } = require("./visca-ip");
// the controller keeps track of the cameras connected by serial
// it also communicates with cameras over IP
// and it exposes a UDP server for each serially connected camera
class ViscaController extends EventEmitter {
    constructor() {
        this.ipClients = [];
        this.serialBroadcastCommands = []; // FIFO stack of serial commands sent
        this.init();
    }
    init() {
        this.cameras = {}; // will be indexed with uuid strings for ip cameras
        this.cameraCount = 0;
    }
    // uuid will be specified when the data comes from an IP camera
    addIPCamera(host, port) {
        let transport = new UDPTransport(host, port);
        transport.on('data', this.onUDPData);
        let camera = new Camera(1, transport); // IP cameras all have index 1
        cameras[transport.uuid] = camera;
        camera.sendCommand(Command.cmdInterfaceClearAll(1));
        camera.inquireAll();
    }
    // manage the serial transport
    restartSerial() { this.close(); this.init(); this.start(); }
    closeSerial() { this.serialConnection.close(); }
    startSerial(portname = "/dev/ttyUSB0", timeout = 1, baudRate = 9600, debug = false) {
        this.serialConnection = SerialTransport(portname, timeout, baudRate, debug);
        this.serialConnection.start();
        // create callbacks
        this.serialConnection.on('open', this.onSerialOpen);
        this.serialConnection.on('close', this.onSerialClose);
        this.serialConnection.on('error', this.onSerialError);
        this.serialConnection.on('data', this.onSerialData);
        // send enumeration command (on reply, we will send the IF clear command)
        this.enumerateSerial();
    }
    onSerialOpen() { }
    onSerialClose() { }
    onSerialError(e) { console.log(e); }
    onSerialData(viscaCommand) {
        let v = viscaCommand;
        // make sure we have this camera as an object if it came from a camera
        // but leave the camera null if it was a broadcast command
        let camera = null;
        if (v.source != 0) {
            if (!(v.source in this.cameras)) {
                camera = new Camera(v.source, this.serialConnection);
                camera.uuid = v.source;
                this.cameras[v.source] = camera;
            }
            else {
                camera = this.cameras[v.source];
            }
        }
        if (camera != null) {
            return this.onCameraData(camera, v);
        }
        // the following commands are 'passthrough' commands that
        // go through the whole serial chain as broadcast commands
        switch (v.msgType) {
            case C.MSGTYPE_IF_CLEAR:
                // reset data for all serial port cameras
                for (let cam of Object.values(this.cameras)) {
                    if (cam.uuid == cam.index)
                        cam.clear();
                }
                this.inquireAllSerial();
                break;
            // address set message, reset all serial port cameras
            case C.MSGTYPE_ADDRESS_SET:
                let highestIndex = v.data[0] - 1;
                for (let i = 1; i <= highestIndex; i++)
                    this.cameras[i] = new Camera(i, this.serialConnection);
                for (let i = highestIndex + 1; i < 8; i++)
                    delete (this.cameras[i]);
                this.ifClearAllSerial();
                break;
            default:
                break;
        }
        this.emit('update');
    }
    onUDPData({ uuid, viscaCommand }) {
        let camera = cameras[uuid];
        return this.onCameraData(camera, viscaCommand);
    }
    onCameraData(camera, v) {
        switch (v.msgType) {
            case C.MSGTYPE_IF_CLEAR:
                camera.clear();
                break;
            // network change messages are unprompted
            case C.MSGTYPE_NETCHANGE:
                // a camera issues this when it detects a change on the serial line,
                // and if we get it, we should re-assign all serial port cameras.
                this.enumerateSerial();
                break;
            // ack message, one of our commands was accepted and put in a buffer
            case C.MSGTYPE_ACK:
                camera.ack(v);
                return;
            // completion message
            case C.MSGTYPE_COMPLETE:
                camera.complete(v);
                break;
            // error messages
            case C.MSGTYPE_ERROR:
                camera.error(v);
                break;
            default:
                break;
        }
        this.emit('update');
    }
    sendSerial(viscaCommand) {
        this.serialConnection.send(viscaCommand);
    }
    // forces a command to be a broadcast command (only applies to serial)
    broadcastSerial(viscaCommand) {
        viscaCommand.broadcast = true;
        this.serialConnection.send(viscaCommand);
    }
    // forces a command to go to a specific camera
    sendToCamera(camera, viscaCommand) {
        camera.sendCommand(viscaCommand);
    }
    // system-level commands... only relevant to serial connections
    enumerateSerial() {
        this.sendSerial(Command.addressSet());
    }
    ifClearAllSerial() {
        this.sendSerial(Command.cmdInterfaceClearAll());
    }
    // for each camera queue all the inquiry commands
    // to get a full set of camera status data
    inquireAllSerial() {
        for (let camera of cameras) {
            if (camera.transport == this.serialConnection) {
                camera.inquireAll();
            }
        }
    }
    inquireAllIP() {
        for (let camera of cameras) {
            if (camera.transport.uuid) {
                camera.inquireAll();
            }
        }
    }
    inquireAll() { this.inquireAllSerial(); this.inquireAllIP(); }
    // for debugging
    dump(packet, title = null) {
        if (!packet || packet.length == 0 || !this.DEBUG)
            return;
        header = packet[0];
        term = packet[packet.length - 2]; // last item
        qq = packet[1];
        sender = (header & 0b01110000) >> 4;
        broadcast = (header & 0b1000) >> 3;
        recipient = header & 0b0111;
        if (broadcast)
            recipient_s = "*";
        else
            recipient_s = str(recipient);
        console.log("-----");
        if (title)
            console.log(`packet (${title}) [${sender} => ${recipient_s}] len=${packet.length}: ${packet}`);
        else
            console.log(`packet [%d => %s] len=%d: %s` % (sender, recipient_s, packet.length, packet));
        console.log(` QQ.........: ${qq}`);
        if (qq == 0x01)
            console.log("              (Command)");
        if (qq == 0x09)
            console.log("              (Inquiry)");
        if (packet.length > 3) {
            rr = packet[2];
            console.log(` RR.........: ${rr}`);
            if (rr == 0x00)
                console.log("              (Interface)");
            if (rr == 0x04)
                console.log("              (Camera [1])");
            if (rr == 0x06)
                console.log("              (Pan/Tilter)");
        }
        if (packet.length > 4) {
            data = packet.slice(3);
            console.log(` Data.......: ${data}`);
        }
        else
            console.log(" Data.......: null");
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
            if (errcode == 0x02 && socketno == 0)
                console.log("        : Syntax Error");
            if (errcode == 0x03 && socketno == 0)
                console.log("        : Command Buffer Full");
            if (errcode == 0x04)
                console.log(`        : Socket ${socketno}: Command canceled`);
            if (errcode == 0x05)
                console.log(`        : Socket ${socketno}: Invalid socket selected`);
            if (errcode == 0x41)
                console.log(`        : Socket ${socketno}: Command not executable`);
        }
        if (packet.length == 3 && qq == 0x38)
            console.log("Network Change - we should immediately issue a renumbering!");
    }
}
module.exports = { ViscaController };
