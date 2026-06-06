/** types.ts — Shared interfaces for the Cartulary EAD XML generator.
 *
 * exports:
 *   EADNode             — Intermediate tree node shared across all hierarchy parsers
 *   ParsedRow           — Row shape after SheetJS parsing (preserves __rowNum__)
 *   ValidationError     — Single validation result with row reference
 *   PresetName          — Union of supported repository targets
 *   ComponentConvention — <c @level> vs <c01>–<c12>
 *   Severity            — 'error' | 'warning'
 *   PresetConfig        — Per-repository configuration object
 *   HierarchyMode       — 'level-column' | 'dotted-ids' | 'parent-id'
 *   ControlFormData     — User-provided <control> block metadata
 *   ColumnMapping       — Spreadsheet column → EAD field mapping
 *
 * used_by: all lib/ and ui/ modules
 * rules:   __rowNum__ must propagate through every transformation without loss
 * agent:   deepseek-v4-flash | 2026-06-07 | Created shared type definitions for entire project
 */

export interface EADNode {
  id: string;
  /** Original spreadsheet row number (1-based, from SheetJS __rowNum__) */
  originalRowIndex: number;
  level: string;
  metadata: Record<string, unknown>;
  children: EADNode[];
}

export interface ParsedRow {
  __rowNum__?: number;
  [key: string]: unknown;
}

export type Severity = 'error' | 'warning';
export type SeverityOrOff = Severity | 'off';

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  severity: Severity;
}

export type PresetName = 'archivesspace' | 'atom' | 'contentdm';

export type ComponentConvention = 'generic-c' | 'numbered-c';

export type HierarchyMode = 'level-column' | 'dotted-ids' | 'parent-id';

export interface PresetConfig {
  name: PresetName;
  label: string;
  targetFormat: 'ead3' | 'ead2002';
  componentConvention: ComponentConvention;
  strictComponentConvention: boolean; // if true, user cannot override
  validationStrictness: {
    isoDate: SeverityOrOff;
    extentFormat: SeverityOrOff;
    chronologicalOrder: SeverityOrOff;
    unitidAudienceInternal: SeverityOrOff;
    duplicateUnitid: SeverityOrOff;
  };
  nokogiriSanitize: boolean;
  requiresTitleOnDao: boolean;
  /** CONTENTdm: strip xmlns:xlink and other inline namespace declarations
   * from <dao> and other elements before export. Without this, the
   * Project Client parser throws a fatal error on import.
   * Source: OCLC docs: "If namespace information is encoded within the
   * tags, the EAD processing will fail." */
  removeNamespaceDeclarations?: boolean;
  /** AtoM: suppress xsi:schemaLocation from root <ead> element.
   * AtoM's PHP DOMDocument attempts to fetch the remote schema, which
   * can timeout or be blocked by network restrictions.
   * Source: AtoM community: "Steady EAD import error: no DTD found!" */
  suppressSchemaLocation?: boolean;
  /** AtoM: the @relatedencoding attribute value for <eadheader>.
   * Defaults to "ISAD(G)v2" which triggers the correct crosswalk.
   * Source: AtoM QubitXmlImport.class.php source code. */
  relatedEncoding?: string;
}

export interface ControlFormData {
  agencyName: string;
  recordId: string;
  findingAidTitle: string;
  languageCode: string;
  scriptCode: string;
}

export interface ColumnMapping {
  eadField: string;
  spreadsheetColumn: string | null;
}
