import type PhilipsSICPInstance from './main.js'
import { Choices, Sources } from './sicpcommand.js'

export enum FeedbackID {
	PowerState = 'powerstate',
	InputSource = 'inputsource',
}

export type FeedbacksSchema = {
	[FeedbackID.PowerState]: {
		type: 'boolean'
		options: Record<string, never>
	}
	[FeedbackID.InputSource]: {
		type: 'boolean'
		options: {
			source: string
		}
	}
}

export function UpdateFeedbacks(self: PhilipsSICPInstance): void {
	self.setFeedbackDefinitions({
		[FeedbackID.PowerState]: {
			name: 'Display On',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.SICP.state.PowerState
			},
		},
		[FeedbackID.InputSource]: {
			name: 'Active Input Source',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [
				{
					type: 'dropdown',
					id: 'source',
					label: 'Source',
					choices: Choices(),
					default: Sources[0].choice.id,
				},
			],
			callback: (feedback) => {
				return self.SICP.state.InputSource !== undefined && self.SICP.state.InputSource == feedback.options.source
			},
		},
	})
}
