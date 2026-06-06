/** config.ts — Repository preset configuration objects.
 *
 * exports:
 *   PRESETS: Record<PresetName, PresetConfig>
 *   getPreset(name): PresetConfig
 *
 * used_by: generator/ead3.ts, validator/rules.ts, ui/step-map.ts
 * rules:   Each preset defines validation strictness, format, and component convention.
 *          contentdm preset is a "Coming soon" placeholder until Phase 6 research.
 * agent:   deepseek-v4-flash | 2026-06-07 | Defined three repository presets
 */

import type { PresetConfig } from '../../types';

export const PRESETS: Record<string, PresetConfig> = {
  archivesspace: {
    name: 'archivesspace',
    label: 'ArchivesSpace',
    targetFormat: 'ead3',
    componentConvention: 'generic-c', // confirmed: AS accepts both, generic-c is native default
    strictComponentConvention: false,
    validationStrictness: {
      isoDate: 'error',
      extentFormat: 'error',
      chronologicalOrder: 'error',
      unitidAudienceInternal: 'error',
      duplicateUnitid: 'error',
    },
    nokogiriSanitize: true,
    requiresTitleOnDao: true,
  },
  atom: {
    name: 'atom',
    label: 'AtoM (Access to Memory)',
    targetFormat: 'ead2002',
    componentConvention: 'generic-c',
    strictComponentConvention: false,
    validationStrictness: {
      isoDate: 'error',
      extentFormat: 'warning',
      chronologicalOrder: 'error',
      unitidAudienceInternal: 'off',
      duplicateUnitid: 'error',
    },
    nokogiriSanitize: false,
    requiresTitleOnDao: false,
  },
  contentdm: {
    name: 'contentdm',
    label: 'CONTENTdm (Coming soon)',
    targetFormat: 'ead3',
    componentConvention: 'generic-c',
    strictComponentConvention: false,
    validationStrictness: {
      isoDate: 'warning',
      extentFormat: 'warning',
      chronologicalOrder: 'warning',
      unitidAudienceInternal: 'warning',
      duplicateUnitid: 'error',
    },
    nokogiriSanitize: false,
    requiresTitleOnDao: false,
  },
};

export function getPreset(name: string): PresetConfig {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset: "${name}"`);
  }
  return preset;
}
