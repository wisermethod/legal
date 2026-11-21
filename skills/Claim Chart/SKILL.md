---
name: Claim Chart
type: skill
category: procedure
description: Map the verified elements of a claim or defense to sourced facts and evidence and show support gaps for the current litigation stage
version: 0.3.0
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

- `<user_request>` names the claim or defense, or asks to chart a named matter's claim.
- `<context>` names the matter `AGENTS.md`, destination, jurisdiction, forum and current procedural posture.
- `<source_material>` contains the claims and history records, evidence, filings and correspondence, plus the applicable practice-area guidance and controlling text.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What supports this claim or defense?

1. Run Maintain Matter File for matter preflight and drafting or research cross-references. Which claim or defense and posture apply? If the request or claims record yields one clear choice, use it. Otherwise ask before mapping. Load the applicable practice-area expert's guidance and read the authority behind the element list. For arbitration, use the governing substantive law and the operative forum materials for the procedural posture. Record a verified element separately from a missing procedural standard.
2. Is the element list complete and supported by checked authority for this jurisdiction and posture? If yes, retain the authorities and pinpoints. If the expert's coverage is a stub, contains `[verify]`, or the authority is thin or disputed, run Verify Citations on the cited definitions. If the governing text still cannot support an element list, stop the affected chart and identify the missing law. If the text confirms only part of the list, mark any partial analysis as such and name the missing definitions.
3. Gather record facts for each verified element. Cite the file and pinpoint, filing, exhibit or correspondence that makes each assertion checkable. Record material contrary evidence and distinguish allegations from evidence. Does an element have sourced support, conflicting or limited support, or no support identified? Show the precise gap for each row. Use this table structure.

   | Element | Supporting facts | Evidence/source | Gap? |
   |---|---|---|---|
   | Element and verified authority | Facts the record supplies | File and pinpoint | Yes or no, with basis |

4. Summarize which elements are supported, which need pleading detail, discovery or further theory development, and what the current record can support at the stated posture. If a gap appears fatal, the theory appears unsupported, or the matter exceeds the litigant's depth, suggest licensed counsel and name the element or decision that warrants review. Save the Markdown chart. Is Word output requested? If yes, prepare UTF-8 JSON with `title` and `paragraphs`, one labeled paragraph per element retaining the facts, source and gap, followed by the assessment. From `wiser`'s `word-document` directory run `node scripts/word-document.js create --input <json> --output <fresh.docx>` with absolute paths. Require a successful result with the canonical `output` and reconcile the Word text to every chart row. If a native table is required, report that the create schema takes paragraphs and keep the Markdown chart available for import into Word. If creation fails or was not requested, preserve the Markdown chart and report any Word hold.

## Pitfalls

- A persuasive allegation has no exhibit or file location. Label it as an allegation with its source, or mark no record support if the allegation itself is unsourced.
- The person supplied multiple claims or an ambiguous chart destination. Confirm the scope and destination before writing. Send newly surfaced discovery needs to Maintain Matter File for the confirmation step.

## Success

Each charted element points to checked authority. Each supporting fact resolves to its source. The chart names every identified gap, states its posture and limits, and avoids predicting the result.
