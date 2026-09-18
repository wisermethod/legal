---
root: legal
---

# Legal

A WISER plugin for legal work: research, matters, and the expert bench that work requires.

This root is a placeholder. It was reserved 2026-08-26 as Pro Se Lawyer and renamed 2026-09-14. It is unscoped, and the plugin has not been designed.

## Do not author here yet

Do not add skills, experts, tools, connectors, or standards to this root on your own initiative. The plugin's scope, its boundaries, and what it refuses to do are decisions that have not been made, and a legal-domain plugin built ahead of those decisions is worse than an empty one.

A build starts when the operator authorizes it, recorded as a row in `WISER Plugins/zBuilds/builds.md` naming this root and the adopt. A Playbook is not required: a stand-up is single-session work, which `wiser/standards/playbook.md` places outside the Playbook's purpose. When that row exists, this file is replaced by the constitution the adopt produces.

## Standing constraint

Whatever this plugin becomes, it does not give legal advice and does not hold itself out as a lawyer. That constraint is decided; it binds any later design and is not open for a build session to relax.

This plugin loads alongside `wiser` and may assume it is present. It references `wiser` primitives rather than duplicating them. Copying a `wiser` writing, playbook, or connecting primitive into this tree to remove the dependency is a defect.
