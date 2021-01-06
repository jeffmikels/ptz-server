// MODULES
const HID = require("node-hid");
const http = require('http');

const config = require('./config');
const ViscaControl = require("./visca");

let SidewinderPP = require("./controllers/sidewinderpp");
let Dualshock4 = require("./controllers/dualshock4");

// VISCA INTERFACE
let visca = new ViscaControl(portname = 'COM8', baud = '38400');
visca.start();

/* CONTROLLER HANDLER */
let sw = new SidewinderPP(); // reports axes as signed values
sw.onUpdate((data) => console.log(data));
let ds4 = new Dualshock4();      // reports axes as unsigned 8 bit
ds4.onUpdate((data) => {
	console.log(data);
});

/* VISCA IP PASSTHROUGH */

/* HTTP HANDLER FOR AUTOMATION BY API */
const httpHandler = function (req, res) {
	res.writeHead(200);
	res.end('Hello, World!');
}
const server = http.createServer(httpHandler);
server.listen(52380);
