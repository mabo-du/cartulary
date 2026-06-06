# Cartulary — Synthesised Project Plan

*Synthesised from four deep-research documents: [A] EAD3 Repository Import Briefing, [B] Client-Side EAD3 XML Generation Guidance, [C] Architecting Cartulary Blueprint, [D] From Spreadsheet to EAD3 Technical Blueprint.*

---

## Part 1 — Research Reconciliation

Before any implementation begins, four conflicts between the source documents need to be resolved. One document ([D]) contains material errors that would silently break the tool if followed.

---

### Conflict 1 — EAD3 Namespace URI (Critical)

Document [D] specifies `xmlns="urn:isbn:1-931666-22-9"` and `ead3flat.xsd`. **This is the EAD 2002 namespace, not EAD3.** Using it will produce an EAD 2002 document that silently fails EAD3 validation.

**Resolution — use [A] and [B]:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ead xmlns="http://ead3.archivists.org/schema/"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://ead3.archivists.org/schema/
         https://www.loc.gov/ead/ead3.xsd"
     audience="external">
```

The schema URL uses `https://`, not `http://`. Minor, but some validators reject the HTTP variant.

---

### Conflict 2 — AtoM EAD3 Support (Critical — Major Architectural Implication)

Document [D] states that AtoM introduced native EAD3 support in version 2.2 and that it handles EAD3 import flexibly. Document [A] cites the ICA-AtoM users mailing list directly, where Artefactual Systems confirmed that **AtoM does not natively support EAD3** and that implementing it requires external community funding that has not materialised.

[A] is backed by primary community sources (mailing list, AtoM GitHub). [D] appears to confuse EAD 2002 flexible-mode ingestion with EAD3 support.

**Resolution:** The AtoM preset must output **EAD 2002**, not EAD3. This requires a separate EAD 2002 serializer — a distinct code path, not a minor configuration switch. This is the single largest scope addition the research identifies. Plan time accordingly.

---

### Conflict 3 — ArchivesSpace Component Element Convention

Document [D] states ArchivesSpace strongly prefers and requires numbered `<c01>–<c12>` elements. Document [A], citing the ArchivesSpace export documentation, states modern ArchivesSpace defaults to and expects **generic `<c>` elements** with a `@level` attribute.

**Resolution:** [A] is more authoritative. Plan for generic `<c>` as default. However, the Phase 0 live import test is the definitive tie-breaker — test both conventions against a real ArchivesSpace instance and record the result before writing the serializer.

---

### Conflict 4 — `<eadheader>` vs `<control>`

Document [D] uses `<eadheader>` and `<archdesc>` as the root-level children of `<ead>` throughout. In EAD3, these are `<control>` and `<archdesc>`. `<eadheader>` is the EAD 2002 element that `<control>` replaces. Wherever [D] says `<eadheader>`, apply the EAD3 `<control>` structure documented in [A].

---

## Part 2 — Architecture Decisions (Confirmed by Research)

All four documents converge on the following, which can be treated as settled:

**Tech stack:** Vite + TypeScript + SheetJS (`xlsx`) + xmlbuilder2 + GitHub Pages. No alternative libraries are recommended by any source.

**Repository presets:** ArchivesSpace (EAD3) | AtoM (EAD 2002 via dedicated serializer) | CONTENTdm (EAD3, replacing DSpace).

**DSpace:** Excluded. All four documents agree it is not a realistic EAD3 target. Its flat Dublin Core/METS architecture is ontologically incompatible with EAD's recursive hierarchy.

**Validation approach:** Rule-based heuristic validator over WASM XSD validation. WASM (e.g., `xmllint-wasm`, `libxml2-wasm`) adds ~800KB–1MB to the bundle, requires Web Worker orchestration to avoid UI freezing, and catches no errors that the rule-based validator misses in practice. The WASM path is documented, tested against the EAS Validator online tool, and then set aside.

**Tree traversal:** Depth-first pre-order for serialization. Iterative (not recursive) DFS to prevent call-stack overflow on deeply nested collections.

**Hierarchy construction:** Three separate parsers → shared `EADNode` intermediate → single serializer. Custom implementation, not d3.stratify (which throws on first error rather than collecting all errors).

**Error reporting:** SheetJS's `__rowNum__` property is preserved throughout the entire pipeline so every validation error references its original spreadsheet row.

**xmlbuilder2 namespace pattern:** Must use `defaultNamespace: { ele: EAD3_NS }` in the `create()` config. Declaring the namespace via `.att()` alone causes all child elements to emit a spurious `xmlns=""` attribute that invalidates the document.

---

## Part 3 — Minimum Field Set (Confirmed Two-Tier Model)

Both [A] and [D] converge on a layered field set. This is the definitive version, drawing on the DACS mapping from [A].

### Tier 1 — Compatibility Floor (all presets, required in UI)

Fields without which at least one target repository will fail to import.

| EAD3 Element | DACS Rule | Notes |
|---|---|---|
| `<unitid>` | 2.1 | Cannot be empty; `@audience="internal"` blocked (ArchivesSpace rejects it) |
| `<unittitle>` | 2.3 | Required if `<unitdate>` absent; vice versa |
| `<unitdate>` | 2.4 | ISO 8601 strictly enforced across all presets |
| `<archdesc @level>` | — | Required attribute; typically `collection` at root |
| `<repository>` → `<corpname>` → `<part>` | 2.2 | EAD3 wraps `<corpname>` in `<part>` |
| `<accessrestrict>` → `<p>` | 4.1 | Text must be wrapped in `<p>` |
| `<userestrict>` → `<p>` | — | Same wrapping requirement |
| `<langmaterial>` → `<language @langcode>` | 4.5 | ISO 639 language code required |
| `<scopecontent>` → `<p>` | 3.1 | Functionally required to populate discovery indexes |

The `<control>` block is generated automatically (not user-mapped) from agency name, record ID, and timestamp. Fields shown above are what the user maps from their spreadsheet.

### Tier 2 — Best Practice Profile (strongly recommended, not blocking)

| EAD3 Element | DACS Rule | Notes |
|---|---|---|
| `<origination>` → `<persname>`/`<corpname>` | 2.6 | Creator of the collection |
| `<physdesc>` / `<extent>` | 2.5 | Must start with a digit (ArchivesSpace extent rule) |
| `<bioghist>` → `<p>` | 2.7 | Biographical/historical context — professionally expected |
| `<relatedmaterial>` | — | |
| `<altformavail>` | — | |
| `<geogname>` with coordinates | — | Increasingly required for GIS-based discovery |

Display Tier 1 as always-required fields. Display Tier 2 as collapsible "recommended" fields with a brief archival justification in the tooltip.

---

## Part 4 — Phase-by-Phase Implementation Plan

### Phase 0 — Schema Study, Environment Setup, CONTENTdm Profile

**This phase must complete before any code is written.**

**Tasks:**

1. **Verify the EAD3 namespace block.** Hand-craft a minimal valid EAD3 XML file using the namespace from Part 1, Conflict 1. Run it through the TS-EAS EAS Validator online tool (public, no login required). Then import it into a live ArchivesSpace instance.

2. **Resolve the `<c>` element question.** Test both generic `<c level="series">` and numbered `<c01>` against the live ArchivesSpace import. Record which one the system accepts cleanly. This determines the ArchivesSpace serializer's default.

3. **Research the CONTENTdm EAD import profile.** All four documents recommend CONTENTdm as the third preset but provide no import profile. Before writing the preset, establish: Does CONTENTdm expect EAD3 or EAD 2002? Are there non-standard attributes or element requirements? What is its minimum field set? This is a targeted research task — the CONTENTdm official documentation and community forums (the CONTENTdm user group, Code4Lib list) are the sources.

4. **Scaffold the project.**
   ```bash
   npm create vite@latest cartulary -- --template vanilla-ts
   cd cartulary
   npm install xlsx xmlbuilder2
   ```

5. **Configure `vite.config.ts`** for GitHub Pages subdirectory hosting:
   ```typescript
   import { defineConfig } from 'vite';
   export default defineConfig({
     base: '/cartulary/',  // must match exact repo name
     build: { outDir: 'dist', emptyOutDir: true }
   });
   ```

6. **Create `public/404.html`** — a minimal HTML page that redirects all non-root paths back to `index.html` for SPA routing on GitHub Pages.

7. **Set up `.github/workflows/deploy.yml`** for automated deployment on push to `main`.

**Sign-off criterion:** A hand-crafted EAD3 XML file imports cleanly into ArchivesSpace. CONTENTdm import profile documented. `<c>` element preference recorded.

---

### Phase 1 — SheetJS Parsing Engine

**Deliverables:** Three functions: `parseSpreadsheet`, `normalizeMergedCells`, `getPreviewSlice`. Plus encoding fallback logic.

**File reading — use `arrayBuffer()`, not `readAsText()`.**
The Promise-based `file.arrayBuffer()` approach preserves raw binary and avoids premature UTF-8 interpretation, which corrupts legacy archival files encoded in Windows-1252 or ISO-8859 variants.

```typescript
async function parseSpreadsheet(file: File): Promise<any[]> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, {
        type: "array",
        cellFormula: false,  // major memory saving
        cellHTML: false,
        cellStyles: false,
        cellNF: false
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    normalizeMergedCells(worksheet);
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    // __rowNum__ is added automatically by SheetJS — preserve it
}
```

**Merged cell normalization.** Archivists use merged cells to imply hierarchy visually. SheetJS only populates the top-left cell of a merged region; all others are null. Traverse `ws['!merges']` backwards and fill-down the origin value before `sheet_to_json()`.

```typescript
function normalizeMergedCells(worksheet: XLSX.WorkSheet): void {
    if (!worksheet['!merges']) return;
    for (let i = worksheet['!merges'].length - 1; i >= 0; i--) {
        const range = worksheet['!merges'][i];
        const originAddress = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
        const originCell = worksheet[originAddress];
        if (!originCell) continue;
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                if (R === range.s.r && C === range.s.c) continue;
                worksheet[XLSX.utils.encode_cell({ r: R, c: C })] = { ...originCell };
            }
        }
    }
    delete worksheet['!merges'];
}
```

**Encoding fallback.** For BOM-less CSV files, prepend the UTF-8 BOM (`\ufeff`) before passing to SheetJS. For Windows-1252 encoded legacy files, use the `cpexcel.full.mjs` codepage registry: inject it via `XLSX.set_cptable()` before calling `XLSX.read()`.

**Preview slice.** Clamp the sheet range to 25 rows for the column-mapper preview:
```typescript
function getPreviewSlice(worksheet: XLSX.WorkSheet, rowLimit = 25): any[] {
    if (!worksheet["!ref"]) return [];
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    range.e.r = Math.min(range.e.r, range.s.r + rowLimit - 1);
    return XLSX.utils.sheet_to_json(worksheet, {
        range: XLSX.utils.encode_range(range)
    });
}
```

**Large file strategy.** For datasets with tens of thousands of rows, the parsing loop can freeze the UI thread. The architectural solution is to move `XLSX.read()` into a Web Worker, serialise the `File` as an `ArrayBuffer`, transfer ownership, and receive chunked results back via `postMessage`. Plan the Web Worker scaffold now even if it activates later.

---

### Phase 2 — Column Mapper UI

**Deliverables:** Three-step wizard (Upload → Map → Validate & Export), repository preset dropdown, hierarchy mode selector, composite field mapping for dates.

**Step 1 — Upload.** Drag-and-drop or file-input. On file selection, run `parseSpreadsheet()` and `getPreviewSlice()` and display the first 25 rows in a preview table. Show detected column headers.

**Step 2 — Map.** The core UI. Layout: target EAD fields as static anchor points on the left; detected spreadsheet column headers as assignable items on the right.

Key UX decisions from [A] and [B]:
- Display EAD element names (`<unittitle>`, `<unitdate>`) not generic labels ("Title", "Date"). Archivists are familiar with XML tag names; generic labels cause confusion.
- Tier 1 fields are permanently visible and clearly required. Tier 2 fields are in a collapsible "Recommended Fields" section with a brief archival rationale for each.
- Each field has a tooltip showing: EAD3 element name, DACS rule number, 1-sentence description.
- Repository preset dropdown at the top of Step 2. Selecting a preset pre-configures which fields are required and adjusts the validation rules for Step 3.
- Hierarchy mode selector: Level Column | Dotted Component IDs | parent\_id column.

**Composite date mapping.** Archivists commonly use three columns: "Start Date", "End Date", "Date Expression" (e.g., "circa 1920s"). The UI must allow assigning all three to the `<unitdate>` block. The generation engine combines them: the Date Expression goes into the text node; Start Date and End Date are combined into the ISO 8601 `@normal` attribute (`YYYY/YYYY`).

**Auto-generated `<control>` fields.** The following are collected via a simple form in Step 2 (not column-mapped):
- Agency name (the holding institution)
- Record ID (pre-filled with a generated UUID; editable)
- Maintenance event is auto-stamped with the current datetime.

**Step 3 — Validate & Export.** Runs the validation layer (Phase 5), displays errors with row references, and enables the export button only when all fatal errors are resolved.

---

### Phase 3 — Hierarchy Tree Construction

**Deliverables:** `EADNode` interface; three parser functions converging to a shared representation; validation functions.

**Shared interface:**
```typescript
interface EADNode {
    id: string;
    originalRowIndex: number;  // __rowNum__ from SheetJS — never drop this
    level: string;             // collection | series | subseries | file | item
    metadata: Record<string, any>;
    children: EADNode[];
}
```

**Algorithm 1 — Level Column (inferred sequence).** Uses a taxonomy ranking map and an execution stack.

```typescript
const RANK: Record<string, number> = {
    collection: 1, series: 2, subseries: 3, file: 4, item: 5
};

function buildTreeFromLevels(rows: any[]): EADNode[] {
    const roots: EADNode[] = [];
    const stack: { node: EADNode; rank: number }[] = [];
    rows.forEach((row, index) => {
        const rank = RANK[row.level?.toLowerCase()] ?? 99;
        const node: EADNode = { id: row.unitid, originalRowIndex: row.__rowNum__, level: row.level, metadata: row, children: [] };
        while (stack.length > 0 && stack[stack.length - 1].rank >= rank) stack.pop();
        if (stack.length === 0) roots.push(node);
        else stack[stack.length - 1].node.children.push(node);
        stack.push({ node, rank });
    });
    return roots;
}
```

Flag rows where level rank delta > 1 as a taxonomy-gap warning (e.g., jumping from series directly to item bypasses file).

**Algorithm 2 — Dotted Component IDs.** Pre-sort rows lexicographically by ID before processing (guarantees parents precede children). Derive parent ID by removing last `.segment`.

```typescript
function buildTreeFromDottedIDs(rows: any[]): EADNode[] {
    const roots: EADNode[] = [];
    const nodeMap = new Map<string, EADNode>();
    // Pre-sort: "1.1" before "1.1.2"
    rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    rows.forEach((row, index) => {
        const id = String(row.id);
        const node: EADNode = { id, originalRowIndex: row.__rowNum__, level: row.level, metadata: row, children: [] };
        nodeMap.set(id, node);
        const lastDot = id.lastIndexOf('.');
        if (lastDot === -1) {
            roots.push(node);
        } else {
            const parentId = id.substring(0, lastDot);
            const parent = nodeMap.get(parentId);
            if (parent) parent.children.push(node);
            else /* orphan */ reportError(row.__rowNum__, `Parent ID "${parentId}" not found`);
        }
    });
    return roots;
}
```

**Algorithm 3 — Explicit `parent_id` (Adjacency List).** Two-pass algorithm required because child rows may appear before their parent rows in the spreadsheet.

Pass 1: Index all rows by ID into a HashMap.
Pass 2: Resolve parent references. Rows with no `parent_id` are roots. Rows whose `parent_id` doesn't exist in the map are orphans (flag with row reference).

**Cycle detection** (all three methods). Iterative DFS with a `visited` Set and a `recursionStack` Set. Use iterative (not recursive) traversal to prevent call-stack overflow on deeply nested collections:

```typescript
function detectCycles(roots: EADNode[]): string[] {
    const errors: string[] = [];
    const visited = new Set<string>();
    const stack: { node: EADNode; path: Set<string> }[] = roots.map(n => ({ node: n, path: new Set([n.id]) }));
    while (stack.length > 0) {
        const { node, path } = stack.pop()!;
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        for (const child of node.children) {
            if (path.has(child.id)) {
                errors.push(`Circular reference at row ${child.originalRowIndex}`);
            } else {
                stack.push({ node: child, path: new Set([...path, child.id]) });
            }
        }
    }
    return errors;
}
```

**Why not d3.stratify()?** It throws on first error and provides no row reference. The custom implementation collects all errors in a single pass, enabling a comprehensive error report.

---

### Phase 4 — EAD3 XML Generation

**Deliverables:** `generateEAD3(tree, preset, formData): string`.

**Namespace initialization — the critical pattern.** Must use `defaultNamespace` config in `create()`, not `.att()` alone. The `.att()` approach causes every child element to emit `xmlns=""`, which silently invalidates the document.

```typescript
import { create } from 'xmlbuilder2';

const EAD3_NS = "http://ead3.archivists.org/schema/";
const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";

const doc = create({
    version: '1.0',
    encoding: 'UTF-8',
    defaultNamespace: { ele: EAD3_NS }
})
.ele(EAD3_NS, 'ead')
.att(XSI_NS, 'xsi:schemaLocation',
    `${EAD3_NS} https://www.loc.gov/ead/ead3.xsd`)
.att('audience', 'external');
```

**`<control>` block — element order is strict (EAD3 schema enforces sequence):**
1. `<recordid>` — UUID or user-provided
2. `<filedesc>` → `<titlestmt>` → `<titleproper>` — title of the finding aid
3. `<maintenancestatus @value="new">`
4. `<maintenanceagency>` → `<agencyname>`
5. `<languagedeclaration>` → `<language @langcode>` + `<script @scriptcode>`
6. `<maintenancehistory>` → `<maintenanceevent>`:
   - `<eventtype @value="created">`
   - `<eventdatetime @standarddatetime="[ISO 8601 now]">`
   - `<agenttype @value="machine">`
   - `<agent>Cartulary XML Generator</agent>`

**Tree serialization — depth-first pre-order.** Open node → write `<did>` metadata → recurse into children → close node:

```typescript
function serializeNode(builder: any, node: EADNode): void {
    const c = builder.ele('c', { level: node.level });
    const did = c.ele('did');
    if (node.metadata.unitid)    did.ele('unitid').txt(sanitize(node.metadata.unitid));
    if (node.metadata.unittitle) did.ele('unittitle').txt(sanitize(node.metadata.unittitle));
    if (node.metadata.unitdate)  buildUnitdate(did, node.metadata);
    if (node.metadata.physdesc)  did.ele('physdesc').ele('extent').txt(sanitize(node.metadata.physdesc));
    // ... additional did fields
    did.up(); // close <did>
    if (node.metadata.scopecontent) c.ele('scopecontent').ele('p').txt(sanitize(node.metadata.scopecontent));
    if (node.metadata.accessrestrict) c.ele('accessrestrict').ele('p').txt(sanitize(node.metadata.accessrestrict));
    node.children.forEach(child => serializeNode(c, child));
}
```

**Nokogiri ampersand bug (ArchivesSpace).** ArchivesSpace's XML parser corrupts `&` followed immediately by text without a space (e.g., `A&B` gets truncated to `A`). xmlbuilder2 auto-escapes `&` to `&amp;`, which is correct XML. Add a `sanitize()` function that ensures at least one space around any `&` character in user-supplied text before it reaches the builder.

**Serialization:**
```typescript
const xml = doc.end({ prettyPrint: true, indent: '  ', newline: '\n' });
```
The `<?xml version="1.0" encoding="UTF-8"?>` processing instruction is included automatically when `headless` is left at its default (false).

---

### Phase 5 — Rule-Based Validation Layer

**Deliverables:** `validateTree(nodes, preset): ValidationError[]`. All errors carry the original spreadsheet `rowIndex`.

```typescript
interface ValidationError {
    rowIndex: number;      // from __rowNum__
    field: string;         // EAD3 element name
    message: string;
    severity: 'error' | 'warning';
}
```

**Rules — in priority order:**

| Rule | Check | Severity |
|---|---|---|
| Required fields | Every node has unitid or unittitle; archdesc has @level | Error |
| Orphan detection | Every non-root parentId exists in the tree | Error |
| Duplicate unitid | No two nodes share the same unitid | Error |
| Circular reference | DFS cycle detection | Error |
| ISO 8601 date | unitdate @normal matches `/^\d{4}(\/\d{4})?$/` or full ISO date | Error |
| Chronological order | @normal start year ≤ end year (ArchivesSpace rejects `1887/1797`) | Error |
| Extent format | physdesc/extent starts with `/^\d+\s/` (digit then space) | Warning (Error for ArchivesSpace preset) |
| Level taxonomy gap | Level delta > 1 in Level Column mode | Warning |
| physdescstructured | If used: unittype must have matching quantity | Warning |
| unitid @audience | @audience="internal" blocked | Error (ArchivesSpace preset) |

Run validation against the **parsed JSON array before XML generation**, not against the generated XML string. This keeps validation fast and maps errors directly to rows.

The extent format rule (digit + space before units) is a warning for AtoM and CONTENTdm presets but a fatal error for the ArchivesSpace preset, since the BHL study confirmed it causes a 8.47% import failure rate.

---

### Phase 6 — Repository Presets

Three preset configuration objects drive differences in serialization, validation strictness, and output format.

**ArchivesSpace Preset (EAD3 output)**

- Component elements: generic `<c @level>` by default (verify with Phase 0 live import test; make this a configurable toggle)
- ISO 8601 date validation: **fatal error** if non-compliant
- Extent format validation: **fatal error** if extent does not start with digit + space
- Chronological date order: enforced as fatal error
- `<unitid @audience="internal">`: blocked
- `<dao>` elements: must include `@title` attribute explicitly (not left for fallback)
- Nokogiri sanitization: active (space-around-ampersand rule)
- Add any non-standard ArchivesSpace `<ead>` root attributes confirmed during Phase 0 testing

**AtoM Preset (EAD 2002 output — separate serializer)**

This preset requires a dedicated EAD 2002 serializer alongside the EAD3 one. The EAD 2002 serializer maps:

| EAD3 element | EAD 2002 equivalent |
|---|---|
| `<control>` | `<eadheader>` |
| `<maintenancestatus>` | `@relatedencoding` attribute on `<eadheader>` |
| `<controlnote>` | generic `<note>` |
| `<languagedeclaration>` | `<langusage>` inside `<profiledesc>` |
| `<unitdatestructured>` | flat `<unitdate>` string |
| `<physdescstructured>` | flat `<physdesc>` string |

EAD 2002 namespace: `urn:isbn:1-931666-22-9` (the one [D] mistakenly applied to EAD3).

Component elements: both numbered and generic are accepted; default to generic `<c @level>` for consistency with ArchivesSpace preset, unless testing reveals a preference.

ISO 8601 date: required. AtoM enforces this even on EAD 2002 imports.

Multilingual handling: AtoM defaults ingested descriptions to English if it cannot parse `<langusage>`. Ensure the EAD 2002 serializer populates `<langusage>` correctly.

**CONTENTdm Preset (EAD3 output — profile TBD)**

CONTENTdm explicitly supports EAD finding aid import and is the recommended DSpace replacement. However, its specific import profile was not covered by any of the four research documents. This preset cannot be written until Phase 0 CONTENTdm research is complete. Placeholder the preset in the UI dropdown with a "Coming soon" state and implement it once the profile is established.

---

### Phase 7 — Error Display UI

**Deliverables:** Validation error panel with row-referenced errors; severity-tiered export button state.

Error list appears in Step 3, above the export button. Each error card shows:
- Severity badge (Error / Warning)
- Row number (matching the original spreadsheet row)
- Field name (EAD3 element)
- Human-readable message (e.g., "Row 142: Date range reversed — end year (1797) precedes start year (1887)")

Clicking an error card scrolls to and highlights the corresponding row in the Step 2 preview table, so the archivist can see the context without returning to their spreadsheet.

Export button states:
- **Disabled** — one or more fatal errors present
- **Warn & Export** — warnings only, no fatal errors; clicking shows a confirmation dialog listing warnings
- **Export** — clean validation pass

---

### Phase 8 — UI Polish, Help Text, Example Template

**Deliverables:** Example spreadsheet download; field tooltips; accessible step-wizard UI.

**Example spreadsheet.** Pre-populated with 6–8 rows of realistic archival data, covering all three hierarchy modes in separate sheets (Level Column / Dotted IDs / parent\_id). Archivists frequently learn a tool by opening the example and modifying it. This is disproportionately valuable relative to the time it takes.

**Field tooltips.** Every EAD3 field in the column mapper displays on hover:
- EAD3 element name (e.g., `<scopecontent>`)
- DACS rule number if applicable
- One-sentence description (what it means, not what XML is)
- Example value

**Accessible UI.** ARIA labels on all form controls, keyboard navigation for the mapper, colour contrast for error severity badges.

---

### Phase 9 — Deploy to GitHub Pages

**Deliverables:** Production build; GitHub Actions CI/CD.

**Vite config** (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/cartulary/',
  build: { outDir: 'dist', emptyOutDir: true }
});
```

**`public/404.html`** — redirect all non-root paths to `index.html`:
```html
<script>
  sessionStorage.redirect = location.href;
</script>
<meta http-equiv="refresh" content="0;URL='/cartulary/'">
```

**`.github/workflows/deploy.yml`**:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

If WASM is ever introduced (e.g., xmllint-wasm for optional XSD validation), Vite requires additional config to serve `.wasm` files with the correct `application/wasm` MIME type. GitHub Pages serves this type correctly; no special configuration needed there.

---

## Part 5 — Dependency Map & Build Order

```
Phase 0 (foundation)
  └── Phase 1 (parsing engine)
        ├── Phase 2 (column mapper UI) — depends on preview data from Phase 1
        └── Phase 3 (hierarchy construction) — depends on parsed rows from Phase 1
              └── Phase 4 (XML generation) — depends on tree from Phase 3
                    └── Phase 5 (validation) — depends on tree (Phase 3) and XML (Phase 4)
                          ├── Phase 6 (presets) — depends on validation layer
                          └── Phase 7 (error display UI) — depends on validation errors
                                └── Phase 8 (polish)
                                      └── Phase 9 (deploy)
```

Phases 1 and 3 can be developed in parallel as pure TypeScript modules with no UI dependency. Phase 2 (the UI) can be developed as a stub with mock data while Phase 1 is being finalised.

---

## Part 6 — Revised Timeline

The original spec estimated 2–3 weeks. The research adds meaningful scope in two areas:

- The AtoM preset requires a full EAD 2002 serializer (a distinct code path, not a config switch)
- CONTENTdm research and preset implementation is still outstanding
- The xmlbuilder2 namespace pattern requires careful implementation and cross-browser testing

**Revised estimate: 4–5 weeks** at a comfortable solo pace; 3 weeks at a focused sprint. The EAD 2002 serializer for AtoM is the critical-path addition — it maps to roughly a week of work once the EAD3 serializer is complete, because the mapping table between the two standards is non-trivial and each mapped element needs to be tested against a real AtoM instance.

The rest of the original 2-week estimate holds: the JS/TS logic is well-defined, the dependencies are proven, and the output format is a documented standard.
