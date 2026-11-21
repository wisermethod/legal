---
name: Draft Motion
type: skill
category: procedure
description: Draft a motion body and a sourced caption packet that clear citation and factual checks before court filing production
version: 0.1.0
---

# Draft Motion

## Context

Use for "draft a motion" or "write a [motion type]" in the litigant's own matter. Apply the legal constitution's Standing constraint. Produce substantive text and caption data. Produce Court Filing owns layout, validation and release review.

Classifier seam: none.

## Objective

Save a reviewed `body.md` and a verified `caption.json` in a dedicated filing build directory, with the citation report and source reconciliation needed by Produce Court Filing.

## Inputs

- `<user_request>` identifies the motion, relief and matter.
- `<context>` names the owning root, matter `AGENTS.md`, build directory, court, and procedural posture.
- `<source_material>` holds the matter's history, deadlines, parties, claims, arguments and supporting documents as relevant, plus the docket, orders, latest counsel filing or communication, and any cited attachments under Verify Citations' manifest contract.

## Steps

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What clears the motion draft?

1. **Establish the record.** Run Maintain Matter File for its matter preflight and drafting cross-references. Surface deadlines within 14 days before drafting. Use the procedural checklist from Motions Practice when supplied and the preflight assessment for the substantive basis. Accept a supplied `complete` or `exception verified` conferral outcome only for this motion with the same relief, facts and rule. A supplied `held` keeps drafting held until the documented gap clears. Verify the source for any other or stale status before proceeding. For a direct drafting request, verify the governing rule, conferral, page limit and checklist requirements from the current court sources. Do not restart Motions Practice's drafting route when it handed over the motion. Confirm jurisdiction before drafting. Is conferral required under the rules for this motion, including applicable Colorado conferral rules when relevant? If required and documented, cite the date, participants, result and source. If required and undocumented, ask whether conferral occurred and its outcome. Hold drafting until the required record is established. If applicability is unresolved, verify it and hold the dependent draft. For a verified exception, include its explanation only where the court requires it. In Colorado check the applicable C.R.C.P. 121 provision. Never imply conferral occurred from silence.
2. **Draft substance.** Hand public-facing prose to `wiser`'s Content Author with the court's required register and the litigant's own wording, when supplied. Follow its required voice binding and stop on a missing binding. Continue independent factual and structural preparation while it is unresolved. Put the introduction and exact relief up front, then any required conferral certificate, sourced facts in chronological order, arguments connecting the facts and legal elements, and a conclusion and prayer for relief. Leave caption, layout markup, signature and certificate of service to structured data and production. Record the approach, alternatives considered and confidence for the litigant to review. If the record conflicts or is thin, show the conflict or gap and mark the draft pending wherever it affects a factual assertion or requested relief.
3. **Reconcile the caption and service.** Read the `legal` tool `Court Filing` contract. From that tool run `node scripts/court-filing.js profiles` and use the exact profile in `profiles` or an applicable validated profile file under the tool contract. Use its `caption_defaults` as an example and apply its caption schema. Fill the court, parties, exact case number, division, title, signer and applicable service data. Use the parties record for names and contact information, the live docket and orders for case number, division, names and dates, and counsel's latest filing or communication for firm, service method, addresses and emails. Record exact sources and reconcile differences visibly. Are any required fields missing or still contradictory? Yes: report both readings and hold production until resolved. No: save `caption.json`. Supply `service` for a required certificate. Use `no_service_certificate` only for a verified filing type and exact applicable reason in `no_service_certificate_reasons`. Hold when certificate treatment is unresolved. Leave signature and applicable service dates blank for the signer.
4. **Check citations and voice.** Run Verify Citations with `body.md` and its cited-attachment manifest, including originals and any readable companion text. Use an empty manifest when no attachment is cited. Hold production with any unresolved `[verify]`. Read the draft aloud. Does it sound like an informed, respectful person who could say and defend those words at a hearing? If yes, keep it. If it sounds like counsel or stock legal prose, revise. Prefer first person unless the required form calls for third person. Replace formulaic openings, closings, Latin and vague time phrases with plain English and specific dates. Preserve correct citation form, necessary terms of art, numbered allegations and devices the pleading requires. Re-run Verify Citations whenever the pass changes a citation or the proposition it supports. Check the court's current AI disclosure requirements where applicable.
5. **Hand off.** Are the preflight, citation, factual and voice gates clear for this exact packet? If yes, hand the body, caption, jurisdiction profile, attachment manifest and originals, and gate evidence to Produce Court Filing when a produced artifact is requested. For a drafting-only request, return the packet as the production handoff. If any gate is held, identify the outstanding item and leave the draft for review. After confirmed filing, route the filed document and receipt to Maintain Matter File for the filings index, history and affected deadlines.

## Pitfalls

- An ambiguous matter, requested remedy, or conflicting instruction requires clarification before the affected draft can proceed. Question an unsupported assumption with the specific risk, source and available options.
- A complex or novel procedure, appeal, criminal or significant financial exposure, substantial settlement, missed or imminent fatal deadline, or a task beyond the litigant's comfort warrants suggesting licensed counsel. Name the concrete concern and mention limited-scope or document review as available forms of help.
- Counsel correspondence has its own register. Use short, plain professional language with no slang or jokes. Make service, preservation, settlement and conferral communications complete enough to stand alone as records. Correct a false statement with specific facts and a professional tone. Read the communication as an exhibit a judge could see before proposing release. Show the exact message, recipients and attachments and obtain explicit approval before any transmission.

## Success

The build directory holds a substantive `body.md`, `caption.json`, the citation report and caption/source reconciliation. A production handoff has no unresolved verification flags, records the plain-language review, and leaves signature and service dates for the litigant. A filing draft ends by asking the litigant to report back after filing so the record can be updated.
