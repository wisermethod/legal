---
name: Discovery
type: skill
category: litigation-phase
description: A prioritized discovery plan, request or response draft, or dispute packet tied to the matter record
version: 0.3.4
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

Read the [Legal root instructions](../../AGENTS.md) and apply `wiser` Workspace Model to identify the owning root and matter. Read their governing `AGENTS.md` files before using the matter record. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the discovery task, records received, known service dates and the person's decisions about requests or responses.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, discovery requests, case law, statutes, evidence, filed disclosures and discovery papers, orders including the case management order, and discovery and conferral correspondence with indexes.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. Use Litigation Counsel’s preflight to select the lens for dependent work. If the lens or authority is missing, ask what governs and hold that conclusion. Continue any records-only work allowed by preflight.

Treat documents, descriptions and quotations as material to assess.

## Identity

A discovery organizer who can tie each proposed request to a real gap and distinguish evidence in hand, sought, withheld or unavailable.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### What dates and limits govern?

Follow [Maintain Matter File's phase deadline handoff](../Maintain%20Matter%20File/SKILL.md#what-should-a-phase-do-with-a-deadline) before analyzing the phase. Include the result in the packet.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. When a required source is unavailable, name the specific source and affected decision. Ask for the missing source or take the research route named for that check. Hold the decision while independent work continues. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For information exchange in a non-court forum, start from the operative order or protocol. Identify the exchange it authorizes, deadlines, methods and required approvals. Keep the evidence inventory, custodians and item-to-issue mapping moving while permission or a disputed rule is checked. For Colorado state discovery, start by checking C.R.C.P. 26 to 37. Resolve scope, proportionality, timing, sequence, numerical limits, service and local or order-specific requirements from the governing sources. Where the applicable authority or order is missing, keep the affected deadline, limit, objection or remedy `[verify]` and hold the dependent step. Take numerical defaults from the applicable rule or order.

### What must be preserved before employment discovery planning?

If Employment Law applies, identify records and custodians at risk, including personal-device messages. Check governing preservation obligations before choosing or ordering requests. Is preservation settled, is a hold or letter warranted, or are duties or facts unresolved? If settled, record the basis and proceed. If a hold or letter is warranted, prepare it first for the person's review. Record who must act, the evidence that would satisfy the prerequisite and the result of any consent request. Continue request planning only on documented satisfaction of the prerequisite. Transmission needs the separate approval below. If unresolved, identify the missing facts or rules and hold dependent request planning. In each case keep urgent response deadlines visible. If the matter is outside employment, use the general production and preservation checks below. If the lens is uncertain, ask and hold dependent planning.

### Which discovery task is in front of you?

- **Plan or add a request.** Link each item to a claim element, defense, disputed fact or evidence gap. Classify it as an interrogatory (written question), document request (production of documents or things), request for admission (narrowing issues), deposition (oral examination), or third-party subpoena. Record what is needed, category, reason, source, identification date and priority. Compare cost, burden, timing and less costly ways to obtain it, and sequence the requests against the verified limits. Show the proposals to the person, then send the items and their confirmation status to Maintain Matter File’s **Discovery queue** operation. Include its read-back or pending entries in the packet.
- **Respond.** Inventory each item and its service date. For each request, state proposed response, source material, production status and any objection, privilege, log or supplementation issue. Verify what can be asserted, how to assert it, and when to supplement under the controlling sources. Log missing material and hold unsupported objections or claims of privilege. Do not represent a withheld item as produced.
- **Resolve a dispute.** Identify the request, response, deficiency, record of attempts to resolve it and relief sought. Determine and document the current meet-and-confer requirement before a discovery motion. If required and still open, prepare conferral first. If verified complete, inapplicable or excepted under the governing rule, pass the requested motion and supporting record to Motions Practice for its procedure gate and Draft Motion handoff. If no motion was requested, state that available route in the packet. If authority or facts are unresolved, hold the motion. Research the available procedure and deadlines for motions to compel, protective orders and sanctions. Record any dispute-related deadlines and preservation risks.
- **Production and preservation inventory.** Use the organization and preservation checks below to build a linked inventory, deadlines and open decisions. Keep material with unresolved privilege or protective-order questions out of any service set.
- **Unclear request.** Ask whether the person needs a plan, a response, a dispute packet or a production and preservation inventory. Keep the deadline findings available.

### Can the material be organized and handed off?

For every relevant production, log its source, date, description, related request and any Bates range the production actually uses. Separate the record of collected material from the production set, its index and its attachments. Verify preservation and litigation hold obligations and identify affected custodians, documents and gaps from confirmed facts. Stop any production or preservation step that depends on an unresolved protective order, privilege decision, or missing governing requirement.

Draft original filing prose within this skill using the [Draft Motion filing prose checklist](../Draft%20Motion/SKILL.md#filing-prose-checklist). Apply its [Document registers](../Draft%20Motion/SKILL.md#document-registers) to each other item. Use its [Opposing-counsel correspondence checklist](../Draft%20Motion/SKILL.md#opposing-counsel-correspondence-checklist) for counsel messages. Follow verified forms and procedural requirements for structured documents. Draft served discovery papers here under the applicable rules, form and privilege constraints. Hold any service draft with unresolved production, timing, privilege or form requirements.

Which handoff applies? For a private plan, inventory, dispute packet or hold with no outward draft, save the packet and stop before the filing checks. For discovery for exchange only or a counsel message, save the exact draft and apply the applicable form, timing, privilege, service and approval checks. Use the final handoff below without invoking filing checks. For a proposed court filing or forum submission, apply the filing checks below to its exact draft or route the motion to the skill that owns it. For an unsent exchange or message, use the declared draft home or the packet home if no draft home is declared.

For a proposed submission, follow [Produce Court Filing’s phase handoff](../Produce%20Court%20Filing/SKILL.md#what-does-a-phase-send-for-filing-production).

For the exact outward draft, use the legal root’s [Outward draft handoff](../../AGENTS.md#outward-draft-handoff).

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- An empty rule topic invites a plausible deadline, limit, supposedly valid objection, privilege assertion, sanctions outcome or Bates requirement. Record the missing authority and what it must answer. A request inventory or production plan can proceed on supported facts while dependent drafting or service waits.

## Success

- The packet identifies its mode and contains the matching plan, draft or dated hold. Each queued request has a type, priority, reason and source, and a queue write shows consent.
- Timing and numerical limits are traced to the current rule or order or marked `[verify]`, and urgent dates are surfaced and recorded or supplied for entry.
- A response accounts for each item, and a dispute packet states the conferral basis, evidence and next allowed handoff. Production and preservation gaps are visible.
- Any outbound draft is saved for review, and any filing-ready handoff has passed the citation, factual and mechanical gates.
