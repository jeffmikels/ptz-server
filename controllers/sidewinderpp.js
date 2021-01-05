var HID = require('node-hid');

const hatcodes = ['N','NE','E','SE','S','SW','W','NW','C'];

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

class SidewinderPP {
    constructor() {
        this.hid = new HID.HID(1118, 8);
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
        status.t1 = (data[0] & 0b00010000) > 0;
        status.t2 = (data[0] & 0b00100000) > 0;
        status.t3 = (data[0] & 0b01000000) > 0;
        status.t4 = (data[0] & 0b10000000) > 0;
        let hatval = data[0] & 0b00001111;
        let hatcode = hatcodes[hatval];
        status.hat = {value: hatval, code: hatcode};

        let x = data[1] | ((data[2] & 0b00000011) << 8)
        status.x = unsigned2signed(x, 10);

        let a = data[2] & 0b11111100; // ignore the two bits used as the sign for x
        let b = data[3] & 0b00001111; // ignore the part used for z
        let y = (b << 6) | (a >> 2)
        status.y = unsigned2signed(y, 10);
        
        // handle z axis
        let sign = (data[4] & 0b11) << 4;
        let val = data[3] >> 4;
        let final = sign | val;
        status.z = unsigned2signed(final, 6);

        status.buttonA = (data[4] & 0b00000100) > 0;
        status.buttonB = (data[4] & 0b00001000) > 0;
        status.buttonC = (data[4] & 0b00010000) > 0;
        status.buttonD = (data[4] & 0b00100000) > 0;
        status.buttonArrow = (data[4] & 0b01000000) > 0;
        
        status.dial = unsigned2signed(data[5], 7);

        if (!deepEquals(status, this.status)) {
            this.status = status;
            if (this.callback != null) this.callback(status);
        }
    }
}

module.exports = SidewinderPP;

/* SIDEWINDER PRECISION PRO
first four bits are the top buttons
trigger = 1
left button = 2
top right = 4
bottom right = 8

next four bits are the nine positions of the hat
0-8 up-nothing

next 8 bits are the least significant bits of the 10 bit X axis (signed)
next 6 bits are the least significant bits of the 10 bit Y axis (signed)
next 2 bits are the most significant bits of the X axis
next 4 bits are the least significant bits of the 6 bit Z axis (signed)
next 4 bits are the most significant bits of the Y axis
next 6 bits are used for buttons
next 2 bits are used for the most significant bits of the Z axis

it works like this:
byte 3 - cdef----
byte 4 - ------ab
final value - abcdef as a six bit signed value

sample code:
    let sign = data[4] << 4;
    let val = data[3] >> 4;
    let final = sign | val;
    // six bit signed 2s complement
    final = unsigned2signed(final, 6);
    console.log(sign.toString(2), val.toString(2), final.toString(2), final);


byte 4 also holds the data for buttons c, d, arrow, b, a
in the most significant six bits

bits 0 and 1 are used as the sign bit for the z axis 
bit 2 is button A
bit 3 is button B
bit 4 is arrow
bit 5 is d
bit 6 is c

next 8 bits are the dial but only 7 bits are used
when centered, the value is 00
it's value is a 7 bit 2s complement signed integer
it increments when moving counter-clockwise
-64 – 63

represented as a signed 7 bit integer
incrementing when moving counterclockwise

*/