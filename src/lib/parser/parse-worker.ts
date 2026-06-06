/**
 * parse-worker.ts — Web Worker for offloaded spreadsheet parsing.
 *
 * Receives an ArrayBuffer via postMessage, parses it with SheetJS,
 * and posts the parsed rows back. Keeps the main thread responsive
 * for large files (>10,000 rows).
 *
 * Used by: ui/wizard.ts → handleFileUpload (optional, feature-detected)
 *
 * Messages:
 *   In:  { file: ArrayBuffer, fileName: string }
 *   Out: { rows: ParsedRow[], fileName: string, columns: string[] }
 *        | { error: string }
 */

import * as XLSX from 'xlsx';

self.onmessage = (e: MessageEvent<{ file: ArrayBuffer; fileName: string }>) => {
  const { file, fileName } = e.data;

  try {
    const data = new Uint8Array(file);
    const workbook = XLSX.read(data, {
      type: 'array',
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellNF: false,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Normalize merged cells
    if (worksheet['!merges']) {
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

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];
    const columns = rows.length > 0
      ? Object.keys(rows[0]).filter((k) => k !== '__rowNum__')
      : [];

    self.postMessage({ rows, fileName, columns });
  } catch (err) {
    self.postMessage({ error: (err as Error).message });
  }
};
