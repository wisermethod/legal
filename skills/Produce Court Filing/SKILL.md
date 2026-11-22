---
name: Produce Court Filing
type: skill
category: procedure
description: Produce a filing or forum submission from sourced inputs, then check the exact artifact for human preview and approval
version: 0.7.2
gaps:
  - Mechanical jurisdiction-profile validation covers the shipped Colorado district layout and compatible custom profiles.
  - Prescribed forms outside the supported types need the forum’s own form and requirements gate. Court Filing cannot validate those artifacts.
  - Court Filing measures profile geometry and printed content. Current forum acceptance, signature and service still need verification.
---

# Produce Court Filing

## Context

Use to produce or render a court-ready motion, complaint or other filing in the litigant's own matter. Apply the legal constitution's Standing constraint. Use the jurisdiction profile and the court filing pipeline for a compatible court PDF. Use the forum’s stated format for a submission with no compatible profile. For a historical comparison requested on its own, use [Rebuild an archived paper for comparison](#rebuild-an-archived-paper-for-comparison).

Classifier seam: none.

## Objective

Produce the exact artifact in the forum’s required format and keep the build record that supports preview, approval and filing status. For an archived-paper replay, return a comparison labeled **Not for filing**.

## Inputs

- `<user_request>` identifies the matter, document, format and planned date of filing or service.
- `<context>` names the matter `AGENTS.md`, court, jurisdiction profile, build and output paths, applicable length treatment and the dated record source for any case-specific ceiling, and any planned submission or service route.
- `<source_material>` includes approved substantive `body.md`, structural `caption.json` for a profiled build or a sourced forum submission record with the fields described in Draft Motion’s unprofiled path, the current citation report, final attachments with the Verify Citations cited-attachment manifest (possibly empty), and authoritative caption and service sources. When something is missing for a new filing, obtain it through the relevant drafting workflow before the dependent step. For an archived replay use the archived source inputs and the reference PDF.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

For an archive comparison alone use the historical lane below. For any request to file, including one that asks to reproduce an archive first, start the filing work at [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### Which production path applies?

1. **Stage the build and choose the output.** If preflight holds production, return the held draft and blocker. Otherwise run Maintain Matter File in preflight mode. Read the forum’s operative orders, notices, submission instructions and prescribed formats. Select a compatible profiled PDF, a prescribed official original, or a confirmed unprofiled format. A Word submission can use a compatible profile for its proof under step 4. If the requirements or format conflict or are missing, hold the affected work. Resolve tools through the composed family indexes and follow their install contracts. Which `Filing profile` does the preflight forum finding report? For a confirmed court, take the declared profile id as the candidate. If `Filing profile` is `pending` or the declaration is absent, report the missing profile declaration or missing forum declaration, respectively, and use the preflight forum finding to identify any compatible candidate. For `none: papers follow the court's own rules`, `not a court: submissions follow the forum's own rules`, or a confirmed forum without a profile candidate, use the forum's own requirements.

   For a candidate profile on a confirmed court route, apply these checks before using its schema or presets. Run Court Filing `profiles` for a court artifact and read its `profiles` array. For a shipped id, inspect its entry in the `profiles` array. For an absolute path, read the profile file under the tool contract. Compare with the declared `Court or forum` or, when the fallback supplies the only confirmed court, with the court confirmed by preflight. Do the profile's `jurisdiction_id` and `display_name` identify the court's jurisdiction, and do its `caption_defaults.court` and the supplied caption's `court` identify the same court? Fill a court-name template's county or district placeholder from the sourced court name. If all fields agree, record the match in the build record and use the profile. If any field disagrees or cannot be verified, refuse that profile, record and report the field and discrepancy or missing evidence, and use the verified unprofiled route if available. Hold the affected work if that route is unavailable.

   For an accepted profile, continue with the following selections. Select the `document_types` entry, packet and applicable length treatment from the profile and controlling record. Use the profile’s `validation.limits` for working preset figures. If checked authority corrects a generally applicable figure, copy the profile into the build directory. Update only the affected ceiling and its verification record and use the same absolute profile path for compose and validate. Apply the same court match to this ceiling-only copy.

   Keep the paper’s real title as typed in `caption.json`. Court Filing prints it in capitals in the caption box and as typed in the certificate of service. Choose `caption.document_type` with the person from the paper’s purpose and the controlling record. Court Filing `classify` can suggest types from the wording. Choose `other-paper` for a Colorado district paper with no specific type. It uses the general motion page preset and requires the filer signature and certificate. If an advisory suggests that the title names a second paper, check the intended paper or papers with the person at preview. If the record calls for separate papers, build each according to its actual scope and title.

   If the tool holds on the type guard, show the exact title, declared type, matching types and differences in ceilings or filing blocks. Choose the corrected type when the person identifies it, or obtain fresh affirmative confirmation for this build. Record the exact title, type, date and source in the build record, then set `caption.type_confirmed` to `{ "title": "<exact title>", "document_type": "<exact type>" }`. Start each new build without any earlier confirmation. Remove the confirmation when the title or type changes and ask again if the guard applies.

   Use the declared visible filings directory and `YYYY-MM-DD - <Document Title>.<required extension>` with the planned filing or service date. Reserve `DRAFT - ` for editable working sources. Keep sources and evidence in a dedicated portable build directory under filings. Finder hides build folders whose names begin with a dot. Put the reviewable PDF in a visible destination where the person can find it. Use one build record for every path. Record input digests and exact paths, each applicable requirement and its authority, commands or inspections and results, output digests, preview, the human decision and the release state. Include a length-source line for each build. Use “Profile has no preset” when the type’s preset field is null. Record “An order or rule in the record sets this limit” with its source and maximum when one applies, even if the type has no preset. For a profile preset record its name, figure and source. For a collision preserve the existing file and use the first unused permitted revision of the date/title stem, starting with ` - 2` before the extension. If the exact name is mandatory, keep the staged review artifact in the build and confirm a fresh authorized destination before publishing it.

2. **Clear substance, caption and citation.** Keep argument, facts, citations, conferral when required and prayer in `body.md`.

   On the profiled route use `caption.json` for fields such as court and address, party roles and names, exact case number, division, document title, signer name, role and contact lines, and service method, signer, recipients and firm details when applicable. Take field names, requirements and defaults from the selected profile. Reconcile parties and dates with the docket and orders, and the firm and service information with counsel's latest filing or communication. Hold for any required discrepancy or missing field. Use exact assigned docket values. For a Colorado district initial complaint use `document_type: "new-case-complaint"`, `filing_packet: "new_case_complaint"` and `case_number: ""`. Confirm whether the court accepts `division: ""` for a pending assignment. Supply `service` when required by the type, including for the initial complaint. The Colorado `supporting-declaration` type requires `filing_packet: "motion_response_with_declaration"` and verification that the enclosing response’s certificate covers it. Use `proposed-order` only when the controlling form matches the tool’s unsigned judicial closing. A custom type that omits a certificate on the basis of an exact title requires the controlling source and matching facts. Hold for unresolved treatment, impermissible blanks or service facts that cannot be truthfully attested.

   For other paths use the authoritative forum submission fields and record any unresolved requirement. Leave signature and required service dates to the signer.

   For every production path, check citation clearance. Match the exact `cleared` value, `full` scope, current body path and SHA-256, and each cited attachment's identifier, original path, SHA-256 and complete coverage to the manifest and actual submission inputs. Compare the manifest to the draft references and final attachments. If the current report is `held`, carry its holds forward and rerun only when corrected text, an updated attachment, or new authority addresses a finding. For a missing, incomplete or stale report, run Verify Citations on the exact body and manifest with originals and any readable companion text. Hold production until there is a matching clearance and no unresolved `[verify]`. Confirm the litigant has approved the substantive version for rendering.
3. **Build a profiled PDF or PDF proof.** On the profiled PDF path or when step 4 requires a compatible proof, use Court Filing and Wiser’s `render` in this order. Otherwise continue to step 4.
   1. From Court Filing run `node scripts/court-filing.js compose --body <body.md> --caption <caption.json> --profile <id-or-file> --out <fresh.html>` with absolute file arguments. Keep the resulting `html`, `profile`, `pdf`, `pdfArgs`, `footerFont`, `bodySha256`, `bodyWords`, `documentType`, `pdfFilenamePrefix`, `checks` and `advisories`. Require `pdfFilenamePrefix: null` for production. Match `bodySha256` to the citation clearance before rendering.
   2. From the `wiser` tool `render` run `node scripts/render.js pdf --input <html> --output <fresh.pdf>` and append `pdfArgs` unchanged as individual arguments. Require a successful run with `output` at the intended path, `format` equal to `pdf`, and a concrete `pages` count. Keep the CSS page geometry and footer settings from the composition. If the renderer refuses the file, hold and resolve the named error before retrying.
   3. From Court Filing run `node scripts/court-filing.js validate --pdf <output> --caption <caption.json> --profile <id-or-file> --body-sha256 <compose digest> --body <body.md>` with the same inputs. When a verified case-specific order or rule sets a ceiling, pass `--order-max-pages <N>` and/or `--order-max-words <N>` with `--order-source "<the order or rule, with its date and location in the record>"`. Require a passing “set by order” check for each supplied ceiling and verify that `limits.order` records the supplied figures and source. On the shipped Colorado profile, a word-only order adds a required check and keeps the applicable page ceiling. On a custom type with `length_mode: alternatives`, an order replaces the pair.

      When the profile governs, omit the length flags for its default treatment. For a shipped page preset, verify the page check against the selected type and confirm the rule’s exclusions at preview. The tool counts the entire PDF. For a custom type with alternatives, record both counts and the passing units in `limits.satisfiedBy`. Use `--limit <id>` if the litigant or governing record selects a listed preset. Use `--max-pages` and `--max-words` for the litigant’s own tighter targets. For a custom type with alternatives, record any advisory for an exceeded explicit target when the other unit passes. Where both ceilings are required, verify both checks.

      Require exit 0, `ok: true`, and exactly `result: "ALL CHECKS PASSED"`. Match `profile`, `documentType`, `bodySha256`, and `limits.choice`, `limits.preset`, `limits.pages` and `limits.words` to the selected inputs. Record `pdfSha256`, `pages`, `bodyWords`, `pdfBodyWords`, `checks` and `unavailable`. Require the independently re-parsed body comparison and second metadata check to pass, along with the selected length checks, printed caption and layout, and all blocks required by the type. Accept certificate `not_applicable` only with the passing absence check and sourced treatment. For a required blank case number, require the named blank-field check to pass. On exit 1, read stderr for the failure and retain it in the build record. Record any `remediation` field and hold on any failed or required unchecked item, absent length choice or mismatched input. Carry advisories from both compose and validate into preview. Changes to the text or cited attachments reopen citation clearance.
4. **Build and check a Word, official-form or other unprofiled artifact when required.** A simple new DOCX uses Wiser’s `word-document` command `node scripts/word-document.js create --input <json> --output <fresh.docx>` with absolute paths and UTF-8 JSON containing `title` and `paragraphs`. Require success and the intended canonical `output`. For a required caption table or other structure outside that schema, use the issuing forum’s official Word template or a Word artifact that meets the prescribed structure. Retain a legacy table caption as a visual reference when supplied. For an official fillable form, obtain and fill the original and check its required fields and packet rules. Keep a prescribed order with a different judicial closing in its original format. For another confirmed submission format, use a local tool that supports the verified requirements. For a required Word filing with an applicable compatible court profile, use step 3 to retain a mechanically validated PDF proof and reconcile caption, text, page structure and certification against the actual DOCX. For an unprofiled forum or prescribed original outside the profile’s scope, record Court Filing validation as unavailable and disclose that at preview. Continue to step 5 and the approval decision in step 6 once the applicable forum checks below pass. Hold if a required compatible proof or applicable forum check cannot be completed.

   On every path, check the final artifact against the cleared body and primary record. Record each applicable requirement’s authority, evidence and pass or hold, covering text, layout, limits, fields, attachments, audience, signature and service. Use the original official forms and packet rules for the Colorado initiation packet. If Open a Matter handed over only the complaint, return the complaint for its JDF 601, JDF 600 and fee or waiver checks. Route a direct request for that entire packet to Open a Matter.
5. **Review the exact artifact with the litigant.** For PDF, rasterize every page to PNG in the build folder with a local tool such as `pdftoppm -png` and inspect the pages against the build record. For DOCX, reopen the exact output in Word or another layout-capable Word viewer without editing or resaving it. Check the visible page count and inspect every page against the sourced requirements. For another prescribed format, use its layout-capable viewer. Check applicable caption, spacing, page numbers, margins, exhibits, signature and certificate treatment. For a profiled PDF, tell the litigant the count and share in the validation check `Table, list and heading double spacing` and show any flagged elements in the preview. Hold with the missing viewer or check named if a required preview cannot be completed. On a production build, if a body heading is the last body line of a page, above any footer, with its text on the next page, hold release and tell the litigant the page and the heading. On a profiled PDF, Court Filing keeps a heading with the text after it, so report this as a tool defect and do not patch the tool. On a Word or other artifact, correct the break in that artifact’s source. Ask whether to revise the body. A body change reopens citation clearance, then build, check and preview again. A replay omits that keep-with-text rule by design: a heading stranded in a replay is expected and is not a defect. Show the artifact, intended submission, recipients and attachments. Show title and type advisories with their reason. For each above-profile order ceiling, confirm the source and its applicability at preview. Record the confirmation in the build record and hold if it remains unresolved. Keep the recorded person’s confirmation with any standing off-pattern advisory and record what the person decides about possible second papers. Record the SHA-256 of each submitted file. The profiled PDF hash must match the passing `pdfSha256`.

   The litigant signs and completes the applicable blank dates by the forum’s accepted method. Verify the planned filename date against the actual filing or service date. After a signature or date edit, repeat the applicable gate and affected preview on the new bytes, then obtain approval of the new hashes. For a profiled PDF use the same body, digest, caption, profile and length choice and record the new `pdfSha256`. If the editor strips the body binding, use an accepted method that preserves it or hold. Changes to body or cited attachments reopen citation clearance and the applicable build and review steps.
6. **Record release and filing separately.** Apply the Litigation Counsel owner gate under `wiser/AGENTS.md` Precedence and routing before any filing-ready handoff, subject to its separate-review decline path. Carry any preflight hold even when that review is declined. Is the exact reviewed packet explicitly approved for transmission with all applicable gates passed? If yes, the litigant can file through the forum’s approved channel, including Colorado Courts E-Filing where applicable, or give a specific instruction to transmit the exact shown packet where permitted. If approval is absent, return the checked artifact for the litigant's review. Record the person’s approval with the reviewed hashes, destination and attachments. Check those hashes again at handoff or any authorized transmission. Reopen the affected gate, preview and approval for any changed artifact. After the litigant reports filing or supplies the court receipt, use Maintain Matter File to record the actual date and update the matter. Retain previews and build sources as scratch under the matter's retention rules.

### Rebuild an archived paper for comparison

1. Use this lane for a requested replay of a filed, served or otherwise archived paper. Identify the exact reference PDF and recorded build inputs. Read the matter’s filing or service index to confirm what the reference represents. Work in a fresh temporary directory and record the original paths and hashes. Read the originals in place and make any conversion on temporary copies.
2. For a compatible profile, follow Court Filing’s [archived-input conversion](../../tools/Court%20Filing/TOOL.md#convert-an-archived-body-and-caption). Remove any `type_confirmed` from the temporary caption. Leave it unset throughout replay. If the tool requires confirmation, report the guard. Compose and validate with `--replay` and render to a temporary PDF named with the returned `pdfFilenamePrefix` of `Not for filing - `. Check that the PDF title metadata carries `Not for filing`. If a different layout requires another local renderer and the archived template or recipe, require that same filename prefix and PDF title marker. If the inputs or marker cannot be produced, report the missing input or capability. Preserve blank signature and date fields in the rebuild.
3. Run `node scripts/court-filing.js compare --reference <absolute archived PDF> --pdf <absolute rebuilt PDF>`. Retain the receipt in temp. Report page counts and sizes, normalized text equality and the token and per-page raster differences. Identify expected signing and date differences and any other observed changes. Label the rebuilt artifact and handoff **Not for filing**, even when every difference is explained. The replay receipt `REPLAY CHECKS PASSED - NOT FOR FILING` cannot satisfy production step 3. If the person wants to file, leave replay and start at Litigation Counsel’s preflight, then clear citations, complete signature and service fields, preview and get approval in the production path. Keep the original’s filing or service record intact.

### Quick start for a profiled PDF

This command sequence reconciles two draft fields and builds a review PDF from the shipped [fictional caption](../../tools/Court%20Filing/assets/example-caption.json) and [body](../../tools/Court%20Filing/assets/example-body.md). Run it in a visible working folder with a fresh PDF path. Finder hides build folders whose names begin with a dot. Put the PDF where the person will see it and retain the build receipt in scratch.

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

The render command receives the returned `pdfArgs` unchanged as individual arguments. The PDF leaves the filer signature and `Date: ____________________` blank and, where applicable, prints a blank certificate signature with `____ day of __________, <year>`.

| Caption field | Source and treatment |
|---|---|
| `court`, `court_address`, `parties` | Use the authoritative court header and its ordered parties, each with `role` and `name`. |
| `case_number`, `division`, `title` | Use the exact docket fields and real filing title. Use an empty docket field only where the type and record allow it. |
| `document_type`, `filing_packet`, `type_confirmed` | Declare the type with the person. Add the listed packet when required and record fresh confirmation of the exact title and type before setting the confirmation object. |
| `signer`, `caption_counsel`, `counsel_label` | Use sourced filer name, role and contact lines. Set counsel treatment as the record and profile require. |
| `service`, `certificate_year` | Source the method, recipients, addresses, server and applicable firm details. Use the verified year if selecting one explicitly. Leave completion to the signer. |
| `table_presentation` | Apply optional overrides under the [Court Filing schema](../../tools/Court%20Filing/TOOL.md#table-presentation). For any size below the body size, verify and record the controlling rule or order, its date and location in the record, and the permitted minimum before supplying `smaller_font_authority`. |

In the fictional motion, the draft says Division W and uses a superseded email. The superseded address is `former-service@example.invalid`. The docket shows case `2099CV00000` in Division X, and the most recent accepted service notice lists `service@example.invalid`. Take Division X from the docket and replace the old email with the service notice address. Check the court address and party order against the docket. Record both sources and changes, confirm the title and `motion` type with the person, then compose from the reconciled caption. For a production artifact, record the profile’s working length treatment or the specific rule or order supplying the ceiling. Keep signature and date placeholders blank at this step.

### What does a phase send for filing production?

For a proposed filing or forum submission, send the exact filing text and cited-attachment manifest to Verify Citations with the forum, relevant date, supplied authority and any known lookup stop. Use an empty manifest when there are no cited attachments. Carry the occurrence findings, pinpoints and any lookup stop and next step in the phase packet. Check available independent primary material and close each unresolved `[verify]` before a filing-ready handoff. Recheck clearance on changed text or cited attachments.

Check standing orders for AI disclosure and citation certification. Reconcile the parties, exact docket fields, dates, counsel and firm names and service addresses against the docket, orders and latest counsel filing or communication. Use the initial-filing rules above where applicable. For a requested artifact, pass the approved `body.md`, matching clearance and manifest, final attachments, sourced caption and service evidence, declared build and output paths, requested format, planned date and any verified case-specific ceilings with their sources. Supply the profile and structural `caption.json` for a profiled artifact or the sourced forum submission record for another format. Hold for any required missing date, attachment or unresolved fact and retain the blocked draft. Use the applicable production and visual checks above before a readiness claim.

## Pitfalls

- A vague document, conflicting jurisdiction, or unclear date needs clarification before rendering. A date slip calls for updating the visible filename and reviewing any date-dependent fields.
- Review the actual printed pages and compare the signature, service fields, spacing and geometry against the governing requirements. Report tool or profile defects to their owning tool. Never patch the tool during filing production.
- Colorado's e-filing channel, a completed signature block and a preview can each exist before filing. Record filed status only when supported by confirmation.

## Success

For historical replay, there is a temporary labeled comparison or a named gap in the archive and an account of what could be compared. For production, there is a visible artifact at a fresh path or a named hold with its evidence. The build record binds citation clearance, applicable requirements and the preview and decision to the exact output bytes. It records the verified court match for any profile used for production or proof and the affected field for a profile refused. No filing can be released with a held gate or recorded as filed without confirmation. Ask the litigant to report back after filing so the matter file can be updated.
