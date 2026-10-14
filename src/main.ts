import { InstanceBase, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type PhilipsSICPConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariableValues, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { FeedbackID, UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { SICPClass } from './sicp.js'

export type ModuleSchema = {
	config: PhilipsSICPConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class PhilipsSICPInstance extends InstanceBase<ModuleSchema> {
	config!: PhilipsSICPConfig // Setup in init()
	SICP!: SICPClass // Setup in init()

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: PhilipsSICPConfig): Promise<void> {
		this.config = config

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export presets
		this.updateVariableDefinitions() // export variable definitions

		this.SICP = new SICPClass(this, config)
		this.stateChanged()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.SICP?.destroy()
	}

	async configUpdated(config: PhilipsSICPConfig): Promise<void> {
		this.config = config
		this.SICP.updateConfig(config)
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/** Called by the SICP connection whenever the known display state changes */
	stateChanged(): void {
		if (!this.SICP) return
		this.checkFeedbacks(FeedbackID.PowerState, FeedbackID.InputSource)
		UpdateVariableValues(this)
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
