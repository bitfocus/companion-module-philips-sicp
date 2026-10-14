import type { DropdownChoice } from '@companion-module/base'

export const ControlByte = 0x01

export const CommandCode = {
	Ack: 0x00,
	SetPowerState: 0x18,
	GetPowerState: 0x19,
	GetGroupID: 0x5d,
	SetInputSource: 0xac,
	GetInputSource: 0xad,
	StepVolume: 0x41,
	SetVolume: 0x44,
	GetVolume: 0x45,
	GetMute: 0x46,
	SetMute: 0x47,
} as const

export const AckByte = 0x06

export const VolumeStep = {
	Down: 0x00,
	Up: 0x01,
	NoChange: 0x02,
} as const
export type VolumeStepValue = (typeof VolumeStep)[keyof typeof VolumeStep]

export const MaxVolume = 100

export const Sources: { choice: DropdownChoice<string>; command: number }[] = [
	{ choice: { id: 'HDMI1', label: 'HDMI 1' }, command: 0x0d },
	{ choice: { id: 'HDMI2', label: 'HDMI 2' }, command: 0x06 },
	{ choice: { id: 'HDMI3', label: 'HDMI 3' }, command: 0x0f },
	{ choice: { id: 'HDMI4', label: 'HDMI 4' }, command: 0x19 },
	{ choice: { id: 'DVI', label: 'DVI' }, command: 0x0e },
	{ choice: { id: 'VGA', label: 'VGA' }, command: 0x05 },
	{ choice: { id: 'VGA2', label: 'VGA 2' }, command: 0x1a },
	{ choice: { id: 'VGA3', label: 'VGA 3' }, command: 0x1b },
	{ choice: { id: 'DP', label: 'Display Port' }, command: 0x0a },
	{ choice: { id: 'DP2', label: 'Display Port 2' }, command: 0x07 },
]

export function CompleteCommand(input: number[]): Uint8Array {
	// Message size includes the size byte itself and the checksum
	input.unshift(input.length + 2)

	let checksum = 0x00
	input.forEach((t) => {
		checksum ^= t
	})
	input.push(checksum)
	return new Uint8Array(input)
}

export function Choices(): DropdownChoice<string>[] {
	return Sources.map((entry) => entry.choice)
}

export function SetPowerStateRequest(state: boolean, groupID: number): Uint8Array {
	return CompleteCommand([...getBase(groupID), CommandCode.SetPowerState, state ? 0x02 : 0x01])
}

export function SetSourceRequest(source: string, groupID: number, OSD = true): Uint8Array | undefined {
	const command = Sources.find((entry) => entry.choice.id == source)?.command
	if (command === undefined) return
	return CompleteCommand([...getBase(groupID), CommandCode.SetInputSource, command, 0x09, OSD ? 0x01 : 0x02, 0x00])
}

export function GetPowerStateRequest(): Uint8Array {
	return CompleteCommand([...getBase(), CommandCode.GetPowerState])
}

export function GetGroupID(): Uint8Array {
	return CompleteCommand([...getBase(), CommandCode.GetGroupID])
}

export function GetInputSourceRequest(): Uint8Array {
	return CompleteCommand([...getBase(), CommandCode.GetInputSource])
}

/**
 * Set the volume of the speakers and audio out.
 * Platforms without a variable audio out (Himalaya 1.x, Eagle) only take the speaker level.
 */
export function SetVolumeRequest(speaker: number, audioOut: number | undefined, groupID: number): Uint8Array {
	const command = [...getBase(groupID), CommandCode.SetVolume, clampVolume(speaker)]
	if (audioOut !== undefined) command.push(clampVolume(audioOut))
	return CompleteCommand(command)
}

export function StepVolumeRequest(speaker: VolumeStepValue, audioOut: VolumeStepValue, groupID: number): Uint8Array {
	return CompleteCommand([...getBase(groupID), CommandCode.StepVolume, speaker, audioOut])
}

export function GetVolumeRequest(): Uint8Array {
	return CompleteCommand([...getBase(), CommandCode.GetVolume])
}

export function SetMuteRequest(mute: boolean, groupID: number): Uint8Array {
	return CompleteCommand([...getBase(groupID), CommandCode.SetMute, mute ? 0x01 : 0x00])
}

export function GetMuteRequest(): Uint8Array {
	return CompleteCommand([...getBase(), CommandCode.GetMute])
}

function clampVolume(level: number): number {
	return Math.min(MaxVolume, Math.max(0, Math.round(level)))
}

function getBase(groupID = 0x00): number[] {
	return [ControlByte, groupID]
}
