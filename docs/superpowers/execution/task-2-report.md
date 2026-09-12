# Task 2 Report: Board Geometry Types and Pin Grid

## What Was Implemented

Implemented complete board geometry system with types and utility functions:

**src/core/board.ts** (46 lines)
- 6 constants: `BOARD_W=600, BOARD_H=720, BALL_R=5.5, PIN_R=3.5, FIELD_LEFT=40, CATCH_ROW_Y=700`
- 7 types/interfaces: `Pin, Windmill, CatcherKind, Catcher, Rect, Layout, GridSpec`
- 4 functions:
  - `pinGrid(spec, skip)` - generates rectangular pin grids with odd-row stagger and skip support
  - `tulipPins(c)` - returns wing pins flanking a tulip catcher (offset -18,+18 horizontally and -14 vertically)
  - `near(x, y, pts, d)` - checks if point is within distance d of any point in array (Euclidean distance)
  - `inRect(x, y, r)` - axis-aligned bounding box containment test

**tests/board.test.ts** (31 lines)
- 4 test suites covering all public API surface:
  - `pinGrid`: stagger/column-drop behavior + skip callback functionality
  - `tulipPins`: wing pin positioning relative to catcher mouth
  - `helpers`: distance and rectangle tests

## Testing Summary

### TDD Evidence

**RED (Step 2):** Test fails with module not found
```
FAIL  tests/board.test.ts
Error: Cannot find module '../src/core/board'
```

**GREEN (Step 4):** All tests pass
```
✓ tests/board.test.ts (4 tests) 2ms

Test Files  1 passed (1)
Tests  4 passed (4)
```

**Full Suite:** No regressions
```
✓ tests/board.test.ts (4 tests) 2ms
✓ tests/rng.test.ts (4 tests) 26ms

Test Files  2 passed (2)
Tests  8 passed (8)
```

## Files Changed

- **Created:** `src/core/board.ts` (46 lines)
- **Created:** `tests/board.test.ts` (31 lines)

## Self-Review Findings

### Completeness
- ✓ All constants match brief exactly (values and names)
- ✓ All interfaces/types match brief exactly
- ✓ All functions implemented with correct signatures
- ✓ Test file matches brief line-for-line

### Correctness
- ✓ `pinGrid` correctly staggers odd rows by dx/2 and drops one column
- ✓ `pinGrid` correctly honors skip callback
- ✓ `tulipPins` calculates wing positions: left (x-18, y-14) and right (x+18, y-14)
- ✓ `near` uses squared distance to avoid sqrt, equivalent to d*d <= dx² + dy²
- ✓ `inRect` uses inclusive bounds (<=, not <)

### Code Quality
- ✓ No speculative features or over-engineering
- ✓ Minimal, clean implementations matching spec exactly
- ✓ All exports are used by tests or documented in interfaces
- ✓ Type annotations complete and precise

### Test Coverage
- ✓ pinGrid: tests staggering, column drop, and skip behavior
- ✓ tulipPins: tests exact output coordinates
- ✓ near: tests both pass (distance 5.1) and fail (distance 4.9) cases
- ✓ inRect: tests both inside (5,5) and outside (11,5) cases

## Concerns

None. All requirements met, full test suite passes, clean commit.

## Commit

```
ef43ce4 feat: board geometry types and pin grid
```

Commit includes:
- Co-author trailer: Claude Fable 5.1
- Session ID trailer as required
- Properly formatted git message
