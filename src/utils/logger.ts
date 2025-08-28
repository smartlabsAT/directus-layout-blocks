/**
 * Logger utility for development debugging
 * 
 * Logging is automatically enabled in development mode.
 * In production, you can manually enable it by:
 * - Setting window.LAYOUT_BLOCKS_DEBUG = true in the browser console
 * - Or setting localStorage.setItem('LAYOUT_BLOCKS_DEBUG', 'true')
 */

// Check if we're in development mode
const isDevelopment = import.meta.env?.MODE === 'development' || false;

// Enable debug based on environment or manual override
const DEBUG = isDevelopment || 
             (typeof window !== 'undefined' && (
               (window as any).LAYOUT_BLOCKS_DEBUG === true ||
               localStorage?.getItem('LAYOUT_BLOCKS_DEBUG') === 'true'
             ));

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG) console.log('[LayoutBlocks]', ...args);
  },
  
  warn: (...args: any[]) => {
    if (DEBUG) console.warn('[LayoutBlocks]', ...args);
  },
  
  error: (...args: any[]) => {
    // Always log errors in development, optional in production
    if (DEBUG || isDevelopment) {
      console.error('[LayoutBlocks]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (DEBUG) console.info('[LayoutBlocks]', ...args);
  },
  
  debug: (...args: any[]) => {
    if (DEBUG) console.debug('[LayoutBlocks:Debug]', ...args);
  },
  
  // Helper functions for runtime control
  isEnabled: () => DEBUG,
  
  enable: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('LAYOUT_BLOCKS_DEBUG', 'true');
      (window as any).LAYOUT_BLOCKS_DEBUG = true;
      console.log('[LayoutBlocks] Logging enabled. Refresh the page to see all logs.');
    }
  },
  
  disable: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('LAYOUT_BLOCKS_DEBUG');
      delete (window as any).LAYOUT_BLOCKS_DEBUG;
      console.log('[LayoutBlocks] Logging disabled. Refresh the page to apply.');
    }
  }
};