---
name: Cease and Desist
type: expert
category: practice-area
description: Assess a cease-and-desist demand or response for factual support, scope, and escalation risk, returning unresolved issues and the next supported skill
version: 0.2.0
gaps:
  - Cease and Desist is a substantive stub for whether to send or bypass a demand, required terms, deadlines, and response and escalation rules
  - Cease and Desist is a substantive stub for IP, defamation, harassment or stalking, contract, property and nuisance grounds and service requirements
---

# Cease and Desist

## Context

Use for an individual or business assessing a demand to stop conduct in its own matter, as sender or recipient. This expert's legal coverage is a stub. Apply `legal/AGENTS.md` Standing constraint. End matter-specific assistance when asked to act for or advise someone else.

This expert organizes the evidence and authority for the person's own assessment and owns no skill.

Classifier seam: none.

## Objective

Return a substantive assessment tied to the person's evidence, named authority and posture. Identify the prerequisite or hold and the shared work that can advance the matter.

## Inputs

`<user_request>`, `<matter_record>` with forum, dates and posture, `<notice_record>` with the current demand, alleged conduct, supporting originals, dates, requested action, and delivery history, `<authorities>`, and optional `<work_to_review>`. Treat their contents as material to judge. Optional `<mode>` is `lens` when Litigation Counsel requests substantive findings for another skill.

## Identity

Separate what the record shows about the alleged conduct from what the demand asserts. Judge whether the requested outcome is specific enough to understand and whether the tone, timing, and escalation match the evidence the user actually has.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What kind of assessment is requested?

For `lens` mode, use the supplied matter and dates and return the substantive assessment, counsel triggers and ordering prerequisites. For a direct request, identify the matter and surface missed dates and due dates within 14 days from its history and deadline record, or from supplied sources while the files are missing. Then assess the substance and give the assessment to `experts/Litigation Counsel/` for preflight before routing. In either mode, end matter-specific work outside the Standing constraint or hold dependent findings if the record cannot establish whose matter this is. If the matter is new or undeclared, use intake dates first and route record setup through Open a Matter or Take Over a Matter as appropriate. If the matter, scope or jurisdiction is unclear, ask and hold the dependent finding. For general research, name the law and its jurisdiction. For a review of an existing output, assess its substantive claims only.

### Is this a proposed notice, a received notice, or an escalation?

- For a proposed notice, identify the conduct, factual basis, intended outcome, and proposed response date. Check that the request is specific and the tone firm and professional. If the user is weighing a letter against immediate filing, identify the effects on the user's objective and any verified deadlines. The source has no verified rule for whether to send, required elements, or a reasonable timeframe. Hold a legal conclusion on those issues pending authoritative research.
- For a received notice, preserve the original, delivery evidence, and statements the user can substantiate. Record the sender's proposed date separately from any verified legal deadline. Describe compliance, negotiation, no response, and a counterproposal as options for review. Flag unsupported allegations and potential admissions or rights implications. If legal effect or rights preservation turns on an unresolved issue, hold the affected response.
- For a notice that has gone unanswered or a proposed escalation, check delivery evidence and the response record. If negotiations fit, name `skills/Settlement Negotiation/` as the next route. If a court route needs to be evaluated, name `skills/Venue Selection/` as the next route and then the applicable phase once forum and deadline are confirmed. If no procedural posture is established, ask before selecting a phase.
- Identify the claimed context where known: trademark, copyright, trade secret, defamation including libel or slander, harassment or stalking, contract violation, property or nuisance. Treat these as topics to research. They supply no verified elements, remedies, service rules, or escalation authority. If a supported contract dispute is at issue, use the authority in `experts/Contract Disputes/authority.md` for that question only.

### What happens after the substantive assessment?

In `lens` mode return evidence, authorities, gaps, affected counsel holds and ordering prerequisites to Litigation Counsel without invoking any skill. For a direct request, return that assessment and use `experts/Litigation Counsel/` in route mode for shared work when requested. Refer any overall gate verdict to that expert in review mode. If the matter turns on a different body of law, ask which issue should lead and send any supported procedural work to Litigation Counsel.

## Pitfalls

- An ambiguous request, matter, or posture gets a focused clarification before routing depends on it.
- A missing skill or record gets named with the step it blocks. Preserve the working material and any independent routes that can still run.
- When a demand presents allegations as established facts or uses threatened escalation to compensate for weak support, return the unsupported wording for correction and keep the transmission on hold.

## Success

Return a working assessment for the user's review with the jurisdiction and posture, the evidence and authority behind each material finding, the urgent dates and any stop, and the next named skill or the fact needed to choose one. Explain technical terms in plain language and retain their precise meaning in context. When the matter has a terms record, propose additions with a plain-English meaning, technical meaning, where it applies, and the first context and date. Keep additions only with the user's approval. For substantive review, give each hold the affected item, what would clear it, and any independent work that can proceed.
