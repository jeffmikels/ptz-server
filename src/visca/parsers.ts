import * as utils from './utils'
import { PTStatus, CamImageData, CamLensData } from './camera'
import { Constants as C } from './constants'

// Parsers
export class NoParser {
	static parse = ( data: number[] ): number[] => data;
}
export class v2iParser {
	static parse = ( data: number[] ): number => utils.v2i( data );
}
export class v2siParser {
	static parse = ( data: number[] ): number => utils.v2si( data );
}

export class IsOnParser {
	static parse = ( data: number[] ): boolean => data == [ C.DATA_ONVAL ];
}
export class AFIntervalParser {
	static parse = ( data: number[] ) => Object.freeze( {
		movementTime: utils.v2i( data.slice( 0, 2 ) ),
		intervalTime: utils.v2i( data.slice( 2, 4 ) ),
	} );
}
export class PTMaxSpeedParser {
	static parse = ( data: number[] ) => Object.freeze( { panSpeed: data[ 0 ], tiltSpeed: data[ 1 ] } );
}
export class PTPosParser {
	static parse = ( data: number[] ) => Object.freeze( { panPos: utils.v2si( data.slice( 0, 4 ) ), tiltPos: utils.v2si( data.slice( 4, 8 ) ) } );
}
export class PTStatusParser {
	static parse = ( data: number[] ) => new PTStatus( data );
}
export class CamLensDataParser {
	static parse = ( data: number[] ) => new CamLensData( data );
}
export class CamImageDataParser {
	static parse = ( data: number[] ) => new CamImageData( data );
}

// not implemented yet because this Video System codes are camera
// specific. We would need to implement a parser for every different
// camera individually.
export class VideoSystemParser {
	static parse = ( data: number[] ) => data;
}

