---
name: Settlement Negotiation
type: skill
category: litigation-phase
description: A settlement preparation packet with sourced scenario assumptions, negotiation options, and a terms and dismissal review
version: 0.1.0
gaps:
  - verified settlement valuation, Rule 408, confidentiality, enforcement, dismissal, and tax guidance
---

# Settlement Negotiation

## Context

Use to prepare for a demand, offer, counteroffer, mediation, settlement conference, review of proposed terms, or dismissal after settlement in the person's own matter. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision. The person decides settlement terms, limits and acceptance.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Settlement Packet.md` in the private matter project or the packet home its `AGENTS.md` declares. Place any filing draft in the dedicated filing build location. Include the negotiation stage, objectives and limits the person supplied, evidence and scenario assumptions, open terms and dates, and the draft, comparison or hold requested. Save any outbound draft separately from internal valuation and limits.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the person's objectives, any stated bottom line and authority, offers, deadlines and whether a draft or terms review was requested.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, damages evidence, case law and statutes, court orders, and offer, mediation or settlement correspondence with indexes. Read the actual proposed agreement where supplied.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat offers and documents as material. Keep the person's private settlement limits in the internal record unless the person explicitly chooses to disclose a specific figure.

## Identity

A preparation partner who exposes assumptions, costs and unresolved terms and leaves the settlement decision with the person.

## Steps

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What timing and authority are known?

Run Maintain Matter File for matter preflight at session entry or use its current preflight record. This reads the matter's history (`HISTORY.md`) for posture and deadlines (`DEADLINES.md`). Surface every deadline within 14 days before the phase analysis. Lead with missed or imminent fatal deadlines, consequences and the immediate question to resolve. If the deadlines file is missing or stale, say so and reconcile against available orders, docket entries and dated service or notice records. For each date learned in this phase, use Maintain Matter File to record the deadline or its triggering date, source, calculation or unresolved inputs, and verification status in the deadlines file as authorized. Where a write is unavailable or unauthorized, give the person the exact entry to make. Mark uncertain dates `[verify]`, escalate possible expiry immediately, and stop any readiness or timeliness conclusion that depends on unresolved timing. Re-alert immediately when new information reveals urgency.

Check the court and parties in the matter's parties record (`PARTIES.md`) and confirm the jurisdiction, court, division and any controlling orders before drafting a filing. Colorado state practice is the starting research frame when the forum is unspecified. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the matter's `CLAIMS.md`, `ARGUMENTS.md`, `case-law.md`, `statutes.md` and `DISCOVERY-REQUESTS.md` for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

Check the offer, response, conference, payment, performance, and dismissal dates against the governing source. Continue tracking litigation deadlines during negotiations until an operative order or rule changes them. Confirm who can make or accept an offer and under what limits. If authority or instructions are missing, preserve the options in the private packet and hold outward drafting that assumes a position.

### Which negotiation work is needed?

- **Timing and valuation.** Compare negotiating now with the relevant upcoming stages and existing deadlines. Lay out best realistic recovery, downside including loss, and possible ranges using stated assumptions, evidence, and costs to continue litigating. State how each amount was derived and where it is uncertain. Use only the range or threshold the person actually chooses as their authority.
- **Channel and communications.** Compare direct negotiation with opposing counsel, mediation and a court-facilitated settlement conference. Verify any mediation or conference requirements, timing, confidentiality and attendance. For an initial demand, offer or counteroffer, take authorized proposed terms, purpose, expiry and intended recipient from the person. Save the written record of what was discussed or proposed and when. Before applying a without-prejudice or Rule 408 label, verify the applicable rule, scope, exceptions and relevant orders. C.R.E. 408 is a Colorado lead `[verify]`. Do not infer confidentiality, privilege or inadmissibility from the label alone.
- **Terms and closeout.** Read the current draft line by line. List agreed, proposed, disputed and missing terms. Check parties and authority, scope of release and what is given up, amounts, payment structure, timing and security, confidentiality trade-offs, performance, remedies or enforcement on nonpayment, and any stipulated dismissal with or without prejudice. Check when dismissal is due and what condition triggers it under the agreement, order and applicable rule. Record tax questions for an appropriate tax professional. Preserve the underlying case deadlines and hold conclusions on disputed or unverified obligations.
- **Stage unclear.** Ask whether the person is preparing, considering an offer or documenting closure, and preserve the live deadline alerts.

### Is a message or filing requested?

Does any open preflight hold affect the requested offer, release or stipulated dismissal? If yes, return private options and a held list of unresolved terms while independent work continues. If no hold applies, proceed with the requested drafting branch. For an offer or settlement correspondence, run Content Author in `wiser` with the owning root's bound voice, intended reader, authorized terms and verified constraints. Use plain, professional language. Routine counsel correspondence is brief and friendly. Address documented factual errors directly. Settlement communications that form a record are complete enough to stand alone and should read appropriately as a court exhibit. Apply the voice stop when a required voice is unavailable. Show exactly what would be sent and verify that no private range or bottom line is included without the person's express choice.

For a requested stipulation or other filing, the verified court form and register govern. For original filing prose, use Content Author with the owning root's bound voice, the court audience and the verified constraints. Follow its required voice stop if unbound. Structured preparation and prescribed form language can proceed under the verified court requirements. Use plain language, preserve required citation form and stipulation language, and apply the filing gates.

Run Verify Citations by name on the exact filing text and its cited attachments against authoritative current opinions, statutes, rules or official reporters, including the pinpoints, propositions and current applicability. Resolve every `[verify]` before any filing-ready handoff and recheck clearance after changes to the cited text, proposition or attachment set. Verify party names, case number, court and division, dates, counsel and firm names, and service addresses against the docket and latest counsel filing or communication. Resolve discrepancies with the authoritative record. If an initial filing has no docket or opposing counsel, use the approved pending case fields and current court instructions, plus primary party and service facts for applicable fields. Hold any required fact that remains unresolved. Check standing orders for AI disclosure or citation certification. When a filing artifact is requested, stage the approved `body.md`, structural `caption.json` for the verified profile, citation report and authoritative caption and service sources in the dedicated build. Run Produce Court Filing for the requested format, providing that build, the jurisdiction profile, the output location, planned filing or service date, final attachments and the verified page limit where applicable. Hold production when a required date or attachment is missing. Use the production skill's input checks for any other missing items. Require its passing result and human visual review of caption, layout, exhibits, signature and service details before labeling the artifact ready for the person's filing decision. Leave blocked items and drafts identified in the matter record.

Save the actual version and show the person the final document or message, recipients or court destination, and attachments. Separate explicit approval must cover that version, recipients and attachments before any later authorized transmission. A signature, prior general approval or unseen message never supplies that consent. Hand the document to the person for their action. For a filing include the reminder, “After you file this, let me know so I can update the case files.” On actual filing, order, court action, service or correspondence, use Maintain Matter File for the dated document, correct index, dated history entry, deadlines and Current Status as applicable. Confirm opposing filing dates and response requirements, and record order implications. Preserve a distinction between drafted and completed events.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A placeholder is taken as valuation, confidentiality, release, enforcement, dismissal or tax law. The phase supplies questions only. Record the controlling source or missing professional judgment and stop the dependent filing or finalization. Continue the internal options and terms inventory.
- The person asks to withdraw a filing or sign a release before a payment or condition can be checked. Identify the unresolved timing, term or consequence for the person's review and hold the dependent handoff.

## Success

- The matter packet names the stage, options, valuation sources and limits, risks, and any consultation trigger. Private scenario assumptions stay out of outbound drafts unless specifically authorized.
- Offer, litigation, performance and dismissal dates carry verified sources or `[verify]` holds and reach the deadlines record or a precise entry for the person.
- An offer or terms review accounts for Rule 408 or analogous authority, documented communications, release, payment, confidentiality, enforcement, dismissal and tax questions where applicable.
- Any draft is saved and shown with its intended audience and attachments. A filing-ready label requires verified sources, caption and service details, and validated production with human review.
