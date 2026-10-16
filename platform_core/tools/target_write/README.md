# Target Write

Controlled writes into a **Target Project** or **Reference Project**: the human's own automation repository, which the platform does not own (Phase 9.4). This is the only supported way for a Skill to change files there.

```bash
node platform_core/tools/target_write/cli.js register-root --kind target|reference --path <dir> --approved-by "<name>" --reason "..."
node platform_core/tools/target_write/cli.js plan    --run <folder> --root TP-n --changes <changes.json> --environment <env>
node platform_core/tools/target_write/cli.js approve --run <folder> --plan TWP-n --approved-by "<name>" [--fingerprint <sha>]
node platform_core/tools/target_write/cli.js apply   --run <folder> --plan TWP-n
node platform_core/tools/target_write/cli.js recover --run <folder> --plan TWP-n --by "<name>" [--resolution keep-current|restore-approved]
node platform_core/tools/target_write/cli.js ledger  --run <folder>
```

`changes.json` is a list of `{"op": "create" | "update" | "delete", "path": "<relative to the root>", "source": "<file inside the run folder>"}`.

A plan is refused, and the refusal recorded, when:
- the root is not registered;
- a path is absolute, contains `..`, is inside `.git`, escapes through a symbolic link or junction, or is outside the run's `--scope-paths`;
- the root's `.baseline_ownership.json` gives the file to another module, declares it shared, or owns it nowhere and it already exists;
- Execution Safety is not Allowed. A new file is evaluated as CREATE on SelfCreated data; replacing or deleting an existing file is UPDATE or DELETE on Shared data, in the environment the plan names.

Apply re-checks everything. It writes only if the approval's fingerprint still matches the files and content on disk. Writing goes through `run_manager/fileMutation.js`, which writes a journal first, backs files up, and rolls back on failure. An interrupted apply blocks new applies until `recover` restores it.

Every step is recorded in `run.json` (`targetWritePlans[]`, `targetWriteLedger[]`) and in `metadata/TargetWriteLedger.md`. Logic: `run_manager/targetWrites.js`.

## Phase 9.5

- **Root registration.** Only a validated root can be registered. A target or reference root is the top of a git work tree. Drive and filesystem roots, system folders, the home folder and its broad folders (Desktop, Documents, Downloads, OneDrive, AppData), the temp folder and anything inside `.git` are refused (`UNSAFE_ROOT`). Kinds:
  - `target` and `reference` take Target Write Plans;
  - `platform-knowledge` receives Platform Knowledge promotions;
  - `report-output` receives generated reports.
- **`.git`.** Any case, trailing dots or spaces, a `:` stream, an 8.3 short name, or a junction or link into `.git` is refused, both by name and by canonical path.
- **Concurrency.** An apply holds a lock on the target project itself, across every run of the data root. The lock lives in `knowledge_base/.locks/`, never in the target. A second run's plan for the same file waits, then is refused as stale.
- **Recovery.** If any file is neither its approved "before" state nor what the interrupted apply wrote, recovery stops (`RECOVERY_CONFLICT`). Nothing is restored, and the other actor's version is kept as evidence. Then a named person chooses:
  - `keep-current` undoes only this apply's own writes;
  - `restore-approved` puts the approved state back.
- **Backups.** Backups and conflict evidence are copies of target-project files, so they live in `<data root>/.recovery/`, never in run data. An apply is refused if that folder is not git-ignored (`BACKUP_NOT_IGNORED`). The journal, with fingerprints only, stays with the run.
