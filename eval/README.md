# AI Tuner — Evaluation Harness

Automated quality scoring for the AI tuner's responses. Runs realistic driver scenarios through the exact same system prompt and tuning knowledge base used by the app, then uses a stronger Gemini model as a judge to score quality.

## Quick Start

```bash
# Set your API key
set GEMINI_API_KEY=your_key_here

# Run all scenarios (default: tuner=2.5-flash, judge=2.5-pro)
node eval/run.js

# Run with verbose output
node eval/run.js --verbose

# Test a specific model
node eval/run.js --model gemini-2.5-flash-lite

# Run specific scenarios only
node eval/run.js --scenario drift-snap-oversteer,consistency-no-flipflop
```

## Scoring Criteria (0-100)

| Criterion | Weight | What it measures |
|-----------|--------|-----------------|
| Correctness | 20 | Right root cause, appropriate parameters |
| Consistency | 20 | No flip-flopping, builds on previous suggestions |
| Magnitude | 20 | Small incremental changes, not wild swings |
| Reasoning | 20 | Explains WHY with mechanical logic + telemetry |
| Format/Behavior | 20 | JSON compliance, conciseness, game-awareness |

## Interpretation

| Score | Rating | Meaning |
|-------|--------|---------|
| 85-100 | ✅ Excellent | Reliable engineer-quality advice |
| 70-84 | ⚠️ Good | Mostly correct, minor gaps |
| 50-69 | ⚠️ Mediocre | Inconsistent, needs knowledge base work |
| 0-49 | ❌ Poor | Unreliable, major changes needed |

## Scenarios

Each scenario tests a specific capability:

1. **drift-snap-oversteer** — Correct drift diagnosis (diff decel / rear ARB)
2. **grip-entry-understeer** — Correct grip diagnosis (front ARB / toe)
3. **consistency-no-flipflop** — Doesn't reverse previous suggestions
4. **game-context-awareness** — Stays in FH6 game context
5. **skip-identification-steps** — Extracts info without re-asking
6. **rally-bottoming-out** — Correct suspension diagnosis
7. **adjustment-magnitude** — Appropriately sized changes

## Adding Scenarios

Edit `scenarios.js`. Each scenario needs:
- `id` — unique kebab-case identifier
- `name` — human-readable description
- `description` — what the test validates
- `expectedFixes` — keywords the AI SHOULD suggest
- `wrongFixes` — keywords the AI should NOT suggest
- `turns` — array of driver messages with optional context/telemetry

## Output

Results are saved to `eval/last_results.json` with full conversation logs and per-criterion scores.
