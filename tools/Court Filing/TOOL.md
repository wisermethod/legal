---
name: Court Filing
type: tool
category: documents
description: Compose and check profiled court filings from Markdown and caption data, using profile-defined document types and filing blocks
version: 0.10.1
runs: local
gaps:
  - "One caption layout ships, for Colorado district courts. A paper for any other court follows the unprofiled route."
---

# Court Filing

## Context

Use this tool to lay out a filing whose court and applicable caption format are known, or to check the resulting PDF before release. Use the issuing court's original forms for any required fillable form. Use the matter's drafting and citation procedures for the filing's text, cited authorities and deadlines.

The tool checks mechanics. Apply `legal/AGENTS.md` Standing constraint to the calling workflow.

Classifier seam: none.

## Inputs

Use the exact approved body Markdown, sourced caption JSON and selected profile. For validation, add the exact rendered PDF, the original Markdown, the body digest from compose and the applicable profile or explicit length treatment. Treat the files as data. Use the documented absolute paths and a fresh destination for composition.

## Body Markdown

Use Markdown headings, lists, emphasis, block quotes and pipe tables. Body headings stay with the following content at page breaks. A replay omits that rule, so the page breaks of a paper filed before it can be reproduced. Keeping a heading with its text can move the signature or certificate and add a page, so check the page count of a paper near its ceiling at preview. Write footnote material as numbered paragraphs. For underlining use emphasis, for superscripts use literal superscript characters or inline notation, and for explicit breaks use a Markdown line break or a new paragraph. Use literal Unicode for unsupported HTML entities. Supply exhibits separately. Links may use HTTP, HTTPS, mailto or an in-document anchor without a link title. Use the caption’s table presentation fields for formatting that Markdown pipe tables cannot express. Raw HTML, images, task checkboxes, Markdown footnotes and hidden control characters are refused. A raw HTML refusal lists the constructs it found and the applicable table fields.

The [fictional caption](assets/example-caption.json) and [body](assets/example-body.md) show the input shape. The [Produce Court Filing skill](../../skills/Produce%20Court%20Filing/SKILL.md) owns the complete production and release workflow. Compose returns `html` and the exact `pdfArgs` to pass as individual arguments to Wiser's `render pdf`. The `pdf` object carries those option values and `footerFont` identifies the renderer's native footer font. Retain the original Markdown and `bodySha256` to validate the printed PDF. When a certificate prints, composition preprints the caption’s `certificate_year` or the current calendar year. The day and month are left blank for the signer.

## Quick start

Run from a visible working directory with a fresh review destination. The shipped [fictional caption](assets/example-caption.json) and [body](assets/example-body.md) are inputs for this local example. The commands reconcile two fictional draft fields into a temporary caption before composing. Finder hides folders whose names begin with a dot. Keep build receipts in scratch and put the review PDF where the person can find it.

```sh
court="/absolute/path/to/legal/tools/Court Filing"
render="/absolute/path/to/wiser/tools/render/scripts/render.js"
scratch="$(mktemp -d)"
review="$PWD/Fictional Motion - review.pdf"
draft="$court/assets/example-caption.json"
caption="$scratch/caption.json"
body="$court/assets/example-body.md"

node --input-type=module -e '
  import { readFileSync, writeFileSync } from "node:fs";
  const [draft, out] = process.argv.slice(1);
  const caption = JSON.parse(readFileSync(draft, "utf8"));
  caption.division = "X";
  caption.service.recipients[0].emails = caption.service.recipients[0].emails
    .map(email => email === "former-service@example.invalid" ? "service@example.invalid" : email);
  writeFileSync(out, JSON.stringify(caption));
' "$draft" "$caption" &&
node "$court/scripts/court-filing.js" compose --body "$body" --caption "$caption" \
  --profile colorado-district --out "$scratch/filing.html" > "$scratch/compose.json" &&
node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  const [render, receipt, output] = process.argv.slice(1);
  const build = JSON.parse(readFileSync(receipt, "utf8"));
  execFileSync(process.execPath, [render, "pdf", "--input", build.html,
    "--output", output, ...build.pdfArgs], { stdio: "inherit" });
' "$render" "$scratch/compose.json" "$review" &&
node "$court/scripts/court-filing.js" validate --pdf "$review" --caption "$caption" \
  --profile colorado-district --body "$body" \
  --body-sha256 "$(node -p 'require(process.argv[1]).bodySha256' "$scratch/compose.json")"
```

Pass the returned `pdfArgs` unchanged as individual arguments. The composed filer block contains a blank signature line and `Date: ____________________`. The certificate contains its own blank signature line and `____ day of __________, <year>`. Use the profile and record to determine which blocks apply.

The draft caption uses Division W and the superseded `former-service@example.invalid`. The docket in the example assigns Division X and shows case number `2099CV00000`. The latest accepted service notice supplies `service@example.invalid`. Correct the division and recipient email against those records, verify the court address and party order, and record where each value came from before composing. Keep the paper’s actual title and choose `motion` with the person. Leave the signature and the dates blank for the signer.

## Commands

Run from the tool directory. All file arguments are absolute paths. `--profile` also accepts an installed profile ID. Input paths must resolve to readable regular files. Private configuration paths and inputs with multiple hard links are refused. `--out` must be a fresh HTML path outside this tool.

| Invocation | Result |
|---|---|
| `node scripts/court-filing.js help` or `--help` | Print usage without reading consent, installing packages or checking for dependencies. A command also accepts `help` or `--help`. |
| `node scripts/court-filing.js compose --body <file> --caption <file> --profile <id-or-file> --out <file> [--replay] [--install]` | Write the HTML and return `html`, `profile`, `documentType`, `pdf`, `pdfArgs`, `footerFont`, `bodySha256`, `bodyWords`, `pdfFilenamePrefix`, `checks` and `advisories`. The prefix is null in production. `--replay` marks the HTML title for PDF metadata and returns the required replay filename prefix. |
| `node scripts/court-filing.js validate --pdf <file> --caption <file> --profile <id-or-file> --body-sha256 <digest> --body <file> [--limit <id>] [--max-pages <N>] [--max-words <N>] [--order-max-pages <N>] [--order-max-words <N>] [--order-source "<order or rule, date and record location>"] [--no-length-limit] [--replay] [--install]` | Omit length flags to use the applicable profile treatment when available. `--limit` selects a listed preset. Choose the applicable length treatment below. `--replay` requires the replay PDF filename and metadata and returns the historical receipt. `--no-length-limit` is equivalent to omitting flags for a null-preset type. |
| `node scripts/court-filing.js classify --profile <id-or-file> --title <title>` | Return `profile` and an array of `suggestions` in order of specificity. The caller declares the document type. |
| `node scripts/court-filing.js compare --reference <archived-pdf> --pdf <rebuilt-pdf>` | Read two PDFs and return page, normalized text and per-page raster differences. Exit 0 when comparison finishes, including when differences are present. |
| `node scripts/court-filing.js profiles` | Print the validated shipped profiles, including layout, document types, limits, rule notes and packet registry. No package install. |
| `node scripts/court-filing.js check [--install]` | Report Marked as `absent`, `incomplete`, or `complete`, Poppler program versions, and readiness for `compose`, `validate` and `compare`. Survey exits 0. `--install` prepares Marked if needed and runs the survey. |

Run `check` first if a dependency may be missing. Node 18 or newer is required. `compose` and `validate` share Marked 12.0.2. A missing package prompts through a refusal on the first unapproved run. Re-run with `--install` on consent, or set `WISER_ALLOW_INSTALL=1` for a preapproved unattended run. You'll only be asked once: your yes also covers anything else Wiser needs to download later, including after updates. npm installs the pinned package from `registry.npmjs.org` into this tool's `node_modules/`, uses its ordinary cache, and leaves the lockfile as shipped. A survey without `--install` writes nothing. The install records consent in the person config and matching plugin copy. A completed compose leaves its one HTML file at the caller's new path. Validation reports the SHA-256 of the exact PDF bytes it inspected.

Compose checks the caption’s court against the renderer layout and any profile `court_match`, including during replay. The `colorado-two-column-boxed` layout requires the court name to end in `, Colorado` after trimming, ignoring case. A mismatch exits 1, names the court, profile ID and failed rule on stderr, and writes no HTML. Use a profile for that court or the unprofiled route in Produce Court Filing.

### Length treatment

- The shipped Colorado length presets are page limits. `other-paper` uses the general motion page preset as its default. Confirm the applicable limit and exclusions against the current rule and any order before filing. The mechanical check counts every page in the PDF. Review the rule’s exclusions when checking the actual filing.
- `--max-pages <N>` and `--max-words <N>` are the litigant’s own tighter targets. A positive integer can tighten a matching profile figure or add a check for a unit without a preset. A word target adds a check and keeps the shipped page cap in force. In a custom type with `length_mode: alternatives`, either unit can satisfy the length check. If one passes, validation flags an exceeded target for the other unit when its target flag was supplied. Use the order flags to record a case-specific requirement.
- For a verified case-specific ceiling, pass `--order-max-pages <N>`, `--order-max-words <N>`, or both, with one `--order-source "<the order or rule, with its date and location in the record>"`. Each supplied maximum is a positive integer and gets its own required check. The source must be nonblank single-line text. Types with a single preset or a required pair keep any profile ceiling in a unit the order omits. For example, a word-only order adds a check and preserves the applicable page ceiling on the shipped profile. On a custom type with `length_mode: alternatives`, the order replaces the pair. A ceiling the order leaves in force must be verified in the profile. A ceiling can be higher or lower than the profile figure. Confirm a higher ceiling and its source at preview when the advisory appears. The order treatment is exclusive of `--limit`, the litigant’s target flags and `--no-length-limit`.
- If checked authority corrects the profile’s generally applicable figure, make a copy of the profile in the build directory. Update only the affected ceiling and its verification record, then use the copy’s absolute path as `--profile` in compose and validate. Use the order flags for a case-specific ceiling so the receipt carries its source.

### Dependencies

`validate` needs six Poppler utilities in PATH. The presence checks are `pdfinfo -v` for page metadata, `pdftotext -v` for text and word positions, `pdffonts -v` for the font inventory, `pdftohtml -v` for typeset dimensions, `pdfimages -v` for the image inventory, and `pdftoppm -v` for rendered ink. Use a build of `pdftotext` that supports `-tsv`. `compare` needs `pdfinfo`, `pdftotext` and `pdftoppm`. The other commands can run without Poppler.

## Caption schema

Use one JSON object. Unlisted and repeated keys are refused. Text values are single lines. The caption retains the supplied party order.

| Field | Type and use |
|---|---|
| `court`, `court_address`, `case_number`, `division`, `title` | Required strings. Use the sourced court, address, docket fields and exact title. A type with `blank_case_number` requires the empty string. A type with `allow_blank_division` accepts the empty string when allowed by the court. Court names and the title within the caption box print in capitals. The title cell uses CSS `text-transform: uppercase` in an English-language document, and validation computes the same Unicode default uppercase with JavaScript’s `String.prototype.toUpperCase()`. The certificate, title advisories, type guard and `type_confirmed` use the title as supplied. |
| `document_type` | Required ID from the selected profile’s `document_types`. Choose the paper’s type with the person. It determines filing blocks, docket fields, packet and length treatment. Use `other-paper` for a paper with no specific type. |
| `type_confirmed` | Optional object `{ "title": "<exact title>", "document_type": "<exact type>" }`. Use only after the person freshly confirms that title and type. Store the confirmation in the build record. A stale value or legacy boolean is refused. Omit in replay. |
| `filing_packet` | Required when the type names a packet. Supply that exact ID from the profile’s `filing_packets`. Otherwise omit it. |
| `parties` | Nonempty ordered array with `role` and `name` strings. Names print uppercase. In an adversarial caption the existing order is preserved and a single `v.` goes before the first defendant-side entry when an entry precedes it. |
| `signer` | Required when the type prints the filer signature. Supply `name` and, where applicable, `role` and `lines` for address or contact text. Omit it when the type has no filer signature. |
| `caption_counsel`, `counsel_label` | Optional boolean and string. The label follows an unambiguous role or the named party it represents. Supply the label when the role is ambiguous and a counsel block prints. Set `caption_counsel: false` to omit that block when appropriate. |
| `service` | Required when the type prints a certificate and omitted otherwise. Optional fields are `method` (defaults to email), `served_by` (defaults to the filer), `firm`, `firm_lines` (array) and `firm_note`. |
| `service.recipients` | Nonempty array of objects with `name` and an `emails` array. Supply at least one email per recipient for email service. |
| `certificate_year` | Optional four-digit integer used to preprint the certificate and anchor its validation. Each command uses its own current calendar year when this field is omitted. |
| `table_presentation` | Optional object with `default` style and a `tables` object keyed by one-based Markdown table number in body order. Each per-table field overrides the default field with the same name. Optional `smaller_font_authority` supplies the verified source and minimum size for tables smaller than the profile body size. |

For a `proposed-order` confirmed to use this form, end the Markdown with `BY THE COURT:`, a blank underline or underscore rule, and a judge designation. Keep an incompatible prescribed form in its original format and record that Court Filing cannot validate it. Keep a `supporting-declaration` with the exact enclosing packet and its verified certificate.

## Table presentation

Omit the table fields to use the ordinary Markdown table layout. Chromium centers headings in unaligned columns and uses middle-aligned cells, 1px cell padding, 2px cell spacing, normal wrapping and running headers. Archived inline styles may differ. Markdown alignment markers continue to apply wherever the caption leaves alignment unspecified.

| Style field | Allowed value |
|---|---|
| `column_widths_percent` | Array of column widths from 1 through 100 percent, with `null` for automatic widths. The listed widths may total at most 100. Supplying this field uses fixed layout across the printable area. |
| `column_alignment` | Array of body column alignments, `left`, `center`, `right`, or `null` to leave the Markdown or browser default. |
| `header_alignment` | One alignment for all headings or an array in column order. Allowed entries are the same as body column alignments. |
| `nowrap_columns` | Array of distinct one-based column numbers. Keeps those body cells on one line. Use `[]` to override an inherited list. Check wide cells in preview. |
| `cell_padding_pt`, `body_cell_padding_pt` | Number in points or four numbers in top, right, bottom and left order. Each is from 0 through 12. The first field controls all cells, and the second overrides it for body cells. |
| `font_size_pt` | Number from 8 through 16. Default is the profile body size. A smaller size requires `table_presentation.smaller_font_authority` with a nonblank `source` and a `minimum_font_size_pt` from 8 through 16. Verify the controlling rule or order and record its identity, date and record location in `source`. Every declared undersized table setting must meet the recorded minimum. |
| `vertical_alignment` | `top`, `middle`, `bottom` or `baseline` for header and body cells. |

Column arrays can end early to leave remaining columns at their defaults. Values beyond the table’s actual columns are refused. For example, a legacy style that aligns every header and cell left and top, keeps the first two body columns on one line, and sets body padding to `4px 8px 2px 0` can be represented as follows. At 96 CSS pixels per inch, multiply pixels by 0.75 to obtain points.

```json
{
  "table_presentation": {
    "default": {
      "header_alignment": "left",
      "column_alignment": ["left", "left", "left"],
      "vertical_alignment": "top",
      "nowrap_columns": [1, 2],
      "body_cell_padding_pt": [3, 6, 1.5, 0]
    }
  }
}
```

## Convert an archived body and caption

Use a new `mktemp -d` directory and copy only the archived body and caption there. Keep the originals and reference PDF read-only. Record their paths and hashes locally. Read the original paper and record to choose its type. `classify` may suggest the available types. In the temporary caption add `document_type`, its packet field if required and the archived certificate year if established. Preserve the supplied title. Omit `type_confirmed` from the temporary copy and report any confirmation guard. Apply the appropriate filer and certificate fields from the record and report any reconciliation.

In the temporary Markdown, move supported styling from the leading `<style>` block or inline HTML into `table_presentation`. Translate any HTML tables into pipe tables, including header and cell text in order. Remove the original style or markup from the copy after recording what it did. Preserve the rest of the filing text and record any style or structure you could not reproduce. Keep signatures and filled dates in the reference only. Use `--replay` on compose and validate. Render with the returned `pdfArgs` to a fresh temporary PDF named with the returned `pdfFilenamePrefix` of `Not for filing - `. The renderer copies the HTML title into the PDF title metadata. Use `compare --reference <archived-pdf> --pdf <rebuilt-pdf>` for the historical result. Label the whole replay **Not for filing**.

## Comparison result

The command writes no files. It returns `label`, `note`, `reference` and `rebuilt` (each with `pages`, `pageSizesPt`, `textTokens` and `sha256`), `samePageCount`, `samePageSizes`, `text` and `raster`. The `text.equal` result compares Poppler’s reading-order text after NFC normalization and whitespace collapse. `text.changes` gives zero-based token offsets and changed token spans. For very large unmatched spans, `text.granularity` is `changed-span`. `text.inventoryDelta` reports per-token count differences, positive when more occur in the reference. `raster.perPage` gives both pixel sizes, the differing and total pixel counts and the percentage of differing pixels at 144 dpi. It compares RGB values at the same coordinates from the top left and counts unpaired pixels and pages as differences. A signature or filled date on the reference is expected to differ. The comparison covers 16 MiB and 200 pages per PDF.

## Profile schema

`profiles` is the inventory. To add a court using the supported boxed layout, make a profile JSON file under `profiles/` with the same filename stem as `jurisdiction_id`. A caller can also use an absolute profile path. A different caption design requires a supported renderer profile. Use the issuing court’s prescribed separate process or form for a proposed order when it requires one. One profile is shipped, `colorado-district`.

| Field | Type and use |
|---|---|
| `jurisdiction_id`, `display_name`, `renderer_profile` | Required lowercase hyphenated ID, display string and layout identifier. The layout identifier is `colorado-two-column-boxed`. |
| `court_match` | Optional nonempty array of nonblank JavaScript regular expression strings. Compose matches each pattern against the entire trimmed `court`, ignoring case. At least one pattern must match and the layout rule must also pass. Profiles that omit this field use the layout rule alone. The shipped profile accepts `District Court, <name> County, Colorado` and `District Court, City and County of <name>, Colorado`. |
| `layout.page_size` | Required `Letter`, `Legal` or `A4`. |
| `layout.margins_inches` | Required object of numeric `top`, `right`, `bottom` and `left`, each 0.1 to 10 inches and together leaving a printable area and space for the footer. |
| `layout.body_font`, `layout.body_font_size_pt`, `layout.body_line_height` | Required plain font name, number from 1 through 72 points and number from 1 through 5. |
| `layout.footer` | Required object. `format` is plain text of up to 160 characters containing `{page}` and `{pages}` once each. `font` is `Times New Roman`, the font used by `render pdf`. `size_pt` is 1 through 72. `position` is `left`, `center` or `right`. The footer is used on every page. |
| `layout.caption_style`, `layout.pdf_font_names` | Caption description and nonempty array of approved PDF PostScript font names. Older custom profiles may still carry `layout.certificate_year` as a four-digit year or null. Composition and validation use the caption or calendar year. |
| `caption_defaults` | Caption example conforming to the schema above. Copy it and supply sourced values. It is never merged into a caller's caption. |
| `validation` | Object containing required `limits`, `exclusions` and `notes`. `limits` maps lowercase hyphenated IDs to objects with `unit` (`pages` or `words`), positive integer `maximum`, `citation` and `verification`. `exclusions` and `notes` are arrays of strings. Optional `double_spacing` supplies a rule with a nonblank `citation` and `verification`. |
| `rules` | Array of objects with `citation`, `verification` and string `notes`. |
| `document_types` | Required closed object keyed by lowercase hyphenated IDs. Each type declares booleans `filer_signature`, `certificate`, `judicial_closing`, `blank_case_number` and `allow_blank_division`, exactly one of `title_pattern` (whole-title case-insensitive regex) or `exact_title`, `filing_packet` (listed ID or null), and `length_presets` (array of listed IDs, empty when the caller must supply targets or order ceilings, or null for no profile preset). Optional `length_mode` identifies a page/word pair as `alternatives` or `all`. With `all`, both ceilings apply even when a preset is named. A certificate omission requires a judicial closing, listed enclosing packet or exact title. A blank case number requires a listed packet. Optional `double_spacing` lists the distinct categories the sourced validation rule applies to for this type, drawn from `table`, `list` and `heading`. The general entry uses the fields in the next row in place of a title matcher. |
| `fallback_document_type` | Optional ID of the explicitly declared general type. Its entry requires a filer signature and certificate, a null filing packet, and one applicable page preset. A custom general type may add one applicable word preset. If it declares both presets and omits `length_mode`, both ceilings apply. List narrower specific title patterns before broader ones for suggestions. Exact title entries are suggested first. |
| `filing_packets` | Object keyed by lowercase IDs with underscores. Each packet has string `description`, nonempty `required_at_filing` (objects with `item`, `method`, `notes`, `citation`, `verification`), `post_filing_steps` (objects with `step`, `notes`, `citation`, `verification`) and a string array `notes`. |

A `citation` identifies the authority to check, or is null when no citation is listed. `verification` is `working-default` or `verify`. Older custom profiles can use `recorded-in-source` for `working-default`. Confirm working defaults against the applicable rule and any court order before filing. A ceiling marked `verify` requires checked authority before use. For an applicable case-specific maximum use the order flags. For a verified general figure retained in a build profile, record the checked authority there. A filing packet lists what Court Filing composes. Read the court's other initiation requirements in the forum pack file named by the forum finding.

## Validation result

A production pass writes one JSON object to stdout with `ok: true` and `result: "ALL CHECKS PASSED"`, and exits 0. A replay pass exits 0 with `result: "REPLAY CHECKS PASSED - NOT FOR FILING"`. A marked replay PDF fails production validation even if renamed. Failed mechanical validation writes one object to stderr with `ok: false`, `result: "VALIDATION FAILED"` and `remediation`, and exits 1 with empty stdout. Usage, path and schema failures use a plain error on stderr. Both validation objects report `profile`, `documentType`, `pages`, `bodySha256`, `pdfSha256`, `bodyWords`, `pdfBodyWords`, `limits`, `checks`, `advisories` and `unavailable`. Each check carries `label`, `status` and `detail`. An `advisory` prompts human preview and permits a mechanical pass. Hold a required `not_checked`.

When a Poppler utility fails, `unavailable` names its `program`, `check`, `page` when applicable, `errorCode`, `status`, `signal` and the first 200 characters of `stderr`. A version check uses its presence command as `check`. A check that fails or stays unchecked because of missing evidence includes the corresponding reason. Inspection retries once after a spawn error or signal with neither a nonzero exit status nor stderr output. Inspections with a nonzero exit status or stderr output fail immediately. Poppler receives PDF bytes on stdin.

- **Caption and filing blocks.** The boxed first-page caption must contain the sourced court and address, ordered parties, docket fields, applicable counsel block and complete centered title in capitals. The `Document title in caption` check compares the printed title to the supplied title converted to capitals, with case-sensitive matching. Check the filer closing, date field and supplied contact lines where applicable. A certificate requires its own heading, statement, date fields, exact recipients and emails, supplied firm lines and expected service signer. The validation anchor is the caption’s `certificate_year` or the calendar year when validation runs. An untouched preprint must show the anchor year or either adjacent year. Filled date fields must form a real calendar date in that same year range. Common month abbreviations, including Sept and Sept., are accepted. The PDF title’s composition year is informational. When the type omits a certificate, presence is `not_applicable` and the separate absence check must pass. An order needs the approved unsigned judicial closing and the absence of filer and certificate blocks.
- **Body binding.** Validation independently re-parses the required Markdown through composition’s parser. It compares extracted PDF body characters and word boundaries to that result, using positioned text to reconcile extraction breaks and handling wrapped hyphens and complete running table headers. The title metadata carries a second copy of the Markdown digest. A text mismatch fails the binding check and leaves the PDF count available for diagnosis.
- **Length receipt.** The `limits` object reports `choice` (`profile-preset`, `profile-alternatives`, `profile-all`, `explicit-maxima`, `order-maxima`, or `no-length-limit`), `preset`, `pages` and `words`. With one applicable preset and no flag, that preset applies. A null-preset type has a passing no-preset check when neither target nor order flags are supplied.
- **Word targets, orders and custom presets.** When a word ceiling applies, both body counts must meet it. Both include ordered-list markers and exclude the caption, filer signature and certificate. The composed count uses the higher of the printed-text count and the Markdown token count. The token count strips code spans, fenced code, image links, link destinations, formatting characters and standalone dash or plus list markers. A custom type with alternatives reports both counts, and `limits.satisfiedBy` identifies passing units. An exceeded explicit target appears in `checks` and `advisories` when the other unit passes. That advisory gives the measured count, the target and the order flags. On a custom type with alternatives, `--limit` pins one preset.
- **Order receipt.** `limits.order` records `source`, the supplied `pages` and `words` (null if omitted), and `aboveProfile`, which maps any raised unit to its original profile figure. Each check labeled “set by order” must pass. A retained profile ceiling has its ordinary check label. Each raised unit adds an advisory naming the source for confirmation at preview.
- **Title and type.** Compose and validate report the same title advisories for wording outside the declared type’s pattern or a joined phrase that may be another paper. The declared type governs all checks. Confirmation is required if any other matching type enforces a stricter ceiling or a unit the declaration drops, requires a filer signature or certificate omitted by the declaration, or requires a judicial closing. An off-pattern declaration looser than the general type also needs confirmation. Compose refuses an unconfirmed guard and validate reports it as failed. A confirmed guard stays visible as an advisory. The declared type’s own blocks still apply.
- **Layout.** Every page needs unrotated MediaBox and CropBox geometry within 1 pt of the profile size. Checks require approved embedded fonts, profile type sizes and declared table sizes, paragraph line spacing where measurable, the visible caption box and an aligned visible footer on each page. At 144 dpi, the margin check allows 1.5 pt for rounding and exempts the matched footer words. Ink checks reject embedded images, invisible words, missing expected marks and unexpected visible ink outside the recognized text and ruling areas. Human preview checks the exact artifact, including appearance inside recognized ink areas and signature completion.
- **Table, list and heading double spacing.** This named check reports how many printed body lines have text in these categories below double spacing and their share of all extracted printed body lines. It includes running table headers and counts each extracted line once in the total. It measures matched successive PDF baselines where available and estimates isolated or unmatched lines from the retained layout. The check's `counts` carries `totalLines`, `underDoubleLines`, `share` as a fraction, `estimatedLines`, and affected `table`, `list` and `heading` line counts. The named check fails for short lines in a category covered by the selected type's sourced spacing rule. Otherwise short lines are an advisory for human preview. The shipped profile leaves these three categories to preview.
- **Inspection bounds.** The tool accepts up to 16 MiB and measures up to 200 pages. Interactive forms or PDF JavaScript leave required appearance evidence unchecked. The mechanical result and its PDF digest support the caller’s separate citation, forum, preview and exact-artifact approval gates.

## Success

Composition publishes the one fresh HTML file and returns its path and renderer arguments. Validation produces an exact verdict for the supplied PDF, caption, profile and limits. The result reports each applicable check and the profile treatment for an omitted certificate, where applicable. Unavailable evidence or a failed applicable check holds release. Comparison returns differences and the historical label for the two exact PDFs.
