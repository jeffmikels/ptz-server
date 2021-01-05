var GamePad = require( 'node-gamepad' );
var controller = new GamePad( 'ps4/dualshock4', {
	vendorID: 1356,
	productID: 2508,
	debug: true
});
controller.on( 'connecting', function() {
    console.log( 'connecting' );
} );
controller.on( 'connected', function() {
    console.log( 'connected' );
} );
controller.on( 'dpadUp:press', function() {
    console.log( 'up' );
} );
controller.on( 'dpadDown:press', function() {
    console.log( 'down' );
} );
controller.on( 'battery:status', function(e) {
    console.log( e );
} );

controller.connect();

