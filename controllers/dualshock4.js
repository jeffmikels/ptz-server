var HID = require('node-hid');

const dpadcodes = ['N','NE','E','SE','S','SW','W','NW','C'];

// quick and dirty 6 bit twos complement
// because of how javascript handles bitwise NOT
// of unsigned values... it does the NOT,
// but then it interprets the result as a SIGNED value
// which ends up negative because the original was unsigned
function unsigned2signed(val, bits = 8){
    let signBit = Math.pow(2,bits-1); // 0b1000_0000
    let mask = Math.pow(2,bits); // 0b1_0000_0000
    if (val & signBit) return -(mask + ~val + 1);
    else return val;
}

function deepEquals(a, b) {
    if (typeof a != typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        for (let i = 0; i < a.length; i++) {
            if (!deepEquals(a[i], b[i])) return false;
        }
    } else if (typeof a == 'object' && a != null) {
        for (let key of Object.keys(a)) {
            if (!deepEquals(a[key], b[key])) return false;
        }
    } else {
        return a == b;
    }
    return true;
}



class Dualshock4 {
    constructor() {
        this.hid = new HID.HID(1356, 2508);
        this.status = {};
        this.callback = null;
        this.hid.on("data", (data) => {
            this.handleData(data);
        });
    }

    onUpdate(f) {
        this.callback = f;
    }

    handleData(data) {
        let status = {}
        status.lx = data[1];
        status.ly = data[2];
        status.rx = data[3];
        status.ry = data[4];

        let dpadval = data[5] & 0b00001111;
        let dpadcode = dpadcodes[dpadval];
        status.dpad = {value: dpadval, code: dpadcode}

        status.buttonT = (data[5] & 0b10000000) != 0;
        status.buttonO = (data[5] & 0b01000000) != 0;
        status.buttonX = (data[5] & 0b00100000) != 0;
        status.buttonS = (data[5] & 0b00010000) != 0;

        status.buttonShare   = (data[6] & 0b00010000) != 0;
        status.buttonOption  = (data[6] & 0b00100000) != 0;

        status.buttonLS      = (data[6] & 0b01000000) != 0;
        status.buttonRS      = (data[6] & 0b10000000) != 0;

        status.triggerL1 = (data[6] & 0b0001) != 0;
        status.triggerR1 = (data[6] & 0b0010) != 0;
        status.triggerL2 = (data[6] & 0b0100) != 0;
        status.triggerR2 = (data[6] & 0b1000) != 0;
        
        status.analogL2 = data[8];
        status.analogR2 = data[9];
        
        // TODO: touchpad data

        // let dirty = false;
        // for (let key of Object.keys(status)) {
        //     if (key == 'dpad') {
        //         if (status.dpad.value != this.status.dpad.value) {
        //             dirty = true;
        //             break;
        //         }
        //         continue;
        //     }
        //     if (status[key] != this.status[key]) {
        //         dirty = true;
        //         console.log(key);
        //         break;
        //     }
        // }
        
        if (!deepEquals(status, this.status)) {
            this.status = status;
            if (this.callback != null) this.callback(status);
        }
    }
}

module.exports = Dualshock4;

/* PS4
LX = 1
LY = 2

RX = 3
RY = 4

DPAD = 5low (VALUE CLOCKWISE 0-8 up-nothing)
BUTTONS = 5high BITMASK - T O X S (8 4 2 1)
STICK BUTTON = 6high BITMASK - RIGHT LEFT OPTION SHARE (8 4 2 1)
TRIGGERS = 6low BITMASK (R2 L2 R1 L1) (8 4 2 1)
L2 analog = 8 (0-255)
R2 analog = 9 (0-255)
TOUCHPAD

*/
