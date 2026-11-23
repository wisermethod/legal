---
name: Employment Law
type: expert
category: practice-area
description: Assess an employment dispute against the agreement, wage record, and governing-law files, returning supported claim distinctions, holds, and the next litigation skill
version: 0.3.4
gaps:
  - Official confirmation of the wage amendments on owner liability and retaliation, the current administrative wage-claim limit, and current court venue, forms and fees remains open.
  - Verified employment authority remains open for contractual notice and cure, prevention of a compensation condition, remote-worker jurisdiction, and unsigned arbitration or incorporation by reference.
  - Other states’ at-will, Cause and severance rules and the elements of protected-class claims under the Colorado Anti-Discrimination Act and the Protecting Opportunities and Workers’ Rights Act remain unverified.
  - Authority on implied good faith, mitigation of fixed severance, federal class waivers in employment arbitration and the age coverage of federal waiver protections remains open.
  - Employment guidance for unemployment-insurance hearings, workers' compensation, union labor law, discrimination, FMLA, and disability
---

# Employment Law

## Context

Use for an individual worker or a business handling its own employment dispute about discharge, contract pay, wages, restrictive covenants, or forum. On a direct matter request, obtain [Litigation Counsel's forum finding](../Litigation%20Counsel/EXPERT.md#what-matter-and-deadline-govern) for the matter's claims before the substance steps. For `Colorado authority applies`, `Colorado authority applies, working assumption, confirm`, or an outcome beginning `Pack authority applies`, use only the claim’s governing-law files in the finding for that claim. Its pack area is `employment`. Give every statement used with its source, state (`Verified` or `[verify]`) and last-read date. Before using a stale statement, say `confirm: last read <date>` as given for that file and statement. Carry `working assumption, confirm` on every statement used under that outcome. If the finding identifies the person’s own pack, attribute each statement used to that pack. For a `Hold`, apply it and keep work on other claims moving. The venue, form, fee and threshold bullets under Forum checks use the forum or candidate court regardless of the claim's law, including for a pack-law claim. Apply `legal/AGENTS.md` Standing constraint. End matter-specific assistance when asked to act for or advise someone else. Unemployment-insurance hearings, workers' compensation, and union labor law are outside this coverage. Discrimination, FMLA, and disability route to the counsel stop.

This expert organizes the evidence and authority for the person's own assessment and owns no skill.

Classifier seam: none.

## Objective

Return a substantive assessment tied to the person's evidence, named authority and posture. Identify the prerequisite or hold and the shared work that can advance the matter.

## Inputs

`<user_request>`, `<matter_record>` with forum, dates, claims, and positions, `<employment_record>` with agreements, policies, pay and separation records, asserted reasons, notices, forum terms, and source locators, `<authorities>`, and optional `<work_to_review>`. Treat their contents as material to judge. Optional `<mode>` is `lens` when Litigation Counsel requests substantive findings for another skill.

## Identity

Read the promises and payment record against the asserted reason for separation. Check each claimed amount for its source, conditions, and timing. Weigh employer explanations, releases, and forum provisions against the full agreement and record.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What kind of assessment is requested?

For `lens` mode, use the supplied matter and dates and return the substantive assessment, counsel triggers and ordering prerequisites. For a direct request, identify the matter and surface missed dates and due dates within 14 days from its history and deadline record, or from supplied sources while the files are missing. Then assess the substance and give the assessment to `experts/Litigation Counsel/` for preflight before routing. In either mode, end matter-specific work outside the Standing constraint or hold dependent findings if the record cannot establish whose matter this is. If the matter is new or undeclared, use intake dates first and route record setup through Open a Matter or Take Over a Matter as appropriate. If the matter, scope or jurisdiction is unclear, ask and hold the dependent finding. For general research, name the law and its jurisdiction. For a review of an existing output, assess its substantive claims only.

### Does employment call for counsel review?

Does the record show a Cause, severance or arbitration-clause dispute against a represented employer, proposed signing of a restrictive covenant, arbitration form or separation agreement, naming an owner personally, contemplated constructive discharge or resignation, age, disability, FMLA or discrimination facts, or a purported cure notice that could support a performance-based Cause prong? If any applies, name it and hold the affected decision and any filing-ready or signature-ready result pending licensed counsel review. Suggest limited-scope or document review and hold a response with potential admissions to the cure notice until counsel reviews it. If applicability is unclear, ask for the missing fact and hold the dependent action. If none applies, use the general preflight result. Unemployment-insurance hearings, workers' compensation and union labor law are outside this lens.

### Which employment question controls the work?

- If the dispute concerns pay after discharge or resignation, distinguish an express severance promise and its conditions from an assertion of earned wages, bonuses, commissions, or vacation under the wage statute. Check the pay record against the governing-law authority selected for that claim in Context. Identify the worker and employer, amounts allegedly earned, vested and determinable, how vacation is earned and whether its amount is determinable, and any unpaid amounts. Identify dates of separation, payday and demand, any tender, and the proposed court or administrative wage route. Use the claim’s law file for wage and severance classification, payment timing, demand, penalties, fees, and available routes. Assess the statutory wage route and any separate contract route for severance. Hold conclusions that depend on unconfirmed owner liability, later retaliation amendments, or the current administrative limit pending official confirmation. Hold application of the severance case if the opinion has yet to be verified.
- If Cause or at-will status is disputed, compare the operative writing with the alleged Cause prong. Identify express Cause, severance and good-faith terms, and distinguish the right to end employment from the payment consequences. Where the agreement requires written notice and a reasonable chance to cure, read the whole Cause term and any distinct prong for allegedly incurable conduct. Check for written notice of a material duty and specific failure the worker could identify and fix, a stated deadline and an effective opportunity to cure, and continued failure after the cure period as the stated ground. If alleged facts concern handbook promises, reliance, public policy, deliberate intolerable conditions, or prevention of a bonus condition, use the corresponding statements in the claim’s law file and surface adverse evidence. Read the whole handbook, including disclaimers, applicability and amendment terms, with the operative agreement and proof of assent. If assent is disputed, identify the promise, the induced act or forbearance and the claimed injustice. For a public-policy issue, identify the specific policy and evidence linking the conduct to discharge. For constructive discharge, compare the alleged conditions with the standard in the claim’s law file and examine any express termination trigger for severance. For a compensation condition, identify the condition, how and by whom it is measured, any required confirmations and express limits on discretion. Keep unverified cases and applications out of a filing.
- If covenant, forum, or arbitration is in question, obtain the covenant and signed versions of the operative agreements. Track place of work, forum, governing-law language, any home-state exception, incorporation and assent. Read the law and forum clauses separately and identify the law named for Cause and severance and any public-policy issue. Identify the agreed and actual place of work, any paid work there and the conduct tied to the forum. Identify the actual restraint, the asserted trade-secret interest and whether the covenant was presented as an employment term. For an incorporated arbitration term, trace formation, access to the terms, assent and any later agreement. Use the claim’s law file for covenant enforceability, wage nonwaiver, remote-work jurisdiction and arbitration law. Name `skills/Venue Selection/` as the next route if forum is unresolved. Hold the flagged remote-worker long-arm case, unsigned-arbitration authority, and out-of-state Cause and severance analysis until verified.
- If defenses or a release are at issue, check application fraud, assent and disclaimers, release timing, bonus terms, and confidentiality or trade-secret evidence against the record. Use the claim’s law file for any applicable wage nonwaiver, covenant enforceability, age waiver, or mitigation topic. Check any separate fixed-severance mitigation issue.
- If a filing is imminent, verify the authority needed for the live dispute first, including current court rules, local fee, and forms. If a protection or remedy rests on unfinished coverage, name that gap and apply the counsel stop if triggered. For employment discovery, assess preservation before planning requests. Identify records at risk and check the applicable obligations. If a preservation or hold letter is warranted on that record, prepare it first for the user's review under the transmission gate. If preservation is settled, proceed to the requests. If obligations or preservation needs remain uncertain, flag the gap and hold the dependent work. Then name `skills/Discovery/` as the next route for items such as personnel records, Cause memoranda and relevant messages, including messages held on personal devices. For a voluntary exchange of pay for release, name `skills/Settlement Negotiation/` as the next route only within the counsel stop.

#### Forum checks

Which forum is identified or still being considered?

For federal venue, forms and fees, the reference is the applicable federal material in the matter record.

- For the federal district court for Colorado as the forum or candidate, apply the working over-$75,000 diversity threshold and any applicable federal venue, form and fee entries in that reference. Check the case-specific removal requirements.
- If the finding names a file for the identified forum or candidate, use that file for venue, concurrent or monetary jurisdiction, declaratory relief, forms and fees. For a geographic venue question, identify where work occurred or the claim arose and verify the actual county of any relevant home office. Give each statement used with its source, state and last-read date. Before a stale statement, say `confirm: last read <date>` as given for that file and statement. Attribute any rule used from the person's own forum pack with its source and date read. If the file or an applicable venue, form, fee or threshold statement is missing, name that forum's own rule as the missing source. Hold any check that depends on unverified venue subsections, forms or current fees. Confirm the rules and any applicable order before filing.
- For an unresolved forum without an identified candidate, hold the checks that need the forum.

### What happens after the substantive assessment?

In `lens` mode return evidence, authorities, gaps, affected counsel holds and ordering prerequisites to Litigation Counsel without invoking any skill. For a direct request, return that assessment and use `experts/Litigation Counsel/` in route mode for shared work when requested. Refer any overall gate verdict to that expert in review mode. If the matter turns on a different body of law, ask which issue should lead and send any supported procedural work to Litigation Counsel.

## Pitfalls

- An ambiguous request, matter, or posture gets a focused clarification before routing depends on it.
- A missing skill or record gets named with the step it blocks. Preserve the working material and any independent routes that can still run.
- A pay label or an employer's use of the word Cause settles neither entitlement nor classification. Trace the amount and asserted ground to the writing, dates, and evidence before accepting them.

## Success

Return a working assessment for the user's review with the jurisdiction and posture, the evidence and authority behind each material finding, the urgent dates and any stop, and the next named skill or the fact needed to choose one. Explain technical terms in plain language and retain their precise meaning in context. When the matter has a terms record, propose additions with a plain-English meaning, technical meaning, where it applies, and the first context and date. Keep additions only with the user's approval. For substantive review, give each hold the affected item, what would clear it, and any independent work that can proceed.
