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

// Async export so we can override next/jest's transformIgnorePatterns.
// cheerio v1.x ships as ESM — we must allow Jest/SWC to transform it
// and its transitive dependencies.
module.exports = async () => {
  const base = await createJestConfig(customConfig)()
  return {
    ...base,
    transformIgnorePatterns: [
      'node_modules/(?!(cheerio|parse5|htmlparser2|entities|css-select|css-what|boolbase|nth-check|dom-serializer|domelementtype|domhandler|domutils)/)',
    ],
  }
}
