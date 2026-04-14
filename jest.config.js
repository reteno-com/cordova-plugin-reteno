module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^cordova/exec$': '<rootDir>/tests/__mocks__/cordova-exec.js',
  },
};
