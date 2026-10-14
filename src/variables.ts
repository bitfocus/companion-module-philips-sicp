import type PhilipsSICPInstance from './main.js'
import { Sources } from './sicpcommand.js'

export type VariablesSchema = {
	power_state: boolean
	input_source: string
	input_source_label: string
}

export function UpdateVariableDefinitions(self: PhilipsSICPInstance): void {
	self.setVariableDefinitions({
		power_state: { name: 'Display is powered on' },
		input_source: { name: 'Active input source (id)' },
		input_source_label: { name: 'Active input source (name)' },
	})
}

export function UpdateVariableValues(self: PhilipsSICPInstance): void {
	const { PowerState, InputSource } = self.SICP.state
	self.setVariableValues({
		power_state: PowerState,
		input_source: InputSource ?? '',
		input_source_label: Sources.find((source) => source.choice.id === InputSource)?.choice.label ?? '',
	})
}
