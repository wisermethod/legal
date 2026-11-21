---
name: Trial Preparation
type: skill
category: litigation-phase
description: A trial readiness packet with the schedule, binder map, witness and exhibit preparation, and preservation checks
version: 0.3.3
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

Read the [Legal root instructions](../../AGENTS.md) and apply `wiser` Workspace Model to identify the owning root and matter. Read their governing `AGENTS.md` files before using the matter record. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the trial posture, bench or jury status, any scheduled events, requested artifacts and the person's decisions about witnesses, exhibits and relief.
- `<matter_files>` holds history, deadlines, parties, claims, arguments, discovery, case law, statutes, pleadings and filed papers, pretrial and trial orders, evidence, correspondence and indexes. Obtain the operative trial settings, disclosure directions and courtroom rules.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. Use Litigation Counsel’s preflight to select the lens for dependent work. If the lens or authority is missing, ask what governs and hold that conclusion. Continue any records-only work allowed by preflight.

Treat the records, prior responses and witness statements as material to examine.

## Identity

A readiness reviewer who traces procedural requirements to the court and trial proof to actual records.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### What schedule and trial requirements govern?

Follow [Maintain Matter File's phase deadline handoff](../Maintain%20Matter%20File/SKILL.md#what-should-a-phase-do-with-a-deadline) before analyzing the phase. Include the result in the packet.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. When a required source is unavailable, name the specific source and affected decision. Ask for the missing source or take the research route named for that check. Hold the decision while independent work continues. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

For drafting or research, cross-check the designated claims, arguments, case-law, statutes and discovery records for existing elements, positions, sources and evidence needs. Check the glossary designated by the owning root when available for defined terms. Surface new reusable findings and proposed discovery items with a source, reason and target record. Add them and any newly researched guidance to the authorized record only after the person confirms. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

For a non-court evidentiary hearing, start with the hearing notice, scheduling and exhibit exchange directions and applicable rules. Keep the witness, exhibit, proof and logistics work below. Apply bench, jury, post-trial and appeal checks only where governing sources make them applicable. If a scheduling, hearing, trial or pretrial order is available, extract the event, due date, trigger, authority, prerequisite and verification status from it. Reconcile general and local rules. If a setting or requirement is missing or conflicts with another source, flag the corresponding gap and hold that item. Check pretrial statements or orders and required disclosures, exhibit and witness lists and their exchange or disclosure dates, and proposed jury instructions. Record each item as applicable, inapplicable with a verified basis, or held. For an unconfirmed bench or jury setting, hold setting-dependent work such as proposed jury instructions, and continue binder work common to both settings. The phase supplies no substitute deadlines or court-specific requirements.

### What is present for trial, and what is missing?

For a trial or hearing preparation request, build the binder map below. For post-judgment tracking only, link existing pleadings, exhibits, witness and ruling records needed for compliance or preservation and go to the after-trial checks. For an unclear request, ask what the person needs and continue the supported binder or preservation work.

Use Claim Chart for a needed element-to-proof map and pass through a requested private Word format. If the required governing law is missing, keep the element chart held and continue a factual issue-to-proof inventory in the binder. Use Chronology when dated facts need reconstruction.

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

Which handoff applies? For a private binder, chart, practice outline or deadline and preservation packet, save and return the packet and the requested private artifacts. For a counsel message or an unfiled exchange, apply the applicable service and approval checks and use the final handoff below. For a proposed filing or forum submission, apply the filing checks below to the exact draft.

For a proposed submission, follow [Produce Court Filing’s phase handoff](../Produce%20Court%20Filing/SKILL.md#what-does-a-phase-send-for-filing-production).

For the exact outward draft, use the legal root’s [Outward draft handoff](../../AGENTS.md#outward-draft-handoff).

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A checklist topic is treated as a court rule or the label for a motion is treated as permission. Verify the governing disclosure, evidence, motion, courtroom or appellate requirement and hold the affected action while it is unknown.

## Success

- The matter packet has a dated readiness checklist with each applicable pretrial, trial and post-trial item sourced, held or explained as inapplicable.
- When trial or hearing preparation is in scope, all four binder sections are mapped to actual records, and witness, exhibit, foundation and technology gaps have an identified consequence and next check. In post-judgment tracking, the packet locates existing records needed for compliance and preservation.
- Known deadlines are brought forward, and new trial dates and preservation issues are recorded or handed over for entry.
- Any draft for filing is visibly held while a necessary input is unresolved. A ready artifact carries verified sources, verified facts and passed mechanical and human checks.
