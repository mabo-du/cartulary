# **Architectural Blueprint and Implementation Strategies for Client-Side EAD3 Generation**

The transition of archival description tools from server-dependent monolithic architectures to lightweight, client-side web applications represents a significant operational leap in data privacy, scalability, and accessibility. The Cartulary project, operating entirely within the browser and deployed via GitHub Pages, epitomizes this paradigm shift. By parsing legacy tabular spreadsheets and emitting fully compliant Encoded Archival Description version 3 (EAD3) XML without any backend processing, the application relies heavily on the local computational capabilities of modern browser engines.  
This exhaustive research report delivers an architectural analysis of the proposed technology stack—specifically JavaScript/TypeScript, SheetJS, and xmlbuilder2. It provides granular implementation guidance, algorithmic strategies, and architectural blueprints for resolving the four core technical challenges: spreadsheet parsing, namespace-aware XML generation, topological hierarchy tree construction from flat data, and in-browser schema validation.

## **1\. Browser-Based Spreadsheet Parsing with SheetJS**

The ingestion of flat, tabular data from archival spreadsheets presents immediate technical challenges regarding memory management, character encoding, and structural irregularities such as merged cells. SheetJS provides the necessary low-level primitives to decode these binary formats in the browser. However, these APIs must be orchestrated with extreme care to avoid locking the browser's main execution thread, which would otherwise result in catastrophic user interface freezing during the processing of large finding aids.

### **Loading Strategy and Memory Management**

For client-side drag-and-drop or file-input events, the modern architectural approach avoids the deprecated, callback-heavy FileReader API in favor of the Promise-based Blob.arrayBuffer() method.1 When an archivist drops an .xlsx or .csv file into the designated drop zone, the event payload exposes a File object. The correct sequence of operations to mutate this binary blob into a usable array of JavaScript objects involves creating a typed array to prevent heap memory overflows during the binary decoding phase.  
The optimal instantiation sequence is to await the array buffer, pass it to the XLSX.read method with the type explicitly declared as array, and subsequently utilize XLSX.utils.sheet\_to\_json to extract the tabular data.1  
However, to optimize for the stringent memory constraints inherent in browser environments processing large archival finding aids—which may contain tens of thousands of rows—unnecessary parsing overhead must be aggressively disabled. By default, SheetJS attempts to calculate cell formulas, generate HTML representations of rich text, and compute number formats.2 By explicitly setting cellFormula: false, cellHTML: false, and cellStyles: false in the read options, memory consumption and CPU cycling are drastically reduced.2

TypeScript  
import \* as XLSX from 'xlsx';

/\*\*  
 \* Parses a dropped File object into a JSON array, optimizing for memory.  
 \*/  
async function parseSpreadsheet(file: File): Promise\<any\> {  
    // 1\. Extract the binary string as an ArrayBuffer  
    const arrayBuffer \= await file.arrayBuffer();  
      
    // 2\. Convert to a Uint8Array for safe binary processing  
    const data \= new Uint8Array(arrayBuffer);  
      
    // 3\. Read the workbook, disabling expensive UI/formula parsing operations  
    const workbook \= XLSX.read(data, {   
        type: "array",  
        cellFormula: false,  
        cellHTML: false,  
        cellStyles: false,  
        cellNF: false   
    });  
      
    // 4\. Extract the first sheet  
    const firstSheetName \= workbook.SheetNames;  
    const worksheet \= workbook.Sheets;  
      
    // 5\. Pre-process merged cells (see algorithm below) before JSON conversion  
    normalizeMergedCells(worksheet);  
      
    // 6\. Convert to an array of objects  
    return XLSX.utils.sheet\_to\_json(worksheet, { defval: "" });  
}

### **Character Encoding Resilience**

Archival metadata is frequently exported from legacy database systems (such as older instances of FileMaker Pro or Microsoft Access) and saved using region-specific encodings rather than the modern standard UTF-8. Processing files encoded in Windows-1252, MacRoman, or ISO-8859-1 without explicit codepage handling will result in catastrophic character mangling (e.g., smart quotes, em dashes, and diacritics replaced by replacement characters or mojibake).3  
SheetJS handles this legacy encoding via a supplementary codepage registry known as js-codepage.4 In a browser environment, this requires injecting the cpexcel.full.mjs library and registering it with the core engine utilizing the set\_cptable method.6  
Furthermore, for raw CSV parsing, SheetJS relies on the Byte Order Mark (BOM) to detect UTF-8 encodings natively.9 If a legacy system exports a BOM-less CSV containing special archival characters, the parsing engine defaults to the local system codepage, leading to data corruption.9 To mitigate this failure mode, the implementation should feature an encoding fallback mechanism. When an archivist uploads a CSV, Cartulary should pre-process the raw text buffer, programmatically injecting the \\ufeff (UTF-8 BOM) character sequence at the zero-index of the string before passing it to SheetJS.9

### **Normalizing Merged Cell Hierarchies**

A pervasive and highly problematic anti-pattern in archival spreadsheets is the use of merged cells to imply hierarchical relationships visually. For example, a single cell spanning rows 2 through 15 might contain the text "Series I", with various sub-components listed in adjacent columns. When SheetJS executes the sheet\_to\_json conversion, it does not automatically extrapolate the value of a merged region to all underlying cells. Instead, only the top-left coordinate of the merged region receives the text value, leaving the subsequent rows with null or undefined for that specific column.11  
To prevent structural data corruption, a normalization algorithm must traverse the ws\['\!merges'\] array prior to JSON conversion.11 The \!merges object contains an array of range boundaries defined by start (s) and end (e) coordinates, containing column (c) and row (r) indices (e.g., s: { r: 1, c: 0 }, e: { r: 4, c: 0 } indicates a vertical merge from row 2 to 5 in column A).12  
A robust algorithmic strategy for handling merged regions safely involves unmerging the coordinates and filling down the top-left value into all constituent cells.

TypeScript  
/\*\*  
 \* Mutates a SheetJS worksheet to unmerge cells and copy the origin value   
 \* to all cells within the merge bounds.  
 \*/  
function normalizeMergedCells(worksheet: XLSX.WorkSheet): void {  
    if (\!worksheet\['\!merges'\]) return;

    // Iterate backwards to allow safe modification of the merges array  
    for (let i \= worksheet\['\!merges'\].length \- 1; i \>= 0; i--) {  
        const range \= worksheet\['\!merges'\]\[i\];  
          
        // 1\. Extract the value from the top-left origin coordinate  
        const originAddress \= XLSX.utils.encode\_cell({ r: range.s.r, c: range.s.c });  
        const originCell \= worksheet\[originAddress\];  
          
        if (\!originCell) continue;

        // 2\. Iterate through the entire bounding box  
        for (let R \= range.s.r; R \<= range.e.r; R++) {  
            for (let C \= range.s.c; C \<= range.e.c; C++) {  
                // Skip the origin cell as it already holds the data  
                if (R \=== range.s.r && C \=== range.s.c) continue;

                // 3\. Clone the cell data into the empty coordinate  
                const targetAddress \= XLSX.utils.encode\_cell({ r: R, c: C });  
                worksheet\[targetAddress\] \= {...originCell };  
            }  
        }  
    }  
      
    // 4\. Delete the\!merges array to signify normalization is complete  
    delete worksheet\['\!merges'\];  
}

### **Lightweight Previews for Column Mapping**

Before committing to a full data extraction and column mapping process, the Cartulary application must render a preview of the tabular data to orient the archivist. Parsing and rendering a massive HTML DOM table of a 50,000-row document will instantly overwhelm the browser's rendering engine and cause the tab to crash.  
The lightest-weight mechanism to extract the first ![][image1] rows relies on overriding the parsing boundaries using the range option within the sheet\_to\_json utility.15 By decoding the worksheet's native extent via XLSX.utils.decode\_range(ws\["\!ref"\]), the application can identify the true boundaries of the data.17 The ending row index (e.r) can then be artificially clamped to a predetermined preview limit (e.g., 25 rows). Re-encoding this bounded range via XLSX.utils.encode\_range and passing it to the JSON converter ensures that only a superficial slice of the dataset is processed and retained in active memory for the UI layer.17

TypeScript  
/\*\*  
 \* Extracts a lightweight preview of the first N rows for the mapping UI.  
 \*/  
function getPreviewSlice(worksheet: XLSX.WorkSheet, rowLimit: number \= 25): any {  
    if (\!worksheet\["\!ref"\]) return;  
      
    // Decode the absolute boundaries of the sheet  
    const range \= XLSX.utils.decode\_range(worksheet\["\!ref"\]);  
      
    // Clamp the ending row to the specified limit  
    range.e.r \= Math.min(range.e.r, range.s.r \+ rowLimit \- 1);  
      
    // Re-encode and extract JSON using the constrained range  
    const boundedRangeStr \= XLSX.utils.encode\_range(range);  
    return XLSX.utils.sheet\_to\_json(worksheet, { range: boundedRangeStr });  
}

### **Addressing Large Dataset Edge Cases**

When dealing with massive archival finding aids (hundreds of thousands of rows), there are known SheetJS edge cases that could cause severe performance degradation. While the cellHTML: false flag removes immediate object bloat, the resulting array of objects from sheet\_to\_json can still consume hundreds of megabytes of RAM.  
If the application begins to encounter RangeError: Maximum call stack size exceeded or V8 heap limits, the architectural solution is to move the SheetJS parsing logic entirely into a Web Worker.18 By serializing the File object as an ArrayBuffer and transferring ownership to a background Web Worker, the parsing and JSON generation occurs asynchronously. The Worker can then chunk the resulting array into smaller segments (e.g., 5,000 rows per postMessage) and stream them back to the main thread, maintaining a fluid 60FPS user interface during the ingestion phase.18

## **2\. Namespace-Aware EAD3 Generation with xmlbuilder2**

The Encoded Archival Description version 3 (EAD3) standard strictly enforces schema validation via complex XML namespaces. Generating compliant EAD3 in the browser requires an XML builder capable of nuanced namespace management without resorting to heavy string-concatenation anti-patterns. While the browser's native DOMParser and XMLSerializer APIs offer baseline functionality, their implementation is exceptionally verbose and prone to cross-browser inconsistencies. The xmlbuilder2 library presents a highly viable, chainable abstraction, provided its namespace inheritance idiosyncrasies are thoroughly managed.

### **EAD3 Root Declaration and Namespaces**

A well-formed EAD3 document requires a root \<ead\> element that binds the default namespace, the XML Schema Instance (XSI) namespace, and the schema location. xmlbuilder2 facilitates this via namespace attribute injection upon document initialization.20  
To achieve this, the builder must be instantiated and chained to append standard DOM attributes. The default namespace (xmlns="http://ead3.archivists.org/schema/") applies to all child elements. Additionally, xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" allows the document to reference the external EAD3 XSD for downstream validation logic. Finally, xsi:schemaLocation maps the default namespace to the physical location of the schema.20  
Regarding the XML processing instruction (the standard \<?xml version="1.0" encoding="UTF-8"?\> prologue), xmlbuilder2 inherently generates this string during the serialization phase when calling .end(), provided the headless option remains configured to its default state of false.21

TypeScript  
import { create } from 'xmlbuilder2';

// Standard EAD3 Namespace URIs  
const EAD3\_NS \= "http://ead3.archivists.org/schema/";  
const XSI\_NS \= "http://www.w3.org/2001/XMLSchema-instance";  
const SCHEMA\_LOCATION \= "http://ead3.archivists.org/schema/ http://www.loc.gov/ead/ead3.xsd";

// Initialize the document with a global default namespace configuration  
const doc \= create({ version: '1.0', encoding: 'UTF-8', defaultNamespace: { ele: EAD3\_NS } })  
   .ele(EAD3\_NS, 'ead')  
   .att(XSI\_NS, 'xsi:schemaLocation', SCHEMA\_LOCATION);

// Subsequent elements inherit the default namespace correctly  
doc.ele('control').ele('recordid').txt('unique-id-123').up().up();

### **Combating Empty Namespace Inheritance**

A critical and widely documented edge case within xmlbuilder2 pertains to the suppression of namespace inheritance.22 By design, xmlbuilder2 explicitly prevents child nodes from implicitly inheriting the parent's default namespace unless explicitly instructed otherwise. If a developer declares the EAD3 namespace solely via the .att() method on the root \<ead\> element, all subsequently appended child elements (such as \<control\> or \<archdesc\>) will be serialized with a neutralizing empty namespace declaration (xmlns="") to reset the document scope.23  
This behavior will immediately invalidate the resulting EAD3 document, as the standard requires all structural components to reside within the primary EAD3 namespace boundary. To circumvent this bug and enforce inheritance, the implementation must employ the builder's defaultNamespace configuration object during the create() phase (as demonstrated in the code block above). Setting defaultNamespace: { ele: EAD3\_NS } ensures that every subsequent node generated under that builder instance implicitly binds to the specified URI without rendering spurious xmlns="" artifacts.20

### **Serialization and Formatting Options**

The resulting XML output must be highly readable for archivists who routinely debug finding aids in raw text editors. The .end() method of xmlbuilder2 handles complex serialization natively.21 By providing a configuration object passing prettyPrint: true, the document structure is evaluated hierarchically.  
The indent property can be customized (typically two space characters), and the newline property enforces POSIX-compliant line breaks (\\n), yielding a human-readable representation ideal for direct inspection.21

| Option | Configuration | Architectural Purpose |
| :---- | :---- | :---- |
| prettyPrint | true | Evaluates the AST to insert line breaks and indentation. |
| headless | false | Instructs the builder to output the \<?xml...?\> declaration header. |
| indent | " " (two spaces) | Standardizes the visual hierarchy depth for human readers. |
| allowEmptyTags | true | Allows generation of \<element/\> instead of \<element\>\</element\> for empty nodes, reducing overall file size.24 |

### **Viability Assessment of xmlbuilder2**

Under rigorous architectural scrutiny, xmlbuilder2 remains an exceptionally strong choice for client-side EAD3 generation in 2025\. While there are leaner alternatives like xml-js or fast-xml-parser, the strict requirements of EAD3's namespace architecture demand an engine that treats XML nodes as interconnected Document Object Model (DOM) entities rather than superficial string arrays.25  
Libraries like xml-js rely on highly convoluted JSON-to-XML mapping structures that make programmatic traversal and dynamic element injection incredibly difficult. The minor bundle size penalty of xmlbuilder2 is entirely offset by its fluent API, the mitigation of XML injection vulnerabilities (via automatic text escaping), and the mathematical guarantee of structurally sound tag closure.

## **3\. Topological Hierarchy Construction from Flat Data**

EAD3 is profoundly hierarchical, relying on recursively nested \<c\> (component) elements to express the archival intellectual arrangement (e.g., Collection ![][image2] Series ![][image2] Subseries ![][image2] File ![][image2] Item). Conversely, tabular data from Excel is strictly two-dimensional. Converting an array of normalized rows into a multi-level N-ary tree is the most algorithmically complex requirement of the Cartulary project.  
Archivists express this hierarchy using three primary methodologies in spreadsheets. The application must support robust algorithms to detect and transform each topological variation into a unified internal state.

### **The Standardized Internal Representation**

Before algorithmic parsing occurs, the application must map the flat JSON rows to a standardized internal TreeNode interface. This allows the serialization engine to process the tree uniformly, regardless of which methodology was used to construct it.

TypeScript  
interface EADNode {  
    id: string;  
    originalRowIndex: number;  
    metadata: Record\<string, any\>; // Stores title, dates, physdesc, etc.  
    children: EADNode;  
}

### **Algorithm 1: The Level Column (Inferred Sequence)**

In this methodology, the spreadsheet features a "Level" column containing standardized string designations (e.g., "series", "file", "item"). The hierarchy is purely inferential, based entirely on the row's vertical position relative to preceding rows. A row is always deemed the child of the most recently encountered row that possesses a higher taxonomic rank.  
**Data Structure & Algorithm:**  
This approach necessitates a taxonomy ranking map (e.g., collection: 1, series: 2, subseries: 3, file: 4, item: 5\) and an execution stack tracking the active hierarchy path. As the parser iterates through the array sequentially, it evaluates the numerical rank of the current row against the rank of the node currently residing at the top of the stack.  
If the current row's rank is deeper (numerically higher), it is appended to the top stack node's children array and simultaneously pushed onto the stack, becoming the new active parent. If the current row is equal to or shallower than the stack's top node, the algorithm continuously pops nodes off the stack until it exposes a node with a strictly shallower rank. The current row is then appended to that node and pushed to the stack.

TypeScript  
function buildTreeFromLevels(rows: any, levelMap: Record\<string, number\>): EADNode {  
    const rootNodes: EADNode \=;  
    const stack: { node: EADNode; rank: number } \=;

    rows.forEach((row, index) \=\> {  
        const rank \= levelMap\[row.level.toLowerCase()\];  
        const newNode: EADNode \= { id: row.id, originalRowIndex: index, metadata: row, children: };

        // Pop the stack until we find a parent with a shallower rank (smaller number)  
        while (stack.length \> 0 && stack\[stack.length \- 1\].rank \>= rank) {  
            stack.pop();  
        }

        if (stack.length \=== 0) {  
            rootNodes.push(newNode);  
        } else {  
            stack\[stack.length \- 1\].node.children.push(newNode);  
        }

        stack.push({ node: newNode, rank });  
    });

    return rootNodes;  
}

**Edge Cases:**  
This method is highly vulnerable to taxonomy gaps. If an archivist accidentally skips a required level (e.g., jumping directly from a "series" to an "item", bypassing "file"), the algorithm will still append the item to the series. The application must feature validation logic that calculates the delta between the parent's taxonomic rank and the child's taxonomic rank. If the delta exceeds ![][image3], the system should flag the row with a warning, indicating a potentially broken or orphaned context.

### **Algorithm 2: Dotted Component IDs (Path Inference)**

Archivists frequently utilize dotted string notation (e.g., 1, 1.1, 1.1.2, 1.2) to express lineage explicitly.26 The structural tree can be mathematically derived via string manipulation of these identifiers.  
**Data Structure & Algorithm:**  
This methodology is optimally handled using a flat array combined with an index Hash Map for ![][image4] lookups. During a single iteration pass, the algorithm evaluates the ID string. The parent ID is calculated by splitting the string on the delimiter (.), popping the final segment, and rejoining the remainder. The algorithm queries the Hash Map for this parent ID. If found, the current row is injected into the parent's children array. Finally, the current row is inserted into the Hash Map using its own ID as the key to facilitate future child bindings.

TypeScript  
function buildTreeFromDottedIDs(rows: any): EADNode {  
    const rootNodes: EADNode \=;  
    const nodeMap \= new Map\<string, EADNode\>();

    rows.forEach((row, index) \=\> {  
        const id \= String(row.id);  
        const newNode: EADNode \= { id, originalRowIndex: index, metadata: row, children: };  
          
        nodeMap.set(id, newNode);

        // Calculate parent ID (e.g., "1.1.2" \-\> "1.1")  
        const lastDotIndex \= id.lastIndexOf('.');  
        if (lastDotIndex \=== \-1) {  
            // No dot found, this is a root node  
            rootNodes.push(newNode);  
        } else {  
            const parentId \= id.substring(0, lastDotIndex);  
            const parentNode \= nodeMap.get(parentId);  
              
            if (parentNode) {  
                parentNode.children.push(newNode);  
            } else {  
                // Orphan detection: Parent ID does not exist in the map  
                throw new Error(\`Orphaned row at index ${index}: Parent ${parentId} not found.\`);  
            }  
        }  
    });

    return rootNodes;  
}

**Edge Cases:**  
This method introduces a severe risk of orphan nodes and structural fractures. If row 1.1.2 is processed, but 1.1 does not exist in the Hash Map (due to user error or unsorted spreadsheet data), the node is immediately orphaned. Because this algorithm relies on sequential processing, the raw spreadsheet data must ideally be pre-sorted lexicographically based on the dotted IDs to guarantee that parents are generated and cached in the Hash Map *before* their children are encountered.

### **Algorithm 3: Explicit parent\_id References (Adjacency List)**

The most robust—but least human-readable—approach utilizes two distinct columns: a unique id and a parent\_id. Each row explicitly points to its exact progenitor, forming a classic relational adjacency list.  
**Data Structure & Algorithm:**  
Similar to the dotted notation, a Hash Map is utilized to store object references. However, because child rows may appear in the spreadsheet *before* their parent rows, a single-pass creation approach fails. The optimal algorithm requires two passes.

* **Pass 1:** Initializes every row as an independent tree node and maps it to the Hash Map using its id.  
* **Pass 2:** Iterates through the instantiated nodes, extracts the parent\_id, and appends the current node to the corresponding parent's children array located within the Hash Map. Nodes lacking a parent\_id are designated as absolute root nodes.

**Edge Cases and Cycle Detection:** This method is highly susceptible to cyclical dependencies (e.g., Node A declares Node B as its parent, and Node B declares Node A as its parent).27 A cycle detection mechanism must be employed prior to XML tree serialization. This is achieved by executing a recursive Depth-First Search (DFS) that utilizes a visited Set and a recursionStack Set. If the traversal encounters a node currently present in the active recursion stack, a circular reference is flagged, and the specific row is highlighted in the UI.

### **Assessing External Libraries vs. Custom Algorithms**

Libraries such as d3-hierarchy specifically offer a d3.stratify() method capable of automatically executing the Adjacency List algorithm to transform flat arrays into hierarchical trees.28  
However, under architectural review, d3.stratify enforces highly stringent topological validity.29 If the data contains an orphan node, a duplicate ID, or a cycle, the library throws an unhandled exception (Error: no root or Error: missing: id) and immediately aborts the calculation.29  
For a client-side data ingestion tool, ungraceful failures present a terrible user experience. A custom tree-building algorithm—as outlined above—is vastly superior for Cartulary. Implementing the logic from scratch allows the execution to collect all topological errors (logging them to an array with specific spreadsheet \_\_rowNum\_\_ references) rather than failing catastrophically on the first discrepancy. This empowers the UI to present a comprehensive error report to the user.

### **Tree Serialization Traversal Order**

Once the N-ary tree is constructed successfully in memory, it must be traversed to generate the hierarchical EAD3 XML. The strictly required traversal protocol is **Depth-First Pre-Order**.  
EAD3 components are expressed via structural containment. An \<archdesc\> contains a \<c\> element, which itself contains its own \<did\> block (holding the title and dates), followed directly by its own nested \<c\> elements.32  
In a Pre-Order traversal, the operation interacts with the current node *before* interacting with its descendants. The xmlbuilder2 engine must first open the \<c\> tag, immediately generate the descriptive metadata elements (\<did\>, \<unittitle\>, \<unitdate\>) for that node, and only then iterate through the node's children array to execute recursive calls on the descendants.32 Once the recursive child stack returns, the builder closes the \<c\> tag. Any other traversal methodology (such as Post-Order or Breadth-First) would fatally disrupt the XML containment constraints required by the EAD3 specification.

| Traversal Strategy | XML Tag Generation Sequence | EAD3 Compliance |
| :---- | :---- | :---- |
| **Depth-First Pre-Order** | Open parent ![][image2] Write parent metadata ![][image2] Process children ![][image2] Close parent | **Compliant:** Ensures children are structurally nested deeply within the parent \<c\> component wrapper. |
| **Depth-First Post-Order** | Process children ![][image2] Open parent ![][image2] Write parent metadata ![][image2] Close parent | **Invalid:** Children are printed sequentially before the parent container exists in the XML structure. |
| **Breadth-First (Level)** | Open all Level 1 nodes ![][image2] Close all Level 1 nodes ![][image2] Open Level 2 nodes | **Invalid:** Results in flat, sequential components rather than a functionally nested hierarchy. |

## **4\. In-Browser Validation Strategies**

Validation is paramount for archival metadata interoperability. Aggregation systems and discovery platforms routinely reject finding aids that violate the underlying schema.34 Performing validation entirely within the browser circumvents the need for server-side infrastructure but presents a critical architectural fork: full XML Schema Definition (XSD) compilation via WebAssembly (WASM) versus an aggressive heuristic rule-based engine.

### **Feasibility of In-Browser XSD Validation (WASM)**

Traditional XSD validation algorithms are written in heavily optimized C/C++ (most notably the libxml2 library). Pure JavaScript implementations are notoriously incomplete or wildly unperformant, often lacking support for XSD 1.1 or failing on complex nested structures.35  
However, modern browser runtimes support WebAssembly. The xmllint-wasm and libxml2-wasm packages represent Emscripten-compiled ports of the libxml2 engine designed specifically for Node.js and browser environments.37  
This capability comes with significant operational trade-offs:

1. **Bundle Size Bloat:** The precompiled WASM binaries approximate 800KB to 1MB in raw bundle size.38  
2. **Main-Thread Blocking:** Downloading, compiling, and instantiating the WASM runtime requires heavy V8 engine CPU utilization. Attempting to parse and validate a multi-megabyte EAD3 finding aid synchronously via xmllint-wasm on the main JavaScript thread will result in immediate browser UI freezes and "page unresponsive" warnings.19  
3. **Web Worker Complexity:** If WASM is selected, the engine must be isolated within a dedicated Web Worker context. The main thread must serialize the EAD3 XML string, pass it to the Web Worker via postMessage(), and await an asynchronous validation callback.

While memory limits in V8 (restricting string sizes to approximately 512MB 19) rarely impact typical finding aids, the complexity of orchestrating asynchronous WASM bridges, managing memory pages, and hosting all dependent XSD files locally on GitHub Pages represents a massive developmental burden. (Note: Alternatives like Saxon-JS excel at XSLT transformation but do not natively support XSD validation in the browser, rendering them unviable for this specific use case 42).

### **The Case for a Curated Rule-Based Validator**

Given the scope and architectural goals of the Cartulary tool, investing heavily in WASM orchestration may yield diminishing returns. The reality of archival metadata is that most validation failures produced by archivists are not deeply esoteric XSD violations; rather, they are high-level content logic errors stemming from manual data entry mistakes.45  
A highly tuned, rule-based heuristic validator executed against the parsed JSON array *before* XML generation catches the vast majority of real-world errors instantly, without the massive CPU overhead of XML serialization and WASM processing.  
A comprehensive client-side rule-set tailored for EAD3 must evaluate the following critical heuristics:

* **The Structural Context Rule:** EAD3 strictly dictates that the \<unittitle\> and \<unitid\> elements must reside inside the \<did\> (Descriptive Identification) wrapper.48 The validator must ensure every hierarchical node has populated the minimum data fields required to spawn a valid \<did\> component.  
* **The Quantification Rule:** Unlike EAD 2002, EAD3 enforces a strict structural coupling within the \<physdescstructured\> elements. If an archivist provides a string value for \<unittype\> (e.g., "boxes" or "linear feet"), there must be a corresponding numeric value provided for \<quantity\>.33 The validator must scan the JSON array and flag any asymmetric physical description inputs.  
* **The Topological Integrity Rule:** The rule engine must traverse the Hash Map to identify duplicated unique \<unitid\> identifiers across the document, flag orphaned rows that point to non-existent parent elements, and execute the cycle detection DFS algorithm.27  
* **The Chronological Standardization Rule:** Malformed date strings routinely break archival aggregators. EAD3 requires the normal attribute of the \<unitdate\> element to conform strictly to ISO 8601 formatting (e.g., 1936/1939 for inclusive ranges, or 1977-07-16 for exact dates).49 A Regular Expression heuristic must parse all mapped date columns to ensure standard conformance before the XML string is ever generated.

### **Error Reporting UX Design**

When a validation engine identifies a violation, providing an esoteric XPath error (e.g., Error at /ead/archdesc/dsc/c/did: missing required attribute) to the user is deeply counterproductive. The UX paradigm must map the error directly back to the spatial coordinates of the originally uploaded spreadsheet.45  
This is achieved by appending an internal \_\_rowNum\_\_ property to every object array generated by SheetJS during the initial parsing phase. When the rule validator processes the JSON objects, any triggered error captures this integer. The resulting UI renders an actionable alert stating: "Row 142: Invalid ISO 8601 date range provided. Expected format YYYY/YYYY." This paradigm, heavily utilized by enterprise tools like Flatfile, enables the archivist to locate the discrepancy in their native Excel file immediately, fix the error, and re-upload the document seamlessly.45

## **5\. Column Mapping UI Architecture**

A robust ETL (Extract, Transform, Load) mapping interface bridges the critical gap between disparate legacy spreadsheet headers and the rigidly defined EAD3 XML schema. Open-source platforms in the data onboarding space, such as react-csv-importer, rely on a distinctly phased visual pipeline: File Ingestion ![][image2] Column Mapping ![][image2] Data Validation ![][image2] Output Generation.45  
For Cartulary, the column mapping UI must adhere to established cognitive patterns that reduce decision fatigue for the user.

### **Field Presentation and Metadata Constraints**

The mapping interface must cleanly bifurcate the target EAD3 schema fields into "Required" and "Optional" categories. Core architectural elements—such as Component ID, Level, Title (\<unittitle\>), and Dates (\<unitdate\>)—must be heavily accented visually to prevent the user from advancing a mapped schema that is doomed to fail structural validation.  
Each target field should provide an unobtrusive but easily accessible tooltip containing the exact EAD3 element name and a brief description of its function. Archivists are highly familiar with XML tag nomenclature; hiding the exact tags behind generic, non-technical labels (e.g., using "Name" instead of \<persname\>) often causes workflow confusion rather than clarity.47

### **Handling Composite Mappings**

One-to-one column mappings (e.g., mapping a spreadsheet "Description" column to the EAD3 \<scopecontent\> field) are easily resolved using simple HTML \<select\> dropdowns associated with each detected column header.32  
However, archival finding aids frequently utilize composite fields. The most complex scenario involves chronology. An archivist might use three distinct spreadsheet columns: "Start Date", "End Date", and "Date Expression" (e.g., "Circa 1920s"). EAD3 handles this by placing the human-readable "Date Expression" inside the \<unitdate\> text node, while using the "Start Date" and "End Date" to mathematically generate the ISO 8601 normal attribute.51  
The UI architecture must support multi-column-to-one-field mappings. This is typically achieved by treating the target EAD3 schema fields as the static anchor points of the UI (arranged vertically), and presenting the uploaded spreadsheet columns as draggable objects, or multi-select dropdown pills, that can be stacked onto a single target schema constraint. If multiple date columns are assigned to the \<unitdate\> block by the archivist, the underlying state logic combines them securely during the XML serialization step.

## **6\. GitHub Pages Deployment and Build Pipelines**

Deploying a complex client-side application utilizing NPM dependencies like SheetJS and xmlbuilder2 onto GitHub Pages introduces specific infrastructural constraints. GitHub Pages exclusively serves static assets and does not permit server-side compilation, backend Node.js execution, or dynamic routing.54

### **The Necessity of a Build Step**

Attempting to construct Cartulary as a vanilla JS, no-bundle application directly importing libraries via \<script type="module"\> from unpkg or esm.sh is highly discouraged for an application of this scale. While modern browsers fully support ES Modules, libraries like xmlbuilder2 contain hundreds of interconnected internal sub-modules. Forcing the browser to negotiate hundreds of individual HTTP requests for these micro-files sequentially will cause extreme performance degradation on initial load.  
A dedicated build tool—specifically **Vite**—is the modern standard for this exact use case.54 Vite operates using instantaneous hot-module replacement during local development and leverages highly optimized Rollup algorithms to bundle the JavaScript, deduplicate overlapping dependencies, and minify the output for production deployment.54 The build pipeline coalesces the disparate libraries into a few highly optimized chunks, dramatically accelerating client-side loading times and reducing the risk of CORS issues from third-party CDNs.

### **Configuring Vite for GitHub Pages Subdirectories**

A prevalent architectural failure point when deploying Vite applications to GitHub Pages involves absolute versus relative routing.54 By default, GitHub Pages hosts user projects under a specific subdirectory format: https://\[username\].github.io/\[repo-name\]/.  
If Vite generates the production build assuming the application lives at the absolute root domain (/), all pathing for CSS, JavaScript chunks, and static asset files will return 404 Not Found HTTP errors in production. This constraint is mitigated by explicitly configuring the base path within the vite.config.ts file.

TypeScript  
// vite.config.ts  
import { defineConfig } from 'vite';

export default defineConfig({  
  // Must match the exact GitHub repository name  
  base: '/cartulary-app/',   
  build: {  
    outDir: 'dist',  
    emptyOutDir: true,  
  }  
});

The base property must be strictly defined as /\[repo-name\]/.54 During the build phase, Vite automatically prepends this path string to all dynamically injected asset tags within the compiled index.html file, guaranteeing correct resolution on the GitHub servers. If the architecture ultimately incorporates WebAssembly (such as xmllint-wasm), Vite also requires additional configuration to correctly parse .wasm files as static assets and apply the correct application/wasm MIME type headers upon deployment, as failure to do so will result in the WASM engine failing to compile in the browser environment.

### **CI/CD Workflow Automation**

The deployment logic is cleanly abstracted using GitHub Actions.54 By establishing a .github/workflows/deploy.yml YAML pipeline, the repository is configured to monitor the main branch. Upon pushing code, the GitHub runner provisions an ephemeral Node.js environment, executes npm install, runs the Vite build command (npm run build), and seamlessly deploys the resulting /dist folder directly to the gh-pages branch.54 This ensures the deployed architecture remains completely synchronized with the source code repository without requiring manual, error-prone FTP intervention.

## **7\. Architectural Verdict and Recommendations**

The proposed technology stack—vanilla TypeScript orchestrated with SheetJS and xmlbuilder2, bound together by Vite—exhibits remarkable programmatic resilience and is highly optimal for the Cartulary project vision.  
SheetJS remains the undisputed industry standard for client-side decoding of legacy Excel binaries, excelling precisely where modern archivists require support: parsing raw array buffers, handling legacy non-UTF-8 codepages, and programmatically resolving merged hierarchy regions without blocking the DOM thread.2  
Similarly, xmlbuilder2 perfectly handles the stringent, unforgiving namespace inheritance protocols mandated by the EAD3 specification, providing the programmatic fidelity necessary to execute pre-order depth-first N-ary tree serialization safely.20  
The primary architectural recommendation is to prioritize a highly tuned, JSON-based heuristic validation engine over the complexity of instantiating WebAssembly-backed XSD parsers.19 By building the taxonomy and cycle-detection algorithms natively in TypeScript, the application retains the ability to map data anomalies precisely back to the original spreadsheet row via the \_\_rowNum\_\_ property. This approach fundamentally empowers the archivist with immediate, actionable feedback without ever leaving the browser environment, successfully fulfilling the mandate of a modern, entirely client-side archival utility.

#### **Works cited**

1. How to read an xlsx file with javascript \- Stack Overflow, accessed June 7, 2026, [https://stackoverflow.com/questions/41092306/how-to-read-an-xlsx-file-with-javascript](https://stackoverflow.com/questions/41092306/how-to-read-an-xlsx-file-with-javascript)  
2. GitHub \- taisukef/sheetjs-es: :green\_book: SheetJS Community Edition \-- Spreadsheet Data Toolkit, accessed June 7, 2026, [https://github.com/taisukef/sheetjs-es](https://github.com/taisukef/sheetjs-es)  
3. accessed June 7, 2026, [https://cdn.jsdelivr.net/npm/pagebusinesscomponent@2.0.135/docs/componenttest\_public\_dist\_xlsx.extendscript.js.html](https://cdn.jsdelivr.net/npm/pagebusinesscomponent@2.0.135/docs/componenttest_public_dist_xlsx.extendscript.js.html)  
4. xlsx \- Yarn 1, accessed June 7, 2026, [https://classic.yarnpkg.com/en/package/xlsx](https://classic.yarnpkg.com/en/package/xlsx)  
5. SheetJS repositories \- GitHub, accessed June 7, 2026, [https://github.com/orgs/SheetJS/repositories](https://github.com/orgs/SheetJS/repositories)  
6. leiDnedyA/sheetjs \- sheetjs \- SheetJS, accessed June 7, 2026, [http://67.205.168.155/leiDnedyA/sheetjs/blame/commit/af421e31618673ae3ab0bd1a2b70e44e557cbc5f/docbits/10\_install.md](http://67.205.168.155/leiDnedyA/sheetjs/blame/commit/af421e31618673ae3ab0bd1a2b70e44e557cbc5f/docbits/10_install.md)  
7. xlsx \- NPM, accessed June 7, 2026, [https://www.npmjs.com/package/xlsx](https://www.npmjs.com/package/xlsx)  
8. NodeJS | SheetJS 中文网, accessed June 7, 2026, [https://xlsx.nodejs.cn/docs/getting-started/installation/nodejs/](https://xlsx.nodejs.cn/docs/getting-started/installation/nodejs/)  
9. How to skip header and keep character encoding when export csv · Issue \#969 \- GitHub, accessed June 7, 2026, [https://github.com/SheetJS/sheetjs/issues/969](https://github.com/SheetJS/sheetjs/issues/969)  
10. Special character issue in Excel for CSV file, Sheetjs prepend BOM for utf8 CSV files, accessed June 7, 2026, [https://stackoverflow.com/questions/64284226/special-character-issue-in-excel-for-csv-file-sheetjs-prepend-bom-for-utf8-csv](https://stackoverflow.com/questions/64284226/special-character-issue-in-excel-for-csv-file-sheetjs-prepend-bom-for-utf8-csv)  
11. sheetjs \- webcomponents.org, accessed June 7, 2026, [https://www.webcomponents.org/element/sheetjs/sheetjs](https://www.webcomponents.org/element/sheetjs/sheetjs)  
12. sheetjs xlsx, How to write merged cells? \- Stack Overflow, accessed June 7, 2026, [https://stackoverflow.com/questions/53516403/sheetjs-xlsx-how-to-write-merged-cells](https://stackoverflow.com/questions/53516403/sheetjs-xlsx-how-to-write-merged-cells)  
13. How to customize my XLSX using TypeScript/Angular? \- Stack Overflow, accessed June 7, 2026, [https://stackoverflow.com/questions/52924966/how-to-customize-my-xlsx-using-typescript-angular](https://stackoverflow.com/questions/52924966/how-to-customize-my-xlsx-using-typescript-angular)  
14. Writing Style information into Excel · Issue \#128 \- GitHub, accessed June 7, 2026, [https://github.com/SheetJS/sheetjs/issues/128?timeline\_page=1](https://github.com/SheetJS/sheetjs/issues/128?timeline_page=1)  
15. How to define a cell range · Issue \#235 \- GitHub, accessed June 7, 2026, [https://github.com/SheetJS/sheetjs/issues/235](https://github.com/SheetJS/sheetjs/issues/235)  
16. XLSX.Utils.sheet\_to\_json Read values only from specified range of columns \#1427 \- GitHub, accessed June 7, 2026, [https://github.com/SheetJS/sheetjs/issues/1427](https://github.com/SheetJS/sheetjs/issues/1427)  
17. Read Range of Rows from sheet · Issue \#2646 \- GitHub, accessed June 7, 2026, [https://github.com/SheetJS/sheetjs/issues/2646](https://github.com/SheetJS/sheetjs/issues/2646)  
18. Merge Multiple Excel Sheets Into One Without Copy-Paste \- SplitForge Blog, accessed June 7, 2026, [https://splitforge.app/blog/merge-excel-sheets-into-one](https://splitforge.app/blog/merge-excel-sheets-into-one)  
19. Validate HUGE xml in browser side using JS \- Stack Overflow, accessed June 7, 2026, [https://stackoverflow.com/questions/50569062/validate-huge-xml-in-browser-side-using-js](https://stackoverflow.com/questions/50569062/validate-huge-xml-in-browser-side-using-js)  
20. Namespaces | xmlbuilder2 \- GitHub Pages, accessed June 7, 2026, [https://oozcitak.github.io/xmlbuilder2/namespaces.html](https://oozcitak.github.io/xmlbuilder2/namespaces.html)  
21. Serialization | xmlbuilder2 \- GitHub Pages, accessed June 7, 2026, [https://oozcitak.github.io/xmlbuilder2/serialization.html](https://oozcitak.github.io/xmlbuilder2/serialization.html)  
22. xmlbuilder2 \- Yarn 1, accessed June 7, 2026, [https://classic.yarnpkg.com/en/package/xmlbuilder2](https://classic.yarnpkg.com/en/package/xmlbuilder2)  
23. When using namespace, empty XMLNs shows up in various child node elements. · Issue \#6 · oozcitak/xmlbuilder2 \- GitHub, accessed June 7, 2026, [https://github.com/oozcitak/xmlbuilder2/issues/6](https://github.com/oozcitak/xmlbuilder2/issues/6)  
24. Builder Functions with Callbacks | xmlbuilder2, accessed June 7, 2026, [https://oozcitak.github.io/xmlbuilder2/builder-functions-with-callbacks.html](https://oozcitak.github.io/xmlbuilder2/builder-functions-with-callbacks.html)  
25. xmlbuilder vs xmlbuilder2 vs xml-js | XML Data Handling: Conversion, Generation, and Streaming \- npm-compare.com, accessed June 7, 2026, [https://npm-compare.com/xml-js,xmlbuilder,xmlbuilder2](https://npm-compare.com/xml-js,xmlbuilder,xmlbuilder2)  
26. Help \- iTOL, accessed June 7, 2026, [https://itol.embl.de/help.cgi](https://itol.embl.de/help.cgi)  
27. Tree of Knowledge / David Kirkby \- Observable Notebooks, accessed June 7, 2026, [https://observablehq.com/@dkirkby/tree-of-knowledge](https://observablehq.com/@dkirkby/tree-of-knowledge)  
28. js/BaseTree.js \- d3-mitch-tree, accessed June 7, 2026, [https://d3-mitch-tree.netlify.app/file/js/BaseTree.js.html](https://d3-mitch-tree.netlify.app/file/js/BaseTree.js.html)  
29. D3 stratify \- Observable Notebooks, accessed June 7, 2026, [https://observablehq.com/@d3/d3-stratify](https://observablehq.com/@d3/d3-stratify)  
30. Hierarchies in D3 / Chris D'Iorio \- Observable Notebooks, accessed June 7, 2026, [https://observablehq.com/@cediorio/working-with-hierarchical-data-and-visualizations-in-d3](https://observablehq.com/@cediorio/working-with-hierarchical-data-and-visualizations-in-d3)  
31. Stratify \> Hierarchy · Issue \#102 · d3/d3-hierarchy \- GitHub, accessed June 7, 2026, [https://github.com/d3/d3-hierarchy/issues/102](https://github.com/d3/d3-hierarchy/issues/102)  
32. EAD3 in Archives Portal Europe, accessed June 7, 2026, [https://www.archivesportaleurope.net/tools/for-content-providers/standards/ead3-in-archives-portal-europe/](https://www.archivesportaleurope.net/tools/for-content-providers/standards/ead3-in-archives-portal-europe/)  
33.   
34. Europeana DSI 2– Access to Digital Resources of European Heritage, accessed June 7, 2026, [https://pro.europeana.eu/files/Europeana\_Professional/Projects/Project\_list/Europeana\_DSI-2/Milestones/ms1.2-technical-infrastructure-maintenance-plan.pdf](https://pro.europeana.eu/files/Europeana_Professional/Projects/Project_list/Europeana_DSI-2/Milestones/ms1.2-technical-infrastructure-maintenance-plan.pdf)  
35. Building a Full XML \+ XSD Validation Engine for Node.js (xml-xsd-engine) \- Medium, accessed June 7, 2026, [https://medium.com/@sundarrajankrishnan/building-a-full-xml-xsd-validation-engine-for-node-js-xml-xsd-engine-62008eda6593](https://medium.com/@sundarrajankrishnan/building-a-full-xml-xsd-validation-engine-for-node-js-xml-xsd-engine-62008eda6593)  
36. Using Node.js I validated the xml schema for xml schemas and it failed. I don't know why, accessed June 7, 2026, [https://stackoverflow.com/questions/63333798/using-node-js-i-validated-the-xml-schema-for-xml-schemas-and-it-failed-i-dont](https://stackoverflow.com/questions/63333798/using-node-js-i-validated-the-xml-schema-for-xml-schemas-and-it-failed-i-dont)  
37. libxml2-wasm \- NPM, accessed June 7, 2026, [https://www.npmjs.com/package/libxml2-wasm](https://www.npmjs.com/package/libxml2-wasm)  
38. noppa/xmllint-wasm: Port of libxml to WebAssembly using Emscripten \- GitHub, accessed June 7, 2026, [https://github.com/noppa/xmllint-wasm](https://github.com/noppa/xmllint-wasm)  
39. xmllint-wasm \- NPM, accessed June 7, 2026, [https://www.npmjs.com/package/xmllint-wasm](https://www.npmjs.com/package/xmllint-wasm)  
40. Can we have a synchronous call · Issue \#10 · noppa/xmllint-wasm \- GitHub, accessed June 7, 2026, [https://github.com/noppa/xmllint-wasm/issues/10](https://github.com/noppa/xmllint-wasm/issues/10)  
41. Return browser support · Issue \#1 · noppa/xmllint-wasm \- GitHub, accessed June 7, 2026, [https://github.com/noppa/xmllint-wasm/issues/1](https://github.com/noppa/xmllint-wasm/issues/1)  
42. An XSD 1.1 Schema Validator Written in XSLT 3.0 \- Saxonica, accessed June 7, 2026, [https://www.saxonica.com/papers/markupuk-2018mhk.pdf](https://www.saxonica.com/papers/markupuk-2018mhk.pdf)  
43. Saxon Product/Feature Matrix \- Saxonica, accessed June 7, 2026, [https://www.saxonica.com/products/feature-matrix-9-7.xml](https://www.saxonica.com/products/feature-matrix-9-7.xml)  
44. How to do schema validation to get missing references with SaxonJS \- Stack Overflow, accessed June 7, 2026, [https://stackoverflow.com/questions/68575216/how-to-do-schema-validation-to-get-missing-references-with-saxonjs](https://stackoverflow.com/questions/68575216/how-to-do-schema-validation-to-get-missing-references-with-saxonjs)  
45. Open-source alternatives to Flatfile \- CSVBox Blog, accessed June 7, 2026, [https://blog.csvbox.io/open-source-flatfile-alternatives/](https://blog.csvbox.io/open-source-flatfile-alternatives/)  
46. View of Semantic Archive Integration for Holocaust Research. The EHRI Research Infrastructure | Umanistica Digitale, accessed June 7, 2026, [https://umanisticadigitale.unibo.it/article/view/9049/8947](https://umanisticadigitale.unibo.it/article/view/9049/8947)  
47. Encoded Archival Standards Surv \- Society of American Archivists, accessed June 7, 2026, [https://www2.archivists.org/sites/all/files/2019-2020%20EAS%20Survey%20Anonymized%20Dataset.xlsx](https://www2.archivists.org/sites/all/files/2019-2020%20EAS%20Survey%20Anonymized%20Dataset.xlsx)  
48. Frequently Asked Questions about EAD and EAD3 | Society of American Archivists, accessed June 7, 2026, [https://www2.archivists.org/groups/encoded-archival-standards-section/frequently-asked-questions-about-ead-and-ead3](https://www2.archivists.org/groups/encoded-archival-standards-section/frequently-asked-questions-about-ead-and-ead3)  
49. Encoded Archival Description Tag Library \- Version EAD3 (EAD Official Site, Library of Congress), accessed June 7, 2026, [https://www.loc.gov/ead/EAD3-TL-eng.html](https://www.loc.gov/ead/EAD3-TL-eng.html)  
50.   
51. Dates in EAD3 \- EADiva, accessed June 7, 2026, [https://eadiva.com/dates-in-ead3/](https://eadiva.com/dates-in-ead3/)  
52. Specification for Expressing Date Statements \- ArchivesSpace, accessed June 7, 2026, [https://archivesspace.org/wp-content/uploads/2016/05/Date-specification-20120404.pdf](https://archivesspace.org/wp-content/uploads/2016/05/Date-specification-20120404.pdf)  
53. The Historical Hazards of Finding Aids \- Scholars Archive, accessed June 7, 2026, [https://scholarsarchive.library.albany.edu/cgi/viewcontent.cgi?article=1125\&context=ulib\_fac\_scholar](https://scholarsarchive.library.albany.edu/cgi/viewcontent.cgi?article=1125&context=ulib_fac_scholar)  
54. Deploying a Static Site \- Vite, accessed June 7, 2026, [https://vite.dev/guide/static-deploy](https://vite.dev/guide/static-deploy)  
55. Deploying Vite Deploying Vite App to GitHub Pages | by Aishwarya Parab \- Medium, accessed June 7, 2026, [https://medium.com/@aishwaryaparab1/deploying-vite-deploying-vite-app-to-github-pages-166fff40ffd3](https://medium.com/@aishwaryaparab1/deploying-vite-deploying-vite-app-to-github-pages-166fff40ffd3)  
56. Deploying Vite to GitHub Pages with a Single GitHub Action \- Savas Labs, accessed June 7, 2026, [https://savaslabs.com/blog/deploying-vite-github-pages-single-github-action/](https://savaslabs.com/blog/deploying-vite-github-pages-single-github-action/)  
57. Deploying Vite project to GitHub Pages ROOT (index) · community · Discussion \#176242, accessed June 7, 2026, [https://github.com/orgs/community/discussions/176242](https://github.com/orgs/community/discussions/176242)  
58. Vite Github Pages Deployer · Actions · GitHub Marketplace, accessed June 7, 2026, [https://github.com/marketplace/actions/vite-github-pages-deployer](https://github.com/marketplace/actions/vite-github-pages-deployer)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAaCAYAAABVX2cEAAAA/UlEQVR4XmNgGJEgHYh3I2FrVGkwQJaHYaxAEYgdgHgaEP8H4jUoshAQCsRngPg3ENcyQNTjBSBDFjNADFRBkwOBDigmCJiA+DUQizBADOtFlQaD/UDsii6IDeQxIGz9yQAxMBghzeDEADGMKLAaiH2gbJhXtyCkGWqAuBGJjxc8B2JBKNuGAWIYcthtZ4C4jiDQAeJzaGKgmAMZ1gnlvwNidoQ0brAUiMPRxLgYIBECMjANiOtRpXGDJ0AsiS7IAIlRkGHHGYhIVyAA8uJVdEEoUGNAhB1RXswH4lnogkgAFKMgw/ACEwaErTCciqICAkCJ+Rq64CgYBaMABgB/tDbheN4WEAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAZCAYAAADe1WXtAAAAcklEQVR4XmNgGAWjgFSwCYg10QUpBfVAXIMuSClQBOLH6ILUAD3oAuhAHogdyMB3gPgWEDsyYAGBQFxLBr4MxP+BeDUQMzNQCYBcaoYuSAnIBGJBdEFKgCgQf0MXpBSsB2J7dEFKgREQs6ELjoJRMJQAAP8HFaTzpgzZAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAbCAYAAABFuB6DAAAAbUlEQVR4Xu2RvRFAYBAFbwh0IFKBJpRDBapRlX81iFTAM+YMG4i/wM5scm+zMwuKVFY8PklkLVfZYrvJ5CYbudtH6OR2hR0HEkDYcyAeDhyIhyMH4uHEgXg4cyAeLhyeRLK0Kzz/Xcj4VfwEyAEzqhy1KVrCgAAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAaCAYAAAAue6XIAAACMElEQVR4Xu2WTYjNURjGX0IxMbEyHxuGWbGgCNM0Mzs2PiYRy9kpoSwooSSzUJLFbGZ2LGaw8FEopWaEjbKRkKkpCpmaUHbieeY9tzn3ce7/npsum/urX9153tP/vHPvOed/zBr8H+bBDbAXri4vJdkDJ+ACLRTQAt/CdVqohWtwEo7CM+ZN7Cgb8SdTsE3DiC0aBPrgO7hSC9XogDfhIdgktV/wtGQllsPDGgYWmde+aCHiqvm82XTBb/CFFgL3zBveqgVwGS7W0Hz8J/gqfK4El8FPuE0LKdbC6WC71ErsN5/wvuRL4VfJlEErbpbcgM80TMEHvYfztRCx2Xwc7YzyB/Bj9HeKnGZXWfUxs7ueg05pQdhpc82uiXIuHW7EInKaJR80ULrNH7RRC8J583E/oow7mNmFKEuR2+y4Bsol+NmKlwB5bD7h0yhbH7KTUZYit9k7GihP4JiGCTjZG/OjqMT2kA9EWYrcZofhMg1jRuBtDQW+wThZv+Q86Jkfl1zJbfa6+R6qCCd6rWHEEvM3GJeLwiOPTZzTgpDb7EMNFL4i+aDUYc/3/F3zempNrzCvXdGCkNvscw1ScM3NmJ+1Z82/qSn4CPbMDUsyBL9rGGCDKY/EgwL8snL+oVl4A9oLj8KDcFN5uSK7rIZJCjhhfnmqKwvNT4m/gZvqJTymhXqwD7ZqWAO7ze8XvGf8E25pkAkb5C9zQAv1pNl8s/Fumws31UWrcrY2aNCgzvwGZZx1gzKs+t0AAAAASUVORK5CYII=>