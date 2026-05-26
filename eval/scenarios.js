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
    description: 'AI should suggest small incremental changes for a "slight" issue, not dramatic ones. Tire pressure ±0.1, ARBs ±3, diff ±5%. Must express change as delta from current value, NOT as an absolute target.',
    expectedFixes: ['small increments', 'one thing at a time', 'delta from current value'],
    wrongFixes: ['large jumps', 'many simultaneous changes', 'extreme values', 'absolute target without showing delta'],
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

  // ─────────────────────────────────────────────────
  // SCENARIO 8: Drift — Can't initiate / rear won't break loose
  // ─────────────────────────────────────────────────
  {
    id: 'drift-cant-initiate',
    name: 'Drift: Car won\'t break loose for initiation (mid HP 240SX)',
    description: 'Driver has a mid-HP RWD 240SX for drifting. The rear sticks too much and the car won\'t break into a drift. Should suggest increasing rear tire pressure, stiffening front ARB, or adjusting diff. Should NOT suggest softening rear (that adds rear grip).',
    expectedFixes: ['increase rear tire pressure', 'stiffen front ARB', 'diff accel increase'],
    wrongFixes: ['soften rear ARB', 'reduce rear tire pressure', 'add rear downforce'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 1500,
          car_memory: {
            car_name: 'Nissan 240SX SE',
            discipline: 'Drifting',
            hp_tier: 'Mid HP',
            tune: {
              tire_pressure_rl: '2.0',
              tire_pressure_rr: '2.0',
              tire_pressure_fl: '2.0',
              tire_pressure_fr: '2.0',
              arb_front: '30',
              arb_rear: '30',
              diff_accel: '60',
              diff_decel: '30',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 70,
            avg_rear_slip_angle_deg: 5,
            avg_front_slip_angle_deg: 4,
            peak_rear_slip_ratio: 0.35,
            avg_rear_slip_ratio: 0.15,
            avg_front_slip_ratio: 0.12,
            peak_lateral_g: 0.85,
            time_full_throttle_pct: 55,
            peak_power_hp: 480,
            peak_torque_nm: 520,
          },
        },
        userMessage: "I can't get this car to drift at all. The rear just sticks. I'm flooring it and yanking the wheel but it just understeers and grips up. How do I make it slide?",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 9: Drift — Can't hold angle / car straightens
  // ─────────────────────────────────────────────────
  {
    id: 'drift-cant-hold-angle',
    name: 'Drift: Car straightens out mid-drift (RWD Mustang)',
    description: 'Driver can initiate but the car straightens out mid-drift — can\'t sustain the angle. Telemetry shows rear slip drops mid-slide. Should suggest increasing diff accel lock, more front camber, or stiffen front ARB. Should NOT soften front ARB (removes front grip needed for control).',
    expectedFixes: ['increase diff accel', 'more front camber', 'stiffen front ARB'],
    wrongFixes: ['soften front ARB', 'reduce diff accel', 'reduce rear tire pressure'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 2200,
          car_memory: {
            car_name: 'Ford Mustang GT',
            discipline: 'Drifting',
            hp_tier: 'Mid HP',
            tune: {
              diff_accel: '55',
              diff_decel: '15',
              arb_front: '35',
              arb_rear: '22',
              camber_fl: '-2.5',
              camber_fr: '-2.5',
              tire_pressure_rl: '2.4',
              tire_pressure_rr: '2.4',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 75,
            avg_rear_slip_angle_deg: 12,
            avg_front_slip_angle_deg: 6,
            peak_rear_slip_ratio: 1.2,
            avg_rear_slip_ratio: 0.45,
            peak_lateral_g: 0.78,
            time_full_throttle_pct: 60,
            peak_power_hp: 550,
            peak_torque_nm: 680,
          },
        },
        userMessage: "I can get the car sideways initially but it straightens out almost immediately. I'm applying full throttle but the drift just dies and the car goes straight. Can't hold any angle.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 10: Drift — Uneven smoke / one tire spinning
  // ─────────────────────────────────────────────────
  {
    id: 'drift-uneven-spin',
    name: 'Drift: Only one rear tire spins (350Z with low diff lock)',
    description: 'Driver notices one rear tire smokes way more than the other, and the car feels unpredictable mid-drift. Telemetry shows very different left vs right rear slip ratios. The primary fix is increasing diff accel lock so both rears spin together. Should NOT suggest tire pressure or ARBs as primary fix.',
    expectedFixes: ['increase diff accel lock'],
    wrongFixes: ['tire pressure', 'ARB changes', 'camber changes'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 1800,
          car_memory: {
            car_name: 'Nissan 350Z',
            discipline: 'Drifting',
            hp_tier: 'Mid HP',
            tune: {
              diff_accel: '35',
              diff_decel: '10',
              tire_pressure_rl: '2.4',
              tire_pressure_rr: '2.4',
              arb_rear: '25',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 72,
            avg_rear_slip_angle_deg: 20,
            peak_rear_slip_ratio: 1.8,
            avg_rear_slip_ratio: 0.9,
            slip_ratio_rear_left: 1.5,
            slip_ratio_rear_right: 0.4,
            peak_power_hp: 420,
            peak_torque_nm: 470,
          },
        },
        userMessage: "The inside rear tire is spinning like crazy but the outside one barely rotates. The smoke is super uneven and the car feels weird mid-drift, kinda unpredictable.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 11: Drift — Too much angle / overrotation
  // ─────────────────────────────────────────────────
  {
    id: 'drift-overrotation',
    name: 'Drift: Too much angle, car overrotates (high HP RX-7)',
    description: 'Driver has a high-HP RX-7 that rotates too far past the desired drift angle — it goes nearly backwards. Telemetry shows very high rear slip angles. Should suggest adding rear toe-in for stability, softening rear ARB, or reducing diff decel. Should NOT reduce diff accel (that would make holding the drift harder).',
    expectedFixes: ['add rear toe-in', 'soften rear ARB', 'reduce diff decel'],
    wrongFixes: ['reduce diff accel', 'stiffen front ARB', 'increase rear tire pressure'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 2500,
          car_memory: {
            car_name: 'Mazda RX-7 Spirit R',
            discipline: 'Drifting',
            hp_tier: 'High HP',
            tune: {
              diff_accel: '90',
              diff_decel: '40',
              arb_front: '50',
              arb_rear: '35',
              toe_rl: '0.0',
              toe_rr: '0.0',
              camber_fl: '-4.5',
              camber_fr: '-4.5',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 80,
            avg_rear_slip_angle_deg: 42,
            avg_front_slip_angle_deg: 10,
            peak_rear_slip_ratio: 2.3,
            avg_rear_slip_ratio: 1.1,
            peak_lateral_g: 0.95,
            avg_steering_magnitude: 0.85,
            peak_power_hp: 780,
            peak_torque_nm: 850,
          },
        },
        userMessage: "The car rotates way too far. When I initiate, it goes almost backwards and I can't catch it in time. I want a controllable 30-35 degree angle but it keeps going to like 45+ degrees.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 12: Drift — Multi-turn iterative tuning
  // ─────────────────────────────────────────────────
  {
    id: 'drift-multi-turn-iterative',
    name: 'Drift: Iterative tuning across 3 turns (AE86)',
    description: 'Tests the AI\'s ability to iterate. Driver starts with understeer on initiation, fixes it, then reports a new issue (too snappy). The AI must NOT revert the first fix — it should address the new symptom with a different parameter.',
    expectedFixes: ['rear tire pressure up or front ARB stiffen (turn 1)', 'diff decel down or rear toe-in (turn 2)', 'build iteratively'],
    wrongFixes: ['revert turn 1 fix', 'suggest opposite of turn 1', 'ignore new symptom'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 600,
          car_memory: {
            car_name: 'Toyota AE86 Sprinter Trueno',
            discipline: 'Drifting',
            hp_tier: 'Low HP',
            tune: {
              tire_pressure_fl: '2.0',
              tire_pressure_fr: '2.0',
              tire_pressure_rl: '2.0',
              tire_pressure_rr: '2.0',
              arb_front: '25',
              arb_rear: '25',
              diff_accel: '70',
              diff_decel: '30',
            },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 55,
            avg_rear_slip_angle_deg: 6,
            avg_front_slip_angle_deg: 5,
            peak_rear_slip_ratio: 0.4,
            avg_rear_slip_ratio: 0.15,
            peak_power_hp: 280,
            peak_torque_nm: 310,
          },
        },
        userMessage: "Can't get this thing to drift. It just understeers and grips up. How do I make the rear come out?",
      },
      {
        userMessage: "OK that worked! The rear comes out now. But the transitions are really snappy, the car wants to spin when I switch directions. How do I smooth that out without losing the ability to initiate?",
      },
      {
        userMessage: "That's better. Now I can transition without spinning. But I feel like the drift dies quickly — the angle drops and the car straightens. How do I hold the slide longer?",
      },
    ],
  },
];

module.exports = { SCENARIOS };
