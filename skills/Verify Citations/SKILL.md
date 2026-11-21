---
name: Verify Citations
type: skill
category: procedure
description: Check every legal citation and the proposition it supports, then return a citation report and an annotated draft with any filing holds
version: 0.3.1
gaps:
  - The case-law connector does not provide a dedicated reporter-citation lookup or opinion-text operation. Checks need a full-text source when its returned material is insufficient.
  - State docket coverage through Trellis was planned and is unavailable. Use authoritative public or supplied records where available.
---

# Verify Citations

## Context

Use for "verify citations," "check the cites," and before any filing or production handoff. Apply the legal constitution's Standing constraint. A cite must resolve to authority actually read and cover the use the draft makes of it. Model memory, search snippets and a plausible case name cannot clear the gate.

Classifier seam: none.

## Objective

For a draft check, save a citation report and annotated copy alongside the filing build inputs, with a reproducible clearance or hold for the exact draft reviewed. For a citations-only check, return a partial report of the supplied uses and what remains open.

## Inputs

- `<user_request>` identifies the draft or cites to check.
- For a draft check, `<source_material>` includes the exact Markdown or plain-text draft and the cited-attachment manifest, even when it is empty. For each attachment referred to in the filing, or separately submitted for its legal citations, provide an exhibit identifier and the path to the exact original file. The manifest identifies the draft reference or separate submission. Include any readable companion text with its path and page mapping. For a citations-only check, give the exact passages or list entries, their locators and the claimed propositions where available. Provide any supplied primary text and existing verification report or lookup status for the same requested lookup.
- `<context>` supplies the build path, jurisdiction, document type and relevant rule or law date, when known. A scoped request can produce a partial report. Filing clearance requires the whole draft.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### Which sources support the exact artifacts?

Use the `wiser` Workspace Model and the owning root's instructions and matter's `AGENTS.md` when a matter is attached. Confirm the applicable build directory and draft revision before writing. A general citations-only check can proceed without a matter or build directory when the jurisdiction, law and relevant date are supplied. Where those facts are ambiguous or missing, ask and hold the determinations that depend on them.

1. **What is being checked?**
   - **Citations only.** Inventory supplied uses at their source locators or by list position. If an entry is only a bare citation, check authority identity where possible and mark the proposition check unverified pending the actual use. Use `partial` scope and `held` clearance. Report the findings without creating a draft or manifest.
   - **Draft check.** Compare the manifest to the draft references and supplied attachments. If the exact draft or manifest is missing, ask for it and hold clearance. Identify any missing, ambiguous or stale exhibit and continue with the materials that can be confirmed. Use `full` for a whole-draft request and `partial` for a subset. Inventory the draft and each listed original by path and SHA-256, giving the reason where bytes cannot be read. Read each confirmed artifact as follows.
     - For readable text, review it in place and cite line, section or page locators.
     - For PDF or another nontext format, obtain complete readable text, for example with local `pdftotext` for a text-bearing PDF or a supplied transcription. Compare the text to the original page by page, including pinpoints, and record the companion text's path and SHA-256 plus the original page mapping and check. For a scanned or partially extracted page, use a checked page-mapped transcription, which may start from OCR. When a page, quotation or citation cannot be read or reconciled to the exact original, mark that coverage incomplete and hold clearance. Readable extracts alone cannot clear unread pages.
     - For each readable artifact, list every case, statute, rule and operative order cited as authority, with artifact identifier, location, citation form, pinpoint, and quotation or proposition. Resolve each short form and `id.` to its checked antecedent. Flag ambiguous anchors. Record zero occurrences for an artifact only after a complete read.
2. **Get authoritative material.** Read the actual authority already supplied in the matter where available, including operative orders and dated forum rules for non-court proceedings. Use sufficient supplied text directly. For cases that still need lookup, load `wiser/connectors/courtlistener/CONNECTOR.md` and check whether the required action can run before taking the lookup path. If a recorded stop applies, the gateway is unattached, or the run disallows gateway use, take the applicable stop in step 3. Otherwise use `courtlistener.caselaw.search` with `q` and, where helpful, the documented `type`. After a successful search, use `courtlistener.caselaw.get_cluster` with its digit-only string `id` for the selected cluster. Read search hits from `results` and confirm the cluster's returned `id`. Search by reporter cite and by party names as needed to disambiguate, subject to step 3. Compare the reported citation and returned case name, court, date and cluster. Use the opinion link and identify the specific opinion in the cluster when a pinpoint or asserted holding needs a full-text read. Retain cluster and opinion IDs and the exact URL when available. Where additional source discovery can run and is needed, invoke `wiser`'s External Research with explicit citation and jurisdiction queries, Quick depth and the citation report as destination in `<research_request>`, authority and date limits as `<scope>`, and available copies as `<source_material>`. Review its evidence against the citation inventory.
3. **Choose the evidence path.**
   - Is the action stopped? For `needs_connect`, stop the action and name Connect Account for `courtlistener/caselaw` in the next human turn. For an unattached gateway or `needs_provider`, name Set Up Connectors. If gateway use is disallowed for this run, record that constraint without inferring an account or setup status. Record the reading as `Not available` with its reason under `wiser` Evidence Labels. Continue with independently available authoritative material, using host retrieval only when allowed. A public page or supplied copy can support its own check while the connector action remains stopped.
   - Does the lookup return no match, a different case, a search error, a rate limit or metadata without the text needed? Use manual sources below. A mismatch remains unverified until the exact authority and cite have been reconciled. For rate limits, follow the connector contract and do not poll.
   - Is the cite a statute, regulation or rule, or a very recent or unpublished opinion? Read the applicable official publisher or issuing court text, including the version and publication or citation restrictions where relevant.
   - Does a checked source supply the needed text? Read and verify the exact cite, pinpoint, quote and claim it supports. If it supplies only part, obtain the rest through the manual path or leave the cite unverified.
4. **Read sources manually when needed.** Prefer the issuing court, official reporter or statute/rule publisher. Where retrieval is allowed, use the available browser to search CourtListener's public opinion pages or Google Scholar's Case law search. Use the Caselaw Access Project only if its exact opinion page can be opened. Search by name or citation, open the actual opinion, and compare reporter citation, page and holding. For Colorado, use the official legislative or judicial publisher for statutes or court rules as applicable. If login or a CAPTCHA intervenes, ask the litigant to handle it in their browser or supply the authority. If the source cannot be obtained through an available path or a supplied copy, leave the flag and name the exact material needed.
5. **Record the result.** For every occurrence, report cite, location, proposition and pinpoint, authoritative source consulted and the exact URL or supplied file location, check result, and any limitation or next step. Use `verified` only when the cite exists in the stated form, matches the intended authority and supports its use, including any quote or paraphrase, and fits the applicable forum and date. Otherwise use `unverified` and preserve the citation for human resolution. Append `[verify]` at the cite in the annotated draft, in an exhibit note keyed to its original locator, or in the citations-only occurrence entry.
   - In the report, record the scope as exactly `full` or `partial` and the date as YYYY-MM-DD. For a draft check, record the draft path and SHA-256 and the manifest with each exhibit identifier, original path, SHA-256 and coverage (`complete` or `incomplete`). Include any companion text evidence and occurrence locators. Record exactly one citation clearance value, `cleared` or `held`. Use `cleared` only for full coverage of the exact draft and manifest with every occurrence verified and no unresolved `[verify]`. Any incomplete coverage, unresolved citation or proposition, missing artifact, or draft flag yields `held`. Carry the preflight disposition separately in the report. Citation clearance only covers authority and artifact coverage.
   - For a draft check, save `citation-report.md` and, when the exact draft is readable, `annotated-<draft-stem>.md` in the confirmed build directory. If a draft or destination is unavailable, deliver the findings and name the missing input before promising the affected file. For citations-only work, return the report to the caller or person, or save `citation-report.md` in the confirmed directory when requested. Leave originals intact. If any output path is occupied, preserve it and use the same first numbered suffix, starting at `-2`, that leaves every output path unused. Apply the Handoff label to each review output before delivery.

## Pitfalls

- An ambiguous draft version or jurisdiction must be clarified before the affected check. A corrected cite, quote, holding or edited source text needs a recheck before the current revision can clear. Never mark a source as read based on a research package alone.
- An exact match may support only a narrower proposition or be unusable under the applicable forum’s rules. State the limit and hold the occurrence for correction and re-verification.
- An authoritative source can be unavailable. Deliver the report and flagged draft with the stop and what is missing.

## Success

Each occurrence, including short forms and pinpoints, has an evidence trail and status. The exact draft, when available, is annotated where checks are incomplete. A citations-only check returns occurrence findings and records the filing hold. Production and filing remain held until the exact filing text clears the full inventory with no unresolved `[verify]`.
