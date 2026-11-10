# Working on this repo

## Every update to main is a release

Every change that goes to `main` ships as its own version. In the same pull
request, before it's opened:

1. Bump `version` in `.claude-plugin/plugin.json`: the minor number for a
   new feature, skill, or change in behavior (0.8.1 to 0.9.0), the patch
   number for fixes and docs (0.8.0 to 0.8.1).
2. Add that version's section at the top of `CHANGELOG.md`, dated the day
   the pull request is opened, `## 0.8.1 (2026-11-10)`, with a bullet for
   each change a user will notice (the rules in CONTRIBUTING.md,
   "Changelog").
3. Put the release notes in the pull request's description, written for
   someone who uses the plugin.

When the pull request merges, `.github/workflows/release.yml` tags
`v<version>` on that commit and publishes the GitHub release with that
`CHANGELOG.md` section as its notes. Check that the release appeared
(`list_releases`). A cloud session can't push a tag or create a release
itself (it can push only its own branch), which is why the workflow does it.

`python3 scripts/ci/release_notes.py` prints the release a merge would
publish; CI runs it on every pull request. If another version merges first,
rebase on `main` and renumber yours.
