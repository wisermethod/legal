---
name: Draft Motion
type: skill
category: procedure
description: Draft a motion body and a sourced caption packet that clear citation and factual checks before court filing production
version: 0.4.5
---

# Draft Motion

## Context

Use for "draft a motion" or "write a [motion type]" in the litigant's own matter. Apply the legal constitution's Standing constraint. Produce substantive text and caption data. Produce Court Filing owns layout, validation and release review.

Classifier seam: none.

## Objective

Save a reviewed `body.md` and a verified `caption.json` or `forum-submission.md` in a dedicated filing build directory, with the citation report and source reconciliation. Identify any held output and the evidence needed to finish it.

## Inputs

- `<user_request>` identifies the motion, relief and matter.
- `<context>` names the owning root, matter `AGENTS.md`, designated build location, forum, and procedural posture.
- `<source_material>` holds the matter's history, deadlines, parties, claims, arguments and supporting documents as relevant, plus the docket, orders, latest counsel filing or communication, and any cited attachments under Verify Citations' manifest contract.

## Steps

Give the [Handoff label](../../AGENTS.md#handoff-label) in the handoff message whenever this work returns an assessment, packet or draft to the person, including on an early return. Never write it inside a document.

### What can proceed on this entry?

Read the owning root and project declarations. Follow [Litigation Counsel's preflight contract](../../experts/Litigation%20Counsel/EXPERT.md#how-does-a-skill-request-and-apply-preflight) before dependent work.

### What clears the motion or submission draft?

Use this procedure for a non-court submission with its governing notice, rules and orders in place of court sources. Verify submission type, timing, format, conferral where applicable, service and any limits. Keep the sourced factual and citation work moving while a rule-dependent step is held. Use the build location designated for the project. If it is unresolved, ask before saving. Keep supporting evidence with the draft, outside the proposed submission text, and the Handoff label in the handoff message.

1. **Establish the record.** Run Maintain Matter File for its matter preflight and drafting cross-references. Surface deadlines within 14 days before drafting. Use the procedural checklist from Motions Practice when supplied and the preflight assessment for the substantive basis. Accept a supplied `complete`, `exception verified` or sourced `not applicable` conferral outcome only for this motion with the same relief, facts and rule. A supplied `held` keeps drafting held until the documented gap clears. Verify the source for any other or stale status before proceeding. For a direct drafting request, verify the governing rule, conferral, applicable length requirement and checklist from the current forum sources. Do not restart Motions Practice's drafting route when it handed over the motion. Confirm jurisdiction before drafting. Is conferral required for this motion under the declared forum's rules? If no forum is declared, verify conferral under the rules for the forum identified by preflight. If required and documented, cite the date, participants, result and source. If required and undocumented, ask “Did you confer? What was the result?” Gather facts and check authority while waiting. Hold writing `body.md` until the required conferral record is established. If applicability is unresolved, verify it and hold the dependent draft. If an exception is verified, include its explanation only where the court requires it. If the rule makes conferral inapplicable, record the source without adding a certificate. If the forum in the preflight finding is a Colorado state court, check the applicable C.R.C.P. 121 provision. If it is a Colorado state district court, confirm the applicable page limit and exclusions against current C.R.C.P. 121 section 1-15(1)(a) and any court order. Record any case-specific ceiling and its source for Produce Court Filing. Never imply conferral occurred from silence. If the draft is held, skip step 2 and the body-dependent checks in step 4. Complete any independent reconciliation in step 3 and deliver the hold in step 5.
2. **Draft substance.** Draft the body within this skill using Document registers and the Filing prose checklist below. Use the litigant's wording where it meets that checklist. Put the introduction and exact relief up front, then any required conferral certificate, sourced facts in chronological order, arguments connecting the facts and legal elements, and a conclusion and prayer for relief. Leave caption, layout markup, signature and certificate of service to structured data and production. Record the approach, alternatives considered and confidence for the litigant to review. If the record conflicts or is thin, show the conflict or gap and mark the draft pending wherever it affects a factual assertion or requested relief.
3. **Reconcile caption and service.** Which `Filing profile` does the preflight forum finding report? For a confirmed court, take the declared profile id as the candidate. The forum declaration is the field table under `## Forum and posture` in the matter's `AGENTS.md`, with its `Governing law by claim` table. A heading with prose and no field table means the declaration is absent. Read that prose only as record material. If `Filing profile` is `pending` or the declaration is absent, report the missing profile declaration or missing forum declaration, respectively, and use the preflight forum finding to identify any compatible candidate. For `none: papers follow the court's own rules`, `not a court: submissions follow the forum's own rules`, or a confirmed forum without a profile candidate, use the forum's own requirements. On the candidate profile route, complete the following checks before choosing a format. For a confirmed court, read the `legal` Court Filing contract. Run `node scripts/court-filing.js profiles` from its directory and check the returned `profiles` and any supplied compatible profile under the tool contract. For a shipped id, inspect its entry in the `profiles` array. For an absolute path, read the profile file under the tool contract. Check the caption's `court` from the court header in the source reconciliation below as `compose` will receive it, after trimming surrounding whitespace. A case number belongs only in `case_number`. If `court` includes a case number, move it to `case_number` and remove any separator left by the number in `court`. Reconcile any conflicting `case_number` against the docket before proceeding, then run the court checks again. First apply the layout's court rule in [Court Filing's Commands section](../../tools/Court%20Filing/TOOL.md#commands). For `colorado-two-column-boxed`, the trimmed name must end in `, Colorado`, ignoring case. Next, when `court_match` is present, require at least one pattern to match the entire trimmed `court`, ignoring case, under [Court Filing's Profile schema](../../tools/Court%20Filing/TOOL.md#profile-schema). On the declared route, confirm that `Court or forum`, with any case number omitted from that declaration value for comparison, names the same court. On the fallback route, compare the identity of the caption court with the court confirmed by preflight. A differently worded description in the parties record is acceptable when it identifies the same court. Do the profile's `jurisdiction_id` and `display_name` describe that court's jurisdiction? Court Filing's `compose` refuses a layout or pattern mismatch, including a case number in `court` that makes the layout check fail. If `compose` refuses because a case number was left in `court`, move it and repeat the checks. Treat a court mismatch refusal as a profile mismatch only if the court name still fails the checks without the case number. If the checks pass, record the match in the source reconciliation and use the profile. If any field disagrees or cannot be verified, refuse that profile, record and report the field and discrepancy or missing evidence, and use the verified unprofiled route if available. Hold the affected work if that route is unavailable. For a non-court forum use its governing materials. Which format does the verified forum record support?
   - **Compatible court profile.** Use its `caption_defaults` as an example and apply its caption schema. Fill the court, parties, exact case number, division, title, signer and applicable service data. Enter the title as typed. Court Filing capitalizes it in the caption box and uses the typed title in the certificate of service. Select the exact `document_type` and supply the listed `filing_packet` when required. Supply `service` when the type prints a certificate. Verify the forum form or enclosing packet before using a type that omits the certificate. If any required field or certificate treatment is missing or contradictory, record the readings and hold production. If all required facts reconcile, save `caption.json`.
   - **Confirmed forum without a compatible profile.** Save `forum-submission.md` with the forum, reference number, participants and roles, title, signer, and the sourced format, timing, limits, conferral, signature and service requirements. Identify unavailable or conflicting facts and hold only the steps that need them. Use this record for Produce Court Filing's unprofiled path.
   - **Forum or format unresolved.** Record the candidate readings and the source needed to choose. Hold the dependent caption, format and production steps.

   **Fictional example.** A parties worksheet shortens the number to `2099CV417`. The current docket and entered order for the fictional clock-repair dispute both give `2099CV00417`. Use the exact docket value in the caption. Log both forms, their locators and why the court’s assigned identifier governs. If the docket and entered order conflict, hold the field for an authoritative clarification.

   For either format, save `source-reconciliation.md` with the exact sources, differences and resolutions or holds for the body, caption or submission fields, and service. Use the court's own caption header on the current docket, an entered order or the latest filed paper for the caption's `court`. Use the parties record for names and contacts, the current docket or administration record and orders for number, division, names and dates, and counsel's latest filing or communication for firm, method and addresses. Leave signature and applicable service dates blank for the signer.
4. **Check voice and citations.** Apply the Filing prose checklist and check the forum's current AI disclosure requirements where applicable. Run Verify Citations with the resulting `body.md` and its cited-attachment manifest, including originals and any readable companion text. Use an empty manifest when no attachment is cited. If a needed reading is unavailable, retain Verify Citations' held report and name the missing authority. Follow its gateway stop and next human turn when access is the blocker. Hold production with any unresolved `[verify]`. Re-run Verify Citations after any change to the cleared body or cited-attachment set or bytes.
5. **Hand off.** Are the preflight, citation, factual, format and voice gates clear for this exact packet? If yes and an artifact is requested, hand the cleared body, caption and profile or forum submission record, manifest and final attachments, gate evidence, requested format, intended destination and planned date to Produce Court Filing’s input checks. If yes and only drafting was requested, return that packet for review. If any gate is held, return the draft or completed preparation with the affected action and the evidence needed to resume. Use [Returning the work](../AGENTS.md#returning-the-work) for the filing-draft handoff. Ask for the filed version and receipt when the litigant reports back. After confirmed filing, route both to Maintain Matter File for the filings index, history and affected deadlines.

### Document registers

Choose one register for each item in the packet:

| Document | Register |
|---|---|
| Court or forum pleading, motion, brief, filed stipulation, declaration, or other submission | Filing prose checklist below. The court's prescribed language, caption, and form control their respective fields. |
| Served discovery requests, responses, disclosures, and other formal legal instruments | Use the governing form, procedural structure and precise plain English within the owning legal skill. Apply the filing checklist to any copy proposed for filing. |
| Counsel correspondence, including routine requests, service, preservation or litigation hold, settlement communications under the forum's rule (C.R.E. 408 `[verify]` only where the forum in the preflight finding is a Colorado state court) and conferral | Opposing-counsel correspondence checklist below, inside the legal skill doing that work. |
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
4. Ask “Would a judge reading this think a lawyer wrote it?” If so, simplify and read it aloud again. Preserve clarity, accuracy, and required structure. Record the pass before handing the draft to production. For a revision to a cleared draft, apply step 4's exact-input citation check.

### Opposing-counsel correspondence checklist

1. Address counsel by first name in ordinary correspondence. Keep it short, plain, friendly and professional. Make the request explicit. Remove legal ornament, lectures, slang and jokes.
2. Use a formal, complete record for service of papers, preservation or litigation holds, settlement communications under the forum's rule (C.R.E. 408 `[verify]` only where the forum in the preflight finding is a Colorado state court) and conferral that may be attached to a motion. State the action, relevant dates, attachments, requested response and other details needed to stand alone. Check the applicable requirements for each message.
3. Answer a documented false statement directly with the supporting facts. Choose confrontational wording deliberately and remove hostility.
4. Ask “Would I be fine with the judge reading this attached to a motion?” Rewrite if the answer is no or if the message reads like a brief. Show the exact version, recipient list and attachments for approval before any transmission.

## Pitfalls

- An ambiguous matter, requested remedy, or conflicting instruction requires clarification before the affected draft can proceed. Question an unsupported assumption with the specific risk, source and available options.
- A complex or novel procedure, appeal, criminal or significant financial exposure, substantial settlement, missed or imminent fatal deadline, or a task beyond the litigant's comfort warrants suggesting licensed counsel. Name the concrete concern and mention limited-scope or document review as available forms of help.

## Success

The build directory holds the substantive `body.md`, profiled `caption.json` or forum submission record, citation report and reconciliation, or identifies any output held and the evidence needed to complete it. The reconciliation records the verified court match for a profile used or the affected field for a profile refused. A production handoff has no unresolved verification flags, records the plain-language review, and leaves signature and service dates for the litigant. Every filing draft, including a held draft, is handed over under the Handoff label, kept out of the draft, and asks the litigant to report back after filing so the record can be updated.
