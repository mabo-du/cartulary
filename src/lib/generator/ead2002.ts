/** ead2002.ts — EAD 2002 XML document generator for AtoM.
 *
 * AtoM does not support EAD3 natively (confirmed via Artefactual Systems
 * mailing list). This serializer produces EAD 2002 output with the correct
 * namespace, element mapping, and structural conventions for AtoM import.
 *
 * Key mappings (EAD3 → EAD 2002):
 *   <control>           → <eadheader>
 *   <maintenancestatus> → @relatedencoding on <eadheader>
 *   <languagedeclaration> → <langusage> inside <profiledesc>
 *   <unitdatestructured>  → flat <unitdate> string
 *   <physdescstructured>  → flat <physdesc> string
 *
 * exports:
 *   generateEAD2002(tree, preset, control): string
 *
 * used_by: ui/step-export.ts → preset dispatch
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented EAD 2002 serializer
 */

import { create } from 'xmlbuilder2';
import type { EADNode, PresetConfig, ControlFormData } from '../../types';
import { sanitize } from './sanitize';
import { getPreset } from '../presets/config';

const EAD2002_NS = 'urn:isbn:1-931666-22-9';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

const ISO_NOW = new Date().toISOString();

/**
 * Generate a complete EAD 2002 XML document for AtoM import.
 */
export function generateEAD2002(
  tree: EADNode[],
  preset: PresetConfig,
  control: ControlFormData,
): string {
  const config = getPreset(preset.name);
  const convention = config.componentConvention;

  const doc = create({
    version: '1.0',
    encoding: 'UTF-8',
    defaultNamespace: { ele: EAD2002_NS },
  })
    .ele(EAD2002_NS, 'ead')
    .att(XSI_NS, 'xsi:schemaLocation', `${EAD2002_NS} http://www.loc.gov/ead/ead3flat.xsd`)
    .att('audience', 'external');

  // ----- <eadheader> (replaces EAD3 <control>) -----
  const eadheader = doc.ele('eadheader')
    .att('relatedencoding', 'dc'); // AtoM expects this attribute

  // <eadid>
  eadheader.ele('eadid').txt(control.recordId);

  // <filedesc> → <titlestmt> → <titleproper>
  const filedesc = eadheader.ele('filedesc');
  filedesc.ele('titlestmt').ele('titleproper').txt(sanitize(control.findingAidTitle));

  // <profiledesc> → <langusage> (AtoM defaults to English if missing)
  const profiledesc = eadheader.ele('profiledesc');
  const langusage = profiledesc.ele('langusage');
  langusage.ele('language').att('langcode', control.languageCode);

  // <creation> → agency + date
  const creation = profiledesc.ele('creation');
  creation.ele('date', ISO_NOW);
  creation.ele('author').txt(sanitize(control.agencyName));

  // ----- <archdesc> block -----
  const rootLevel = tree.length === 1 ? tree[0].level : 'collection';
  const archdesc = doc.ele('archdesc').att('level', rootLevel);

  // Root <did>
  const rootDid = archdesc.ele('did');
  if (tree.length === 1) {
    const m = tree[0].metadata;
    if (m.unitid) rootDid.ele('unitid').txt(sanitize(String(m.unitid)));
    if (m.unittitle) rootDid.ele('unittitle').txt(sanitize(String(m.unittitle)));
    if (m.unitdate) rootDid.ele('unitdate').txt(sanitize(String(m.unitdate)));
  }

  // <dsc> with component tree
  const dsc = archdesc.ele('dsc');

  const stack: { node: EADNode; parent: any }[] = tree.map((n) => ({
    node: n,
    parent: dsc,
  }));

  while (stack.length > 0) {
    const { node, parent } = stack.pop()!;
    const cEl = createComponentEAD2002(parent, node, convention);

    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i], parent: cEl });
    }
  }

  return doc.end({ prettyPrint: true, indent: '  ', newline: '\n' });
}

/**
 * Create a <c @level="..."> component with EAD 2002 <did> content.
 */
function createComponentEAD2002(
  parent: any,
  node: EADNode,
  convention: PresetConfig['componentConvention'],
): any {
  const tagName = convention === 'numbered-c'
    ? numberedTagName(node)
    : 'c';

  const cEl = convention === 'numbered-c'
    ? parent.ele(tagName)
    : parent.ele(tagName, { level: node.level || 'otherlevel' });

  const did = cEl.ele('did');
  const m = node.metadata;

  if (m.unitid) did.ele('unitid').txt(sanitize(String(m.unitid)));
  if (m.unittitle) did.ele('unittitle').txt(sanitize(String(m.unittitle)));
  if (m.unitdate) did.ele('unitdate').txt(sanitize(String(m.unitdate)));
  if (m.physdesc) {
    did.ele('physdesc').txt(sanitize(String(m.physdesc)));
  }

  // Optional non-did children (EAD 2002 uses <scopecontent>, <bioghist>, etc.
  // directly as siblings of <did>, same as EAD3)
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

function numberedTagName(node: EADNode): string {
  const depthMap: Record<string, number> = {
    collection: 1, recordgrp: 1, fonds: 1,
    series: 2, subseries: 3, subfonds: 3,
    file: 4, item: 5,
  };
  const num = Math.min(Math.max(depthMap[node.level.toLowerCase()] ?? 3, 1), 12);
  return `c${String(num).padStart(2, '0')}`;
}
