---
name: Verify Citations
type: skill
category: procedure
description: Check every legal citation and the proposition it supports, then return a citation report and an annotated draft with any filing holds
version: 0.3.0
gaps:
  - The case-law connector does not provide a dedicated reporter-citation lookup or opinion-text operation. Checks need a full-text source when its returned material is insufficient.
  - State docket coverage through Trellis was planned and is unavailable. Use authoritative public or supplied records where available.
---

# Verify Citations

## Context

Use for "verify citations," "check the cites," and before any filing or production handoff. Apply the legal constitution's Standing constraint. A cite must resolve to authority actually read and cover the use the draft makes of it. Model memory, search snippets and a plausible case name cannot clear the gate.

Classifier seam: none.

## Objective

Save a citation report and annotated copy of the draft alongside the filing build inputs, with a reproducible clearance or hold for the exact draft reviewed.

## Inputs

- `<user_request>` identifies the draft or cites to check.
- `<source_material>` includes the exact Markdown or plain-text draft and the cited-attachment manifest, even when it is empty. For each attachment referred to in the filing, or separately submitted for its legal citations, provide an exhibit identifier and the path to the exact original file. The manifest identifies the draft reference or separate submission. Include any readable companion text with its path and page mapping. Provide any supplied primary text and existing verification report.
- `<context>` supplies the build path, jurisdiction, document type and relevant rule or law date, when known. A scoped request can produce a partial report. Filing clearance requires the whole draft.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### Which sources support the exact artifacts?

1. **Inventory the exact inputs.** Compare the manifest to the draft references and supplied attachments. If an exhibit is missing, ambiguous or supplied at the wrong revision, record that hold. Inventory the draft and each listed original by path and SHA-256. Can each artifact be read in full?
   - For readable text, review it in place and cite line, section or page locators.
   - For PDF or another nontext format, obtain complete readable text, for example with local `pdftotext` for a text-bearing PDF or a supplied transcription. Compare the text to the original page by page, including pinpoints, and record the companion text's path and SHA-256 plus the original page mapping and check. For a scanned or partially extracted page, use a checked page-mapped transcription, which may start from OCR. When a page, quotation or citation cannot be read or reconciled to the exact original, mark that coverage incomplete and hold clearance. Readable extracts alone cannot clear unread pages.
   - For each readable artifact, list every case, statute and rule occurrence with artifact identifier, location, citation form, pinpoint, and quotation or proposition. Resolve each short form and `id.` to its checked antecedent. Flag ambiguous anchors. Record zero occurrences for an artifact only after a complete read.
2. **Get authoritative material.** Read the actual authority already supplied in the matter where available, including operative orders and dated forum rules for non-court proceedings. For cases that need lookup, load `wiser/connectors/courtlistener/CONNECTOR.md` and use `courtlistener.caselaw.search` with `q` and, where helpful, the documented `type`; use `courtlistener.caselaw.get_cluster` with its digit-only string `id` for the selected cluster. Read search hits from `results` and confirm the cluster's returned `id`. Search by reporter cite and by party names as needed to disambiguate. Compare the reported citation and returned case name, court, date and cluster. Use the opinion link and identify the specific opinion in the cluster when a pinpoint or asserted holding needs a full-text read. Retain cluster and opinion IDs and the exact URL when available. For additional source discovery, compose `wiser`'s External Research with the precise citation and jurisdiction as `<research_request>`, authority and date limits as `<scope>`, and available copies as `<source_material>`. Review its evidence against the citation inventory.
3. **Choose the evidence path.**
   - Does the gateway return `needs_connect` or `needs_provider`? Stop the connector-dependent step and follow `wiser/AGENTS.md` for the relevant next human turn, Connect Account or Set Up Connectors. Record the missing reading per the base constitution. Continue only with independently available authoritative material. A public page the host retrieves or a copy the person supplies can support its own check. It does not clear the connector stop.
   - Does the lookup return no match, a different case, a search error, a rate limit or metadata without the text needed? Use manual sources below. A mismatch remains unverified until the exact authority and cite have been reconciled. For rate limits, follow the connector contract and do not poll.
   - Is the cite a statute, regulation or rule, or a very recent or unpublished opinion? Read the applicable official publisher or issuing court text, including the version and publication or citation restrictions where relevant.
   - Does a checked source supply the needed text? Read and verify the exact cite, pinpoint, quote and claim it supports. If it supplies only part, obtain the rest through the manual path or leave the cite unverified.
4. **Read sources manually when needed.** Prefer the issuing court, official reporter or statute/rule publisher. For full-text access, use the available browser to search CourtListener's public opinion pages or Google Scholar's Case law search. Use the Caselaw Access Project only if its exact opinion page can be opened. Search by name or citation, open the actual opinion, and compare reporter citation, page and holding. For Colorado, use the official legislative or judicial publisher for statutes or court rules as applicable. If login or a CAPTCHA intervenes, ask the litigant to handle it in their browser or supply the authority. If neither a confirmed source nor another authoritative copy is available, leave the flag.
5. **Record the result.** For every occurrence, report cite, location, proposition and pinpoint, authoritative source consulted and the exact URL or supplied file location, check result, and any limitation or next step. Use `verified` only when the cite exists in the stated form, matches the intended authority and supports its use, including any quote or paraphrase, and fits the applicable forum and date. Otherwise use `unverified`, append `[verify]` at the cite in the annotated draft or in an exhibit note keyed to its original locator and preserve the citation for human resolution. Save `citation-report.md` and the annotated draft in the build directory. In the report, record the scope as exactly `full` or `partial`, the date as YYYY-MM-DD, the draft path and SHA-256 and the manifest with each exhibit identifier, original path, SHA-256 and coverage (`complete` or `incomplete`). Include any companion text evidence and occurrence locators. Record exactly one citation clearance value, `cleared` or `held`. Use `cleared` only for full coverage of the exact draft and manifest with every occurrence verified and no unresolved `[verify]`. Any incomplete coverage, unresolved citation or proposition, missing artifact, or draft flag yields `held`. Carry the preflight disposition separately in the report. Citation clearance only covers authority and artifact coverage.

## Pitfalls

- An ambiguous draft version or jurisdiction must be clarified before the affected check. A corrected cite, quote, holding or edited source text needs a recheck before the current revision can clear. Never mark a source as read based on a research package alone.
- An exact match may support only a narrower proposition or be unusable under the applicable forum’s rules. State the limit and hold the occurrence for correction and re-verification.
- An authoritative source can be unavailable. Deliver the report and flagged draft with the stop and what is missing.

## Success

Each occurrence, including short forms and pinpoints, has an evidence trail and status. The matching draft is annotated where checks are incomplete. Production and filing remain held until the exact filing text clears the full inventory with no unresolved `[verify]`.
