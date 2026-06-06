import { describe, it, expect } from 'vitest';
import { sanitize } from '../lib/generator/sanitize';

describe('sanitize', () => {
  it('passes through normal text unchanged', () => {
    expect(sanitize('Hello world')).toBe('Hello world');
  });

  it('adds space after bare ampersand', () => {
    expect(sanitize('A&B')).toBe('A& B');
  });

  it('does not double-escape already-escaped ampersands', () => {
    expect(sanitize('A&amp;B')).toBe('A&amp;B');
  });

  it('handles multiple ampersands', () => {
    expect(sanitize('A&B&C')).toBe('A& B& C');
  });

  it('handles ampersand already followed by space', () => {
    expect(sanitize('A & B')).toBe('A & B');
  });

  it('returns empty string for empty input', () => {
    expect(sanitize('')).toBe('');
  });

  it('returns non-string input unchanged', () => {
    expect(sanitize(null as unknown as string)).toBe(null);
    expect(sanitize(undefined as unknown as string)).toBe(undefined);
  });
});
