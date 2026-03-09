const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customConfig = {
  displayName: 'admanage-web',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/services/**/*.ts',
    'lib/errors.ts',
    'lib/types.ts',
    'components/**/*.tsx',
    '!**/*.d.ts',
  ],
}

module.exports = createJestConfig(customConfig)
