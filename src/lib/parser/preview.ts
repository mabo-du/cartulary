/** preview.ts — Preview slice for the column-mapper table.
 *
 * exports:
 *   getPreviewSlice(worksheet, rowLimit): ParsedRow[]
 *
 * used_by: ui/step-upload.ts → display first N rows
 * rules:   Default rowLimit is 25.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented preview slice
 */

import * as XLSX from 'xlsx';
import type { ParsedRow } from '../../types';

/**
 * Return up to rowLimit rows from the worksheet for preview display.
 */
export function getPreviewSlice(
  worksheet: XLSX.WorkSheet,
  rowLimit = 25,
): ParsedRow[] {
  if (!worksheet['!ref']) return [];

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  range.e.r = Math.min(range.e.r, range.s.r + rowLimit - 1);

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    range: XLSX.utils.encode_range(range),
  });
}
