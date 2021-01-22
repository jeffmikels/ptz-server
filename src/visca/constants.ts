export class Constants {
    // masks for header components
    static HEADERMASK_SOURCE = 0b01110000;
    static HEADERMASK_RECIPIENT = 0b00000111;
    static HEADERMASK_BROADCAST = 0b00001000;

    // controller message categories (QQ from the spec)
    static MSGTYPE_COMMAND = 0x01;
    static MSGTYPE_IF_CLEAR = 0x01;
    static MSGTYPE_INQUIRY = 0x09;
    static MSGTYPE_CANCEL = 0x20;      // low nibble identifies the command buffer to cancel
    static MSGTYPE_ADDRESS_SET = 0x30; // goes through all devices and then back to controller

    // camera message types (QQ from the spec)
    static MSGTYPE_NETCHANGE = 0x38;
    static MSGTYPE_ACK = 0x40;         // low nibble identifies the command buffer holding command
    static MSGTYPE_COMPLETE = 0x50;    // low nibble identifies the command buffer that completed
    static MSGTYPE_ERROR = 0x60;       // low nibble identifies the command buffer for the error

    // data types (RR from the spec)
    static DATATYPE_INTERFACE = 0x00;
    static DATATYPE_CAMERA = 0x04;
    static DATATYPE_OPERATION = 0x06;  // sometimes referred to as pan/tilt, but also does system

    // camera settings codes                // data (pqrs is in i2v format)
    static CAM_POWER = 0x00;                // (can inquire) 0x02, 0x03
    static CAM_ICR = 0x01;                  // (can inquire) ON/OFF / infrared mode
    static CAM_AUTO_ICR = 0x51;             // (can inquire) ON/OFF / Auto dark-field mode
    static CAM_AUTO_ICR_THRESHOLD = 0x21;   // (can inquire) 00 00 0p 0q / threshold level
    static CAM_GAIN = 0x0C;                 // 00, 02, 03 / reset, up, down
    static CAM_GAIN_LIMIT = 0x2C;           // (can inquire) 0p / range from 4-F
    static CAM_GAIN_DIRECT = 0x4C;          // (can inquire) 00 00 0p 0q / gain position
    static CAM_RGAIN = 0x03;                // reset 00, up 02, down 03
    static CAM_RGAIN_DIRECT = 0X43;         // (can inquire) direct 00 00 0p 0q
    static CAM_BGAIN = 0x04;                // reset 00, up 02, down 03
    static CAM_BGAIN_DIRECT = 0X44;         // (can inquire) direct 00 00 0p 0q
    static CAM_ZOOM = 0x07;                 // 0x00 (stop), T/W 0x02, 0x03, 0x2p, 0x3p (variable)
    static CAM_DZOOM = 0x06;                // (can inquire) 0x02, 0x03
    static CAM_ZOOM_DIRECT = 0x47;          // (can inquire) pqrs: zoom value, optional tuvw: focus value
    static CAM_FOCUS = 0x08;                // data settings just like zoom
    static CAM_FOCUS_IR_CORRECTION = 0x11;  // (can inquire) 0x00, 0x01
    static CAM_FOCUS_TRIGGER = 0x18;        // when followed by 0x01
    static CAM_FOCUS_INFINITY = 0x18;       // when followed by 0x02
    static CAM_FOCUS_NEAR_LIMIT_POS = 0x28; // (can inquire) pqrs (i2v)
    static CAM_FOCUS_AUTO = 0x38;           // (can inquire) ON/OFF/TOGGLE / toggle means activate on trigger
    static CAM_FOCUS_DIRECT = 0x48;         // (can inquire) pqrs (i2v)
    static CAM_FOCUS_AF_MODE = 0x57;        // (can inquire) 0x00, 0x01, 0x02 (on movement, interval, on zoom)
    static CAM_FOCUS_AF_INTERVAL = 0x27;    // (can inquire) pq: Movement time, rs: Interval time
    static CAM_FOCUS_SENSE_HIGH = 0x58;     // (can inquire) 0x02, 0x03
    static CAM_WB_MODE = 0x35;              // (can inquire) 0-5 auto, indoor, outdoor, one-push, manual
    static CAM_WB_TRIGGER = 0x10;           // when followed by 0x05
    static CAM_EXPOSURE_MODE = 0x39;        // (can inquire) 00, 03, 0A, 0B, 0D / auto, manual, shutter, iris, bright
    static CAM_SHUTTER_SLOW_AUTO = 0x5A;    // (can inquire) 0x02, 0x03 / auto, manual
    static CAM_SHUTTER = 0x0A;              // 00, 02, 03 / reset, up, down
    static CAM_SHUTTER_DIRECT = 0x4A;       // (can inquire) 00 00 0p 0q
    static CAM_IRIS = 0x0B;                 // 00, 02, 03 / reset, up, down
    static CAM_IRIS_DIRECT = 0x4B;          // (can inquire) 00 00 0p 0q
    static CAM_BRIGHT = 0x0D;               // 00, 02, 03 / reset, up, down
    static CAM_BRIGHT_DIRECT = 0x4D;        // (can inquire) 00 00 0p 0q
    static CAM_EXP_COMP = 0x0E;             // 00, 02, 03 / reset, up, down
    static CAM_EXP_COMP_ENABLE = 0x3E;      // (can inquire) ON/OFF
    static CAM_EXP_COMP_DIRECT = 0x4E;      // (can inquire) 00 00 0p 0q
    static CAM_BACKLIGHT = 0x33;            // (can inquire) ON/OFF
    static CAM_WIDE_D = 0x3D;               // (can inquire) 0-4 / auto, on(ratio), on, off, on(hist)
    static CAM_WIDE_D_REFRESH = 0x10;       // when followed by 0x0D
    static CAM_WIDE_D_SET = 0x2D;           // (can inquire) 0p 0q 0r 0s 0t 0u 00 00
    // p: Screen display (0: Combined image, 2: Long-time, 3: Short-time)
    // q: Detection sensitivity (0: L 1: M 2: H)
    // r: Blocked-up shadow correction level (0: L 1: M 2: H 3: S)
    // s: Blown-out highlight correction level (0: L 1: M 2: H)
    // tu: Exposure ratio of short exposure (x1 to x64)

    static CAM_APERTURE = 0x02;             // 00, 02, 03 / reset, up, down
    static CAM_APERTURE_DIRECT = 0x42;      // (can inquire) 00 00 0p 0q / aperture gain

    static CAM_HIRES_ENABLE = 0x52;         // (can inquire) ON/OFF
    static CAM_NOISE_REDUCTION = 0x53;      // (can inquire) 0p / 0-5
    static CAM_GAMMA = 0x5B;                // (can inquire) 0p / 0: standard, 1-4
    static CAM_HIGH_SENSITIVITY = 0x5E;     // (can inquire) ON/OFF
    static CAM_FREEZE = 0x62;               // (can inquire) see data constants
    static CAM_EFFECT = 0x63;               // (can inquire) see data constants
    static CAM_EFFECT_DIGITAL = 0x64;       // (can inquire) see data constants
    static CAM_EFFECT_LEVEL = 0x65;         // intensity of digital effect

    static CAM_MEMORY = 0x3F;               // 0a 0p / a: 0-reset, 1-set, 2-recall, p: memory bank 0-5
    static CAM_ID_WRITE = 0x22;             // (can inquire) pqrs: give the camera an id from 0000-FFFF
    static CAM_CHROMA_SUPPRESS = 0x5F;      // (can inquire) 0-3 / Chroma Suppression level off, 1, 2, 3
    static CAM_COLOR_GAIN = 0x49;           // (can inquire) 00 00 00 0p / 0-E
    static CAM_COLOR_HUE = 0x4F;            // (can inquire) 00 00 00 0p / 0-E


    // operational settings
    static OP_MENU_SCREEN = 0x06;          // ON/OFF
    static OP_VIDEO_FORMAT = 0x35;         // 00 0p
    static OP_VIDEO_FORMAT_I_NOW = 0x23;   // 0p / inquire only, returns current value
    static OP_VIDEO_FORMAT_I_NEXT = 0x33;  // 0p / inquire only, returns value for next power on
    // These codes are camera specific. Sony camera codes are as follows here
    // p:
    // 0 = 1080i59.94, 1 = 1080p29.97, 2 = 720p59.94, 3 = 720p29.97, 4 = NTSC (not all cameras)
    // 8 = 1080i50,    9 = 720p50,     A = 720p25,    B = 1080i50,   C = PAL (some cameras)
    // (I wonder if the manual intended to say B = 1080p50 ?)
    // video system changes require a power cycle

    static OP_PAN_DRIVE = 0x01;            // VV WW 0p 0q
    static OP_PAN_ABSOLUTE = 0x02;         // VV WW 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
    static OP_PAN_RELATIVE = 0X03;         // VV WW 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
    static OP_PAN_MAX_SPEED = 0x11;        // (inquire only) VV WW
    static OP_PAN_POS = 0x12;              // (inquire only) 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
    // VV: pan speed
    // WW: tilt speed
    // p: pan move 1-left, 2-right, 3-none
    // q: tilt move 1-up, 2-down, 3-none
    // YYYY: pan 4 bit signed value from E1E5 - 1E1B
    // ZZZZ: tilt 4 bit signed from FC75 to 0FF0 (flip off) or F010 to 038B (flip on)
    static OP_PAN_HOME = 0x04;             // no data
    static OP_PAN_RESET = 0x05;            // no data
    static OP_PAN_LIMIT = 0x07;
    // W: 1 addresses the up-right limit, 0 addresses the down-left limit
    // to clear: 01 0W 07 0F 0F 0F 07 0F 0F 0F
    // to set:   00 0W 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
    static OP_PAN_STATUS = 0x10;           // (inquire only) pq rs, see below

    static OP_IR_RECEIVE = 0x08;           // (can inquire) ON/OFF/TOGGLE

    // special system commands (still need header and terminator)
    static OP_IR_RETURN_ON = [0x01, 0x7D, 0x01, 0x03, 0x00, 0x00]; // returns IR commands over VISCA?
    static OP_IR_RETURN_OFF = [0x01, 0x7D, 0x01, 0x13, 0x00, 0x00];
    static OP_INFO_DISPLAY_ON = [0x01, 0x7E, 0x01, 0x18, 0x02];
    static OP_INFO_DISPLAY_OFF = [0x01, 0x7E, 0x01, 0x18, 0x03];

    // special inquiry commands
    static OP_IR_CONDITION = [0x09, 0x06, 0x34];             // 0-stable, 1-unstable, 2-inactive
    static OP_FAN_CONDITION = [0x09, 0x7e, 0x01, 0x38];      // 0-on, 1-off
    static OP_INFORMATION_DISPLAY_STATUS = [0x09, 0x7e, 0x01, 0x18]; // ON/OFF
    static OP_VERSION_INQUIRY = [0x09, 0x00, 0x02]; // returns 00 01 mn pq rs tu vw
    //mnq: model code
    //rstu: rom version
    //vw: socket number

    // block inquiries
    static CAM_LENS_INQUIRY = [0x09, 0x7E, 0x7E, 0x00];
    // 0w 0w 0w 0w 0v 0v 0y 0y 0y 0y 00 WW VV
    // w: zoom position
    // v: focus near limit
    // y: focus position
    // WW:
    //     bit 0 indicates autofocus status, 
    //     bit 1 indicates digital zoom status
    //     bit 2 indicates AF sensitivity / 0-slow 1-normal
    //     bits 3-4 indicate AF mode / 0-normal, 1-interval, 2-zoom trigger
    // VV:
    //     bit 0 indicates zooming status / 0-stopped, 1-executing
    //     bit 1 indicates focusing status
    //     bit 2 indicates camera memory recall status / 0-stopped, 1-executing
    //     bit 3 indicates low contrast detection

    static CAM_IMAGE_INQUIRY = [0x09, 0x7E, 0x7E, 0x01];
    // 0w 0w 0v 0v 0a 0b 0c AA BB CC DD EE FF
    // w: R gain
    // v: B gain
    // a: WB mode
    // b: aperture gain
    // c: exposure mode
    // AA:
    //     bit 0 slow shutter / 1-auto, 0-manual
    //     bit 1 exposure comp
    //     bit 2 backlight
    //     bit 3 unused
    //     bit 4 wide D / 0-off, 1-other
    //     bit 5 High Res
    // BB: shutter position
    // CC: iris position
    // DD: gain position
    // EE: brightness
    // FF: exposure


    // data constants
    static DATA_ONVAL = 0x02;
    static DATA_OFFVAL = 0x03;
    static DATA_ZOOMIN = 0x02;
    static DATA_ZOOMOUT = 0x03;
    static DATA_FOCUSFAR = 0x02;
    static DATA_FOCUSNEAR = 0x03;
    static DATA_TOGGLEVAL = 0x10;

    // basic effects
    static DATA_EFFECT_OFF = 0x00;
    static DATA_EFFECT_PASTEL = 0x01;
    static DATA_EFFECT_NEGATIVE = 0x02;
    static DATA_EFFECT_SEPIA = 0x03;
    static DATA_EFFECT_BW = 0x04;
    static DATA_EFFECT_SOLAR = 0x05;
    static DATA_EFFECT_MOSAIC = 0x06;
    static DATA_EFFECT_SLIM = 0x07;
    static DATA_EFFECT_STRETCH = 0x08;

    // digital effects
    static DATA_EFFECT_STILL = 0x01;
    static DATA_EFFECT_FLASH = 0x02;
    static DATA_EFFECT_LUMI = 0x03;
    static DATA_EFFECT_TRAIL = 0x04;

    static DATA_PANLEFT = 0x01;
    static DATA_TILTUP = 0x01;
    static DATA_PANRIGHT = 0x02;
    static DATA_TILTDOWN = 0x02;
    static DATA_PANSTOP = 0x00;
    static DATA_TILTSTOP = 0x00;
    static DATA_PANTILT_UR = 0x01;
    static DATA_PANTILT_DL = 0x00;

    // pan status data masks
    static PAN_MAXL = 0b0001;       // apply to s
    static PAN_MAXR = 0b0010;       // apply to s
    static PAN_MAXU = 0b0100;       // apply to s
    static PAN_MAXD = 0b1000;       // apply to s
    static PAN_PAN_UNK = 0b0001;    // apply to r
    static PAN_TILT_UNK = 0b0001;   // apply to q
    static PAN_MOVING = 0b0100;     // apply to q
    static PAN_MOVE_DONE = 0b1000;  // apply to q
    static PAN_MOVE_FAIL = 0b1100;  // apply to q
    static PAN_NR = 0b0000;         // apply to p
    static PAN_INIT = 0b0001;       // apply to p
    static PAN_READY = 0b0010;      // apply to p
    static PAN_INIT_FAIL = 0b0011;  // apply to p

    // error codes
    static ERROR_SYNTAX = 0x02;
    static ERROR_BUFFER_FULL = 0x03;
    static ERROR_CANCELLED = 0x04;
    static ERROR_INVALID_BUFFER = 0x05;
    static ERROR_COMMAND_FAILED = 0x41;

    // Zoom and Focus Settings
    static FOCUS_NEAR_LIMIT_SONY_SETTINGS = [
        0x1000,     //: Over Inf
        0x2000,     //: 25 m
        0x3000,     //: 11 m
        0x4000,     //: 7 m
        0x5000,     //: 4.9 m
        0x6000,     //: 3.7 m
        0x7000,     //: 2.9 m
        0x8000,     //: 2.3 m
        0x9000,     //: 1.85 m
        0xA000,     //: 1.5 m
        0xB000,     //: 1.23 m
        0xC000,     //: 1 m
        0xD000,     //: 30 cm (initial setting)
        0xE000,     //: 8 cm
        0xF000,     //: 1 cm
    ];

    static OPTICAL_ZOOM_PRESETS = [
        0x0000,
        0x16A1,
        0x2063,
        0x2628,
        0x2A1D,
        0x2D13,
        0x2F6D,
        0x3161,
        0x330D,
        0x3486,
        0x35D7,
        0x3709,
        0x3820,
        0x3920,
        0x3A0A,
        0x3ADD,
        0x3B9C,
        0x3C46,
        0x3CDC,
        0x3D60,
        0x3DD4,
        0x3E39,
        0x3E90,
        0x3EDC,
        0x3F1E,
        0x3F57,
        0x3F8A,
        0x3FB6,
        0x3FDC,
        0x4000,
    ];

    static DIGITAL_ZOOM_PRESETS = [
        0x4000,
        0x6000,
        0x6A80,
        0x7000,
        0x7300,
        0x7540,
        0x76C0,
        0x7800,
        0x78C0,
        0x7980,
        0x7A00,
        0x7AC0,
    ];
}