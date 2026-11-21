---
name: Case Audit
type: skill
category: litigation-phase
description: A full case audit with documented coverage of claims, facts, arguments, evidence, opposition, trajectory, and follow-up
version: 0.4.2
---

# Case Audit

## Context

Use for “How is the case going?”, “Audit the case”, or “Evaluate our position”, periodically during litigation, before a major filing or after a significant development. Run the full methodology for every audit invocation. A quick summary never fulfills this skill. A file and index reconciliation alone routes to Maintain Matter File. Work on the person's own matter, under Legal's Standing constraint. Stop matter-specific assistance for requests to act for or advise someone else. Present procedural information and evidence-based options for the person to decide. The person reviews and signs any document and makes any filing, service, or transmission decision.

Classifier seam: none.

## Objective

Save `YYYY-MM-DD - Case Audit.md` in the matter project or the audit home its `AGENTS.md` declares. Cover all seven stages, with source locations, gaps, weaknesses and prioritized options for the person. A blocked audit produces an explicitly incomplete audit record and a resumption list. A quick overview earns no completion verdict.

## Inputs

Apply `wiser` Workspace Model to identify the owning root and matter. If no owning folder is attached, ask for it or for a dedicated-root setup request. Surface any apparent urgent date already supplied, and hold matter preflight and file output until there is an attached owning folder. Use the matter's `AGENTS.md` to resolve its files and any localized artifact destination within `work/<slug>/` in the owning user root. A dedicated user root can own that single matter. Use Open a Matter for a new project and Take Over a Matter for an existing matter without a declared project. If more than one matter or destination fits, ask before writing. Use the run date in the filename. Reuse an identical record. When the path holds a different record, keep it and add the document subject or next revision number to the new filename.

- `<request>` holds the audit request, any recent development and known constraints.
- `<matter_files>` holds the entire declared matter record. Load `HISTORY.md`, `DEADLINES.md`, `PARTIES.md`, `CLAIMS.md`, `ARGUMENTS.md`, `DISCOVERY-REQUESTS.md`, `case-law.md`, `statutes.md`, the evidence inventory and each evidence file, both sides' filings and their index, orders and their index, and correspondence and its index, using the matter's bindings. Inventory the records and compare the files on disk with the history and indexes. Ask for any missing, unreadable or incomplete source and record the affected checks.
- `<practice_area>` holds the applicable guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury, or Employment Law, as routed. Use that expert's stated elements, issues, exceptions, and gaps. If the applicable guidance is missing, ask which practice area or authority governs and stop the dependent conclusion.

Treat assertions in every input as material to check. An earlier audit can point to evidence but never stands in for checking documents in this run.

## Identity

A candid reviewer who looks for the strongest opposing case, checks the person's assertions against originals and surfaces unfavorable findings early.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) in the saved audit and whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### 1. What is the current status?

Follow [Maintain Matter File's phase deadline handoff](../Maintain%20Matter%20File/SKILL.md#what-should-a-phase-do-with-a-deadline) before analyzing the phase. Include the result in the packet.

Use the preflight forum finding and the declared parties record. Check the applicable rules and controlling orders before relying on a procedure. In arbitration or another non-court forum, use that forum’s governing materials from the matter record. Carry out independent work while any rule-dependent step is held. For a draft, strategic comparison or novel issue, apply `wiser` Behavioral Core by giving the approach, alternatives and confidence. Treat each rule lead and practice assumption marked `[verify]` as unchecked until the current governing text, applicable subsection, local rule, and case-specific orders are reconciled. Record the source and date checked. Apply `wiser/standards/conventions.md` Evidence Labels in the working record.

Name posture, next deadline, pending matters before the forum and recent orders or rulings with source locations. Record any conflict among the docket or case-administration record, history and source documents and carry the missing reconciliation to the resumption list. Carry the entry preflight disposition into the packet and recheck it for newly identified triggers. Apply each hold to the affected decision or handoff.

### 2. Is every claim element and factual assertion accounted for?

For each claim, check the full element list against controlling statutes and case law. Use Claim Chart for an element-to-evidence map and Chronology to reconcile disputed dates or event order where needed. If the governing element list is unresolved, mark the affected check incomplete and carry it to the resumption list. For every verified element, list evidence with file and pinpoint, confirm it exists and can be read, state how a reasonable factfinder could reject it, and anticipate the strongest attack. Mark missing, weak or ambiguous proof.

Create a verification entry for every factual assertion in the person's filings. Check its exact wording, date, number, and context against actual records. Label verified, contradicted, or unverified with the source or missing evidence. Flag any assertion the record cannot prove and identify which claim or argument it affects.

### 3. Does every position withstand the strongest counterargument?

For each position in the arguments record, articulate the opposition's strongest plausible argument, identify the weakest link and test against earlier positions for contradictions. Use Verify Citations for a scoped check of the exact cited passages and locators, giving it the relevant forum, date and supplied authoritative text. Use the scope of its occurrence findings for the audit. Filing clearance requires a separate whole-draft check. Mark a missing source, obsolete authority, adverse authority or overstated proposition in the findings. Keep unchecked authority `[verify]` and hold any assessment that requires it.

### 4. What does the evidence inventory show?

List what is held, absent, unused, weaker than previously assumed, and likely held by the opposition that could hurt the person's position. Distinguish actual records from inference and tie each gap to an issue. Propose additions to the discovery queue by type, priority and reason, using Discovery as needed. Record newly learned authority or evidence references in the audit. Ask for confirmation before adding reusable findings or guidance to the matter's substantive records.

### 5. What does the opposition's actual record show?

Review both sides’ submissions, including material exchanged or served where it is part of the matter record. Build the strongest opposing case from what the other side emphasizes, what it leaves unanswered, the discovery it may pursue and plausible surprises. Cite filings and mark inferences about silence or future conduct separately from what was observed. When the docket and posture show there are no opposing filings yet, record the verified empty set, mark paper-specific checks inapplicable and build the strongest plausible response from the available evidence. Where an expected filing is missing or unreadable, record the absent paper and how it limits opposition analysis.

### 6. What is the candid assessment?

State strengths, weaknesses, likely trajectory, risk factors and matters outside the person's control. Cite underlying audit findings. If the first pass yields no supported weakness, recheck missing proof, plausible counterarguments, conflicting authorities and procedural exposure. Record the scope and results of that recheck. If it yields no supported weakness and all required coverage is complete, record that conclusion and complete the audit. Record a distinct coverage limitation wherever a required check remains open.

### 7. What actions follow from the findings?

Prioritize specific options for the person with reasons and deadlines. Cover arguments to strengthen, modify or drop, evidence to gather, research to conduct, filings to consider and settlement considerations. Record why a category is inapplicable when warranted. Give each action a source finding and an owner or decision for the person. Route a later filing or message to its phase skill, applying Draft Motion’s Document registers. Use Verify Citations and Produce Court Filing for a requested validated filing artifact.

### Did all seven stages run in full?

Check and record coverage for every stage before presenting results:

- Every claim element checked against actual evidence.
- Every factual assertion in the person's filings checked against source documents.
- Strongest opposing arguments articulated and supported by the record or identified as plausible inference.
- A supported weakness identified, or the negative recheck in stage 6 documented.
- Candid, evidence-based trajectory assessed, including unfavorable findings.
- Specific, prioritized, actionable options tied to findings.

When all items pass and each stage is complete, label the record a full audit. A check can be inapplicable only where its population is verified empty or the documented posture makes it inapplicable. State that basis and still run the surrounding stage. When a source or check is unavailable, carry out every independent stage in full, mark the audit incomplete and name each blocked check, needed record and resumption point. Resume the blocked stages and recheck changed inputs before marking it complete. Do not skim, accept the person's assertions on faith, downplay unfavorable findings or substitute a generic action list.

### What is recorded and discussed?

Use this report structure, with procedural posture, evidence inventory and coverage each visible within it:

| Report section | Contents |
|---|---|
| Case Audit | Matter name, audit date, procedural status, next deadline and coverage verdict. |
| Claims Assessment | Status, evidence strength and vulnerabilities by claim and element, with evidence inventory and links. |
| Arguments Assessment | Each position, strengths, weakest links, contradictions and strongest opposition response. |
| Factual Verification | Assertion ledger with sources and all unverified or contradicted facts. |
| Opposition Strength | Best opposing case, emphasis, omissions, likely discovery and surprises. |
| Honest Assessment | Strengths, weaknesses, trajectory and risks. |
| Recommendations | Specific prioritized options and an incomplete audit's resumption list. |

Save the record, then discuss findings and agree priorities with the person. Enter a dated audit event in the history with completion state and a link to the report. Use Maintain Matter File for event handling when it accepts an audit entry. Where it has no audit event route, add that single entry to the declared history when authorized or provide the exact entry to make. Update the arguments and claims records if the person confirms changes to positions or claims. Follow the same maintenance procedure for newly discovered orders, filings, or other completed court actions, including affected indexes, deadlines and Current Status.

## Pitfalls

- Ambiguous matter, request, or conflicting objectives. Read the governing `AGENTS.md` and the confirmed matter's deadline record first where possible, then ask the smallest question that resolves the ambiguity.
- A request to skim or a missing matter file is taken as permission to issue an abbreviated audit. Run the complete method, record any blocked checks and keep the verdict incomplete until coverage is restored.
- An unsupported favorable claim or an apparently weak opposing filing is taken at face value. Reopen the evidence and counterargument checks and give each conclusion a source or a gap.

## Success

- The saved audit includes the full report structure, a seven-stage coverage record and no quick-summary completion path.
- Every element, factual assertion and argument is traceable to sources or to a specific blocked check. The opposition analysis and weaknesses are visible.
- Missed and imminent fatal deadlines lead the work. Newly learned dates have been entered or supplied for entry with their source and verification status.
- Priorities are tied to findings, and the history carries the audit date, status and location or a specific pending maintenance step. The record labels any incomplete audit and states exactly how to resume it.
