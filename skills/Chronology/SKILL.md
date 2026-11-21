---
name: Chronology
type: skill
category: procedure
description: Build a sourced litigation timeline that connects events to pleaded issues and reconciles filing dates with tracked deadlines
version: 0.2.0
---

# Chronology

## Context

Use for "build a chronology," "timeline of events" or "chrono" in the litigant's own matter. The timeline supports statements of fact, motions, elements and deadline review. Apply the legal constitution's Standing constraint. Leave legal sufficiency to Claim Chart and disputed dates to the litigant's review.

Classifier seam: none.

## Objective

Save `chronology.md` in the matter. Give each event a source, show claim and element links where the record supports them, and identify date conflicts, uncertainty and deadline discrepancies.

## Inputs

- `<user_request>` names the matter and any issue or date scope.
- `<context>` names the matter `AGENTS.md`, current posture and destination.
- `<source_material>` holds the history, filings index and underlying filings, orders, correspondence, evidence, claims and any Claim Chart. Use the deadline record for cross-checks.

## Steps

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### Which events and sources belong in the chronology?

1. Run Maintain Matter File for its matter preflight. Gather event date, description and source location from the history, filings, orders, correspondence and evidence. Distinguish dates for event, creation, issuance, filing and service when the source distinguishes them.
2. Do the sources record the same event with agreeing details, competing details, or separate events? Merge agreeing duplicates, citing the most authoritative source for the event and preserving useful corroboration. Keep conflicting versions visible with their respective sources and refer the conflict to the litigant. Keep separate events separate. Use an order or docket entry over an informal summary when it documents the event directly.
3. Is a date explicit, inferred, or absent? Sort explicit dates oldest first. In the uncertain or undated section, retain the inferred date and its basis or state "date unknown," respectively. Keep each row tied to a filename and location, filing date or exhibit reference. Leave an event without an identifiable source out of the chronology and report the evidence gap.
4. Read the claims record and any verified Claim Chart. Does a source support a connection to a stated claim, defense, element or procedural trigger? Cite that claim or element reference in Notes. If the mapping is unclear or authority is missing, label it unresolved. If the event has no identified claim relationship, keep it when relevant to the procedural timeline. Do not turn temporal association into causation or infer new elements.
5. Cross-check actual filing and service dates against the calculated dates in the deadline record. If they agree, record the check. If a trigger, calculation or source conflicts or is missing, report the competing dates or gap and route proposed corrections to Maintain Matter File. Flag a missed or imminent fatal deadline first and suggest licensed counsel.
6. Save the dated table and the uncertain or undated section using `Date | Event | Source document | Notes`. Refresh the corresponding rows when new filings, orders or evidence arrive.

## Pitfalls

- If matter or issue scope is ambiguous, clarify before assembling the timeline. Before saving, check the path. If it is fresh or already holds identical bytes, save or reuse it respectively. If this run refreshes an earlier chronology, preserve the earlier version through the owning root's archive and write rules or use a distinct path when replacement is unauthorized.
- A court order dated one day and entered or served another can support multiple events. Preserve those distinctions and the authority that selects the deadline trigger.

## Success

The timeline is ascending for confirmed dates, every row can be traced to source evidence, competing and inferred dates remain visible, claim and element links stay within the record, and the deadline cross-check lists each discrepancy or missing trigger.
