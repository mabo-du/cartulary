/** encoding.ts — Character encoding fallback utilities.
 *
 * exports:
 *   prependBom(text): string
 *   loadCodepage(): Promise<void>
 *
 * used_by: ui/step-upload.ts → encoding fallback for legacy files
 * rules:   Only activate codepage fallback when corruption is detected.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented BOM and codepage helpers
 */

import * as XLSX from 'xlsx';

const UTF8_BOM = '\ufeff';

/**
 * Prepend UTF-8 BOM to CSV text for SheetJS to detect encoding correctly.
 */
export function prependBom(text: string): string {
  return UTF8_BOM + text;
}

/**
 * Load the codepage table for Windows-1252 / ISO-8859 legacy file support.
 * Call once before parseSpreadsheet if corruption is suspected.
 */
export async function loadCodepage(): Promise<void> {
  try {
    const cptable = await import('xlsx/dist/cpexcel.full.mjs');
    XLSX.set_cptable(cptable);
  } catch {
    // Codepage loading failed silently — fall back to default UTF-8
  }
}
