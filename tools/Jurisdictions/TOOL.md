---
name: Jurisdictions
type: tool
category: reference
description: List and validate jurisdiction packs, match a matter's declared forum and governing law, and flag sources due for rereading
version: 0.2.0
runs: local
gaps:
  - No jurisdiction pack ships yet.
---

# Jurisdictions

## Context

Apply the legal plugin's [Standing constraint](../../AGENTS.md#standing-constraint). Use a pack for sourced rules. Leave the application of those rules to the matter's facts to the person. The matter's own records take precedence over any pack.

No jurisdiction pack ships yet. A matter can still resolve its own rules path and see what the pack lookup found.

A matter's own packs live at `<matter folder>/jurisdictions/<pack-id>/`, in the shipped pack format. The matter folder holds the `AGENTS.md` passed to `--matter`. `resolve` returns the matter's records first, then looks for matches in the matter's packs, then in the shipped packs. A matter pack takes precedence over a shipped match for the forum or governing law.

Classifier seam: none.

## Inputs

For `resolve`, pass the absolute path to the matter's `AGENTS.md` and use the declaration written there. For `validate` and `stale`, the optional `--pack` takes a shipped ID or an absolute directory. Load the [pack format](schema/pack-format.md) before authoring or correcting a pack. The scripts follow `wiser/system/templates/Script Contract.md`.

Use `validate --matter <absolute-AGENTS.md>` or `stale --matter <absolute-AGENTS.md>` to check every pack in that matter's `jurisdictions/` directory. Choose at most one of `--matter` and `--pack`.

## Commands

Run from the tool directory with Node. All commands run locally and need no package install.

| Invocation | Result |
|---|---|
| `node scripts/jurisdictions.js help` or `--help` | Print usage. Each command also accepts `help` or `--help` by itself. |
| `node scripts/jurisdictions.js list` | List the shipped packs and their coverage. When none ships, the result is `{"packs":[]}`. |
| `node scripts/jurisdictions.js validate [--pack <id-or-absolute-directory> \| --matter <absolute-AGENTS.md>]` | Check every selected pack and its referenced files. Omit both selection flags to check every shipped pack. |
| `node scripts/jurisdictions.js resolve --matter <absolute-AGENTS.md>` | Resolve matter records, forum and governing law. Return age prompts and `[verify]` gaps for the selected half files. |
| `node scripts/jurisdictions.js stale [--pack <id-or-absolute-directory> \| --matter <absolute-AGENTS.md>] [--today YYYY-MM-DD] [--days N]` | List sources last read more than `N` days ago. Defaults are every shipped pack, the local calendar date and 180 days. |

## Output

Successful work commands print one JSON object. `list` returns `packs`, an array of objects with `id`, `name`, `kind`, a `law` array of practice areas, and a `forums` array with each forum's `id`, `name` and `tier`. `validate` returns `ok`, `packs` (the IDs checked), `failures` and `gaps`. Each validation finding names `pack`, `file` relative to the pack, statement `id` (null for a finding outside a named statement) and `reason`.

`resolve` and `stale` check excerpts by the same rules as `validate`. A missing, empty or wrong-header `Verified` excerpt makes its half file unusable. A `[verify]` gap leaves the exit code unchanged.

### Resolve result

| Field | Shape and use |
|---|---|
| `declaration` | Field names from the declaration table, each with `value` and `source_and_date`, or the string `"missing"`. When missing, use the parties record to establish the forum. |
| `matter_records` | The declared rules location as `{path, exists}`, or an empty array. Use the matter records first. An entry with `exists: false` identifies the path the matter names and still needs to supply. |
| `forum` | `pack`, `id`, `name`, absolute `file`, `tier`, `filing_profile` and `obtain`, or `{status: "none", reason}`. Use `obtain` to identify sources the matter needs to supply. |
| `governing_law` | One result per claim-table row with `claim`, `law_named`, `clause_and_document` and `source_and_date`. A match adds `pack` and absolute `files`. An unmatched row adds `status: "none"` and `reason`. With `held: true`, keep the `matched_law` and `exception` text and leave its effect for the person's decision. |
| `stale` | Age prompts for returned half files, reported once per statement even when multiple claims match the same pack. |
| `gaps` | `[verify]` findings for returned half files, once per statement, with `pack`, absolute `file`, statement `id` and `reason`. |
| `invalid_packs` | Validation failures for skipped matter or shipped packs. Each entry gives `pack`, `own_pack` and `failures`. Matter entries also give the absolute `pack_directory`. When the manifest's usable patterns match the declaration, `matches` gives a `forum` boolean and a `governing_law` array of zero-based claim row indexes. |

Resolution continues with valid matches. If a needed shipped half fails validation and no valid match is available for that court or law, resolution exits 1 with the half's failures. Two valid overlapping matches in the group used to resolve a court or law still fail.

Forum and law matches and their age prompts and gaps carry `own_pack: true` and the absolute `pack_directory` for a matter pack. Shipped results carry `own_pack: false`. When a matter match takes precedence, that forum or law result includes `set_aside`, an array of shipped pack IDs.

### Age prompts

`stale` returns an object with a `prompts` array. Each prompt has `pack`, absolute `file`, statement `id` and `message` in the form `confirm: last read <date>`. Re-read the source when a prompt appears. Age alone leaves the exit code at 0.

## What it writes

Nothing. All commands are read-only.

## Errors

An invalid input exits 1 with stderr and empty stdout. For pack validation, use the JSON findings to locate and fix every reported failure. For overlapping matches, correct the patterns named in the error. For an escaping `Rules home`, record a path within the matter folder. If the intended command or input is unclear, confirm it before running.

The tool refuses a `jurisdictions/` directory or pack entry that resolves outside the matter folder and names it in the error.
