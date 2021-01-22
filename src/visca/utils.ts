// HELPER FUNCTIONS
export function testBit( val: number, mask: number ): boolean { return ( val & mask ) == mask; }
export function nibbles( data: Iterable<number> ): number[] {
	let result: number[] = [];
	for ( let d of data ) {
		let pq = d;
		let p = pq >> 4;
		let q = pq & 0b1111;
		result.push( p );
		result.push( q );
	}
	return result;
}

export function si2v( value: number ): number[] {
	// first, handle the possibility of signed integer values
	if ( value > 32767 ) value = 32767;
	if ( value < -32768 ) value = -32768;
	if ( value < 0 ) value = 0xffff + value + 1; // this is the magic
	return i2v( value );
}
// data must be a buffer or array
export function v2si( data: number[] ): number {
	if ( data.length == 2 ) data = [ 0, 0, ...data ];
	let value = v2i( data );
	if ( value > 32767 ) value = value - 0xffff - 1;
	return value;
}
export function i2v( value: number ): number[] {
	// return word as dword in visca format
	// packets are not allowed to be 0xff
	// so for numbers the first nibble is 0b0000
	// and 0xfd gets encoded into 0x0f 0x0d
	let ms = ( value & 0b1111111100000000 ) >> 8;
	let ls = value & 0b0000000011111111;
	let p = ( ms & 0b11110000 ) >> 4;
	let r = ( ls & 0b11110000 ) >> 4;
	let q = ms & 0b1111;
	let s = ls & 0b1111;
	return [ p, q, r, s ];
}
export function v2i( data: number[] ): number {
	if ( data.length == 2 ) data = [ 0, 0, ...data ];
	let [ p, q, r, s ] = data;
	let ls = ( r << 4 ) | ( s & 0b1111 );
	let ms = ( p << 4 ) | ( q & 0b1111 );
	return ( ms << 8 ) | ls;
}
// function takeClosest(myList:[], myNumber:number) {
// 	/// Assumes myList is sorted. Returns closest value to myNumber.
// 	/// If two numbers are equally close, return the smallest number.
// 	let pos = 0;
// 	for (var i = 0; i < myList.length; i++) {
// 		if (myNumber < myList[i]) break;
// 		else pos = i;
// 	}

// 	if (pos == 0) return myList[0];
// 	if (pos == myList.length) return myList[-1];
// 	before = myList[pos - 1];
// 	after = myList[pos];
// 	if (after - myNumber < myNumber - before) return after;
// 	else return before;
// }
