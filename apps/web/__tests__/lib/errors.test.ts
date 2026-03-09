import { AppError, ValidationError, NotFoundError, DuplicateAssetError, toErrorResponse } from '@/lib/errors'

describe('Domain errors', () => {
  describe('AppError', () => {
    it('sets message and default status code 500', () => {
      const err = new AppError('something failed')
      expect(err.message).toBe('something failed')
      expect(err.statusCode).toBe(500)
    })

    it('accepts a custom status code', () => {
      const err = new AppError('bad request', 400)
      expect(err.statusCode).toBe(400)
    })

    it('is an instance of Error', () => {
      expect(new AppError('x')).toBeInstanceOf(Error)
    })
  })

  describe('ValidationError', () => {
    it('has status code 400', () => {
      expect(new ValidationError('invalid').statusCode).toBe(400)
    })
  })

  describe('NotFoundError', () => {
    it('has status code 404 and includes resource name', () => {
      const err = new NotFoundError('Project')
      expect(err.statusCode).toBe(404)
      expect(err.message).toContain('Project')
    })
  })

  describe('DuplicateAssetError', () => {
    it('has status code 409', () => {
      expect(new DuplicateAssetError('id_123').statusCode).toBe(409)
    })

    it('exposes the existingId', () => {
      const err = new DuplicateAssetError('id_123')
      expect(err.existingId).toBe('id_123')
    })
  })

  describe('toErrorResponse', () => {
    it('converts an AppError to a JSON-safe object', () => {
      const result = toErrorResponse(new ValidationError('invalid input'))
      expect(result).toEqual({ error: 'invalid input' })
    })

    it('converts a plain Error to a JSON-safe object', () => {
      const result = toErrorResponse(new Error('plain error'))
      expect(result).toEqual({ error: 'plain error' })
    })

    it('returns a generic message for unknown error types', () => {
      const result = toErrorResponse('something weird')
      expect(result.error).toBe('An unexpected error occurred')
    })
  })
})
