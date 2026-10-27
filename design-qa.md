# Health archive and timeline design QA

- Source visual truth: `../.one-gate-ics-health-validation-20261027/health-reference-option-1.png` (displayed option 1).
- User adjustment: retain the archive layout and add a visit-date timeline, grouped by month.
- Source pixels: 1487 × 1058; implementation desktop pixels and CSS viewport: 1487 × 1058, 1× density. No density scaling used for the source or browser capture. Mobile: 320 × 900; tablet: 768 × 1024, both 1× density.
- Target route: `/#/personal/health` in the existing One Gate app.
- State: synthetic medical records only, Chinese dark theme; compare the matching data state. Existing shell, five supported categories and seven reference body areas remain the product constraints.
- Assets: existing One Gate shell/logo and MUI icon components. No raster illustration is required by the selected content region.
- Round 1 implementation capture: `../.one-gate-ics-health-validation-20261027/health-desktop-round1-hotfix.png` (1487 × 1058, 1× CSS density).
- Round 1 full-view combined input: `../.one-gate-ics-health-validation-20261027/health-comparison-round1.png`, source left, implementation right. The synthetic DB hotfix title and simplified fixture navigation intentionally differ; only page-owned layout was evaluated.
- Final clean-state implementation: `../.one-gate-ics-health-validation-20261027/health-deliverable.png`, same desktop viewport, dark theme, three synthetic exam/outpatient/vaccination records, no test hotfix. Final capture asserts zero dialogs and zero account menus. The earlier `health-desktop-final.png` is retained as the pre-layer-fix main-view evidence.
- Final full-view combined input: `../.one-gate-ics-health-validation-20261027/health-comparison-final.png` (2974 × 1058, source left / implementation right).
- Final focused combined input: `../.one-gate-ics-health-validation-20261027/health-comparison-focus-final.png` (1920 × 540). It compares the main search, category, columns and dated records at native pixel density. Source crop (500,270)–(1460,810); implementation crop (490,250)–(1450,790); the small origin difference aligns each card's own top edge without resizing either image.
- Round 1 findings:
  - [P2] The Stepper connector only appears as a short segment between tall rows, leaving the date points visually disconnected. Use the library timeline's continuous separator/connector across adjacent records while retaining the archive columns.
  - [P2] Two search icons are visible; the submit icon appears after the add button, unlike the reference's integrated search. Keep a single accessible submit control inside the field and retain Enter submission.
  - [P2] Primary record text is visibly smaller than the reference. Increase title/date/institution and column headings to 16px in the health component; retain the existing global shell and 36px page heading.
- Interaction finding: [P2] A previous save-success notice survived into a later unknown write. Fixed by clearing the previous success when starting add/edit/delete. Rechecked through actual UI: save succeeds, a new form opens and closes, and the old success count is 0.

## Final comparison and required surfaces

- Fonts/typography: the reference uses a sans-serif hierarchy. Existing MUI stack remains `Roboto, Helvetica, Arial, sans-serif`, with the operating system's CJK fallback. Browser-computed heading is 36px/700; record title is 16px/600. Main dates/institutions/headings are now 16px. Focused comparison shows readable alignment and no clipped record text. Small month labels and supporting doctor text remain secondary.
- Spacing/layout rhythm: preserves the left reference card and right archive card, 210px reference track, responsive gap and semantic borders. Desktop columns line up after the revision; month grouping and a connected date axis are the user's requested addition. The main card is shorter than the generated reference because unsupported extra body areas are absent. Mobile stacks records and collapses reference navigation; tablet retains that readable structure. Measured document scroll widths equal 320 and 768 respectively, with no page overflow hiding controls.
- Colors/tokens: uses existing MUI background, divider, action and primary colors. The blue date points/primary action match the target's emphasis. Intentional flat semantic surfaces replace the generated reference's atmospheric shading, preserving both existing themes. Light and dark browser captures have legible text, input boundaries and focus states.
- Images/assets/icons: there is no missing app-owned raster image in this UI. The existing shell/logo is retained. Body references, search, add and actions use installed MUI icons; the timeline uses MUI Lab components. No handcrafted anatomy illustration, SVG substitute or decorative CSS art was introduced. The generated reference's unsupported body categories and colored category pictograms were not copied into fictitious model capabilities.
- Copy/content: clean-state Chinese labels render without keys; five real categories include hospitalization. Body reference explicitly says records are not linked to body parts, and contains no invented vital signs or medical conclusions. Records are visibly synthetic. Both locale files have the same 61 keys; 46 literal/dynamic keys were checked with zero missing keys. DB hotfix loaded before the lazy remote remains visible; later DB overrides remain supported by merge order.

## Browser interaction evidence

Chrome was used through CUA, with actual built admin and personal applications and local-only memory fixtures. No Playwright CLI, production credentials, medical data or database was used. Fixture unit assertions validate the fixture itself and are not counted as application UI acceptance.

- Search by doctor, category-plus-search empty state and clearing filters passed.
- Details and HTTP(S) report link passed; link rel is noopener/noreferrer. Unsafe scheme input was rejected before a write.
- Editing a title preserved the exact original visit timestamp; native date entry created a visible October 21 record. The date fill automation did not dispatch React's date change, so the browser's native segmented control was used and persisted successfully.
- Explicit save success plus subsequent list failure retained separate success/error messages. One committed-but-lost response kept the form in unknown state with save disabled; no automatic retry occurred. HTTP200 business rejection displayed one local alert.
- A 5000ms old search followed by a new search left only the newest result after the old delay expired.
- 23 synthetic records rendered 1–10, 11–20 and 21–23; after total shrank to 3, refresh returned to 1–3 automatically.
- Delete confirmation names the selected record and states irreversible behavior; cancellation issued zero delete requests. No actual user data was deleted.
- Read-only account had no add action and its record menu only offered View. Logging out and signing in as another synthetic user displayed zero records from the previous account.
- 320px keyboard operation selected an off-screen category and opened the add form; autofocus landed on `health-form-title`, with no horizontal overflow. Body reference opened neutral content, not mock medical metrics.
- Captures: `health-mobile-dark.png`, `health-mobile-light.png`, `health-mobile-form.png`, `health-tablet-light.png`, `health-save-refresh-failure.png`, `health-write-unknown.png` in the private validation directory.
- Console check: only the existing host/remote React Router parent-path warning was observed in the final warning/error inspection; no new health runtime error was observed. The older local fixture's missing language endpoint was a mock gap; it is not treated as a production defect.

## Comparison history and remaining gaps

1. Round 1 combined comparison found the disconnected timeline, duplicate search control and small primary type; result remained blocked.
2. Revised capture and full/focused combined inputs confirm MUI Timeline continuously connects adjacent records within each month, one integrated search control remains, and primary record type is 16px. The additional stale-success finding was fixed and rechecked. No actionable P0/P1/P2 remains in the redesigned health screen.
3. Final handoff capture found a [P2] body-reference Drawer layering defect: the global AppBar sits above the default Drawer, hiding its title/close target; a native click reached the account avatar instead. Fix requested: use the theme modal z-index for this Drawer only, then recheck desktop and mobile open/close. Result remains blocked until that browser verification.
4. Drawer root now uses `theme.zIndex.modal`. Browser captures `health-drawer-desktop-fixed.png` and `health-drawer-mobile-fixed.png` show the title and close button above the dimmed topbar. Real pointer close was rechecked at 1487px and 320px after the standard slide transition settled: dialog count 0 and account-menu count 0 in both. The early mobile automation click happened before the slide was visible and was not counted as a passing close; the stable-state recheck passed. No remaining P0/P1/P2 was found.

Expected differences: existing shell and fixture menu/auth identity, supported categories/body references, synthetic record wording, semantic flat surfaces and requested month groups. These are explicit product constraints, not unresolved visual defects.

P3/follow-up: category pills use neutral semantic outlines rather than the generated reference's colored illustration badges; the existing global route warning is outside this page change. Do not continue a polish loop for these.

English live interaction remains unexecuted. Automatic approval rejected both stopping the old local preview and starting the proposed replacement (reason only `blocked by policy`); neither action was retried or circumvented. Existing 5198 health preview and required source/implementation comparison are available. The corrected mock and 5199 builds are prepared but not running. This extra language check does not replace or invalidate the completed Chinese visual comparison. Production release and real medical-data acceptance were not performed.

## Implementation checklist

- Required visual fixes applied and recaptured.
- All five fidelity surfaces evaluated using full and focused combined inputs.
- Desktop, mobile dark/light, tablet, focus and core states checked.
- Actual implementation and isolated preview retained for the user.
- Production release remains a separate step; private calendar subscription enablement remains governed by its own runbook.

final result: passed
