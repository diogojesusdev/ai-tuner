/**
 * AI Tuner — Evaluation Scenarios
 * 
 * Each scenario defines a multi-turn conversation between a simulated driver
 * and the AI tuner. The evaluator grades quality based on correctness,
 * consistency, format compliance, and actionability.
 */

const SCENARIOS = [
  // ─────────────────────────────────────────────────
  // SCENARIO 1: Drift — Snap oversteer on transitions
  // ─────────────────────────────────────────────────
  {
    id: 'drift-snap-oversteer',
    name: 'Drift: Snap oversteer on transitions (high HP Supra)',
    description: 'Driver has a 900hp RWD Supra for drifting. Car spins during transitions. Should diagnose diff decel / rear ARB as primary suspects.',
    expectedFixes: ['diff decel', 'rear ARB', 'rear toe'],
    wrongFixes: ['tire pressure increase', 'stiffen rear springs', 'add rear downforce'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 3402,
          car_memory: {
            car_name: 'Toyota Supra MK5',
            discipline: 'Drifting',
            hp_tier: 'High HP',
            tune: {
              diff_accel: '85',
              diff_decel: '45',
              arb_front: '55',
              arb_rear: '35',
              tire_pressure_rl: '2.5',
              tire_pressure_rr: '2.5',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 78,
            avg_rear_slip_angle_deg: 28,
            avg_front_slip_angle_deg: 8,
            peak_rear_slip_ratio: 1.9,
            avg_rear_slip_ratio: 0.85,
            avg_front_slip_ratio: 0.12,
            peak_lateral_g: 0.92,
            avg_steering_magnitude: 0.72,
            time_full_throttle_pct: 45,
            suspension_front_left: { avg: 0.45, max: 0.72, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.55, max: 0.78, pct_bottoming_out: 0 },
            peak_power_hp: 920,
            peak_torque_nm: 1050,
          },
        },
        userMessage: "The car keeps snapping into a spin during transitions. Like when I flick from one side to the other, the rear just whips around too fast and I can't catch it.",
      },
      {
        userMessage: "OK I dropped diff decel to 20%. It's a bit better but still snappy. What else?",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 2: Grip Racing — Corner entry understeer
  // ─────────────────────────────────────────────────
  {
    id: 'grip-entry-understeer',
    name: 'Grip Racing: Corner entry understeer (AWD GTR)',
    description: 'Driver has an AWD GTR for grip racing. Understeers on corner entry. Should look at front ARB, toe, brake balance.',
    expectedFixes: ['front ARB soften', 'front toe-out', 'brake balance'],
    wrongFixes: ['rear tire pressure', 'diff accel', 'rear springs'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 1200,
          car_memory: {
            car_name: 'Nissan GT-R R35',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              arb_front: '45',
              arb_rear: '40',
              tire_pressure_fl: '2.3',
              tire_pressure_fr: '2.3',
              tire_pressure_rl: '2.2',
              tire_pressure_rr: '2.2',
              brake_balance: '58',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 145,
            avg_front_slip_angle_deg: 6.2,
            avg_rear_slip_angle_deg: 2.8,
            peak_front_slip_ratio: 0.35,
            avg_front_slip_ratio: 0.18,
            avg_rear_slip_ratio: 0.06,
            peak_lateral_g: 1.15,
            avg_steering_magnitude: 0.55,
            time_full_throttle_pct: 62,
            balance_indicator: 'understeer',
            suspension_front_left: { avg: 0.52, max: 0.81, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.38, max: 0.65, pct_bottoming_out: 0 },
            peak_power_hp: 620,
            peak_torque_nm: 710,
          },
        },
        userMessage: "The car doesn't want to turn in. I have to slow down way too much before corners otherwise the front just washes wide.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 3: Consistency check — Don't flip-flop
  // ─────────────────────────────────────────────────
  {
    id: 'consistency-no-flipflop',
    name: 'Consistency: Does not flip-flop on suggestions',
    description: 'Driver applies a suggestion and says "it didn\'t help much". The AI should NOT simply reverse its suggestion — it should try a different parameter.',
    expectedFixes: ['different parameter', 'ask what changed'],
    wrongFixes: ['reverse previous suggestion', 'lower what was just raised'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 500,
          car_memory: {
            car_name: 'BMW M3 E46',
            discipline: 'Drifting',
            hp_tier: 'Mid HP',
            tune: {
              tire_pressure_rl: '2.4',
              tire_pressure_rr: '2.4',
              arb_rear: '25',
              diff_accel: '80',
            },
            past_modifications: ['Increased rear tire pressure from 2.2 to 2.4 Bar'],
          },
          telemetry_summary: {
            avg_speed_kmh: 65,
            avg_rear_slip_angle_deg: 18,
            peak_rear_slip_ratio: 1.3,
            avg_rear_slip_ratio: 0.7,
            peak_power_hp: 450,
          },
        },
        userMessage: "I bumped the rear pressure to 2.4 like you said but it still feels like the car grips up too fast out of the drift. Same issue.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 4: Game awareness — FH6 not real life
  // ─────────────────────────────────────────────────
  {
    id: 'game-context-awareness',
    name: 'Game Awareness: Knows this is Forza Horizon 6',
    description: 'Driver mentions game-specific elements. AI should reference game mechanics, not real-world concepts like tire wear or fuel strategy.',
    expectedFixes: ['game-appropriate language', 'slider references', 'no real-world-only concepts'],
    wrongFixes: ['tire wear advice', 'fuel strategy', 'safety concerns', 'real track names'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 800,
          car_memory: {
            car_name: 'Mazda RX-7 FD',
            discipline: 'Drifting',
            hp_tier: 'High HP',
            tune: {},
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 85,
            avg_rear_slip_angle_deg: 32,
            peak_rear_slip_ratio: 2.1,
            peak_power_hp: 750,
          },
        },
        userMessage: "I just engine-swapped a 2JZ into my FD and upgraded to race tires. The car has way too much power now — I can't hold a drift without spinning. What should I tune?",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 5: Info extraction — Skip questions
  // ─────────────────────────────────────────────────
  {
    id: 'skip-identification-steps',
    name: 'Efficiency: Skips ID questions when info is provided',
    description: 'User provides car name, discipline, HP tier in their first message. The AI should NOT re-ask any of these.',
    expectedFixes: ['direct response', 'no redundant questions', 'store tune_updates'],
    wrongFixes: ['asks car name', 'asks discipline', 'asks HP tier'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 999,
          car_memory: {
            car_name: null,
            discipline: null,
            hp_tier: null,
            tune: {},
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 72,
            avg_rear_slip_angle_deg: 22,
            peak_rear_slip_ratio: 1.5,
            peak_power_hp: 850,
          },
        },
        userMessage: "Hey, I've got a 850hp Silvia S15 that I'm building for drifting. The rear end feels way too loose on corner entry even before I apply power. What should I look at?",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 6: Rally — Bottoming out and bouncing
  // ─────────────────────────────────────────────────
  {
    id: 'rally-bottoming-out',
    name: 'Rally: Bottoming out on rough terrain',
    description: 'Driver is rallying and bottoming out. AI should suggest ride height, softer springs, lower bump damping — NOT aero or tire pressure.',
    expectedFixes: ['ride height', 'springs softer', 'bump damping lower'],
    wrongFixes: ['aero', 'tire pressure', 'diff settings'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 2100,
          car_memory: {
            car_name: 'Subaru Impreza WRX STI',
            discipline: 'Rally',
            hp_tier: null,
            tune: {
              ride_height_front: '14.0',
              ride_height_rear: '14.5',
              spring_front: '85.0',
              spring_rear: '90.0',
              bump_front: '8.5',
              bump_rear: '9.0',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 95,
            suspension_front_left: { avg: 0.72, max: 1.0, pct_bottoming_out: 28 },
            suspension_front_right: { avg: 0.70, max: 0.98, pct_bottoming_out: 22 },
            suspension_rear_left: { avg: 0.68, max: 1.0, pct_bottoming_out: 18 },
            suspension_rear_right: { avg: 0.65, max: 0.95, pct_bottoming_out: 12 },
            peak_lateral_g: 0.75,
            peak_power_hp: 380,
          },
        },
        userMessage: "The car feels like it's crashing into the ground every time I go over bumps or jumps. Really harsh landing and I lose control after big bumps.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 7: Magnitude check — Small adjustments
  // ─────────────────────────────────────────────────
  {
    id: 'adjustment-magnitude',
    name: 'Magnitude: Suggests small, measured adjustments',
    description: 'AI should suggest small incremental changes, not dramatic ones. Tire pressure ±0.1-0.2, ARBs ±3-5, diff ±5-10%.',
    expectedFixes: ['small increments', 'one thing at a time'],
    wrongFixes: ['large jumps', 'many simultaneous changes', 'extreme values'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 3000,
          car_memory: {
            car_name: 'Porsche 911 GT3',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              arb_front: '40',
              arb_rear: '38',
              tire_pressure_fl: '2.2',
              tire_pressure_fr: '2.2',
              tire_pressure_rl: '2.1',
              tire_pressure_rr: '2.1',
              diff_accel: '45',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 165,
            avg_front_slip_angle_deg: 4.5,
            avg_rear_slip_angle_deg: 5.8,
            peak_lateral_g: 1.3,
            balance_indicator: 'slight_oversteer',
            peak_power_hp: 510,
          },
        },
        userMessage: "Slight oversteer coming out of fast corners. Not horrible but I'd like it more planted.",
      },
    ],
  },
];

module.exports = { SCENARIOS };
