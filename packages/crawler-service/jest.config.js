/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Transform .ts files with ts-jest; leave .js files (e.g. health.test.js) as-is.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  testMatch: ['**/__tests__/**/*.{js,ts}', '**/*.test.{js,ts}'],
  // Exclude compiled output — tests should run from source only.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
};
