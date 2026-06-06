/** config.ts — Repository preset configuration objects.
 *
 * Research-backed values from four deep-research papers on AtoM and
 * CONTENTdm import profiles. Each value cross-references its source.
 *
 * exports:
 *   PRESETS: Record<string, PresetConfig>
 *   getPreset(name): PresetConfig
 *
 * used_by: generator/ead3.ts, generator/ead2002.ts, validator/rules.ts, ui/wizard.ts
 * rules:   Each preset defines validation strictness, format, and component convention.
 *          CONTENTdm preset now fully specified from reverse-engineering research.
 * agent:   deepseek-v4-flash | 2026-06-07 | Research-backed preset configurations
 */

import type { PresetConfig } from '../../types';

export const PRESETS: Record<string, PresetConfig> = {
  archivesspace: {
    name: 'archivesspace',
    label: 'ArchivesSpace',
    targetFormat: 'ead3',
    componentConvention: 'generic-c',
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
    // AtoM accepts both generic <c> and numbered <c01> with @level.
    // Research source: QubitXmlImport.class.php processes both identically.
    strictComponentConvention: false,
    validationStrictness: {
      // AtoM requires @normal with ISO 8601 for search indexes
      // Source: AtoM EAD 2002 Import Validation paper, dates section
      isoDate: 'error',
      // AtoM is more permissive with extent format
      extentFormat: 'warning',
      // Chronological order enforced for search accuracy
      chronologicalOrder: 'error',
      // Not applicable to AtoM
      unitidAudienceInternal: 'off',
      // unitid is mandatory for slug generation and update matching
      // Source: AtoM documentation, delete-and-replace update mode
      duplicateUnitid: 'error',
    },
    // AtoM's libxml2 parser also chokes on bare ampersands and control chars
    // Source: GitHub issue #2322, #2135, #1839
    nokogiriSanitize: true,
    requiresTitleOnDao: false,
    // AtoM's PHP DOMDocument fetches remote schema, which can fail
    // Source: atom-users group: "Steady EAD import error: no DTD found!"
    suppressSchemaLocation: true,
    // Triggers ISAD(G)v2 crosswalk in AtoM's QubitXmlImport.class.php
    relatedEncoding: 'ISAD(G)v2',
  },

  contentdm: {
    name: 'contentdm',
    label: 'CONTENTdm',
    targetFormat: 'ead2002',
    // CONTENTdm REQUIRES numbered components for compound object pagination.
    // OAC and Archives West consortial guidelines explicitly forbid generic <c>.
    // Source: Reverse-Engineering the CONTENTdm EAD Import Profile, section 4;
    //         OAC Best Practice Guidelines for EAD; Archives West BPG
    componentConvention: 'numbered-c',
    strictComponentConvention: true,
    validationStrictness: {
      // Project Client has a date mangling bug — strict ISO prevents corruption.
      // Source: BYU training docs, "Using CONTENTdm's Multiple File Import"
      isoDate: 'error',
      extentFormat: 'warning',
      chronologicalOrder: 'warning',
      unitidAudienceInternal: 'warning',
      // Duplicate unitids break Dublin Core mapping during extraction.
      duplicateUnitid: 'error',
    },
    // Not needed for CONTENTdm's VBScript-based extraction pipeline
    nokogiriSanitize: false,
    // @title is required on <dao> for proper rendering
    // Source: Columbia University EAD example in CONTENTdm repository
    requiresTitleOnDao: true,
    // CRITICAL: CONTENTdm Project Client crashes on inline namespace declarations
    // Source: OCLC docs — "If namespace information is encoded within the tags,
    // the EAD processing will fail"
    removeNamespaceDeclarations: true,
  },
};

export function getPreset(name: string): PresetConfig {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset: "${name}"`);
  }
  return preset;
}
