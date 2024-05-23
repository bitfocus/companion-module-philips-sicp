/* eslint-disable @typescript-eslint/no-unused-vars */
//const requestSICPVersion: Array<number> = [0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5]

import { DropdownChoice } from '@companion-module/base'

//const GetPowerState: Array<number> = [0x05, 0x01, 0x00, 0x19, 0x1d]

export const TurnOffCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x02, 0x1d]
export const TurnOnCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x01, 0x1e]

export const Sources: { choice: DropdownChoice; command: Array<number> }[] = [
	{ choice: { id: 'HDMI1', label: 'HDMI 1' }, command: [0x09, 0x01, 0x00, 0xac, 0x0d, 0x09, 0x01, 0x00, 0xa1] },
	{ choice: { id: 'HDMI2', label: 'HDMI 2' }, command: [0x09, 0x01, 0x00, 0xac, 0x06, 0x09, 0x01, 0x00, 0xaa] },
	{ choice: { id: 'HDMI3', label: 'HDMI 3' }, command: [0x09, 0x01, 0x00, 0xac, 0x0f, 0x09, 0x01, 0x00, 0xa3] },
	{ choice: { id: 'HDMI4', label: 'HDMI 4' }, command: [0x09, 0x01, 0x00, 0xac, 0x19, 0x09, 0x01, 0x00, 0xb5] },
	{ choice: { id: 'DVI', label: 'DVI' }, command: [0x09, 0x01, 0x00, 0xac, 0x0e, 0x09, 0x01, 0x00, 0xa2] },
	{ choice: { id: 'VGA', label: 'VGA' }, command: [0x09, 0x01, 0x00, 0xac, 0x05, 0x09, 0x01, 0x00, 0xa9] },
	{ choice: { id: 'DP', label: 'DP' }, command: [0x09, 0x01, 0x00, 0xac, 0x0a, 0x09, 0x01, 0x00, 0xa6] },
]

export function Choices(): DropdownChoice[] {
	const output: DropdownChoice[] = new Array<DropdownChoice>()
	Sources.forEach((entry) => {
		return output.push(entry.choice)
	})
	return output
}
