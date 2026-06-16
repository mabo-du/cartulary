# CONTENTdm Structural Comparison — Findings

## Columbia University Finding Aid (cul-10491409.xml)

**URL:** https://findingaids.library.columbia.edu/ead/cul-10491409.xml
**Status:** Downloaded, 6 MB
**Hosting:** Columbia's own nginx server — **NOT CONTENTdm**

This undermines part of the reverse-engineering paper that treated it as a "CONTENTdm repository" example. The finding aid is served from Columbia's landing zone infrastructure, which has its own EAD pipeline.

### What it shows about general EAD 2002 practice:

| Property | Finding | Source |
|---|---|---|
| Namespace | `urn:isbn:1-931666-22-9` | EAD 2002 |
| Component convention | Generic `<c>` (0 numbered, 5 generic) | Standard EAD 2002 |
| Date format | `@datechar="creation"` + `@normal="YYYY/YYYY"` | Matches Cartulary's AtoM serializer |
| DAO elements | None present | N/A |
| Root declaration | `<?xml version="1.0" encoding="utf-8"?>` | Matches Cartulary |
| Archdesc level | `level="collection"` | Matches Cartulary |
| Dsc wrapper | `<dsc>` containing `<c>` elements | Matches Cartulary |

### Key takeaway

This finding aid proves generic `<c>` elements are widely used in EAD 2002, but does NOT prove they work in CONTENTdm. Columbia may inject their EAD into CONTENTdm through a different pipeline or not at all. The OAC/Archives West consortial guidelines (which explicitly forbid generic `<c>` for CONTENTdm) remain the most authoritative source on CONTENTdm's numbered `<c>` requirement.

## Test Summary

| Test | Result |
|---|---|
| Namespace stripping removes `xmlns:xlink` from `<dao>` | ✅ Confirmed |
| Multiple `<dao>` elements all stripped | ✅ Confirmed |
| AtoM output preserves namespaces (no strip) | ✅ Confirmed |
| EAD3 unaffected by namespace stripping flag | ✅ Confirmed |
| XML well-formed (with and without dao) | ✅ Confirmed |
| Base structure validates against EAD 2002 XSD | ✅ Confirmed |
| DAO output intentionally breaks standard XSD (expected — CONTENTdm requires `href` not `xlink:href`) | ✅ Documented |
| ISO 8601 century-spanning dates accepted | ✅ Confirmed |
| Non-ISO dates flagged as errors | ✅ Confirmed |
