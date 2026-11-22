# Tools

Deterministic operations that skills and experts call. `wiser/standards/primitives.md` owns the type and `wiser/standards/script-contract.md` owns the command contract. See `wiser/tools/RUNNING.md` for runtime and install consent. The directory is flat and the index is grouped by category.

### Documents

| Tool | Description |
|---|---|
| `Court Filing/TOOL.md` | Compose and check profiled court filings from Markdown and caption data, using profile-defined document types and filing blocks |

### Reference

| Tool | Description |
|---|---|
| `Jurisdictions/TOOL.md` | List and validate jurisdiction packs, match a matter's declared forum and governing law, and flag sources due for rereading |

## Installing

| Tool needing no install | Reason |
|---|---|
| `Court Filing` `help`, `profiles` and `check` without install | These commands use Node built-ins. |
| `Jurisdictions` | All commands use Node built-ins. |

`compose` and `validate` share Marked 12.0.2. Validation also uses `pdfinfo`, `pdftotext`, `pdffonts`, `pdftohtml`, `pdfimages` and `pdftoppm` from Poppler on PATH. The tool surveys Poppler programs without installing them. The first command needing Marked can install that package with the plugin's install consent. `check --install` can prepare Marked. The download comes from `registry.npmjs.org`. Chromium for `render pdf` and packages for `word-document` are covered by `wiser/tools/AGENTS.md`.

## Everything the tool writes, and where

| What | Where | Which commands |
|---|---|---|
| Pinned Marked runtime package | `node_modules/` in the installed Court Filing directory | `compose`, `validate`, `check --install` on a permitted install |
| npm cache and logs | npm's configured cache, `~/.npm` by default | Package install |
| Install consent markers | `.wiser-consent` in the platform user-config directory from `wiser/gateway/SETUP.md` and the matching Legal plugin copy | Package install with newly supplied consent |
| Court filing HTML | The fresh caller-named absolute `--out` outside the tool. A temporary sibling is removed after ordinary success or failure. | `compose` |
