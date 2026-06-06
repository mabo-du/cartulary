Cartulary — EAD XML Generator
Named after: a cartulary — a medieval manuscript register of charters, deeds, and property records kept by a monastery, cathedral, or institution. The oldest form of a finding aid. Immediately resonant for archivists.

The Problem
Archivists creating finding aids for submission to institutional repositories (ArchivesSpace, AtoM, DSpace, CONTENTdm) must produce EAD3-compliant XML. The Encoded Archival Description version 3 standard (Library of Congress, 2015) defines the hierarchical structure of a finding aid: Collection → Series → Sub-series → File → Item.

Most archivists draft finding aids in spreadsheets and then convert to EAD XML by hand or with tools that have since been abandoned. The most widely-used conversion tool (EADMachine) supports EAD 2002 only — EAD3 is now the deposit requirement of most major repositories and has been for several years. No current free tool converts a spreadsheet to valid EAD3 XML. Cartulary is that tool.

Who It's For
Archivists, special collections librarians, records managers, digital preservation officers at universities, cultural institutions, government archives, historical societies.

Tech Stack
Recommendation: Pure client-side JavaScript, deployed as a static site.

Cartulary is the simplest build in this list. No backend, no Python, no installation. The entire application runs in the browser.

Layer
Choice
Language
JavaScript / TypeScript
Spreadsheet parsing
SheetJS (xlsx) — reads .xlsx and .csv client-side
XML generation
DOM API or xmlbuilder2 (JS, MIT)
XSD validation
Partial — implement required-field checks + hierarchy validation
UI
Vanilla JS or lightweight framework; no React needed
Hosting
GitHub Pages (zero cost, static)
EAD3 schema reference
Library of Congress EAD3 XSD (public domain)

Key Technical Challenges
Hierarchy inference from a flat spreadsheet. Archivists typically work in spreadsheets where each row is a component (a series, a file, an item) and the hierarchy is expressed either by:

A level column (collection, series, subseries, file, item)
Indented component ID codes (1, 1.1, 1.1.2)
A parent_id column referencing another row

Cartulary should support all three representations. The column mapper (Step 2 of the UI flow) lets the user indicate which column carries hierarchy information and which format they're using. The parser then constructs the tree before generating XML.

EAD3 required vs optional elements. The full EAD3 schema is large. In practice, repositories require a subset. Cartulary should implement:

<ead>, <control>, <maintenanceagency>, <maintenancehistory>
<archdesc> with level="fonds" (or collection/record group as appropriate)
<dsc> with <c> elements (or <c01>–<c12>) for components
Per component: <did>, <unittitle>, <unitdate>, <unitid>, <extent>
Per component: <scopecontent>, <accessrestrict>, <userestrict>, <langmaterial>

This covers ~95% of what real finding aid submissions require. Mark unsupported elements clearly in the documentation.

Repository presets. ArchivesSpace, AtoM, and DSpace each have slightly different EAD profile requirements and import quirks. Implement three presets that pre-configure:

Which elements to include/exclude
Date format expectations
Component level naming conventions
Namespace declarations

These presets can be derived from each repository's published EAD import documentation.

Validation feedback. Full XSD validation client-side is complex. Implement a practical validation layer:

Required fields present per component level
No orphaned components (every row has a valid parent)
Date format consistency
Unit IDs unique within the document
No circular parent-child references

Flag errors with row references so the archivist can find and fix them in their original spreadsheet without re-mapping.

EAD3 namespace and encoding declaration. The output XML must open with:

<?xml version="1.0" encoding="UTF-8"?>

<ead xmlns="http://ead3.archivists.org/schema/"

     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"

     xsi:schemaLocation="http://ead3.archivists.org/schema/

     https://www.loc.gov/ead/EAD3.xsd"

     audience="external">

This declaration is required for most repository imports and is easy to get wrong. Test against at least one live ArchivesSpace import during development.
UI Flow
Three steps, deliberately minimal:

Upload — drag and drop .xlsx or .csv. Preview first 10 rows.
Map — column mapper: match spreadsheet columns to EAD fields. Required fields highlighted. Optional fields collapsible. Repository preset dropdown at top.
Validate & Export — run validation checks, show errors with row references. When clean (or user overrides warnings), download the .xml file.

No accounts, no server, no data stored anywhere. The XML is generated in the browser and downloaded directly.
Phase Outline
Phase
Description
0
Study EAD3 XSD (LoC). Define the minimum field set. Test one hand-crafted EAD3 XML file against a live ArchivesSpace import to confirm the baseline.
1
SheetJS CSV/xlsx parsing + preview
2
Column mapper UI (required fields, optional fields, hierarchy mode selection)
3
Hierarchy tree construction (level column / dotted IDs / parent_id)
4
EAD3 XML generation (xmlbuilder2, correct namespace declarations)
5
Validation layer (required fields, orphan detection, date format checks)
6
Repository presets (ArchivesSpace, AtoM, DSpace)
7
Error display (row-referenced error list, inline highlights)
8
UI polish, help text, example spreadsheet download
9
Deploy to GitHub Pages

Ecosystem Integration
Cartulary is the only tool in the ecosystem that is primarily archival rather than archaeological. It integrates loosely:

Cache & Carry: A Cache & Carry export (Darwin Core CSV or custom CSV) could serve as the input to Cartulary for institutions that want to create a finding aid for their digitised collection. The column mapping would need to bridge Cache & Carry's field names to EAD3 element names.
Trowel: Out of direct scope, but Trowel's FAIR-compliant archive export (Dublin Core XML) could in future be extended with an EAD3 option that routes through Cartulary's generation logic.

Estimate
2–3 weeks. This is the fastest build in the list. The logic is well-defined, the dependencies are minimal, and the output format is a documented standard. The main time investment is Phase 0 (understanding EAD3 enough to get namespace declarations and hierarchy correct) and Phase 6 (repository presets, which require reading ArchivesSpace/AtoM import documentation carefully).
