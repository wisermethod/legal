# Jurisdiction pack format

A pack can cover governing law, forums, or both. Files are UTF-8. JSON objects use the keys listed below, once each. These paths are relative to the Jurisdictions tool directory.

```text
packs/<id>/pack.json
packs/<id>/law/<area>.json
packs/<id>/forum/<forum-id>.json
packs/<id>/excerpts/<name>.txt
```

A matter's own packs live at `<matter folder>/jurisdictions/<pack-id>/` and use the same paths within each pack. The matter folder holds the `AGENTS.md` passed to `--matter`. Use `validate --matter <absolute-AGENTS.md>` or `stale --matter <absolute-AGENTS.md>` to check all packs there, or `--pack <absolute-directory>` to check one. Use one selection flag at a time.

## Manifest

| Key | Value |
|---|---|
| `id` | Pack directory name. IDs use groups of lowercase letters and digits joined by single hyphens. |
| `name` | Nonblank display name. |
| `kind` | `state`, `federal` or `arbitration-forum`. |
| `law_match` | Nonempty array of patterns for `Law named`. Required when `law` contains an entry. Omit for a pack with no law half. |
| `law` | Array of `{ "area", "file" }` objects, one per covered area. An area is `contract`, `employment`, `consumer` or `personal-injury`. Its `file` is `law/<area>.json`. Use `[]` for no law half. |
| `forums` | Array of `{ "id", "name", "tier", "court_match", "file" }` objects. Use `[]` for no forum half. |

Each forum's `id` is unique in its pack and uses the pack ID syntax. Its `name` and `tier` are nonblank text. Describe the tier in words, such as “general-jurisdiction trial court”, “federal district court” or “arbitration forum”. The `court_match` value is a nonempty array of patterns for `Court or forum`. The `file` value is `forum/<forum-id>.json`.

## Matching

`resolve` returns the matter's records first, then looks for matches in the matter's own packs, then in the shipped packs. Its matter pack matches and age prompts carry `own_pack: true` and the absolute `pack_directory`. Shipped results carry `own_pack: false`. A matter pack match lists any displaced shipped pack IDs in `set_aside`.

Use nonblank JavaScript regular expression strings without delimiter slashes or flags. Each pattern is wrapped as `^(?:<pattern>)$` and matched case-insensitively. A literal `]` at the start of a class can be written `\]`. The compiler refuses an unbounded quantifier (`+`, `*` or `{n,}`) on a group containing an unbounded quantifier or an alternation. From a trimmed court name, the resolver strips a trailing labeled case or reference token or a docket-number token. An unqualified `No.` marks a case reference when the number contains a hyphen, colon or slash. Numbered courts and divisions stay in the name. The full declaration value can also match a literal court pattern that includes the reference. Multiple matching forums are an error among the matter packs, or among the shipped packs if no matter pack matches.

The resolver searches eligible law names in the matter packs before considering a shipped match. For each claim the resolver first tries the whole law name. It also recognizes a leading law name followed by a comma, semicolon, `except`, `unless` or `subject to`. It tries the longest eligible name first. When a leading name matches, the entire cell is returned as the exception and the result is held for review. If more than one pack in the first group to yield a match covers the selected law name, resolution fails and names the packs.

## Half files

Both halves require a `statements` array. A forum also requires `filing_profile`, a Court Filing profile ID-shaped string or `null`, and `obtain`, an array of nonblank source names the matter must supply, such as local rules or a judge's practice standards. The tool reports the profile ID as recorded in the pack. The matter's declared `Filing profile` governs. The pack's `filing_profile` is only a suggestion.

## Statements

| Key | Value |
|---|---|
| `id` | Nonblank statement identifier, unique across all halves of the pack. |
| `text` | Nonblank statement of a sourced rule. Leave application to the facts of a matter to the person. |
| `source` | Object with a nonblank `citation`, the publication's title and section, and, where the source has one, an absolute HTTP or HTTPS `url` without embedded credentials. |
| `state` | `Verified` or `[verify]`. |
| `last_read` | Real calendar date in `YYYY-MM-DD` form. |
| `excerpt` | Pack-relative path `excerpts/<name>.txt`, unique across all halves of the pack. Use a single filename under `excerpts/`. |

A `Verified` statement requires a nonempty saved official excerpt. The first line must equal `source.url`, or `source.citation` where the source has no `url`, and the second must equal `last_read`. Save the quoted official text below those lines. A `[verify]` statement still requires the excerpt path. Its file may be absent, and validation reports the statement as a gap.

Validation checks local structure, references and excerpt headers. Use the cited authority to establish the rule and the accuracy of the saved excerpt. The age check counts whole calendar days and prompts for rereading when the age is strictly greater than the configured limit.
