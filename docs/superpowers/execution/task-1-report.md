# Task 1 Report: Scaffold and seeded RNG

## What Was Implemented

Created complete project scaffold with TypeScript/Vitest setup and seeded pseudo-random number generator (Mulberry32):

### Files Created:
1. **package.json** - Project metadata, scripts, and dev dependencies (TypeScript 5.6, Vite 6, Vitest 3, tsx 4.19)
2. **tsconfig.json** - Strict TypeScript configuration with ES2022 target, ESNext modules, bundler resolution
3. **vitest.config.ts** - Test runner configuration pointing to tests/**/*.test.ts with node environment
4. **src/core/rng.ts** - RNG implementation with Mulberry32 algorithm and three methods:
   - `next()` - Returns random float in [0,1)
   - `int(n)` - Returns random integer in [0,n)
   - `range(a,b)` - Returns random number in [a,b)
5. **tests/rng.test.ts** - Comprehensive test suite with 4 tests:
   - Determinism: same seed produces same sequence
   - Differentiation: different seeds produce different values
   - Bounds: next() in [0,1), int(n) in [0,n)
   - Range: range(a,b) stays within [a,b)

### Dependencies Installed:
- typescript ^5.6.0
- vite ^6.0.0
- vitest ^3.0.0
- tsx ^4.19.0

## What Was Tested and Results

### RED (Failing) Test
```
npx vitest run tests/rng.test.ts
```
Output: FAIL - Cannot find module '../src/core/rng'
- Test collection failed at import stage (expected, module didn't exist yet)

### GREEN (Passing) Test
```
npx vitest run tests/rng.test.ts
```
Output:
```
RUN  v3.2.7

 ✓ tests/rng.test.ts (4 tests) 24ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

All 4 tests passing:
- ✓ is deterministic for a seed
- ✓ differs across seeds
- ✓ next() is in [0,1) and int(n) is in [0,n)
- ✓ range(a,b) is within bounds

## TDD Evidence

### RED Phase
Command: `npx vitest run tests/rng.test.ts`
Error output showed module not found at ../src/core/rng (correct failure point)

### GREEN Phase
Command: `npx vitest run tests/rng.test.ts`
Result: All 4 tests passed, 1 test file passed, 0 failures

## Files Changed

Total 6 files committed (2250 insertions):
- package.json (22 lines)
- package-lock.json (2168 lines)
- tsconfig.json (14 lines)
- vitest.config.ts (4 lines)
- src/core/rng.ts (17 lines)
- tests/rng.test.ts (25 lines)

Commit: `61a168e - feat: scaffold project and seeded rng`

## Self-Review Findings

✓ All files match brief specifications exactly:
  - package.json content identical to brief (including all 4 scripts, exact versions)
  - tsconfig.json content matches verbatim
  - vitest.config.ts config matches verbatim
  - RNG implementation matches algorithm specification
  - Test file matches exact test cases and assertions

✓ Interface exports correct:
  - `Rng` interface with all three methods and correct return types
  - `mulberry32(seed: number): Rng` function signature correct

✓ TDD workflow followed:
  - Created failing test first
  - Test failed at correct point (module not found)
  - Implemented to make all tests pass
  - All 4 tests now passing

✓ Commit housekeeping:
  - node_modules excluded (already in .gitignore)
  - package-lock.json included as required
  - Commit message format correct with trailers
  - All specified files staged

✓ Code quality:
  - No TypeScript errors
  - No warnings in test output
  - Bitwise operations (>>>, Math.imul) correct for RNG algorithm
  - Bounds checking validated by test loop (1000 iterations on next/int, 100 on range)

## Concerns

None. Implementation is complete, all tests pass, TDD workflow followed exactly, commit includes all required files with correct trailers.
