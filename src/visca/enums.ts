
// enums are a special feature of typescript that
// also have reverse references
/*
enum Enum {A, B}
Enum.A === 0     // true
Enum[0] === 'A'  // true
*/
export enum ControlMsg {
	// == MESSAGE TYPE ==
	// controller message categories (QQ from the spec)
	command = 0x01,
	if_clear = 0x01,
	inquiry = 0x09,
	cancel = 0x20,      // low nibble identifies the command buffer to cancel
	add_set = 0x30,     // goes through all devices and then back to controller
}

export enum CameraMsg {
	// camera message types (QQ from the spec)
	netchange = 0x38,
	ack = 0x40,         // low nibble identifies the command buffer holding command
	complete = 0x50,    // low nibble identifies the command buffer that completed
	error = 0x60,       // low nibble identifies the command buffer for the error
}

export enum DataType {
	// == DATA TYPE ==
	// data types (RR from the spec)
	interface = 0x00,
	camera = 0x04,
	operation = 0x06,  // sometimes referred to as pan/tilt, but also does system
}

export enum CameraCmd {
// == COMMAND TYPE CONSTANTS ==
// camera settings codes                // data (pqrs is in i2v format)
power = 0x00,                // (can inquire) ONVAL / OFFVAL
sleep_time = 0x40,           // (not in the sony manual) 0p 0q 0r 0s
icr = 0x01,                  // (can inquire) ONVAL / OFFVAL / infrared mode
icr_auto = 0x51,             // (can inquire) ONVAL / OFFVAL / Auto dark-field mode
icr_threshold = 0x21,        // (can inquire) 00 00 0p 0q / threshold level
gain = 0x0C,                 // (cmd only) 00, 02, 03 / reset, up, down // CMD_CAM_VAL_RESET, CMD_CAM_VAL_UP, CMD_CAM_VAL_DOWN
gain_limit = 0x2C,           // (can inquire) 0p / range from 4-F
gain_direct = 0x4C,          // (can inquire) 00 00 0p 0q / gain position
rgain = 0x03,                // (cmd only) same as gain command
rgain_direct = 0X43,         // (can inquire) direct 00 00 0p 0q
bgain = 0x04,                // (cmd only) same as gain command
bgain_direct = 0X44,         // (can inquire) direct 00 00 0p 0q
zoom = 0x07,                 // (cmd only) 0x00 (stop), T/W 0x02, 0x03, 0x2p, 0x3p (variable)
dzoom = 0x06,                // (can inquire) ONVAL / OFFVAL
zoom_direct = 0x47,          // (can inquire) pqrs: zoom value, optional tuvw: focus value
focus = 0x08,                // data settings just like zoom
focus_ir_correction = 0x11,  // (can inquire) 0x00, 0x01 // basic boolean
focus_trigger = 0x18,        // (cmd only) 0x01 trigger now, 0x02 set to infinity
focus_near_limit = 0x28,     // (can inquire) pqrs (i2v)
focus_mode = 0x38,           // (can inquire) 0x02, 0x03, 0x10 | AUTO / MANUAL / AUTO+MANUAL (TOGGLE?)
focus_direct = 0x48,         // (can inquire) pqrs (i2v)
focus_af_mode = 0x57,        // (can inquire) 0x00, 0x01, 0x02 (normal (on movement), interval, on zoom)
focus_af_interval = 0x27,    // (can inquire) pq: Movement time, rs: Interval time
focus_high_sensitivity = 0x58,  // (can inquire) ONVAL / OFFVAL
wb_mode = 0x35,              // (can inquire) 0-5 auto, indoor, outdoor, one-push, manual
wb_trigger = 0x10,           // (cmd only) when followed by 0x05
exposure_mode = 0x39,        // (can inquire) 00, 03, 0A, 0B, 0D / auto, manual, shutter, iris, bright
shutter_mode = 0x5A,         // (can inquire) ONVAL / OFFVAL / auto, manual
shutter = 0x0A,              // (cmd only) 00, 02, 03 / same as gain
shutter_direct = 0x4A,       // (can inquire) 00 00 0p 0q
iris = 0x0B,                 // (cmd only) CMD_CAM_VAL_RESET, CMD_CAM_VAL_UP, CMD_CAM_VAL_DOWN
iris_direct = 0x4B,          // (can inquire) 00 00 0p 0q
brightness = 0x0D,           // (cmd only) 00, 02, 03 / same as gain
brightness_direct = 0x4D,    // (can inquire) 00 00 0p 0q
exposure_comp = 0x0E,        // (cmd only) 00, 02, 03 / same as gain
exposure_comp_active = 0x3E, // (can inquire) ON/OFF
exposure_comp_direct = 0x4E, // (can inquire) 00 00 0p 0q
backlight = 0x33,            // (can inquire) ON/OFF
wide_dynamic = 0x3D,         // (can inquire) 0-4 / auto, on(ratio), on, off, on(hist)
wide_dynamic_refresh = 0x10, // (cmd only) when followed by 0x0D
wide_dynamic_direct = 0x2D,  // (can inquire) 0p 0q 0r 0s 0t 0u 00 00

// wide dynamic range settings
// p: Screen display (0: Combined image, 2: Long-time, 3: Short-time)
// q: Detection sensitivity (0: L 1: M 2: H)
// r: Blocked-up shadow correction level (0: L 1: M 2: H 3: S)
// s: Blown-out highlight correction level (0: L 1: M 2: H)
// tu: Exposure ratio of short exposure (x1 to x64)

aperture = 0x02,             // 00, 02, 03 / like gain
aperture_direct = 0x42,      // (can inquire) 00 00 0p 0q / aperture gain

hires_enable = 0x52,         // (can inquire) ON/OFF
noise_reduction = 0x53,      // (can inquire) 0p / 0-5
gamma = 0x5B,                // (can inquire) 0p / 0: standard, 1-4
high_sensitivity = 0x5E,     // (can inquire) ON/OFF
// freeze = 0x62,            // (can inquire) not supported by sony
effect = 0x63,               // (can inquire) see data constants
effect_digital = 0x64,       // (can inquire) see data constants
effect_level = 0x65,         // (cmd only) intensity of digital effect

chroma_suppress = 0x5F,      // (can inquire) 0-3 / Chroma Suppression level off, 1, 2, 3
color_gain = 0x49,           // (can inquire) 00 00 00 0p / 0-E
color_hue = 0x4F,            // (can inquire) 00 00 00 0p / 0-E

// misc other commands
memory = 0x3F,               // (cmd only) 0a 0p / a: 0-reset, 1-set, 2-recall, p: memory bank 0-5
id_set = 0x22,               // (can inquire) pqrs: give the camera an id from 0000-FFFF
}

export enum CameraOpCmd {
	// pan-tilt commands
	// in all PT commands, the following variables apply
	// VV: pan speed / sony 01-18
	// WW: tilt speed / sony 01-17
	// YYYY: pan 4 bit signed value from E1E5 - 1E1B
	// ZZZZ: tilt 4 bit signed from FC75 to 0FF0 (flip off) or F010 to 038B (flip on)

	pt_home = 0x04,          // no data
	pt_reset = 0x05,         // no data
	pt_move = 0x01,          // VV WW 0p 0q
	// p: pan move 1-left, 2-right, 3-none
	// q: tilt move 1-up, 2-down, 3-none

	pt_direct = 0x02,         // VV WW 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
	pt_relative = 0X03,       // VV WW 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
	
	pt_limit = 0x07,
	// to set:   00 0W 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
	// YYYY: pan 4 bit signed value from E1E5 - 1E1B
	// ZZZZ: tilt 4 bit signed from FC75 to 0FF0 (flip off) or F010 to 038B (flip on)
	// W: 1 addresses the up-right limit (values must be positive)
	// W: 0 addresses the down-left limit (values must be negative)
	// to clear: 01 0W 07 0F 0F 0F 07 0F 0F 0F

	// inquiries only
	pt_max_speed_inq = 0x11,  // (inquire only) VV WW
	pt_pos_inq = 0x12,        // (inquire only) 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z
	pt_status_inq = 0x10,     // (inquire only) pq rs, various bits need to be parsed


	// general operational settings
	menu_screen = 0x06,          // ON/OFF
	video_format = 0x35,         // 00 0p
	video_format_now_inq = 0x23,     // 0p / inquire only, returns current value
	video_format_next_inq = 0x33,    // 0p / inquire only, returns value for next power on
	// These codes are camera specific. Sony camera codes are as follows here
	// p:
	// 0 = 1080i59.94, 1 = 1080p29.97, 2 = 720p59.94, 3 = 720p29.97, 4 = NTSC (not all cameras)
	// 8 = 1080i50,    9 = 720p50,     A = 720p25,    B = 1080i50,   C = PAL (some cameras)
	// (I wonder if the manual intended to say B = 1080p50 ?)
	// video system changes require a power cycle


	ir_receiver_on = 0x08,           // (can inquire) ON/OFF/TOGGLE
}

export enum DataVal {
	// == COMMAND ONLY CONSTANTS ==
	// command constants (not available on inquiries)
	// super generic constants
	stop = 0x00,
	reset = 0x00,
	clear = 0x01,
	more = 0x02,
	less = 0x03,

	// greater specificity
	value_reset = 0x00,
	value_clear = 0x01,
	value_up = 0x02,
	value_down = 0x03,

	zoom_stop = 0x00,
	zoom_tele = 0x02,
	zoom_wide = 0x03,
	zoom_tele_variable = 0x20,
	zoom_wide_variable = 0x30,
	
	focus_stop = 0x00,
	focus_far = 0x02,
	focus_near = 0x03,
	focus_far_variable = 0x20,
	focus_near_variable = 0x30,
	
	focus_trigger_now = 0x01,
	focus_trigger_inf = 0x02,
	
	wb_trigger_now = 0x05,
	
	// == OTHER DATA CONSTANTS ==
	on = 0x02,
	off = 0x03,
	toggle = 0x10,

	irc_enabled = 0x01,
	focus_mode_auto = 0x02,
	focus_mod_manual = 0x03,
	focus_mode_toggle = 0x10,

	autofocus_on_movement = 0x00,
	autofocus_on_interval = 0x01,
	autofocus_on_zoom = 0x02,

	wb_auto = 0x00,
	wb_indoor = 0x01,
	wb_outdoor = 0x02,
	wb_trigger = 0x03,
	wb_manual = 0x04,

	exposure_auto = 0x00,
	exposure_manual = 0x03,
	exposure_shutter = 0x0a,
	exposure_iris = 0x0b,
	exposure_bright = 0x0d,

	wide_dynamic_auto = 0x00,
	wide_dynamic_ratio = 0x01,
	wide_dynamic_on = 0x02,
	wide_dynamic_off = 0x03,
	wide_dynamic_histogram = 0x04,
}

export enum CameraEffect {
	// basic effects
	off = 0x00,
	pastel = 0x01,
	negative = 0x02,
	sepia = 0x03,
	bw = 0x04,
	solar = 0x05,
	mosaic = 0x06,
	slim = 0x07,
	stretch = 0x08,

	// digital effects
	d_still = 0x01,
	d_flash = 0x02,
	d_lumi = 0x03,
	d_trail = 0x04,
}

export enum PTDirection {
	stop = 0x00,
	left = 0x01,
	right = 0x02,
	up = 0x01,
	down = 0x02,
	corner_ur = 0x01,
	corner_dl = 0x00,
}

export enum ViscaError {
	// error codes
	syntax = 0x02,
	buffer_full = 0x03,
	cancelled = 0x04,
	invalid_buffer = 0x05,
	command_failed = 0x41,
}

export const SpecialOpCommands = {
	// special system commands (still need header and terminator)
	ir_return_on  : [0x01, 0x7D, 0x01, 0x03, 0x00, 0x00], // returns IR commands over VISCA?
	ir_return_off : [0x01, 0x7D, 0x01, 0x13, 0x00, 0x00],
	info_display_on : [0x01, 0x7E, 0x01, 0x18, 0x02],
	info_display_off : [0x01, 0x7E, 0x01, 0x18, 0x03],
	
	// special inquiry commands
	ir_condition_inq: [0x09, 0x06, 0x34],            // 0-stable, 1-unstable, 2-inactive
	info_display_on_inq : [0x09, 0x7e, 0x01, 0x18],  // ON / OFF
	fan_condition_inq: [0x09, 0x7e, 0x01, 0x38],     // 0-running, 1-stopped
}

export const SpecialBlockInquiries = {
	system_version: [0x09, 0x00, 0x02], // returns 00 01 mn pq rs tu vw
	//mnq: model code
	//rstu: rom version
	//vw: socket number

	// block inquiries
	camera_lens_inq : [0x09, 0x7E, 0x7E, 0x00],
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

	camera_image_inq: [0x09, 0x7E, 0x7E, 0x01],
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
}
