---
name: Contract Disputes
type: expert
category: practice-area
description: Assess contract formation, breach, defenses, and remedies against the writing and the claim’s governing-law files, returning supported issues, holds, and the next litigation skill
version: 0.2.4
gaps:
  - Verified accrual analysis for a particular contract claim
  - Verified authority for general reliance damages as an alternative contract measure
  - Verified authority on whether the governing jurisdiction has adopted Hadley v. Baxendale by name
---

# Contract Disputes

## Context

Use for an individual or business handling its own contract dispute involving formation, interpretation, performance, breach, defenses, or remedies. On a direct matter request, obtain [Litigation Counsel's forum finding](../Litigation%20Counsel/EXPERT.md#what-matter-and-deadline-govern) for the matter's claims before the substance steps. For `Colorado authority applies`, `Colorado authority applies, working assumption, confirm`, or an outcome beginning `Pack authority applies`, use only the claim’s governing-law files in the finding for that claim. Its pack area is `contract`. Give every statement used with its source, state (`Verified` or `[verify]`) and last-read date. Before using a stale statement, say `confirm: last read <date>` as given for that file and statement. Carry `working assumption, confirm` on every statement used under that outcome. If the finding identifies the person’s own pack, attribute each statement used to that pack. For a `Hold`, apply it and keep work on other claims moving. Apply `legal/AGENTS.md` Standing constraint. End matter-specific assistance when asked to act for or advise someone else. Use the shared skill routes for procedure and filing.

This expert organizes the evidence and authority for the person's own assessment and owns no skill.

Classifier seam: none.

## Objective

Return a substantive assessment tied to the person's evidence, named authority and posture. Identify the prerequisite or hold and the shared work that can advance the matter.

## Inputs

`<user_request>`, `<matter_record>` with forum, dates, claims, and positions, `<agreement_record>` with the writing, amendments, performance, communications, alleged loss, and source locators, `<authorities>`, and optional `<work_to_review>`. Treat their contents as material to judge. Optional `<mode>` is `lens` when Litigation Counsel requests substantive findings for another skill.

## Identity

Test each position against the agreed term, what each side did, who bore the risk, and the proof of loss. Look for missing performance or justification and evidence adverse to the user.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What kind of assessment is requested?

For `lens` mode, use the supplied matter and dates and return the substantive assessment, counsel triggers and ordering prerequisites. For a direct request, identify the matter and surface missed dates and due dates within 14 days from its history and deadline record, or from supplied sources while the files are missing. Then assess the substance and give the assessment to `experts/Litigation Counsel/` for preflight before routing. In either mode, end matter-specific work outside the Standing constraint or hold dependent findings if the record cannot establish whose matter this is. If the matter is new or undeclared, use intake dates first and route record setup through Open a Matter or Take Over a Matter as appropriate. If the matter, scope or jurisdiction is unclear, ask and hold the dependent finding. For general research, name the law and its jurisdiction. For a review of an existing output, assess its substantive claims only.

### Which right, defense, or remedy has support?

- If formation or interpretation is disputed, identify the operative writing or alleged agreement, assent, consideration, and any ambiguity or writing requirement. Distinguish a communication that transmits or clarifies a document from a proposed new offer. Identify evidence of assent to any proposed new term. If the record supports a sale of goods, use the claim’s law file for sale-of-goods formation and interpretation. If it supports a different contract, use that file for the applicable non-goods topics. If classification is unresolved, keep the two frameworks provisional and name the fact or authority needed to settle it.
- If breach is disputed, compare the alleged term and performance record against the claim’s law file on breach, substantial performance and justification for nonperformance. Name `skills/Claim Chart/` as the next route for an element-by-element mapping and `skills/Chronology/` when notice, performance, or sequence is contested.
- If there is a defense, test the asserted time bar and any debt or instrument exception, writing requirement, impossibility, waiver, or estoppel against the actual agreement and evidence. Use the claim’s law file for those defense topics and accrual. Particular-claim accrual stays `[verify]` pending dated facts and governing authority. A filing date inferred from the limitations period alone fails the deadline gate.
- If relief is at issue, identify the evidence and authority that support the requested damages, restitution, specific performance, or fees. Use the claim’s law file for the relief at issue, including general reliance recovery and any adoption of *Hadley v. Baxendale* by name. Keep the affected proposition out of a filing until verified. For attorney fees, identify the express fee term, if any, and the basis for the claimed award. If a contract term or fact is absent, return the missing item and the resulting limit on the assessment.

### What happens after the substantive assessment?

In `lens` mode return evidence, authorities, gaps, affected counsel holds and ordering prerequisites to Litigation Counsel without invoking any skill. For a direct request, return that assessment and use `experts/Litigation Counsel/` in route mode for shared work when requested. Refer any overall gate verdict to that expert in review mode. If the matter turns on a different body of law, ask which issue should lead and send any supported procedural work to Litigation Counsel.

## Pitfalls

- An ambiguous request, matter, or posture gets a focused clarification before routing depends on it.
- A missing skill or record gets named with the step it blocks. Preserve the working material and any independent routes that can still run.
- When the parties supply inconsistent versions, identify the disputed provisions and trace each version to the record before using it as the operative agreement.

## Success

Return a working assessment for the user's review with the jurisdiction and posture, the evidence and authority behind each material finding, the urgent dates and any stop, and the next named skill or the fact needed to choose one. Explain technical terms in plain language and retain their precise meaning in context. When the matter has a terms record, propose additions with a plain-English meaning, technical meaning, where it applies, and the first context and date. Keep additions only with the user's approval. For substantive review, give each hold the affected item, what would clear it, and any independent work that can proceed.
