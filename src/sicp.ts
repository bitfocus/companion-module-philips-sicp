import { InstanceStatus, TCPHelper } from '@companion-module/base'
import wol from 'wake_on_lan'
import PQueue from 'p-queue'
import type { PhilipsSICPConfig } from './config.js'
import type PhilipsSICPInstance from './main.js'
import * as sicpcommands from './sicpcommand.js'
import { AckByte, CommandCode } from './sicpcommand.js'

/** Interval for polling power state and input source */
const POLL_INTERVAL = 3000
/** Time to wait for the display to answer a request */
const RESPONSE_TIMEOUT = 1000
/** Time between reconnection attempts when the display can't be reached */
const RECONNECT_INTERVAL = 5000
/** Number of unanswered requests after which the connection is re-established */
const MAX_MISSED_RESPONSES = 3
const MAX_QUEUE_SIZE = 20

const MAC_REGEX = /^[0-9a-fA-F]{12}$/

export interface SICPState {
	PowerState: boolean
	InputSource: string | undefined
}

export class SICPClass {
	readonly state: SICPState = {
		PowerState: false,
		InputSource: undefined,
	}

	#self: PhilipsSICPInstance
	#config: PhilipsSICPConfig
	#socket: TCPHelper | undefined
	#queue = new PQueue({ concurrency: 1 })
	#pollTimer: NodeJS.Timeout | undefined
	#receiveBuffer = Buffer.alloc(0)
	#pendingResponse: ((frame: Uint8Array | undefined) => void) | undefined
	/** Incremented on every (re)connect, so queued requests for an old connection are dropped */
	#generation = 0
	#missedResponses = 0
	#groupId = 0x00
	/** True when the display has answered since the last (re)connect */
	#communicating = false
	/** Last logged problem, used so a persisting problem is only logged once */
	#lastError: string | undefined

	constructor(self: PhilipsSICPInstance, config: PhilipsSICPConfig) {
		this.#self = self
		this.#config = { ...config }
		this.#connect()
		this.#pollTimer = setInterval(() => this.#poll(), POLL_INTERVAL)
	}

	get groupid(): number {
		return this.#groupId
	}

	updateConfig(config: PhilipsSICPConfig): void {
		const reconnect = config.host !== this.#config.host || config.port !== this.#config.port
		this.#config = { ...config }
		if (reconnect) {
			this.#lastError = undefined
			this.#connect()
		}
	}

	destroy(): void {
		if (this.#pollTimer) clearInterval(this.#pollTimer)
		this.#pollTimer = undefined
		this.#disconnect()
	}

	async powerOn(): Promise<void> {
		if (this.#config.wol) {
			this.#wake()
			return
		}
		await this.#sendAll(sicpcommands.SetPowerStateRequest(true, this.groupid), sicpcommands.GetPowerStateRequest())
	}

	async powerOff(): Promise<void> {
		await this.#sendAll(sicpcommands.SetPowerStateRequest(false, this.groupid), sicpcommands.GetPowerStateRequest())
	}

	async togglePower(): Promise<void> {
		// Refresh the power state first, when the display can't be reached it is considered off
		await this.#send(sicpcommands.GetPowerStateRequest())
		if (this.state.PowerState) await this.powerOff()
		else await this.powerOn()
	}

	async setSource(source: string, showOSD: boolean): Promise<void> {
		const request = sicpcommands.SetSourceRequest(source, this.groupid, showOSD)
		if (!request) {
			this.#self.log('warn', `Unknown input source: ${source}`)
			return
		}
		await this.#sendAll(request, sicpcommands.GetInputSourceRequest())
	}

	#connect(): void {
		this.#disconnect()

		if (!this.#config.host) {
			this.#self.updateStatus(InstanceStatus.BadConfig, 'No host configured')
			return
		}

		this.#self.updateStatus(InstanceStatus.Connecting)

		// TCPHelper takes care of reconnecting by itself, so a single socket is kept for the lifetime of the config
		const socket = new TCPHelper(this.#config.host, this.#config.port, { reconnect_interval: RECONNECT_INTERVAL })
		this.#socket = socket

		socket.on('status_change', (status, message) => {
			this.#self.updateStatus(status, message ?? null)
		})
		socket.on('connect', () => {
			this.#resetConnectionState()
			void this.#send(sicpcommands.GetGroupID())
			this.#poll()
		})
		socket.on('end', () => {
			this.#connectionLost()
		})
		socket.on('error', (err) => {
			const message = /ECONNREFUSED/i.test(err.message)
				? 'Network error: Could not connect to display (connection refused)'
				: `Network error: ${err.message}`
			this.#reportProblem('error', message)
			this.#connectionLost()
		})
		socket.on('data', (data) => {
			this.#receive(data)
		})
	}

	#disconnect(): void {
		this.#socket?.destroy()
		this.#socket = undefined
		this.#connectionLost()
	}

	#resetConnectionState(): void {
		this.#generation++
		this.#queue.clear()
		this.#receiveBuffer = Buffer.alloc(0)
		this.#missedResponses = 0
		this.#communicating = false
		this.#pendingResponse?.(undefined)
	}

	#connectionLost(): void {
		this.#resetConnectionState()
		this.#updateState({ PowerState: false, InputSource: undefined })
	}

	/**
	 * Log a problem, but only when it differs from the previously logged one.
	 * The display can be unreachable for days (e.g. when it is in deep standby),
	 * so logging every reconnection attempt would flood the log.
	 */
	#reportProblem(level: 'error' | 'warn', message: string): void {
		if (this.#lastError === message) return
		this.#lastError = message
		this.#self.log(level, `${message}. Retrying every ${RECONNECT_INTERVAL / 1000}s, repeated messages are suppressed.`)
	}

	#poll(): void {
		if (!this.#socket?.isConnected || this.#queue.size > 0) return
		void this.#send(sicpcommands.GetPowerStateRequest())
		void this.#send(sicpcommands.GetInputSourceRequest())
	}

	async #sendAll(...requests: Uint8Array[]): Promise<void> {
		await Promise.all(requests.map(async (request) => this.#send(request)))
	}

	/** Queue a request, resolves with the response of the display or undefined when there was none */
	async #send(request: Uint8Array): Promise<Uint8Array | undefined> {
		if (!this.#socket?.isConnected) return undefined
		if (this.#queue.size >= MAX_QUEUE_SIZE) {
			this.#self.log('warn', 'Too many pending requests, request was dropped')
			return undefined
		}

		const generation = this.#generation
		return this.#queue.add(async () => {
			if (generation !== this.#generation) return undefined
			return this.#transmit(request)
		})
	}

	async #transmit(request: Uint8Array): Promise<Uint8Array | undefined> {
		const socket = this.#socket
		if (!socket?.isConnected) return undefined

		const response = new Promise<Uint8Array | undefined>((resolve) => {
			const done = (frame: Uint8Array | undefined) => {
				clearTimeout(timer)
				if (this.#pendingResponse === done) this.#pendingResponse = undefined
				resolve(frame)
			}
			const timer = setTimeout(() => done(undefined), RESPONSE_TIMEOUT)
			this.#pendingResponse = done
		})

		try {
			await socket.sendAsync(Buffer.from(request))
		} catch (e) {
			this.#pendingResponse?.(undefined)
			this.#self.log('debug', `Failed to send request: ${e instanceof Error ? e.message : String(e)}`)
			return undefined
		}

		const frame = await response
		if (!frame && socket === this.#socket && socket.isConnected) this.#missedResponse()
		return frame
	}

	#missedResponse(): void {
		this.#missedResponses++
		if (this.#missedResponses < MAX_MISSED_RESPONSES) return

		// The display accepted the connection but stopped answering, start over with a fresh connection
		this.#reportProblem('warn', 'Display did not respond to requests')
		this.#self.updateStatus(InstanceStatus.UnknownError, 'Display not responding')
		this.#connect()
	}

	#receive(data: Buffer): void {
		this.#receiveBuffer = Buffer.concat([this.#receiveBuffer, data])

		// Every SICP message starts with its total size
		while (this.#receiveBuffer.length > 0) {
			const size = this.#receiveBuffer[0]
			if (size < 5) {
				this.#self.log('debug', 'Received invalid data, discarding it')
				this.#receiveBuffer = Buffer.alloc(0)
				break
			}
			if (this.#receiveBuffer.length < size) break

			const frame = new Uint8Array(this.#receiveBuffer.subarray(0, size))
			this.#receiveBuffer = this.#receiveBuffer.subarray(size)
			this.#processFrame(frame)
		}
	}

	#processFrame(frame: Uint8Array): void {
		this.#missedResponses = 0
		if (!this.#communicating) {
			this.#communicating = true
			if (this.#lastError !== undefined) this.#self.log('info', 'Connection to display restored')
			this.#lastError = undefined
			this.#self.updateStatus(InstanceStatus.Ok)
		}

		switch (frame[3]) {
			case CommandCode.GetPowerState: {
				this.#updateState({ PowerState: frame[4] === 0x02 })
				break
			}
			case CommandCode.GetInputSource: {
				this.#updateState({ InputSource: sicpcommands.Sources.find((t) => t.command === frame[4])?.choice.id })
				break
			}
			case CommandCode.Ack: {
				if (frame[4] !== AckByte) this.#self.log('debug', 'Display did not accept the last command')
				break
			}
			case CommandCode.GetGroupID: {
				if (frame[0] === 0x06) this.#groupId = frame[4]
				break
			}
			default:
				break
		}

		this.#pendingResponse?.(frame)
	}

	#updateState(newState: Partial<SICPState>): void {
		let changed = false
		for (const key of Object.keys(newState) as (keyof SICPState)[]) {
			if (this.state[key] !== newState[key]) {
				Object.assign(this.state, { [key]: newState[key] })
				changed = true
			}
		}
		if (changed) this.#self.stateChanged()
	}

	#wake(): void {
		const mac = this.#config.mac.replace(/[:.-]/g, '')
		if (!MAC_REGEX.test(mac)) {
			this.#self.log('warn', 'Cannot send WoL packet, the configured MAC address is invalid')
			return
		}

		const options: wol.WakeOptions = {
			port: 9,
			address: this.#config.broadcast || '255.255.255.255',
			num_packets: 5,
			interval: 100,
		}
		wol.wake(mac, options, (err: Error | null | undefined) => {
			if (err) this.#self.log('warn', `Failed to send WoL packet: ${err.message}`)
		})
	}
}
