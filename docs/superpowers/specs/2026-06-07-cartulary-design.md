# Cartulary — Refined Design Specification

*Date: 2026-06-07 | Informed by 4 deep-research documents and Cartulary_Project_Plan.md*

---

## 1. Settled Decisions (Research-Reconciled)

| Decision | Resolution | Source |
|---|---|---|
| EAD3 namespace | `http://ead3.archivists.org/schema/` with schema at `https://www.loc.gov/ead/ead3.xsd` | Gemini research papers [A][B]; verified independent of live import |
| EAD 2002 namespace (AtoM) | `urn:isbn:1-931666-22-9` with `ead3flat.xsd` | Conflict [C] → confirmed as EAD 2002-only value |
| `<c>` vs `<c01>`–`<c12>` | **Configurable flag in presets.** Default determined by live ArchivesSpace import test (Phase 0) | Conflict [C] → defer to empirical test |
| AtoM EAD3 support | **None.** AtoM preset outputs EAD 2002 via dedicated serializer | Conflict [C] — primary source (Artefactual Systems mailing list) confirms |
| DSpace | **Excluded.** Flat Dublin Core/METS architecture incompatible with EAD hierarchy | Consensus across all 4 documents |
| CONTENTdm | **Parked until Phase 6.** Requires import-profile research before implementation | Open research gap |
| Tech stack | Vite + TypeScript + SheetJS + xmlbuilder2 + GitHub Pages | Consensus across all 4 documents |
| Validation approach | Rule-based heuristic validator; WASM XSD validation documented but set aside | Consensus |
| Tree traversal | Iterative DFS (not recursive) to prevent stack overflow on deep collections | Consensus |

---

## 2. Architecture

### 2.1 Module Layout

```
src/
  main.ts                     — App entry point, wizard bootstrap
  style.css                   — Application styles
  types.ts                    — Shared interfaces (EADNode, ValidationError, PresetConfig)
  lib/
    parser/
      spreadsheet.ts          — Phase 1: SheetJS parsing (parseSpreadsheet, normalizeMergedCells)
      preview.ts              — Phase 1: Preview slice (getPreviewSlice)
      encoding.ts             — Phase 1: BOM prepend, codepage fallback
    hierarchy/
      level-column.ts         — Phase 3: Level column stack algorithm
      dotted-ids.ts           — Phase 3: Dotted ID prefix algorithm
      parent-id.ts            — Phase 3: Adjacency-list two-pass algorithm
      cycle-detect.ts         — Phase 3: Iterative DFS cycle detection
      shared.ts               — Phase 3: EADNode interface, validation helpers
    generator/
      ead3.ts                 — Phase 4: EAD3 XML serializer
      ead2002.ts              — Phase 6: EAD 2002 serializer (AtoM)
      sanitize.ts             — Phase 4: Nokogiri ampersand workaround
    validator/
      rules.ts                — Phase 5: Validation rule engine
    presets/
      config.ts               — Phase 6: Repository preset definitions
  ui/
    wizard.ts                 — Phase 2: Three-step wizard controller
    step-upload.ts            — Step 1: Drag-and-drop upload + preview
    step-map.ts               — Step 2: Column mapper + control form
    step-export.ts            — Step 3: Validate & Export
    error-panel.ts            — Phase 7: Error display panel
    components/
      preview-table.ts        — Reusable preview table
      field-tooltip.ts        — Field tooltip component
      preset-selector.ts      — Repository preset dropdown
```

### 2.2 Data Flow

```
[.xlsx/.csv File]
       │
       ▼
  parseSpreadsheet() ──── getPreviewSlice() ──► Step 1 Preview Table
       │
       ▼
  [JSON rows with __rowNum__]
       │
       ▼
  buildTreeFromLevels() / buildTreeFromDottedIDs() / buildTreeFromParentId()
       │
       ▼
  [EADNode[]] ──► detectCycles()
       │
       ├──► generateEAD3(tree, preset, formData) ──► [EAD3 XML string]
       │         │
       │         └── sanitize() ──► Nokogiri-safe text
       │
       └──► validateTree(nodes, preset) ──► ValidationError[]
                 │
                 └──► Step 3 Error Panel
```

### 2.3 Three-Step Wizard

**Step 1 — Upload.** Drag-and-drop or file input. Parse spreadsheet, show first 25-row preview. Detect column headers.

**Step 2 — Map.** Left column: EAD field anchor points (Tier 1 always visible, Tier 2 collapsible). Right column: detected spreadsheet headers. Preset dropdown at top. Hierarchy mode selector. Composite date mapping (Start Date + End Date + Date Expression → `<unitdate>`). Auto-generated `<control>` form.

**Step 3 — Validate & Export.** Run validation, display errors with row references and severity badges. Export button: Disabled (errors) / Warn & Export (warnings only) / Export (clean).

---

## 3. Implementation Order

```
Phase 0 (Foundation) ─── DONE ─── scaffold, configs, Docker
     │
     ├── ► RUN   <c> element import test against local ArchivesSpace (blocking for serializer default)
     │
     ▼
Phase 1 (Parsing) ──── pure TS, no UI dep ──── NEXT
Phase 3 (Hierarchy) ── pure TS, no UI dep ──── NEXT (parallel with Phase 1)
     │
     ▼
Phase 4 (XML Gen) ──── depends on Phase 3 tree
     │
     ▼
Phase 5 (Validation) ─ depends on Phase 3 + Phase 4
     │
     ▼
Phase 2 (UI) ───────── stub can start in parallel with Phase 1 using mock data
     │
     ▼
Phase 6 (Presets) ──── depends on Phase 5
Phase 7 (Error UI) ─── integrate with Phase 2
Phase 8 (Polish) ───── depends on everything above
Phase 9 (Deploy) ───── final
```

---

## 4. Preset Configuration Model

```typescript
interface PresetConfig {
  name: string;
  targetFormat: 'ead3' | 'ead2002';
  componentConvention: 'generic-c' | 'numbered-c';
  validationStrictness: {
    isoTarget: 'error' | 'warning';
    extentFormat: 'error' | 'warning' | 'off';
    chronologicalOrder: 'error' | 'warning';
    unitidAudienceInternal: 'error' | 'warning' | 'off';
  };
  nokogiriSanitize: boolean;
  controlBlock: {
    agencyName: string;
    recordId: string; // UUID
  };
}
```

---

## 5. Known Risks & Mitigations

- **SheetJS xlsx vulnerabilities**: Prototype pollution + ReDoS (no fix in community edition). Acceptable risk in client-side-only context where user processes own files. Mitigation: validate user input, never expose to untrusted data.
- **CONTENTdm profile unknown**: Parked. UI dropdown shows "Coming soon" placeholder. Not a Phase 1–5 blocker.
- **AtoM EAD 2002 mapping**: Dedicated serializer needed, non-trivial mapping table. Phase 6 scope item.

---

## 6. Sign-off Criteria by Phase

| Phase | Criteria |
|---|---|
| 0 | Scaffold builds clean. ArchivesSpace container running. `<c>` test result recorded. |
| 1 | `parseSpreadsheet()` handles .xlsx + .csv + merged cells + BOM. `getPreviewSlice()` returns 25 rows. |
| 2 | Three-step wizard functional with mock data. Drag-and-drop works. Column mapper renders. |
| 3 | All three tree algorithms produce correct trees. Cycle detection catches cycles. |
| 4 | Generated XML passes EAS Validator. ArchivesSpace import succeeds. |
| 5 | All validation rules fire with correct row references. Export button state reflects severity. |
| 6 | All three presets produce repository-valid XML. AtoM EAD 2002 serializer maps correctly. |
| 7 | Error cards link to preview rows. Severity badges render correctly. |
| 8 | Example spreadsheet downloads. Tooltips render. ARIA labels present. |
| 9 | GitHub Pages deploys from `main`. Production build at `/cartulary/`. |
