/**
 * AI Tuner - Tuning Knowledge Base (Forza Horizon 6 Specific)
 * 
 * This is injected directly into the LLM system prompt. Every word here
 * costs tokens and shapes the model's output quality. Keep it dense,
 * precise, and actionable — no filler.
 */

const TUNING_KNOWLEDGE = `
## Forza Horizon 6 — Tuning Reference

### THE GAME'S PHYSICS MODEL
- FH6 uses a simplified tire model. Grip is more binary than real life: you either have it or you don't. There's less "progressive" slip — the breakaway is sharper.
- No tire wear, no fuel load in freeroam. Tire management doesn't apply.
- Smooth driver inputs are heavily rewarded. The physics engine penalizes abrupt throttle/steering changes more than real physics would.
- Weight transfer is exaggerated compared to real life. Springs and dampers have outsized effects on handling balance.
- Aero is effective above ~100 km/h and scales with speed². Below that, it's purely mechanical grip.
- AWD systems in FH6 can be tuned front/rear torque split via the center diff (if equipped). This is the most powerful handling tool on AWD cars.

### PARTS vs TUNING — CRITICAL DISTINCTION
**Parts (Upgrades)** = bought from upgrade shop. Define the car's capabilities.
- Engine: swaps, turbo/supercharger, intake, exhaust, cams, valves, intercooler, oil/cooling, flywheel
- Drivetrain: transmission type (stock/sport/race/drift), driveline, diff type, clutch
- Platform: brakes, springs type (sport/race/rally/drift), ARB type, roll cage, chassis reinforcement, weight reduction
- Tires: compound (street/sport/semi-slick/slick/drag/rally/offroad) and width (narrow/stock/wide)
- Aero: front bumper/splitter, rear wing (determines available downforce range)
- Wheels: size, width, material (affects unsprung mass)

**Tuning** = adjusting sliders on INSTALLED parts. This is what you help with.
- Only installed race/sport/drift-type parts unlock their tuning sliders
- Stock springs = no spring rate tuning available. Need at least Sport springs.
- Stock diff = may not have accel/decel lock tuning. Need at least Sport diff.
- Tire compound determines the BASE grip level. You cannot tune your way out of street tires on a track car.

**When parts matter for your suggestions:**
- If the car is oversteering under power and has an open diff → suggesting "reduce diff accel" is useless. Ask if they have a tunable diff.
- If suspension is bottoming out and they have stock springs → they might need to upgrade springs, not just stiffen.
- Tire compound is THE biggest grip variable. Always consider it.

### TUNING SLIDER RANGES (FH6)

| Parameter | Range | Unit | Step Size |
|-----------|-------|------|-----------|
| Tire Pressure | 1.0 – 3.4 | Bar | 0.1 |
| Camber | -5.0 – 0.0 | ° (degrees) | 0.1 |
| Toe | -5.0 – +5.0 | ° (degrees) | 0.1 |
| Spring Rate | depends on spring type | kgf/mm | varies |
| Ride Height | depends on spring type | cm | 0.1 |
| Bump Damping | 1.0 – varies (~20) | unitless | 0.1 |
| Rebound Damping | 1.0 – varies (~20) | unitless | 0.1 |
| Anti-Roll Bars | 1.0 – 65.0 | unitless | 1.0 |
| Aero (F/R) | depends on parts | kgf | 1 |
| Brake Balance | 0% – 100% | % to front | 1% |
| Brake Pressure | 0% – 200% | % | 1% |
| Diff Accel Lock | 0% – 100% | % | 1% |
| Diff Decel Lock | 0% – 100% | % | 1% |
| Final Drive | ~2.00 – ~6.00 | ratio | 0.01 |

### DISCIPLINE BASELINES

Use these as mental anchors. They are STARTING POINTS — not targets to force on every car.

#### DRIFT (RWD, 700+ HP)
The goal: controllable sustained slides with smooth transitions. Power breaks traction easily, so the tune manages HOW the car slides, not IF.

| Parameter | Front | Rear | Reasoning |
|-----------|-------|------|-----------|
| Tire Pressure | 1.9–2.2 Bar | 2.4–2.8 Bar | High rear = less rear grip = easier initiation |
| Camber | -4.0° to -5.0° | -1.0° to -1.5° | High front = grip at full lock. Low rear = consistent rear contact |
| Toe | -0.3° to -0.5° (out) | +0.1° to +0.3° (in) | Front out = sharp turn-in. Rear in = stability between transitions |
| Springs | 60–75% of max | 40–55% of max | Stiff front = flat platform. Softer rear = lets weight transfer back |
| ARBs | 45–60 | 15–30 | Stiff front = keeps front planted. Soft rear = rear can rotate freely |
| Bump Damping | 4–7 | 3–6 | Lower overall = let weight transfer happen quickly |
| Rebound Damping | 5–9 | 4–7 | Moderate = controls weight return without feeling stuck |
| Diff Accel | — | 75–100% | High = both rears spin together = consistent smoke |
| Diff Decel | — | 0–25% | Low = free rotation on lift-off = easier transitions |
| Brake Balance | 55–65% front | — | Forward bias = stable under braking initiation |
| Final Drive | set so 3rd gear covers most drift zones | — | Don't be at rev limiter mid-drift |

**Key drift physics in FH6:**
- Initiation: flick the weight forward (brake tap or lift-off) then apply power. The rear breaks away.
- Holding: throttle modulation keeps slip angle. Too much = spin. Too little = grip recovery.
- Transition: lift-off → weight shifts → counter-steer → new direction. Diff decel affects how snappy this is.
- Front grip is ESSENTIAL for control during drift. Max front camber and moderate front tire pressure.

#### DRIFT (RWD, 400-700 HP)
Same philosophy but less power available to break traction:
- Rear pressure slightly lower (2.2–2.5) since you need more mechanical advantage to break traction
- Diff accel: 65–85% (less torque = less need for full lock)
- Springs: ~5–10% softer overall (help weight transfer since power won't do it alone)
- May need stiffer rear ARB to encourage oversteer since power alone won't do it

#### GRIP RACING (RWD/AWD)
The goal: fastest lap time. Neutral balance at the limit with predictable behavior.

| Parameter | Front | Rear | Reasoning |
|-----------|-------|------|-----------|
| Tire Pressure | 2.0–2.3 Bar | 2.0–2.3 Bar | Balanced = even grip. Adjust per tire temp data |
| Camber | -1.5° to -2.5° | -1.0° to -1.5° | Enough for cornering without losing straights |
| Toe | -0.1° (out) | +0.1° (in) | Neutral-ish. Minimize scrub/drag |
| Springs | Stiff as possible without hopping | Match front or slightly softer | Stiff = responsive. Back off if rear hops on curbs |
| ARBs | 30–50 | 25–45 | Close ratio. Slightly stiffer rear = slight oversteer bias (faster) |
| Bump | 6–10 | 5–9 | Controls dive/squat. Higher if bottoming |
| Rebound | 7–12 | 6–10 | ~60–75% of bump. Controls return rate |
| Diff Accel | 30–55% | — | Enough for exit traction, not so much it pushes wide |
| Diff Decel | 15–35% | — | Some rotation on entry, not so much it snaps |
| Brake Balance | 55–60% | — | Stable braking, slight rotation on trail-brake |
| Aero | Balance front/rear for neutral | — | If understeer at speed → more front. Oversteer → more rear |

#### RALLY / OFFROAD
The goal: maintain control on unpredictable surfaces. Soft and forgiving.

- Tire Pressure: 1.5–1.9 Bar (max contact area on loose surfaces)
- Springs: SOFT. 25–40% of max range. Ground must be absorbed.
- ARBs: SOFT. 5–20. Wheel articulation is critical.
- Damping: Low bump (1–4), moderate rebound (4–8). Absorb hits, don't bounce.
- Ride Height: HIGH. Near max. Ground clearance essential.
- Diff: Accel 25–45% (too high = wheels dig in and lose traction on gravel/dirt)
- Brake Balance: 50–55% (more rear OK for rotation on loose surfaces)

#### DRAG
The goal: maximum acceleration and traction off the line.

- Tire Pressure: Rear 1.0–1.5 Bar (MAX contact patch for launch). Front doesn't matter much.
- Camber: 0° everywhere (maximum straight-line contact)
- Toe: 0° everywhere (no scrub = no wasted energy)
- Springs: Soft rear (lets weight transfer back on launch), stiff front
- Diff Accel: 100% (both wheels must pull together)
- Final Drive: Short as possible while still reaching top speed before finish line
- Aero: Minimum (drag = enemy)

### PARAMETER INTERACTION MAP
Parameters don't work in isolation. Here's how they connect:

**The Grip Triangle (per axle):**
Tire Pressure × Camber × Tire Compound = total available grip for that axle.
- Change one → the effective balance of the others shifts.
- Before touching springs/ARBs, make sure the tire triangle is reasonable.

**The Balance Stack (understeer ↔ oversteer):**
These all shift the front/rear balance. Listed from strongest to weakest effect:
1. Tire compound front vs rear (biggest single factor)
2. Anti-Roll Bars (front vs rear stiffness)
3. Spring rates (front vs rear stiffness)
4. Tire pressure (front vs rear)
5. Camber (front vs rear)
6. Aero balance (front vs rear downforce)
7. Brake balance (during braking only)
8. Diff settings (during power application/lift-off only)

**Damping is NOT a balance tool.** Damping controls the SPEED of weight transfer, not the amount. Use it to refine transitions and ride quality, not to fix understeer/oversteer.

**The Spring-Damper Relationship:**
- Stiffer springs need higher damping values to stay controlled
- Softer springs need lower damping or the suspension will feel "locked up"
- Rule of thumb: damping should be proportional to spring stiffness
- If you stiffen springs, bump damping by ~15% too

### DIAGNOSTIC LOGIC — HOW TO THINK ABOUT PROBLEMS

When the driver reports an issue, follow this reasoning chain:

1. **WHERE does it happen?** (entry, mid-corner, exit, straights, bumps, transitions)
2. **WHAT does the telemetry show?** (slip angles, tire temps, suspension travel, G-forces)
3. **WHY mechanically?** (which axle is losing grip and what's causing it)
4. **WHAT parameter controls that?** (use the Balance Stack and Interaction Map above)
5. **HOW MUCH to change?** (use the magnitude guide — small steps)

**Common diagnostic patterns from telemetry:**
- High rear slip ratio + low front slip = oversteer (rear losing traction). Look at rear grip triangle + ARBs.
- High front slip + low rear slip = understeer (front losing traction). Look at front grip + ARBs.
- Both axles high slip = too much speed for available grip. Not a tune issue — it's driving.
- Suspension maxing out (>0.95 travel) = bottoming. Springs too soft or ride height too low.
- Large left/right tire temp difference = alignment (camber) issue on that axle.
- Large front/rear tire temp difference = balance issue (hot end is working harder).
- High steering magnitude = driver making corrections = car feels unstable. Look at toe, damping.

### SYMPTOM → FIX TABLE

| Driver Complaint | Look At (Telemetry) | Primary Fix | Secondary Fix | Don't Touch |
|-----------------|---------------------|-------------|---------------|-------------|
| "Understeers on turn-in" | Front slip angle, steering magnitude | Soften front ARB (−5) | Add front toe-out (−0.1°) | Don't change diff (not power related) |
| "Pushes wide on exit" | Rear vs front slip under power | Reduce diff accel (−5-10%) | Stiffen rear ARB (+3-5) | Don't change brakes |
| "Snaps into spin on lift-off" | Rear slip spike on throttle release | Reduce diff decel (−10-15%) | Soften rear ARB (−5) | Don't stiffen springs (makes it worse) |
| "Rear steps out mid-corner" | Rear slip angle, rear tire temps | Soften rear ARB (−5-8) | Reduce rear tire pressure (−0.1-0.2) | Don't change diff (not power related) |
| "Car feels floaty/slow to react" | Suspension travel, body roll G | Stiffen springs (+10%) | Stiffen ARBs (+5 both) | Don't change alignment |
| "Bouncing over bumps" | Rapid suspension oscillation | Increase rebound (+1-2) | Soften springs (−10%) | Don't change tire pressure |
| "Bottoming out" | Suspension travel hitting 1.0 | Raise ride height (+0.5cm) | Stiffen springs (+15%) | Don't change ARBs (they don't prevent pitch) |
| "Can't initiate drift" | Rear slip too low, front turning | Increase rear pressure (+0.2-0.3) | Stiffen front ARB (+5-8) | Don't touch diff (usually already high) |
| "Drift is too snappy/violent" | Rear slip ratio spiking high | Soften rear ARB (−5-8) | Add rear toe-in (+0.1-0.2°) | Don't increase diff decel |
| "Can't hold angle / straightens" | Rear slip dropping mid-slide | Increase diff accel (+5-10%) | More front camber (−0.3-0.5°) | Don't soften front ARB |
| "Transitions are jerky" | Abrupt slip angle changes | Lower diff decel (−5-10%) | Adjust rebound damping (±1-2) | Don't change springs |
| "Tires are too hot" | Tire temp >100°C | Increase pressure (+0.1-0.2) | Reduce camber magnitude | Don't change springs |
| "No traction off the line" | High slip ratio at low speed | Lower rear tire pressure (−0.2) | Soften rear springs (−10%) | Don't change aero (no speed) |
| "Brakes lock up" | Negative slip ratio under braking | Reduce brake pressure (−5-10%) | Shift balance toward rear (−2-3%) | Don't change suspension |

### ADJUSTMENT MAGNITUDES — GOLDEN RULES
NEVER make large changes. The game responds significantly to small adjustments.

| Parameter | Small Change | Medium Change | Large Change (rarely do this) |
|-----------|-------------|---------------|-------------------------------|
| Tire Pressure | ±0.1 Bar | ±0.2 Bar | ±0.3 Bar |
| Camber | ±0.2° | ±0.5° | ±1.0° |
| Toe | ±0.1° | ±0.2° | ±0.3° |
| Springs | ±5% of range | ±10% of range | ±20% of range |
| ARBs | ±3 units | ±5 units | ±8-10 units |
| Bump/Rebound | ±0.5 | ±1.0 | ±2.0 |
| Diff (Accel/Decel) | ±5% | ±10% | ±15% |
| Brake Balance | ±2% | ±3% | ±5% |
| Brake Pressure | ±5% | ±10% | ±15% |
| Final Drive | ±0.03 | ±0.08 | ±0.15 |

**The 1-change rule:** Ideally suggest adjusting only ONE primary parameter per iteration. If you must suggest multiple, limit to 2-3 related changes (e.g., stiffen front ARB + soften rear ARB = one "balance shift" operation).

### ENGINEER BEHAVIOR RULES

1. **Be iterative.** One small change → test → feedback → next change. Never dump 8 changes at once.
2. **Be consistent.** Remember what you already suggested. Build on previous changes, don't contradict them without good reason.
3. **Be mechanically sound.** Every suggestion must have a clear causal chain: symptom → physics cause → parameter that controls it → direction to move it → expected result.
4. **Admit uncertainty.** If the telemetry doesn't clearly support a diagnosis, say so. "The data isn't conclusive — try X and report back" is better than a wrong guess.
5. **Don't over-tune.** If the car feels "95% there", stop. Chasing perfection leads to oscillating changes that make things worse.
6. **Context matters.** A "problem" at 200 km/h is different from the same symptom at 60 km/h. Always consider speed context from telemetry.
7. **Driver style matters.** Aggressive drivers need more stability (stiffer). Smooth drivers can get away with looser setups. Telemetry shows this via input magnitudes.
`;

module.exports = { TUNING_KNOWLEDGE };

