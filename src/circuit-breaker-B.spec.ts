import axios, { AxiosResponse } from 'axios';
import CircuitBreaker, { State } from './circuit-breaker-B';

jest.mock('axios');

describe('CircuitBreaker', () => {
  let axiosMocked = axios.get as jest.MockedFunction<typeof axios.get>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call service successfully when circuit is closed', async () => {
    const circuitBreaker = new CircuitBreaker();

    const responseData = { data: 'some data' } as AxiosResponse;
    axiosMocked.mockResolvedValue(responseData);

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual('some data');
    expect(axios.get).toHaveBeenCalledWith('http://example.com');
  });

  it('should handle failure and not call service when circuit is open', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['state'] = State.Open;

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should handle failure and not call service when in half-open and time limit has not passed', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 1000;

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should attempt reset and call service when in half-open and time limit has passed', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    const responseData = { data: 'some data' } as AxiosResponse;
    axiosMocked.mockResolvedValue(responseData);

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual('some data');
    expect(axios.get).toHaveBeenCalledWith('http://example.com');
    expect(circuitBreaker['state']).toEqual(State.Closed)
  });

  it('should handle failure and not call service when in half-open and time limit has passed but callServiceInternal fails', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    axiosMocked.mockResolvedValue(new Error('Failed to fetch data'));

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axios.get).toHaveBeenCalledWith('http://example.com');
  });

  it('should change state halfOpen to Open when passed failure threshold', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['failureCount'] = 2;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    axiosMocked.mockResolvedValue(new Error('Failed to fetch data'));

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axios.get).toHaveBeenCalledWith('http://example.com');
    expect(circuitBreaker['state']).toEqual(State.Open)
  });

  it('should attempt reset and change state to HalfOpen', async () => {
    const circuitBreaker = new CircuitBreaker();
    circuitBreaker['retryTimeout'] = 100;

    const attemptResetPromise = circuitBreaker['attemptReset']();

    jest.runOnlyPendingTimers();

    await attemptResetPromise;

    expect(circuitBreaker['state']).toEqual(State.HalfOpen);
  });
});
