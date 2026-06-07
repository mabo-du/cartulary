/** ead2002.ts — EAD 2002 XML document generator for AtoM and CONTENTdm.
 *
 * Key research-backed behaviours:
 *   - AtoM accepts both generic <c> and numbered <c01> (generic is fine with @level)
 *   - CONTENTdm REQUIRES numbered <c01>–<c12> and strict component convention
 *   - AtoM needs @relatedencoding="ISAD(G)v2" on <eadheader>
 *   - CONTENTdm crashes on inline namespace declarations — strips xmlns: prefixes
 *   - AtoM needs @datechar="creation" on <unitdate>
 *   - Both need ampersand + control character sanitization
 *   - xsi:schemaLocation should be suppressible (AtoM can fail on remote DTD fetch)
 *
 * exports:
 *   generateEAD2002(tree, preset, control): string
 *
 * used_by: ui/wizard.ts → preset dispatch
 * agent:   deepseek-v4-flash | 2026-06-07 | Research-backed rewrite for AtoM + CONTENTdm
 */

import { create } from 'xmlbuilder2';
import type { EADNode, PresetConfig, ControlFormData } from '../../types';
import { sanitize } from './sanitize';

const EAD2002_NS = 'urn:isbn:1-931666-22-9';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const LOC_EAD_XSD = 'http://www.loc.gov/ead/ead.xsd';

const ISO_NOW = new Date().toISOString();

/**
 * Generate a complete EAD 2002 XML document for AtoM or CONTENTdm.
 */
export function generateEAD2002(
  tree: EADNode[],
  preset: PresetConfig,
  control: ControlFormData,
): string {
  const config = preset;
  const convention = config.componentConvention;
  const strictConvention = config.strictComponentConvention ?? false;
  const includeSchemaLocation = !config.suppressSchemaLocation;
  const stripNamespaces = config.removeNamespaceDeclarations ?? false;

  // Root <ead> — conditionally omit xsi:schemaLocation for AtoM
  const builder = create({
    version: '1.0',
    encoding: 'UTF-8',
    defaultNamespace: { ele: EAD2002_NS },
  });

  const ead = builder
    .ele(EAD2002_NS, 'ead');

  if (!stripNamespaces) {
    ead.att(XSI_NS, 'xmlns:xsi', XSI_NS);
  }

  if (includeSchemaLocation) {
    if (stripNamespaces) {
      // For CONTENTdm: no inline namespace declarations at all
      // Skip schemaLocation
    } else {
      ead.att(XSI_NS, 'xsi:schemaLocation', `${EAD2002_NS} ${LOC_EAD_XSD}`);
    }
  }

  ead.att('audience', 'external');

  // ----- <eadheader> -----
  const eadheader = ead.ele('eadheader');

  // @relatedencoding signals the internal crosswalk (AtoM)
  if (config.relatedEncoding) {
    eadheader.att('relatedencoding', config.relatedEncoding);
  }

  // <eadid>
  eadheader.ele('eadid').txt(control.recordId || sanitize(control.findingAidTitle));

  // <filedesc> → <titlestmt> → <titleproper>
  const filedesc = eadheader.ele('filedesc');
  const titlestmt = filedesc.ele('titlestmt');
  titlestmt.ele('titleproper').txt(sanitize(control.findingAidTitle));

  // <profiledesc> — strict EAD 2002 element order: <creation>, <langusage>, <descrules>
  const profiledesc = eadheader.ele('profiledesc');

  // <creation> — EAD 2002 allows only <date> inside <creation>
  const creation = profiledesc.ele('creation');
  creation.ele('date').txt(ISO_NOW);

  // <langusage>
  const langusage = profiledesc.ele('langusage');
  langusage.ele('language').att('langcode', control.languageCode);

  // ----- <archdesc> block -----
  const rootLevel = tree.length === 1 ? tree[0].level : 'collection';
  const archdesc = ead.ele('archdesc').att('level', rootLevel);

  // Root-level <did> (only if tree has a single root — otherwise we need to synthesize)
  const rootDid = archdesc.ele('did');
  if (tree.length === 1) {
    const m = tree[0].metadata;
    if (m.unitid) rootDid.ele('unitid').txt(sanitize(String(m.unitid)));
    if (m.unittitle) rootDid.ele('unittitle').txt(sanitize(String(m.unittitle)));
    if (m.unitdate) {
      const ud = rootDid.ele('unitdate');
      // AtoM expects @datechar for chronological classification
      ud.att('datechar', 'creation');
      // Add @normal for ISO 8601 date indexing
      const normal = buildNormalDate(m);
      if (normal) ud.att('normal', normal);
      ud.txt(sanitize(String(m.unitdate)));
    }
  }

  // <scopecontent> at archdesc level
  if (tree.length === 1) {
    const m = tree[0].metadata;
    if (m.scopecontent) {
      archdesc.ele('scopecontent').ele('p').txt(sanitize(String(m.scopecontent)));
    }
  }

  // <dsc> with component tree
  const dsc = archdesc.ele('dsc');

  const stack: { node: EADNode; parent: any; depth: number }[] = tree.map((n) => ({
    node: n,
    parent: dsc,
    depth: 1,
  }));

  while (stack.length > 0) {
    const { node, parent, depth } = stack.pop()!;
    const cEl = createComponent(node, parent, convention, strictConvention, stripNamespaces, depth);

    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i], parent: cEl, depth: depth + 1 });
    }
  }

  return builder.end({ prettyPrint: true, indent: '  ', newline: '\n' });
}

/**
 * Create a <c @level="..."> or <c01> component with full EAD 2002 <did> content.
 */
function createComponent(
  node: EADNode,
  parent: any,
  convention: PresetConfig['componentConvention'],
  strictConvention: boolean,
  stripNamespaces: boolean,
  depth: number,
): any {
  const tagName = convention === 'numbered-c' ? numberedTag(depth) : 'c';
  const attrs: Record<string, string> = {};

  if (convention === 'generic-c' || tagName === 'c') {
    attrs.level = node.level || 'otherlevel';
  } else if (strictConvention) {
    // Numbered tags still need @level for semantic clarity
    attrs.level = node.level || 'otherlevel';
  }

  const cEl = parent.ele(tagName, attrs);

  // <did> block
  const did = cEl.ele('did');
  const m = node.metadata;

  if (m.unitid) did.ele('unitid').txt(sanitize(String(m.unitid)));
  if (m.unittitle) did.ele('unittitle').txt(sanitize(String(m.unittitle)));
  if (m.unitdate) {
    const ud = did.ele('unitdate');
    ud.att('datechar', 'creation');
    const normal = buildNormalDate(m);
    if (normal) ud.att('normal', normal);
    ud.txt(sanitize(String(m.unitdate)));
  }
  if (m.physdesc) did.ele('physdesc').txt(sanitize(String(m.physdesc)));

  // <dao> for digital objects — strip namespace prefixes for CONTENTdm
  if (m.dao_href) {
    const href = String(m.dao_href);
    const title = m.dao_title ? String(m.dao_title) : 'View digital object';
    const role = m.dao_role ? String(m.dao_role) : 'use original';

    if (stripNamespaces) {
      // CONTENTdm: bare attributes, no xlink: prefix
      cEl.ele('dao')
        .att('href', href)
        .att('title', sanitize(title))
        .att('role', role);
    } else {
      cEl.ele('dao')
        .att('xlink:href', href)
        .att('xlink:title', sanitize(title))
        .att('xlink:role', role)
        .att('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }
  }

  // Optional non-did children
  if (m.scopecontent)
    cEl.ele('scopecontent').ele('p').txt(sanitize(String(m.scopecontent)));
  if (m.accessrestrict)
    cEl.ele('accessrestrict').ele('p').txt(sanitize(String(m.accessrestrict)));
  if (m.userestrict)
    cEl.ele('userestrict').ele('p').txt(sanitize(String(m.userestrict)));
  if (m.bioghist)
    cEl.ele('bioghist').ele('p').txt(sanitize(String(m.bioghist)));
  if (m.originator)
    cEl.ele('origination').ele('persname').txt(sanitize(String(m.originator)));

  return cEl;
}

function numberedTag(depth: number): string {
  const num = Math.min(Math.max(depth, 1), 12);
  return `c${String(num).padStart(2, '0')}`;
}

/**
 * Build the ISO 8601 @normal date string from metadata.
 * Prefers structured date fields over raw unitdate.
 */
function buildNormalDate(m: Record<string, unknown>): string | null {
  const start = m.startDate ? String(m.startDate) : null;
  const end = m.endDate ? String(m.endDate) : null;

  if (start && end) return `${start}/${end}`;
  if (start) return start;
  if (end) return end;

  // Try to extract from unitdate if it matches ISO
  if (m.unitdate) {
    const raw = String(m.unitdate);
    const isoMatch = raw.match(/^\d{4}(-\d{2}(-\d{2})?)?(\/\d{4}(-\d{2}(-\d{2})?)?)?$/);
    if (isoMatch) return raw;
  }

  return null;
}
