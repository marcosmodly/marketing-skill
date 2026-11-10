# Working on this repo

## Releases: for notable updates, not every change

A notable update (a new feature or skill, or a change in behavior a user
will notice) ships as a release. A small one (a fix, docs, a tweak, a repo
or CI change) gets no release post: it goes to `main` and waits for the
next release. If it's unclear which an update is, ask.

**A small update:** leave the version alone. If a user would notice it, add
a bullet under `## Unreleased` at the top of `CHANGELOG.md` (add that
heading if it isn't there).

**A notable update**, in the same pull request, before it's opened:

1. Bump `version` in `.claude-plugin/plugin.json` by its minor number
   (0.8.0 to 0.9.0).
2. Turn `## Unreleased` into that version's section, dated the day the pull
   request is opened, `## 0.9.0 (2026-11-10)`, keeping the small updates
   waiting there, and add a bullet for each change a user will notice (the
   rules in CONTRIBUTING.md, "Changelog").
3. Put the release notes in the pull request's description, written for
   someone who uses the plugin.

When it merges, `.github/workflows/release.yml` tags `v<version>` on that
commit and publishes the GitHub release with that `CHANGELOG.md` section as
its notes; a merge that doesn't change the version publishes nothing. Check
that the release appeared (`list_releases`). A cloud session can't push a
tag or create a release itself (it can push only its own branch), which is
why the workflow does it.

`python3 scripts/ci/release_notes.py` prints the release a merge would
publish; CI runs it on every pull request. If another release merges first,
rebase on `main` and renumber yours.
