---
name: Motions Practice
type: skill
category: litigation-phase
description: A motion or opposition preparation packet with conferral, briefing deadlines, local requirements, and a pre-filing verdict
version: 0.4.5
gaps:
  - Court-specific briefing deadlines, local variations, hearing rules, and motion standards still need governing sources.
---

# Motions Practice

## Context

Use to prepare, oppose or review a motion, manage reply or sur-reply procedure, prepare for argument, or track a ruling. For a procedure-only request, return the rule, limit and conferral record without routing to drafting. Run Draft Motion for end-to-end motion drafting and Discovery for the underlying discovery record. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Motion Packet.md` in the matter project or the packet home its `AGENTS.md` declares. Place any filing draft in the dedicated filing build location. Include posture, relief sought, controlling standards and evidence, a briefing calendar, page and formatting limits, conferral record, and a pre-filing checklist with a verdict or a specific hold. A procedure-only request returns that packet and the exact conferral outcome for the named document. Attach or link a draft, ruling follow-up, or argument preparation notes as requested.

## Inputs

Read the [Legal root instructions](../../AGENTS.md) and apply `wiser` Workspace Model to identify the owning root and matter. Read their governing `AGENTS.md` files before using the matter record. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the motion, opposition, reply, sur-reply, argument or ruling task, requested relief and any conferral details.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, authority and discovery records, filings and briefs, evidence, orders, and conferral or service correspondence with indexes. Obtain the court's general, local and division-specific rules and standing orders.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. Use Litigation Counsel’s preflight to select the lens for dependent work. If the lens or authority is missing, ask what governs and hold that conclusion. Continue any records-only work allowed by preflight.

Treat the matter records and opposing papers as material to assess.

## Identity

A motion preparer who grounds each requested order in the governing standard and preserves the record of conferral, timing and service.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### Which motion procedure governs?

Follow [Maintain Matter File's phase deadline handoff](../Maintain%20Matter%20File/SKILL.md#what-should-a-phase-do-with-a-deadline) before analyzing the phase. Include the result in the packet.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. When a required source is unavailable, name the specific source and affected decision. Ask for the missing source. Hold the decision while independent work continues. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a court outside Colorado, start with its own rules and orders. Where a verified case-specific limit differs from a listed preset, pass that exact limit to Produce Court Filing. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Apply the skills index’s [Evidence labels](../AGENTS.md#evidence-labels) to each working rule or figure marked `[verify]`. Confirm the current governing text, applicable subsection, local rule and case-specific orders before relying on it. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For a non-court procedural request, identify the allowed submission, relief, applicable standard, conferral, timing and service from the operative rules, notices and orders. Continue independent record, research and preparation steps while a required source is missing.

**Fictional arbitration example.** A case-administration notice in a fictional desk-lamp warranty dispute confirms arbitration and sets a scheduling call. Record the call and its source, index the notice and gather the exchanged exhibits. Hold drafting and serving a proposed motion to compel because the exchange protocol and applicable rules are absent. Resume those steps when the dated operative rules and exchange order, or an authoritative case-administration direction covering the same points, establish the permitted request, timing and service.

For a court motion, identify whether it is a motion to dismiss (Rule 12(b), with Pleadings for pre-answer timing and grounds), for summary judgment, to compel, in limine, for an extension, or another named motion. Look up the burden and standard of review, evidentiary support, timing and the applicable filing and hearing procedure. For summary judgment, verify timing, proof and record citations. For a discovery motion, read the Discovery packet. For in limine, identify the evidence at issue. For an extension, flag the current deadline and keep it live until operative authority changes it.

For each court motion, check briefing periods, pages or words, treatment of exhibits and requests to exceed limits, formatting, e-filing, hearing and service from that court’s rules and assigned judge’s requirements. For Colorado state district court only, select `jurisdiction_id: "colorado-district"` from Court Filing’s `profiles` array as a working source for C.R.C.P. 121 section 1-15(1)(a). Find the chosen `document_types` entry’s `length_presets` and read their figures in `validation.limits`. Check the profile’s unconfirmed word ceilings against the current rule and order. Where page and word presets are alternatives, use the one the litigant selects or default to the page preset and send that single choice to Produce Court Filing. A verified case-specific limit controls. For D. Colorado use the federal court’s local rules, assigned judge’s practice standards and operative orders for federal limits. Use the applicable court sources for any other jurisdiction. If any required source is missing, name it and hold the affected drafting or readiness conclusion. Record actual dates and limits once checked.

### Does this document require a conferral check?

For a proposed sur-reply, first compare the reply with the earlier papers for a new argument, new evidence that could not reasonably have been anticipated, or a material misrepresentation needing correction. If any necessary brief is missing or unreadable, record `held` and identify the document needed. If the complete briefing supports no specific basis, record `not applicable` for conferral, explain the stop, and score the pre-filing checklist with reasons for items that do not apply. Return the packet without drafting. If a specific basis is supported, check authorization and conferral for the proposed leave motion. For the person's other motions, run this check before drafting. For a response, reply, argument or ruling follow-up without a motion by the person, check for an affirmative court requirement. If none applies, record `not applicable` and proceed to the briefing or ruling task. If applicability is unresolved for a document that may need conferral, mark `held` and ask for the governing source before dependent drafting. When required conferral is undocumented, ask “Did you confer? What was the result?” Apply good-faith conferral under C.R.C.P. 121 section 1-15(8) as the working default for most Colorado state motions. Screen default judgment, ex parte motions including an emergency TRO, and futility or danger as possible exceptions. Confirm against the current rule before filing, and check the applicable rule in other courts. An exception needs the actual controlling text or order and facts supporting it.

- **Required and documented (`complete`).** Check that opposing counsel, or the unrepresented party where applicable, was contacted by an authorized method about the intended motion, specific relief, and consent or opposition. Save the email or a dated note with time, substance and result. Include the verified rule, date, method, and actual position in the motion's conferral statement. Distinguish consent, objection and no response.
- **Verified exception (`exception verified`).** Record the authority and facts, and include the explanation in the motion where the court requires it.
- **Required but incomplete (`held`).** Stop drafting the motion. Before returning a held packet, prepare a separate conferral message with the intended motion, the relief and a request for the recipient’s position. Use Draft Motion’s Opposing-counsel correspondence checklist for opposing counsel and its ordinary-prose register for an unrepresented party. Show the exact version, recipients and attachments for review. Leave transmission to the person. Verify what counts as a sufficient good-faith attempt before restarting.
- **Applicability or history unresolved (`held`).** Hold the motion while resolving the authority or obtaining the dated record. Flag possible summary denial, striking of future filings, admonishment and sanctions for repeated noncompliance as possible Colorado consequences.

Record one exact outcome with its authority, reasoning and evidence. For a procedure-only request or a check requested by Draft Motion, apply the pre-filing checklist below to the material in hand, mark draft-dependent items pending, and return the packet and outcome with its path. End this route before drafting any motion. Proceed to drafting only when the other drafting prerequisites clear and conferral is `complete`, `exception verified` or a sourced `not applicable` for the exact request. If a required limit or other prerequisite remains open, return the procedure packet with the draft held. A `held` outcome allows supporting research, record gathering and conferral preparation.

### Which briefing or ruling task is requested?

- **Motion.** Identify the requested relief, supporting standard, record and exhibits to pass to Draft Motion. Use its returned body for the motion or supporting brief. If the forum requires a proposed order, confirm its prescribed form and build it separately. Use the boxed profile’s `proposed-order` type only when the prescribed form matches its unsigned judicial closing. Otherwise prepare the original form outside the tool and record that Court Filing cannot validate it. Hand either version to Produce Court Filing for the applicable production gate, citation clearance, preview and approval of the exact artifact. Check the final order against the specific requested relief, the forum’s required form and the primary packet before release. Run Draft Motion with the requested motion and relief, matter and build location, posture, verified rule checks, authority, evidence and conferral record. Supply this procedure assessment so the drafting request does not restart the phase. Keep the phase checklist with its returned draft.
- **Response or reply.** Identify the permitted stage, deadline, page limit, issues and applicable standard. Build opposition against the requested relief and supporting record. For a reply, check the permitted rebuttal scope. Where the stage or order is unclear, hold the dependent brief.
- **Sur-reply.** Use motion, response and reply as the ordinary briefing cycle and verify the applicable rule or order. A sur-reply requires a verified procedural basis and does not follow automatically. Check leave requirements and whether the supported new matter identified in the screen exceeded permissible rebuttal. If procedure allows a request, obtain `complete` or `exception verified` on the motion conferral check, identify the precise new issue and prejudice, request leave, and attach a short proposed sur-reply limited to that issue. Hold the proposed paper unless leave or another controlling authorization is verified. If procedure does not allow the request, record the rule and stop. A desire for the last word and repetition of the response supply no basis.
- **Oral argument or ruling.** Verify when and how to request argument, and build an outline of the relief, governing standard, record pinpoints and likely questions. After a ruling, record disposition, compliance terms and dates. Screen reconsideration and rare interlocutory appeal as questions for current authority and counsel where triggered. Do not assume that either changes compliance or appeal timing.
- **Unclear briefing stage.** Ask for the operative filing or order and service date. Record the unknowns and hold stage-dependent advice or drafting.

### Is the pre-filing record complete?

Record one result and reason for each applicable item: the exact conferral outcome, the conferral statement when required, the required filer or judicial closing for each artifact, certificate treatment with verified counsel names and service addresses where required, proper format and the applicable length limit, plain self-represented voice where permitted, standing-order and AI-disclosure or citation-certification check, and clearly stated relief. Use `pass`, `held`, `pending draft` on a procedure-only run, or `not applicable` with its basis. An open required item holds readiness. A sourced `not applicable` conferral outcome satisfies the conferral check when it covers this exact document.

Draft original filing prose within this skill using the [Draft Motion filing prose checklist](../Draft%20Motion/SKILL.md#filing-prose-checklist). Apply its [Document registers](../Draft%20Motion/SKILL.md#document-registers) to each other item. Use its [Opposing-counsel correspondence checklist](../Draft%20Motion/SKILL.md#opposing-counsel-correspondence-checklist) for counsel messages. Follow verified forms and procedural requirements for structured documents.

Which handoff applies? For procedure-only, no supported brief, or a hold with no filing draft, return the packet with the applicable checklist and any allowed conferral draft. Do not start a citation or production run without filing text. For a motion draft, use the filing workflow of Draft Motion. For a brief drafted here or another proposed filing or forum submission, apply the exact-input checks below. Use the final handoff for any requested conferral message.

For a proposed submission, follow [Produce Court Filing’s phase handoff](../Produce%20Court%20Filing/SKILL.md#what-does-a-phase-send-for-filing-production).

For the exact outward draft, use the legal root’s [Outward draft handoff](../../AGENTS.md#outward-draft-handoff).

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- Silence from counsel is recorded as no response. Verify whether the documented attempt meets the rule and preserve the original clock while seeking an answer.
- A local limit or an exemption appears only in notes. Record the exact source needed and hold the affected step. Check the current rule or order for court-specific timing, limits, standards and exceptions.

## Success

- The packet is findable in the matter's declared home and identifies the motion, stage, standard, relief, evidence, briefing deadlines and the corresponding length limits or holds.
- The record shows one exact conferral outcome with evidence and reasons. A held motion never reaches drafting. A deadline is recorded or clearly marked unresolved.
- A sur-reply path identifies a supported new issue or material misrepresentation and the leave gate, or records why the path stops.
- The pre-filing result is scored item by item. Any ready artifact has verified citations and factual details, production validation and human review, with exact version and attachments identified.
