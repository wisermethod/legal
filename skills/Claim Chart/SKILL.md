---
name: Claim Chart
type: skill
category: procedure
description: Map the verified elements of a claim or defense to sourced facts and evidence and show support gaps for the current litigation stage
version: 0.3.3
gaps:
  - An element list with missing or unverified governing authority is held until that authority can be checked.
---

# Claim Chart

## Context

Use for "build a claim chart," "chart the elements" or "element-by-element" in the litigant's own matter. Apply the legal constitution's Standing constraint. Assess the support in the record and leave filing decisions with the litigant.

Classifier seam: none.

## Objective

Save `claim-chart-<claim-slug>.md` in the matter or its dedicated build directory, with one row per verified element and a short assessment of support for the current posture. An optional `.docx` reproduces each row's labeled fields in Word paragraphs.

## Inputs

Resolve the owning root through `wiser` Workspace Model and read its instructions and the matter's `AGENTS.md` before using matter files. If the owning root or matter is missing or ambiguous, surface any known urgent date and ask for the missing choice before charting. Use the matter's declared build home when it has one and the matter directory otherwise. Confirm conflicting destination instructions before writing.

- `<user_request>` names the claim or defense, or asks to chart a named matter's claim.
- `<context>` names the matter `AGENTS.md`, destination, jurisdiction, forum and current procedural posture.
- `<source_material>` contains the claims and history records, evidence, filings and correspondence, plus the applicable practice-area guidance and controlling text.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work. For a review of an existing output, assess its substantive claims only and read each claim's outcome in that finding before using any Colorado element.

### What supports this claim or defense?

1. Run Maintain Matter File for matter preflight and drafting or research cross-references. Which claim or defense and posture apply? If the request or claims record yields one clear choice, use it. Otherwise ask before mapping. Load the applicable practice-area expert's guidance and read the authority behind the element list. Use the expert's Colorado authority and every Colorado statement in the steps only for a claim whose outcome in the preflight forum finding begins `Colorado authority applies`. If the outcome ends `working assumption, confirm`, carry that flag on every Colorado statement used. For a `Hold`, apply it using step 2's held-record path and keep work on other claims moving. Build the element list only from authority for the claim's governing law. For arbitration, use the governing substantive law and the operative forum materials for the procedural posture. Record a verified element separately from a missing procedural standard.
2. Is the element list complete and supported by checked authority for this jurisdiction and posture? If yes, retain the authorities and pinpoints. If the expert's coverage is a stub, contains `[verify]`, or the authority is thin or disputed, run Verify Citations as a scoped check with the exact cited definitions, their locators, the forum and date, and any supplied authority. Use the occurrence findings. If only some elements are confirmed, chart only those, label the result partial, and name the missing definitions and what would let work resume. If none is confirmed, stop the mapping and return a held record naming the missing law, affected claim and resumption condition. Save it at the chart destination when confirmed and writable. An empty element table cannot stand for that record.
3. Gather record facts for each verified element. Cite the file and pinpoint, filing, exhibit or correspondence that makes each assertion checkable. Record material contrary evidence and distinguish allegations from evidence. Does an element have sourced support, conflicting or limited support, or no support identified? Show the precise gap for each row. Use this table structure.

   | Element | Supporting facts | Evidence/source | Gap? |
   |---|---|---|---|
   | Element and verified authority | Facts the record supplies | File and pinpoint | Yes or no, with basis |

4. Summarize which elements are supported, which need pleading detail, discovery or further theory development, and what the current record can support at the stated posture. If a gap appears fatal, the theory appears unsupported, or the matter exceeds the litigant's depth, suggest licensed counsel and name the element or decision that warrants review. Give the Handoff label in the handoff message, never in the chart or a delivered Word copy. Use the claim name as a lowercase hyphenated slug. Save the Markdown chart to the confirmed destination. Reuse an identical Markdown chart. Preserve a different existing chart and use the first unused numbered suffix starting at `-2`.
5. Is a Word copy of a chart requested? If no, deliver the Markdown. If a native table is required, report that the create schema takes paragraphs and keep the Markdown chart available for import into Word. Otherwise locate `word-document` through the composed `wiser` plugin's `tools/AGENTS.md`, load its tool contract, and prepare UTF-8 JSON with `title` and `paragraphs`. Use one labeled paragraph per element retaining the facts, source and gap, followed by the assessment. From that tool's directory run `node scripts/word-document.js create --input <json> --output <fresh.docx>` with absolute paths. Use the chart's stem, with the first unused numbered suffix starting at `-2` if the Word path already exists. Require success with the canonical `output`. Read the output in Word or inspect each main-document paragraph in `word/document.xml` from the DOCX package and reconcile the text to the chart. If creation or read-back fails, deliver the Markdown and report the specific Word hold.

## Pitfalls

- A persuasive allegation has no exhibit or file location. Label it as an allegation with its source, or mark no record support if the allegation itself is unsourced.
- The person supplied multiple claims or an ambiguous chart destination. Confirm the scope and destination before writing. Send newly surfaced discovery needs to Maintain Matter File for the confirmation step.

## Success

Each charted element points to checked authority. Each supporting fact resolves to its source. The chart names every identified gap, states its posture and limits, and avoids predicting the result. A held record with no chart identifies the missing law and resumption condition. A delivered Word copy matches the chart, and neither holds the Handoff label.
