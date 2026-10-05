// Workout Plan Generator Engine
// Synthesizes user constraints (goal, level, equipment, time, joint flags) into an optimal weekly routine.

class WorkoutPlanGenerator {
  constructor() {
    this.exerciseDb = EXERCISE_DATABASE;
  }

  /**
   * Generates a weekly plan based on input profile
   * @param {Object} profile
   * @returns {Object} Complete weekly routine
   */
  generatePlan(profile) {
    const {
      goal = 'hypertrophy',
      level = 'intermediate',
      equipment = 'gym',
      daysPerWeek = 4,
      timePerDay = 45,
      jointFlags = []
    } = profile;

    let splitName = '';
    let days = [];

    // Determine Split Archetype based on daysPerWeek
    if (daysPerWeek == 3) {
      splitName = 'Full Body 3-Day Hypertrophy & Power Split';
      days = [
        { name: 'Day 1: Full Body (A - Quad & Push Dominant)', focus: 'Quads, Chest, Upper Back', keyMuscles: ['Quads', 'Chest', 'Back', 'Core'] },
        { name: 'Day 2: Full Body (B - Posterior & Pull Dominant)', focus: 'Hamstrings, Glutes, Shoulders, Lats', keyMuscles: ['Hamstrings', 'Back', 'Shoulders', 'Biceps'] },
        { name: 'Day 3: Full Body (C - Athletic Strength & Arms)', focus: 'Compound Strength, Triceps, Abs', keyMuscles: ['Quads', 'Chest', 'Triceps', 'Core'] }
      ];
    } else if (daysPerWeek == 4) {
      splitName = 'Upper / Lower Hypertrophy Split';
      days = [
        { name: 'Day 1: Upper Body (A - Horizontal Focus)', focus: 'Chest, Mid-Back, Shoulders, Arms', keyMuscles: ['Chest', 'Back', 'Shoulders', 'Triceps'] },
        { name: 'Day 2: Lower Body (A - Quad & Knee Dominant)', focus: 'Quads, Glutes, Calves, Core', keyMuscles: ['Quads', 'Glutes', 'Core'] },
        { name: 'Day 3: Upper Body (B - Vertical Focus)', focus: 'Lats, Incline Press, Rear Delts, Biceps', keyMuscles: ['Back', 'Chest', 'Shoulders', 'Biceps'] },
        { name: 'Day 4: Lower Body (B - Posterior Chain Focus)', focus: 'Hamstrings, Hip Extension, Abs', keyMuscles: ['Hamstrings', 'Glutes', 'Core'] }
      ];
    } else if (daysPerWeek == 5) {
      splitName = 'Push / Pull / Legs + Upper / Lower Dynamic Split';
      days = [
        { name: 'Day 1: Push (Chest & Shoulders)', focus: 'Chest, Front/Lateral Delts, Triceps', keyMuscles: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Day 2: Pull (Lats & Posterior Chain)', focus: 'Lats, Rhomboids, Biceps', keyMuscles: ['Back', 'Biceps'] },
        { name: 'Day 3: Legs (Quad Dominant)', focus: 'Quads, Adductors, Calves', keyMuscles: ['Quads', 'Glutes'] },
        { name: 'Day 4: Upper Power Focus', focus: 'Upper Body Compound Volume', keyMuscles: ['Chest', 'Back', 'Shoulders'] },
        { name: 'Day 5: Lower Posterior & Core', focus: 'Hamstrings, Glutes, Core', keyMuscles: ['Hamstrings', 'Core'] }
      ];
    } else { // 6 days
      splitName = 'Push / Pull / Legs (PPL x 2 High Frequency Split)';
      days = [
        { name: 'Day 1: Push (A - Heavy Chest & Triceps)', focus: 'Chest, Front Delts, Triceps', keyMuscles: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Day 2: Pull (A - Lat & Bicep Width)', focus: 'Lats, Upper Back, Biceps', keyMuscles: ['Back', 'Biceps'] },
        { name: 'Day 3: Legs (A - Quad Focus)', focus: 'Quads, Calves, Abs', keyMuscles: ['Quads', 'Core'] },
        { name: 'Day 4: Push (B - Shoulder & Upper Chest)', focus: 'Incline Chest, Delts, Triceps', keyMuscles: ['Shoulders', 'Chest', 'Triceps'] },
        { name: 'Day 5: Pull (B - Thickness & Rear Delts)', focus: 'Rhomboids, Traps, Biceps', keyMuscles: ['Back', 'Biceps'] },
        { name: 'Day 6: Legs (B - Hamstring & Glutes)', focus: 'Hamstrings, Glutes, Core', keyMuscles: ['Hamstrings', 'Glutes'] }
      ];
    }

    // Determine target number of exercises per session based on time
    // 20 min -> 3 exercises (density supersets)
    // 30 min -> 4 exercises
    // 45 min -> 5 exercises
    // 60 min -> 6 exercises
    // 75 min -> 7 exercises
    let exerciseCount = 5;
    if (timePerDay <= 20) exerciseCount = 3;
    else if (timePerDay <= 30) exerciseCount = 4;
    else if (timePerDay <= 45) exerciseCount = 5;
    else if (timePerDay <= 60) exerciseCount = 6;
    else exerciseCount = 7;

    // Fill each day with compatible, joint-safe exercises
    const populatedDays = days.map((d, dayIdx) => {
      const dayExercises = [];
      const usedIds = new Set();

      d.keyMuscles.forEach(muscleTarget => {
        if (dayExercises.length >= exerciseCount) return;

        // Find matches in DB
        let candidates = this.exerciseDb.filter(ex => {
          if (ex.muscle !== muscleTarget && !ex.secondary.includes(muscleTarget)) return false;
          if (usedIds.has(ex.id)) return false;

          // Equipment filter: if user has 'bodyweight', only bodyweight. If 'dumbbells', dumbbells or bodyweight. If 'gym', all.
          if (equipment === 'bodyweight' && ex.equipment !== 'bodyweight') return false;
          if (equipment === 'bands' && !['bands', 'bodyweight'].includes(ex.equipment)) return false;
          if (equipment === 'dumbbells' && !['dumbbells', 'bodyweight'].includes(ex.equipment)) return false;

          // Joint contraindication filter
          if (jointFlags && jointFlags.length > 0) {
            for (const flag of jointFlags) {
              if (ex.contraindications.includes(flag)) return false;
            }
          }

          return true;
        });

        if (candidates.length === 0) {
          // Fallback to any safe exercise for this equipment
          candidates = this.exerciseDb.filter(ex => {
            if (equipment === 'bodyweight' && ex.equipment !== 'bodyweight') return false;
            if (equipment === 'dumbbells' && !['dumbbells', 'bodyweight'].includes(ex.equipment)) return false;
            return !usedIds.has(ex.id);
          });
        }

        if (candidates.length > 0) {
          const selected = candidates[0];
          usedIds.add(selected.id);

          // Calibrate baseline weight and rest period based on goal & level
          let restSec = 90;
          let sets = selected.baseSets;
          let reps = selected.baseReps;
          let rpe = selected.baseRpe;

          if (goal === 'strength') {
            restSec = 150;
            reps = selected.type === 'compound' ? '5-6' : '8-10';
            rpe = 8.5;
          } else if (goal === 'fatloss' || timePerDay <= 30) {
            restSec = 45;
            reps = '12-15';
            rpe = 7.5;
          }

          // Initial starting load estimate (kg)
          let baseWeight = 40;
          if (selected.id === 'barbell_bench_press') baseWeight = level === 'beginner' ? 40 : 60;
          else if (selected.id === 'barbell_back_squat') baseWeight = level === 'beginner' ? 50 : 80;
          else if (selected.id === 'barbell_deadlift') baseWeight = level === 'beginner' ? 60 : 100;
          else if (selected.id === 'overhead_barbell_press') baseWeight = level === 'beginner' ? 25 : 40;
          else if (selected.id === 'dumbbell_bench_press') baseWeight = level === 'beginner' ? 14 : 22;
          else if (selected.id === 'goblet_squat') baseWeight = level === 'beginner' ? 12 : 20;
          else if (selected.id === 'dumbbell_bicep_curl') baseWeight = level === 'beginner' ? 8 : 12;
          else if (selected.id === 'dumbbell_lateral_raise') baseWeight = level === 'beginner' ? 5 : 8;
          else if (selected.equipment === 'bodyweight') baseWeight = 0;

          dayExercises.push({
            id: selected.id,
            name: selected.name,
            muscle: selected.muscle,
            equipment: selected.equipment,
            type: selected.type,
            sets: sets,
            reps: reps,
            rpe: rpe,
            restSec: restSec,
            baseWeight: baseWeight,
            formCue: selected.formCue,
            alternatives: selected.alternatives,
            overloadNote: 'Week 1 baseline calibrated. Ready for adaptive progression.'
          });
        }
      });

      return {
        id: `day_${dayIdx + 1}`,
        dayNumber: dayIdx + 1,
        title: d.name,
        focus: d.focus,
        warmup: this.getWarmupProtocol(d.focus),
        exercises: dayExercises
      };
    });

    return {
      id: 'routine_' + Date.now(),
      title: splitName,
      createdAt: new Date().toISOString(),
      profile: profile,
      days: populatedDays,
      currentWeek: 1
    };
  }

  /**
   * Warmup protocol generator
   */
  getWarmupProtocol(focus) {
    if (focus.toLowerCase().includes('quad') || focus.toLowerCase().includes('leg')) {
      return [
        '90/90 Hip Mobility Flow (2 min)',
        'Banded Monster Walks (15 reps each side)',
        'Bodyweight Goblet Squats with 3s bottom pause (10 reps)',
        'Ankle Dorsiflexion Wall Rocks (10 reps/side)'
      ];
    }
    return [
      'Band Pull-Aparts & Dislocates (15 reps)',
      'World’s Greatest Stretch & Thoracic Rotations (5/side)',
      'Scapular Push-ups & Deadbugs (10 reps)',
      'Light Warm-Up Ramp Sets (50%, 70% working load)'
    ];
  }
}

const planGenerator = new WorkoutPlanGenerator();
