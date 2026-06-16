/**
 * contentdm-namespace-strip.test.ts — Stress tests for CONTENTdm namespace
 * stripping, DTD/XSD validation, and date mangling workarounds.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateEAD2002 } from '../lib/generator/ead2002';
import { getPreset } from '../lib/presets/config';
import { generateEAD3 } from '../lib/generator/ead3';
import { validateTree } from '../lib/validator/rules';
import type { EADNode, ControlFormData } from '../types';

const control: ControlFormData = {
  agencyName: 'Namespace Test', recordId: 'ns-test',
  findingAidTitle: 'Namespace Stress Test', languageCode: 'eng', scriptCode: 'Latn',
};

function makeTreeWithDao(): EADNode[] {
  return [{
    id: 'coll-001', originalRowIndex: 1, level: 'collection',
    metadata: { unitid: 'coll-001', unittitle: 'Collection with DAO',
      unitdate: '1920/1940', dao_href: 'https://example.com/object/001',
      dao_title: 'View digital object', dao_role: 'use original' },
    children: [],
  }];
}

describe('CONTENTdm — namespace stripping', () => {
  const cdmPreset = { ...getPreset('contentdm'), removeNamespaceDeclarations: true };

  it('strips xmlns:xlink from dao elements', () => {
    const xml = generateEAD2002(makeTreeWithDao(), cdmPreset, control);
    expect(xml).not.toContain('xmlns:xlink');
    expect(xml).not.toContain('xlink:href');
    expect(xml).toContain('href="https://example.com/object/001"');
  });

  it('produces valid XML with bare dao attributes', () => {
    const xml = generateEAD2002(makeTreeWithDao(), cdmPreset, control);
    expect(xml).toMatch(/<dao\s+href="[^"]+"\s+title="[^"]+"\s+role="[^"]+"\s*\/?>/);
  });

  it('handles multiple dao elements', () => {
    const tree2 = [{
      id: 'c1', originalRowIndex: 1, level: 'collection',
      metadata: { unitid: 'c1', unittitle: 'Collection' },
      children: [
        { id: 'c2', originalRowIndex: 2, level: 'file',
          metadata: { unitid: 'f1', unittitle: 'File 1',
            dao_href: 'https://example.com/1.jpg', dao_title: 'Image 1', dao_role: 'use original' },
          children: [] as EADNode[] },
        { id: 'c3', originalRowIndex: 3, level: 'file',
          metadata: { unitid: 'f2', unittitle: 'File 2',
            dao_href: 'https://example.com/2.pdf', dao_title: 'Doc 2', dao_role: 'use original' },
          children: [] as EADNode[] },
      ],
    }];
    const xml = generateEAD2002(tree2, cdmPreset, control);
    expect(xml).not.toContain('xmlns:xlink');
    expect((xml.match(/<dao\s/g) || []).length).toBe(2);
  });

  it('does not strip namespaces when removeNamespaceDeclarations is false', () => {
    const xml = generateEAD2002(makeTreeWithDao(), getPreset('atom'), control);
    expect(xml).toContain('xmlns:xlink');
    expect(xml).toContain('xlink:href');
  });

  it('EAD3 serializer is unaffected by namespace stripping flag', () => {
    const xml = generateEAD3(makeTreeWithDao(), getPreset('archivesspace'), control);
    expect(xml).toContain('xmlns:xsi');
    expect(xml).toContain('xsi:schemaLocation');
  });
});

describe('CONTENTdm — DTD and XSD validation', () => {
  const schemaPath = join('test-schemas', 'ead.xsd');
  const cdmPreset = { ...getPreset('contentdm'), removeNamespaceDeclarations: true };

  it('generated XML is well-formed', () => {
    const xml = generateEAD2002(makeTreeWithDao(), cdmPreset, control);
    const tmpDir = mkdtempSync(join(tmpdir(), 'cdm-wf-'));
    const xmlPath = join(tmpDir, 'test.xml');
    writeFileSync(xmlPath, xml, 'utf-8');
    try { execSync(`xmllint --noout "${xmlPath}" 2>/dev/null`, { stdio: 'pipe', timeout: 10000 }); }
    catch { expect.fail('XML is not well-formed'); }
    finally { try { execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' }); } catch {} }
  });

  it('validates against EAD 2002 XSD (AtoM output)', () => {
    if (!existsSync(schemaPath)) return;
    const tree = [{ id: 'c1', originalRowIndex: 1, level: 'collection',
      metadata: { unitid: 'c1', unittitle: 'Test', unitdate: '1920/1940' }, children: [] }];
    const xml = generateEAD2002(tree, cdmPreset, control);
    const tmpDir = mkdtempSync(join(tmpdir(), 'cdm-xsd-'));
    const xmlPath = join(tmpDir, 'test.xml');
    writeFileSync(xmlPath, xml, 'utf-8');
    try { execSync(`xmllint --noout --schema "${schemaPath}" "${xmlPath}" 2>/dev/null`, { stdio: 'pipe', timeout: 10000 }); }
    catch { expect.fail('XML does not validate against EAD 2002 XSD'); }
    finally { try { execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' }); } catch {} }
  });

  it('CONTENTdm DAO output intentionally does NOT validate against standard XSD', () => {
    // CONTENTdm requires bare `href="..."` on <dao> instead of `xlink:href="..."`
    // because its parser crashes on inline namespace declarations.
    // The standard LoC XSD requires `xlink:href`. This is a known incompatibility
    // documented in both research papers. Cartulary's output is correct for
    // CONTENTdm but won't validate against the public standard XSD when dao is present.
    if (!existsSync(schemaPath)) return;
    const xml = generateEAD2002(makeTreeWithDao(), cdmPreset, control);
    const tmpDir = mkdtempSync(join(tmpdir(), 'cdm-ref-'));
    const xmlPath = join(tmpDir, 'test.xml');
    writeFileSync(xmlPath, xml, 'utf-8');
    let valid = true;
    try { execSync(`xmllint --noout --schema "${schemaPath}" "${xmlPath}" 2>/dev/null`, { stdio: 'pipe', timeout: 10000 }); }
    catch { valid = false; }
    finally { try { execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' }); } catch {} }
    expect(valid).toBe(false); // Expected — see comment above
  });
});

describe('CONTENTdm — date validation', () => {
  const cdmPreset = getPreset('contentdm');

  it('accepts century-spanning ISO dates', () => {
    const rows = [{ __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', unitdate: '1898/1905' }];
    const errors = validateTree(rows, cdmPreset);
    expect(errors.filter((e) => e.field === 'unitdate' && e.severity === 'error')).toHaveLength(0);
  });

  it('flags non-ISO dates as errors (strict mode)', () => {
    const rows = [{ __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', unitdate: 'circa 1898' }];
    const errors = validateTree(rows, cdmPreset);
    expect(errors.some((e) => e.field === 'unitdate')).toBe(true);
  });
});
