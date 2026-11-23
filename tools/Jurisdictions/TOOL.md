---
name: Jurisdictions
type: tool
category: reference
description: List and validate jurisdiction packs, match courts and governing law by declaration or name, and flag sources due for rereading
version: 0.2.0
runs: local
gaps:
  - Colorado district court [verify] topics include the scope of civil monetary jurisdiction, geographic venue and transfer, complaint pleading, cover sheet and summons, current docket fee, waiver forms and submission, electronic filing eligibility and mandates, process service interval and methods, proof of service, answer periods and the effect of a pre-answer motion, amendment as of right, case management and trial timing, additional conferral exceptions and consequences of noncompliance, settlement evidence, discovery response periods, and declaratory relief procedure.
  - Colorado county court [verify] topics include local complaint filing and electronic filing, the service interval and proof requirements, current docket fees, discovery scope, and when an appeal is heard de novo.
  - Colorado small claims [verify] topics include the official complaint form, filing and service, current docket fees, hearing wait, discovery availability, and scope of appeal.
  - The Colorado pack still needs official text for the unresolved parts of the Colorado Rules of Civil Procedure, including Rules 4, 8, 12, 15, 16.1, 26 through 37, 57 and 98, Rule 121 sections 1-15 and 1-26, and the 300 and 500 series, plus Colorado Rule of Evidence 408. The saved excerpts cover only the provisions they print. Current forms, local rules, division practice standards and applicable case orders are separate sources to obtain.
  - Colorado contract law [verify] topics include general reliance damages outside the sales code and whether Colorado adopted Hadley v. Baxendale by name.
  - Colorado employment law [verify] topics include owner liability and retaliation remedies under the 2025 wage amendments, the wage-claim administrative cap effective in 2026, the implied good-faith covenant in at-will employment, prevention of a compensation condition, individual arbitration and class or collective waivers, and mitigation of fixed severance.
  - The applicable 2025 and 2026 changes to Colorado court rules and fee statutes still need confirmation against official text. The enacted 2025 wage changes and the operative 2026 cap and its effective date remain unconfirmed.
  - Colorado consumer and personal injury law is covered only by the statements the pack holds. Any other issue in those areas still requires authority.
---

# Jurisdictions

## Context

Apply the legal plugin's [Standing constraint](../../AGENTS.md#standing-constraint). Use a pack for sourced rules. Leave the application of those rules to the matter's facts to the person. The matter's own records take precedence over any pack.

The shipped Colorado pack identifies district court, county court and small claims forums and four areas of state law. Each file holds sourced statements with their state and date read, and `validate` lists every `[verify]` statement as a gap.

A matter's own packs live at `<matter folder>/jurisdictions/<pack-id>/`, in the shipped pack format. The matter folder holds the `AGENTS.md` passed to `--matter`. `resolve` returns the matter's records first, then looks for matches in the matter's packs, then in the shipped packs. A matter pack takes precedence over a shipped match for the forum or governing law.

Classifier seam: none.

## Inputs

For `resolve`, pass the absolute path to the matter's `AGENTS.md` and use the declaration written there. For `validate` and `stale`, the optional `--pack` takes a shipped ID or an absolute directory. Load the [pack format](schema/pack-format.md) before authoring or correcting a pack. The scripts follow `wiser/system/templates/Script Contract.md`.

For `lookup`, pass `--court`, `--law` or both, once each. With `--matter <absolute-AGENTS.md>`, the file identifies the matter folder and its packs. Without `--matter`, the search covers shipped packs.

Use `validate --matter <absolute-AGENTS.md>` or `stale --matter <absolute-AGENTS.md>` to check every pack in that matter's `jurisdictions/` directory. Choose at most one of `--matter` and `--pack`.

## Commands

Run from the tool directory with Node. All commands run locally and need no package install.

| Invocation | Result |
|---|---|
| `node scripts/jurisdictions.js help` or `--help` | Print usage. Each command also accepts `help` or `--help` by itself. |
| `node scripts/jurisdictions.js list` | List the shipped packs and their coverage. When none ships, the result is `{"packs":[]}`. |
| `node scripts/jurisdictions.js validate [--pack <id-or-absolute-directory> \| --matter <absolute-AGENTS.md>]` | Check every selected pack and its referenced files. Omit both selection flags to check every shipped pack. |
| `node scripts/jurisdictions.js resolve --matter <absolute-AGENTS.md>` | Resolve matter records, forum and governing law. Return age prompts and `[verify]` gaps for the selected half files. |
| `node scripts/jurisdictions.js lookup [--court <court name>] [--law <law name>] [--matter <absolute-AGENTS.md>]` | Match explicit names without reading a matter declaration. Return age prompts and `[verify]` gaps for the selected half files. |
| `node scripts/jurisdictions.js stale [--pack <id-or-absolute-directory> \| --matter <absolute-AGENTS.md>] [--today YYYY-MM-DD] [--days N]` | List sources last read more than `N` days ago. Defaults are every shipped pack, the local calendar date and 180 days. |

## Output

Successful work commands print one JSON object. `list` returns `packs`, an array of objects with `id`, `name`, `kind`, a `law` array of practice areas, and a `forums` array with each forum's `id`, `name` and `tier`. `validate` returns `ok`, `packs` (the IDs checked), `failures` and `gaps`. Each validation finding names `pack`, `file` relative to the pack, statement `id` (null for a finding outside a named statement) and `reason`.

`resolve`, `lookup` and `stale` check excerpts by the same rules as `validate`. A missing, empty or wrong-header `Verified` excerpt makes its half file unusable. A `[verify]` gap leaves the exit code unchanged.

### Resolve result

| Field | Shape and use |
|---|---|
| `declaration` | Field names from the declaration table, each with `value` and `source_and_date`, or the string `"missing"`. When missing, use the parties record to establish the forum. |
| `matter_records` | The declared rules location as `{path, exists}`, or an empty array. Use the matter records first. An entry with `exists: false` identifies the path the matter names and still needs to supply. |
| `forum` | `pack`, `id`, `name`, absolute `file`, `tier`, `filing_profile` and `obtain`, or `{status: "none", reason}`. Use `obtain` to identify sources the matter needs to supply. |
| `governing_law` | One result per claim-table row with `claim`, `law_named`, `clause_and_document` and `source_and_date`. A match adds `pack` and absolute `files`. An unmatched row adds `status: "none"` and `reason`. With `held: true`, keep the `matched_law` and `exception` text and leave its effect for the person's decision. |
| `stale` | Age prompts for returned half files, reported once per statement even when multiple claims match the same pack. |
| `gaps` | `[verify]` findings for returned half files, once per statement, with `pack`, absolute `file`, statement `id` and `reason`. |
| `invalid_packs` | Validation failures for skipped matter or shipped packs. Each entry gives `pack`, `own_pack` and `failures`. Matter entries also give the absolute `pack_directory`. When the manifest's usable patterns identify affected matches, `matches` gives a `forum` boolean and a `governing_law` array of zero-based claim row indexes. |

A half-file failure leaves the valid forum or law matches available, including the other half of the same pack. If a matching shipped half fails validation and no valid forum or governing-law match remains, resolution exits 1 with the matching half's failures. Two valid overlapping matches in the group used to resolve a court or law still fail.

Forum and law matches and their age prompts and gaps carry `own_pack: true` and the absolute `pack_directory` for a matter pack. Shipped results carry `own_pack: false`. When a matter match takes precedence, that forum or law result includes `set_aside`, an array of shipped pack IDs.

### Lookup result

`lookup` uses the same matching, pack precedence, and errors as `resolve`, including the trailing case-reference strip and law exceptions.

| Field | Shape |
|---|---|
| `forum` | The same forum result as `resolve`. Present when `--court` is supplied. |
| `governing_law` | A one-row array with the same law result as `resolve`. `law_named` holds the supplied name. `claim`, `clause_and_document` and `source_and_date` are `null`. Present when `--law` is supplied. |
| `stale` and `gaps` | Age prompts and `[verify]` findings for returned files, with the same fields as `resolve`. |
| `invalid_packs` | The same validation diagnostics as `resolve`, or an empty array. Governing-law diagnostics refer to row `0` when the law name matches an invalid half. |

### Age prompts

`stale` returns an object with a `prompts` array. Each prompt has `pack`, absolute `file`, statement `id` and `message` in the form `confirm: last read <date>`. Re-read the source when a prompt appears. Age alone leaves the exit code at 0.

## What it writes

Nothing. All commands are read-only.

## Errors

An invalid input exits 1 with stderr and empty stdout. For pack validation, use the JSON findings to locate and fix every reported failure. For overlapping matches, correct the patterns named in the error. For an escaping `Rules home`, record a path within the matter folder. If the intended command or input is unclear, confirm it before running.

The tool refuses a `jurisdictions/` directory or pack entry that resolves outside the matter folder and names it in the error.
