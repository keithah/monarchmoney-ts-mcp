// Jest setup file for global test configuration

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock Date for consistent testing if needed
// const mockDate = new Date('2024-01-15T12:00:00Z');
// global.Date = jest.fn(() => mockDate) as any;
// Object.assign(global.Date, Date);