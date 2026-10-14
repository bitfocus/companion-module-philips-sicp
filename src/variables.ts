import type PhilipsSICPInstance from './main.js'
import { Sources } from './sicpcommand.js'

export type VariablesSchema = {
	power_state: boolean
	input_source: string
	input_source_label: string
	volume: number | undefined
	volume_audio_out: number | undefined
	mute: boolean | undefined
}

export function UpdateVariableDefinitions(self: PhilipsSICPInstance): void {
	self.setVariableDefinitions({
		power_state: { name: 'Display is powered on' },
		input_source: { name: 'Active input source (id)' },
		input_source_label: { name: 'Active input source (name)' },
		volume: { name: 'Speaker volume (%)' },
		volume_audio_out: { name: 'Audio out volume (%)' },
		mute: { name: 'Audio is muted' },
	})
}

export function UpdateVariableValues(self: PhilipsSICPInstance): void {
	const { PowerState, InputSource, Volume, VolumeAudioOut, Mute } = self.SICP.state
	self.setVariableValues({
		power_state: PowerState,
		input_source: InputSource ?? '',
		input_source_label: Sources.find((source) => source.choice.id === InputSource)?.choice.label ?? '',
		volume: Volume,
		volume_audio_out: VolumeAudioOut,
		mute: Mute,
	})
}
