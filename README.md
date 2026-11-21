# Legal

A WISER plugin for a person or a company handling its own legal matters: practice-area experts, litigation procedure, and document preparation.

Use Legal to open or adopt a matter, organize evidence and deadlines, and prepare pleadings, discovery, motions, negotiations or trial materials. Ask for a named output such as a chronology, claim chart, citation review or full case audit. Litigation Counsel sequences that work and brings in Consumer Law, Contract Disputes, Cease and Desist, Personal Injury or Employment Law for the issue at hand.

Court Filing composes and checks PDFs for the shipped Colorado district court profile. For the Colorado district new-case complaint packet it leaves the case number blank for the court and checks the required certificate of service. The PDF check binds the exact composed body, measures the applicable length limit against the rendered artifact, and records the reason when no limit applies. Your review, signature and approval govern the release of every filing. The [coverage record](system/GAPS.md) lists the substantive gaps, unsupported forums and checks that still need current authority.

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
