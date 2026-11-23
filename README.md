# Legal

A WISER plugin for a person or a company handling its own legal matters: practice-area experts, litigation procedure, and document preparation.

Use Legal to open or adopt a matter, organize evidence and deadlines, clean up the matter file, and prepare pleadings, information exchange, motions, negotiations or hearing materials. In arbitration and other non-court forums, the matter’s governing records set the rules for each step. Ask for a named output such as a chronology, claim chart, citation review or full case audit. Litigation Counsel sequences that work and brings in Consumer Law, Contract Disputes, Cease and Desist, Personal Injury or Employment Law for the issue at hand.

Court Filing composes and checks PDFs for the Colorado district court profile. The profile lists the supported titles, signature and certificate blocks, docket fields, packets and length choices. The initial complaint leaves the case number blank and includes a certificate of service. The PDF gate independently compares the printed body to the original Markdown and measures the profile’s layout and filing blocks, including the title in capitals inside the caption box. It reports the SHA-256 of the inspected PDF and how much table, list or heading text prints below double spacing for preview. For prescribed forms and unprofiled submissions, including a required Word document, Legal checks the exact artifact against the forum’s sourced requirements. Every filing requires citation clearance, a human preview, any required signature and explicit approval of the exact artifact. The [coverage record](system/GAPS.md) lists the checks that still need current authority.

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
