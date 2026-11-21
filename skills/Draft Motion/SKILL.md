---
name: Draft Motion
type: skill
category: procedure
description: Draft a motion body and a sourced caption packet that clear citation and factual checks before court filing production
version: 0.4.0
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

Apply the [Handoff label](../../AGENTS.md#handoff-label) whenever this work returns an assessment, packet or draft to the person, including on an early return.

### What can proceed on this entry?

Before dependent work, request `preflight` from [Litigation Counsel](../../experts/Litigation%20Counsel/EXPERT.md) with this skill's name, the planned work, and the available matter or intake record. Reuse its current result only for the same issue, action and facts. On `proceed`, apply the returned practice-area prerequisites. On `hold`, record the reason and resolution needed, and limit work to independent preparation or a clearly held draft. On `stop`, end the affected work. Ask for missing facts that determine any unresolved trigger or ordering requirement. Apply this step on direct entry and when separate owner review is declined. Recheck when new information changes a trigger, posture or prerequisite.

### What clears the motion or submission draft?

Use this procedure for a non-court submission with its governing notice, rules and orders in place of court sources. Verify submission type, timing, format, conferral where applicable, service and any limits. Keep the sourced factual and citation work moving while a rule-dependent step is held. With no compatible profile, collect the verified forum fields and requirements in a submission record and hand that record to Produce Court Filing for its unprofiled production path.

1. **Establish the record.** Run Maintain Matter File for its matter preflight and drafting cross-references. Surface deadlines within 14 days before drafting. Use the procedural checklist from Motions Practice when supplied and the preflight assessment for the substantive basis. Accept a supplied `complete`, `exception verified` or sourced `not applicable` conferral outcome only for this motion with the same relief, facts and rule. A supplied `held` keeps drafting held until the documented gap clears. Verify the source for any other or stale status before proceeding. For a direct drafting request, verify the governing rule, conferral, page limit and checklist requirements from the current court sources. Do not restart Motions Practice's drafting route when it handed over the motion. Confirm jurisdiction before drafting. Is conferral required under the rules for this motion, including applicable Colorado conferral rules when relevant? If required and documented, cite the date, participants, result and source. If required and undocumented, ask whether conferral occurred and its outcome. Hold drafting until the required record is established. If applicability is unresolved, verify it and hold the dependent draft. For a verified exception, include its explanation only where the court requires it. In Colorado check the applicable C.R.C.P. 121 provision. Never imply conferral occurred from silence.
2. **Draft substance.** Draft the body within this skill using Document registers and the Filing prose checklist below. Use the litigant's wording where it meets that checklist. Put the introduction and exact relief up front, then any required conferral certificate, sourced facts in chronological order, arguments connecting the facts and legal elements, and a conclusion and prayer for relief. Leave caption, layout markup, signature and certificate of service to structured data and production. Record the approach, alternatives considered and confidence for the litigant to review. If the record conflicts or is thin, show the conflict or gap and mark the draft pending wherever it affects a factual assertion or requested relief.
3. **Reconcile the caption and service.** For a profiled court filing, read the `legal` tool `Court Filing` contract. From that tool run `node scripts/court-filing.js profiles` and use the exact profile in `profiles` or an applicable validated profile file under the tool contract. Use its `caption_defaults` as an example and apply its caption schema. Fill the court, parties, exact case number, division, title, signer and applicable service data. Use the parties record for names and contact information, the live docket and orders for case number, division, names and dates, and counsel's latest filing or communication for firm, service method, addresses and emails. Record exact sources and reconcile differences visibly. Are any required fields missing or still contradictory? Yes: report both readings and hold production until resolved. No: save `caption.json`. Select the profile’s exact `document_type` and supply its listed `filing_packet` when required. Supply `service` when the type prints a certificate. Verify the forum form or enclosing packet before using a type that omits the certificate. Hold when certificate treatment is unresolved. Leave signature and applicable service dates blank for the signer.
4. **Check citations and voice.** Run Verify Citations with `body.md` and its cited-attachment manifest, including originals and any readable companion text. Use an empty manifest when no attachment is cited. Hold production with any unresolved `[verify]`. Run the Filing prose checklist before handoff. Re-run Verify Citations whenever the pass changes a citation or the proposition it supports. Check the court's current AI disclosure requirements where applicable.
5. **Hand off.** Are the preflight, citation, factual and voice gates clear for this exact packet? If yes, hand the body, caption, jurisdiction profile, attachment manifest and originals, and gate evidence to Produce Court Filing when a produced artifact is requested. For a drafting-only request, return the packet as the production handoff. If any gate is held, identify the outstanding item and leave the draft for review. After confirmed filing, route the filed document and receipt to Maintain Matter File for the filings index, history and affected deadlines.

### Document registers

Choose one register for each item in the packet:

| Document | Register |
|---|---|
| Court or forum pleading, motion, brief, filed stipulation, declaration, or other submission | Filing prose checklist below. The court's prescribed language, caption, and form control their respective fields. |
| Served discovery requests, responses, disclosures, and other formal legal instruments | Use the governing form, procedural structure and precise plain English within the owning legal skill. Apply the filing checklist to any copy proposed for filing. |
| Counsel correspondence, including routine requests, service, preservation or litigation hold, C.R.E. 408 settlement communications and conferral | Opposing-counsel correspondence checklist below, inside the legal skill doing that work. |
| Ordinary prose, such as a letter to a non-lawyer or an explanatory summary for the person | Use Content Author in `wiser` only if the owning root binds a voice. Without a bound voice, draft directly in clear language for that reader. |
| Private matter records and preparation materials, including assessments, checklists, chronologies, claim charts and hearing notes | Use the matter's record format or a neutral, source-grounded working register. |

Draft court and counsel text inside the relevant legal skill. A bound or missing voice has no effect on these two registers.

### Filing prose checklist

1. State the request up front, tell the facts in chronological order, cite the verified legal basis, connect the facts to the elements and ask for specific relief. Use plain, professional and respectful English. Prefer “I” for a self-represented signer unless the type of document calls for third person. Read the draft aloud and revise anything the signer could not naturally say and defend at a hearing.
2. Search for each expression below and apply the substitution where the form permits it. Check variants as well as exact matches.

| Search for | Use |
|---|---|
| Plaintiff respectfully submits | I am asking the Court to |
| Wherefore, Plaintiff prays | For these reasons, I ask the Court to |
| The instant motion | This motion |
| Defendant's conduct constitutes a clear violation | [Party] violated [statute] when they [specific conduct] |
| It is axiomatic that | State the principle directly |
| Plaintiff incorporates by reference | As explained in my Complaint, where the reference is informal |
| The foregoing demonstrates | This shows |
| Pursuant to | Under |
| In the alternative | If not, then |
| At all times relevant hereto | The specific dates or date range |
| Latin phrases | Their plain-English equivalents |

3. Keep the correct case and rule citation form, numbered allegations, defined terms, necessary terms of art and devices such as formal incorporation by reference when the pleading requires them. Remove personal attacks and stock openings such as “comes now” or “hereinafter.” Confirm cited authority and court-specific AI disclosure or citation certification.
4. Ask “Would a judge reading this think a lawyer wrote it?” If so, simplify and read it aloud again. Preserve clarity, accuracy, and required structure. Record the pass before handing the draft to production. Rerun Verify Citations if a revision changes any citation or its proposition.

### Opposing-counsel correspondence checklist

1. Address counsel by first name in ordinary correspondence. Keep it short, plain, friendly and professional. Make the request explicit. Remove legal ornament, lectures, slang and jokes.
2. Use a formal, complete record for service of papers, preservation or litigation holds, C.R.E. 408 settlement and conferral that may be attached to a motion. State the action, relevant dates, attachments, requested response and other details needed to stand alone. Check the applicable requirements for each message.
3. Answer a documented false statement directly with the supporting facts. Choose confrontational wording deliberately and remove hostility.
4. Ask “Would I be fine with the judge reading this attached to a motion?” Rewrite if the answer is no or if the message reads like a brief. Show the exact version, recipient list and attachments for approval before any transmission.

## Pitfalls

- An ambiguous matter, requested remedy, or conflicting instruction requires clarification before the affected draft can proceed. Question an unsupported assumption with the specific risk, source and available options.
- A complex or novel procedure, appeal, criminal or significant financial exposure, substantial settlement, missed or imminent fatal deadline, or a task beyond the litigant's comfort warrants suggesting licensed counsel. Name the concrete concern and mention limited-scope or document review as available forms of help.

## Success

The build directory holds a substantive `body.md`, profiled `caption.json` or the forum submission record, and the citation report and source reconciliation. A production handoff has no unresolved verification flags, records the plain-language review, and leaves signature and service dates for the litigant. A filing draft ends by asking the litigant to report back after filing so the record can be updated.
