import * as utils from './utils'
import { PanSpeed, PTPos, AFInterval, PTStatus, CamImageData, CamLensData, CamWideDParams } from './camera'
import { Constants as C } from './constants'

export class BaseParser {
	static parse: (data: number[]) => any;
}

// Parsers
export class NoParser implements BaseParser {
	static parse = ( data: number[] ): number[] => data;
}
export class ByteValParser implements BaseParser {
	static parse = ( data: number[] ): number => data[0];
}
export class v2iParser implements BaseParser {
	static parse = ( data: number[] ): number => utils.v2i( data );
}
export class v2siParser implements BaseParser {
	static parse = ( data: number[] ): number => utils.v2si( data );
}

export class IsOnParser implements BaseParser {
	static parse = ( data: number[] ): boolean => data == [ C.DATA_ONVAL ];
}
export class AFIntervalParser implements BaseParser {
	static parse = ( data: number[] ) => Object.freeze( {
		movementTime: utils.v2i( data.slice( 0, 2 ) ),
		intervalTime: utils.v2i( data.slice( 2, 4 ) ),
	} ) as AFInterval;
}
export class PTMaxSpeedParser implements BaseParser {
	static parse = ( data: number[] ) => Object.freeze( { panSpeed: data[ 0 ], tiltSpeed: data[ 1 ] } ) as PanSpeed;
}
export class PTPosParser implements BaseParser {
	static parse = ( data: number[] ) => Object.freeze( { panPos: utils.v2si( data.slice( 0, 4 ) ), tiltPos: utils.v2si( data.slice( 4, 8 ) ) } ) as PTPos;
}
export class PTStatusParser implements BaseParser {
	static parse = ( data: number[] ) => PTStatus.fromData( data );
}
export class CamLensDataParser implements BaseParser {
	static parse = ( data: number[] ) => CamLensData.fromData( data );
}
export class CamImageDataParser implements BaseParser {
	static parse = ( data: number[] ) => CamImageData.fromData( data );
}
export class CamWideDParamsParser implements BaseParser {
	static parse = ( data: number[] ) => CamWideDParams.fromData( data );
}

// not implemented yet because this Video System codes are camera
// specific. We would need to implement a parser for every different
// camera individually.
export class VideoSystemParser implements BaseParser {
	static parse = ( data: number[] ) => data;
}
