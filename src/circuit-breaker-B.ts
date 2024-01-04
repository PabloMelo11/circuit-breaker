import axios from 'axios';

enum State {
  Closed = 'closed',
  Open = 'open',
  HalfOpen = 'halfOpen',
}

export default class CircuitBreaker {
  private state: State = State.Closed;
  private failureThreshold = 3;
  private failureCount = 0;
  private retryTimeout = 5000;
  private lastAttempt = 0;

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleFailure(): void {
    this.failureCount++;

    const passedFailureThreshold = this.failureCount >= this.failureThreshold

    if (passedFailureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = State.Open;
    this.lastAttempt = Date.now();

    this.attemptReset();
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = State.Closed;
    this.lastAttempt = 0;
  }

  private async attemptReset(): Promise<void> {
    await this.sleep(this.retryTimeout);
    this.state = State.HalfOpen;
  }

  private async tryRequestInternal(url: string): Promise<any> {
    try {
      const response = await axios.get(url);
      this.reset();
      return response.data;
    } catch (error) {
      this.handleFailure();
      return null
    }
  }

  public async callService(url: string): Promise<any> {
    if (this.state === State.Open) {
      throw new Error('Circuit Breaker is open');
    }

    const theTimeLimitHasAlreadyPassed = Date.now() - this.lastAttempt > this.retryTimeout

    if (this.state === State.HalfOpen && theTimeLimitHasAlreadyPassed) {
      return this.tryRequestInternal(url);
    } else if (this.state === State.HalfOpen && !theTimeLimitHasAlreadyPassed) {
      throw new Error('The time limit for new attempts has not yet passed')
    }

    return this.tryRequestInternal(url);
  }
}
