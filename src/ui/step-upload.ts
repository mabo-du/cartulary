/** step-upload.ts — Step 1: File upload and preview.
 *
 * exports:
 *   renderStep1(state): string — HTML for the upload step
 *
 * used_by: wizard.ts → step rendering dispatch
 * rules:   Display first 25 rows as preview after parse.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created upload step renderer
 */

import type { AppState } from './state';

export function renderStep1(state: AppState): string {
  if (state.parsedRows && state.fileName) {
    return renderPostUpload(state);
  }
  return renderUploadZone();
}

function renderUploadZone(): string {
  return `
    <div class="upload-zone" id="upload-zone" role="button" tabindex="0" aria-label="Upload a spreadsheet file">
      <p class="upload-prompt">Drop your spreadsheet here</p>
      <p class="upload-hint">or click to browse</p>
      <p class="upload-formats">Supports .xlsx, .xls, .csv</p>
      <input type="file" id="file-input" accept=".xlsx,.xls,.csv" hidden />
    </div>
    <p class="example-download">
      No spreadsheet yet?
      <a href="example-finding-aid.xlsx" download class="example-link">
        Download an example template (.xlsx)
      </a>
      with sample data to get started.
    </p>
  `;
}

function renderPostUpload(state: AppState): string {
  const rows = state.parsedRows!;
  const cols = state.columns;
  const previewRows = rows.slice(0, 25);

  return `
    <div class="upload-complete">
      <p class="success">Parsed <strong>${rows.length}</strong> rows from <strong>${state.fileName}</strong>.</p>
      <div class="preview-table-wrapper">
        <table class="preview-table" aria-label="Spreadsheet preview (first 25 rows)">
          <thead>
            <tr>
              ${cols.map((c) => `<th>${escHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${previewRows
              .map(
                (row) => `
              <tr>
                ${cols.map((c) => `<td>${escHtml(String(row[c] ?? ''))}</td>`).join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="preview-note">
        Showing first ${Math.min(rows.length, 25)} of ${rows.length} rows.
      </p>
      <p class="upload-actions">
        <button type="button" class="btn btn-primary" id="step1-next">Map Columns →</button>
        <button type="button" class="btn btn-secondary" id="step1-reset">Choose different file</button>
      </p>
    </div>
  `;
}

function escHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}
