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

  // ─────────────────────────────────────────────────
  // SCENARIO 13: Racing — Mid-corner oversteer (RWD)
  // ─────────────────────────────────────────────────
  {
    id: 'racing-mid-corner-oversteer',
    name: 'Racing: Mid-corner oversteer on throttle (RWD C7 Corvette)',
    description: 'Driver has a high-HP RWD Corvette for racing. Rear steps out when applying throttle mid-corner. Telemetry confirms rear slip spikes on throttle application. Should suggest lowering diff accel lock, softening rear ARB, or lowering rear tire pressure. Should NOT stiffen rear (more rear grip loss) or touch front aero.',
    expectedFixes: ['reduce diff accel', 'soften rear ARB', 'lower rear tire pressure'],
    wrongFixes: ['stiffen rear ARB', 'stiffen rear springs', 'increase diff accel'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4100,
          car_memory: {
            car_name: 'Chevrolet Corvette C7 Z06',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              diff_accel: '70',
              diff_decel: '25',
              arb_front: '42',
              arb_rear: '40',
              tire_pressure_fl: '2.1',
              tire_pressure_fr: '2.1',
              tire_pressure_rl: '2.1',
              tire_pressure_rr: '2.1',
              aero_front: '80',
              aero_rear: '120',
            },
            parts: { drivetrain_layout: 'RWD', tire_compound: 'Semi-Slick', aspiration: 'Supercharger' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 155,
            avg_front_slip_angle_deg: 3.5,
            avg_rear_slip_angle_deg: 7.2,
            peak_rear_slip_ratio: 0.85,
            avg_rear_slip_ratio: 0.32,
            avg_front_slip_ratio: 0.08,
            peak_lateral_g: 1.25,
            time_full_throttle_pct: 58,
            balance_indicator: 'oversteer',
            suspension_front_left: { avg: 0.40, max: 0.65, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.48, max: 0.75, pct_bottoming_out: 0 },
            peak_power_hp: 720,
            peak_torque_nm: 880,
          },
        },
        userMessage: "Every time I get on the throttle mid-corner the rear kicks out and I have to catch a slide. It's costing me a lot of time. I want the car to be more stable on power.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 14: Racing — High-speed instability / twitchy
  // ─────────────────────────────────────────────────
  {
    id: 'racing-high-speed-instability',
    name: 'Racing: High-speed instability / twitchy at 250+ km/h (Lambo)',
    description: 'Driver has a high-HP AWD Lambo for racing. Car is twitchy and unstable at very high speed straights and fast sweepers. Should suggest increasing rear downforce, softening rear ARB, or adding rear toe-in for stability. Should NOT suggest removing downforce or changing tire pressure much.',
    expectedFixes: ['increase rear downforce', 'add rear toe-in', 'soften rear ARB'],
    wrongFixes: ['reduce downforce', 'stiffen rear ARB', 'lower ride height aggressively'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4200,
          car_memory: {
            car_name: 'Lamborghini Huracan Performante',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              aero_front: '100',
              aero_rear: '90',
              arb_front: '45',
              arb_rear: '45',
              toe_rl: '0.0',
              toe_rr: '0.0',
              tire_pressure_fl: '2.2',
              tire_pressure_fr: '2.2',
              tire_pressure_rl: '2.1',
              tire_pressure_rr: '2.1',
            },
            parts: { drivetrain_layout: 'AWD', tire_compound: 'Slick', rear_aero: 'Forza Aero', front_aero: 'Forza Aero' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 235,
            avg_front_slip_angle_deg: 2.1,
            avg_rear_slip_angle_deg: 4.8,
            peak_rear_slip_ratio: 0.42,
            peak_lateral_g: 1.4,
            avg_steering_magnitude: 0.18,
            suspension_front_left: { avg: 0.35, max: 0.52, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.42, max: 0.60, pct_bottoming_out: 0 },
            peak_power_hp: 680,
            peak_torque_nm: 620,
          },
        },
        userMessage: "On the long straights and fast sweepers the car feels super twitchy. Even tiny steering inputs make it dart sideways. It feels dangerous above 250 km/h.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 15: Street Racing — Traction off the line
  // ─────────────────────────────────────────────────
  {
    id: 'street-traction-launch',
    name: 'Street Racing: No traction off the line (RWD Charger)',
    description: 'Driver is doing street racing / rolling races with a high-HP RWD muscle car. Massive wheelspin off the line and can\'t put power down out of slow corners. Should suggest lowering diff accel lock, lowering rear tire pressure for more grip, or softer rear springs to improve weight transfer. Should NOT suggest adding downforce (street build) or stiffening anything.',
    expectedFixes: ['reduce diff accel', 'lower rear tire pressure', 'softer rear springs'],
    wrongFixes: ['add downforce', 'stiffen rear', 'increase diff accel'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4300,
          car_memory: {
            car_name: 'Dodge Charger R/T',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              diff_accel: '80',
              diff_decel: '20',
              tire_pressure_rl: '2.4',
              tire_pressure_rr: '2.4',
              tire_pressure_fl: '2.2',
              tire_pressure_fr: '2.2',
              spring_front: '95.0',
              spring_rear: '100.0',
            },
            parts: { drivetrain_layout: 'RWD', tire_compound: 'Sport', aspiration: 'Supercharger', transmission: 'Race' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 88,
            avg_rear_slip_angle_deg: 3.5,
            peak_rear_slip_ratio: 2.8,
            avg_rear_slip_ratio: 0.95,
            avg_front_slip_ratio: 0.04,
            peak_lateral_g: 0.65,
            time_full_throttle_pct: 72,
            suspension_front_left: { avg: 0.35, max: 0.55, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.62, max: 0.88, pct_bottoming_out: 3 },
            peak_power_hp: 850,
            peak_torque_nm: 1100,
          },
        },
        userMessage: "I'm doing street races and every time I launch or floor it out of a corner the rear just lights up. Massive wheelspin, I'm just burning rubber and going nowhere. How do I put the power down?",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 16: Racing — Braking instability / rear locks
  // ─────────────────────────────────────────────────
  {
    id: 'racing-braking-instability',
    name: 'Racing: Rear locks up under heavy braking (FWD Civic)',
    description: 'Driver has a FWD Civic for racing. Under heavy braking the rear locks up and the car rotates. Telemetry shows rear slip ratio spikes under braking. The primary fix is adjusting brake balance more toward front. Could also suggest increasing rear tire pressure slightly or reducing brake pressure. Should NOT suggest diff or ARB changes as primary fix.',
    expectedFixes: ['move brake balance toward front', 'reduce brake pressure', 'increase rear tire pressure slightly'],
    wrongFixes: ['diff changes', 'ARB changes as primary', 'add rear downforce'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4400,
          car_memory: {
            car_name: 'Honda Civic Type R FK8',
            discipline: 'Racing',
            hp_tier: null,
            tune: {
              brake_balance: '52',
              brake_pressure: '95',
              tire_pressure_fl: '2.3',
              tire_pressure_fr: '2.3',
              tire_pressure_rl: '2.2',
              tire_pressure_rr: '2.2',
              arb_front: '38',
              arb_rear: '35',
            },
            parts: { drivetrain_layout: 'FWD', tire_compound: 'Semi-Slick', brakes_type: 'Race' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 130,
            avg_front_slip_angle_deg: 3.0,
            avg_rear_slip_angle_deg: 8.5,
            peak_rear_slip_ratio: 0.95,
            avg_rear_slip_ratio: 0.45,
            avg_front_slip_ratio: 0.22,
            peak_lateral_g: 1.1,
            time_full_throttle_pct: 55,
            balance_indicator: 'oversteer_on_braking',
            suspension_front_left: { avg: 0.55, max: 0.78, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.30, max: 0.50, pct_bottoming_out: 0 },
            peak_power_hp: 340,
            peak_torque_nm: 400,
          },
        },
        userMessage: "The car is really unstable under braking. When I brake hard for corners the rear end swings around and I nearly spin. It feels like the back wheels are locking up before the fronts.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 17: Drift — Bogging down / no power mid-drift
  // ─────────────────────────────────────────────────
  {
    id: 'drift-bogging-down',
    name: 'Drift: Car bogs down mid-drift, runs out of revs (low HP AE86)',
    description: 'Driver has a low-HP drift car that bogs down mid-drift — the engine drops out of the powerband and the drift dies. Telemetry shows low RPM during slides. Should suggest adjusting final drive (shorter gearing), or suggest the user check if they need a gear ratio tune. Could also suggest lowering diff decel so engine doesn\'t brake as hard on transitions. Should NOT suggest tire pressure or ARBs as primary fix.',
    expectedFixes: ['shorter final drive', 'lower gear ratios', 'reduce diff decel'],
    wrongFixes: ['tire pressure', 'ARB changes', 'spring changes'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4500,
          car_memory: {
            car_name: 'Toyota AE86 Trueno',
            discipline: 'Drifting',
            hp_tier: 'Low HP',
            tune: {
              diff_accel: '75',
              diff_decel: '35',
              final_drive: '3.70',
              tire_pressure_rl: '2.3',
              tire_pressure_rr: '2.3',
              arb_rear: '28',
            },
            parts: { drivetrain_layout: 'RWD', aspiration: 'Turbo', transmission: 'Race' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 58,
            avg_rear_slip_angle_deg: 18,
            avg_front_slip_angle_deg: 7,
            peak_rear_slip_ratio: 0.8,
            avg_rear_slip_ratio: 0.35,
            avg_engine_rpm: 3800,
            peak_engine_rpm: 5200,
            redline_rpm: 8500,
            time_below_4000_rpm_pct: 62,
            peak_power_hp: 310,
            peak_torque_nm: 350,
          },
        },
        userMessage: "When I'm mid-drift the engine just dies. Like it drops RPM and I can feel it bogging down, then the drift fades because there's no power. I'm in 3rd gear and it's just falling flat.",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // SCENARIO 18: Drift — Rear suspension bottoming out
  // ─────────────────────────────────────────────────
  {
    id: 'drift-suspension-bottoming',
    name: 'Drift: Rear suspension bottoming out during slides (Silvia)',
    description: 'Driver has a drift Silvia where the rear suspension compresses fully during aggressive drifts, causing sudden grip changes and unpredictable snaps. Telemetry clearly shows rear bottoming out. Should suggest stiffening rear springs, raising rear ride height, or increasing rear bump damping. Should NOT suggest tire pressure or diff as primary fix.',
    expectedFixes: ['stiffen rear springs', 'raise rear ride height', 'increase rear bump damping'],
    wrongFixes: ['tire pressure changes', 'diff changes', 'ARB as primary fix'],
    turns: [
      {
        context: {
          current_state: 'READY',
          vehicle_id: 4600,
          car_memory: {
            car_name: 'Nissan Silvia S15 Spec-R',
            discipline: 'Drifting',
            hp_tier: 'High HP',
            tune: {
              spring_front: '70.0',
              spring_rear: '65.0',
              ride_height_front: '12.0',
              ride_height_rear: '12.5',
              bump_front: '7.0',
              bump_rear: '6.5',
              rebound_front: '5.5',
              rebound_rear: '5.0',
              diff_accel: '80',
              diff_decel: '25',
            },
            parts: { drivetrain_layout: 'RWD', springs_type: 'Race', aspiration: 'Twin Turbo' },
            past_modifications: [],
          },
          telemetry_summary: {
            avg_speed_kmh: 82,
            avg_rear_slip_angle_deg: 28,
            peak_rear_slip_ratio: 1.7,
            avg_rear_slip_ratio: 0.75,
            peak_lateral_g: 0.92,
            suspension_front_left: { avg: 0.45, max: 0.70, pct_bottoming_out: 0 },
            suspension_front_right: { avg: 0.43, max: 0.68, pct_bottoming_out: 0 },
            suspension_rear_left: { avg: 0.78, max: 1.0, pct_bottoming_out: 35 },
            suspension_rear_right: { avg: 0.75, max: 1.0, pct_bottoming_out: 28 },
            peak_power_hp: 720,
            peak_torque_nm: 810,
          },
        },
        userMessage: "The car feels really unpredictable when I'm deep into a drift. Sometimes it suddenly snaps or grips up out of nowhere. I feel like the suspension is hitting the bump stops hard.",
      },
    ],
  },
];

module.exports = { SCENARIOS };
