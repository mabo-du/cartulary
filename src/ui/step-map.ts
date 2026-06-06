/** step-map.ts — Step 2: Column mapper and control form.
 *
 * exports:
 *   renderStep2(state): string — HTML for the mapping step
 *
 * used_by: wizard.ts → step rendering dispatch
 * rules:   Tier 1 fields always visible. Tier 2 in collapsible section.
 *          Display EAD element names, not generic labels.
 *          Composite date mapping (startDate, endDate, dateExpression → unitdate).
 * agent:   deepseek-v4-flash | 2026-06-07 | Created column mapper step
 */

import type { AppState } from './state';

interface FieldDef {
  eadField: string;
  tier: 1 | 2;
  dacsRule?: string;
  description: string;
  example: string;
  required: boolean;
}

const TIER1_FIELDS: FieldDef[] = [
  { eadField: 'unitid', tier: 1, dacsRule: '2.1', description: 'Unique identifier for the archival unit', example: 'MC-001', required: true },
  { eadField: 'unittitle', tier: 1, dacsRule: '2.3', description: 'Title or name of the archival unit', example: 'Marcus Collection', required: true },
  { eadField: 'unitdate', tier: 1, dacsRule: '2.4', description: 'Date(s) of the materials in ISO 8601 format', example: '1920/1940', required: false },
  { eadField: 'level', tier: 1, description: 'Hierarchical position in the finding aid tree', example: 'collection, series, file, item', required: true },
  { eadField: 'physdesc', tier: 1, dacsRule: '2.5', description: 'Physical extent and format of the materials', example: '12 linear feet', required: false },
  { eadField: 'scopecontent', tier: 1, dacsRule: '3.1', description: 'Narrative description of the materials and their content', example: 'Personal papers and correspondence...', required: false },
  { eadField: 'accessrestrict', tier: 1, dacsRule: '4.1', description: 'Conditions governing access to the materials', example: 'Collection open for research.', required: false },
  { eadField: 'userestrict', tier: 1, description: 'Conditions governing use after access is granted', example: 'Copyright held by the university.', required: false },
  { eadField: 'langmaterial', tier: 1, dacsRule: '4.5', description: 'Language(s) represented in the materials', example: 'English, German', required: false },
];

const TIER2_FIELDS: FieldDef[] = [
  { eadField: 'originator', tier: 2, dacsRule: '2.6', description: 'Person or organization that created the collection', example: 'Marcus, John (1885–1972)', required: false },
  { eadField: 'bioghist', tier: 2, dacsRule: '2.7', description: 'Biographical note about the creator or historical context', example: 'John Marcus was a merchant...', required: false },
  { eadField: 'relatedmaterial', tier: 2, description: 'Related collections or materials in other repositories', example: 'Marcus Family Papers, Univ. of Washington', required: false },
  { eadField: 'altformavail', tier: 2, description: 'Availability of materials in other formats', example: 'Also available on microfilm.', required: false },
  { eadField: 'geogname', tier: 2, description: 'Geographic location or place name', example: 'Pacific Northwest', required: false },
];

/** Composite date sub-fields (mapped to unitdate block) */
const DATE_SUBFIELDS = [
  { field: 'startDate', label: 'Start Date', description: 'Earliest date (ISO 8601 year)' },
  { field: 'endDate', label: 'End Date', description: 'Latest date (ISO 8601 year)' },
  { field: 'dateExpression', label: 'Date Expression', description: 'Free-text date (e.g. "circa 1920s")' },
];

export function renderStep2(state: AppState): string {
  const cols = state.columns || [];

  return `
    <div class="mapper-layout">
      <div class="mapper-controls">
        ${renderPresetSelector(state)}
        ${renderHierarchySelector(state)}
        ${renderControlForm(state)}
      </div>
      <div class="mapper-fields">
        <h3>EAD Field Mapping</h3>
        <p class="mapper-hint">Map your spreadsheet columns to EAD3 fields.</p>
        ${renderFieldGroup('Required Fields (Tier 1)', TIER1_FIELDS, cols, state)}
        ${renderTier2Section(cols, state)}
        ${renderDateMapping(cols, state)}
      </div>
      <div class="mapper-actions">
        <button type="button" class="btn btn-primary" id="step2-next">
          Validate &amp; Export →
        </button>
      </div>
    </div>
  `;
}

function renderPresetSelector(state: AppState): string {
  const usingNumbered = state.mappings['_numberedCs'] === 'true';
  return `
    <div class="control-group">
      <label for="preset-select">Repository Preset</label>
      <select id="preset-select">
        <option value="archivesspace" ${state.presetName === 'archivesspace' ? 'selected' : ''}>ArchivesSpace (EAD3)</option>
        <option value="atom" ${state.presetName === 'atom' ? 'selected' : ''}>AtoM (EAD 2002)</option>
        <option value="contentdm" ${state.presetName === 'contentdm' ? 'selected' : ''} disabled>CONTENTdm (Coming soon)</option>
      </select>
    </div>
    <div class="control-group">
      <label class="checkbox-label">
        <input type="checkbox" id="numbered-cs-toggle" ${usingNumbered ? 'checked' : ''} />
        Use numbered <code>&lt;c01&gt;</code>–<code>&lt;c12&gt;</code> elements
      </label>
      <span class="field-desc">Off by default. ArchivesSpace and AtoM accept both conventions.</span>
    </div>
    <div class="control-group">
      <label class="checkbox-label">
        <input type="checkbox" id="cache-and-carry-preset" />
        Cache &amp; Carry field mapping
      </label>
      <span class="field-desc">Pre-fills mappings for Cache &amp; Carry CSV exports.</span>
    </div>
  `;
}

function renderHierarchySelector(state: AppState): string {
  return `
    <div class="control-group">
      <label>Hierarchy Mode</label>
      <div class="radio-group">
        <label class="radio">
          <input type="radio" name="hierarchy-mode" value="level-column" ${state.hierarchyMode === 'level-column' ? 'checked' : ''} />
          Level Column
        </label>
        <label class="radio">
          <input type="radio" name="hierarchy-mode" value="dotted-ids" ${state.hierarchyMode === 'dotted-ids' ? 'checked' : ''} />
          Dotted Component IDs
        </label>
        <label class="radio">
          <input type="radio" name="hierarchy-mode" value="parent-id" ${state.hierarchyMode === 'parent-id' ? 'checked' : ''} />
          parent_id Column
        </label>
      </div>
    </div>
  `;
}

function renderControlForm(state: AppState): string {
  const c = state.controlData;
  return `
    <div class="control-group">
      <label for="finding-aid-title">Finding Aid Title *</label>
      <input type="text" id="finding-aid-title" value="${escHtml(c.findingAidTitle)}" placeholder="e.g. Papers of John Smith" />
    </div>
    <div class="control-group">
      <label for="agency-name">Agency / Institution Name *</label>
      <input type="text" id="agency-name" value="${escHtml(c.agencyName)}" placeholder="e.g. University Archives" />
    </div>
    <div class="control-group">
      <label for="record-id">Record ID</label>
      <input type="text" id="record-id" value="${escHtml(c.recordId)}" />
    </div>
  `;
}

function renderFieldGroup(
  title: string,
  fields: FieldDef[],
  cols: string[],
  state: AppState,
): string {
  return `
    <div class="field-group">
      <h4>${title}</h4>
      ${fields.map((f) => renderFieldRow(f, cols, state)).join('')}
    </div>
  `;
}

function renderTier2Section(cols: string[], state: AppState): string {
  return `
    <details class="tier2-section">
      <summary>Recommended Fields (Tier 2)</summary>
      <div class="field-group">
        ${TIER2_FIELDS.map((f) => renderFieldRow(f, cols, state)).join('')}
      </div>
    </details>
  `;
}

function renderFieldRow(field: FieldDef, cols: string[], state: AppState): string {
  const currentVal = state.mappings[field.eadField] || '';
  const isCompositeDate = field.eadField === 'unitdate';

  const tooltipId = `tooltip-${field.eadField}`;

  return `
    <div class="field-mapping" data-ead-field="${field.eadField}">
      <label class="field-label" aria-describedby="${tooltipId}">
        <code>${escHtml(field.eadField)}</code>
        ${field.dacsRule ? `<span class="dacs-rule">DACS ${field.dacsRule}</span>` : ''}
        ${field.required ? '<span class="required-badge">Required</span>' : ''}
        <span class="field-desc">${escHtml(field.description)}</span>
        <span class="tooltip-trigger" tabindex="0" role="button" aria-label="More information about ${escHtml(field.eadField)}">ⓘ</span>
        <span class="tooltip-text" id="${tooltipId}" role="tooltip">
          <span class="tooltip-label">${escHtml(field.eadField)}</span>
          ${field.dacsRule ? `<span class="tooltip-dacs">DACS Rule ${field.dacsRule}</span>` : ''}
          <span class="tooltip-desc">${escHtml(field.description)}</span>
          <span class="tooltip-example">Example: <code>${escHtml(field.example)}</code></span>
        </span>
      </label>
      ${isCompositeDate ? renderDateComposite(cols, state) : renderColumnSelect(field.eadField, cols, currentVal)}
    </div>
  `;
}

function renderColumnSelect(
  eadField: string,
  cols: string[],
  currentVal: string,
): string {
  return `
    <select data-ead-field="${eadField}" class="column-select">
      <option value="">— not mapped —</option>
      ${cols.map((c) => `<option value="${escHtml(c)}" ${c === currentVal ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
    </select>
  `;
}

function renderDateComposite(cols: string[], state: AppState): string {
  return `
    <div class="date-composite">
      ${DATE_SUBFIELDS.map(
        (df) => `
        <div class="date-subfield">
          <label class="subfield-label">${escHtml(df.label)}</label>
          ${renderColumnSelect(df.field, cols, state.mappings[df.field] || '')}
          <span class="subfield-desc">${escHtml(df.description)}</span>
        </div>
      `,
      ).join('')}
    </div>
  `;
}

function renderDateMapping(cols: string[], state: AppState): string {
  return `
    <div class="field-group">
      <h4>Composite Date Mapping</h4>
      <p class="field-desc">Map date sub-fields to build the <code>&lt;unitdate&gt;</code> element with ISO 8601 <code>@normal</code> attribute.</p>
      ${DATE_SUBFIELDS.map(
        (df) => `
        <div class="field-mapping">
          <label class="field-label">
            <code>${escHtml(df.field)}</code>
            <span class="field-desc">${escHtml(df.description)}</span>
          </label>
          ${renderColumnSelect(df.field, cols, state.mappings[df.field] || '')}
        </div>
      `,
      ).join('')}
    </div>
  `;
}

function escHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}
