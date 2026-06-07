# Phase 0 — Test Results

## Date: 2026-06-07

### Test 1: EAD3 Namespace Verification
**Result:** Confirmed — `http://ead3.archivists.org/schema/` from LoC XSD.

### Test 2: `<c>` vs `<c01>`–`<c12>` Import Test (ArchivesSpace)
**Result:** ArchivesSpace accepts both conventions. Generic `<c @level>` is the native default. Both are valid for import.

### Test 3: EAD3 Export
**Result:** Valid EAD3 output with `<dsc>` wrapper and correct namespace.

### Test 4: EAD Namespace (Online EAS Validator)
**Result:** Validator unreachable. Namespace confirmed directly from LoC XSD.

### Test 5: AtoM EAD 2002 Import Validation — SUCCESS

**Environment:**
- AtoM qa/2.x branch (Docker Compose, 7 containers)
- Web UI at http://localhost:63001
- Credentials: demo@example.com / demo

**Test File:** Cartulary-generated EAD 2002 XML from the example spreadsheet using the AtoM preset with **generic `<c>` elements** and **`@relatedencoding="ISAD(G)v2"`**.

**Results:**

| Component | Result |
|---|---|
| Generic `<c level="...">` elements | ✅ **Accepted** — 7 records created |
| `@relatedencoding="ISAD(G)v2"` | ✅ Accepted — crosswalk triggered correctly |
| `<unitdate>` with `@normal` | ✅ Parsed and indexed |
| `<scopecontent>` | ✅ Imported and displayed |
| Hierarchy (collection → series → file) | ✅ All 3 levels rendered correctly |
| `<unittitle>` + `<unitid>` minimum | ✅ Sufficient for import |

**Records created:**
1. Marcus Collection
2. Correspondence
3. Personal Letters
4. Business Correspondence
5. Financial Records
6. Ledgers
7. Receipts

**Contradiction resolved:**
Both research papers' disagreement on generic `<c>` vs numbered `<c01>` is now settled — **generic `<c>` works perfectly** in AtoM. The source-code analysis was correct. The other paper's error may have been caused by missing `@level` attributes or an earlier AtoM version bug.

**Open questions remaining:**
- Proper `updateType` parameter (worker warned about "delete-and-replace" mode)
- The `@datechar` attribute behaviour on `<unitdate>` in search indexing
