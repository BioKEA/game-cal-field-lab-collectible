// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CROSS_GAME_HANDLE_KEY,
  sanitizeHandle,
  readCrossGameHandle,
  getPlayerHandle,
  ensureCrossGameHandle,
} from '@/lib/handle';

beforeEach(() => localStorage.clear());

describe('sanitizeHandle', () => {
  it('keeps letters, digits, underscore, dash; strips the rest; caps at 32', () => {
    expect(sanitizeHandle('Dr. Maren Vos!')).toBe('DrMarenVos');
    expect(sanitizeHandle('a_b-c')).toBe('a_b-c');
    expect(sanitizeHandle('x'.repeat(40))).toHaveLength(32);
    expect(sanitizeHandle('   ')).toBe('');
  });
});

describe('getPlayerHandle', () => {
  it('prefers the cross-game handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, 'ArcadeName');
    expect(getPlayerHandle('Maren')).toBe('ArcadeName');
  });
  it('falls back to the sanitized save name', () => {
    expect(getPlayerHandle('Dr. Maren')).toBe('DrMaren');
  });
  it('ignores an invalid stored handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, '!!!');
    expect(getPlayerHandle('Maren')).toBe('Maren');
  });
  it('returns null when nothing usable exists', () => {
    expect(getPlayerHandle('   ')).toBeNull();
  });
});

describe('ensureCrossGameHandle', () => {
  it('writes the sanitized name when the key is empty', () => {
    ensureCrossGameHandle('Dr. Maren');
    expect(readCrossGameHandle()).toBe('DrMaren');
  });
  it('never overwrites an existing handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, 'ArcadeName');
    ensureCrossGameHandle('Maren');
    expect(readCrossGameHandle()).toBe('ArcadeName');
  });
  it('does not store the default researcher name', () => {
    ensureCrossGameHandle('Researcher');
    expect(readCrossGameHandle()).toBeNull();
  });
});
