# PTZ-SERVER

PTZ-SERVER is a full PTZ server to control VISCA-IP and VISCA-Serial cameras using a web interface and HID devices like joysticks and gamepads.

Eventually, it will enable users to program advanced camera moves as macros.

## Rationale...

Of course, the main reason for this module is to fully implement the VISCA protocol without any reliance on `libvisca` the main C library for VISCA commands.

I did it as a challenge to myself, but also so that the VISCA protocol could be more easily understood by Javascript/Typescript developers who are not comfortable reading protocol documentation or C source code.

Finally, by implementing it in Typescript, I have been able to create a code-base that can be parsed easily by Visual Studio Code (and presumably other IDEs) providing intelligent code suggestions to make calling VISCA commands much easier on the developer.

The biggest challenge for the Javascript/Typescript ecosystem in managing Visca connections is that Visca commands are intended to be executed in the following manner:

-   send a command over the serial or network connection
-   wait for an ACK (for most commands)
-   wait for a DONE (for many commands)

Javascript doesn't like to work this way. Javascript/Typescript code wants everything to run asynchronously, so this library virtualizes VISCA cameras to maintain command buffers and callbacks. As VISCA commands come in, the Camera objects will update themselves and then emit an 'update' event. As a developer, you only need to send commands and listen for changes on the various objects.
