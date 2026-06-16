/** help-content.ts — Contextual help panel content.
 *
 * Provides step-by-step guidance for each wizard step and field in the
 * app. Rendered as a slide-out panel triggered from the header.
 *
 * exports:
 *   HELP_SECTIONS — Record of section ID to {title, content}
 */

export interface HelpSection {
  title: string;
  content: string;
}

export const HELP_SECTIONS: Record<string, HelpSection> = {
  overview: {
    title: 'How Cartulary Works',
    content: `
      <p>Cartulary converts a flat spreadsheet of archival descriptions into a structured EAD XML finding aid. The entire process happens in your browser — no data is uploaded.</p>
      <p>The workflow has three steps:</p>
      <ol>
        <li><strong>Upload</strong> — Drop your .xlsx or .csv file</li>
        <li><strong>Map</strong> — Match spreadsheet columns to EAD fields</li>
        <li><strong>Validate &amp; Export</strong> — Check for errors and download the XML</li>
      </ol>
      <p>Need a template? Download the example spreadsheet from Step 1 to see the expected format.</p>
    `,
  },
  'upload-step': {
    title: 'Step 1: Upload',
    content: `
      <p>Drag a <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code> file onto the drop zone, or click to browse.</p>
      <p>After upload, Cartulary parses the file and shows the first 25 rows as a preview. Verify your data looks correct, then click <strong>Map Columns</strong>.</p>
      <p><strong>No spreadsheet yet?</strong> Click the <strong>Download example template</strong> link below the upload zone. It contains sample data for all three hierarchy modes.</p>
      <p>Files over approximately 50 KB are parsed in a background Web Worker — the UI stays responsive.</p>
      <p><strong>Supported formats:</strong> .xlsx, .xls, .csv (UTF-8 recommended).</p>
    `,
  },
  'preset-selector': {
    title: 'Repository Preset',
    content: `
      <p>Select the archival management system you're targeting. Each preset adjusts the output format, validation strictness, and component conventions.</p>
      <dl>
        <dt><strong>ArchivesSpace</strong> (EAD3)</dt>
        <dd>Strict validation for ArchivesSpace import. Generic <code>&lt;c&gt;</code> elements. Nokogiri ampersand sanitization active.</dd>
        <dt><strong>AtoM</strong> (EAD 2002)</dt>
        <dd>EAD 2002 output with ISAD(G)v2 crosswalk. Accepts both generic and numbered components. Schema location suppressed to avoid network DTD failures.</dd>
        <dt><strong>CONTENTdm</strong> (EAD 2002)</dt>
        <dd>EAD 2002 with numbered <code>&lt;c01&gt;</code>–<code>&lt;c12&gt;</code> components. Inline namespace stripping for Project Client compatibility. Strict ISO 8601 dates to prevent the date mangling bug.</dd>
      </dl>
    `,
  },
  'hierarchy-modes': {
    title: 'Hierarchy Modes',
    content: `
      <p>Choose how your spreadsheet encodes parent-child relationships.</p>
      <dl>
        <dt><strong>Level Column</strong></dt>
        <dd>Each row has a <code>level</code> value (collection, series, file, item). Hierarchy is inferred from row order. Most common mode.</dd>
        <dt><strong>Dotted Component IDs</strong></dt>
        <dd>Each row has an <code>id</code> like <code>1</code>, <code>1.1</code>, <code>1.1.2</code>. Parent is derived by removing the last segment.</dd>
        <dt><strong>parent_id Column</strong></dt>
        <dd>Each row has an <code>id</code> and a <code>parent_id</code>. Children can appear before parents — the algorithm handles this.</dd>
      </dl>
      <p>The example spreadsheet has all three modes as separate sheets.</p>
    `,
  },
  'field-mapping': {
    title: 'Field Mapping',
    content: `
      <p>Map each EAD field to the corresponding column in your spreadsheet.</p>
      <p><strong>Tier 1</strong> fields are always visible and required or strongly recommended. Hover the ⓘ icon for details including the DACS rule and an example value.</p>
      <p><strong>Tier 2</strong> fields are in a collapsible "Recommended Fields" section — expand it to see optional fields.</p>
      <p>The composite date mapping lets you split a date into three sub-fields: <strong>Start Date</strong>, <strong>End Date</strong>, and <strong>Date Expression</strong>. When both start and end dates are mapped, they're combined into the ISO 8601 <code>@normal</code> attribute.</p>
    `,
  },
  'numbered-c-toggle': {
    title: 'Numbered &lt;c&gt; Toggle',
    content: `
      <p>By default, Cartulary uses generic <code>&lt;c level="..."&gt;</code> elements. Check <strong>"Use numbered &lt;c01&gt;–&lt;c12&gt; elements"</strong> to switch to the numbered convention.</p>
      <p><strong>ArchivesSpace:</strong> Accepts both. Generic is the native default.</p>
      <p><strong>AtoM:</strong> Accepts both. Generic works fine (confirmed via QubitXmlImport source code).</p>
      <p><strong>CONTENTdm:</strong> Numbered convention is required and enforced — the toggle is locked to on.</p>
    `,
  },
  'cache-and-carry': {
    title: 'Cache &amp; Carry Import',
    content: `
      <p>If you use Cache &amp; Carry (the offline collections management system), check <strong>"Cache &amp; Carry field mapping"</strong> to automatically pre-fill column mappings from a Cache &amp; Carry CSV export.</p>
      <p>The mapping is:</p>
      <ul>
        <li><code>accession_number</code> → <code>unitid</code></li>
        <li><code>object_name_aat_uri</code> → <code>unittitle</code></li>
        <li><code>description</code> → <code>scopecontent</code></li>
        <li><code>materials_techniques</code> / <code>measurements</code> → <code>physdesc</code></li>
        <li><code>created_at</code> → <code>unitdate</code></li>
        <li><code>nagpra_flagged</code> / <code>secret_sacred_flag</code> → <code>accessrestrict</code></li>
      </ul>
    `,
  },
  'validation-errors': {
    title: 'Validation &amp; Export',
    content: `
      <p>Step 3 runs 8 validation rules against your data before generating the XML:</p>
      <dl>
        <dt><strong>Required fields</strong> (Error)</dt>
        <dd>Every row must have <code>unitid</code> or <code>unittitle</code>.</dd>
        <dt><strong>ISO 8601 dates</strong> (Error)</dt>
        <dd>Dates must match YYYY or YYYY/YYYY format. Strict for ArchivesSpace and AtoM.</dd>
        <dt><strong>Chronological order</strong> (Error)</dt>
        <dd>Start year must be &le; end year.</dd>
        <dt><strong>Extent format</strong> (Warning/Error)</dt>
        <dd>Must start with a digit + space (e.g., "12 linear feet").</dd>
        <dt><strong>Duplicate unitid</strong> (Error)</dt>
        <dd>No two rows can share the same identifier.</dd>
      </dl>
      <p>The export button is disabled until all fatal errors are resolved. Warnings can be overridden.</p>
    `,
  },
  'about-ead': {
    title: 'About EAD',
    content: `
      <p><strong>Encoded Archival Description (EAD)</strong> is the XML standard for encoding finding aids in archives and libraries.</p>
      <p>Cartulary supports two versions:</p>
      <dl>
        <dt><strong>EAD3</strong> (<code>http://ead3.archivists.org/schema/</code>)</dt>
        <dd>Current standard. Used by ArchivesSpace and most modern repositories.</dd>
        <dt><strong>EAD 2002</strong> (<code>urn:isbn:1-931666-22-9</code>)</dt>
        <dd>Legacy standard. Still required by AtoM and CONTENTdm.</dd>
      </dl>
      <p>Cartulary was named after a cartulary — a medieval manuscript register of charters and property records kept by monasteries. The oldest form of a finding aid.</p>
    `,
  },
  feedback: {
    title: 'Questions & Feedback',
    content: `
      <p>Have a question, found a bug, or want to suggest a feature?</p>
      <p><a href="https://github.com/mabo-du/cartulary/issues/new">Open an issue on GitHub</a> — no account needed to browse, though you'll need one to post.</p>
      <p>If you have CONTENTdm access and can help validate that preset, that would be especially valuable.</p>
    `,
  },
};
