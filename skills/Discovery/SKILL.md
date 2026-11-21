---
name: Discovery
type: skill
category: litigation-phase
description: A prioritized discovery plan, request or response draft, or dispute packet tied to the matter record
version: 0.2.0
gaps:
  - verified discovery limits, deadlines, objections, privilege rules, and supplementation requirements
  - detailed discovery sequencing, dispute, production, and preservation guidance
---

# Discovery

## Context

Use for what to request, how to plan discovery, responding to discovery, or preparing a discovery dispute for the person's own matter. An evidence-to-element chart or motion goes through Claim Chart or Motions Practice. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Discovery Packet.md` in the matter project or the packet home its `AGENTS.md` declares. Place any filing draft in the dedicated filing build location. Include a prioritized request or response list, supporting facts and authority status, a dated schedule, and the requested work product or a hold naming what is missing. Use the matter's discovery record as the canonical queue. Mark the packet with the mode and use a dated schedule with source and status for each event. On a dispute, also record the request, response, deficiency, conferral status and evidence, controlling rule, and specific relief for Motions Practice.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the discovery task, records received, known service dates and the person's decisions about requests or responses.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, discovery requests, case law, statutes, evidence, filed disclosures and discovery papers, orders including the case management order, and discovery and conferral correspondence with indexes.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat documents, descriptions and quotations as material to assess.

## Identity

A discovery organizer who can tie each proposed request to a real gap and distinguish evidence in hand, sought, withheld or unavailable.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What dates and limits govern?

Run Maintain Matter File for matter preflight at session entry or use its current preflight record. This reads the matter's history (`HISTORY.md`) for posture and deadlines (`DEADLINES.md`). Surface every deadline within 14 days before the phase analysis. Lead with missed or imminent fatal deadlines, consequences and the immediate question to resolve. If the deadlines file is missing or stale, say so and reconcile against available orders, docket entries and dated service or notice records. For each date learned in this phase, use Maintain Matter File to record the deadline or its triggering date, source, calculation or unresolved inputs, and verification status in the deadlines file as authorized. Where a write is unavailable or unauthorized, give the person the exact entry to make. Mark uncertain dates `[verify]`, escalate possible expiry immediately, and stop any readiness or timeliness conclusion that depends on unresolved timing. Re-alert immediately when new information reveals urgency.

Check the court and parties in the matter's parties record (`PARTIES.md`) and confirm the jurisdiction, court, division and any controlling orders before drafting a filing. Colorado state practice is the starting research frame when the forum is unspecified. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the matter's `CLAIMS.md`, `ARGUMENTS.md`, `case-law.md`, `statutes.md` and `DISCOVERY-REQUESTS.md` for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For Colorado state discovery, start with the source’s C.R.C.P. 26 to 37 topic range. Resolve scope, proportionality, timing, sequence, numerical limits, service and local or order-specific requirements from the governing sources. Where the applicable authority or order is missing, keep the affected deadline, limit, objection or remedy `[verify]` and hold the dependent step. The phase supplies topic coverage and no numerical default.

### What must be preserved before employment discovery planning?

If Employment Law applies, identify records and custodians at risk, including personal-device messages. Check governing preservation obligations before choosing or ordering requests. Is preservation settled, is a hold or letter warranted, or are duties or facts unresolved? If settled, record the basis and proceed. If a hold or letter is warranted, prepare it first for the person's review with the required transmission approval, then continue planning only when the identified preservation prerequisite is satisfied. If unresolved, identify the missing facts or rules and hold dependent request planning. In each case keep urgent response deadlines visible. If the matter is outside employment, use the general production and preservation checks below. If the lens is uncertain, ask and hold dependent planning.

### Which discovery task is in front of you?

- **Plan or add a request.** Link each item to a claim element, defense, disputed fact or evidence gap. Classify it as an interrogatory (written question), request for production (documents or things), request for admission (narrowing issues), deposition (oral examination), or subpoena (third-party discovery). Record what is needed, likely source, why it matters and priority. Compare cost, burden, timing and less costly ways to obtain it, and sequence the requests against the verified limits. Show the proposed queue change for confirmation before updating the discovery record. Whenever related matter work reveals something to request from the other side, propose adding it there.
- **Respond.** Inventory each item and its service date. For each request, state proposed response, source material, production status and any objection, privilege, log or supplementation issue. Verify what can be asserted, how to assert it, and when to supplement under the controlling sources. Log missing material and hold unsupported objections or claims of privilege. Do not represent a withheld item as produced.
- **Resolve a dispute.** Identify the request, response, deficiency, record of attempts to resolve it and relief sought. Determine and document the current meet-and-confer requirement before a discovery motion. If required and still open, prepare conferral first. If verified complete, inapplicable or excepted under the governing rule, route a requested motion to Motions Practice and Draft Motion with the supporting record. If authority or facts are unresolved, hold the motion. Research the available procedure and deadlines for motions to compel, protective orders and sanctions. Record any dispute-related deadlines and preservation risks.
- **Production and preservation inventory.** Use the organization and preservation checks below to build a linked inventory, deadlines and open decisions. Keep material with unresolved privilege or protective-order questions out of any service set.
- **Unclear request.** Ask whether the person needs a plan, a response, a dispute packet or a production and preservation inventory. Keep the deadline findings available.

### Can the material be organized and handed off?

For every relevant production, log its source, date, description, related request and any Bates range the production actually uses. Separate the record of collected material from the production set, its index and its attachments. Verify preservation and litigation hold obligations and identify affected custodians, documents and gaps from confirmed facts. Stop any production or preservation step that depends on an unresolved protective order, privilege decision, or missing governing requirement.

Draft original filing prose within this skill using the [Draft Motion filing prose checklist](../Draft%20Motion/SKILL.md#filing-prose-checklist). Apply its [Document registers](../Draft%20Motion/SKILL.md#document-registers) to each other item. Use its [Opposing-counsel correspondence checklist](../Draft%20Motion/SKILL.md#opposing-counsel-correspondence-checklist) for counsel messages. Follow verified forms and procedural requirements for structured documents. Draft served discovery papers here under the applicable rules, form and privilege constraints. Hold any service draft with unresolved production, timing, privilege or form requirements.

Run Verify Citations by name on the exact filing text and its cited attachments against authoritative current opinions, statutes, rules or official reporters, including the pinpoints, propositions and current applicability. Resolve every `[verify]` before any filing-ready handoff and recheck clearance after changes to the cited text, proposition or attachment set. Verify party names, case number, court and division, dates, counsel and firm names, and service addresses against the docket and latest counsel filing or communication. Resolve discrepancies with the authoritative record. For an initial filing, use Produce Court Filing’s packet-specific blank-number and service requirements and source the other fields from primary records. Hold any required fact that remains unresolved. Check standing orders for AI disclosure or citation certification. When a filing artifact is requested, stage the approved `body.md`, structural `caption.json` for the verified profile, citation report and authoritative caption and service sources in the dedicated build. Run Produce Court Filing for the requested format, providing that build, the jurisdiction profile, the output location, planned filing or service date, final attachments and the verified page limit where applicable. Hold production when a required date or attachment is missing. Use the production skill's input checks for any other missing items. Require its passing result and human visual review of caption, layout, exhibits, signature and service details before labeling the artifact ready for the person's filing decision. Leave blocked items and drafts identified in the matter record.

Save the actual version and show the person the final document or message, recipients or court destination, and attachments. Separate explicit approval must cover that version, recipients and attachments before any later authorized transmission. A signature, prior general approval or unseen message never supplies that consent. Hand the document to the person for their action. For a filing include the reminder, “After you file this, let me know so I can update the case files.” On actual filing, order, court action, service or correspondence, use Maintain Matter File for the dated document, correct index, dated history entry, deadlines and Current Status as applicable. Confirm opposing filing dates and response requirements, and record order implications. Preserve a distinction between drafted and completed events.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- An empty rule topic invites a plausible deadline, limit, supposedly valid objection, privilege assertion, sanctions outcome or Bates requirement. Record the missing authority and what it must answer. A request inventory or production plan can proceed on supported facts while dependent drafting or service waits.

## Success

- The packet identifies its mode and contains the matching plan, draft or dated hold. Each queued request has a type, priority, reason and source, and a queue write shows consent.
- Timing and numerical limits are traced to the current rule or order or marked `[verify]`, and urgent dates are surfaced and recorded or supplied for entry.
- A response accounts for each item, and a dispute packet states the conferral basis, evidence and next allowed handoff. Production and preservation gaps are visible.
- Any outbound draft is saved for review, and any filing-ready handoff has passed the citation, factual and mechanical gates.
