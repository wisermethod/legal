# Forum questions

Each question fills one field of the declaration under `## Forum and posture` in the matter's `AGENTS.md`: question 1 fills `Court or forum`, 2 `Forum type`, 3 `Governing law` (by claim), 4 `Rules home` and 5 `Filing profile`.

**Rules every question follows:**

- "Not sure" or "not yet" is always an answer. Use the recording values below, continue record setup, and hold only the work that needs that field.
- The session never chooses the court or the law for the person. Where a contract names a law or a forum, the session records what the clause says, quoted with where it was found, and leaves the reading of it to the person. This is the constitution's [Standing constraint](../../AGENTS.md#standing-constraint).
- Each answer is recorded with its source (the person, or a named document) and the date.

Set the summary `Governing law` to `see Governing law by claim` when any claim row is recorded and to `pending` when there are no rows. In each row, set `Law named` to the law as written or to `not stated` when the source names none.

## The five questions

**1. Where is it decided** (declaration field: court or forum)

> Where is this dispute being decided, or where do you plan to bring it? Give the court's full name, with the state and the county or federal district, or the name of the arbitration organization or other body handling it. If it already has a case or reference number, include that too.

*Record the court's or forum's name and any case or reference number in `Court or forum`. For “not sure” or “not yet,” record `pending`.*

**2. What kind of forum** (field: forum type)

> Is that a court, an arbitration, a government agency, or something else?
>
> Court · Arbitration · Government agency · Something else · Not sure

*Asked only when the first answer leaves it open. "District Court, Denver County, Colorado" answers it. "JAMS" answers it as arbitration. Record Court as `court`, Arbitration as `arbitration`, Government agency as `government agency`, Something else as `other`, and Not sure as `pending` in `Forum type`.*

**3. Which law decides the claims** (field: governing law, claim by claim)

> Which state's or country's law decides your claims? If you have a written agreement, look for a clause that says which law "governs" it, and tell me what it says. If there is more than one agreement, or more than one claim, tell me each one and the law it names. If nothing says, or you're not sure, say that.

*Recorded one line per claim or agreement, as "<claim or agreement>: <law named>, from <clause and document>", or "not stated". A law named with an exception, such as "Florida, except where Colorado law requires", is recorded as written.*

**4. Where the rules are** (field: rules home)

> Do you have the rules this court or forum uses for your case, such as its local rules, the judge's standing orders or practice standards, or the arbitration organization's rules? Tell me where they are in your files, or say you don't have them yet.

*Recorded as a path in the matter, or "not yet obtained". Until the plugin ships a rules set for that forum, nothing is filled from the plugin.*

**5. Which paper format** (field: filing profile). This confirms; it does not ask the person to choose.

When the plugin ships a format for the court named in question 1:

> Papers for this court will be laid out in the plugin's <display name> format. Is that the court you named?
>
> Yes · No, it's a different court

When it does not:

> The plugin has no paper format for this court, so each paper will follow that court's own rules, which you'll need to have on hand. Is that what you expected?
>
> Yes · I thought it had one

*Use the shipped-format branch when a shipped profile covers the named court under [Court Filing's court check](../../tools/Court%20Filing/TOOL.md#profile-schema), comparing the court name without its case number. On that branch, Yes records the profile id, such as `colorado-district`. “No, it's a different court” returns to question 1 and records `pending` until the court is settled. When no format ships, both Yes and “I thought it had one” record `none: papers follow the court's own rules`. When the court or format is unresolved, record `pending`.*

*For a non-court forum, question 5 is not asked. The field records "not a court: submissions follow the forum's own rules".*
