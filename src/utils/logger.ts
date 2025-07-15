/**
 * Simple logger utility that can be enabled/disabled
 * In production, all logging should be disabled
 */

const DEBUG = false; // Set to true during development

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log('[Layout Blocks]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    if (DEBUG) {
      console.error('[Layout Blocks]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (DEBUG) {
      console.warn('[Layout Blocks]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (DEBUG) {
      console.info('[Layout Blocks]', ...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (DEBUG) {
      console.debug('[Layout Blocks]', ...args);
    }
  }
};