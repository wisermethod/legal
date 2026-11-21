---
name: Open a Matter
type: skill
category: procedure
description: Set up a matter's project record and prepare a new Colorado district civil case packet through filing, service and deadline seeding
version: 0.2.0
gaps:
  - The Colorado initiation procedure does not cover county court, small claims, federal court or other states.
  - The source leaves the current filing fee and fee-waiver form number unverified. Confirm both against the court before relying on them.
---

# Open a Matter

## Context

Use for "new case," "set up a case for," "file a new case," "start a lawsuit," "open a case" or "draft a complaint" in the litigant's own matter. Apply the legal constitution's Standing constraint. The matter record can hold any confirmed jurisdiction. The initiation procedure below covers Colorado district court civil cases of the class described in the court's current profile. Use Take Over a Matter for a populated legacy case folder.

Classifier seam: none.

## Objective

Create the matter's project and initialize its record. For an in-scope filing request, produce a reviewed initiation packet and, when the litigant reports filing and service, record the assigned number, proof and resulting deadlines.

## Inputs

- `<user_request>` identifies the scope, matter name, intended outcome and owning root or request for a dedicated user root.
- `<context>` identifies the court, jurisdiction, venue, procedural posture, applicable Court Filing profile and filing build location.
- `<source_material>` provides parties and contacts, claims and facts, evidence and dates, any prior case action, service information and current rules or official forms.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What does this matter need to open?

1. **Place the project.** Which user root owns this matter under `wiser/standards/user-root.md` C3 and C4? In an existing owning root use `work/<slug>/`. If the person wants a dedicated user root for one matter, hand the root request to `wiser`'s Onboard Root by name, then use that root's `work/<slug>/`. If ownership or the destination is unsettled, ask before writing. Is the project path unoccupied, an established project for this case, or occupied by other material? For an unoccupied path, copy the bundled `assets/matter-template/` and fill the project `AGENTS.md` with the name and the owner's completion condition, or explicitly record that the condition awaits the owner. Read back the file set and keep the root declaration in the root. For a confirmed project for this case, read its declaration and use the current files. For a legacy case folder, use Take Over a Matter. For any other collision, stop and confirm a different destination before copying.
2. **Establish facts and scope.** For an existing matter context, start with Maintain Matter File in preflight mode. Gather parties and service contacts, claims and verified elements, facts supporting each element, applicable jurisdiction and venue through Venue Selection, amount in controversy and each claim's limitation period and relevant dates. Use the applicable practice-area expert, and Claim Chart for element support where needed. Populate the parties, claims and initial history, establish the timeline in the deadlines record, and initialize the arguments narrative and positions. Run the limitations check before drafting or filing. If the trigger or governing rule is unresolved or the facts suggest a time bar, flag dismissal or sanction risk, suggest licensed counsel and hold the affected pleading until reviewed.
3. **Decide whether the filing route applies.** Is this record setup alone, a complaint draft, or an initiation packet? Return the initialized record for setup alone. For a draft or packet, confirm the court and current scope. Carry any preflight hold into a draft and hold the affected packet or transmission until resolved. The source route is Colorado district court civil (CV), with a working threshold over $25,000 for this initiation route. Apply Venue Selection and confirm against the current rule before filing. If county court, small claims, federal court or another state applies, state the gap and stop this initiation procedure. If court, amount or jurisdiction remains unclear, ask or verify before doing the dependent work. For financial exposure, complex procedure, limitations risk or a matter beyond the litigant's comfort, suggest licensed counsel, including limited-scope review.
4. **Build the complaint.** Use the applicable pleading requirements from Pleadings, including C.R.C.P. 8 where it governs. When Pleadings requested intake only, hand back the initialized record and rule findings so that caller can write the complaint. When resuming with its returned complaint, keep that draft and review its exact version. For direct intake and complaint work, complete the drafting branch here without starting a second intake. For a direct initiation request, draft the complaint here using Draft Motion’s Document registers and Filing prose checklist. Use Draft Motion for any separately requested motion. Draft `body.md` with numbered plausible factual allegations, separate counts with required elements, a jury demand when applicable and the prayer for relief. Read it aloud in a plain, informed self-represented voice. Preserve necessary pleading structure and correct citation form. Verify the court's AI disclosure requirements where applicable. Build `caption.json` from sourced intake and the Court Filing profile. Declare `filing_packet: "new_case_complaint"` and set `case_number` to the empty string for assignment by the court. Use the confirmed division value or a court-approved placeholder for an unassigned division. Include the complaint’s certificate of service with sourced `service` fields, and keep it distinct from Rule 4 service and proof. Hold release if the certificate cannot truthfully be completed or a required field remains unresolved. Run Verify Citations with the exact body and its cited-attachment manifest and resolve all `[verify]` flags. For a draft-only request, return the draft and holds without starting production. For a review artifact or initiation packet, hand the approved draft, caption, clearance, manifest and exact attachments to Produce Court Filing for the complaint only. Its court PDF validation and human review are mandatory before filing. Stop at the review artifact if that is all the person requested.
5. **Prepare official forms and fees.** From `legal's` `Court Filing` directory run `node scripts/court-filing.js profiles`. In the returned `profiles` use `colorado-district` and its `filing_packets.new_case_complaint` for the packet; read it before building the complaint as well. Confirm current applicability and requirements with the Colorado Judicial Branch. Use its official fillable PDFs for JDF 601 District Court Civil Case Cover Sheet, associated with the initial pleading under C.R.C.P. 16.1 when applicable, and JDF 600 District Court Civil Summons. Fill every required field on the provided PDFs. Confirm current court requirements and fee amount and, for a waiver, the current motion and financial affidavit forms `[verify]`. Identify which route the litigant chooses. If paying, include the fee as verified. If seeking waiver, include the verified motion and affidavit. If any required fee, form or information remains unresolved, hold the packet. Use the court's original forms for the cover sheet and summons.
6. **Filing and service.** Show the validated complaint, official forms, payment or waiver materials and exact destination for explicit approval before transmission. The litigant uses Colorado Courts E-Filing (CCEF) for an approved packet where applicable. Wait for confirmation or receipt. On acceptance, update the parties record, caption and other affected case records with the assigned number and route the confirmed filing to Maintain Matter File. Use the working 63-day service interval after filing, confirm against the current rule before filing, and confirm the permitted method and proof under C.R.C.P. 4 and any order. Have the litigant arrange service and file the return or proof after service. Apply Produce Court Filing's applicable gates before any filing or service transmission. Ask the litigant to report back after each action.
7. **Seed deadlines.** After actual service, record location, date and method from the proof of service. Calculate from the working C.R.C.P. 12 defaults for Colorado district civil cases: 21 days after in-state service and 35 days after out-of-state service. Use the applicable trigger, exceptions, time computation and any order. Confirm against the current rule before filing. Record case management, discovery and other deadlines as they arise. Route complaint and proof filings to Maintain Matter File for history, index and deadline updates. If filing or service is still pending, list which dates are untriggered or awaiting confirmation.

## Pitfalls

- An ambiguous name, scope, owning root or jurisdiction needs clarification before the dependent step. A request to draft or open a record does not authorize filing, paying or serving.
- Official forms may change. If the required official form cannot be obtained or checked, report the missing form and hold the packet. Never recreate a JDF form in Word or the filing renderer.
- A dormant or uncertain limitations date is consequential. Keep the basis and verification state in the deadline record and surface imminent or missed fatal dates first.

## Success

The project `AGENTS.md` names its record and completion condition or owner question. Intake files reflect sourced facts. An in-scope packet has a citation-cleared and validated complaint, current official forms and verified payment or waiver route. The file distinguishes prepared, filed, accepted and served states and records only supported dates and triggered obligations.
