/**
 * scripts/generate-example.ts — Generates the example spreadsheet
 * with 3 sheets covering all hierarchy modes.
 *
 * Run: npx tsx scripts/generate-example.ts
 * Output: public/example-finding-aid.xlsx
 */

import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// ── Sheet 1: Level Column Mode ──────────────────────────────────────────
const levelColumnRows = [
  {
    unitid: 'MC-001',
    unittitle: 'Marcus Collection',
    level: 'collection',
    unitdate: '1920/1940',
    physdesc: '12 linear feet',
    scopecontent: 'Personal papers, correspondence, and financial records of the Marcus family, documenting their business activities in the Pacific Northwest from 1920 to 1940.',
    accessrestrict: 'Collection open for research.',
  },
  {
    unitid: 'MC-001-001',
    unittitle: 'Correspondence',
    level: 'series',
    unitdate: '1920/1930',
    physdesc: '3 linear feet',
    scopecontent: 'Incoming and outgoing correspondence arranged chronologically.',
  },
  {
    unitid: 'MC-001-001-001',
    unittitle: 'Personal Letters',
    level: 'file',
    unitdate: '1920',
    physdesc: '1 folder',
    scopecontent: 'Personal letters between family members.',
  },
  {
    unitid: 'MC-001-001-002',
    unittitle: 'Business Correspondence',
    level: 'file',
    unitdate: '1921/1925',
    physdesc: '2 folders',
    scopecontent: 'Correspondence with business partners and suppliers.',
  },
  {
    unitid: 'MC-001-002',
    unittitle: 'Financial Records',
    level: 'series',
    unitdate: '1925/1940',
    physdesc: '2 linear feet',
    scopecontent: 'Ledgers, receipts, and tax records.',
  },
  {
    unitid: 'MC-001-002-001',
    unittitle: 'Ledgers',
    level: 'file',
    unitdate: '1925/1930',
    physdesc: '1 volume',
    scopecontent: 'General ledger covering 1925–1930.',
  },
  {
    unitid: 'MC-001-002-002',
    unittitle: 'Receipts',
    level: 'file',
    unitdate: '1930/1940',
    physdesc: '1 folder',
    scopecontent: 'Chronological receipts and invoices.',
  },
];

// ── Sheet 2: Dotted Component IDs ───────────────────────────────────────
const dottedIdRows = [
  {
    id: '1',
    unittitle: 'Marcus Collection',
    level: 'collection',
    unitdate: '1920/1940',
    scopecontent: 'Personal papers, correspondence, and financial records of the Marcus family.',
  },
  {
    id: '1.1',
    unittitle: 'Correspondence',
    level: 'series',
    unitdate: '1920/1930',
    scopecontent: 'Incoming and outgoing correspondence arranged chronologically.',
  },
  {
    id: '1.1.1',
    unittitle: 'Personal Letters',
    level: 'file',
    unitdate: '1920',
    scopecontent: 'Personal letters between family members.',
  },
  {
    id: '1.1.2',
    unittitle: 'Business Correspondence',
    level: 'file',
    unitdate: '1921/1925',
    scopecontent: 'Correspondence with business partners and suppliers.',
  },
  {
    id: '1.2',
    unittitle: 'Financial Records',
    level: 'series',
    unitdate: '1925/1940',
    scopecontent: 'Ledgers, receipts, and tax records.',
  },
  {
    id: '1.2.1',
    unittitle: 'Ledgers',
    level: 'file',
    unitdate: '1925/1930',
    scopecontent: 'General ledger covering 1925–1930.',
  },
  {
    id: '1.2.2',
    unittitle: 'Receipts',
    level: 'file',
    unitdate: '1930/1940',
    scopecontent: 'Chronological receipts and invoices.',
  },
];

// ── Sheet 3: parent_id Mode ─────────────────────────────────────────────
const parentIdRows = [
  {
    id: '1',
    parent_id: '',
    unittitle: 'Marcus Collection',
    level: 'collection',
    unitdate: '1920/1940',
    scopecontent: 'Personal papers, correspondence, and financial records of the Marcus family.',
  },
  {
    id: '2',
    parent_id: '1',
    unittitle: 'Correspondence',
    level: 'series',
    unitdate: '1920/1930',
    scopecontent: 'Incoming and outgoing correspondence arranged chronologically.',
  },
  {
    id: '3',
    parent_id: '2',
    unittitle: 'Personal Letters',
    level: 'file',
    unitdate: '1920',
    scopecontent: 'Personal letters between family members.',
  },
  {
    id: '4',
    parent_id: '2',
    unittitle: 'Business Correspondence',
    level: 'file',
    unitdate: '1921/1925',
    scopecontent: 'Correspondence with business partners and suppliers.',
  },
  {
    id: '5',
    parent_id: '1',
    unittitle: 'Financial Records',
    level: 'series',
    unitdate: '1925/1940',
    scopecontent: 'Ledgers, receipts, and tax records.',
  },
  {
    id: '6',
    parent_id: '5',
    unittitle: 'Ledgers',
    level: 'file',
    unitdate: '1925/1930',
    scopecontent: 'General ledger covering 1925–1930.',
  },
  {
    id: '7',
    parent_id: '5',
    unittitle: 'Receipts',
    level: 'file',
    unitdate: '1930/1940',
    scopecontent: 'Chronological receipts and invoices.',
  },
];

// ── Build workbook ──────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

const ws1 = XLSX.utils.json_to_sheet(levelColumnRows);
XLSX.utils.book_append_sheet(wb, ws1, 'Level Column');

const ws2 = XLSX.utils.json_to_sheet(dottedIdRows);
XLSX.utils.book_append_sheet(wb, ws2, 'Dotted IDs');

const ws3 = XLSX.utils.json_to_sheet(parentIdRows);
XLSX.utils.book_append_sheet(wb, ws3, 'parent_id');

const outPath = 'public/example-finding-aid.xlsx';
XLSX.writeFile(wb, outPath);
console.log(`Generated example spreadsheet: ${outPath}`);
