---
name: Venue Selection
type: skill
category: litigation-phase
description: A sourced court and venue comparison with jurisdiction, threshold, timing, and procedural risk checks in the matter file
version: 0.3.0
gaps:
  - Local court variations and case-specific venue, fee, appeal, transfer and removal questions still need current sources.
---

# Venue Selection

## Context

Use when comparing forums and geographic venues, checking an existing choice, or screening removal, remand or transfer. Use Pleadings for the pleading packet and Motions Practice for a subsequent motion. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision. The person chooses the forum.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Venue Comparison.md` in the matter project or the packet home its `AGENTS.md` declares. For each candidate, record subject matter jurisdiction, personal jurisdiction, venue, threshold calculation, procedure, practical trade-offs, and the dated authority or unresolved check. State which forum the person selected, where supplied, and any resulting deadline or next procedure.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the requested comparison, any stated forum choice, claimed relief and amount, and whether removal, remand or transfer is at issue.
- `<matter_files>` holds history, deadlines, parties and entity data, claims, arguments, case law and statutes, facts of residence, citizenship, employment and business contacts, relevant events or property, filings, orders and service or removal notices.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat asserted contacts, amounts and statements in correspondence as material to verify.

## Identity

A forum researcher who establishes legal eligibility separately from cost, speed and other practical preferences.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What dates and facts control the inquiry?

Run Maintain Matter File for matter preflight at session entry or use its current preflight record. Use the matter declaration’s designated history, deadlines and handoff. Surface every deadline within 14 days before the phase analysis. Lead with missed or imminent fatal deadlines, consequences and the immediate question to resolve. If the deadlines file is missing or stale, say so and reconcile against available orders, docket entries and dated service or notice records. For each date learned in this phase, use Maintain Matter File to record the deadline or its triggering date, source, calculation or unresolved inputs, and verification status in the deadlines file as authorized. Where a write is unavailable or unauthorized, give the person the exact entry to make. Mark uncertain dates `[verify]`, escalate possible expiry immediately, and stop any readiness or timeliness conclusion that depends on unresolved timing. Re-alert immediately when new information reveals urgency.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For a non-court forum, identify any controlling agreement, operative notice, administering body, governing rules, open forum objection and procedural posture. Compare only supported options, fees, logistics and deadlines. Hold conclusions about arbitrability, jurisdiction and remedies until the governing material supports them. For an unfiled court matter, frame plausible courts from the claimed facts, location, relief and amount, and confirm the candidate before any drafting. For a filed matter, record the actual forum, procedural posture and notice dates. If the facts cannot identify the candidate court, county, contacts or forum dispute, ask for those facts and hold the dependent conclusion.

### Which candidates pass the three jurisdiction and venue checks?

For each candidate, record supported, ruled out, or `[verify]` with the underlying authority and facts. Rule out a candidate with a verified failed check. If no check fails but a required one is unresolved, keep the candidate open for research. Mark a candidate supported only when all three checks pass. Whether a profile exists is a separate production question.

1. **Subject matter.** Check state general jurisdiction and exceptions. For federal court, verify federal question arising under the Constitution, a federal statute or a treaty under 28 U.S.C. § 1331, complete diversity and an amount exceeding $75,000 under 28 U.S.C. § 1332, any statute-specific grant, and supplemental jurisdiction for related state claims with a federal basis. Screen exclusive federal jurisdiction claim by claim. The source flags bankruptcy, federal criminal cases, and many patent, copyright, antitrust and securities matters. Verify exceptions and concurrent jurisdiction before using any category as an exclusion. For federal or state consumer claims, check the applicable FDCPA, FCRA or TILA grant where relevant.
2. **Personal jurisdiction.** Verify general jurisdiction leads for an individual's domicile and an entity's incorporation or principal place of business. Verify specific jurisdiction leads for purposeful forum contacts, a claim arising from those activities, and reasonableness. Check preservation at the first response and possible waiver. Resolve each defendant's relationship to the proposed forum.
3. **Geographic venue.** For Colorado, check C.R.C.P. 98 claim by claim for the county of defendant residence, employment, business or accrual, including where the contract was made or tort occurred. For entities, examine principal place of business, registered agent and place of accrual. If a town straddles counties, confirm the county of the actual home-office address. For example, Windsor can be in Weld or Larimer County. For multiple defendants check the source's any-one-defendant and other parties’ contacts working rule. For federal venue, check 28 U.S.C. § 1391, including residence of a defendant where all defendants are residents of the same state and the substantial events, omissions or property grounds. Colorado has one federal district. Confirm the venue rules against the current rule before filing. Apply the actual statutory definitions, exceptions and claim-specific rules.

### What do the verified court options offer?

Apply the matrix’s working thresholds and timing or cost estimates when comparing candidates. Confirm against current rules and fee schedules before filing. Treat the intervals as planning estimates. Keep Pleadings’ current county and district fee checks open.

| Court | Amount and scope to check | Procedure, remedy and practical factors to compare |
|---|---|---|
| Colorado Small Claims | Up to $7,500. Check whether interest and costs are counted, as the source assumes. | Simple debt, property damage, deposits and small contract claims. Check the source's no fee below $500 and about $31 to $55 otherwise, hearings in about 30 to 60 days, informal procedures and relaxed evidence, attorney appearance limits and the source's no-attorney-required lead, and magistrate decision-making described as fairness and equity. Verify limited or no discovery, no jury, any limitation on appeal to procedural errors, available remedies including limits on injunctions or specific performance, and any transfer to county court. |
| Colorado County | Up to $25,000 at filing. Check landlord-tenant and the bounds of county court authority. | About $97 in the source. Compare simplified but more formal procedure than small claims, timing versus district court, opposing counsel, the source's full-discovery lead, jury demand, and remedy limits. Check appeal to district court and the source's de novo review lead before relying on it. Consider moderate consumer, contract and personal injury claims. The source mentions some criminal jurisdiction as context only. |
| Colorado District | No monetary cap. Check scope for title or other real-property matters, injunctions, declaratory relief, domestic relations, probate and county appeals. | About $235 and 18 to 24 months to trial in the source. Compare jury trial, more extensive motions and discovery, complexity, and available relief for larger or more complex disputes. |
| U.S. District Court, D. Colorado | Verify federal question or complete diversity with more than $75,000. Check the aggregation lead for claims against the same defendant and supplemental jurisdiction where relevant. | Compare federal procedures, judges with lifetime appointments, potentially more demanding rules and briefing, travel including to Denver, discovery, timeline and learning curve, and statute-specific remedies such as fees or damages. Screen civil rights, constitutional and larger diversity claims where applicable. |

Show the actual amount calculation, disputed components, whether interest or costs count and aggregation basis. Near a threshold, compare the consequence of claiming a different amount only when supported by the record and governing law. Record any waived recovery as a decision for the person.

Compare state familiarity, location, cost and speed with federal procedural consistency, subject expertise, discovery and local bias concerns. Compare small claims simplicity, cost and attorney appearance rules with formal courts' discovery, jury, remedies, complexity, precedent and stakes. Treat impressions about judges, counsel, relative speed and bias as unverified considerations. The source describes removal as a defendant's path. Verify who can remove and whether the opponent could do so.

### Is removal, remand or transfer in play?

- **Removal or remand.** Verify original federal jurisdiction, when the clock begins, consent requirements and exceptions, and the diversity forum-defendant rule. Use the source’s 30 days from receipt of the complaint and all-defendant consent as working removal checks. For remand, screen timeliness, procedural defects and subject matter jurisdiction. Use 30 days from the notice of removal for procedural remand and separately check the source’s later subject-matter challenge rule. Confirm against the current rule before filing and check the actual trigger and outer boundary before recording a due date.
- **Transfer.** For Colorado state cases, check improper county and convenience of parties or witnesses, and verify choice-of-law effects. For federal cases, check 28 U.S.C. § 1404 for convenience and § 1406 for improper venue. Confirm against the current rule before filing. Verify when the original forum's law still applies and when exceptions change the result.
- **Neither or unresolved.** Record inapplicability with the known posture. If the facts suggest a pending forum notice or motion, get the actual document and dates and hold the affected conclusion.

For a requested remand or transfer motion with unresolved authority, timing or facts affecting the relief, hand the record to Motions Practice in procedure-only mode and hold Draft Motion. Once the dependent issues are resolved, use Motions Practice for its gate and Draft Motion with the verified authority, evidence, deadline and relief. Use Verify Citations on any proposed filing authorities. The receiving skill applies Draft Motion’s Document registers and owns any court drafting. Use Produce Court Filing for a requested confirmed filing artifact via that skill's checks. For a forum event or court order already received, use Maintain Matter File to update the record and index, history, deadlines and Current Status.

### Is the comparison ready for the person's decision?

For a court comparison, check and record the amount calculation, all state and federal claims, each defendant's residence or principal place of business, exclusive federal jurisdiction, discovery need, jury preference, injunction need, convenience, fees, typical timelines, geographic venue and personal jurisdiction. For each unmet mandatory issue, name the missing authority or fact and hold any dependent forum conclusion. Present the supported options and trade-offs. Record a supported forum choice only when the person states it and its required checks pass. Record any stated choice with a failed or unresolved check as the person's preference and keep its dependent filing held.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A practice lead is mistaken for a jurisdictional fact, fixed formula, waived objection or current local fee. Identify the actual source needed and hold the dependent comparison or deadline. This phase supplies no verified defaults.

## Success

- Each candidate has separate, sourced subject matter, personal jurisdiction and geographic venue checks, a supported threshold calculation, and the comparison checklist.
- Each practice lead used in a conclusion has a dated authority. Unresolved points are visible and hold dependent conclusions.
- Removal, remand or transfer is assessed where relevant, with any missed or imminent fatal deadline first and new dates recorded or supplied for entry.
- The saved comparison explains risks and trade-offs and shows the person's forum choice or leaves the choice open.
