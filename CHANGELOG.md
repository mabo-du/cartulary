# Changelog

All notable changes to Cartulary are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] — 2026-06-07

### Added

- **Onboarding overlay** — First-visit welcome screen explaining the three-step wizard. Stored in localStorage, dismissible by button, click-outside, or Escape.
- **Feedback link** — "👋 Questions? Open an issue" in the app footer and help panel footer. No personal email exposed.
- **Questions & Feedback help topic** — New section in the help panel explaining how to reach out.
- **CONTENTdm namespace stress tests** — 6 new tests covering `xmlns:xlink` stripping, multiple `<dao>` elements, expected XSD incompatibility documented.
- **CONTENTdm structural comparison** — Institutional EAD comparison against Columbia University finding aid. Corrected earlier research assumption (Columbia is not CONTENTdm-hosted).
- **CONTENTdm date validation tests** — Verified century-spanning ISO dates accepted, non-ISO dates flagged as errors.
- **EAD 2002 DTD** — Downloaded for reference.

### Changed

- **Test suite** — 88 tests across 11 files (up from 70). All passing.
- **README** — CONTENTdm preset status clearly flagged as research-backed, awaiting live testing. Call for contributors added.
- **Repos set to public** — Both GitHub and GitLab now public.

---

## [0.3.0] — 2026-06-07

### Fixed

- **Hierarchy parsers** — Fixed logical bugs in cycle detection, adjacency list building, and dotted-ID prefix logic related to duplicate row IDs dropping nodes or prematurely aborting traversals.

---

## [0.2.0] — 2026-06-07

### Added

- **Research-backed CONTENTdm preset** — Fully specified from reverse-engineering: EAD 2002 format, numbered `<c01>` components (strict), inline namespace stripping, `@normal` date enforcement, absolute URL requirement for `<dao>`
- **AtoM preset refinements** — `@relatedencoding="ISAD(G)v2"` on `<eadheader>`, `suppressSchemaLocation` to avoid network-dependent DTD failures, `@datechar="creation"` on `<unitdate>`
- **XML 1.0 control character sanitization** — Strips illegal 0x00-0x1F characters (except tab/LF/CR) from all text nodes, fixes AtoM libxml2 parser crashes (GitHub issue #1839)
- **CONTENTdm namespace stripping** — New `removeNamespaceDeclarations` config option strips `xmlns:xlink` from `<dao>` elements to prevent Project Client parser crashes

### Changed

- **`ead2002.ts`** — Complete rewrite: configurable `@relatedencoding`, optional `xsi:schemaLocation` suppression, `@datechar="creation"` on `<unitdate>`, CONTENTdm-compatible `<dao>` output (bare attributes vs xlink: prefixes)
- **`sanitize.ts`** — Added XML 1.0 illegal control character removal alongside ampersand handling
- **`config.ts`** — AtoM: `nokogiriSanitize` now `true` (libxml2 ampersand crashes confirmed). CONTENTdm: full specification with `removeNamespaceDeclarations: true`
- **`types.ts`** — Added `removeNamespaceDeclarations`, `suppressSchemaLocation`, `relatedEncoding` fields to `PresetConfig`
- **Test suite** — 4 new sanitize tests covering control character stripping (46 total)

### Research

- 4 deep-research papers consumed: AtoM import validation (2 papers), CONTENTdm reverse-engineering (2 papers)
- Key AtoM findings: generic `<c>` works fine (both papers disagree on this — flagged as open question; consensus via QubitXmlImport source code analysis confirms generic works), `@relatedencoding="ISAD(G)v2"` required, ampersand + control char sanitization needed, `xsi:schemaLocation` suppression recommended
- Key CONTENTdm findings: EAD 2002 only, numbered `<c01>` required (OAC/Archives West guidelines), inline namespaces cause fatal errors, date mangling bug on century spans

---

## [0.1.1] — 2026-06-07

### Added

- **Automated test suite** — 43 Vitest unit tests across 7 modules (sanitize, hierarchy algorithms, cycle detection, validation, preset config)
- **Light/parchment theme toggle** — Sun/moon button in the header toggles between dark earthtone and warm light UI, persisted in localStorage
- **MIT License** — `LICENSE` file added

### Changed

- **`.gitignore`** — Extended with agent/IDE/framework config patterns (`.agents/`, `.beads/`, `.ctx/`, `.claude/`, `.gitnexus/`, `.windsurf/` etc.)
- **Clean repo** — Removed 30+ developer-local files from git tracking (agent configs, task files, framework placeholders)
- **CI** — Replaced failing Pages deploy workflow with a simple `Build Check` that reports green on private repos
- **Docs** — README and USER_GUIDE updated for toggles, tests, license

---

## [0.1.0] — 2026-06-07

### Added

- **Three-step wizard** — Upload spreadsheet → Map columns → Validate & Export
- **SheetJS parsing engine** — Supports .xlsx, .xls, .csv with merged-cell normalization, BOM detection, and codepage fallback
- **Three hierarchy algorithms** — Level column (stack-based), dotted component IDs (prefix-based), explicit `parent_id` (adjacency list)
- **EAD3 XML generation** — Full EAD3 output with correct namespace, strict `<control>` element ordering, and depth-first serialization
- **EAD 2002 serializer** — Dedicated serializer for AtoM with `<eadheader>`, `<profiledesc>`, `<langusage>` mapping
- **Rule-based validation** — 8 checks: required fields, ISO 8601 dates, chronological order, extent format, duplicate unitid, audience blocking
- **Repository presets** — ArchivesSpace (EAD3), AtoM (EAD 2002), CONTENTdm placeholder
- **Numbered `<c>` toggle** — Switch between generic `<c @level>` and numbered `<c01>`–`<c12>` output
- **Cache & Carry preset** — One-click field mapping for Cache & Carry CSV export columns
- **Web Worker parsing** — Files over 50 KB parsed in a background thread for responsive UI
- **Tauri desktop wrapper** — Native Linux, macOS, and Windows app via Tauri v2
- **Dark earthtone UI theme** — Warm archival palette (terracotta, parchment, deep charcoal)
- **Field tooltips** — Hover tooltips showing EAD field name, DACS rule, description, and example
- **Example spreadsheet** — Pre-populated .xlsx with 6–8 rows across all three hierarchy modes
- **Composite date mapping** — Start date + end date + free-text expression → ISO 8601 `<unitdate>`
- **GitHub Pages deployment workflow** — `.github/workflows/deploy.yml` (requires public repo or Pro plan)
- **Cross-platform release workflow** — `.github/workflows/release.yml` — triggered by `v*` tags
- **ARIA labels and keyboard support** — Accessible form controls and tooltip triggers
- **CI/CD** — TypeScript compilation + Vite production build on every push

### Technical

- TypeScript 6.0 with strict mode, Vite 8 for bundling
- 7 code-split production chunks (25 KB initial load, heavy libs lazy-loaded)
- SheetJS (xlsx) for parsing, xmlbuilder2 for XML generation
- Iterative (non-recursive) DFS for tree traversal
- Nokogiri ampersand sanitization for ArchivesSpace compatibility
- Phase 0 confirmed: EAD3 namespace via LoC XSD, generic `<c>` as ArchivesSpace default
