import { vi } from 'vitest';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

// Setup global test environment
beforeEach(() => {
  vi.clearAllMocks();
});