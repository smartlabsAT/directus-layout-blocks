import { describe, it, expect } from 'vitest';
import { isNewItemPk } from '../../src/utils/helpers';
import { nextInlineEditTarget } from '../../src/utils/inline-edit';

describe('isNewItemPk', () => {
  it("treats '+' and 'new' and nullish as a new (unsaved) item", () => {
    expect(isNewItemPk('+')).toBe(true);
    expect(isNewItemPk('new')).toBe(true);
    expect(isNewItemPk(null)).toBe(true);
    expect(isNewItemPk(undefined)).toBe(true);
  });

  it('treats a real primary key as an existing item', () => {
    expect(isNewItemPk(1)).toBe(false);
    expect(isNewItemPk('42')).toBe(false);
  });
});

describe('nextInlineEditTarget (single-open accordion)', () => {
  it('opens a block when nothing is open', () => {
    expect(nextInlineEditTarget(null, 10)).toBe(10);
  });
  it('closes when the open block is clicked again (toggle)', () => {
    expect(nextInlineEditTarget(10, 10)).toBeNull();
  });
  it('switches to another block (single-open)', () => {
    expect(nextInlineEditTarget(10, 11)).toBe(11);
  });
  it('handles temporary string ids by value', () => {
    expect(nextInlineEditTarget('new_1_a', 'new_1_a')).toBeNull();
    expect(nextInlineEditTarget('new_1_a', 12)).toBe(12);
  });
});
