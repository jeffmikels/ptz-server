/*
Creates a UDP server to receive VISCA over IP commands.

This can be used to route IP commands to cameras connected by Serial
and to send camera replies back to the proper UDP clients.

The Visca Controller should create one Server for each physical camera we want
to expose to network control.
*/

// MODULES
const config = require('./config')
const udp = require('dgram')
const { EventEmitter } = require('events');

class Server extends EventEmitter {

	constructor(port = 50000) {
		// creating a udp server
		this.socket = udp.createSocket('udp4');
		let socket = this.socket;

		// emits when any error occurs
		socket.on('error', function (error) {
			console.log('Error: ' + error);
			socket.close();
		});

		// emits on new datagram msg
		socket.on('message', function (msg, info) {
			console.log('Data received from client : ' + msg.toString());
			console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

			// emit message up the chain
			emit('message', msg);
		});

		//emits when socket is ready and listening for datagram msgs
		socket.on('listening', function () {
			let address = socket.address();
			let port = address.port;
			let family = address.family;
			let ipaddr = address.address;
			console.log('Server is listening at port' + port);
			console.log('Server ip :' + ipaddr);
			console.log('Server is IP4/IP6 : ' + family);
		});

		//emits after the socket is closed using socket.close();
		socket.on('close', function () {
			console.log('Socket is closed !');
		});

		socket.bind(port);
	}

	write(packet) {
		this.socket.write(packet);
	}

}

module.exports = { Server }