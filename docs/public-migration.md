# Public repository boundary

One Gate uses `main` as its development branch. Its public history begins with
the selected scaffolding snapshot ("feat: 脚手架搭建", August 30, 2025) and
retains the later development sequence. Private keys, obsolete internal integration material and
deployment-specific values were removed or replaced throughout retained history.
Historical snapshots are archival records, not supported deployment versions.

The retained history contains 1,181 original commit nodes before the public
preparation commit. Of the 121 original merges, one referenced a parent older
than the selected boundary. Removing that parent leaves 120 multi-parent
commits. All parent relationships within the retained range are preserved.
Commit IDs changed. Original Git objects,
branches, tags, pull-request refs, commit mappings and raw scan reports are not
part of the public repository. Maintainers retain a separate private recovery
archive.

Clone this repository freshly. Do not merge or push the original repository's
history, tags or mirror into it. Runtime secrets and data belong outside Git.
The secret scanner retains its default rules; its narrow exceptions match exact
synthetic test values or translation identifiers at reviewed paths.

Public CI is isolated from production deployment and uses hosted runners and
test-only settings. Publishing this repository does not migrate or redeploy
existing cloud services. Code checks and public repository checks do not imply
acceptance of any production deployment.
