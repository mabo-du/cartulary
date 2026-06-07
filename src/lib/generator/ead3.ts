/** ead3.ts — EAD3 XML document generator.
 *
 * exports:
 *   generateEAD3(tree, preset, control): string
 *     Produces a valid EAD3 XML string with correct namespace declarations,
 *     strict element ordering, and depth-first pre-order component serialization.
 *
 * used_by: ui/step-export.ts → download
 * rules:   Always use defaultNamespace config in create(), not .att() alone.
 *          Use iterative (not recursive) DFS for component serialization.
 *          Element order in <control> must match EAD3 schema sequence.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented EAD3 serializer with xmlbuilder2
 */

import { create } from 'xmlbuilder2';
import type { EADNode, PresetConfig, ControlFormData } from '../../types';
import { sanitize } from './sanitize';

const EAD3_NS = 'http://ead3.archivists.org/schema/';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const EAD3_SCHEMA_URL = 'https://www.loc.gov/ead/ead3.xsd';

const ISO_NOW = new Date().toISOString();

/**
 * Generate a complete EAD3 XML document from a parsed tree.
 */
export function generateEAD3(
  tree: EADNode[],
  preset: PresetConfig,
  control: ControlFormData,
): string {
  const convention = preset.componentConvention;

  // Create root document with default namespace
  const doc = create({
    version: '1.0',
    encoding: 'UTF-8',
    defaultNamespace: { ele: EAD3_NS },
  })
    .ele(EAD3_NS, 'ead')
    .att(XSI_NS, 'xsi:schemaLocation', `${EAD3_NS} ${EAD3_SCHEMA_URL}`)
    .att('audience', 'external');

  // ----- <control> block (strict element order) -----
  const controlEl = doc.ele('control');

  // 1. <recordid>
  controlEl.ele('recordid').txt(control.recordId);

  // 2. <filedesc> → <titlestmt> → <titleproper>
  const filedesc = controlEl.ele('filedesc');
  filedesc.ele('titlestmt').ele('titleproper').txt(sanitize(control.findingAidTitle));

  // 3. <maintenancestatus @value="new">
  controlEl.ele('maintenancestatus').att('value', 'new');

  // 4. <maintenanceagency> → <agencyname>
  controlEl
    .ele('maintenanceagency')
    .ele('agencyname')
    .txt(sanitize(control.agencyName));

  // 5. <languagedeclaration> → <language @langcode> + <script @scriptcode>
  const langDecl = controlEl.ele('languagedeclaration');
  langDecl.ele('language').att('langcode', control.languageCode);
  langDecl.ele('script').att('scriptcode', control.scriptCode || 'Latn');

  // 6. <maintenancehistory> → <maintenanceevent>
  const hist = controlEl.ele('maintenancehistory');
  const event = hist.ele('maintenanceevent');
  event.ele('eventtype').att('value', 'created');
  event.ele('eventdatetime').att('standarddatetime', ISO_NOW);
  event.ele('agenttype').att('value', 'machine');
  event.ele('agent').txt('Cartulary XML Generator');

  // ----- <archdesc> block -----
  const rootLevel = tree.length === 1 ? tree[0].level : 'collection';
  const archdesc = doc.ele('archdesc').att('level', rootLevel);

  // EAD3: <archdesc> requires <did> as first child, then <c> components
  const rootDid = archdesc.ele('did');
  if (tree.length === 1) {
    const m = tree[0].metadata;
    if (m.unitid) rootDid.ele('unitid').txt(sanitize(String(m.unitid)));
    if (m.unittitle) rootDid.ele('unittitle').txt(sanitize(String(m.unittitle)));
    if (m.unitdate) {
      const ud = rootDid.ele('unitdate');
      const start = m.startDate ? String(m.startDate) : null;
      const end = m.endDate ? String(m.endDate) : null;
      if (start && end) ud.att('normal', `${start}/${end}`);
      ud.txt(sanitize(String(m.unitdate)));
    }
    if (m.physdesc) rootDid.ele('physdesc').txt(sanitize(String(m.physdesc)));
  }
  rootDid.up(); // close <did>

  // EAD3: components go inside <dsc> wrapper
  const dsc = archdesc.ele('dsc');

  // Iterative depth-first pre-order traversal with depth tracking
  const stack: { node: EADNode; parent: any; depth: number }[] = tree.map((n) => ({
    node: n,
    parent: dsc,
    depth: 1,
  }));

  while (stack.length > 0) {
    const { node, parent, depth } = stack.pop()!;
    const cEl = createComponent(parent, node, convention, depth);

    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i], parent: cEl, depth: depth + 1 });
    }
  }

  return doc.end({ prettyPrint: true, indent: '  ', newline: '\n' });
}

/**
 * Create a <c @level="..."> or <c01> element and populate <did> content.
 */
function createComponent(
  parent: any,
  node: EADNode,
  convention: PresetConfig['componentConvention'],
  depth: number,
): any {
  const tagName =
    convention === 'numbered-c'
      ? numberedTagName(depth)
      : 'c';

  const cEl =
    convention === 'numbered-c'
      ? parent.ele(tagName)
      : parent.ele(tagName, { level: node.level || 'otherlevel' });

  const did = cEl.ele('did');
  const m = node.metadata;

  if (m.unitid) did.ele('unitid').txt(sanitize(String(m.unitid)));
  if (m.unittitle) did.ele('unittitle').txt(sanitize(String(m.unittitle)));
  if (m.unitdate) buildUnitDate(did, m);
  if (m.physdesc) {
    did.ele('physdesc').txt(sanitize(String(m.physdesc)));
  }
  did.up(); // close <did>

  // Optional non-did elements (sibling to <did>, not inside it)
  if (m.scopecontent)
    cEl.ele('scopecontent').ele('p').txt(sanitize(String(m.scopecontent)));
  if (m.accessrestrict)
    cEl
      .ele('accessrestrict')
      .ele('p')
      .txt(sanitize(String(m.accessrestrict)));
  if (m.userestrict)
    cEl.ele('userestrict').ele('p').txt(sanitize(String(m.userestrict)));
  if (m.bioghist)
    cEl.ele('bioghist').ele('p').txt(sanitize(String(m.bioghist)));
  if (m.originator)
    cEl
      .ele('origination')
      .ele('persname')
      .txt(sanitize(String(m.originator)));
  if (m.langmaterial)
    cEl
      .ele('langmaterial')
      .ele('language')
      .txt(sanitize(String(m.langmaterial)));
  if (m.relatedmaterial)
    cEl
      .ele('relatedmaterial')
      .ele('p')
      .txt(sanitize(String(m.relatedmaterial)));

  return cEl;
}

/**
 * Build a <unitdate> element from composite date fields.
 * Supports: dateExpression (text), startDate/endDate (ISO @normal).
 */
function buildUnitDate(did: any, metadata: Record<string, unknown>): void {
  const expr = metadata.dateExpression
    ? String(metadata.dateExpression)
    : String(metadata.unitdate ?? '');

  const start = metadata.startDate ? String(metadata.startDate) : null;
  const end = metadata.endDate ? String(metadata.endDate) : null;

  const unitdate = did.ele('unitdate');

  if (start || end) {
    const normal = start && end ? `${start}/${end}` : start || end || '';
    if (normal) unitdate.att('normal', normal);
  }

  unitdate.txt(sanitize(expr));
}

/**
 * Numbered <c01>–<c12> tag based on nesting depth.
 * Depth 1 → c01, depth 2 → c02, etc. Clamped to 1–12.
 */
function numberedTagName(depth: number): string {
  const num = Math.min(Math.max(depth, 1), 12);
  return `c${String(num).padStart(2, '0')}`;
}
