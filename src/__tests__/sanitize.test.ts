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

  it('strips XML 1.0 illegal control characters', () => {
    // 0x01 (SOH), 0x02 (STX), 0x1F (US) — all illegal in XML 1.0
    const input = '\x01Hello\x02World\x1F';
    expect(sanitize(input)).toBe('HelloWorld');
  });

  it('preserves XML 1.0 permitted control characters', () => {
    // Tab (0x09), LF (0x0A), CR (0x0D) are permitted
    const input = 'Line1\nLine2\rLine3\tIndented';
    expect(sanitize(input)).toBe('Line1\nLine2\rLine3\tIndented');
  });

  it('combines ampersand fix with control char stripping', () => {
    const input = '\x00A&B\x01';
    expect(sanitize(input)).toBe('A& B');
  });
});
