// INSPIRED BY https://github.com/benelgiac/PyVisca3/blob/master/pyviscalib/visca.py
// 
// For this JavaScript version, we eliminate all synchronous reads to the socket
// in favor of using callbacks.

import { ViscaController } from './controller';
export let visca = { ViscaController }
