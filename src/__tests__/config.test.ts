import { describe, it, expect } from 'vitest';
import { getPreset, PRESETS } from '../lib/presets/config';

describe('getPreset', () => {
  it('returns archivesspace preset', () => {
    const preset = getPreset('archivesspace');
    expect(preset.name).toBe('archivesspace');
    expect(preset.targetFormat).toBe('ead3');
  });

  it('returns atom preset', () => {
    const preset = getPreset('atom');
    expect(preset.name).toBe('atom');
    expect(preset.targetFormat).toBe('ead2002');
  });

  it('returns contentdm preset', () => {
    const preset = getPreset('contentdm');
    expect(preset.name).toBe('contentdm');
  });

  it('throws for unknown preset', () => {
    expect(() => getPreset('nonexistent')).toThrow();
  });

  it('ArchivesSpace has stricter validation than AtoM', () => {
    const as = PRESETS.archivesspace;
    const atom = PRESETS.atom;
    // ArchivesSpace has stricter extent validation
    expect(as.validationStrictness.extentFormat).toBe('error');
    expect(atom.validationStrictness.extentFormat).toBe('warning');
  });
});
