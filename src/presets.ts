import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import type PhilipsSICPInstance from './main.js'
import type { ModuleSchema } from './main.js'
import { ActionID } from './actions.js'
import { FeedbackID } from './feedbacks.js'
import { Sources } from './sicpcommand.js'

const ActiveStyle = { bgcolor: 0x00ff00, color: 0x000000 }

export function UpdatePresets(self: PhilipsSICPInstance): void {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	const powerStates = [
		{ state: 'on', label: 'Power\\nOn' },
		{ state: 'off', label: 'Power\\nOff' },
		{ state: 'toggle', label: 'Power\\nToggle' },
	] as const
	for (const { state, label } of powerStates) {
		presets[`power_${state}`] = {
			type: 'simple',
			name: `Power ${state}`,
			style: {
				text: label,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			steps: [
				{
					down: [{ actionId: ActionID.Power, options: { state } }],
					up: [],
				},
			],
			feedbacks: [{ feedbackId: FeedbackID.PowerState, options: {}, style: ActiveStyle }],
		}
	}

	for (const source of Sources) {
		presets[`source_${source.choice.id}`] = {
			type: 'simple',
			name: `Select ${source.choice.label}`,
			style: {
				text: source.choice.label,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			steps: [
				{
					down: [{ actionId: ActionID.Set_Source, options: { source: source.choice.id, OSD: true } }],
					up: [],
				},
			],
			feedbacks: [{ feedbackId: FeedbackID.InputSource, options: { source: source.choice.id }, style: ActiveStyle }],
		}
	}

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'power',
			name: 'Power',
			definitions: [
				{
					id: 'power',
					name: 'Power',
					type: 'simple',
					presets: powerStates.map(({ state }) => `power_${state}`),
				},
			],
		},
		{
			id: 'source',
			name: 'Input Source',
			definitions: [
				{
					id: 'source',
					name: 'Input Source',
					type: 'simple',
					presets: Sources.map((source) => `source_${source.choice.id}`),
				},
			],
		},
	]

	self.setPresetDefinitions(structure, presets)
}
