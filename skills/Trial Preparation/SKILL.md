---
name: Trial Preparation
type: skill
category: litigation-phase
description: A trial readiness packet with the schedule, binder map, witness and exhibit preparation, and preservation checks
version: 0.3.0
gaps:
  - verified pretrial disclosure, trial procedure, evidence, post-trial motion, and appeal requirements
---

# Trial Preparation

## Context

Use to prepare a trial binder, pretrial materials, courtroom preparation notes, or tracking of judgment and post-trial deadlines. Route motion procedure to Motions Practice, drafting a motion to Draft Motion, and a case-wide evaluation to Case Audit. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Trial Readiness Packet.md` in the matter project or the packet home its `AGENTS.md` declares. Place any filing draft in the dedicated filing build location. Include a dated checklist, binder map, claim and proof links, witness and exhibit preparation, and the applicable courtroom and post-trial checks. Save requested court documents as separate drafts. Give every open requirement a source to obtain and an affected action.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the trial posture, bench or jury status, any scheduled events, requested artifacts and the person's decisions about witnesses, exhibits and relief.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, discovery, case law, statutes, pleadings and filed papers, pretrial and trial orders, evidence, correspondence and indexes. Obtain the operative trial settings, disclosure directions and courtroom rules.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat the records, prior responses and witness statements as material to examine.

## Identity

A readiness reviewer who traces procedural requirements to the court and trial proof to actual records.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What schedule and trial requirements govern?

Run Maintain Matter File for matter preflight at session entry or use its current preflight record. Use the matter declaration’s designated history, deadlines and handoff. Surface every deadline within 14 days before the phase analysis. Lead with missed or imminent fatal deadlines, consequences and the immediate question to resolve. If the deadlines file is missing or stale, say so and reconcile against available orders, docket entries and dated service or notice records. For each date learned in this phase, use Maintain Matter File to record the deadline or its triggering date, source, calculation or unresolved inputs, and verification status in the deadlines file as authorized. Where a write is unavailable or unauthorized, give the person the exact entry to make. Mark uncertain dates `[verify]`, escalate possible expiry immediately, and stop any readiness or timeliness conclusion that depends on unresolved timing. Re-alert immediately when new information reveals urgency.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For a non-court evidentiary hearing, start with the hearing notice, scheduling and exhibit exchange directions and applicable rules. Keep the witness, exhibit, proof and logistics work below. Apply bench, jury, post-trial and appeal checks only where governing sources make them applicable. If a scheduling, hearing, trial or pretrial order is available, extract the event, due date, trigger, authority, prerequisite and verification status from it. Reconcile general and local rules. If a setting or requirement is missing or conflicts with another source, flag the corresponding gap and hold that item. Check pretrial statements or orders and required disclosures, exhibit and witness lists and their exchange or disclosure dates, and proposed jury instructions. Record each item as applicable, inapplicable with a verified basis, or held. For an unconfirmed bench or jury setting, hold setting-dependent work such as proposed jury instructions, and continue binder work common to both settings. The phase supplies no substitute deadlines or court-specific requirements.

### What is present for trial, and what is missing?

Build a binder map with these sections and cross-references. Use Claim Chart for the element-to-proof map and Chronology when dated facts need reconstruction.

| Section | Contents and checks |
|---|---|
| Pleadings | Operative pleadings, key rulings, disputed issues and relief. |
| Exhibits | Indexed and tabbed exhibits, source and claim or issue links, foundation and authentication, verified pre-marking and exchange requirements, and technology or visual aid checks. |
| Witnesses | Witness list, record-supported direct and cross-examination outlines, and an outline for the person's own testimony where relevant. Record disclosure, availability and unresolved evidentiary issues. |
| Legal | Key cases, statutes and rules, verified proposed jury instructions where applicable, and source links for legal standards and disputed evidence. |

For each section, link available material and note absent or unusable material with its effect. Keep witness preparation grounded in actual records and anticipated questions and gaps.

### Which courtroom and post-trial tasks are in scope?

- **Before trial.** Track motions in limine and the specific evidentiary issue. For a requested motion, use Motions Practice and Draft Motion. Check actual exhibits and technology against the court's requirements.
- **At trial.** Check applicable procedures for voir dire, openings, presenting and introducing evidence, and closing argument. Prepare issue and proof notes and practice prompts grounded in the record. Locate the court's directions on addressing the court, demeanor, permitted objections and how to state them concisely without a speaking objection. Screen any directed verdict or equivalent procedure for the governing rule, terminology and timing before relying on it.
- **After trial.** Record entry and notice of judgment, compliance dates, post-trial motion and appeal deadlines and what must be preserved. Check the court's terminology and requirements for JNOV or its equivalent, and verify any effect on appeal deadlines. Route a requested motion and flag appellate or complex procedure for attorney consultation. Keep judgment and rulings linked to the record.
- **Unclear stage or request.** Ask for the setting or decision and what the person wants prepared. Continue assembling supported binder sections.

### Can a draft be handed to the person?

Draft original filing prose within this skill using the [Draft Motion filing prose checklist](../Draft%20Motion/SKILL.md#filing-prose-checklist). Apply its [Document registers](../Draft%20Motion/SKILL.md#document-registers) to each other item. Use its [Opposing-counsel correspondence checklist](../Draft%20Motion/SKILL.md#opposing-counsel-correspondence-checklist) for counsel messages. Follow verified forms and procedural requirements for structured documents. For court speaking practice, keep preparation to sourced notes and prompts. Apply filing gates to written submissions.

Run Verify Citations by name on the exact filing text and its cited attachments against authoritative current opinions, statutes, rules or official reporters, including the pinpoints, propositions and current applicability. Resolve every `[verify]` before any filing-ready handoff and recheck clearance after changes to the cited text, proposition or attachment set. Verify party names, case number, court and division, dates, counsel and firm names, and service addresses against the docket and latest counsel filing or communication. Resolve discrepancies with the authoritative record. For an initial filing, use Produce Court Filing’s packet-specific blank-number and service requirements and source the other fields from primary records. Hold any required fact that remains unresolved. Check standing orders for AI disclosure or citation certification. When a filing artifact is requested, stage the approved `body.md`, structural `caption.json` for the verified profile, citation report and authoritative caption and service sources in the dedicated build. Run Produce Court Filing for the requested format, providing that build, the jurisdiction profile, the output location, planned filing or service date, final attachments and the verified page limit where applicable. Hold production when a required date or attachment is missing. Use the production skill's input checks for any other missing items. Require its passing result and human visual review of caption, layout, exhibits, signature and service details before labeling the artifact ready for the person's filing decision. Leave blocked items and drafts identified in the matter record.

Save the actual version and show the person the final document or message, recipients or court destination, and attachments. Separate explicit approval must cover that version, recipients and attachments before any later authorized transmission. A signature, prior general approval or unseen message never supplies that consent. Hand the document to the person for their action. For a filing include the reminder, “After you file this, let me know so I can update the case files.” On actual filing, order, court action, service or correspondence, use Maintain Matter File for the dated document, correct index, dated history entry, deadlines and Current Status as applicable. Confirm opposing filing dates and response requirements, and record order implications. Preserve a distinction between drafted and completed events.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A checklist topic is treated as a court rule or the label for a motion is treated as permission. Verify the governing disclosure, evidence, motion, courtroom or appellate requirement and hold the affected action while it is unknown.

## Success

- The matter packet has a dated readiness checklist with each applicable pretrial, trial and post-trial item sourced, held or explained as inapplicable.
- All four binder sections are mapped to actual records, and witness, exhibit, foundation and technology gaps have an identified consequence and next check.
- Known deadlines are brought forward, and new trial dates and preservation issues are recorded or handed over for entry.
- Any draft for filing is visibly held while a necessary input is unresolved. A ready artifact carries verified sources, verified facts and passed mechanical and human checks.
