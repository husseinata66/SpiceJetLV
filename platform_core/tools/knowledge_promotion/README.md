# Platform Knowledge promotion

The controlled path from a project-layer Repair KB entry to reusable Platform Knowledge, in `platform_core/knowledge/patterns/repair_patterns/` (Phase 9.4; `pipeline.md` §10.5).

```bash
node platform_core/tools/knowledge_promotion/cli.js propose --run <folder> --entry REPAIR-NNN --by "<name>"
node platform_core/tools/knowledge_promotion/cli.js review  --proposal KP-n --decision approve|reject --by "<name>" --reason "..."
node platform_core/tools/knowledge_promotion/cli.js apply   --proposal KP-n --run <folder>
node platform_core/tools/knowledge_promotion/cli.js verify          # exit 2: an applied file changed, or an unapproved file exists
```

**Propose.** Only an entry that `state heal promote` wrote, from a repair validated as fixed, can be proposed. It must be byte-for-byte unchanged (its fingerprint is in `run.json`). Secret-shaped content refuses the proposal outright; it is never redacted into shared knowledge.

**Review.** Done by a named person, bound to the proposal's fingerprint.

**Apply.** Writes a new file with a provenance header and never overwrites an existing file.

**Ledger.** Kept in `<platform dir>/PROMOTION_LEDGER.json`. Use `--platform-dir` to work against a copy. Logic: `run_manager/knowledgePromotion.js`.

**Where knowledge may go (Phase 9.5).** `--platform-dir` must be the platform's own folder, or a root a named person registered as `platform-knowledge` (`target_write/cli.js register-root --kind platform-knowledge`). Any other folder is refused (`NOT_PERMITTED_ROOT`). `review` also takes `--runs-dir`.

**Private keys (Phase 9.5).** PEM, OpenSSH, encrypted and PGP key blocks, cut-off key headers and PuTTY key files refuse a proposal. Only the kind and count are reported.
