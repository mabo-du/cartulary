# **Technical Briefing: Encoded Archival Description Version 3 (EAD3) and Repository Import Profiles**

## **Encoded Archival Description Version 3 (EAD3) Schema Fundamentals**

The transition from Encoded Archival Description (EAD) 2002 to EAD3 represents a profound ontological and structural shift in the standardization of archival metadata. Developed by the Society of American Archivists (SAA) Technical Subcommittee for Encoded Archival Description (TS-EAD) and released in 2015, EAD3 was explicitly engineered to resolve the conceptual ambiguities of its predecessor. EAD 2002 frequently conflated presentation-driven markup—heavily influenced by early HTML conventions—with data-centric structural metadata. EAD3 fundamentally realigns archival description with the principles of Linked Open Data (LOD) and semantic interoperability, ensuring tighter integration with related metadata transmission standards such as Encoded Archival Context for Corporate Bodies, Persons, and Families (EAC-CPF).1 For developers engineering client-side transformation utilities, constructing a mathematically valid EAD3 document requires rigorous adherence to the revised Extensible Markup Language (XML) Schema Definition (XSD), exacting namespace declarations, and a highly restrictive hierarchical nesting protocol.

### **XML Declaration and Namespace Requirements**

The root \<ead\> element serves as the absolute container for the entire archival document.3 Institutional repositories rely on deterministic, heavily typed XML parsers; consequently, incorrect, deprecated, or malformed namespace declarations result in immediate validation failures or, more insidiously, silent import rejections where a system accepts a file but drops core descriptive payloads.5  
To produce a valid EAD3 document compliant with the official Library of Congress (LoC) schema, the exact namespace block must define the default namespace, the XML Schema Instance (XSI) namespace, and the physical location of the XSD file.3 The authoritative and required declaration must be structured precisely as follows:

XML  
\<?xml version="1.0" encoding="UTF-8"?\>  
\<ead xmlns\="http://ead3.archivists.org/schema/"  
     xmlns:xsi\="http://www.w3.org/2001/XMLSchema-instance"  
     xsi:schemaLocation\="http://ead3.archivists.org/schema/ https://www.loc.gov/ead/ead3.xsd"  
     audience\="external"\>

It is a critical architectural requirement that the xsi:schemaLocation attribute maps the target namespace (http://ead3.archivists.org/schema/) directly and explicitly to the physical schema URL hosted by the Library of Congress (https://www.loc.gov/ead/ead3.xsd).5 While some legacy tools may point to local or alternative schema locations, utilizing the official Library of Congress endpoint ensures maximum compatibility across diverse ingest systems. Furthermore, the @audience attribute, while technically optional under the broad schema, is highly recommended and practically required by many ingest routines to explicitly declare the intended visibility of the finding aid (typically utilizing the external value for public-facing documents).4

### **Required Structural Elements**

The EAD3 standard enforces a strict, binary parent-child hierarchy at the root level. The root \<ead\> element mandates two, and strictly only two, child elements: \<control\> and \<archdesc\>.4 Any deviation from this root architecture will immediately invalidate the document against the EAD3 XSD.

#### **The Control Block**

The \<control\> element represents one of the most significant structural departures from EAD 2002, completely replacing the legacy \<eadheader\> element. Modeled closely after the EAC-CPF standard, the \<control\> block manages the bibliographic, administrative, and chronological provenance of the EAD XML instance itself, explicitly divorcing the metadata about the finding aid from the archival description of the physical materials.4  
The schema mandates the presence of the following child elements nested within the \<control\> block:

| Element | Structural Requirement | Description and Value Constraints | Source |
| :---- | :---- | :---- | :---- |
| \<recordid\> | Required | A universally unique identifier for the XML instance. It can optionally utilize the @instanceurl attribute to record the uniform resource locator of the hosted XML file. | 4 |
| \<filedesc\> | Required | Wraps the bibliographic information of the finding aid itself. It must contain a \<titlestmt\>, which in turn must contain a \<titleproper\> element. | 4 |
| \<maintenancestatus\> | Required | Indicates the current version status of the EAD file. It must possess a @value attribute strictly limited to the following controlled vocabulary: revised, deleted, new, deletedsplit, deletedmerged, deletedreplaced, cancelled, or derived. | 4 |
| \<maintenanceagency\> | Required | Identifies the institution or service responsible for the creation and maintenance of the EAD instance. It must contain the \<agencyname\> element. It supports the optional @countrycode attribute (utilizing ISO 3166-1 Alpha-2 codes) and the \<agencycode\> element (utilizing ISO 15511). | 4 |
| \<languagedeclaration\> | Required | Indicates the language and script in which the XML document is written. It mandates the use of the \<language\> and \<script\> sub-elements, which rely on specific ISO codes. | 4 |
| \<maintenancehistory\> | Required | Records the chronological provenance of the finding aid's creation, revision, and updates. It must contain at least one \<maintenanceevent\> child element. | 2 |

#### **The Maintenance Event Subelements**

The rigidity of the EAD3 standard is particularly evident within the \<maintenancehistory\> block. Every modification to the finding aid must be recorded as a discrete \<maintenanceevent\>. Each \<maintenanceevent\> strictly demands four child elements, which must be encoded in an exact, non-negotiable sequential order 2:

1. \<eventtype\>: Requires a @value attribute limited to a rigid controlled vocabulary: cancelled, created, deleted, revised, unknown, or updated.2  
2. \<eventdatetime\>: Requires the date and time of the maintenance event. To ensure machine-actionable chronological tracking, it is heavily recommended to utilize the @standarddatetime attribute formatted precisely to the ISO 8601 standard.2  
3. \<agenttype\>: Requires a @value attribute limited to human, machine, or unknown. This distinction is vital for tracking automated batch migrations versus manual archival interventions.2  
4. \<agent\>: Contains the string value naming the specific person, software tool, or script responsible for the event.2

#### **The Archival Description Block**

Following the \<control\> block, the \<archdesc\> element contains the core intellectual and physical description of the archival materials. It requires a @level attribute that establishes the hierarchical magnitude of the root materials. The allowed values for this attribute include class, collection, file, fonds, item, otherlevel, recordgrp, series, subfonds, subgrp, or subseries.4 Furthermore, \<archdesc\> must contain a \<did\> (Descriptive Identification) child element.4  
By the strict, theoretical definition of the EAD3 XSD, the \<did\> element acts as a polymorphic wrapper and does not legally require any specific child elements to pass baseline schema validation.9 However, theoretical validity does not equate to practical repository compliance. Real-world archival systems, specifically ArchivesSpace, mandate that a \<did\> must contain at least a \<unittitle\> or a \<unitdate\>.6 A \<did\> lacking both a title and a date will fail JSONModel conversion during ingestion, as the repository backend requires at least one of these elements to programmatically generate a display string for the interface.6

### **Numbered vs. Generic Components**

Archival hierarchy and the recursive description of subordinate materials are expressed through component elements nested within the \<dsc\> (Description of Subordinate Components) wrapper. The EAD3 schema permits two parallel approaches to component encoding: numbered components (\<c01\> through \<c12\>) and generic, unnumbered components (\<c\>).  
Historically, numbered components were heavily utilized in EAD 1.0 and early EAD 2002 implementations to explicitly track the depth of nesting. This approach forced structural validation across legacy XML parsers that struggled with deep recursion. However, in the contemporary EAD3 landscape, generic \<c\> components are the overwhelmingly preferred convention across all modern institutional repositories.11  
Generic \<c\> tags rely entirely on the @level attribute to convey hierarchical depth and semantic meaning (e.g., \<c level="series"\>, \<c level="file"\>, \<c level="item"\>). This methodology removes arbitrary depth limits—which were previously hard-capped at the twelfth level (\<c12\>)—and permits the programmatic generation of infinitely deep nested trees without the computational overhead of tracking integer increments during serialization. While both conventions are structurally identical under the EAD3 schema—sharing the newly added @base, @lang, and @script attributes—systems like ArchivesSpace default to generating and expecting generic \<c\> components.11 The @tpattern attribute, which previously governed tabular display patterns for numbered components in EAD 2002, has been completely removed in EAD3, further incentivizing the shift toward presentation-agnostic generic components.12 Although export toggles for numbered tags remain available for backward compatibility with highly rigid legacy discovery systems, a modern conversion tool should exclusively output generic \<c\> elements.11

### **Structural Differences Affecting Conversion Tools**

Engineers developing EAD3 generation utilities must possess a nuanced understanding of the schema deprecations and structural realignments that occurred between EAD 2002 and EAD3. The Society of American Archivists provided extensive XSLT migration stylesheets (e.g., EAD2002ToEAD3schema.xsl) to aid this transition, revealing several highly disruptive changes to the document object model.1

* **Elimination of the Generic \<note\> Element:** The generic \<note\> element, which was ubiquitous in EAD 2002 and available in eight distinct contexts, has been completely deprecated.12 It has been replaced by highly specific, context-aware elements: \<controlnote\>, \<didnote\>, \<descriptivenote\>, and \<footnote\>.13 Conversion scripts must implement complex conditional logic to map legacy notes appropriately. For instance, if a \<note\> was previously a child of major descriptive elements like \<accessrestrict\> or \<scopecontent\>, it must be stripped of its @encodinganalog attribute and wrapped as \<p\>\<footnote /\>\</p\>.12 Many importers will silently drop unsupported \<note\> tags entirely, meaning a generation tool must utilize \<odd\> (Other Descriptive Data) or \<footnote\> to ensure data retention.6  
* **Restriction of \<dao\> (Digital Archival Objects):** Digital Archival Objects (\<dao\>) and Digital Archival Object Sets (\<daoset\>) have been conceptually simplified but structurally restricted. They can no longer appear loosely within component bodies or outside of the core descriptive identification block. In EAD3, \<dao\> elements are strictly confined to being child elements of \<did\> or \<daoset\>.12  
* **Restricted Nesting of \<title\>:** The \<title\> element has been heavily constrained. It is no longer permissible as a child of a vast array of elements, including \<bibliography\>, \<container\>, \<physdesc\>, \<unitid\>, and \<unitdate\>.12 Furthermore, enabling XLink attributes (such as @actuate, @arcrole, @href, and @show) have been stripped from the \<title\> element to reduce namespace complexity. This functionality must now be replicated by employing \<ptr\> elements as sub-elements of \<title\>/\<part\>.12  
* **Attribute Disambiguation:** The generic @type attribute has been universally replaced to enforce semantic clarity. Depending on the parent element, it has been renamed to @localtype (for user-defined, non-schema vocabularies) or to a specific type attribute like @listtype, @unitdatetype, or @elementnametype.13 Furthermore, @role has been changed to @relator on access point elements and @linkrole on linking elements.13  
* **Structured Data Alternatives:** While \<unitdate\> and \<physdesc\> remain valid, EAD3 introduces highly granular, machine-readable alternatives (\<unitdatestructured\> and \<physdescstructured\>) to facilitate complex date ranges and multi-dimensional physical extents.12 For instance, \<unitdate\> can no longer exist as a child of \<unittitle\>.13 The schema also expands date formatting options extensively, introducing \<daterange\>, \<datesingle\>, \<fromdate\>, \<todate\>, and \<dateset\>.12  
* **Table Element Constraints:** Tables can no longer be nested within other tables in EAD3. Furthermore, \<entry\> elements are heavily restricted; they can only exist as a child of \<row\>, and they can no longer wrap \<address\>, \<archref\>, \<repository\>, \<unitdate\>, or \<unittitle\>.12

## **ArchivesSpace EAD3 Import Profile**

ArchivesSpace operates an intricate back-end abstraction layer that heavily dictates its ingestion capabilities. Rather than persisting raw XML directly to a relational database, the ArchivesSpace Java/JRuby backend utilizes a highly opinionated ingestion pipeline. The application parses the EAD XML, converts the data into an intermediate JSONModel representation, validates that JSON object against an internal suite of database schema constraints, and only then commits the record to the SQL backend.6 Consequently, a perfectly valid EAD3 XML file that passes XSD validation will frequently fail ArchivesSpace ingestion if it violates the application's unique, often undocumented, business logic.6

### **Import Documentation and Support**

Contrary to early technical forums indicating a lack of EAD3 support immediately following the standard's release, ArchivesSpace fully supports EAD3 import and export natively via its internal converter models (specifically the ead\_converter.rb class).11 While ArchivesSpace does not publish a singular, comprehensive "EAD3 Import Manual" in narrative form, the official documentation ecosystem consists of the open-source ArchivesSpace GitHub codebase, official data import/export mapping spreadsheets provided by LYRASIS (the organizational home of ArchivesSpace), and a robust network of community-maintained Schematron validation files.6

### **ArchivesSpace-Specific Constraints and Extensions**

The ArchivesSpace data model enforces strict validation rules that supersede the baseline EAD3 XSD. A client-side EAD3 generator must implement the following application-specific constraints to guarantee successful bulk ingestion 6:

| ArchivesSpace Rule | Technical Constraint | Rationale / Result of Violation | Source |
| :---- | :---- | :---- | :---- |
| **Component Level Attributes** | Every \<archdesc\> and \<c\> element must possess a valid @level attribute. | If omitted, the JSONModel conversion fails instantly. If set to otherlevel, the @otherlevel attribute must also be explicitly provided. | 6 |
| **Descriptive Minimums** | Every \<did\> block must contain at least one \<unittitle\> OR one \<unitdate\>. | The database requires a title or date to generate a UI display string. Submitting a component with neither triggers a title: must not be an empty string fatal error. | 6 |
| **Chronological Logic** | The @normal attribute on any \<unitdate\> must follow logical chronological order (![][image1]). | EAD3 standard permits anomalous ranges like \<unitdate normal="1887/1797"\>, but ArchivesSpace will reject the entire payload because the end year precedes the begin year. | 6 |
| **Extent Statement Formatting** | The first text node of a \<physdesc\>/\<extent\> element must begin with a digit (\\d) followed by a space (\\s) and text (\\D). | A value of "5items" or "\[ca. 1000 linear feet\]" will fail ingestion. It must be cleanly formatted as "5 items". Furthermore, ArchivesSpace ignores @unit attributes upon import, so unit descriptors must be explicitly written into the text node. | 6 |
| **Container Types** | Any \<container\> element must possess a @type attribute (e.g., Box, Folder). | Parentless containers without ID assignments or missing type designations will either drop silently or fail to group correctly within the Top Container management module. | 6 |
| **Unpublished Identifiers** | \<unitid\> elements cannot contain the @audience='internal' attribute. | ArchivesSpace possesses no internal concept of an unpublished identifier; the component ID must be published, or the validation rule triggers a rejection. | 6 |
| **Digital Object Titles** | A \<dao\> or \<daogrp\> element must resolve a discrete title string. | The stock ArchivesSpace importer looks for \<dao title=""\>. If missing, the importer attempts a fallback mechanism—scraping the parent's title and appending " Digital Object"—but explicit declaration prevents ingestion anomalies and data mangling. | 10 |

### **Common Import Errors and the Bentley Historical Library Case Study**

Because ArchivesSpace validates discrete JSON chunks rather than streaming the XML, errors are heavily abstracted. A single missing attribute buried deep within a \<c04\> component will cause the entire EAD payload to fail. Compounding the difficulty, the importer often returns a cryptic error that lacks an XML line number, leaving the user to hunt for the validation failure manually.6  
The friction between valid EAD and ArchivesSpace ingestion rules was extensively documented during a 2014-2015 migration project at the Bentley Historical Library (BHL) at the University of Michigan. The BHL "A-Team" tested a representative sample of 166 legacy EAD finding aids. Despite all files being perfectly valid XML, 59 finding aids failed the initial import attempt—a staggering error rate of 35.34%.10  
An analysis of these failures provides a definitive taxonomy of the most commonly reported EAD import errors in ArchivesSpace:

1. **Missing Digital Object Titles (47.86% of errors):** BHL's legacy practice placed digital object titles within a \<unittitle\> tag. Because the ArchivesSpace stock importer strictly demands a title attribute directly on the \<dao\> tag, almost half of the errors stemmed from this specific mapping mismatch.10  
2. **Formatting of Indices (23.73% of errors):** Legacy indices were improperly nested, causing JSON mapping failures.  
3. **Missing Component Titles/Dates (22.03% of errors):** Components lacking explicit descriptive minimums were rejected by the JSONModel.10  
4. **Invalid Extent Formatting (8.47% of errors):** Extent strings that began with alphabetical characters (e.g., \[ca. 1000 linear feet\]) triggered validation crashes.10  
5. **Character Escaping Failures:** The underlying Nokogiri XML parser in ArchivesSpace exhibits a notorious and ongoing bug regarding escaped ampersands (&). If an ampersand is followed immediately by text without a space (e.g., \<unittitle\>A \&B C D E\</unittitle\>), the parser unescapes it prematurely to \&A B C D E and subsequently drops all characters following the ampersand, resulting in severe data loss.20 Tools generating EAD3 must ensure proper spacing around ampersands or utilize CDATA blocks to insulate the text payload.

To circumvent these issues, the Bentley Historical Library was forced to develop a custom Ruby plugin (bhl-ead-importer) to sanitize the data pre-ingestion.10 For a client-side generator like Cartulary, mitigating these errors requires implementing a local Schematron validation pass (similar to the community-maintained ArchivesSpace-EAD-validator.sch) *before* the user attempts to export the XML file.6 This pre-validation ensures that dates are formatted to ISO 8601, extents follow the \\d \\s \\D regex pattern, and all \<did\> elements contain required descriptive parameters.

## **AtoM (Access to Memory) EAD3 Import Profile**

AtoM (Access to Memory), developed and maintained by Artefactual Systems, is a ubiquitous platform across institutions preferring open-source, PHP-based archival management software. It is particularly popular for multi-repository portals and networks prioritizing multilingual descriptive capabilities.21 However, AtoM's underlying architectural philosophy introduces severe interoperability limitations regarding the EAD3 standard.

### **EAD3 Support Status**

Despite the standard's release in 2015, AtoM currently **does not support EAD3** import or export natively.23 The application heavily utilizes EAD 2002 for archival description imports, relying on complex XSLT transformations—including integration with Apache FOP for rendering PDF finding aids directly from EAD inputs.13  
However, AtoM's core data model is not intrinsically bound to EAD; rather, it is tightly coupled to the International Standard for Archival Description (General), or ISAD(G).13 Upgrading the XML import and export modules to accommodate the massive structural divergence of the EAD3 schema requires a comprehensive, foundational rewrite of AtoM's PHP backend. Artefactual Systems has publicly stated that as a small enterprise, executing this upgrade requires external community funding, development sponsorship, or robust community-submitted pull requests, none of which have materialized to the scale required for EAD3 integration.23 Therefore, Cartulary cannot target AtoM using native EAD3 files.

### **Known Ingestion Breakages and Quirks**

If an archivist attempts to forcibly ingest an EAD3 XML file into an AtoM instance, the system does not trigger an explicit syntax failure. Because AtoM's XML parser utilizes highly relaxed matching criteria designed to accommodate wildly varied legacy inputs, it will attempt ingestion by scraping whatever text nodes vaguely align with EAD 2002 XPath routes while silently discarding unrecognized tags.25  
The known breakages resulting from this forced, unmapped ingestion are catastrophic to the metadata payload:

* **Total Loss of the \<control\> Block:** During import, AtoM actively searches the document tree for the EAD 2002 \<eadheader\> element to map provenance and administrative data. When presented with EAD3's \<control\> block, the parser fails to map any record IDs, maintenance events, or creation histories, effectively severing the document from its administrative provenance.  
* **Multilingual Mapping Failures:** AtoM relies on parsing specific legacy attributes to establish the language of the description. Because it fails to parse the new EAD3 \<languagedeclaration\> block properly, AtoM defaults the ingested descriptions to English, stripping out complex multilingual source data and overwriting localized descriptive metadata.25  
* **Loss of Granular Metrics:** EAD3's structured data elements, specifically \<unitdatestructured\> and \<physdescstructured\>, are entirely ignored by the importer, resulting in the immediate loss of critical date ranges, bulk dates, and multi-dimensional extent reporting.  
* **Authority Record Disconnect:** AtoM maps creator names found in the \<origination\> element and access point names in \<controlaccess\> to distinct authority records (utilizing ISAAR-CPF standards). Because EAD3 drastically altered the allowed sub-elements and attribute structures of \<controlaccess\>, AtoM frequently fails to build the necessary relational links between the archival description and the system's underlying authority taxonomy.21

To support AtoM successfully, Cartulary cannot rely on EAD3. It must feature a dedicated output toggle that serializes the finding aid backward into valid, highly conventional EAD 2002\. This serialization routine must ensure that \<control\> data is mapped back into an \<eadheader\>, that \<controlnote\> elements revert to generic \<note\> tags, and that structured dates are flattened back into standard \<unitdate\> string representations.

## **DSpace Ingestion Architecture for Archival Metadata**

DSpace is an open-source, Java-based repository system highly optimized for institutional outputs, electronic theses, research datasets, and discrete digital assets.27 Its widespread adoption in academic libraries makes it a frequent target for metadata ingestion, but its architecture relies heavily on flat, item-centric metadata profiles—specifically Dublin Core (DC), Qualified Dublin Core, and the Metadata Encoding and Transmission Standard (METS).28

### **The Viability of EAD3 in DSpace**

EAD3 is **not a realistic or appropriate primary ingest format** for out-of-the-box DSpace installations.27 There is a fundamental ontological mismatch between archival finding aids and digital asset repositories. EAD is explicitly designed to model deeply nested, recursive, hierarchical relationships (e.g., Fonds ![][image2] Series ![][image2] Subseries ![][image2] File ![][image2] Item). Conversely, DSpace operates on a highly rigid, three-tier taxonomy: Community ![][image2] Collection ![][image2] Item.31  
Attempting to ingest a massive, heavily nested EAD3 XML finding aid as a descriptive record for a single DSpace "Item" entirely obscures the archival hierarchy. It forces the system to treat a multi-thousand-page catalog as a monolithic text document, breaking granular discoverability and rendering the Lucene indexes highly inefficient. As noted in repository management discourse, DSpace inherently struggles to represent archival collections that lack discrete item-level metadata objects.31

### **Wrappers, Crosswalks, and Alternative Workflows**

Archivists leveraging DSpace for archival materials rarely interact directly with EAD files within the DSpace interface. Instead, they invariably utilize middleware, sophisticated integration pipelines, or metadata crosswalks. The standard protocol involves extracting archival metadata and wrapping it inside a METS or Dublin Core envelope suitable for DSpace ingestion.29

* **Archivematica Integration:** In sophisticated, multi-system pipelines (such as the workflow pioneered by the Bentley Historical Library), finding aids are authored and managed natively in ArchivesSpace. Digital objects are then processed through Archivematica, an open-source digital preservation system. Archivematica extracts the EAD metadata, generates Submission Information Packages (SIPs), wraps the metadata into METS files, and subsequently deposits the content into DSpace via the SWORD protocol as Dissemination Information Packages (DIPs).32 This abstraction ensures DSpace only handles flat METS/DC records linked to digital objects, while ArchivesSpace handles the hierarchical EAD.  
* **DSpace-GLAM:** Specialized repository forks, such as DSpace-GLAM (developed by the 4Science Team), expand the baseline DSpace data model to better accommodate cultural heritage hierarchies. These forks facilitate compliance with the Europeana Data Model (EDM). However, they still rely on mapping EAD elements into local relational schemas (e.g., altering the dctyperegistry in PostgreSQL) rather than attempting to host or display raw, unprocessed EAD3 XML natively.28  
* **IIIF and Manifest Generators:** Institutions dealing with digital surrogates of archival materials, like Georgetown University, rely on automated middleware tools (such as their open-source File Analyzer). These tools ingest EAD files generated by ArchivesSpace and extract the necessary fields to programmatically generate IIIF (International Image Interoperability Framework) manifests or dublin\_core.xml files, which are then sequenced and ingested into DSpace via the REST API.31

For Cartulary, offering a "raw EAD3" preset targeting DSpace is a misguided architectural choice that will lead to user frustration and ingestion failures. The tool should either generate an interoperable METS/DC .zip package optimized for DSpace SWORD ingestion, or it should explicitly limit its scope to dedicated archival content management systems like ArchivesSpace and AtoM.

## **Practical Minimum Field Set and Community Profiles**

The sheer size and theoretical flexibility of the EAD3 XSD—comprising hundreds of optional elements and incredibly complex mixed-content models—means that strict XML "validity" under the schema does not equate to "utility" within a professional archival repository.4 A mathematically valid EAD3 document can contain virtually no usable metadata. To ensure broad interoperability, the archival community relies on mapping EAD3 to authoritative content standards, primarily *Describing Archives: A Content Standard* (DACS).4

### **The DACS-EAD3 Baseline Minimum**

The Technical Subcommittee on Encoded Archival Standards (TS-EAS) and the SAA EAD Roundtable maintain the EAD3 Toolkit. This toolkit defines the absolute baseline minimum required to produce a single-level, DACS-compliant EAD3 finding aid that will pass both schema validation and the ingestion requirements of state and regional aggregators (such as ArchiveGrid or the Texas Archival Resources Online).4  
To generate a viable finding aid, a conversion tool must systematically populate the following hierarchical nodes 4:

#### **1\. Core Control Data Minimums**

The \<control\> block requires minimal but highly precise administrative metadata.4

* \<recordid\>: The universally unique identifier for the XML instance.  
* \<filedesc\>/\<titlestmt\>/\<titleproper\>: The formal, published name of the encoded finding aid.  
* \<maintenancestatus\>: Must be explicitly declared, typically set to @value="new" or @value="revised".  
* \<maintenanceagency\>/\<agencyname\>: The name of the encoding institution or repository.  
* \<maintenancehistory\>/\<maintenanceevent\>: A machine-generated stamp of the encoding event, requiring four strict sub-elements:  
  * \<eventtype value="created"\>  
  * \<eventdatetime standarddatetime=""\>  
  * \<agenttype value="machine"\>  
  * \<agent\>Cartulary XML Generator\</agent\>

#### **2\. DACS-Compliant Archival Description Minimums**

Within the \<archdesc\> block, the tool must establish the @level attribute (typically defaulting to collection for the root of the hierarchy) and populate the following elements within the primary \<did\> block to fulfill explicit DACS requirements 4:

| DACS Rule | EAD3 Element | Archival Description | Encoding Constraint |
| :---- | :---- | :---- | :---- |
| **DACS 2.1** | \<unitid\> | Reference code or Accession number. | Cannot be empty. Must avoid @audience="internal" to ensure ArchivesSpace compliance. |
| **DACS 2.2** | \<repository\> | Name of the hosting repository. | Requires the child \<corpname\> (which must be wrapped in a \<part\> element). |
| **DACS 2.3** | \<unittitle\> | Title of the specific materials. | Must contain text if a \<unitdate\> is absent to pass JSONModel validation. |
| **DACS 2.4** | \<unitdatestructured\> | Date range of the materials. | Must utilize the \<daterange\> wrapper containing \<fromdate\> and \<todate\>. |
| **DACS 2.5** | \<physdescset\> | Extent and physical dimensions. | Highly recommended to default to basic \<physdesc\>/\<extent\> for ArchivesSpace compatibility, formatted with leading digits (e.g., 5 linear feet). |
| **DACS 2.6** | \<origination\> | Creator or collector of the materials. | Requires at least one child element: \<persname\>, \<famname\>, or \<corpname\>. |
| **DACS 4.1** | \<accessrestrict\> | Conditions governing access. | Text payload must be wrapped within a \<p\> paragraph tag. |
| **DACS 4.5** | \<langmaterial\> | Language of the materials. | Requires the \<language\> tag coupled with an appropriate ISO @langcode. |

### **Missing Practical Requirements**

While the official SAA EAD3 Toolkit establishes the theoretical minimum, real-world archival workflows require additional fields that the toolkit omits from its bare-minimum profile. As previously detailed, ArchivesSpace requires extents to be formatted with highly specific mathematical rigor that the DACS guidelines do not explicitly enforce at the XML level.  
Furthermore, real-world finding aids rely heavily on **DACS 3.1** (\<scopecontent\>) and **DACS 2.7** (\<bioghist\>) to contextualize the materials. A finding aid lacking a Scope and Content note detailing the physical organization of the files, or a Biographical/Historical note establishing the provenance of the creator, is virtually useless to a researcher utilizing a discovery interface.21 Therefore, a tool aiming for true practical viability should provision columns mapping to \<scopecontent\> and \<bioghist\> as optional but strongly suggested fields in the user interface. Additionally, geographic references mapped to \<geogname\> with embedded geolocation coordinate metadata have become increasingly necessary to support modern GIS-based archival discovery platforms.36

## **Existing Tools and the Strategic Positioning of Cartulary**

The ecosystem of EAD generation and conversion utilities remains highly fragmented. For years, the archival community has relied on a patchwork of outdated scripts, highly localized repository plugins, and legacy executable formats that require extensive administrative privileges to operate. An analysis of the existing tool landscape highlights a distinct, highly technical functional gap that a browser-based, client-side tool like Cartulary is uniquely positioned to fill.

### **The Legacy Paradigm: EADMachine and asInventory**

For many years, the standard mechanism for spreadsheet-to-EAD conversion outside of an enterprise CMS was **EADMachine**. Developed in Python by Greg Wiedeman, EADMachine was distributed as a desktop application compiled to a Windows .exe executable.37 It allowed archivists to populate a macro-enabled Excel (.xlsm) template, executing local scripts to output native XML finding aids in both EAD 2002 and EAD3.37 EADMachine was highly robust, supporting EAD3 \<control\> elements, experimental \<relations\> elements, and automated unique ID generation.37 However, EADMachine is no longer actively maintained by its creator and relies on deprecated local dependencies that conflict with modern IT security protocols.37  
EADMachine has been conceptually superseded by **asInventory**, a newer Python-based project by the same author. While asInventory effectively handles spreadsheet manipulation, it completely abandons the generation of XML finding aids. Instead, it is tightly coupled to the ArchivesSpace REST API via Python's archivessnake library.37 It operates by reading .xlsx files and POSTing JSON payloads directly to an ArchivesSpace backend server, completely bypassing EAD3 generation.37 While efficient for system administrators, asInventory requires local Python 3.7+ environments, terminal command execution, API access keys, and network-level permissions to a live ArchivesSpace server. This renders the tool totally inaccessible to processing archivists, "lone arrangers," or students working offline or on locked-down institutional hardware.

### **Plugin Architecture: aspace-import-excel**

For users operating within the ArchivesSpace ecosystem, the most widely adopted alternative for spreadsheet data entry was the **aspace-import-excel** plugin.39 Originally developed as a localized Ruby extension by Harvard Library, this utility allowed users to interactively map Excel spreadsheets directly to Archival Objects within the ArchivesSpace staff interface.39  
The plugin proved so functionally indispensable to the archival community that LYRASIS officially absorbed its functionality into the ArchivesSpace core codebase (version 2.8 and higher), rebranding it as the native "Load Via Spreadsheet" feature.41 While highly effective for bulk data entry, the "Load Via Spreadsheet" feature possesses notable constraints. It requires the user to already operate an ArchivesSpace instance, it demands adherence to a rigidly formatted proprietary CSV template, and—crucially—it bypasses the EAD XML standard entirely.44 It is useless for institutions running AtoM, maintaining static XML-driven websites, or requiring raw EAD3 files for statewide aggregator submissions (like the Online Archive of California or the Texas Archival Resources Online).

### **Validation Utilities**

For quality control, institutions currently rely on standalone validation engines rather than integrated generators. The **EAS Validator** (maintained by TS-EAS) provides online schema validation for EAD3 and EAC-CPF, while the Archives Portal Europe offers the **Data Preparation Tool (DPT)**, a Java-based desktop application for validating and converting regional XML profiles.45 Neither of these tools generate finding aids from scratch; they merely validate existing XML.

### **The Strategic Gap for Cartulary**

Cartulary targets a specific, highly valuable, and currently unserved niche in the archival processing landscape. By functioning strictly as a client-side browser tool (leveraging modern JavaScript/WebAssembly frameworks), it completely eliminates the need for local Python environments, REST API permissions, Windows .exe downloads, or dedicated backend servers. It provides "zero-friction" processing capability, converting standard .csv or .xlsx matrices into validated XML entirely within the user's local browser memory.  
To succeed as an enterprise-grade utility, Cartulary must integrate the technical insights drawn from this architectural analysis:

1. **Repository-Aware Presets and Pre-Validation:** Emitting generic, schema-valid EAD3 XSD is insufficient for modern workflows. Cartulary must apply localized Schematron-level validation prior to export. The interface must actively warn users if an extent string lacks a leading digit or if a \<unitdate\> is chronologically reversed, thereby preventing fatal JSONModel ingestion failures when the file is uploaded to ArchivesSpace.6  
2. **EAD 2002 Downgrade Toggle:** Because AtoM entirely lacks EAD3 parsing capabilities and fails silently upon ingestion, Cartulary must feature an export routine that serializes the data structure backward into EAD 2002\. This requires programmatic mapping of \<control\> data back to \<eadheader\>, flattening \<controlnote\> to generic \<note\>, and translating structured dates into legacy formats.25  
3. **DSpace De-prioritization:** The DSpace preset should be removed from the primary UI or distinctly labeled as an experimental METS/DC wrapper generation tool. Bare EAD3 XML is fundamentally and structurally incompatible with DSpace's flat, item-level data model.31  
4. **Encoding and Sanitization:** The tool must actively escape XML entities during conversion to mitigate known parser bugs in target CMS platforms (e.g., ArchivesSpace’s Nokogiri parser failure with trailing & attributes).20

By implementing the DACS-compliant baseline minimum, enforcing strict adherence to the official Library of Congress namespace declarations, and accommodating the undocumented ingestion quirks of major repository platforms, a pure client-side generator can reliably output robust, highly inter-operable EAD3 metadata capable of passing the most stringent modern digital repository requirements.

#### **Works cited**

1. Frequently Asked Questions about EAD and EAD3 | Society of American Archivists, accessed June 7, 2026, [https://www2.archivists.org/groups/encoded-archival-standards-section/frequently-asked-questions-about-ead-and-ead3](https://www2.archivists.org/groups/encoded-archival-standards-section/frequently-asked-questions-about-ead-and-ead3)  
2. Encoded Archival Description Tag Library \- Version EAD3 (EAD Official Site, Library of Congress), accessed June 7, 2026, [https://www.loc.gov/ead/EAD3taglib/EAD3-TL-eng.html](https://www.loc.gov/ead/EAD3taglib/EAD3-TL-eng.html)  
3. EAD3 in Archives Portal Europe, accessed June 7, 2026, [https://www.archivesportaleurope.net/tools/for-content-providers/standards/ead3-in-archives-portal-europe/](https://www.archivesportaleurope.net/tools/for-content-providers/standards/ead3-in-archives-portal-europe/)  
4. saa-ead-roundtable/ead3-toolkit: A starter kit providing ... \- GitHub, accessed June 7, 2026, [https://github.com/saa-ead-roundtable/ead3-toolkit](https://github.com/saa-ead-roundtable/ead3-toolkit)  
5. Example EAD3.xml \- functions-subteam \- GitHub, accessed June 7, 2026, [https://github.com/SAA-SDT/TS-EAS-subteam-notes/blob/master/functions-subteam/WhitePaper\_examples/Example%20EAD3.xml](https://github.com/SAA-SDT/TS-EAS-subteam-notes/blob/master/functions-subteam/WhitePaper_examples/Example%20EAD3.xml)  
6. Validation Scenarios – ArchivesSpace @ Yale, accessed June 7, 2026, [https://campuspress.yale.edu/yalearchivesspace/2015/07/22/validation-scenarios/](https://campuspress.yale.edu/yalearchivesspace/2015/07/22/validation-scenarios/)  
7. Kerstin Arnold: EAD3 and the consequences of the new version \- APEx project, accessed June 7, 2026, [http://www.apex-project.eu/index.php/en/articles/149-ead3-and-the-consequences-of-the-new-version](http://www.apex-project.eu/index.php/en/articles/149-ead3-and-the-consequences-of-the-new-version)  
8. EAD2002toEAD3/README.md at master \- GitHub, accessed June 7, 2026, [https://github.com/SAA-SDT/EAD2002toEAD3/blob/master/README.md](https://github.com/SAA-SDT/EAD2002toEAD3/blob/master/README.md)  
9.   
10. Bentley Historical Library Curation Team Blog: Legacy EAD Import into ArchivesSpace, accessed June 7, 2026, [http://archival-integration.blogspot.com/2015/04/legacy-ead-import-into-archivesspace.html](http://archival-integration.blogspot.com/2015/04/legacy-ead-import-into-archivesspace.html)  
11. Export EAD | Atlas Systems Documentation, accessed June 7, 2026, [https://docs.atlas-sys.com/archivesspace/importing-and-exporting/export-ead](https://docs.atlas-sys.com/archivesspace/importing-and-exporting/export-ead)  
12. Implementing EAD3: Conversion and Migration \- Society of ..., accessed June 7, 2026, [https://www2.archivists.org/sites/all/files/FinalReport.pdf](https://www2.archivists.org/sites/all/files/FinalReport.pdf)  
13. Encoded Archival Description Tag Library \- Version EAD3 (EAD Official Site, Library of Congress), accessed June 7, 2026, [https://www.loc.gov/ead/EAD3-TL-eng.html](https://www.loc.gov/ead/EAD3-TL-eng.html)  
14. Encoded Archival Description Tag Library Version EAD3 1.1.1, accessed June 7, 2026, [https://www.loc.gov/ead/EAD3taglib/tl\_ead3.pdf](https://www.loc.gov/ead/EAD3taglib/tl_ead3.pdf)  
15. Overview of EAD pages \- EADiva, accessed June 7, 2026, [https://eadiva.com/elements/](https://eadiva.com/elements/)  
16. Your EAD Primer: Part 1 \- Hack Library School, accessed June 7, 2026, [https://hacklibschool.wordpress.com/2016/12/12/your-ead-primer-part-1/](https://hacklibschool.wordpress.com/2016/12/12/your-ead-primer-part-1/)  
17. ArchivesSpace Resource to MODS, accessed June 7, 2026, [https://archivesspace.org/wp-content/uploads/2019/06/MODS-OAI-Export-Mapping-20190610.xlsx](https://archivesspace.org/wp-content/uploads/2019/06/MODS-OAI-Export-Mapping-20190610.xlsx)  
18. Updating to ArchivesSpace Version 2.7+ FAQ \- Atlas Systems, accessed June 7, 2026, [https://support.atlas-sys.com/hc/en-us/articles/360041878293-Updating-to-ArchivesSpace-Version-2-7-FAQ](https://support.atlas-sys.com/hc/en-us/articles/360041878293-Updating-to-ArchivesSpace-Version-2-7-FAQ)  
19. Migration Tools and Data Mapping \- ArchivesSpace, accessed June 7, 2026, [https://archivesspace.org/resources/user-resources/migration-tools-and-data-mapping](https://archivesspace.org/resources/user-resources/migration-tools-and-data-mapping)  
20. EAD Import \- Problem with Escaped Characters · Issue \#332 \- GitHub, accessed June 7, 2026, [https://github.com/archivesspace/archivesspace/issues/332](https://github.com/archivesspace/archivesspace/issues/332)  
21. Import descriptions and terms | Documentation (Version 2.2) \- AtoM, accessed June 7, 2026, [https://www.accesstomemory.org/fr/docs/2.2/user-manual/import-export/import-descriptions-terms/](https://www.accesstomemory.org/fr/docs/2.2/user-manual/import-export/import-descriptions-terms/)  
22. EAD \+ XSLT \= PDF \- AtoM wiki, accessed June 7, 2026, [https://wiki.accesstomemory.org/images/f/f9/Code4libBC-2014-XSLT.pdf](https://wiki.accesstomemory.org/images/f/f9/Code4libBC-2014-XSLT.pdf)  
23. Re: \[atom-users\] Import EAD3 on Atom v2.3 \- Google Groups, accessed June 7, 2026, [https://groups.google.com/g/ica-atom-users/c/ehUh0OsYRd4](https://groups.google.com/g/ica-atom-users/c/ehUh0OsYRd4)  
24. OAI-PMH: EAD identifiers \- Google Groups, accessed June 7, 2026, [https://groups.google.com/g/ica-atom-users/c/P7RMSvoYiag](https://groups.google.com/g/ica-atom-users/c/P7RMSvoYiag)  
25. Imported EAD entry added always with English as Source Language, accessed June 7, 2026, [https://groups.google.com/g/ica-AtoM-users/c/7Zvd2F0Gc1Y](https://groups.google.com/g/ica-AtoM-users/c/7Zvd2F0Gc1Y)  
26. AtoM documentation contents | Documentation (Version 2.4) | AtoM: Open Source Archival Description Software \- Access to Memory, accessed June 7, 2026, [https://www.accesstomemory.org/en/docs/2.4/contents/](https://www.accesstomemory.org/en/docs/2.4/contents/)  
27. Chapter 1: Metadata Developments in Libraries and Other Cultural Heritage Institutions, accessed June 7, 2026, [https://journals.ala.org/index.php/ltr/article/view/4691/5583](https://journals.ala.org/index.php/ltr/article/view/4691/5583)  
28. Using Multiple Metadata Formats in DSpace, accessed June 7, 2026, [https://www.repository.cam.ac.uk/bitstreams/5041c406-fbdf-47b7-8c8f-e884a0da4e93/download](https://www.repository.cam.ac.uk/bitstreams/5041c406-fbdf-47b7-8c8f-e884a0da4e93/download)  
29. METS Implementation Registry: Metadata Encoding and Transmission Standard (METS) Official Web Site. \- The Library of Congress, accessed June 7, 2026, [https://www.loc.gov/standards/mets/mets-registry.html](https://www.loc.gov/standards/mets/mets-registry.html)  
30. ArcLight Interview Analysis | Stacks are the Stanford, accessed June 7, 2026, [https://stacks.stanford.edu/file/druid:vq276jq8115/ArcLight-Interview-Analysis-2016-10-31.pdf](https://stacks.stanford.edu/file/druid:vq276jq8115/ArcLight-Interview-Analysis-2016-10-31.pdf)  
31. Paper 1 — IIIF \- International Image Interoperability Framework, accessed June 7, 2026, [https://iiif.io/event/2018/washington/program/paper-1/](https://iiif.io/event/2018/washington/program/paper-1/)  
32. Bridging Technologies to Efficiently Arrange and Describe Digital Archives: the Bentley Historical Library's ArchivesSpace-Archivematica-DSpace Workflow Integration Project \- The Code4Lib Journal, accessed June 7, 2026, [https://journal.code4lib.org/articles/12105](https://journal.code4lib.org/articles/12105)  
33. DSpace-GLAM based on DSpace-CRIS : Manage, Analyze & Preserve your digital heritage, accessed June 7, 2026, [https://aims.fao.org/fr/news/dspace-glam-based-dspace-cris-manage-analyze-preserve-your-digital-heritage](https://aims.fao.org/fr/news/dspace-glam-based-dspace-cris-manage-analyze-preserve-your-digital-heritage)  
34. Encoded Archival Description \- Wikipedia, accessed June 7, 2026, [https://en.wikipedia.org/wiki/Encoded\_Archival\_Description](https://en.wikipedia.org/wiki/Encoded_Archival_Description)  
35. ead3-toolkit/ead3\_single\_level\_minimum.xml at master · saa-ead ..., accessed June 7, 2026, [https://github.com/saa-ead-roundtable/ead3-toolkit/blob/master/ead3\_single\_level\_minimum.xml](https://github.com/saa-ead-roundtable/ead3-toolkit/blob/master/ead3_single_level_minimum.xml)  
36. Implementing EAD3: Search and Exploration, accessed June 7, 2026, [https://www2.archivists.org/sites/all/files/EAD3\_Study\_Group\_on\_Discovery\_Recommendations\_20160719.pdf](https://www2.archivists.org/sites/all/files/EAD3_Study_Group_on_Discovery_Recommendations_20160719.pdf)  
37. GitHub \- gwiedeman/eadmachine: EADMachine is an easy EAD ..., accessed June 7, 2026, [https://github.com/gwiedeman/eadmachine](https://github.com/gwiedeman/eadmachine)  
38. archivesspace/awesome-archivesspace \- GitHub, accessed June 7, 2026, [https://github.com/archivesspace/awesome-archivesspace](https://github.com/archivesspace/awesome-archivesspace)  
39. harvard-library/aspace-import-excel: Import resources, archival objects, etc. into ArchivesSpace using Excel spreadsheet files \- GitHub, accessed June 7, 2026, [https://github.com/harvard-library/aspace-import-excel](https://github.com/harvard-library/aspace-import-excel)  
40. ArchivesSpace Monthly Update July 2017, accessed June 7, 2026, [https://archivesspace.org/archives/2412](https://archivesspace.org/archives/2412)  
41. ArchivesSpace Spreadsheet | U of I Library Spec Documentation, accessed June 7, 2026, [https://uidaholib.github.io/spec-docs/content/processing/spreadsheet.html](https://uidaholib.github.io/spec-docs/content/processing/spreadsheet.html)  
42. The ArchivesSpace Import Spreadsheets \- Atlas Systems, accessed June 7, 2026, [https://support.atlas-sys.com/hc/en-us/articles/360051427054-The-ArchivesSpace-Import-Spreadsheets](https://support.atlas-sys.com/hc/en-us/articles/360051427054-The-ArchivesSpace-Import-Spreadsheets)  
43. ArchivesSpace Update \- December 2019, accessed June 7, 2026, [https://archivesspace.org/archives/5804](https://archivesspace.org/archives/5804)  
44. (WHS Archives) ArchivesSpace \-- Resource \-- Contents List \-- Load a Spreadsheet, accessed June 7, 2026, [https://kb.wisconsin.edu/uwlss/118508](https://kb.wisconsin.edu/uwlss/118508)  
45. Recommended Tools and Resources | Society of American Archivists, accessed June 7, 2026, [https://www2.archivists.org/groups/encoded-archival-standards-section/recommended-tools-and-resources](https://www2.archivists.org/groups/encoded-archival-standards-section/recommended-tools-and-resources)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAWCAYAAAA/45nkAAADQUlEQVR4Xu2YWahNURjHP1NmuuapbkqKyJAMoY68CEXJVPKAK14IL4o3HhAeEMrwgBDiwRAZyhCZQkLmm5TyYCqExP/vW8td+zu7zjlq37M79q9+3bO/te7e96y19re+dUUyMjIyyk5v+An+godNW1J0gT1s8H+lNTwoOgFLTVtS8FnfYDPbUA9Uw9k2WG5Oig7KcNuQED/gKRtMmP5wL3wDO5u2svMRfoCNbUOFcAA+ggthc9OWCnz66QRz0aY8OsImNmgYBNvaoIP5P45hsCq47u5iLYJYsUyEZ+AlOM60pRJOwC74Ge6DWyQ6yA1hDbwDL8ILcGXQ7mkHd4uuuPdwCdzm2niPrfAF3O5inp2iz+ffMQeehQ/hdfgl6FeIBnCa6OCPNW2ppanUVUDtXYzXK/72EDkPa+EQd81V/B328h3AAPgKnnPXrK6+it6LrIZ7RCeWMf8sssH9ZH5+C2eIThhh3uYbVYip8CrcbxvSzhjRV9V/YcIBum2uw8phMHwGW7lr7h18O/gGdfWdRCeOv8u8+1x00Fn5sF+Yi/uJ3ouT6ifMs0Z0VRdivOjzDtmGtHNa8qsfDgK/DGGJyjTAtMPUcAy2dG2eB6K/MzOIDXSxI0GMHIUjTYysFe3PVOfxk1UqPeEOeA1ONm2pgxWQrX44EBvd5xsSHZQ42J9yD/Asc7HwbMENnGkpDqYP9g/TGlORfSNKgRPBfWeK6P6QOrjC7BfkZLBOZ04nXPVxKzaE93hiYv5sMTSILXYxwkqlj/vcRvSZTGshx6Wu/yTRQ+O/wD3mCpwFG5m2snPfXM+F64LrzXB0cO3hCq92n7mqHwdt3CMYeyfRL3xX9ATM0vI17ObiE0QHmmnD00F0UtiPe8dNie5TpcK3j2nului9UwPrbU4CS8OncHm0+Q8nRHP/etGV7d8OD98ktvEtuAc3iQ7oorCT6ADwwMcyldWXh/vMT9G/xcPBviw6sfODeEUyAva1QQPzO4/zxeRS/puBExBXPo6yAdHKiZu2hRObs8GMfHiCDmHqqDWxjISYDl+aGFf/PBNLGp7MWTAUI0/bFcMC0X2BFQrPEzy5ror0qB9YvuaK1G/+GRkZZeM3Rlmrj0BVwPMAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAZCAYAAADe1WXtAAAAcklEQVR4XmNgGAWjgFSwCYg10QUpBfVAXIMuSClQBOLH6ILUAD3oAuhAHogdyMB3gPgWEDsyYAGBQFxLBr4MxP+BeDUQMzNQCYBcaoYuSAnIBGJBdEFKgCgQf0MXpBSsB2J7dEFKgREQs6ELjoJRMJQAAP8HFaTzpgzZAAAAAElFTkSuQmCC>