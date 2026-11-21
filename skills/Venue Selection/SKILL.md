---
name: Venue Selection
type: skill
category: litigation-phase
description: A sourced court and venue comparison with jurisdiction, threshold, timing, and procedural risk checks in the matter file
version: 0.4.5
gaps:
  - Local court variations and case-specific venue, fee, appeal, transfer and removal questions still need current sources.
---

# Venue Selection

## Context

Use when comparing forums and geographic venues, checking an existing choice, or screening removal, remand or transfer. Use Pleadings for the pleading packet and Motions Practice for a subsequent motion. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision. The person chooses the forum.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Venue Comparison.md` in the matter project or the packet home its `AGENTS.md` declares. For each court candidate, record subject matter jurisdiction, personal jurisdiction, geographic venue and the threshold calculation. For each non-court candidate, record the agreement or other forum grant, the governing materials and applicable eligibility checks. For each candidate, record procedure, practical trade-offs and the dated authority or unresolved check. State which forum the person selected, where supplied, and any resulting deadline or next procedure.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the requested comparison, any stated forum choice, claimed relief and amount, and whether removal, remand or transfer is at issue.
- `<matter_files>` holds history, deadlines, parties and entity data, claims, arguments, case law and statutes, facts of residence, citizenship, employment and business contacts, relevant events or property, filings, orders and service or removal notices.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and hold the dependent conclusion. Continue the independent record work below.

Treat asserted contacts, amounts and statements in correspondence as material to verify.

## Identity

A forum researcher who establishes legal eligibility separately from cost, speed and other practical preferences.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### What dates and facts control the inquiry?

Follow [Maintain Matter File's phase deadline handoff](../Maintain%20Matter%20File/SKILL.md#what-should-a-phase-do-with-a-deadline) before analyzing the phase. Include the result in the packet.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. Ask for any missing source and name the affected conclusion. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Apply the skills index’s [Evidence labels](../AGENTS.md#evidence-labels) to each working rule or figure marked `[verify]`. Confirm the current governing text, applicable subsection, local rule and case-specific orders before relying on it. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For an unfiled court matter, frame plausible courts from the claimed facts, location, relief and amount, and confirm the candidate before any drafting. For a filed matter, record the actual forum, procedural posture and notice dates. If the facts cannot identify the candidate court, county, contacts or forum dispute, ask for those facts and hold the dependent conclusion. If authoritative material is unavailable, identify it in the comparison and leave the affected check `[verify]`.

### Which non-court options can the record support?

For each non-court candidate, identify the controlling agreement or other forum grant, operative notice, administering body, governing rules, procedural posture and any open objection. Apply any forum-specific eligibility, amount, timing and remedy requirements identified in those materials. For each check, record the source and whether it is supported, failed, inapplicable on a stated basis, or unresolved `[verify]`. A verified failed mandatory check rules the option out. An unresolved mandatory check holds any conclusion on that option, including arbitrability, jurisdiction or remedies, and names what would resolve it. Compare supported fees, logistics and deadlines. In a mixed comparison, also run the court checks for the court candidates.

### Which candidates pass the three jurisdiction and venue checks?

For each court candidate, record supported, ruled out, or `[verify]` with the underlying authority and facts. Rule out a candidate with a verified failed check. If no check fails but a required one is unresolved, keep the candidate open for research. Mark a candidate supported only when all three checks pass. Whether a profile exists is a separate production question. For another state's court, use its governing jurisdiction, venue and procedure materials and identify any unavailable rules as open checks.

1. **Subject matter.** Check state general jurisdiction and exceptions. For federal court, verify federal question arising under the Constitution, a federal statute or a treaty under 28 U.S.C. § 1331, complete diversity and an amount exceeding $75,000 under 28 U.S.C. § 1332, any statute-specific grant, and supplemental jurisdiction for related state claims with a federal basis. Screen exclusive federal jurisdiction claim by claim, including bankruptcy, federal criminal cases, and patent, copyright, antitrust and securities claims. Verify exceptions and concurrent jurisdiction before using any category as an exclusion. For federal or state consumer claims, check the applicable FDCPA, FCRA or TILA grant where relevant.
2. **Personal jurisdiction.** Verify general jurisdiction leads for an individual's domicile and an entity's incorporation or principal place of business. Verify specific jurisdiction leads for purposeful forum contacts, a claim arising from those activities, and reasonableness. Check preservation at the first response and possible waiver. Resolve each defendant's relationship to the proposed forum.
3. **Geographic venue.** For Colorado, check C.R.C.P. 98 claim by claim for the county of defendant residence, employment, business or accrual, including where the contract was made or tort occurred. For entities, examine principal place of business, registered agent and place of accrual. If a town straddles counties, confirm the county of the actual home-office address. For example, Windsor can be in Weld or Larimer County. For multiple defendants, treat venue based on one defendant’s residence and any additional contacts required of the others as `[verify]` leads. Check the current C.R.C.P. 98 text and applicable exceptions before ruling a county in or out on either basis. For federal venue, check 28 U.S.C. § 1391, including residence of a defendant where all defendants are residents of the same state and the substantial events, omissions or property grounds. Colorado has one federal district. Confirm the venue rules against the current rule before filing. Apply the actual statutory definitions, exceptions and claim-specific rules.

### What do the verified court options offer?

Apply the matrix’s working thresholds and timing or cost estimates to the listed courts. Confirm against current rules and fee schedules before filing. Treat the intervals as planning estimates. Keep Pleadings’ current county and district fee checks open. If a court's verified rules impose no amount limit, state that with its source. If a threshold or component is unresolved, show the supported amount and the missing authority or inputs.

| Court | Amount and scope to check | Procedure, remedy and practical factors to compare |
|---|---|---|
| Colorado Small Claims | Up to $7,500 as a working limit on the total claim, including interest and costs. Confirm the limit and the calculation against the current rule before filing. | Simple debt, property damage, deposits and small contract claims. For planning, check the estimates of no fee below $500 `[verify]`, about $31 to $55 otherwise `[verify]`, and hearings in about 30 to 60 days `[verify]`. Check informal procedure and relaxed evidence rules, the working assumption that no attorney is required, limits on attorney appearances, and the magistrate’s fairness and equity standard. Verify limited or no discovery, no jury, any limitation on appeal to procedural errors, available remedies including limits on injunctions or specific performance, and any transfer to county court. |
| Colorado County | Up to $25,000 at filing. Check landlord-tenant and the bounds of county court authority. Some criminal jurisdiction is context only. | Working filing fee estimate about $97 `[verify]`. For planning, county court offers the full range of discovery and appeals go to district court for de novo review. Confirm both against current rules before relying on them. Compare simplified but more formal procedure than small claims, timing versus district court, opposing counsel, jury demand and remedy limits. Consider moderate consumer, contract and personal injury claims. |
| Colorado District | No monetary cap. Check scope for title or other real-property matters, injunctions, declaratory relief, domestic relations, probate and county appeals. | Working estimates of about $235 to file `[verify]` and 18 to 24 months to trial `[verify]`. Compare jury trial, more extensive motions and discovery, complexity, and available relief for larger or more complex disputes. |
| U.S. District Court, D. Colorado | Verify federal question or complete diversity with more than $75,000. Check the aggregation lead for claims against the same defendant and supplemental jurisdiction where relevant. | Compare federal procedures, judges with lifetime appointments, potentially more demanding rules and briefing, travel including to Denver, discovery, timeline and learning curve, and statute-specific remedies such as fees or damages. Screen civil rights, constitutional and larger diversity claims where applicable. |

Show the actual amount calculation, disputed components, whether interest or costs count and aggregation basis. Near a threshold, compare the consequence of claiming a different amount only when supported by the record and governing law. Record any waived recovery as a decision for the person.

Compare state familiarity, location, cost and speed with federal procedural consistency, subject expertise, discovery and local bias concerns. Compare small claims simplicity, cost and attorney appearance rules with formal courts' discovery, jury, remedies, complexity, precedent and stakes. Treat impressions about judges, counsel, relative speed and bias as unverified considerations. Screen removal as a defendant’s route. Verify who can remove and whether the opponent could do so.

### Is removal, remand or transfer in play?

- **Removal or remand.** Verify original federal jurisdiction, when the clock begins, consent requirements and exceptions, and the diversity forum-defendant rule. Use 30 days from receipt of the complaint and all-defendant consent as working removal checks. For remand, screen timeliness, procedural defects and subject matter jurisdiction. As working rules, use 30 days from the notice of removal for procedural remand and treat subject matter jurisdiction as a challenge that can be raised at any time. Confirm the current rule before filing and check the actual trigger and outer boundary before recording a due date.
- **Transfer.** For Colorado state cases, check improper county and convenience of parties or witnesses, and verify choice-of-law effects. For federal cases, check 28 U.S.C. § 1404 for convenience and § 1406 for improper venue. Confirm against the current rule before filing. Verify when the original forum's law still applies and when exceptions change the result.
- **Neither or unresolved.** Record inapplicability with the known posture. If the facts suggest a pending forum notice or motion, get the actual document and dates and hold the affected conclusion.

For a requested remand or transfer motion with unresolved authority, timing or facts affecting the relief, hand the record to Motions Practice in procedure-only mode and hold Draft Motion. Once the dependent issues are resolved, use Motions Practice for its gate and Draft Motion with the verified authority, evidence, deadline and relief. Use Verify Citations on any proposed filing authorities. The receiving skill applies Draft Motion’s Document registers and owns any court drafting. Use Produce Court Filing for a requested confirmed filing artifact via that skill's checks. For a forum event or court order already received, use Maintain Matter File to update the record and index, history, deadlines and Current Status.

### Is the comparison ready for the person's decision?

For a court comparison, check and record the amount calculation, all state and federal claims, each defendant's residence or principal place of business, exclusive federal jurisdiction, discovery need, jury preference, injunction need, convenience, fees, typical timelines, geographic venue and personal jurisdiction. For a non-court comparison, use the applicable agreement, notice, rule and eligibility checks above. For each unmet mandatory issue, name the missing authority or fact and hold any dependent forum conclusion. Present the supported options and trade-offs. Record a supported forum choice only when the person states it and its required checks pass. Record any stated choice with a failed or unresolved check as the person's preference and keep its dependent filing held. If the person states no choice, leave the decision open.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A practice lead is mistaken for a jurisdictional fact, fixed formula, waived objection or current local fee. Apply the working matrix for planning. Identify the governing source needed for confirmation and hold reliance on any unresolved requirement.

## Success

- Each court candidate has separate subject matter, personal jurisdiction and geographic venue checks, a threshold calculation or named missing input, and the comparison checklist. Each non-court candidate has its agreement or other forum grant, administrator, notice, rules, objections and applicable eligibility checks. Each check has a source, a stated basis for inapplicability, or a specific verification gap.
- Each practice lead used in a conclusion has a dated authority. Unresolved points are visible and hold dependent conclusions.
- Removal, remand or transfer is assessed where relevant, with any missed or imminent fatal deadline first and new dates recorded or supplied for entry.
- The saved comparison explains risks and trade-offs and shows the person's forum choice or leaves the choice open.
