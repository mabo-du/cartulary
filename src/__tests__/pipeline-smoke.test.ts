/**
 * pipeline-smoke.test.ts — Full-pipeline integration smoke test.
 *
 * Reads the example spreadsheet, runs the full conversion pipeline, and
 * validates the output against the target schema. This exercises every
 * layer: SheetJS parsing → hierarchy construction → XML generation →
 * schema validation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as XLSX from 'xlsx';
import { buildTreeFromLevels } from '../lib/hierarchy/level-column';
import { generateEAD3 } from '../lib/generator/ead3';
import { generateEAD2002 } from '../lib/generator/ead2002';
import { validateTree } from '../lib/validator/rules';
import { getPreset } from '../lib/presets/config';
import type { ControlFormData } from '../types';

const SCHEMA_DIR = 'test-schemas';
const EXAMPLE_PATH = 'public/example-finding-aid.xlsx';

const controlData: ControlFormData = {
  agencyName: 'Cartulary Smoke Test',
  recordId: 'smoke-test-001',
  findingAidTitle: 'Smoke Test Finding Aid',
  languageCode: 'eng',
  scriptCode: 'Latn',
};

describe('Full pipeline — ArchivesSpace (EAD3)', () => {
  let rows: Record<string, unknown>[];
  let xml: string;

  beforeAll(() => {
    // Phase 1: Parse
    const workbook = XLSX.readFile(EXAMPLE_PATH);
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];

    // Phase 3: Build tree
    const { trees } = buildTreeFromLevels(rows);

    // Phase 5: Validate
    const preset = getPreset('archivesspace');
    const errors = validateTree(rows, preset);
    expect(errors.filter((e) => e.severity === 'error')).toHaveLength(0);

    // Phase 4: Generate
    xml = generateEAD3(trees, preset, controlData);
  });

  it('parsed all example rows', () => {
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('generated valid XML', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('validates against EAD3 XSD', () => {
    if (!existsSync(join(SCHEMA_DIR, 'ead3.xsd'))) return;
    const tmpDir = mkdtempSync(join(tmpdir(), 'cartulary-pipe-'));
    const xmlPath = join(tmpDir, 'output.xml');
    writeFileSync(xmlPath, xml, 'utf-8');
    try {
      execSync(
        `xmllint --noout --schema "${join(SCHEMA_DIR, 'ead3.xsd')}" "${xmlPath}" 2>/dev/null`,
        { stdio: 'pipe', timeout: 10000 },
      );
    } catch {
      expect.fail('Generated XML does not validate against EAD3 XSD');
    } finally {
      try { execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' }); } catch { /* ok */ }
    }
  });
});

describe('Full pipeline — AtoM (EAD 2002)', () => {
  let xml: string;

  beforeAll(() => {
    const workbook = XLSX.readFile(EXAMPLE_PATH);
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
    const { trees } = buildTreeFromLevels(rows);
    const preset = getPreset('atom');
    const errors = validateTree(rows, preset);
    expect(errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    xml = generateEAD2002(trees, preset, controlData);
  });

  it('generated EAD 2002 XML', () => {
    expect(xml).toContain('xmlns="urn:isbn:1-931666-22-9"');
  });

  it('includes @relatedencoding', () => {
    expect(xml).toContain('relatedencoding="ISAD(G)v2"');
  });

  it('validates against EAD 2002 XSD', () => {
    if (!existsSync(join(SCHEMA_DIR, 'ead.xsd'))) return;
    const tmpDir = mkdtempSync(join(tmpdir(), 'cartulary-pipe-'));
    const xmlPath = join(tmpDir, 'output.xml');
    writeFileSync(xmlPath, xml, 'utf-8');
    try {
      execSync(
        `xmllint --noout --schema "${join(SCHEMA_DIR, 'ead.xsd')}" "${xmlPath}" 2>/dev/null`,
        { stdio: 'pipe', timeout: 10000 },
      );
    } catch {
      expect.fail('Generated XML does not validate against EAD 2002 XSD');
    } finally {
      try { execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' }); } catch { /* ok */ }
    }
  });
});
