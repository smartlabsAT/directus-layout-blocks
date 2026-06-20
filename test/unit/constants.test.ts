import { describe, it, expect } from 'vitest';
import { DEFAULT_OPTIONS, EDIT_MODES } from '../../src/utils/constants';

describe('DEFAULT_OPTIONS', () => {
  it("defaults editMode to 'drawer' (inline must be strictly opt-in)", () => {
    expect(DEFAULT_OPTIONS.editMode).toBe('drawer');
  });

  it('keeps existing defaults intact when editMode is added', () => {
    expect(DEFAULT_OPTIONS.viewMode).toBe('grid');
    expect(DEFAULT_OPTIONS.enableDragDrop).toBe(true);
    expect(DEFAULT_OPTIONS.showEmptyAreas).toBe(true);
    expect(DEFAULT_OPTIONS.enableAreaManagement).toBe(false);
  });
});

describe('EDIT_MODES', () => {
  it('exposes drawer and inline values', () => {
    expect(EDIT_MODES.DRAWER).toBe('drawer');
    expect(EDIT_MODES.INLINE).toBe('inline');
  });
});
