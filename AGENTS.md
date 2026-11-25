---
root: legal
layout: 2
apps:
  - claude-cowork steps
  - claude-code steps
  - codex steps
  - chatgpt-desktop steps
  - grok steps
  - cursor steps
---

# Legal

A WISER domain plugin. This file is this root's constitution. The chain starts here: load it before the first read or write under this root.

A WISER plugin for a person or a company handling its own legal matters: practice-area experts, litigation procedure, and document preparation. Litigation Counsel owns the shared phase and procedure skills, five experts assess practice-area records and authorities, and Court Filing supplies caption composition and pre-filing PDF validation.

## What this root is

An authoring tree, not a working folder. Nothing here is anyone's work product; everything here is the capability that such work uses. Output belongs in the working folder a session attaches, never in this root.

**A case is not a directory here.** Where a matter files, and what its directory declares, is `wiser/standards/user-root.md` C3 and C4; read it there. What follows from it for this plugin is the whole of what this heading adds: this tree supplies the capability, the user root supplies the matter, and a case directory inside this tree would publish someone's file alongside the plugin.

This plugin carries no user-root `type:`, no Provides block, and no Onboarding keys.

## Composition

This plugin loads alongside `wiser` and may assume it is present. It references `wiser` primitives and standards rather than duplicating them, per `wiser/AGENTS.md` Precedence and routing. Copying a `wiser` primitive into this tree to remove the dependency is the defect; referencing one is the pattern. Nothing in `wiser` references this plugin.

## Write mode

In use this root is read-only. Nothing is written under this root during a session that uses it, and output lands in the working folder the session attached, in the directories that folder's own `AGENTS.md` declares. Authoring this root is separate work, entered by the operator's authorization for a named phase and a named target, per `wiser/AGENTS.md` Workspace Model. A Playbook, a ledger row or the operator's own instruction may record that authorization; none of them is the grant.

A session that has loaded this constitution and the base plugin's refuses ordinary writes to both.

What may be written here is governed by this heading and by `wiser/AGENTS.md` Writes, Irreversibles, Workspace Model, and Working under this root.

## Families

| Directory | Holds |
|-----------|-------|
| `skills/` | This plugin's skills |
| `experts/` | This plugin's experts |
| `tools/` | This plugin's tools |
| `connectors/` | This plugin's connectors |

Family placement follows `wiser/standards/primitives.md`. This plugin ships no `gateway/`; the base plugin alone ships one. Where this plugin ships `connectors/`, those connectors load through that gateway's repeated `--connectors` flag, per `wiser/gateway/SETUP.md`.

Each family directory carries its own `AGENTS.md` index. An empty index is still an index.

## Standing constraint

Whatever this plugin becomes, it does not give legal advice and does not hold itself out as a lawyer. That constraint is decided; it binds any later design and is not open for a build session to relax.

## Handoff label

Give this label in the handoff message to the person whenever work returns an assessment, packet or draft, including a held output and an expert-only assessment. Never write it inside a document: not in a saved assessment, chart, chronology, report or packet, not in a court artifact, and not in an outward message. Give it on every such return, whether the work entered through a skill or an expert and whether owner review ran.

> This is a working draft for your own review and decision. It is not legal advice, does not create an attorney-client relationship, and is not a substitute for a lawyer.

## Outward draft handoff

Save and show the exact draft, recipient or forum destination, and attachments. Hand it to the person for their action. Any later authorized transmission needs separate explicit approval of that version, destination and attachments. A signature or general prior approval does not cover an unseen draft. For a filing apply Produce Court Filing’s release checks and ask the person to report back after filing. Route confirmed filings, orders, service, correspondence and discovery received to the applicable operation in Maintain Matter File, keeping drafted and completed events distinct.

## Layout

This root's layout is governed by `wiser/standards/plugin-root.md`. That standard's C1 owns the `layout:` stamp: the current tree version, a bare nonnegative integer. `wiser/skills/Onboard Plugin Root/` writes it last, only once every applicable obligation other than the stamp itself scores present or N/A. A stamp written before that would advertise a conformance nothing had earned, which is why an unstamped tree reads as not current rather than as clean.
