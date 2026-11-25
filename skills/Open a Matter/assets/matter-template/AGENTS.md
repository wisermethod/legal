# [Matter name]

## Completion condition

[State whether a final judgment, award, settlement, dismissal or another owner-agreed event completes this matter. Name the record that verifies it. If undecided, record Awaiting owner and name the decision.]

This folder is the matter project. Read the owning user root's instructions first.

## Where the Legal plugin is

Every procedure this file names (Litigation Counsel, Maintain Matter File, the Jurisdictions tool and the rest) comes from the Legal plugin. Use it on every matter request. Locate it before following the session entry order below; that order still decides what is read and done first.

1. **Find it.** Where this app lists the Legal plugin's skills among its own, use those. Otherwise read it from disk: it is the folder whose `AGENTS.md` front matter reads `root: legal`, among the folders this session has open or where this app keeps its plugins. [When this section was written on YYYY-MM-DD, the plugin was read at `<absolute path to the Legal plugin folder>`. Look there first; another machine may keep it elsewhere.] Start at its `AGENTS.md` and follow the chain to `experts/AGENTS.md`, `skills/AGENTS.md` and `tools/AGENTS.md`. The entry points a matter uses most are `experts/Litigation Counsel/EXPERT.md`, `skills/Maintain Matter File/SKILL.md` and `tools/Jurisdictions/`.
2. **Do not rely on Wiser's lookup for it.** Wiser's `find_skill` and `load_skill` may not serve the Legal plugin. A lookup that returns no Legal skill or expert says nothing about whether one exists: read the plugin as step 1 says. A base Wiser skill it returns does not replace a Legal procedure.
3. **Stop if it is missing.** If the Legal plugin is neither listed nor readable on disk, say so before any substantive work, name what could not be loaded, and wait for the owner. Do not do matter work from general knowledge in its place.
4. **Read-only.** The Legal plugin's folder is read in use, never edited from a matter session. A fault found in it is reported to the owner.

## Binding matter rules and session entry

Follow this order on every matter request, including on resume:

1. Read the standing do-nots. [Name the governing instruction files, what they bind and, where they conflict with each other, which one wins, or state that there are no additional matter-specific do-nots.] Where a standing do-not conflicts with another instruction in this folder, the do-not governs the matter's operations; it never displaces step 2's preflight and never relaxes the legal plugin's Standing constraint, Handoff label or release checks.
2. Enter Litigation Counsel's preflight. It runs Maintain Matter File’s **Deadline review** on the designated deadline record and applicable dated primary evidence, resolves the forum declared below through the Jurisdictions tool, and filters working response periods to that forum. Give its startup alert before answering the request, with any evidence limits that affect the alert.
3. Read the authoritative history and current handoff for posture. [Name the actual paths and which files summarize the record.] Use the operative orders, rules and authentic notices to resolve procedural facts.
4. Load the remaining intake, ownership, source or task references as needed. [Name each binding reference and its role. State the designated glossary path or that no glossary is designated.]

## Forum and posture

| Field | Value | Source and date |
|---|---|---|
| Court or forum | pending | [Source, YYYY-MM-DD] |
| Forum type | pending | [Source, YYYY-MM-DD] |
| Governing law | pending | [Source, YYYY-MM-DD] |
| Rules home | not yet obtained | [Source, YYYY-MM-DD] |
| Filing profile | pending | [Source, YYYY-MM-DD] |

For **Court or forum**, write the court's name in the form its own captions print it, such as `District Court, Larimer County, Colorado`. For a court a Court Filing profile covers, use the form that profile's `court_match` accepts, with no added `State of` and no reordering, because Court Filing checks the profile against that exact name. Where the person or the parties record words the same court another way, quote that wording in `Source and date`. For another forum, use the forum's name. Include any case or reference number. Use `court`, `arbitration`, `government agency`, `other` or `pending` for **Forum type**. Set **Governing law** to `see Governing law by claim` when the answers are recorded below, or to `pending` while the answer is unresolved. For **Rules home**, use a path inside the matter or `not yet obtained`. For **Filing profile**, use the confirmed Court Filing profile id or the verified absolute JSON path for a profile marked `explicit-path`, `none: papers follow the court's own rules` for a court without a profile, `not a court: submissions follow the forum's own rules` for a non-court forum, or `pending` if unresolved.

### Governing law by claim

| Claim or agreement | Law named | Clause and document | Source and date |
|---|---|---|---|
| [Claim or agreement] | [Law named, or not stated] | [Clause and document] | [Source, YYYY-MM-DD] |

Use one row per claim or agreement. Record `not stated` when the source names no law. Record a law with any exception as written.

**Posture** [Proceeding type, posture and the primary record that shows them.]

A `pending` value holds only the work that needs that field.

## Authoritative paths

[Name the actual history, deadline, filing, order, evidence and correspondence records and indexes. When two paths exist, identify the governing copy and the purpose of the other. Name the build and handoff homes and any rule giving one file ownership of dated facts.]

## Matter record

| File or directory | Holds |
|---|---|
| `AGENTS.md` | Matter declaration and entry instructions |
| `HISTORY.md` | Current posture, timeline, status changes and open questions |
| `DEADLINES.md` | Obligations, owners, date types, triggers, evidence and states |
| `PARTIES.md` | Parties, service contacts, representation and confirmed forum details |
| `CLAIMS.md` | Claims, defenses, elements, evidence links and damages |
| `ARGUMENTS.md` | Current and abandoned positions, attacks, rebuttals and development needs |
| `DISCOVERY-REQUESTS.md` | Proposed requests, priority, rationale and service status |
| `case-law.md` | Favorable, adverse and procedural precedents and research gaps |
| `statutes.md` | Statutes, regulations, local rules and research gaps |
| `filings/` and `filings/filings-index.md` | Filed copies and dedicated build work, indexed with actual filing evidence |
| `orders/` and `orders/orders-index.md` | Orders, rulings and resulting obligations |
| `evidence/` | Exhibits and supporting records located by file or exhibit reference |
| `correspondence/` and `correspondence/correspondence-index.md` | Court, opposing-party and other matter communications |
| `discovery/` and `discovery/discovery-index.md` | Discovery and disclosures received from other parties, as served, indexed with service evidence |

Replace defaults with the paths this matter actually uses. Give every retained matter-level file a row with its role, including local rules, handoffs, archives or retained legacy copies. Link indexed directories to their authoritative index. Account for each retained file in an individual row here or in the index that owns it.

Point to every open owner-decision list kept in a hidden build folder from the visible filings index or the history's current handoff.

Keep original records intact and link to them. Record an unknown or disputed fact with its status and source. Apply Maintain Matter File to confirmed filings, orders, correspondence and new deadlines.
