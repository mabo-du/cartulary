/** rules.ts — Rule-based validation layer for EAD3 hierarchy and fields.
 *
 * exports:
 *   validateTree(rows, preset): ValidationError[]
 *     Runs all validation rules against the parsed JSON array (not XML string).
 *     All errors carry the original spreadsheet row index.
 *
 * used_by: ui/step-export.ts → validation before export
 * rules:   Validate against parsed JSON before XML generation.
 *          Every error must carry __rowNum__ for row-referenced display.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented validation rule engine
 */

import type { ParsedRow, ValidationError, PresetConfig, Severity, SeverityOrOff } from '../../types';

const ISO_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?(\/\d{4}(-\d{2}(-\d{2})?)?)?$/;
const EXTENT_RE = /^\d+\s/;

/** Convert SeverityOrOff to Severity, throwing if 'off' (caller must guard). */
function sev(val: SeverityOrOff): Severity {
  if (val === 'off') throw new Error('Unexpected off severity');
  return val;
}

/**
 * Validate a flat array of parsed rows against repository preset rules.
 */
export function validateTree(
  rows: ParsedRow[],
  preset: PresetConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const strict = preset.validationStrictness;

  // Track unit IDs for duplicate detection
  const unitidSet = new Map<string, number[]>();

  for (const row of rows) {
    const ri = (row.__rowNum__ as number) ?? 0;
    const level = String(row.level ?? '').toLowerCase();

    // --- Required fields ---
    // Every node must have unitid or unittitle
    const hasUnitid = hasValue(row.unitid);
    const hasUnittitle = hasValue(row.unittitle);
    if (!hasUnitid && !hasUnittitle) {
      errors.push({
        rowIndex: ri,
        field: 'unitid / unittitle',
        message: 'Row has neither unitid nor unittitle — at least one is required',
        severity: 'error',
      });
    }

    // archdesc @level: root rows must have a valid level
    if (!level || level === '') {
      errors.push({
        rowIndex: ri,
        field: 'level',
        message: 'Level column is empty — valid values: collection, series, file, item, etc.',
        severity: 'error',
      });
    }

    // --- ISO 8601 date validation ---
    if (hasValue(row.unitdate) && strict.isoDate !== 'off') {
      const dateVal = String(row.unitdate);
      if (!ISO_DATE_RE.test(dateVal)) {
        errors.push({
          rowIndex: ri,
          field: 'unitdate',
          message: `Date "${dateVal}" is not ISO 8601 format (expected YYYY or YYYY/YYYY)`,
          severity: sev(strict.isoDate),
        });
      }
    }

    // Check startDate/endDate composite
    if (hasValue(row.startDate) && hasValue(row.endDate)) {
      const startStr = String(row.startDate);
      const endStr = String(row.endDate);
      const startYear = extractYear(startStr);
      const endYear = extractYear(endStr);
      if (startYear !== null && endYear !== null && startYear > endYear) {
        errors.push({
          rowIndex: ri,
          field: 'unitdate',
          message: `Date range reversed: end year (${endYear}) precedes start year (${startYear})`,
          severity: sev(strict.chronologicalOrder),
        });
      }
    }

    // --- Extent format: must start with digit + space ---
    if (hasValue(row.physdesc) && strict.extentFormat !== 'off') {
      const extent = String(row.physdesc);
      if (!EXTENT_RE.test(extent)) {
        errors.push({
          rowIndex: ri,
          field: 'physdesc',
          message: `Extent "${extent}" does not start with a digit followed by a space`,
          severity: sev(strict.extentFormat),
        });
      }
    }

    // --- unitid @audience="internal" blocked (ArchivesSpace) ---
    if (
      strict.unitidAudienceInternal !== 'off' &&
      String(row.unitidAudience ?? '').toLowerCase() === 'internal'
    ) {
      errors.push({
        rowIndex: ri,
        field: 'unitid @audience',
        message: 'unitid @audience="internal" is blocked by this repository preset',
        severity: strict.unitidAudienceInternal as 'error' | 'warning',
      });
    }

    // --- Collect unitid for duplicate check ---
    if (hasValue(row.unitid)) {
      const idStr = String(row.unitid);
      const existing = unitidSet.get(idStr) || [];
      existing.push(ri);
      unitidSet.set(idStr, existing);
    }
  }

  // --- Duplicate unitid check (cross-row) ---
  if (strict.duplicateUnitid !== 'off') {
    for (const [id, rowsWithId] of unitidSet.entries()) {
      if (rowsWithId.length > 1) {
        for (const ri of rowsWithId) {
          errors.push({
            rowIndex: ri,
            field: 'unitid',
            message: `Duplicate unitid "${id}" — also appears at row(s) ${rowsWithId.filter((r) => r !== ri).join(', ')}`,
            severity: sev(strict.duplicateUnitid),
          });
        }
      }
    }
  }

  return errors;
}

function hasValue(val: unknown): boolean {
  return val !== undefined && val !== null && val !== '';
}

function extractYear(iso: string): number | null {
  const m = iso.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}
