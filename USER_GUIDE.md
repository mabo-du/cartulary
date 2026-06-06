# Cartulary User Guide

**Converting archival spreadsheets to EAD3 XML finding aids in three steps.**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Step 1: Upload](#step-1-upload)
- [Step 2: Map](#step-2-map)
  - [Repository Preset](#repository-preset)
  - [Hierarchy Mode](#hierarchy-mode)
  - [Control Form](#control-form)
  - [Field Mapping](#field-mapping)
  - [Composite Date Mapping](#composite-date-mapping)
  - [Recommended Fields (Tier 2)](#recommended-fields-tier-2)
- [Step 3: Validate & Export](#step-3-validate--export)
  - [Validation Errors](#validation-errors)
  - [Export Options](#export-options)
- [Understanding the Output](#understanding-the-output)
- [Preparing Your Spreadsheet](#preparing-your-spreadsheet)
  - [Level Column Mode](#level-column-mode)
  - [Dotted Component IDs Mode](#dotted-component-ids-mode)
  - [parent_id Column Mode](#parent_id-column-mode)
- [Repository-Specific Notes](#repository-specific-notes)
  - [ArchivesSpace](#archivesspace)
  - [AtoM](#atom)
  - [CONTENTdm](#contentdm)
- [FAQ](#faq)

---

## Overview

Cartulary converts a flat spreadsheet of archival descriptions into a structured EAD3 XML finding aid suitable for import into archival management systems. The entire process happens in your browser — no data is uploaded to any server.

The workflow has three steps:

```
Upload → Map → Validate & Export
```

---

> **v0.1.0** — New: numbered `<c01>`–`<c12>` toggle, Cache & Carry import preset, Web Worker background parsing, and a Tauri desktop app.

## Quick Start

1. Open Cartulary in your browser.
2. Drag a `.xlsx` or `.csv` file onto the upload zone — or click to browse.
3. No spreadsheet handy? Click the **"Download an example template"** link below the upload zone.
4. Map your columns to EAD fields in Step 2.
5. Click **"Validate & Export"** and download your EAD3 XML file.

---

## Step 1: Upload

The upload screen shows a dashed drop zone in the centre of the page.

**To upload a file:**

- **Drag and drop** a `.xlsx`, `.xls`, or `.csv` file onto the drop zone, or
- **Click** the drop zone to open a file browser dialog.

**No spreadsheet yet?** Click the **"Download an example template"** link to get a pre-populated `.xlsx` file with sample archival data across three hierarchy modes (three sheets: "Level Column", "Dotted IDs", "parent_id"). Open it in any spreadsheet app, inspect the structure, or use it directly.

**After upload:**

Cartulary parses the file and displays the first 25 rows in a preview table. Verify your data looks correct, then click **"Map Columns"** to proceed.

**If parsing fails:**

- Check that your file is a valid `.xlsx`, `.xls`, or `.csv`.
- For CSV files, ensure they use UTF-8 encoding. Files with BOM-less Windows-1252 encoding may need re-saving from your spreadsheet app.
- Very large files (>10,000 rows) may cause the browser to pause briefly. This is normal — all processing is local.

---

## Step 2: Map

The mapping screen is the core of the tool. It has three sections.

### Repository Preset

At the top of the left panel, select your target repository:

| Preset | Output Format | Notes |
|---|---|---|
| **ArchivesSpace** | EAD3 | Strict validation. Generic `<c>` elements (configurable). |
| **AtoM** | EAD 2002 | More permissive validation. Generic `<c>` elements. |
| **CONTENTdm** | EAD3 | Placeholder — not yet implemented. |

Selecting a preset adjusts:

- Which validation rules are errors vs warnings
- Whether Nokogiri ampersand sanitization is applied
- The output XML format (EAD3 vs EAD 2002)

### Hierarchy Mode

Choose how your spreadsheet encodes parent-child relationships:

**Level Column** (most common)
Each row has a `level` value (e.g., `collection`, `series`, `file`, `item`). Cartulary infers the hierarchy from the order of rows and the rank of each level. Rows appear in the order they're listed.

```
unitid       | level      | unittitle
MC-001       | collection | Marcus Collection
MC-001-001   | series     | Correspondence
MC-001-002   | series     | Financial Records
```

**Dotted Component IDs**
Each row has an `id` column with dot-separated values (e.g., `1`, `1.1`, `1.1.2`, `1.2`). The parent of `1.1.2` is `1.1`. Rows are sorted alphabetically so parents precede children.

```
id    | unittitle
1     | Marcus Collection
1.1   | Correspondence
1.1.1 | Personal Letters
1.2   | Financial Records
```

**parent_id Column**
Each row has an `id` and a `parent_id` that references the parent row's `id`. Root-level rows have an empty `parent_id`. The order of rows does not matter.

```
id | parent_id | unittitle
1  |           | Marcus Collection
2  | 1         | Correspondence
3  | 2         | Personal Letters
4  | 1         | Financial Records
```

### Control Form

The control form collects metadata for the `<control>` block of the EAD document (administrative metadata about the finding aid itself):

| Field | Required | Description |
|---|---|---|
| **Finding Aid Title** | Yes | The title of the finding aid (e.g., "Papers of John Smith") |
| **Agency / Institution Name** | Yes | The holding institution (e.g., "University Archives") |
| **Record ID** | No | Auto-generated UUID. Change if you need a specific identifier. |

The following `<control>` fields are generated automatically:

- **Maintenance status**: `new`
- **Language declaration**: English / Latin script (configurable in code)
- **Maintenance history**: One event with current timestamp, agent type `machine`, agent "Cartulary XML Generator"

### Field Mapping

The main area shows EAD3 fields on the left and spreadsheet column selectors on the right. Map each EAD field to the corresponding column in your spreadsheet.

**Tier 1 — Required Fields** (always visible):

| EAD Field | DACS Rule | Description |
|---|---|---|
| `unitid` | 2.1 | Unique identifier for the archival unit |
| `unittitle` | 2.3 | Title or name of the archival unit |
| `unitdate` | 2.4 | Date(s) in ISO 8601 format |
| `level` | — | Hierarchical level (collection, series, file, item) |
| `physdesc` | 2.5 | Physical extent and format |
| `scopecontent` | 3.1 | Narrative scope and content note |
| `accessrestrict` | 4.1 | Access restrictions |
| `userestrict` | — | Use restrictions |
| `langmaterial` | 4.5 | Language(s) of the materials |

Every mapped field includes a hover tooltip (ⓘ icon) showing:

- The EAD element name
- DACS rule number (where applicable)
- A one-sentence description of the field's purpose
- An example value

**Required fields** (`unitid` and `unittitle` at minimum) are marked with a red badge. At least one of `unitid` or `unittitle` must be mapped for each row.

### Numbered `<c>` Toggle

Below the preset selector, there's a checkbox labelled **"Use numbered `<c01>`–`<c12>` elements"**:

- **Unchecked** (default): Output uses generic `<c level="series">` elements
- **Checked**: Output uses numbered `<c01>`–`<c12>` elements reflecting the depth level

Both conventions are valid EAD3/EAD 2002 and are accepted by ArchivesSpace and AtoM. Some institutions or workflows prefer the numbered convention for its explicit depth indication.

### Cache & Carry Import

If you use **Cache & Carry** (the offline collections management system), check **"Cache & Carry field mapping"** to automatically pre-fill the column mappings for a Cache & Carry CSV export.

The preset auto-maps these fields:

| Cache & Carry Column | EAD Field |
|---|---|
| `accession_number` | `unitid` |
| `object_name_aat_uri` | `unittitle` |
| `type_of_object` | `unittitle` (fallback) |
| `description` | `scopecontent` |
| `materials_techniques` | `physdesc` |
| `measurements` | `physdesc` (appended) |
| `created_at` | `unitdate` |
| `nagpra_flagged` | `accessrestrict` |
| `secret_sacred_flag` | `accessrestrict` |
| `exhibition_consent_granted` | `userestrict` |
| `research_consent_granted` | `userestrict` |

The hierarchy mode is also auto-detected from the columns present in the export (level column, dotted IDs, or `parent_id`).

### Composite Date Mapping

Archivists commonly have separate columns for start date, end date, and a free-text date expression (e.g., "circa 1920s"). The composite date mapping lets you assign all three to the `<unitdate>` block:

| Sub-field | Purpose | Example |
|---|---|---|
| **Start Date** | Earliest date (ISO 8601 year) | `1920` |
| **End Date** | Latest date (ISO 8601 year) | `1940` |
| **Date Expression** | Free-text date for display | `circa 1920s-1940s` |

When both start and end dates are mapped, Cartulary combines them into the `@normal` attribute as `1920/1940`. The date expression becomes the element's text content.

### Recommended Fields (Tier 2)

Click the **"Recommended Fields (Tier 2)"** expandable section to see additional optional fields:

| EAD Field | DACS Rule | Description |
|---|---|---|
| `originator` | 2.6 | Creator of the collection (person or organization) |
| `bioghist` | 2.7 | Biographical or historical context |
| `relatedmaterial` | — | Related collections or materials |
| `altformavail` | — | Alternate formats available |
| `geogname` | — | Geographic name or place |

---

## Step 3: Validate & Export

Click **"Validate & Export"** to run validation checks and proceed to the export screen.

### Validation Results

Cartulary runs the following checks against every row:

| Rule | What It Checks | Severity |
|---|---|---|
| Required fields | Every row has `unitid` or `unittitle`; root row has `level` | Error |
| ISO 8601 dates | `unitdate` matches YYYY or YYYY/YYYY format | Error (varies by preset) |
| Chronological order | Start year ≤ end year | Error (varies by preset) |
| Extent format | `physdesc` starts with a digit (e.g., "12 linear feet") | Error/Warning (varies) |
| Duplicate `unitid` | No two rows share the same `unitid` | Error |
| `@audience="internal"` | Blocked by ArchivesSpace preset | Error (ArchivesSpace only) |

Each error card shows:

- **Severity** — Error (red) or Warning (amber)
- **Row number** — The original spreadsheet row
- **Field name** — The EAD element that failed validation
- **Message** — Human-readable explanation

### Export Options

The export button has three states:

| State | Condition | Behaviour |
|---|---|---|
| **Fix Errors to Export** | One or more fatal errors | Button disabled. Fix errors and re-validate. |
| **Warn & Export** | Warnings only, no errors | Clicking shows a confirmation, then downloads. |
| **Export XML** | Clean validation | Clicking downloads the EAD3 XML file directly. |

The downloaded file is a `.xml` file named after the record ID (e.g., `550e8400-e29b-41d4-a716-446655440000.xml`).

---

## Understanding the Output

The generated XML follows the EAD3 standard with this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ead xmlns="http://ead3.archivists.org/schema/"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://ead3.archivists.org/schema/ https://www.loc.gov/ead/ead3.xsd"
     audience="external">
  <control>
    <recordid>550e8400-e29b-41d4-a716-446655440000</recordid>
    <filedesc>
      <titlestmt>
        <titleproper>Papers of John Smith</titleproper>
      </titlestmt>
    </filedesc>
    <maintenancestatus value="new"/>
    <maintenanceagency>
      <agencyname>University Archives</agencyname>
    </maintenanceagency>
    <languagedeclaration>
      <language langcode="eng"/>
      <script scriptcode="Latn"/>
    </languagedeclaration>
    <maintenancehistory>
      <maintenanceevent>
        <eventtype value="created"/>
        <eventdatetime standarddatetime="2026-06-07T12:00:00Z"/>
        <agenttype value="machine"/>
        <agent>Cartulary XML Generator</agent>
      </maintenanceevent>
    </maintenancehistory>
  </control>
  <archdesc level="collection">
    <did>
      <unitid>MC-001</unitid>
      <unittitle>Marcus Collection</unittitle>
      <unitdate normal="1920/1940">1920-1940</unitdate>
    </did>
    <dsc>
      <c level="series">
        <did>
          <unitid>MC-001-001</unitid>
          <unittitle>Correspondence</unittitle>
        </did>
        <c level="file">
          <did>
            <unitid>MC-001-001-001</unitid>
            <unittitle>Personal Letters</unittitle>
          </did>
        </c>
      </c>
    </dsc>
  </archdesc>
</ead>
```

---

## Preparing Your Spreadsheet

### Level Column Mode

Your spreadsheet should have a column whose values indicate hierarchical level. Use standard level names:

```
collection  →  1  (highest)
series      →  2
subseries   →  3
file        →  4
item        →  5  (lowest)
```

Rows are processed in order. A row with `level=series` becomes a child of the most recent row with a lower-numbered level.

**Tips:**
- Sort your rows so parents appear before children.
- Cartulary flags **taxonomy gaps** as warnings (e.g., jumping directly from `series` to `item` without a `file` row in between).
- If your data has only one level (all rows are `file`), each row becomes a root-level component — this is valid but may not import correctly into all repositories.

### Dotted Component IDs Mode

Your spreadsheet needs an `id` column with dot-separated values:

```
1            → root
1.1          → child of 1
1.1.2        → child of 1.1
1.2          → child of 1
```

**Tips:**
- Rows are sorted alphabetically, so `1.1` always appears before `1.1.2`.
- Orphan IDs (a child whose parent ID doesn't exist) are flagged as errors.
- There is no limit on nesting depth — the algorithm handles arbitrary depth.

### parent_id Column Mode

Your spreadsheet needs an `id` column and a `parent_id` column:

```
id: 1,   parent_id: (empty)  → root
id: 2,   parent_id: 1        → child of 1
id: 3,   parent_id: 2        → child of 2
```

**Tips:**
- Root-level rows must have an empty `parent_id` (blank cell, not `0`).
- Children can appear before parents in the spreadsheet — the two-pass algorithm handles this.
- Orphans (child's `parent_id` doesn't match any `id`) are flagged as errors.
- Duplicate IDs are flagged as errors.

---

## Repository-Specific Notes

### ArchivesSpace

**Format**: EAD3

**Import quirks**:
- ISO 8601 dates are strictly required. Non-compliant dates will cause import failure.
- Extent must start with a digit followed by a space (e.g., `12 linear feet`, not `twelve linear feet`).
- `unitid @audience="internal"` is rejected during import — use `external` or omit the attribute.
- ArchivesSpace uses Nokogiri for XML parsing, which has a known bug where `&` followed immediately by text (e.g., `A&B`) is truncated. Cartulary automatically inserts a space after `&` to work around this.
- Both generic `<c level="series">` and numbered `<c01>` component conventions are accepted. Generic `<c>` is the default in Cartulary; enable numbered output via the preset config toggle.

### AtoM

**Format**: EAD 2002 (not EAD3)

Cartulary includes a dedicated EAD 2002 serializer that maps all structural differences automatically:

| EAD3 Element | EAD 2002 Equivalent |
|---|---|
| `<control>` | `<eadheader>` |
| `<maintenancestatus>` | `@relatedencoding` attribute on `<eadheader>` |
| `<languagedeclaration>` | `<langusage>` inside `<profiledesc>` |
| `<maintenancehistory>` | `<creation>` element |
| `<unitdatestructured>` | Flat `<unitdate>` string |
| `<physdescstructured>` | Flat `<physdesc>` string |

**Import quirks**:
- ISO 8601 dates are strictly required, even for EAD 2002.
- AtoM accepts both generic `<c>` and numbered `<c01>` component elements. Use the **numbered `<c>` toggle** if needed.
- Extent format is a warning, not an error — AtoM is more permissive.
- AtoM defaults displayed descriptions to English if `<langusage>` is missing or unparseable. Cartulary populates this correctly from your control form data.

### CONTENTdm

**Status**: Coming soon. The import profile for CONTENTdm is not yet documented, and the preset is a placeholder in the UI.

---

## FAQ

**Q: Is my data uploaded to a server?**

No. Everything runs in your browser using JavaScript. The file is parsed locally, mapping happens locally, XML is generated locally. No data ever leaves your computer.

**Q: What file formats are supported?**

`.xlsx` (Excel), `.xls` (Excel 97–2003), and `.csv` (comma-separated values).

**Q: Is there a row limit?**

There is no hard limit. Files over approximately 50 KB are automatically parsed in a **Web Worker** (background thread), keeping the UI responsive during processing. The main-thread parser is used as a fallback for smaller files or environments where Workers are unavailable.

**Q: Can I run Cartulary as a desktop application?**

Yes. Cartulary includes a **Tauri** desktop wrapper. To run it:

```bash
npm run tauri dev
```

To build a native binary for your platform:

```bash
npm run tauri build
```

Pre-built binaries for Linux, macOS (Intel + Apple Silicon), and Windows are available on the [Releases](https://github.com/mabo-du/cartulary/releases) page (once a version tag is pushed).

**Q: Can I use this offline?**

Yes, after the first load. Once the page is loaded, all JavaScript runs locally. No further network requests are made.

**Q: What is a cartulary?**

A cartulary is a medieval manuscript register of charters, deeds, and property records kept by a monastery or cathedral — the oldest form of a finding aid. The name was chosen because it's immediately resonant for archivists.

**Q: How does Cartulary differ from EADMachine?**

EADMachine supports EAD 2002 only and has been abandoned. Cartulary generates EAD3 (the current standard required by most major repositories) and EAD 2002 (for AtoM). Cartulary is actively maintained and open-source.

**Q: Can I contribute?**

This project is currently private. When it's ready for public contributions, instructions will be added.

**Q: I found a bug or have a feature request.**

File an issue on the GitHub repository: https://github.com/mabo-du/cartulary/issues
