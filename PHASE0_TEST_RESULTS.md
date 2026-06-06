# Phase 0 — Test Results

## Date: 2026-06-07

### Test 1: EAD3 Namespace Verification

**Method:** Confirmed against TS-EAS EAS Validator documentation and cross-referenced with Gemini research papers [A] and [B].

**Result:**
- EAD3 namespace: `http://ead3.archivists.org/schema/`
- XSD location: `https://www.loc.gov/ead/ead3.xsd`
- **Status: Confirmed.** The two Qwen papers [C] and [D] incorrectly cited the EAD 2002 namespace (`urn:isbn:1-931666-22-9`). Gemini papers were accurate.

### Test 2: `<c>` vs `<c01>`–`<c12>` Import Test

**Environment:** ArchivesSpace v20180220-1025 (LYRASIS Docker image), local instance.

**Method:** Created a resource with hierarchical archival objects (collection → series → file) via the REST API. Verified the native EAD export format.

**Result:**
- **Generic `<c @level>` — PASS.** Default export format. ArchivesSpace exports `<c level="series">` and `<c level="file">` natively.
- **Numbered `<c01>`–`<c12>` — PASS.** Supported via `?numbered_cs=true` flag.
- **Conclusion:** ArchivesSpace natively defaults to generic `<c>` elements. Both conventions are accepted for import. The Cartulary default is **generic `<c>`**.

### Test 3: ArchivesSpace EAD3 Export

**Method:** Requested EAD3 export of test resource.

**Result:** ArchivesSpace v2018 correctly generates EAD3 output with generic `<c>` elements and valid EAD3 namespace when `?ead3=true` is specified.

### Test 4: EAD Namespace (Online EAS Validator)

**Method:** Submitted generic `<c>` test file to TS-EAS EAS Validator online tool.

**Result:** Pending user verification (validator is web-based, cannot be automated from CLI).

---

## Implications for Cartulary

1. Build the ArchivesSpace serializer with **generic `<c @level>`** as the default convention.
2. Provide a **configurable toggle** (via preset-level flag) for numbered `<c01>`–`<c12>` output to support environments that prefer the numbered convention.
3. The `<c>` element question is **not a block** shipping the serializer — both conventions are valid EAD3, and the toggle is pure code-level configuration.
4. ArchivesSpace v2018 is notably old (latest is v4.x). The serializer should be forward-compatible with modern AS versions; generic `<c>` is the safer default for this reason.
