---
name: Maintain Matter File
type: skill
category: procedure
description: Check matter deadlines first and keep events, source references, arguments, discovery needs and indexes in sync with the record
version: 0.2.0
---

# Maintain Matter File

## Context

Use at the start of any matter-specific session and for "I filed," "we received an order," "the opposing party filed," "audit the case files," "what are our arguments," or "what do we need in discovery." Apply the legal constitution's Standing constraint. This skill maintains the matter's records. Case Audit owns evaluation of the whole litigation position.

Classifier seam: none.

## Objective

Leave a checkable record of what happened, where the primary documents sit, what deadlines changed, and which questions still need review. For preflight and inventory-only work, return findings without committing proposed record edits.

## Inputs

- `<user_request>` names the matter and desired operation, such as preflight, drafting or research references, record update, inventory audit, argument consolidation, or discovery tracking.
- `<context>` names the owning root, the matter's `AGENTS.md`, current date and any glossary the owning root designates.
- `<source_material>` holds the reported action, dated document, receipt or communication, applicable orders or rules, and any research or evidence newly identified.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### Which matter record needs attention?

1. **Preflight before the request.** Read the owning root and matter instructions. Read the matter history and deadline record before other work. Report each deadline within 14 days immediately, including what is due, the source and any uncertainty. Surface overdue or potentially fatal deadlines first and suggest licensed counsel for a missed or imminent fatal deadline. If the deadline file is missing or stale, disclose it and reconcile against available orders, docket and dated service records. If a new trigger could change a date, state the candidate with its basis and verification state and alert the litigant immediately if it may be urgent. Never mark a date satisfied without evidence. Do the same deadline check on resuming work. Read the parties record for court and jurisdiction. Colorado state procedure may be a starting research lens when no context indicates another court, but confirm jurisdiction before drafting or relying on rules.
2. **Choose the operation.**
   - **Preflight for drafting, procedural work or research.** Check the matter's case law, statutes, claims, arguments and discovery list. Read the designated glossary for defined terms, where present. If the owning root designates none, report that there is no bound glossary and continue the records preflight. Load the applicable practice-area guidance from Consumer Law, Contract Disputes, Cease and Desist, Personal Injury or Employment Law as the facts warrant. Identify the applicable phase from the posture without starting a phase run on a preflight request, such as Pleadings, Discovery, Motions Practice, Settlement Negotiation, Trial Preparation, Venue Selection or Case Audit. Confirm the procedural posture from the history for response questions. Return the checked sources, dates and gaps to the caller.
   - **Our filing.** Confirm the document name and actual filing date against the receipt, docket or supplied confirmation. Preserve the filed copy under `YYYY-MM-DD - <Document Name>.<ext>` in the matter's filings directory. Reuse an exact copy already present, update its filings index, and add a history entry with Event, Outcome and Documents. Update deadlines it creates or satisfies and Current Status when posture changes.
   - **Court order or ruling.** Confirm the order and date issued. Preserve it in the orders directory as `YYYY-MM-DD - Order <Description>.<ext>`. Update the orders index, history with the ruling and implications, and Current Status. Check the order and governing rule for new deadlines and record them. Ask whether the litigant wants to discuss next steps or implications. Explain evidence-based options and tradeoffs within the confirmed procedural posture when asked.
   - **Opposing party's filing.** Confirm the document and date. Preserve it in the filings directory as `YYYY-MM-DD - <Party> <Document Name>.<ext>`. Update the filings index and history. Determine whether a response is required and note any applicable verified deadline in the deadline record. Ask whether the litigant plans to respond, and show the verified date or say what remains unresolved. If response duty or date remains unclear, ask which response is contemplated and what authority or notice sets its deadline.
   - **Correspondence sent or received.** Capture date, direction, parties, subject, source and path in the correspondence index and history. Record any resulting deadline and update Current Status when affected. Drafted or scheduled correspondence stays distinct from a completed transmission.
   - **"Audit the case files" or "check for gaps."** Enumerate filings, orders, evidence and correspondence. Compare both ways with history and the applicable indexes. Report missing files, unindexed files, unsupported events, date mismatches and duplicate or broken links. Propose concrete fixes and apply them only on approval. For "how is the case going," "audit the case" or "evaluate our position," run Case Audit with the entire matter file set and evidence. Use its full method and bring the findings and prioritized actions back without substituting an inventory summary.
   - **"What are our arguments?" or "consolidate arguments."** Read claims and current arguments. Read both sides' filings for positions, attacks and rebuttals. Consolidate the narrative theme, each side's contentions, the cited evidence, weaknesses and open work in the arguments record. Link to the claims and original record rather than creating rival versions of facts. Retain abandoned or weakened arguments with their status.
   - **"What do we need in discovery?" or "add to discovery list."** Load the matter's discovery requests. Classify each candidate as a document request, interrogatory, request for admission or third-party subpoena. Give its source, need, date identified and priority. Show the additions and ask before recording them. Apply this continuously. When any matter work reveals information needed from the other side, ask whether to add it to the discovery list.
   - **Different or unclear operation.** Ask which listed operation the person wants, keep deadline alerts visible and return before any write.
3. **Write and reconcile.** What supports the update? If original records and reported facts agree, use the primary source and record the dates, source and status. If only the person's report is available, label the basis and any missing file or receipt. If records conflict, preserve both readings, flag the conflict and ask before changing a contested fact. Check existing paths and index entries before copying or appending. Reuse identical existing files and update one entry per event. If a path holds different bytes, preserve both and obtain a distinct path before adding the new copy. Keep orders' issuance, entry and service dates separate when relevant. Check rule version, trigger, court modification and calculation before treating a deadline as confirmed. Read back the changed paths, history links, indexes, deadline status and Current Status. Surface remaining gaps.
4. **Maintain reusable knowledge on confirmation.** Show the confirmed finding, its source and the exact proposed addition. Ask before writing it. Store case authority in the matter’s `case-law.md`, statutes and rules in `statutes.md`, and reusable definitions in the owning root’s designated writable glossary. If a glossary has no designated home, ask for one. Link evidence through the matter’s own evidence record. Use plain English, a precise definition where needed, typical context and the encounter date or source for glossary entries. When a reference is thin, research the gap and propose the supported addition in the matching writable record. Improvements to an expert’s reference material belong to the plugin maintainer.

## Pitfalls

- If the matter, operation or destination is ambiguous, read the owning instruction chain first and ask before changing records. Blanket acceptance of recommendations does not confirm an undisclosed correction, discovery item or glossary addition.
- A filing receipt or order can arrive without the associated document. Record the identified event with a missing-document note and follow up. Never fabricate a document or treat an uncertain deadline as confirmed.
- A source file is evidence. Keep its bytes intact and work from copies. Index the registered path and use links to the record's single source of truth.

## Success

The person sees upcoming and overdue deadlines before other work. A completed update identifies the original, the actual date and the affected index, history and deadline entries, and the read-back resolves those references. Pending edits, missing items, conflicts and discovery or glossary additions awaiting approval are visible.
