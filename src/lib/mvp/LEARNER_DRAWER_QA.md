# Learner evidence drawer keyboard and responsive check

Checked November 17, 2026 on MVP-Approved-Calculation-Policies.

## Scope

Browser check of the actual LearnerEvidenceDrawer component and application CSS,
mounted in an isolated local fixture with fictional learners and three selected
learners. No private records, authentication changes, or live database writes.
This does not replace the pending signed-in walkthrough of the connected page.

## Reproduction and observed results

- Focus the opener and press Enter: the native modal opens, Close receives focus,
  and background scrolling is locked.
- Press Tab from Close: disabled Previous is skipped and Next receives focus.
- Press Tab from the last enabled control: focus wraps to Close.
- Press Shift+Tab from Close: focus wraps to the last enabled control.
- Activate Next with Enter: the learner identity and position update. At the final
  learner, Next is disabled and focus moves to Close rather than remaining on a
  disabled control.
- Press Escape: the drawer closes, focus returns to the opener, and body overflow
  is restored. Reopen and activate Close with Enter: the same restoration occurs.
- Test 320x568, 390x844, 768x1024, and 568x320 viewports with long unbroken names,
  emails, and course titles plus twenty attendance records: drawer scroll width
  equals client width (319, 389, 671, and 567 pixels respectively). Close remains
  inside the viewport; content scrolls vertically.

The keyboard check exposed Tab leaving the drawer after its last control.
Explicit wrapping now keeps keyboard navigation within the modal. Existing
uncommitted wrapping and header sizing changes were preserved.

## Remaining integration checks

Repeat on the signed-in Learners page with real authorized responses, including
retry controls, selection/scope resets, and a removed opener after a directory
refresh. Screen-reader speech and mobile device/browser-specific behavior were
not tested by this isolated browser check.
