import { withRetry } from '@/lib/utils/retry'

// Use real timers with 1ms base delay — fast enough for tests, no fake timer complexity
const FAST_OPTIONS = { maxRetries: 2, baseDelayMs: 1 }

describe('withRetry', () => {
  it('returns the result immediately when the function succeeds on the first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, FAST_OPTIONS)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds when a later attempt resolves', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(fn, FAST_OPTIONS)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'))
    await expect(withRetry(fn, FAST_OPTIONS)).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('does not retry when isRetryable returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-retryable'))
    await expect(
      withRetry(fn, { ...FAST_OPTIONS, isRetryable: () => false }),
    ).rejects.toThrow('non-retryable')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry with the correct attempt and delay arguments', async () => {
    const onRetry = jest.fn()
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok')

    await withRetry(fn, { maxRetries: 3, baseDelayMs: 1, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(1)
    const [attempt, total, , delayMs] = onRetry.mock.calls[0]
    expect(attempt).toBe(1)
    expect(total).toBe(4) // maxRetries + 1
    expect(delayMs).toBe(1) // baseDelayMs * 2^0
  })

  it('applies exponential back-off: delay doubles each retry', async () => {
    const delays: number[] = []
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('f1'))
      .mockRejectedValueOnce(new Error('f2'))
      .mockRejectedValueOnce(new Error('f3'))
      .mockResolvedValueOnce('ok')

    await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      onRetry: (_a, _t, _e, delay) => delays.push(delay),
    })

    expect(delays).toEqual([10, 20, 40])
  })

  it('stops retrying mid-sequence when isRetryable returns false', async () => {
    let call = 0
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('permanent'))

    await expect(
      withRetry(fn, {
        ...FAST_OPTIONS,
        maxRetries: 3,
        isRetryable: () => ++call < 2, // retryable on 1st failure only
      }),
    ).rejects.toThrow('permanent')

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes the error instance to onRetry', async () => {
    const onRetry = jest.fn()
    const originalError = new Error('the error')
    const fn = jest
      .fn()
      .mockRejectedValueOnce(originalError)
      .mockResolvedValueOnce('ok')

    await withRetry(fn, { ...FAST_OPTIONS, onRetry })

    const [, , capturedError] = onRetry.mock.calls[0]
    expect(capturedError).toBe(originalError)
  })
})
