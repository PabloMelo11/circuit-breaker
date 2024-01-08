import CircuitBreaker, { State } from './circuit-breaker';
import HttpClient from './http-client';
import AxiosAdapter from './axios-adapter';

describe('CircuitBreaker', () => {
  let axiosAdapter: HttpClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    axiosAdapter = new AxiosAdapter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call service successfully when circuit is closed', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);

    const responseData = 'some data';
    jest.spyOn(axiosAdapter, 'get').mockResolvedValue(responseData)

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual('some data');
    expect(axiosAdapter.get).toHaveBeenCalledWith('http://example.com');
  });

  it('should handle failure and not call service when circuit is open', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['state'] = State.Open;

    const spyAxiosAdapter = jest.spyOn(axiosAdapter, 'get');

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(spyAxiosAdapter).not.toHaveBeenCalled();
  });

  it('should handle failure and not call service when in half-open and time limit has not passed', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 1000;

    const spyAxiosAdapter = jest.spyOn(axiosAdapter, 'get');

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(spyAxiosAdapter).not.toHaveBeenCalled();
  });

  it('should attempt reset and call service when in half-open and time limit has passed', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    const responseData = 'some data';
    jest.spyOn(axiosAdapter, 'get').mockResolvedValue(responseData)

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual('some data');
    expect(axiosAdapter.get).toHaveBeenCalledWith('http://example.com');
    expect(circuitBreaker['state']).toEqual(State.Closed)
  });

  it('should handle failure and not call service when in half-open and time limit has passed but callServiceInternal fails', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    jest.spyOn(axiosAdapter, 'get').mockResolvedValue(new Error('Failed to fetch data'))

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axiosAdapter.get).toHaveBeenCalledWith('http://example.com');
  });

  it('should change state halfOpen to Open when passed failure threshold', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['state'] = State.HalfOpen;
    circuitBreaker['failureCount'] = 2;
    circuitBreaker['lastAttempt'] = Date.now() - 6000;

    jest.spyOn(axiosAdapter, 'get').mockResolvedValue(new Error('Failed to fetch data'));

    const result = await circuitBreaker.callService('http://example.com');

    expect(result).toEqual(false);
    expect(axiosAdapter.get).toHaveBeenCalledWith('http://example.com');
    expect(circuitBreaker['state']).toEqual(State.Open)
  });

  it('should attempt reset and change state to HalfOpen', async () => {
    const circuitBreaker = new CircuitBreaker(axiosAdapter);
    circuitBreaker['retryTimeout'] = 100;

    const attemptResetPromise = circuitBreaker['attemptReset']();

    jest.runOnlyPendingTimers();

    await attemptResetPromise;

    expect(circuitBreaker['state']).toEqual(State.HalfOpen);
  });
});
