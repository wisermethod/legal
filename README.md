# Legal

A WISER plugin for a person or a company handling its own legal matters: practice-area experts, litigation procedure, and document preparation.

Use Legal to open or adopt a matter, organize evidence and deadlines, record discovery received, clean up the matter file, and prepare pleadings, information exchange, motions, negotiations or hearing materials. In arbitration and other non-court forums, the matter’s governing records set the rules for each step. Ask for a named output such as a chronology, claim chart, citation review or full case audit. Litigation Counsel sequences that work and brings in Consumer Law, Contract Disputes, Cease and Desist, Personal Injury or Employment Law for the issue at hand.

Court Filing composes and checks PDFs for Colorado district courts, supported civil papers in the United States District Court for the Southern District of New York, and eligible civil motion papers in New York State Supreme Court. Each profile lists its supported titles, signature and certificate blocks, docket fields, packets and length choices. The Colorado initial complaint leaves the case number blank and includes a certificate of service. The PDF gate independently compares the printed body to the original Markdown and measures the profile’s layout and filing blocks, including the title as presented by the selected caption layout. It reports the SHA-256 of the inspected PDF and how much table, list or heading text prints below double spacing for preview. For prescribed forms and unprofiled submissions, including a required Word document, Legal checks the exact artifact against the forum’s sourced requirements. Every filing requires citation clearance, a human preview, any required signature and explicit approval of the exact artifact. The [coverage record](system/GAPS.md) lists the checks that still need current authority.

The New York State Supreme Court profile covers counsel-filed, computer-prepared memoranda, replies and notices of motion for ordinary assigned civil cases submitted through NYSCEF. Memoranda above the tool’s bookmark threshold of 4,500 whole-paper words stay held on the profile route. The motion ceiling uses a separate body count. Use the court’s sourced requirements and independently check bookmarks on the unprofiled route. The profile prepares a separate final unsigned word-count and compliance page for filing counsel to verify and sign. Certification for self-represented filers still needs authority. Signing, filing and service each require their own confirmation. [New York profile requirements](tools/Court%20Filing/TOOL.md#select-the-new-york-supreme-court-profile)

A jurisdiction pack is a sourced rules set for a state's law or a court's or forum's procedure. Each statement has its source, verification state and date read. Colorado covers district court, county court and small claims procedure and four areas of Colorado law. The [New York pack](tools/Jurisdictions/packs/new-york/README.md) covers selected state contract, employment and consumer issues and New York State Supreme Court civil trial procedure. The court match selects procedural references. Governing law is declared by claim, including when New York state law governs a claim in federal court. New York personal injury, local law including New York City law, and federal employment law need separate sources. JAMS covers employment arbitration procedure, and the federal pack covers national district court civil procedure. Neither supplies governing law by claim or a default filing profile. Use the matter’s governing records first and its own pack before a shipped match. For an uncovered jurisdiction, paper or issue, use the official originals or other verified sources. Legal states no rule from the session's memory. Name the missing sources, hold the judgments and steps that need them, and continue independent work. The [Jurisdictions tool](tools/Jurisdictions/TOOL.md) describes how packs are checked and matched.

The plugin loads alongside Wiser. It uses Wiser's general skills, the CourtListener connector through Wiser's gateway for case-law lookup, `render pdf` for court PDFs and `word-document` for supported Word output. Connect CourtListener in Wiser if a lookup needs it. Court Filing runs with Node.js 18 or later and uses local Poppler utilities for PDF validation. The [tool index](tools/AGENTS.md) lists the installation and dependency details.

## Install

Install Wiser first, by its [Install steps](https://github.com/wisermethod/wiser#install): this plugin loads beside it. Then add this plugin in the same app:

- **Claude Cowork.** Open Customize, then Plugins, then Add marketplace. Give it `https://github.com/wisermethod/legal`, and install `legal`. Then turn on Sync automatically for this marketplace, as Wiser's steps do for theirs.
- **Claude Code.** Run `claude plugin marketplace add wisermethod/legal`, then `claude plugin install legal@wiser-method-legal`, and start Claude Code in your working folder.
- **Codex.** Add `wisermethod/legal` as a marketplace and install `legal`.
- **ChatGPT for desktop.** Add `wisermethod/legal` as a marketplace and install `legal`.
- **Grok.** Run `grok plugin marketplace add wisermethod/legal`, then `grok plugin install legal --trust`.
- **Cursor.** Add your clone of this repository as a workspace root beside your clone of Wiser and your working folder.

Work lands in the working folder you attach, never in this repository.

## Support

Email support@wisermemory.com.
