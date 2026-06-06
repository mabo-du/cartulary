# Prompt 3 — AtoM EAD 2002 Import Test: Docker Setup and Field Mapping Validation

## Goal

Set up a local AtoM (Access to Memory) instance via Docker Compose, generate test EAD 2002 XML files from Cartulary's `ead2002.ts` serializer, import them into AtoM, and record which field mappings, element conventions, and structural patterns produce clean imports.

## Background

Cartulary has a dedicated EAD 2002 serializer for AtoM (`src/lib/generator/ead2002.ts`) that maps EAD3 structures to their EAD 2002 equivalents:

| EAD3 Element | EAD 2002 Equivalent |
|---|---|
| `<control>` | `<eadheader>` with `@relatedencoding` |
| `<maintenancestatus>` | `@relatedencoding` attribute |
| `<languagedeclaration>` | `<langusage>` inside `<profiledesc>` |
| `<maintenancehistory>` | `<creation>` element |
| `<unitdatestructured>` | Flat `<unitdate>` string |
| `<physdescstructured>` | Flat `<physdesc>` string |

This serializer has not been tested against a live AtoM instance. The following questions are unresolved:

1. Does AtoM accept generic `<c level="...">` elements, or does it require numbered `<c01>`–`<c12>`?
2. Does the `<eadheader>` `@relatedencoding` attribute need a specific value?
3. Does AtoM reject certain element orders or extra whitespace?
4. Is the EAD 2002 namespace `urn:isbn:1-931666-22-9` with `http://www.loc.gov/ead/ead3flat.xsd` schema location accepted?
5. What are the minimum required fields for a successful AtoM import?
6. Are there any AtoM-specific validation quirks (similar to ArchivesSpace's Nokogiri ampersand truncation)?

## Instructions

### Part 1 — AtoM Docker Setup

1. Clone the Artefactual AtoM repository:
   ```bash
   git clone -b qa/2.x https://github.com/artefactual/atom.git
   cd atom
   ```

2. Start the Docker Compose development environment:
   ```bash
   export COMPOSE_FILE="$PWD/docker/docker-compose.dev.yml"
   docker compose up -d
   ```
   (On Apple Silicon, also append `:$PWD/docker/docker-compose.override.arm.yml`)

3. Wait for all 7 containers to start (atom, atom_worker, nginx, elasticsearch, percona, memcached, gearmand).

4. Initialize the database with demo data:
   ```bash
   docker compose exec atom php -d memory_limit=-1 symfony tools:purge --demo
   ```

5. Compile the Bootstrap 5 theme:
   ```bash
   docker compose exec atom npm install
   docker compose exec atom npm run build
   ```

6. Restart the worker:
   ```bash
   docker compose restart atom_worker
   ```

7. Verify the UI at http://localhost:63001 — log in with `demo@example.com` / `demo`.

### Part 2 — Generate Test EAD 2002 Files from Cartulary

1. Start Cartulary's dev server (`npm run dev` from the cartulary directory).

2. Create a minimal test spreadsheet with the following rows:

   | unitid | unittitle | level | unitdate | physdesc | scopecontent |
   |---|---|---|---|---|---|
   | test-001 | Test Collection | collection | 1920/1940 | 1 linear foot | A test finding aid for AtoM import validation. |
   | test-001-001 | Series A | series | 1920 | 0.5 linear feet | First test series. |
   | test-001-001-001 | File A-1 | file | 1920 | 1 folder | A single test file. |

3. Export with the **AtoM (EAD 2002)** preset selected. Save the output to `test-atom-generic-c.xml`.

4. **Repeat with the numbered `<c>` toggle checked.** Save to `test-atom-numbered-c.xml`.

### Part 3 — Import and Test

1. Log in to AtoM at http://localhost:63001 with `demo@example.com` / `demo`.

2. Go to **Import → XML** (or the equivalent menu path in your AtoM version).

3. Import `test-atom-generic-c.xml`. Record:
   - Whether the import succeeds or fails.
   - If it fails, the exact error messages shown.
   - If it succeeds, navigate to the imported record in the AtoM UI and verify:
     - All three levels display (Collection → Series → File).
     - The `<unittitle>` values are rendered correctly.
     - The `<unitdate>` values are parsed.
     - The `<scopecontent>` note appears.

4. Repeat the import with `test-atom-numbered-c.xml`. Record the same observations.

5. If either import fails, iteratively:
   - Simplify the XML by removing non-essential elements.
   - Test with only `<did>` → `<unittitle>`.
   - Add back elements one at a time to isolate the failure.
   - Document the minimum working element set.

### Part 4 — Advanced Tests (if basic imports succeed)

1. **Date format edge cases**: Test with `unitdate` values:
   - `1920/1940` (ISO range)
   - `1920` (single year)
   - `circa 1920s` (free text, non-ISO)
   - `1920-01-01/1920-12-31` (full ISO)

2. **Access and use restrictions**: Add `accessrestrict` and `userestrict` fields and verify they import.

3. **Origination/creator**: Add an `originator` field and verify `<origination>` renders.

4. **Multilingual**: Set `languageCode` to something other than `eng` (e.g., `fre`) and verify `<langusage>` is parsed correctly by AtoM.

5. **Nested hierarchy depth**: Create a spreadsheet with 6+ levels (collection → series → subseries → file → item → component) and verify AtoM renders the full depth.

### Part 5 — Report

Write the results to `PHASE0_TEST_RESULTS.md` under a new "Test 5: AtoM EAD 2002 Import Validation" section. Include:

1. Docker setup commands used (exact versions).
2. Success/failure for generic `<c>` vs `<c01>` imports.
3. The minimum required element set for AtoM.
4. Any AtoM-specific quirks or validation differences from ArchivesSpace.
5. Recommended changes to `ead2002.ts` or the AtoM preset config based on findings.
6. Any changes needed in the preset configuration (`src/lib/presets/config.ts`) for the AtoM target.
