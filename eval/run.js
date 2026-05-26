/**
 * AI Tuner — LLM Quality Evaluator
 * 
 * Runs predefined scenarios through the tuner's exact system prompt + knowledge base,
 * then uses a stronger model as judge to score response quality.
 * 
 * Usage:
 *   node eval/run.js [--api-key YOUR_KEY] [--model gemini-2.5-flash] [--judge gemini-2.5-pro]
 * 
 * Outputs a scorecard per scenario + overall quality score (0-100).
 */

const { GoogleGenAI } = require('@google/genai');
const path = require('path');

// Load the app's actual system prompt and tuning knowledge
const { TUNING_KNOWLEDGE } = require(path.join(__dirname, '..', 'electron', 'tuning_knowledge.js'));
const { SCENARIOS } = require(path.join(__dirname, 'scenarios.js'));

// ─── CLI Args ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    apiKey: process.env.GEMINI_API_KEY || null,
    model: 'gemini-2.5-flash',
    judge: 'gemini-2.5-pro',
    scenarios: null, // null = run all
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) opts.apiKey = args[++i];
    else if (args[i] === '--model' && args[i + 1]) opts.model = args[++i];
    else if (args[i] === '--judge' && args[i + 1]) opts.judge = args[++i];
    else if (args[i] === '--scenario' && args[i + 1]) opts.scenarios = args[++i].split(',');
    else if (args[i] === '--verbose' || args[i] === '-v') opts.verbose = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
AI Tuner Evaluation Harness

Usage: node eval/run.js [options]

Options:
  --api-key KEY     Gemini API key (or set GEMINI_API_KEY env var)
  --model MODEL     Model to evaluate (default: gemini-2.5-flash)
  --judge MODEL     Model to use as judge (default: gemini-2.5-pro)
  --scenario IDs    Comma-separated scenario IDs to run (default: all)
  --verbose, -v     Show full AI responses
  --help, -h        Show this help
      `);
      process.exit(0);
    }
  }

  if (!opts.apiKey) {
    console.error('Error: No API key. Use --api-key or set GEMINI_API_KEY env var.');
    process.exit(1);
  }

  return opts;
}

// ─── System Prompt (same as the app) ────────────────────────────────────────

function getSystemPrompt() {
  // Read the actual system prompt from main.js dynamically would be fragile.
  // Instead, replicate the critical parts that affect tuning quality.
  return `You are an elite AI race engineer for **Forza Horizon 6** (a video game). You help players optimize their in-game car tuning setups using live telemetry data and subjective driver feedback. This is NOT real life — you are working with the game's physics engine and tuning sliders.

## Important Context
- You are inside Forza Horizon 6 (FH6), an open-world racing game by Turn 10/Playground Games.
- Tuning in FH6 is done via the garage menu with sliders and numeric inputs.
- "Parts" (upgrades) and "Tuning" (settings) are SEPARATE things in FH6:
  - **Parts/Upgrades**: Purchased from the upgrade shop (engine swaps, turbos, intercoolers, weight reduction, tire compounds, roll cage, etc.). These define the car's potential.
  - **Tuning**: Adjusting settings on INSTALLED parts (tire pressure, camber, spring rate, damping, ARBs, gearing, diff, aero, brakes). This is what you primarily help with.
- You should be aware that parts affect tuning but do NOT interrogate about every single part — only ask when directly relevant.
- FH6 uses metric units: Bar (tire pressure), degrees (camber/toe), kgf·mm or N/mm (springs), percentage (diff lock, brake balance).

## Your Workflow States
You are given a "current_state" in every message. In READY state:
- If car_memory.car_name is null/empty, extract car info from the user's message or ask ONE short question.
- Do NOT proactively comment on telemetry or offer unsolicited observations
- ALWAYS wait for the driver to describe their issue or ask for help first
- When the driver reports a problem, ask clarifying questions about what they FEEL before looking at data
- Only reference telemetry to CONFIRM or diagnose what the driver described

## Response Format
You MUST reply as JSON:
{
  "reply": "Your conversational message to the driver",
  "pending_changes": [
    { "id": "unique-id", "action": "Specific adjustment description" }
  ],
  "tune_updates": { "field_key": "new_absolute_value" },
  "next_state": "READY"
}

## Rules
- You do NOT know exact slider values unless the user tells you or car_memory.tune contains them. Suggest RELATIVE adjustments.
- When current tune values ARE available, include resulting values: "Increase X by +0.3 (2.4 → 2.7)".
- Be concise. Keep non-technical interactions to 1-2 sentences max.
- NEVER flip-flop. If a suggestion didn't help, try a DIFFERENT parameter — don't just reverse.
- Small increments: ONE primary change at a time. Maximum 2-3 related changes per batch.
- Always explain your mechanical reasoning.
- If current tune values are empty/unknown, that's OK — suggest relative changes.

${TUNING_KNOWLEDGE}`;
}

// ─── Evaluator Prompt ───────────────────────────────────────────────────────

function getEvaluatorPrompt(scenario, responses) {
  return `You are an expert evaluator for an AI race engineer chatbot that helps tune cars in Forza Horizon 6. 

You will be given:
1. A test scenario description with expected good fixes and known wrong fixes
2. The conversation between a simulated driver and the AI tuner

Score the AI tuner's performance on these criteria (each 0-20, total 0-100):

## Scoring Criteria

**1. CORRECTNESS (0-20):** Did it identify the right root cause and suggest appropriate parameters?
- 20: Perfectly identified the issue and suggested the ideal fix
- 15: Correct general area but not the optimal specific fix
- 10: Partially correct but missed the primary cause
- 5: Wrong diagnosis but not harmful
- 0: Completely wrong or potentially harmful advice

**2. CONSISTENCY (0-20):** Does it avoid contradicting itself or flip-flopping?
- 20: All suggestions build logically on each other
- 15: Minor inconsistency but overall coherent
- 10: One contradiction
- 5: Multiple contradictions
- 0: Flip-flops on the same parameter

**3. MAGNITUDE (0-20):** Are the suggested changes appropriately sized?
- 20: Perfect increments (tire ±0.1-0.2 Bar, ARB ±3-5, diff ±5-10%)
- 15: Slightly too large/small but reasonable
- 10: Noticeably oversized changes
- 5: Dramatically oversized or multiple huge changes at once
- 0: Absurd values that show no understanding of ranges

**4. REASONING (0-20):** Does it explain WHY with mechanical logic and telemetry references?
- 20: Clear causal chain referencing specific telemetry data
- 15: Good explanation but could reference data more specifically
- 10: Some reasoning but vague
- 5: Bare suggestion with minimal explanation
- 0: No reasoning provided

**5. FORMAT & BEHAVIOR (0-20):** JSON compliance, conciseness, game-awareness, no re-asking answered questions
- 20: Perfect JSON, concise, game-aware, doesn't re-ask
- 15: Minor format issues but good behavior
- 10: Format OK but behavioral issue (verbose, off-topic)
- 5: Format broken or major behavioral issue
- 0: Completely non-compliant

## Scenario
**ID:** ${scenario.id}
**Name:** ${scenario.name}
**Description:** ${scenario.description}
**Expected fixes (good):** ${scenario.expectedFixes.join(', ')}
**Wrong fixes (bad):** ${scenario.wrongFixes.join(', ')}

## Conversation
${responses.map((r, i) => `
### Turn ${i + 1}
**Driver:** ${r.userMessage}
**AI Tuner Response:** 
\`\`\`json
${r.aiResponse}
\`\`\`
`).join('\n')}

## Your Evaluation
Respond as JSON:
{
  "correctness": { "score": 0-20, "reason": "brief explanation" },
  "consistency": { "score": 0-20, "reason": "brief explanation" },
  "magnitude": { "score": 0-20, "reason": "brief explanation" },
  "reasoning": { "score": 0-20, "reason": "brief explanation" },
  "format_behavior": { "score": 0-20, "reason": "brief explanation" },
  "total": 0-100,
  "summary": "One sentence overall assessment"
}`;
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function runScenario(client, modelName, scenario) {
  const systemPrompt = getSystemPrompt();

  const chat = client.chats.create({
    model: modelName,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    },
  });

  const responses = [];

  for (const turn of scenario.turns) {
    // Build the context payload exactly like the app does
    const payload = {};

    if (turn.context) {
      Object.assign(payload, turn.context);
    }
    payload.user_prompt = turn.userMessage;

    try {
      const response = await chat.sendMessage({
        message: JSON.stringify(payload),
      });
      responses.push({
        userMessage: turn.userMessage,
        aiResponse: response.text,
      });
    } catch (e) {
      responses.push({
        userMessage: turn.userMessage,
        aiResponse: `ERROR: ${e.message}`,
      });
    }
  }

  return responses;
}

async function evaluateResponses(client, judgeModel, scenario, responses) {
  const prompt = getEvaluatorPrompt(scenario, responses);

  try {
    const response = await client.models.generateContent({
      model: judgeModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    return JSON.parse(response.text);
  } catch (e) {
    console.error(`  [Judge Error] ${e.message}`);
    return {
      correctness: { score: 0, reason: 'Judge failed' },
      consistency: { score: 0, reason: 'Judge failed' },
      magnitude: { score: 0, reason: 'Judge failed' },
      reasoning: { score: 0, reason: 'Judge failed' },
      format_behavior: { score: 0, reason: 'Judge failed' },
      total: 0,
      summary: `Evaluation failed: ${e.message}`,
    };
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const client = new GoogleGenAI({ apiKey: opts.apiKey });

  const scenariosToRun = opts.scenarios
    ? SCENARIOS.filter(s => opts.scenarios.includes(s.id))
    : SCENARIOS;

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         AI Tuner — Quality Evaluation Harness           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Tuner Model:  ${opts.model.padEnd(40)}║`);
  console.log(`║  Judge Model:  ${opts.judge.padEnd(40)}║`);
  console.log(`║  Scenarios:    ${String(scenariosToRun.length).padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const results = [];

  for (const scenario of scenariosToRun) {
    process.stdout.write(`▶ ${scenario.name}...`);

    // Step 1: Run the scenario through the tuner
    const responses = await runScenario(client, opts.model, scenario);

    if (opts.verbose) {
      console.log('\n  Responses:');
      for (const r of responses) {
        console.log(`    Driver: ${r.userMessage}`);
        console.log(`    Tuner:  ${r.aiResponse.substring(0, 200)}...`);
      }
    }

    // Step 2: Have the judge evaluate
    const evaluation = await evaluateResponses(client, opts.judge, scenario, responses);
    results.push({ scenario, responses, evaluation });

    console.log(` ${evaluation.total}/100`);
    if (opts.verbose) {
      console.log(`    Correctness: ${evaluation.correctness.score}/20 — ${evaluation.correctness.reason}`);
      console.log(`    Consistency: ${evaluation.consistency.score}/20 — ${evaluation.consistency.reason}`);
      console.log(`    Magnitude:   ${evaluation.magnitude.score}/20 — ${evaluation.magnitude.reason}`);
      console.log(`    Reasoning:   ${evaluation.reasoning.score}/20 — ${evaluation.reasoning.reason}`);
      console.log(`    Format:      ${evaluation.format_behavior.score}/20 — ${evaluation.format_behavior.reason}`);
      console.log(`    Summary:     ${evaluation.summary}`);
    }
    console.log('');
  }

  // ─── Final Report ─────────────────────────────────────────────────────────
  const totalScore = results.reduce((sum, r) => sum + r.evaluation.total, 0);
  const avgScore = Math.round(totalScore / results.length);

  const avgCorrectness = Math.round(results.reduce((s, r) => s + r.evaluation.correctness.score, 0) / results.length);
  const avgConsistency = Math.round(results.reduce((s, r) => s + r.evaluation.consistency.score, 0) / results.length);
  const avgMagnitude = Math.round(results.reduce((s, r) => s + r.evaluation.magnitude.score, 0) / results.length);
  const avgReasoning = Math.round(results.reduce((s, r) => s + r.evaluation.reasoning.score, 0) / results.length);
  const avgFormat = Math.round(results.reduce((s, r) => s + r.evaluation.format_behavior.score, 0) / results.length);

  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│                    FINAL SCORECARD                        │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log(`│  Overall Quality Score:  ${String(avgScore).padStart(3)}/100                          │`);
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log(`│  Correctness:    ${String(avgCorrectness).padStart(2)}/20  │  Does it fix the right thing?     │`);
  console.log(`│  Consistency:    ${String(avgConsistency).padStart(2)}/20  │  Does it avoid flip-flopping?     │`);
  console.log(`│  Magnitude:      ${String(avgMagnitude).padStart(2)}/20  │  Are changes appropriately sized? │`);
  console.log(`│  Reasoning:      ${String(avgReasoning).padStart(2)}/20  │  Does it explain WHY?             │`);
  console.log(`│  Format/Behavior:${String(avgFormat).padStart(2)}/20  │  JSON, concise, game-aware?       │`);
  console.log('├──────────────────────────────────────────────────────────┤');

  // Per-scenario breakdown
  console.log('│  Per-Scenario Breakdown:                                  │');
  for (const r of results) {
    const name = r.scenario.name.length > 44 ? r.scenario.name.substring(0, 41) + '...' : r.scenario.name;
    console.log(`│   ${name.padEnd(44)} ${String(r.evaluation.total).padStart(3)}/100 │`);
  }
  console.log('└──────────────────────────────────────────────────────────┘');

  // Quality interpretation
  console.log('');
  if (avgScore >= 85) {
    console.log('✅ EXCELLENT — The tuner is providing high-quality, reliable advice.');
  } else if (avgScore >= 70) {
    console.log('⚠️  GOOD — Mostly correct but has areas for improvement.');
  } else if (avgScore >= 50) {
    console.log('⚠️  MEDIOCRE — Inconsistent quality. Knowledge base or model needs work.');
  } else {
    console.log('❌ POOR — Unreliable advice. Major improvements needed.');
  }

  // Write detailed results to file
  const resultsPath = path.join(__dirname, 'last_results.json');
  const fs = require('fs');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    model: opts.model,
    judge: opts.judge,
    overall_score: avgScore,
    criteria_averages: { correctness: avgCorrectness, consistency: avgConsistency, magnitude: avgMagnitude, reasoning: avgReasoning, format: avgFormat },
    scenarios: results.map(r => ({
      id: r.scenario.id,
      name: r.scenario.name,
      score: r.evaluation.total,
      evaluation: r.evaluation,
      responses: r.responses,
    })),
  }, null, 2));
  console.log(`\nDetailed results saved to: eval/last_results.json`);

  process.exit(avgScore >= 70 ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
