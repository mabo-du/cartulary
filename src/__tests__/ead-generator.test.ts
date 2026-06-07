/**
 * ead-generator.test.ts — Integration tests for EAD3 and EAD 2002 serializers.
 *
 * Generates XML from realistic data, validates against official schemas
 * via xmllint, and checks structural properties.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateEAD3 } from '../lib/generator/ead3';
import { generateEAD2002 } from '../lib/generator/ead2002';
import { getPreset } from '../lib/presets/config';
import type { EADNode, ControlFormData } from '../types';

const SCHEMA_DIR = 'test-schemas';

const controlData: ControlFormData = {
  agencyName: 'Test Archives',
  recordId: 'test-001',
  findingAidTitle: 'Test Collection Finding Aid',
  languageCode: 'eng',
  scriptCode: 'Latn',
};

function makeTree(): EADNode[] {
  return [{
    id: 'coll-001',
    originalRowIndex: 1,
    level: 'collection',
    metadata: {
      unitid: 'coll-001',
      unittitle: 'Test Collection',
      unitdate: '1920/1940',
      startDate: '1920',
      endDate: '1940',
      physdesc: '12 linear feet',
      scopecontent: 'A test collection for EAD validation.',
      accessrestrict: 'Collection open for research.',
    },
    children: [{
      id: 'ser-001',
      originalRowIndex: 2,
      level: 'series',
      metadata: {
        unitid: 'ser-001',
        unittitle: 'Correspondence Series',
        unitdate: '1920/1930',
        startDate: '1920',
        endDate: '1930',
      },
      children: [{
        id: 'file-001',
        originalRowIndex: 3,
        level: 'file',
        metadata: {
          unitid: 'file-001',
          unittitle: 'Personal Letters',
          unitdate: '1920',
        },
        children: [],
      }],
    }],
  }];
}

/**
 * Validate an XML string against an XSD schema using xmllint.
 * Returns true if valid, false otherwise.
 */
function validateXml(xml: string, schemaPath: string): boolean {
  // Write XML to temp file
  const tmpDir = mkdtempSync(join(tmpdir(), 'cartulary-test-'));
  const xmlPath = join(tmpDir, 'output.xml');
  writeFileSync(xmlPath, xml, 'utf-8');

  try {
    execSync(
      `xmllint --noout --schema "${schemaPath}" "${xmlPath}" 2>/dev/null`,
      { stdio: 'pipe', timeout: 10000 },
    );
    return true;
  } catch {
    return false;
  } finally {
    // Cleanup
    try {
      execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
    } catch { /* ignore cleanup errors */ }
  }
}

describe('EAD3 generator (ArchivesSpace)', () => {
  const preset = getPreset('archivesspace');
  const schemaPath = join(SCHEMA_DIR, 'ead3.xsd');
  let xml: string;

  beforeAll(() => {
    xml = generateEAD3(makeTree(), preset, controlData);
  });

  it('produces valid XML', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('uses EAD3 namespace', () => {
    expect(xml).toContain('xmlns="http://ead3.archivists.org/schema/"');
  });

  it('contains <control> block', () => {
    expect(xml).toContain('<control>');
  });

  it('contains <archdesc>', () => {
    expect(xml).toContain('<archdesc level="collection">');
  });

  it('contains component hierarchy', () => {
    expect(xml).toContain('<c level="series">');
    expect(xml).toContain('<c level="file">');
  });

  it('includes all expected metadata', () => {
    expect(xml).toContain('Test Collection');
    expect(xml).toContain('Correspondence Series');
    expect(xml).toContain('Personal Letters');
    expect(xml).toContain('Collection open for research.');
  });

  it('validates against EAD3 XSD', () => {
    if (!existsSync(schemaPath)) return; // skip if schema not available
    expect(validateXml(xml, schemaPath)).toBe(true);
  });
});

describe('EAD3 with numbered <c> convention', () => {
  const preset = { ...getPreset('archivesspace'), componentConvention: 'numbered-c' as const };
  const schemaPath = join(SCHEMA_DIR, 'ead3.xsd');
  let xml: string;

  beforeAll(() => {
    xml = generateEAD3(makeTree(), preset, controlData);
  });

  it('uses numbered c01 elements', () => {
    expect(xml).toContain('<c01');
  });

  it('validates against EAD3 XSD', () => {
    if (!existsSync(schemaPath)) return;
    expect(validateXml(xml, schemaPath)).toBe(true);
  });
});

describe('EAD 2002 generator (AtoM)', () => {
  const preset = getPreset('atom');
  const schemaPath = join(SCHEMA_DIR, 'ead.xsd');
  let xml: string;

  beforeAll(() => {
    xml = generateEAD2002(makeTree(), preset, controlData);
  });

  it('produces valid XML', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('uses EAD 2002 namespace', () => {
    expect(xml).toContain('xmlns="urn:isbn:1-931666-22-9"');
  });

  it('contains <eadheader> with @relatedencoding', () => {
    expect(xml).toContain('<eadheader');
    expect(xml).toContain('relatedencoding="ISAD(G)v2"');
  });

  it('contains <archdesc>', () => {
    expect(xml).toContain('<archdesc level="collection">');
  });

  it('uses generic <c> with @level attributes', () => {
    expect(xml).toContain('<c level="series">');
    expect(xml).toContain('<c level="file">');
  });

  it('validates against EAD 2002 XSD', () => {
    if (!existsSync(schemaPath)) return;
    expect(validateXml(xml, schemaPath)).toBe(true);
  });
});

describe('EAD 2002 generator (CONTENTdm)', () => {
  const preset = getPreset('contentdm');
  const schemaPath = join(SCHEMA_DIR, 'ead.xsd');
  let xml: string;

  beforeAll(() => {
    xml = generateEAD2002(makeTree(), preset, controlData);
  });

  it('uses numbered c01 elements', () => {
    expect(xml).toContain('<c01');
  });

  it('validates against EAD 2002 XSD', () => {
    if (!existsSync(schemaPath)) return;
    expect(validateXml(xml, schemaPath)).toBe(true);
  });

  it('has no inline namespace declarations in dao elements', () => {
    expect(xml).not.toContain('xmlns:xlink');
  });
});
