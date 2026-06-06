/** spreadsheet.ts — SheetJS spreadsheet parsing engine.
 *
 * exports:
 *   parseSpreadsheet(file: File): Promise<ParsedRow[]>
 *
 * used_by: ui/step-upload.ts → on file drop
 * rules:   Always use arrayBuffer() not readAsText(). Preserve __rowNum__.
 *          Disable cellFormula/cellHTML/cellStyles for memory.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented SheetJS parsing with merged-cell normalization
 */

import * as XLSX from 'xlsx';
import type { ParsedRow } from '../../types';

/**
 * Parse a dropped File object into a JSON array of rows.
 * Uses arrayBuffer() to avoid premature UTF-8 interpretation.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, {
    type: 'array',
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    cellNF: false,
  });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  normalizeMergedCells(worksheet);
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Fill merged cells with the top-left value so sheet_to_json captures all rows.
 * Traverses backwards so origin-cell lookup is safe.
 */
export function normalizeMergedCells(worksheet: XLSX.WorkSheet): void {
  if (!worksheet['!merges']) return;

  for (let i = worksheet['!merges'].length - 1; i >= 0; i--) {
    const range = worksheet['!merges'][i];
    const originAddr = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
    const originCell = worksheet[originAddr];
    if (!originCell) continue;

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        if (R === range.s.r && C === range.s.c) continue;
        worksheet[XLSX.utils.encode_cell({ r: R, c: C })] = { ...originCell };
      }
    }
  }

  delete worksheet['!merges'];
}
