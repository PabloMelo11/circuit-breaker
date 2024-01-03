import axios, { AxiosRequestConfig } from 'axios'

type State = {
  failures: number,
  circuit: 'OPEN' | 'CLOSED' | 'HALF-OPEN'
  lastAttempt: number
}

export default class CircuitBreaker {
  states: Record<string, State>
  failureThreshold: number
  retryTimeout: number
  
  constructor() {
    this.states = {}
    this.failureThreshold = 5
    this.retryTimeout = 5000
  }

  initState(endpoint: string) {
    this.states[endpoint] = {
      failures: 0,
      circuit: 'CLOSED',
      lastAttempt: 0
    }
  }

  onFailure(endpoint: string) {
    const state = this.states[endpoint]

    state.failures += 1

    if (state.failures > this.failureThreshold) {
      state.circuit = 'OPEN'
      state.lastAttempt = Date.now()
      console.log(`Circuit for ${endpoint} is in state 'OPEN'`)
    }
  }

  onSuccess(endpoint: string) {
    this.initState(endpoint)
  }

  canRequest(endpoint: string) {
    if (!this.states[endpoint]) {
      this.initState(endpoint)
    }

    const state = this.states[endpoint]

    if (state.circuit === 'CLOSED') {
      return true
    }

    const theTimeLimitHasAlreadyPassed = Date.now() - state.lastAttempt > this.retryTimeout

    if (theTimeLimitHasAlreadyPassed) {
      state.circuit = 'HALF-OPEN'
      return true
    }

    return false
  }

  async callService(reqOptions: AxiosRequestConfig) {
    const endpoint = `${reqOptions.method}:${reqOptions.url}`

    if (!this.canRequest(endpoint)) {
      return false;
    }

    try {
      const response = await axios(reqOptions)
      
      this.onSuccess(endpoint)

      return response.data
    } catch (err) {
      this.onFailure(endpoint)

      return false
    }
  }
}

