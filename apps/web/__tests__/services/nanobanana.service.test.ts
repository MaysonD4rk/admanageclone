import {
  buildAdPrompt,
  buildNanoBananaRequest,
  isTransientError,
  callNanoBananaAPI,
} from '@/lib/services/nanobanana.service'
import { NanoBananaError } from '@/lib/errors'
import type { NanoBananaResponse } from '@/lib/types'

// ─── Fixtures ─────────────────────────────────────────────

const MOCK_SUCCESS_RESPONSE: NanoBananaResponse = {
  taskId: 'task_abc123',
  paramJson: '{}',
  completeTime: '2026-03-08 21:44:38',
  response: {
    originImageUrl: null,
    resultImageUrl: 'https://tempfile.aiquickdraw.com/workers/nano/test.png',
  },
  successFlag: 1,
  errorCode: null,
  errorMessage: null,
  operationType: 'nanobanana_IMAGETOIMAGE',
  createTime: '2026-03-08 21:44:09',
}

function mockFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  } as Response)
}

beforeEach(() => {
  process.env.NANOBANANA_API_KEY = 'test-api-key'
  process.env.NANOBANANA_CALLBACK_URL = 'http://localhost:3000/api/generate-image/callback'
})

afterEach(() => {
  jest.restoreAllMocks()
  delete process.env.NANOBANANA_API_KEY
})

// ─── buildAdPrompt ────────────────────────────────────────

describe('buildAdPrompt', () => {
  it('prepends the advertising context prefix', () => {
    const result = buildAdPrompt('a red sneaker on white background')
    expect(result).toContain('Create a high-quality advertising image')
    expect(result).toContain('a red sneaker on white background')
  })

  it('trims leading and trailing whitespace from the user prompt', () => {
    const result = buildAdPrompt('  product photo  ')
    expect(result).toContain('product photo')
    expect(result).not.toContain('  product photo  ')
  })

  it('throws when userPrompt is empty', () => {
    expect(() => buildAdPrompt('')).toThrow('userPrompt must not be empty')
    expect(() => buildAdPrompt('   ')).toThrow('userPrompt must not be empty')
  })

  it('produces a string longer than the original prompt', () => {
    const prompt = 'short prompt'
    expect(buildAdPrompt(prompt).length).toBeGreaterThan(prompt.length)
  })
})

// ─── buildNanoBananaRequest ───────────────────────────────

describe('buildNanoBananaRequest', () => {
  it('returns a valid request with defaults', () => {
    const req = buildNanoBananaRequest('full prompt here')
    expect(req.prompt).toBe('full prompt here')
    expect(req.imageUrls).toEqual([])
    expect(req.aspectRatio).toBe('auto')
    expect(req.resolution).toBe('1K')
    expect(req.googleSearch).toBe(false)
    expect(req.outputFormat).toBe('jpg')
    expect(req.callBackUrl).toContain('/api/generate-image/callback')
  })

  it('respects provided options', () => {
    const req = buildNanoBananaRequest('my prompt', {
      imageUrls: ['https://example.com/ref.jpg'],
      aspectRatio: '9:16',
      resolution: '2K',
    })
    expect(req.imageUrls).toEqual(['https://example.com/ref.jpg'])
    expect(req.aspectRatio).toBe('9:16')
    expect(req.resolution).toBe('2K')
  })
})

// ─── isTransientError ─────────────────────────────────────

describe('isTransientError', () => {
  it('returns true for NanoBananaError with 5xx status', () => {
    expect(isTransientError(new NanoBananaError('server error', null, 503))).toBe(true)
    expect(isTransientError(new NanoBananaError('bad gateway', null, 502))).toBe(true)
  })

  it('returns false for NanoBananaError with 4xx status', () => {
    expect(isTransientError(new NanoBananaError('bad request', null, 400))).toBe(false)
    expect(isTransientError(new NanoBananaError('unauthorized', null, 401))).toBe(false)
  })

  it('returns true for TypeError (fetch network failure)', () => {
    expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('returns true for errors with connection-related messages', () => {
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
    expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true)
    expect(isTransientError(new Error('fetch failed'))).toBe(true)
  })

  it('returns false for generic non-transient errors', () => {
    expect(isTransientError(new Error('invalid prompt'))).toBe(false)
    expect(isTransientError(new Error('some business logic error'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isTransientError(null)).toBe(false)
    expect(isTransientError('string error')).toBe(false)
    expect(isTransientError(42)).toBe(false)
  })
})

// ─── callNanoBananaAPI ────────────────────────────────────

describe('callNanoBananaAPI', () => {
  const validRequest = buildNanoBananaRequest(
    buildAdPrompt('a glowing skincare product'),
  )

  it('returns the parsed response on success', async () => {
    mockFetch(MOCK_SUCCESS_RESPONSE)
    const result = await callNanoBananaAPI(validRequest)
    expect(result).toEqual(MOCK_SUCCESS_RESPONSE)
  })

  it('sends Authorization header with the API key', async () => {
    mockFetch(MOCK_SUCCESS_RESPONSE)
    await callNanoBananaAPI(validRequest)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer test-api-key')
  })

  it('sends Content-Type: application/json', async () => {
    mockFetch(MOCK_SUCCESS_RESPONSE)
    await callNanoBananaAPI(validRequest)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('throws NanoBananaError when successFlag !== 1', async () => {
    mockFetch({ ...MOCK_SUCCESS_RESPONSE, successFlag: 0, errorCode: 'PROMPT_VIOLATION', errorMessage: 'Bad prompt' })
    await expect(callNanoBananaAPI(validRequest)).rejects.toThrow(NanoBananaError)
  })

  it('includes errorCode and taskId in the thrown NanoBananaError', async () => {
    const failResponse = {
      ...MOCK_SUCCESS_RESPONSE,
      successFlag: 0,
      errorCode: 'PROMPT_VIOLATION',
      errorMessage: 'Prompt not allowed',
      taskId: 'task_fail_001',
    }
    mockFetch(failResponse)

    try {
      await callNanoBananaAPI(validRequest)
      fail('Expected NanoBananaError')
    } catch (error) {
      expect(error).toBeInstanceOf(NanoBananaError)
      const e = error as NanoBananaError
      expect(e.nanoBananaErrorCode).toBe('PROMPT_VIOLATION')
      expect(e.taskId).toBe('task_fail_001')
    }
  })

  it('throws NanoBananaError on HTTP 500', async () => {
    mockFetch({}, 500)
    await expect(callNanoBananaAPI(validRequest)).rejects.toThrow(NanoBananaError)
  })

  it('throws NanoBananaError on HTTP 401', async () => {
    mockFetch({ message: 'Unauthorized' }, 401)
    const error = await callNanoBananaAPI(validRequest).catch((e) => e)
    expect(error).toBeInstanceOf(NanoBananaError)
    expect(error.statusCode).toBe(400) // 4xx maps to 400
  })

  it('throws NanoBananaError with NETWORK_ERROR code on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await callNanoBananaAPI(validRequest).catch((e) => e)
    expect(error).toBeInstanceOf(NanoBananaError)
    expect(error.nanoBananaErrorCode).toBe('NETWORK_ERROR')
  })

  it('throws when NANOBANANA_API_KEY is not set', async () => {
    delete process.env.NANOBANANA_API_KEY
    await expect(callNanoBananaAPI(validRequest)).rejects.toThrow('NANOBANANA_API_KEY')
  })
})
