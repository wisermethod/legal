# Tools

Deterministic operations that skills and experts call. `wiser/standards/primitives.md` owns the type and `wiser/standards/script-contract.md` owns the command contract. See `wiser/tools/RUNNING.md` for runtime and install consent. The directory is flat and the index is grouped by category.

### Documents

| Tool | Description |
|---|---|
| `Court Filing/TOOL.md` | Compose court filing HTML from Markdown and a validated caption, list jurisdiction profiles, or check a rendered PDF against those inputs |

## Installing

| Tool needing no install | Reason |
|---|---|
| `Court Filing` `help`, `profiles`, `check` without install, and `validate` | Node built-ins cover these commands. PDF validation requires `pdfinfo`, `pdftotext`, `pdffonts` and `pdftoppm` from Poppler on PATH; the tool surveys them and does not install them. |

`compose` needs Marked 12.0.2. The first command needing it can install it with the plugin's install consent. `check --install` can prepare the same dependency. The download comes from `registry.npmjs.org`. Chromium for `render pdf` and packages for `word-document` are covered by `wiser/tools/AGENTS.md`.

## Everything the tool writes, and where

| What | Where | Which commands |
|---|---|---|
| Pinned Marked runtime package | `node_modules/` in the installed Court Filing directory | `compose`, `check --install` on a permitted install |
| npm cache and logs | npm's configured cache, `~/.npm` by default | Package install |
| Install consent markers | `.wiser-consent` in the platform user-config directory from `wiser/gateway/SETUP.md` and the matching Legal plugin copy | Package install with newly supplied consent |
| Court filing HTML | The fresh caller-named absolute `--out` outside the tool. A temporary sibling is removed after ordinary success or failure. | `compose` |
