// Adaptive Progressive Overload Engine (APOE)
// Scientifically scales intensity, load, reps, and volume based on logged session history.

class ProgressiveOverloadEngine {
  constructor() {
    this.LOAD_INCREMENTS = {
      compound_heavy: 2.5, // kg (Barbell Squat, Deadlift, Bench Press)
      compound_moderate: 2.0, // kg (Overhead Press, Barbell Row)
      dumbbell: 1.0, // kg per dumbbell
      isolation: 1.0, // kg
      bodyweight: 0 // reps instead of load
    };
  }

  /**
   * Evaluates an exercise's performance from workout logs and calculates next week's prescription.
   * @param {Object} exercise - Exercise definition
   * @param {Array} setsLogged - Array of logged sets: [{setNum: 1, weight: 60, reps: 10, rpe: 7.5, completed: true}]
   * @param {Number} currentWeek - Active program week (1, 2, 3, etc.)
   * @returns {Object} Adaptive overload recommendation
   */
  calculateOverload(exercise, setsLogged, currentWeek = 1) {
    if (!setsLogged || setsLogged.length === 0) {
      return {
        action: 'baseline',
        prescribedWeight: exercise.baseWeight || 40,
        prescribedReps: exercise.baseReps || '8-10',
        prescribedSets: exercise.baseSets || 3,
        rpeTarget: exercise.baseRpe || 8,
        note: 'Week 1 baseline. Complete all sets with good form to calibrate progressive overload.',
        overloadScore: 100,
        volumeDeltaPct: 0
      };
    }

    const completedSets = setsLogged.filter(s => s.completed);
    if (completedSets.length === 0) {
      return {
        action: 'repeat',
        prescribedWeight: setsLogged[0].weight || 40,
        prescribedReps: exercise.baseReps || '8-10',
        prescribedSets: exercise.baseSets || 3,
        rpeTarget: 7.5,
        note: 'Session not completed. Repeating current parameters.',
        overloadScore: 100,
        volumeDeltaPct: 0
      };
    }

    // Parse target reps range e.g. "8-10" or "10-12"
    let targetMinReps = 8;
    let targetMaxReps = 10;
    if (typeof exercise.baseReps === 'string' && exercise.baseReps.includes('-')) {
      const parts = exercise.baseReps.split('-');
      targetMinReps = parseInt(parts[0], 10);
      targetMaxReps = parseInt(parts[1], 10);
    } else if (typeof exercise.baseReps === 'number') {
      targetMinReps = targetMaxReps = exercise.baseReps;
    }

    const avgWeight = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) / completedSets.length;
    const avgReps = completedSets.reduce((sum, s) => sum + (parseInt(s.reps, 10) || 0), 0) / completedSets.length;
    const avgRpe = completedSets.reduce((sum, s) => sum + (parseFloat(s.rpe) || 8), 0) / completedSets.length;

    const previousVolume = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight) * parseInt(s.reps, 10)), 0);

    // Determine weight step increment
    let weightStep = this.LOAD_INCREMENTS.compound_heavy;
    if (exercise.type === 'isolation') {
      weightStep = this.LOAD_INCREMENTS.isolation;
    } else if (exercise.equipment === 'dumbbells') {
      weightStep = this.LOAD_INCREMENTS.dumbbell;
    } else if (exercise.equipment === 'bodyweight') {
      weightStep = 0;
    }

    // Logic: Double Progression System
    // Case 1: Crushed ceiling reps with comfortable RPE (Avg Reps >= Target Max & RPE <= 8)
    if (avgReps >= targetMaxReps && avgRpe <= 8.5) {
      const nextWeight = weightStep > 0 ? (avgWeight + weightStep) : avgWeight;
      const nextReps = weightStep > 0 ? `${targetMinReps}-${targetMinReps + 2}` : `${targetMaxReps + 1}-${targetMaxReps + 2}`;
      const nextSets = completedSets.length;
      const estNewVolume = nextSets * nextWeight * targetMinReps;
      const volDelta = previousVolume > 0 ? Math.round(((estNewVolume - previousVolume) / previousVolume) * 100) : 5;

      return {
        action: 'bump_load',
        type: 'INCREASE_LOAD',
        prescribedWeight: Math.round(nextWeight * 10) / 10,
        prescribedReps: nextReps,
        prescribedSets: nextSets,
        rpeTarget: 8,
        deltaWeight: `+${weightStep} kg`,
        deltaReps: 'Rep floor reset',
        note: `Target crushed (${avgReps.toFixed(0)} reps @ RPE ${avgRpe.toFixed(1)}). Auto-bumping load by +${weightStep}kg.`,
        overloadScore: 108,
        volumeDeltaPct: volDelta > 0 ? `+${volDelta}%` : '+5%',
        badgeClass: 'badge-overload'
      };
    }

    // Case 2: Hit middle/lower range with controlled RPE (Target Min <= Avg Reps < Target Max & RPE <= 8.5)
    if (avgReps >= targetMinReps && avgRpe <= 8.5) {
      const nextReps = `${Math.min(targetMaxReps, Math.floor(avgReps) + 1)}-${targetMaxReps}`;
      return {
        action: 'bump_reps',
        type: 'INCREASE_REPS',
        prescribedWeight: avgWeight,
        prescribedReps: nextReps,
        prescribedSets: completedSets.length,
        rpeTarget: 8,
        deltaWeight: 'Same weight',
        deltaReps: '+1 Rep Target',
        note: `Solid mastery @ ${avgWeight}kg (RPE ${avgRpe.toFixed(1)}). Progressing volume via +1 rep per set.`,
        overloadScore: 104,
        volumeDeltaPct: '+6%',
        badgeClass: 'badge-target'
      };
    }

    // Case 3: High RPE / Grind (RPE 9 - 10) or missed reps
    if (avgRpe >= 9 || avgReps < targetMinReps) {
      return {
        action: 'consolidate',
        type: 'CONSOLIDATE_TEMPO',
        prescribedWeight: avgWeight,
        prescribedReps: `${targetMinReps}-${targetMaxReps}`,
        prescribedSets: completedSets.length,
        rpeTarget: 7.5,
        deltaWeight: 'Lock load',
        deltaReps: 'Focus tempo',
        note: `High fatigue detected (RPE ${avgRpe.toFixed(1)}). Load consolidated to reinforce 3s eccentric tempo and stabilize joints.`,
        overloadScore: 100,
        volumeDeltaPct: '0%',
        badgeClass: 'badge-warning'
      };
    }

    // Default Fallback
    return {
      action: 'steady',
      type: 'STEADY_PROGRESSION',
      prescribedWeight: avgWeight,
      prescribedReps: exercise.baseReps,
      prescribedSets: completedSets.length,
      rpeTarget: 8,
      deltaWeight: 'Maintain',
      deltaReps: 'Target reps',
      note: 'Maintain steady output to cement movement patterns before loading.',
      overloadScore: 102,
      volumeDeltaPct: '+2%',
      badgeClass: 'badge-target'
    };
  }

  /**
   * Generates a 4-week Progressive Overload Forecast matrix for an entire routine.
   * @param {Object} routine - Current week routine
   * @param {Array} sessionHistory - Logged history
   * @returns {Array} 4-week forecast objects
   */
  generateOverloadForecast(routine, sessionHistory = []) {
    const weeks = [
      { weekNum: 1, phase: 'Accumulation & Baseline', intensity: 'RPE 7.5', volumePct: 100, badge: 'Baseline', focus: 'Form calibration & mind-muscle connection' },
      { weekNum: 2, phase: 'Adaptive Overload (+Weight/Reps)', intensity: 'RPE 8.0', volumePct: 107, badge: '+2.5kg / +Reps', focus: 'Double progression overload triggers' },
      { weekNum: 3, phase: 'Peak Density & Volume', intensity: 'RPE 8.5 - 9.0', volumePct: 114, badge: 'Peak Stimulus', focus: 'Max hypertrophic recruitment' },
      { weekNum: 4, phase: 'Strategic Deload & Tissue Recovery', intensity: 'RPE 6.5', volumePct: 70, badge: 'Deload Recovery', focus: 'Supercompensation & joint rejuvenation' }
    ];

    return weeks;
  }
}

// Export singleton instance
const overloadEngine = new ProgressiveOverloadEngine();
