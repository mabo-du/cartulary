Prompt 2 — Client-side JavaScript Implementation: SheetJS Parsing, xmlbuilder2 XML Generation, Hierarchy Tree Construction & In-browser Validation

Project context: Cartulary is a purely client-side browser application (no backend, deployed to GitHub Pages) that parses archival spreadsheets and generates EAD3 XML. The tech stack is JavaScript/TypeScript + SheetJS (spreadsheet parsing) + xmlbuilder2 (XML generation). I need implementation guidance on the four core technical challenges before writing code: spreadsheet parsing, EAD3 XML generation, hierarchy tree construction from flat tabular data, and in-browser validation.
Research questions:
1. SheetJS (.xlsx / .csv parsing in the browser)

What is the recommended SheetJS API for loading a file from a drag-and-drop or file-input event in the browser (no Node.js)? What is the correct sequence of calls to go from a File object to a usable array-of-objects sheet representation?
How does SheetJS handle character encoding in legacy archival spreadsheets (UTF-8, UTF-16, Windows-1252)? Are there known encoding failure modes and workarounds?
Archivists sometimes use merged cells to express hierarchy visually. How does SheetJS expose merged cell regions, and what is a safe strategy for handling them (e.g., unmerging and filling down values) without corrupting the data?
What is the lightest-weight way to preview the first N rows of a parsed sheet in a browser UI before the user proceeds to column mapping?
Are there known SheetJS edge cases with large archival spreadsheets (hundreds or thousands of rows, many columns) that could cause performance or memory problems in the browser?

2. xmlbuilder2 for namespace-aware EAD3 generation

What is the xmlbuilder2 API for creating an XML document with a default namespace declaration (xmlns="http://ead3.archivists.org/schema/"), xmlns:xsi, and xsi:schemaLocation on the root element? Provide a minimal working code pattern.
How does xmlbuilder2 handle the <?xml version="1.0" encoding="UTF-8"?> processing instruction, and is it included by default or must it be added explicitly?
What are the serialization / pretty-printing options for producing human-readable EAD3 output (indented, with newlines)?
Are there known issues with xmlbuilder2 and default namespace inheritance that could produce spurious xmlns="" declarations on child elements?
Is xmlbuilder2 a good choice for this use case, or is there a lighter / better-maintained alternative for browser-side XML generation in 2025?

3. Hierarchy tree construction from flat tabular data

Archivists structure hierarchy in spreadsheets three ways. For each, what is a robust algorithm for constructing a parent-child tree, and what are the edge cases?

Level column (each row has a value like collection, series, subseries, file, item): the tree is inferred from the sequence of level values, where a row is a child of the most recent row at the level above it.
Dotted component IDs (e.g., 1, 1.1, 1.1.2): the parent of a node is the node whose ID is the same string with the last .segment removed.
Explicit parent_id column: each row references the unitid of its parent row by value.


For each method: how do you detect orphaned rows (no valid parent), duplicate IDs, and circular references? What data structures are best suited (adjacency list, nested objects, flat array with index)?
What is a safe traversal order for serializing the tree into EAD3 <c> elements (depth-first pre-order is standard for EAD — confirm this and explain why)?
Are there established JavaScript libraries for building and traversing arbitrary trees from flat data that would be worth using here, or is this simple enough to implement from scratch?

4. In-browser validation (without a server)

Full XSD validation in the browser requires loading and interpreting the EAD3 XSD. Is this feasible with current JavaScript libraries (e.g., libxmljs compiled to WASM, xsd-schema-validator)? What are the bundle size, performance, and maintenance trade-offs? Is it worth attempting, or is a curated rule-based validator a better investment of effort for a tool of this scope?
For a practical rule-based validator, what checks cover the largest share of real-world archivist errors? Suggested starting list: required fields per level, orphaned components, duplicate <unitid> values within the document, malformed date strings in <unitdate>, circular parent references. Are there other high-value checks this list misses?
What is a good UX pattern for reporting validation errors with row references back to the original spreadsheet (so the archivist can find and fix the row without re-mapping)? Are there open-source examples of this pattern in similar tools?

5. Column mapping UI

What are established UX patterns for a "column mapper" — a UI where the user matches columns from an uploaded file to target schema fields? Are there open-source examples in archival tools, data transformation tools, or general ETL tools that Cartulary could study or adapt?
What is the minimum information the mapper needs to present clearly: required vs. optional fields, field descriptions / EAD3 element names, multi-column-to-one-field mappings (e.g., two date columns mapping to <unitdate normal="from/to">)?

6. GitHub Pages deployment

What are the practical constraints of deploying a SheetJS + xmlbuilder2 application on GitHub Pages (ES modules vs. bundled, CDN vs. vendored dependencies, CORS, file size limits)?
Is a build step (Vite, esbuild, Parcel) recommended, or can this be built as a no-bundle vanilla JS application and still be maintainable?

Requested output format: Organized by the four challenge areas (parsing, XML generation, hierarchy, validation), with concrete code patterns or pseudocode for the non-obvious algorithms, API references with version numbers, notes on known pitfalls, and a brief recommendation on whether the spec's proposed tech stack (SheetJS + xmlbuilder2, no framework) holds up under scrutiny or whether any substitutions are warranted.
