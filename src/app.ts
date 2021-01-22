// MODULES
import http, { IncomingMessage, ServerResponse } from 'http'

import config from './config'
import { ViscaController } from "./visca/controller"

import SidewinderPP from "./controllers/sidewinderpp"
import Dualshock4 from "./controllers/dualshock4"

/* CONTROLLER HANDLER */
let sw = new SidewinderPP(); // reports axes as signed values
sw.onUpdate((data: Buffer) => console.log(data));

let ds4 = new Dualshock4();      // reports axes as unsigned 8 bit
ds4.onUpdate((data: Buffer) => console.log(data));

// VISCA INTERFACE
let vc = new ViscaController();
vc.startSerial('COM8', 38400);


/* VISCA IP PASSTHROUGH */


/* HTTP HANDLER FOR AUTOMATION BY API */
const httpHandler = function (req: IncomingMessage, res: ServerResponse) {
	res.writeHead(200);
	res.end('Hello, World!');
}
const server = http.createServer(httpHandler);
server.listen(52380);
