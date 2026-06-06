Prompt 1 — EAD3 Standard, Repository Import Profiles & Practical Minimum Field Set

Project context: I am building Cartulary, a free, purely client-side browser tool (no backend, no installation) that converts archival finding-aid spreadsheets (.xlsx / .csv) into valid EAD3 XML for submission to institutional repositories. The output must pass real imports into ArchivesSpace, AtoM, and DSpace. Before writing any code I need a thorough technical briefing on the EAD3 standard and the import requirements of each target repository.
Research questions:
1. EAD3 schema fundamentals (Library of Congress, 2015)

What is the required XML declaration and namespace block for a valid EAD3 document? Specifically: the correct xmlns, xmlns:xsi, and xsi:schemaLocation values, and the authoritative schema URL at loc.gov. This declaration is easy to get wrong and causes silent import failures.
What elements are required at each structural level: <ead> / <control> / <archdesc> / <dsc> / <c> (component)? What is the minimum set of child elements within <did> that must be present for a component to be valid?
What is the difference between numbered component elements (<c01>–<c12>) and generic <c> elements with a level attribute? Which convention do modern repositories prefer and why?
What are the most significant structural differences between EAD 2002 and EAD3 that would affect a conversion tool — specifically namespace changes, renamed elements, and removed elements?
What does the <maintenancehistory> / <maintenanceevent> block require, and what are acceptable values for <eventtype>?

2. ArchivesSpace EAD3 import profile

Does ArchivesSpace have a published EAD3 import profile, mapping table, or official import documentation? Where is it?
What elements or attributes does ArchivesSpace require that are not strictly mandated by the EAD3 XSD (i.e., ArchivesSpace-specific additions)?
What are the most commonly reported EAD3 import errors in ArchivesSpace — namespace issues, element ordering, unsupported elements, encoding problems? Are there community-maintained workaround lists (GitHub issues, the ArchivesSpace user group, the Code4Lib list)?
Does ArchivesSpace handle <c> (generic, level attribute) or does it expect numbered <c01>–<c12>?
What date format does ArchivesSpace expect in <unitdate>? Does it require or tolerate ISO 8601?

3. AtoM (Access to Memory) EAD3 import profile

Same questions as ArchivesSpace: published import documentation, required elements beyond the XSD, known quirks, <c> vs. numbered components, date format expectations.
Does AtoM's EAD3 importer differ substantially from its EAD 2002 importer? What are the known breakages?
What version of AtoM introduced EAD3 support, and are older deployments still common enough to matter?

4. DSpace and EAD3

DSpace is primarily Dublin Core / MODS. Is EAD3 a realistic ingest format for DSpace, or do archivists typically use a Dublin Core or METS wrapper instead? Is DSpace an appropriate target for an EAD3 generator, or should the preset be reconsidered?
If DSpace does accept EAD3, what profile or mapping documentation exists?

5. Practical minimum field set and community profiles

What does the archival community (SAA, OCLC, DLF) define as the minimum viable EAD3 finding aid for repository submission? Are there named profiles or best-practice guides (e.g., the DACS-EAD mapping, the Best Practices for EAD from the Library of Congress)?
Are there any fields the spec's proposed minimum set (<unittitle>, <unitdate>, <unitid>, <extent>, <scopecontent>, <accessrestrict>, <userestrict>, <langmaterial>) is missing that are required in practice?

6. Existing tools and the gap Cartulary fills

What is EADMachine's current status? Why does it support only EAD 2002? Is it maintained?
What other EAD conversion tools (free or commercial) exist? What formats do they accept as input, and what version of EAD do they output?
Are there any open-source EAD3 generators (any language) whose source code could inform Cartulary's implementation?

Requested output format: A structured technical briefing. Section 1 covers EAD3 schema fundamentals with the exact namespace block and a minimum field inventory. Sections 2–4 cover each repository with a table of required elements, known quirks, and links to official documentation. Section 5 distills a recommended minimum field set for the tool. Section 6 is a landscape summary of existing tools. Flag anything the spec document may have gotten wrong or underestimated.
