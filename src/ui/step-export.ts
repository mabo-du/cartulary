/** step-export.ts — Step 3: Validate & Export.
 *
 * exports:
 *   renderStep3(state): string — HTML for the validation/export step
 *
 * used_by: wizard.ts → step rendering dispatch
 * rules:   Show validation errors with row references.
 *          Export button disabled when fatal errors present.
 *          Warn & Export when only warnings.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created export step renderer
 */

import type { AppState } from './state';

export function renderStep3(state: AppState): string {
  const fatalErrors = state.validationErrors.filter((e) => e.severity === 'error');
  const warnings = state.validationErrors.filter((e) => e.severity === 'warning');
  const hasFatal = fatalErrors.length > 0;
  const hasWarningsOnly = !hasFatal && warnings.length > 0;

  return `
    <div class="export-layout">
      <div class="export-summary">
        <h3>Validation Results</h3>
        ${renderSummary(hasFatal, fatalErrors.length, warnings.length)}
      </div>
      ${renderErrorList(state.validationErrors)}
      ${renderTreeWarnings(state)}
      <div class="export-actions">
        <button type="button" class="btn btn-secondary" id="step3-back">
          ← Back to Mapping
        </button>
        <button type="button" class="btn btn-primary" id="export-btn" ${hasFatal ? 'disabled' : ''}>
          ${hasFatal ? 'Fix Errors to Export' : hasWarningsOnly ? 'Warn &amp; Export' : 'Export XML'}
        </button>
      </div>
    </div>
  `;
}

function renderSummary(hasFatal: boolean, errorCount: number, warningCount: number): string {
  if (!hasFatal && warningCount === 0) {
    return `<p class="success">✓ No validation issues found. Ready to export.</p>`;
  }

  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} error(s)`);
  if (warningCount > 0) parts.push(`${warningCount} warning(s)`);

  return `<p class="${hasFatal ? 'error' : 'warning'}">Found ${parts.join(', ')}.</p>`;
}

function renderErrorList(
  errors: AppState['validationErrors'],
): string {
  if (errors.length === 0) {
    return '';
  }

  return `
    <div class="error-list" role="alert">
      ${errors
        .map(
          (e) => `
        <div class="error-card error-card--${e.severity}" data-row="${e.rowIndex}">
          <span class="error-severity error-severity--${e.severity}">
            ${e.severity === 'error' ? '✗ Error' : '⚠ Warning'}
          </span>
          <span class="error-row">Row ${e.rowIndex}</span>
          <span class="error-field"><code>${escHtml(e.field)}</code></span>
          <span class="error-message">${escHtml(e.message)}</span>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderTreeWarnings(state: AppState): string {
  const warnings = state.treeWarnings || [];
  if (warnings.length === 0) return '';

  return `
    <details class="tree-warnings">
      <summary>Tree Construction Warnings (${warnings.length})</summary>
      <div class="error-list">
        ${warnings
          .map(
            (w) => `
          <div class="error-card error-card--warning">
            <span class="error-severity error-severity--warning">⚠ Warning</span>
            <span class="error-row">Row ${w.rowIndex}</span>
            <span class="error-message">${escHtml(w.message)}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    </details>
  `;
}

function escHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}
