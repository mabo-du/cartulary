# Prompt 4 — CONTENTdm EAD Import Profile Research

## Goal

Establish the CONTENTdm EAD import profile: namespace conventions, minimum field set, non-standard requirements, and any quirks or limitations. This research directly enables Cartulary's third repository preset (`src/lib/presets/config.ts` — currently a "Coming soon" placeholder).

## Background

CONTENTdm is OCLC's digital collection management system, widely used by libraries, museums, and historical societies. It explicitly supports EAD finding aid import and is the recommended replacement for DSpace in Cartulary's target set. However, its EAD import profile was not covered by Cartulary's four original deep-research documents, and the official OCLC help documentation pages are returning 404 errors.

The current CONTENTdm preset in Cartulary is a placeholder:

```typescript
contentdm: {
  name: 'contentdm',
  label: 'CONTENTdm (Coming soon)',
  targetFormat: 'ead3',
  componentConvention: 'generic-c',
  strictComponentConvention: false,
  validationStrictness: {
    isoDate: 'warning',
    extentFormat: 'warning',
    chronologicalOrder: 'warning',
    unitidAudienceInternal: 'warning',
    duplicateUnitid: 'error',
  },
  nokogiriSanitize: false,
  requiresTitleOnDao: false,
},
```

All of these values are guesses. This research should either confirm them or provide evidence-based corrections.

## Research Questions

### 1. Format: EAD3 or EAD 2002?

Determine which version of the EAD standard CONTENTdm accepts for import.

- Does CONTENTdm accept EAD3 (namespace `http://ead3.archivists.org/schema/`)?
- Does it require EAD 2002 (namespace `urn:isbn:1-931666-22-9`)?
- Does it accept both?
- Is there a specific `@audience` attribute requirement?

### 2. Minimum Field Set

What is the minimum set of EAD elements CONTENTdm requires for a successful import?

- Is `<control>` / `<eadheader>` required, and what sub-elements are mandatory?
- Is `<archdesc>` required, and must it have `@level`?
- Is `<did>` required? What about `<unitid>`, `<unittitle>`, `<unitdate>`?
- Can CONTENTdm import a finding aid with only `<c>` components and no `<dsc>`?

### 3. Component Element Convention

- Does CONTENTdm prefer generic `<c level="...">` or numbered `<c01>`–`<c12>`?
- Does it accept both?
- Is there a maximum nesting depth?

### 4. Namespace and Schema

- What namespace declaration does CONTENTdm expect on the root `<ead>` element?
- Does it require a `xsi:schemaLocation` attribute?
- What schema URL should be pointed to?
- Are there any non-standard attributes required on `<ead>` (similar to ArchivesSpace's `countrycode` and `languageattributename`)?

### 5. Date Handling

- Does CONTENTdm require ISO 8601 dates in `<unitdate>`?
- Does it accept free-text date expressions (e.g., "circa 1920s")?
- What happens if a date is missing?
- Does it support composite dates (start/end range) via `@normal`?

### 6. Special Characters and Encoding

- Does CONTENTdm have any issues with ampersands or other special characters (similar to ArchivesSpace's Nokogiri truncation)?
- What character encoding does it expect?
- Are there known issues with diacritics or non-Latin scripts?

### 7. Digital Object References

- Does CONTENTdm accept `<dao>` elements for digital object links?
- What attributes are required on `<dao>` (`@href`, `@title`, `@role`)?
- Does it support `<daogrp>` / `<daodesc>`?

### 8. Known Issues and Community Experience

- Search the Code4Lib archives, CONTENTdm user group, and GitHub for discussions about EAD import failures.
- What are the most common import errors reported by the community?
- Are there any version-specific differences (CONTENTdm versions 6, 7, 8)?
- What happens with controlled vocabulary fields (subjects, names, genres)?

## Research Sources

Prioritise these sources in order:

### Tier 1 — Primary Documentation (highest authority)

- **CONTENTdm Administration Guide**: Search OCLC's help site and CONTENTdm documentation for EAD-related sections. Try URLs:
  - `https://help.oclc.org/Metadata_Services/CONTENTdm/Administration`
  - `https://help.oclc.org/Metadata_Services/CONTENTdm/Advanced_techniques/Import_metadata`
  - `https://www.oclc.org/content/dam/oclc/services/contentdm/...`
- **CONTENTdm Release Notes**: Check for EAD-related changes in recent versions.
- **OCLC Developer Network**: Look for API documentation or sample code related to EAD import.

### Tier 2 — Community Knowledge

- **Code4Lib Archives**: Search listserv for "CONTENTdm EAD import", "contentdm finding aid".
- **GitHub**: Search for CONTENTdm-related EAD import scripts or discussions.
- **CONTENTdm User Group**: Archived presentations or forum posts about EAD workflows.

### Tier 3 — Institutional Examples

- Look at institutional finding aids hosted in CONTENTdm to reverse-engineer the expected structure:
  - Search Google for `"contentdm" "ead" "finding aid" site:edu`
  - Download sample EAD XML files from known CONTENTdm repositories
  - Compare their structure against Cartulary's output

## Output Format

Write the findings to `docs/research-papers/` as a new document titled:

`CONTENTdm EAD Import Profile Research.md`

The document must include:

1. **Executive Summary**: 2–3 paragraphs covering the key findings.
2. **Profile Table**: A definitive table with these columns:

   | Property | Value | Source |
   |---|---|---|
   | EAD version | EAD3 or EAD 2002 | [source URL] |
   | Namespace | e.g., `http://ead3.archivists.org/schema/` | [source URL] |
   | Component convention | `<c>` or `<c01>` | [source URL] |
   | Minimum fields required | unitid? unittitle? level? | [source URL] |
   | ISO 8601 dates | Required? Strict? | [source URL] |
   | `@audience` | Required? | [source URL] |
   | `<dao>` support | Yes/No + required attrs | [source URL] |
   | Encoding | UTF-8 only? | [source URL] |
   | Known quirks | Ampersand? Unclosed tags? | [source URL] |

3. **Recommended Preset Configuration**: A complete `PresetConfig` object for CONTENTdm with every field justified by evidence from the research. Cross-reference each decision to the source.
4. **Open Questions**: Any questions that could not be resolved, with suggestions for resolving them (e.g., "create a free CONTENTdm trial instance and test").
5. **Test Files**: Two sample EAD files (one generic `<c>`, one numbered `<c01>`) ready for import testing once a test instance is available.
