# Cartulary

**Spreadsheet → EAD3 / EAD 2002 XML Finding Aid Converter**

A private, client-side tool that converts archival spreadsheets (`.xlsx`, `.xls`, `.csv`) into valid EAD3 or EAD 2002 XML finding aids for submission to institutional repositories. No server, no accounts, no data uploaded — everything runs in your browser.

---

## Key Features

- **Three-step wizard** — Upload your spreadsheet, map columns to EAD fields, validate and export
- **Three hierarchy modes** — Level column, dotted component IDs, or explicit `parent_id` column
- **Repository presets** — ArchivesSpace (EAD3), AtoM (EAD 2002), CONTENTdm (EAD 2002, research-backed)
- **Composite date mapping** — Map start date + end date + date expression → ISO 8601 `<unitdate>`
- **Built-in validation** — 8 rule checks with row-referenced errors (required fields, ISO dates, extent format, duplicates, chronology, more)
- **Example template** — Pre-populated spreadsheet with sample data for all three hierarchy modes
- **Numbered `<c>` toggle** — Switch between generic `<c @level>` and numbered `<c01>`–`<c12>` output
- **Cache & Carry import** — One-click field mapping for Cache & Carry CSV exports
- **Web Worker parsing** — Large files (>50 KB) parsed in a background thread — UI stays responsive
- **Desktop app** — Tauri wrapper for native Linux, macOS, and Windows builds
- **Zero server** — All processing happens in the browser. No data storage, no accounts, no telemetry

---

## Tech Stack

| Layer | Choice |
|---|---|---|
| Language | TypeScript 6.0 |
| Bundler | Vite 8 |
| Spreadsheet parsing | SheetJS (xlsx) 0.18 |
| XML generation | xmlbuilder2 4.0 |
| Desktop wrapper | Tauri 2 |
| Hosting | GitHub Pages (static site) |
| Dev server port | 50001 |

---

## Prerequisites

- **Node.js 20+** and **npm** (or pnpm)
- A browser (Chrome, Firefox, Safari, Edge — any modern browser)

No database. No server runtime. No API keys.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mabo-du/cartulary.git
cd cartulary
```

### 2. Install Dependencies

```bash
npm install
```

This installs Vite, TypeScript, SheetJS (`xlsx`), and `xmlbuilder2`.

### 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:50001/cartulary/](http://localhost:50001/cartulary/) in your browser.

### 4. Production Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server:

```bash
npm run preview
```

Opens at [http://localhost:50001/cartulary/](http://localhost:50001/cartulary/).

---

## Architecture

### Directory Structure

```
cartulary/
├── public/
│   ├── 404.html               # SPA redirect for GitHub Pages
│   └── example-finding-aid.xlsx  # Example spreadsheet download
├── public/
│   ├── 404.html               # SPA redirect for GitHub Pages
│   └── example-finding-aid.xlsx  # Example spreadsheet download
├── src/
│   ├── main.ts                 # Entry point
│   ├── style.css               # Application styles (dark earthtone)
│   ├── types.ts                # Shared interfaces
│   ├── env.d.ts                # Ambient type declarations
│   ├── lib/
│   │   ├── parser/
│   │   │   ├── spreadsheet.ts  # SheetJS parsing + merged cell normalization
│   │   │   ├── parse-worker.ts # Web Worker for background parsing
│   │   │   ├── preview.ts      # 25-row preview slice
│   │   │   └── encoding.ts     # BOM prepend + codepage fallback
│   │   ├── hierarchy/
│   │   │   ├── shared.ts       # Taxonomy rank map
│   │   │   ├── level-column.ts # Stack-based hierarchy algorithm
│   │   │   ├── dotted-ids.ts   # Prefix-based hierarchy algorithm
│   │   │   ├── parent-id.ts    # Adjacency-list two-pass algorithm
│   │   │   └── cycle-detect.ts # Iterative DFS cycle detection
│   │   ├── generator/
│   │   │   ├── ead3.ts         # EAD3 XML generation with xmlbuilder2
│   │   │   ├── ead2002.ts      # EAD 2002 serializer (AtoM)
│   │   │   └── sanitize.ts     # Nokogiri ampersand workaround
│   │   ├── validator/
│   │   │   └── rules.ts        # 8 validation rules with row references
│   │   └── presets/
│   │       └── config.ts       # Repository preset configurations
│   └── ui/
│       ├── wizard.ts           # Three-step wizard controller
│       ├── state.ts            # Application state management
│       ├── step-upload.ts      # Step 1: Upload + preview
│       ├── step-map.ts         # Step 2: Column mapper + control form
│       └── step-export.ts      # Step 3: Validation + export
├── src-tauri/
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Desktop window configuration
│   └── src/
│       ├── main.rs             # Tauri entry point
│       └── lib.rs              # Tauri plugin setup
├── docs/
│   ├── Scope.md                # Project scope document
│   ├── research-papers/        # 4 deep-research papers on EAD3
│   ├── research-prompts/       # Research prompts that generated the papers
│   └── superpowers/specs/      # Design specification
├── .github/workflows/
│   ├── deploy.yml              # GitHub Pages deployment
│   └── release.yml             # Cross-platform release builds
├── scripts/
│   └── generate-example.ts     # Example spreadsheet generator
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Data Flow

```
[.xlsx / .csv File]
        │
        ├── [<50 KB] → parseSpreadsheet() — main thread
        └── [≥50 KB] → Web Worker — background thread
        │
        ▼
  getPreviewSlice() ────► Step 1 Preview Table
        │
        ▼
  [JSON rows with __rowNum__]
        │
        ▼
  Level Column │ Dotted IDs │ parent_id
        │
        ▼
  [EADNode Tree] ──── detectCycles()
        │
        ├──► [ArchivesSpace] ──► generateEAD3() ──► [EAD3 XML]
        │
        ├──► [AtoM] ──────────► generateEAD2002() ──► [EAD 2002 XML]
        │
        └──► validateTree() ────► ValidationError[]
                  │
                  └──► Step 3 Error Panel
```

### Key Technical Decisions

- **EAD3 namespace**: `http://ead3.archivists.org/schema/` with schema at `https://www.loc.gov/ead/ead3.xsd`. Confirmed against the official LoC XSD during Phase 0.
- **Component convention**: Generic `<c level="...">` by default. ArchivesSpace accepts both `<c>` and `<c01>`–`<c12>`; the serializer has a configurable flag.
- **xmlbuilder2 namespace pattern**: Must use `defaultNamespace` in `create()`. Using `.att()` alone causes spurious `xmlns=""` on child elements.
- **Iterative DFS**: All tree traversals are iterative (not recursive) to prevent call-stack overflow on deeply nested collections.
- **Validation against parsed JSON**: Rules run on the parsed row array (not the generated XML), keeping validation fast and mapping errors directly to spreadsheet rows.
- **SheetJS vulnerabilities**: Known prototype pollution and ReDoS in SheetJS Community Edition. Acceptable in client-side-only context where users process their own files.

---

## Available Scripts

| Command | Description |
|---|---|---|
| `npm run dev` | Start Vite dev server on port 50001 |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run tauri dev` | Launch Tauri desktop app in development mode |
| `npm run tauri build` | Build native desktop binary for current platform |
| `npx tsx scripts/generate-example.ts` | Regenerate the example spreadsheet |

---

## Repository Presets

| Preset | Format | Status |
|---|---|---|---|
| ArchivesSpace | EAD3 | ✅ Complete |
| AtoM (Access to Memory) | EAD 2002 | ✅ Complete (research-optimised) |
| CONTENTdm | EAD 2002 | ✅ Complete (research-backed profile) |

### Preset Differences

| Rule | ArchivesSpace | AtoM | CONTENTdm |
|---|---|---|---|---|
| ISO 8601 dates | Error (strict) | Error (strict) | Error (date mangling bug) |
| Extent format (digit + space) | Error | Warning | Warning |
| Chronological order | Error | Error | Warning |
| `@audience="internal"` | Error (blocked) | Off | Warning |
| Nokogiri ampersand sanitization | Active | Active (libxml2 bug) | Off |
| Component convention | Generic `<c>` (configurable) | Generic `<c>` (accepts both) | Numbered `<c01>` **required** |
| Namespace stripping | Off | Off | **On** (`xmlns:xlink` kills parser) |
| Schema location | Included | Suppressed (network DTD fails) | Included |
| `@relatedencoding` | N/A | `ISAD(G)v2` | N/A |

---

## Testing

This is a client-side browser app. Testing is manual:

1. **`npm run dev`** — start the dev server
2. Open [http://localhost:50001/cartulary/](http://localhost:50001/cartulary/)
3. Drop the example spreadsheet (`public/example-finding-aid.xlsx`) onto the upload zone
4. Map columns, select a preset, and export

The TypeScript compiler (`tsc`) runs as part of the build, providing static analysis:

```bash
npm run build        # tsc + vite build (full check)
npx tsc --noEmit     # type-check only (no output = clean)
```

---

## Deployment

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Checks out the code
2. Installs dependencies with `npm ci`
3. Runs a production build
4. Uploads `dist/` as a Pages artifact
5. Deploys to GitHub Pages

To enable:

1. Go to **Settings → Pages** in the GitHub repo
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow runs automatically

The site will be available at `https://<your-username>.github.io/cartulary/`.

**Note:** GitHub Pages on private repositories requires a Pro/Team plan. The workflow is configured and ready — it will deploy once the repo visibility is set to public or the plan is upgraded.

### Any Static Host

The production build outputs to `dist/`. Serve these files from any static host (Netlify, Vercel, S3, Nginx, Apache):

```bash
npm run build
# Upload dist/* to your host
```

---

## Desktop App (Tauri)

Cartulary includes a Tauri v2 desktop wrapper for native Linux, macOS, and Windows builds.

### Prerequisites

- **Rust** — Install via [rustup](https://rustup.rs/)
- **Linux**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### Development

```bash
npm run tauri dev
```

This starts the Vite dev server and opens a native window pointing at it.

### Production Build

```bash
npm run tauri build
```

Output goes to `src-tauri/target/release/` — a native binary for your current platform.

### Cross-Platform Releases

Push a `v*` tag to trigger the release workflow (`.github/workflows/release.yml`):

```bash
git tag v0.1.0
git push origin v0.1.0
```

This produces:

| Asset | Platform |
|---|---|
| `cartulary-linux-amd64` | Linux x86_64 |
| `cartulary-macos-amd64` | Intel Mac |
| `cartulary-macos-arm64` | Apple Silicon |
| `cartulary-windows-amd64.exe` | Windows x86_64 |
| `cartulary-web.zip` | Browser version (any platform) |

---

## Environment Variables

None. Cartulary has no backend, no API keys, no configuration beyond what's in `vite.config.ts`.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BASE` (in vite.config.ts) | `/cartulary/` | Base path for asset URLs |
| Dev server port | `50001` | Local development access |

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `tsc` errors | Type violation | Check types, run `npx tsc --noEmit` to diagnose |
| xmlbuilder2 warnings in build | Node.js modules externalized for browser | Harmless — core XML building works without Node shims |
| SheetJS can't parse file | Encoding or format issue | Try CSV export from spreadsheet app, or use the example template |
| Drop zone doesn't respond | JavaScript error in console | Check browser console, file an issue |
| `npm run dev` fails on port 50001 | Port in use | Change the port in `vite.config.ts` |
| Web Worker parse fails silently | Browser doesn't support Workers | Falls back to main-thread parsing automatically |
| Tauri build fails | Missing Rust or system deps | Install Rust + `libwebkit2gtk-4.1-dev` on Linux |
| Cache & Carry import not mapping | Column names don't match expected fields | Check your CSV export columns; mapping uses case-insensitive partial matching |

---

## License

Private — not yet open-sourced. All rights reserved.

## Credits

Built with research support from four deep-research documents on EAD3 standards, SheetJS parsing, xmlbuilder2 generation, and repository import profiles (ArchivesSpace, AtoM, CONTENTdm).
