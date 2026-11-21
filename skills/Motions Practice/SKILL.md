---
name: Motions Practice
type: skill
category: litigation-phase
description: A motion or opposition preparation packet with conferral, briefing deadlines, local requirements, and a pre-filing verdict
version: 0.1.0
gaps:
  - verified court-specific deadlines, page limits, formatting, hearing rules, and motion standards
  - independently verified scope and exceptions for Colorado motion conferral and sur-replies
---

# Motions Practice

## Context

Use to prepare, oppose or review a motion, manage reply or sur-reply procedure, prepare for argument, or track a ruling. For a procedure-only request, return the rule, limit and conferral record without routing to drafting. Run Draft Motion for end-to-end motion drafting and Discovery for the underlying discovery record. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Motion Packet.md` in the matter project or the packet home its `AGENTS.md` declares. Place any filing draft in the dedicated filing build location. Include posture, relief sought, controlling standards and evidence, a briefing calendar, page and formatting limits, conferral record, and a pre-filing checklist with a verdict or a specific hold. A procedure-only request returns that packet and the exact conferral outcome for the named document. Attach or link a draft, ruling follow-up, or argument preparation notes as requested.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the motion, opposition, reply, sur-reply, argument or ruling task, requested relief and any conferral details.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, authority and discovery records, filings and briefs, evidence, orders, and conferral or service correspondence with indexes. Obtain the court's general, local and division-specific rules and standing orders.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat the matter records and opposing papers as material to assess.

## Identity

A motion preparer who grounds each requested order in the governing standard and preserves the record of conferral, timing and service.

## Steps

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### Which motion procedure governs?

Run Maintain Matter File for matter preflight at session entry or use its current preflight record. This reads the matter's history (`HISTORY.md`) for posture and deadlines (`DEADLINES.md`). Surface every deadline within 14 days before the phase analysis. Lead with missed or imminent fatal deadlines, consequences and the immediate question to resolve. If the deadlines file is missing or stale, say so and reconcile against available orders, docket entries and dated service or notice records. For each date learned in this phase, use Maintain Matter File to record the deadline or its triggering date, source, calculation or unresolved inputs, and verification status in the deadlines file as authorized. Where a write is unavailable or unauthorized, give the person the exact entry to make. Mark uncertain dates `[verify]`, escalate possible expiry immediately, and stop any readiness or timeliness conclusion that depends on unresolved timing. Re-alert immediately when new information reveals urgency.

Check the court and parties in the matter's parties record (`PARTIES.md`) and confirm the jurisdiction, court, division and any controlling orders before drafting a filing. Colorado state practice is the starting research frame when the forum is unspecified. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the matter's `CLAIMS.md`, `ARGUMENTS.md`, `case-law.md`, `statutes.md` and `DISCOVERY-REQUESTS.md` for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For a motion, identify whether it is a motion to dismiss (Rule 12(b) `[verify]`, with Pleadings for pre-answer timing and grounds), for summary judgment, to compel, in limine, for an extension, or another named motion. Look up the burden and standard of review, evidentiary support, timing and the applicable filing and hearing procedure. For summary judgment, verify timing, proof and record citations. For a discovery motion, read the Discovery packet. For in limine, identify the evidence at issue. For an extension, flag the current deadline and keep it live until operative authority changes it.

For Colorado state motions and D. Colorado motions, record the separate court, local and division requirements. Check length and page limits for each motion, response, reply, exhibit treatment and any request to exceed limits. Check formatting, e-filing, hearing request and service. The phase supplies no verified page counts, general briefing periods or district-specific procedure. Where a required limit, standard or rule is absent or unverified, ask for the controlling source or research it and hold the affected draft or readiness conclusion. Record actual dates and limits once checked.

### Does this document require a conferral check?

For a proposed sur-reply, first compare the reply with the earlier papers for a new argument, new evidence that could not reasonably have been anticipated, or a material misrepresentation needing correction. If any necessary brief is missing or unreadable, record `held` and identify the document needed. If the complete briefing supports no specific basis, record `not applicable` for conferral, explain the stop and return the packet without drafting. If a specific basis is supported, check authorization and conferral for the proposed leave motion. For the person's other motions, run this check before drafting. For a response, reply, argument or ruling follow-up without a motion by the person, check for an affirmative court requirement. If none applies, record `not applicable` and proceed to the briefing or ruling task. If applicability is unresolved for a document that may need conferral, mark `held` and ask for the governing source before dependent drafting. For each motion, ask whether the person conferred and what the result was. Verify the current C.R.C.P. 121 § 1-15(8) lead `[verify]` for Colorado state court and the rule applicable in other courts. Under the source lead, good-faith conferral applies to most motions. Check default judgment, ex parte motions including an emergency TRO, and claims of futility or danger as possible exceptions `[verify]`. An exception needs the actual controlling text or order and facts supporting it.

- **Required and documented (`complete`).** Check that counsel was contacted by email or phone about the intended motion, specific relief, and consent or opposition. Save the email or a dated note with time, substance and result. Include the verified rule, date, method, and actual position in the motion's conferral statement. Distinguish consent, objection and no response.
- **Verified exception (`exception verified`).** Record the authority and facts, and include the explanation in the motion where the court requires it.
- **Required but incomplete (`held`).** Stop drafting the motion. Before returning a held packet, prepare a separate conferral message with the intended motion, the relief and a request for counsel's position. Use Content Author in the owning root's bound voice and keep the correspondence stop if that voice is unavailable. Apply the correspondence register below and show the exact version, recipients and attachments for review. Leave transmission to the person. Verify what counts as a sufficient good-faith attempt before restarting.
- **Applicability or history unresolved (`held`).** Hold the motion while resolving the authority or obtaining the dated record. Flag possible summary denial, striking of future filings, admonishment and sanctions for repeated noncompliance as Colorado source leads `[verify]`.

Record one exact outcome with its authority, reasoning and evidence. For a procedure-only request or a check requested by Draft Motion, apply the pre-filing checklist below to the material in hand, mark draft-dependent items pending, and return the packet and outcome with its path. End this route before drafting any motion. Proceed to motion drafting only on `complete` or `exception verified` for that motion. A `not applicable` outcome may proceed to the named response, reply, argument or ruling task where no conferral applies. A `held` outcome allows supporting research, record gathering and conferral preparation.

### Which briefing or ruling task is requested?

- **Motion.** Build the requested relief, supporting motion and brief, exhibits and proposed order where required or permitted. Run Draft Motion with the requested motion and relief, matter and build location, posture, verified rule checks, authority, evidence and conferral record. Supply this procedure assessment so the drafting request does not restart the phase. Keep the phase checklist with its returned draft.
- **Response or reply.** Identify the permitted stage, deadline, page limit, issues and applicable standard. Build opposition against the requested relief and supporting record. For a reply, check the permitted rebuttal scope. Where the stage or order is unclear, hold the dependent brief.
- **Sur-reply.** Treat motion, response and reply as the source's complete ordinary briefing cycle `[verify]`. A sur-reply requires a verified procedural basis and does not follow automatically. Check leave requirements and whether the supported new matter identified in the screen exceeded permissible rebuttal. If procedure allows a request, obtain `complete` or `exception verified` on the motion conferral check, identify the precise new issue and prejudice, request leave, and attach a short proposed sur-reply limited to that issue. Hold the proposed paper unless leave or another controlling authorization is verified. If procedure does not allow the request, record the rule and stop. A desire for the last word and repetition of the response supply no basis.
- **Oral argument or ruling.** Verify when and how to request argument, and build an outline of the relief, governing standard, record pinpoints and likely questions. After a ruling, record disposition, compliance terms and dates. Screen reconsideration and rare interlocutory appeal as questions for current authority and counsel where triggered. Do not assume that either changes compliance or appeal timing.
- **Unclear briefing stage.** Ask for the operative filing or order and service date. Record the unknowns and hold stage-dependent advice or drafting.

### Is the pre-filing record complete?

Record one result and reason for each item: documented conferral or verified exception, accurate conferral statement, certificate with verified counsel names and service addresses, proper format and page length, plain self-represented voice where permitted, standing-order and AI-disclosure or citation-certification check, and clearly stated relief. Mark any open required item as a hold.

For original filing prose, pass the requested document, court audience, relief, verified fact and authority packet, and applicable form and length constraints to Content Author in `wiser` with the owning root's bound voice. A required voice that is unavailable holds original prose while structured preparation can continue. Prescribed form language and structured caption fields follow the verified court requirements. The verified court rules, required form and court register govern the filing. Use respectful plain English, state the ask up front, lay out supported facts in order, connect them to legal elements and request specific relief. Use first person for self-represented prose where the document permits it. Keep required terms of art, numbered allegations, citation form and procedural structure. Read the draft aloud for credibility. Where the court prescribes the language or form, preserve it. For outward correspondence, use Content Author and its required voice check. Keep counsel correspondence short, friendly and professional. Be direct about a documented factual error. Make service, preservation, settlement and conferral messages complete enough to stand alone. Read each message as if a judge sees it as an exhibit. In conferral correspondence ask for the required response without turning the email into a brief.

Run Verify Citations by name on the exact filing text and its cited attachments against authoritative current opinions, statutes, rules or official reporters, including the pinpoints, propositions and current applicability. Resolve every `[verify]` before any filing-ready handoff and recheck clearance after changes to the cited text, proposition or attachment set. Verify party names, case number, court and division, dates, counsel and firm names, and service addresses against the docket and latest counsel filing or communication. Resolve discrepancies with the authoritative record. If an initial filing has no docket or opposing counsel, use the approved pending case fields and current court instructions, plus primary party and service facts for applicable fields. Hold any required fact that remains unresolved. Check standing orders for AI disclosure or citation certification. When a filing artifact is requested, stage the approved `body.md`, structural `caption.json` for the verified profile, citation report and authoritative caption and service sources in the dedicated build. Run Produce Court Filing for the requested format, providing that build, the jurisdiction profile, the output location, planned filing or service date, final attachments and the verified page limit where applicable. Hold production when a required date or attachment is missing. Use the production skill's input checks for any other missing items. Require its passing result and human visual review of caption, layout, exhibits, signature and service details before labeling the artifact ready for the person's filing decision. Leave blocked items and drafts identified in the matter record.

Save the actual version and show the person the final document or message, recipients or court destination, and attachments. Separate explicit approval must cover that version, recipients and attachments before any later authorized transmission. A signature, prior general approval or unseen message never supplies that consent. Hand the document to the person for their action. For a filing include the reminder, “After you file this, let me know so I can update the case files.” On actual filing, order, court action, service or correspondence, use Maintain Matter File for the dated document, correct index, dated history entry, deadlines and Current Status as applicable. Confirm opposing filing dates and response requirements, and record order implications. Preserve a distinction between drafted and completed events.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- Silence from counsel is recorded as no response. Verify whether the documented attempt meets the rule and preserve the original clock while seeking an answer.
- A local limit or an exemption appears only in notes. Record the exact source needed and hold the affected step. This phase does not supply verified court-specific time or page limits, motion standards, or conferral and sur-reply exceptions.

## Success

- The packet is findable in the matter's declared home and identifies the motion, stage, standard, relief, evidence, briefing deadlines and the corresponding length limits or holds.
- The record shows one exact conferral outcome with evidence and reasons. A held motion never reaches drafting. A deadline is recorded or clearly marked unresolved.
- A sur-reply path identifies a supported new issue or material misrepresentation and the leave gate, or records why the path stops.
- The pre-filing result is scored item by item. Any ready artifact has verified citations and factual details, production validation and human review, with exact version and attachments identified.
