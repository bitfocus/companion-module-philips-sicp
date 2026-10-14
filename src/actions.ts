import type PhilipsSICPInstance from './main.js'
import { Choices, Sources } from './sicpcommand.js'

export enum ActionID {
	Power = 'power',
	// Kept with this casing, as existing buttons reference the action by this id
	Set_Source = 'Set_Source',
}

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
	})
}
