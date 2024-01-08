import HttpClient from './http-client';

export enum State {
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

  constructor(private httpClient: HttpClient) {}

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
      const response = await this.httpClient.get(url);

      if (response instanceof Error) {
        throw new Error()
      }
      
      this.reset();
      return response;
    } catch (error) {
      this.handleFailure();
      return false
    }
  }

  public async callService(url: string): Promise<Record<string, unknown> | boolean> {
    if (this.state === State.Open) {
      return false
    }

    const theTimeLimitHasAlreadyPassed = Date.now() - this.lastAttempt > this.retryTimeout

    if (this.state === State.HalfOpen && !theTimeLimitHasAlreadyPassed) {
      return false
    }

    const responseRequest = await this.tryRequestInternal(url);

    return responseRequest;
  }
}
