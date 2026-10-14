import type { CompanionInputFieldDropdown } from '@companion-module/base'
import type PhilipsSICPInstance from './main.js'
import type { VolumeOutput } from './sicp.js'
import { Choices, MaxVolume, Sources } from './sicpcommand.js'

export enum ActionID {
	Power = 'power',
	// Kept with this casing, as existing buttons reference the action by this id
	Set_Source = 'Set_Source',
	Volume_Step = 'volume_step',
	Volume_Set = 'volume_set',
	Mute = 'mute',
}

const VolumeOutputOption = {
	type: 'dropdown',
	id: 'output',
	label: 'Output',
	choices: [
		{ id: 'both', label: 'Speakers and audio out' },
		{ id: 'speaker', label: 'Speakers' },
		{ id: 'audio_out', label: 'Audio out' },
	],
	default: 'both',
} as const satisfies CompanionInputFieldDropdown<'output', VolumeOutput>

export type ActionsSchema = {
	[ActionID.Power]: {
		options: {
			state: 'on' | 'off' | 'toggle'
		}
	}
	[ActionID.Set_Source]: {
		options: {
			source: string
			OSD: boolean
		}
	}
	[ActionID.Volume_Step]: {
		options: {
			direction: 'up' | 'down'
			output: VolumeOutput
		}
	}
	[ActionID.Volume_Set]: {
		options: {
			level: number
			output: VolumeOutput
		}
	}
	[ActionID.Mute]: {
		options: {
			state: 'on' | 'off' | 'toggle'
		}
	}
}

export function UpdateActions(self: PhilipsSICPInstance): void {
	self.setActionDefinitions({
		[ActionID.Power]: {
			name: 'Power',
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					choices: [
						{ id: 'on', label: 'on' },
						{ id: 'off', label: 'off' },
						{ id: 'toggle', label: 'toggle' },
					],
					default: 'on',
				},
			],
			callback: async (action) => {
				switch (action.options.state) {
					case 'on':
						await self.SICP.powerOn()
						break
					case 'off':
						await self.SICP.powerOff()
						break
					case 'toggle':
						await self.SICP.togglePower()
						break
				}
			},
		},
		[ActionID.Set_Source]: {
			name: 'Set Source',
			options: [
				{
					type: 'dropdown',
					id: 'source',
					label: 'Source',
					choices: Choices(),
					default: Sources[0].choice.id,
				},
				{
					type: 'checkbox',
					id: 'OSD',
					label: 'Show source',
					default: true,
				},
			],
			callback: async (action) => {
				if (!action.options.source) return
				await self.SICP.setSource(String(action.options.source), action.options.OSD !== false)
			},
		},
		[ActionID.Volume_Step]: {
			name: 'Volume Up/Down',
			description: 'Raise or lower the volume by one step',
			options: [
				{
					type: 'dropdown',
					id: 'direction',
					label: 'Direction',
					choices: [
						{ id: 'up', label: 'Up' },
						{ id: 'down', label: 'Down' },
					],
					default: 'up',
				},
				VolumeOutputOption,
			],
			callback: async (action) => {
				await self.SICP.stepVolume(action.options.direction === 'down' ? 'down' : 'up', action.options.output)
			},
		},
		[ActionID.Volume_Set]: {
			name: 'Set Volume',
			options: [
				{
					type: 'number',
					id: 'level',
					label: 'Level (%)',
					default: 50,
					min: 0,
					max: MaxVolume,
					range: true,
					clampValues: true,
				},
				VolumeOutputOption,
			],
			callback: async (action) => {
				const level = Number(action.options.level)
				if (Number.isNaN(level)) return
				await self.SICP.setVolume(level, action.options.output)
			},
		},
		[ActionID.Mute]: {
			name: 'Mute',
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					choices: [
						{ id: 'on', label: 'on' },
						{ id: 'off', label: 'off' },
						{ id: 'toggle', label: 'toggle' },
					],
					default: 'toggle',
				},
			],
			callback: async (action) => {
				switch (action.options.state) {
					case 'on':
						await self.SICP.setMute(true)
						break
					case 'off':
						await self.SICP.setMute(false)
						break
					case 'toggle':
						await self.SICP.toggleMute()
						break
				}
			},
		},
	})
}
