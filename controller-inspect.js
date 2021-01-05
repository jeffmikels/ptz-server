var HID = require('node-hid');
console.log(HID.devices());

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

// var hid = new HID.HID(1356, 2508);
var hid = new HID.HID(1118, 8);
hid.on("data", function(data) {
    let x = data[1] | ((data[2] & 0b00000011) << 8)
    x = unsigned2signed(x, 10);

    let a = data[2] & 0b11111100; // ignore the two bits used as the sign for x
    let b = data[3] & 0b00001111; // ignore the part used for z
    let y = (b << 6) | (a >> 2)
    y = unsigned2signed(y, 10);
    // let y = ((data[2] & 0b11111100) >> 2 ) | data[3] 
    let unknown = data[3] & 0b00001111
    let other = data[5]
    console.log(y);
});

/* SIDEWINDER PRECISION PRO
details are found near line 300
https://github.com/torvalds/linux/blob/master/drivers/input/joystick/sidewinder.c

// this is what I reverse engineered
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


next 4 bits are buttons c, d, arrow
next 4 bits are complicated
bit 0 is z axis turned to the right but also when slightly to the left
bit 1 is z axis turned to the left at all
bit 2 is button A
bit 3 is button B

next 8 bits are the dial but only 7 bits are used
when centered, the value is 00
it's value is a 7 bit 2s complement signed integer
it increments when moving counter-clockwise
-64 – 63

represented as a signed 7 bit integer
incrementing when moving counterclockwise

*/


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
// let Gamecontroller = require('gamecontroller');

// let dev = Gamecontroller.getDevices();

// console.log(dev);