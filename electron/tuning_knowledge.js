/**
 * AI Tuner - Tuning Knowledge Base
 * Domain knowledge injected into the LLM system prompt to make it
 * more consistent and precise about car setup adjustments.
 */

const TUNING_KNOWLEDGE = `
## Tuning Knowledge Base

### TIRE PRESSURE
**What it does:** Controls the size of the tire contact patch and tire temperature.
- **Lower pressure** → Larger contact patch → More grip, but slower tire response and higher temps at high speed.
- **Higher pressure** → Smaller contact patch → Less grip, but sharper response and lower rolling resistance.

**When to adjust:**
- Tires overheating (>100°C) → Increase pressure by 0.1–0.2 Bar
- Lack of grip in slow corners → Decrease pressure by 0.1–0.2 Bar
- Tire temps uneven inner/outer → Alignment issue, not pressure
- Typical ranges: 1.8–3.2 Bar (game dependent)

**Discipline notes:**
- Drifting: Rear often 0.2–0.5 Bar higher than front (reduce rear grip for easier slide initiation)
- Racing: Front/rear balanced or front slightly lower for turn-in
- Rally: Lower overall (more contact patch on loose surfaces)

---

### CAMBER (Alignment)
**What it does:** Tilts the top of the tire inward (negative) or outward (positive).
- **More negative** → Better cornering grip (more contact during body roll) but less straight-line traction.
- **Less negative / zero** → Better straight-line grip and braking, but less cornering.

**When to adjust:**
- Inner tire edge overheating → Too much negative camber, reduce by 0.3–0.5°
- Outer tire edge overheating → Not enough negative camber, add 0.3–0.5°
- Understeer in fast corners → Add front negative camber (−0.5°)
- Oversteer mid-corner → Reduce rear negative camber or add front negative
- Typical ranges: −0.5° to −3.5° (front), −1.0° to −2.5° (rear)

**Discipline notes:**
- Drifting: Front −3° to −5° (maximize steering angle grip), Rear −1° to −2° (balance slide)
- Racing: Front −1.5° to −2.5°, Rear −1.0° to −1.5°
- Drag: 0° everywhere (maximum straight-line contact)

---

### TOE (Alignment)
**What it does:** Angles tires inward (toe-in) or outward (toe-out) when viewed from above.
- **Toe-in** → Improves straight-line stability, reduces turn-in response.
- **Toe-out** → Sharper turn-in, more responsive but less stable on straights.

**When to adjust:**
- Car feels twitchy/unstable on straights → Add rear toe-in (+0.1–0.2°)
- Sluggish turn-in response → Add front toe-out (−0.1–0.2°)
- Car wanders under braking → Add front toe-in
- Typical ranges: −0.5° to +0.5°

**Discipline notes:**
- Drifting: Front toe-out (−0.2° to −0.5°) for aggressive turn-in; Rear toe-in (+0.1° to +0.3°) for straight stability during transitions
- Racing: Front slight toe-out, Rear slight toe-in
- Rally: Similar to racing but more toe-in overall for stability

---

### SPRINGS (Stiffness)
**What it does:** Controls how much the car body moves under load (roll, pitch, dive).
- **Stiffer springs** → Less body roll, faster weight transfer, but less mechanical grip over bumps.
- **Softer springs** → More grip over bumps, more body roll, slower transitions.

**When to adjust:**
- Suspension bottoming out (travel >0.95) → Stiffen springs or raise ride height
- Car bouncing/skipping over bumps → Soften springs
- Too much body roll → Stiffen springs (prefer ARBs first for roll control)
- Slow weight transfer (car feels lazy) → Stiffen springs
- Front springs vs rear controls balance: Stiffer front = more understeer, Stiffer rear = more oversteer

**Discipline notes:**
- Drifting: Stiffer than normal for quick transitions, rear slightly softer than front for weight transfer to rear
- Racing: Balanced, as stiff as possible while maintaining grip over bumps
- Rally: Soft for bump absorption, tolerate body roll

---

### RIDE HEIGHT
**What it does:** Distance between car body and ground. Affects center of gravity and aero.
- **Lower** → Lower CoG, better aero, less body roll, but risks bottoming out.
- **Higher** → More suspension travel available, better for bumpy tracks, but higher CoG.

**When to adjust:**
- Bottoming out frequently → Raise ride height by 0.5–1.0 cm
- Car feels too "floaty" or rolls too much → Lower if not bottoming
- Front/rear rake (front lower than rear) affects aero balance
- Typical ranges: 5–15 cm (game dependent)

---

### DAMPING (Bump & Rebound)
**What it does:** Controls the SPEED of suspension compression (bump) and extension (rebound).
- **Bump (compression):** How fast the suspension compresses when hitting bumps or under load.
  - Higher = suspension resists compression (firmer ride, less dive under braking)
  - Lower = suspension absorbs bumps better
- **Rebound (extension):** How fast the suspension returns to rest after compression.
  - Higher = suspension extends slowly (more stable but can "pack down" over consecutive bumps)
  - Lower = suspension extends quickly (more responsive but can feel bouncy)

**Key relationship:** Rebound should typically be 60–75% of bump value.

**When to adjust:**
- Car bouncing repeatedly over bumps → Increase rebound (slow the extension)
- Car feels harsh, skipping over bumps → Decrease bump damping
- Excessive nose dive under braking → Increase front bump
- Rear squats too much on acceleration → Increase rear bump
- Car "pogo sticks" (oscillates) → Rebound too low, increase it
- Car feels "stuck" or won't settle → Rebound too high, decrease it

**Discipline notes:**
- Drifting: Lower bump (let weight transfer happen), moderate rebound
- Racing: Balanced, tuned to track surface
- Rally: Low bump (absorb terrain), moderate rebound (prevent repeated compression)

---

### ANTI-ROLL BARS (ARBs / Sway Bars)
**What it does:** Connects left/right suspension to resist body roll in corners. DOES NOT affect pitch (braking/acceleration).
- **Stiffer ARB** → Less body roll on that axle → that axle loses grip relative to the other.
- **Softer ARB** → More body roll on that axle → that axle gains grip relative to the other.

**The critical rule:** Stiffer end = less grip at that end.
- Stiffen front ARB → More understeer
- Stiffen rear ARB → More oversteer
- Soften front ARB → Less understeer
- Soften rear ARB → Less oversteer

**When to adjust:**
- Understeer → Soften front ARB OR stiffen rear ARB
- Oversteer → Soften rear ARB OR stiffen front ARB
- Too much body roll → Stiffen both (maintain relative difference)
- ARBs are the PRIMARY balance tool — adjust these before springs

**Discipline notes:**
- Drifting: Stiff front (keeps front flat for grip), soft-to-medium rear (lets rear weight transfer)
- Racing: Balanced with slight rear bias for neutral handling
- Rally: Soft overall to allow wheel articulation

---

### AERO (Downforce)
**What it does:** Pushes the car down at speed, increasing grip proportional to speed².
- **More downforce** → More grip at speed, but more drag (lower top speed).
- **Less downforce** → Less drag, higher top speed, less high-speed grip.
- **Front/rear balance** → Shifts aero grip bias.

**When to adjust:**
- High-speed understeer → Add front downforce
- High-speed oversteer → Add rear downforce (or reduce front)
- Note: Aero has minimal effect below ~100 km/h
- If grip issues happen at low speed, don't adjust aero — use mechanical grip (springs, ARBs, tires)

**Discipline notes:**
- Drifting: Minimal or zero (low speeds, not relevant)
- Racing: Critical — set for the balance you need at corner entry speeds
- Drag: Minimum for least drag

---

### BRAKES
**What it does:**
- **Brake Balance** → % of braking force to the front. Higher = more front bias.
  - More front bias → Stable braking but front locks first (understeer on trail-brake)
  - More rear bias → Rotational on braking but rear locks first (snap oversteer risk)
- **Brake Pressure** → Overall force applied. Higher = stronger braking but easier to lock.

**When to adjust:**
- Rear wheels locking under braking (negative slip ratio) → Increase brake balance (more front)
- Car doesn't rotate on trail-braking → Decrease brake balance (more rear)
- Wheels locking too easily → Decrease brake pressure
- Braking distances too long → Increase brake pressure (if not locking)
- Typical balance: 55–65% front

**Discipline notes:**
- Drifting: 55–65% front, moderate pressure (braking initiates weight transfer)
- Racing: 55–60% front for most cars
- Rally: Slightly more rear bias for rotation on loose surfaces

---

### DIFFERENTIAL
**What it does:** Controls how engine torque is split between left/right (or front/rear) wheels.
- **Accel (acceleration lock %):** How much the wheels are locked together under power.
  - Higher % → Both wheels spin together → Better traction, but pushes wide in corners (understeer on exit)
  - Lower % → Wheels can spin independently → More agility but one wheel may spin
- **Decel (deceleration lock %):** How much the wheels are locked when off-throttle/engine braking.
  - Higher % → More stable on lift-off, but less rotation
  - Lower % → More rotation on lift-off (tuck-in effect), but can feel unstable

**When to adjust:**
- One wheel spinning on corner exit (inside wheel) → Increase accel lock
- Car pushes wide on corner exit → Decrease accel lock
- Car snaps on lift-off → Decrease decel lock
- Car won't rotate on entry/trail-brake → Increase decel lock slightly
- Typical ranges: 20–80% accel, 10–60% decel

**Discipline notes:**
- Drifting: High accel (65–100%) to keep both rears spinning. Low-to-mid decel (0–30%)
- Racing: Moderate accel (30–60%), low decel (15–40%)
- Rally: Lower accel for loose surfaces (prevents digging in)

---

### FINAL DRIVE (Gearing)
**What it does:** Multiplier between the transmission output and the wheels. Affects ALL gears proportionally.
- **Higher (shorter) ratio** → More acceleration, lower top speed, revs hit limiter sooner.
- **Lower (taller) ratio** → Less acceleration, higher top speed, stays in powerband longer per gear.

**When to adjust:**
- Hitting rev limiter before next braking zone → Taller final drive (decrease number)
- Not enough acceleration out of corners → Shorter final drive (increase number)
- For drifting: Should allow sustained 3rd/4th gear operation in most corners

---

### COMMON SYMPTOM → FIX REFERENCE

| Symptom | Primary Fix | Secondary Fix |
|---------|-------------|---------------|
| Understeer (entry) | Soften front ARB, add front toe-out | Stiffen rear ARB |
| Understeer (exit) | Reduce diff accel lock | Soften front springs |
| Oversteer (entry) | Soften rear ARB, increase rear toe-in | Reduce brake rear bias |
| Oversteer (mid-corner) | Reduce rear camber, soften rear springs | Stiffen front ARB |
| Oversteer (exit/power) | Increase rear tire pressure slightly | Reduce diff accel lock |
| Snap oversteer (lift-off) | Reduce diff decel lock | Soften rear ARB |
| Bottoming out | Raise ride height, stiffen springs | Increase bump damping |
| Bouncing/oscillating | Increase rebound damping | Check spring/damper ratio |
| Poor traction (both wheels) | Lower tire pressure, check camber | Reduce diff lock |
| One wheel spinning | Increase diff accel lock | Check damping balance |
| Tires overheating | Increase tire pressure, check camber | Soften springs |
| Car won't initiate drift | More rear tire pressure, less rear grip | Stiffer front ARB, add front toe-out |
| Drift too snappy/fast | Soften rear ARB, add rear toe-in | Reduce diff decel |
| Can't hold drift angle | Increase diff accel lock | More negative front camber |

### ADJUSTMENT MAGNITUDE GUIDE
- Tire pressure: ±0.1–0.2 Bar per adjustment
- Camber: ±0.3–0.5° per adjustment
- Toe: ±0.05–0.1° per adjustment
- Springs: ±5–15% of current value
- Damping: ±1–3 clicks / ±5–10% of range
- ARBs: ±2–5 clicks / ±10–15% of range
- Aero: ±5–10 kgf per adjustment
- Brake balance: ±2–3% per adjustment
- Diff: ±5–10% per adjustment
- Final drive: ±0.05–0.15 per adjustment
`;

module.exports = { TUNING_KNOWLEDGE };
