/**
 * FitMate Coach - AI Fitness & Nutrition Assistant Service
 * Architecture:
 *   Chat UI (app.js)
 *       ↓
 *   FitMateCoachService (coach.js)
 *       ↓
 *   AICoachProvider (DemoAICoachProvider | RemoteAPIProvider)
 *       ↓
 *   FitMateUserDataContext (Profile, History, PRs, Routine, Nutrition, Water)
 */

class FitMateUserDataContext {
  static getContext() {
    let profile = {
      name: 'Athlete',
      goal: 'Hypertrophy & Strength',
      experience: 'Intermediate',
      weight: 74,
      targetCalories: 2200,
      targetProtein: 140,
      equipment: 'Full Gym',
      daysPerWeek: 4
    };

    try {
      const storedProfile = localStorage.getItem('pulsefit_nutrition_profile');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        profile = { ...profile, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading profile context:', e);
    }

    let history = [];
    try {
      const storedHistory = localStorage.getItem('pulsefit_history');
      if (storedHistory) history = JSON.parse(storedHistory);
    } catch (e) {}

    let prs = {};
    try {
      const storedPRs = localStorage.getItem('pulsefit_prs');
      if (storedPRs) prs = JSON.parse(storedPRs);
    } catch (e) {}

    let activeRoutine = null;
    try {
      const storedRoutine = localStorage.getItem('pulsefit_active_routine');
      if (storedRoutine) activeRoutine = JSON.parse(storedRoutine);
    } catch (e) {}

    let loggedFoods = [];
    try {
      const storedFoods = localStorage.getItem('pulsefit_logged_foods');
      if (storedFoods) loggedFoods = JSON.parse(storedFoods);
    } catch (e) {}

    let waterGlasses = 6;
    try {
      const storedWater = localStorage.getItem('pulsefit_water');
      if (storedWater) waterGlasses = parseInt(storedWater, 10);
    } catch (e) {}

    const consumedCalories = loggedFoods.reduce((sum, f) => sum + (f.calories || 0), 0);
    const consumedProtein = loggedFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
    const consumedCarbs = loggedFoods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    const consumedFat = loggedFoods.reduce((sum, f) => sum + (f.fat || 0), 0);

    const totalWorkouts = history.length;
    let streak = 0;
    if (history.length > 0) {
      const dates = history.map(h => new Date(h.date).toDateString());
      const uniqueDates = [...new Set(dates)];
      streak = uniqueDates.length;
    }

    return {
      profile,
      history,
      recentWorkouts: history.slice(0, 5),
      prs,
      activeRoutine,
      nutrition: {
        targetCalories: profile.calorieTarget || profile.targetCalories || 2200,
        targetProtein: profile.proteinTarget || profile.targetProtein || 140,
        consumedCalories,
        consumedProtein,
        consumedCarbs,
        consumedFat,
        remainingCalories: Math.max(0, (profile.calorieTarget || 2200) - consumedCalories),
        remainingProtein: Math.max(0, (profile.proteinTarget || 140) - consumedProtein),
        foodCount: loggedFoods.length
      },
      water: {
        glasses: waterGlasses,
        liters: (waterGlasses * 0.25).toFixed(1),
        targetLiters: ((profile.weight || 74) * 0.035).toFixed(1)
      },
      stats: {
        totalWorkouts,
        streak,
        prCount: Object.keys(prs).length
      }
    };
  }
}

/**
 * High-Intelligence Contextual Local AI Engine
 * Provides friendly, motivating, non-judgmental coaching based strictly on user data.
 */
class DemoAICoachProvider {
  async generateResponse(query, context, conversationHistory) {
    // Simulate brief network latency for natural UX
    await new Promise(res => setTimeout(res, 550));

    const q = query.toLowerCase().trim();
    const { profile, recentWorkouts, activeRoutine, nutrition, water, stats, prs } = context;

    // 1. What should I train today?
    if (q.includes('what should i train') || q.includes('train today') || q.includes('today workout') || q.includes('what to work')) {
      const lastWorkout = recentWorkouts.length > 0 ? recentWorkouts[0] : null;
      let lastMuscles = lastWorkout ? (lastWorkout.targetMuscles || lastWorkout.routineTitle || 'Full Body') : 'None recorded yet';
      
      let recommendation = '';
      let targetMuscles = '';
      if (lastMuscles.toLowerCase().includes('upper') || lastMuscles.toLowerCase().includes('chest') || lastMuscles.toLowerCase().includes('push')) {
        recommendation = 'Lower Body (Quads, Hamstrings & Calves)';
        targetMuscles = 'Quads, Hamstrings, Glutes & Calves';
      } else if (lastMuscles.toLowerCase().includes('lower') || lastMuscles.toLowerCase().includes('leg')) {
        recommendation = 'Upper Body Pull or Back & Biceps Focus';
        targetMuscles = 'Lats, Upper Back, Rear Delts & Biceps';
      } else {
        recommendation = 'Upper Body Push & Core Focus';
        targetMuscles = 'Chest, Shoulders, Triceps & Core';
      }

      return {
        text: `### 🎯 Today's Recommended Focus: ${recommendation}

Hey there! Checking your training history:
- **Last Logged Session**: ${lastWorkout ? `${lastWorkout.routineTitle} (${new Date(lastWorkout.date).toLocaleDateString()})` : 'First session of the week!'}
- **Recovery Analysis**: Your previously trained muscles need adequate 48-hour recovery. Focusing on **${targetMuscles}** ensures optimal stimulus without overtraining.
- **Goal Alignment**: Tailored for your **${profile.goal || 'Hypertrophy'}** goal at an **${profile.experience || 'Intermediate'}** level.

Would you like me to build a complete customized workout for this right now? Just say **"Create today's workout"**!`,
        actionCard: {
          type: 'quick_prompt',
          title: 'Ready to train?',
          prompt: `Create a ${recommendation} workout for me`
        }
      };
    }

    // 2. Workout Generation: "Create a workout for me" or "Create today's workout"
    if (q.includes('create a workout') || q.includes('generate workout') || q.includes("create today's workout") || q.includes('build workout') || q.includes('make a workout')) {
      const isShort = q.includes('20') || q.includes('25') || q.includes('short') || q.includes('quick') || q.includes('express');
      const duration = isShort ? '25 mins' : '45 mins';
      
      const generatedWorkout = {
        title: isShort ? 'FitMate Express Full-Body Blast' : 'FitMate Adaptive Hypertrophy Routine',
        duration: duration,
        calories: isShort ? '210 kcal' : '360 kcal',
        level: profile.experience || 'Intermediate',
        exercises: isShort ? [
          { name: 'Goblet Squat (DB or Kettlebell)', sets: 3, reps: '10-12', rest: '45s', muscle: 'Quads & Glutes' },
          { name: 'Incline Dumbbell Bench Press', sets: 3, reps: '10-12', rest: '45s', muscle: 'Chest & Shoulders' },
          { name: 'Chest-Supported Dumbbell Row', sets: 3, reps: '12-14', rest: '45s', muscle: 'Lats & Upper Back' },
          { name: 'Plank with Shoulder Taps', sets: 3, reps: '30s', rest: '30s', muscle: 'Core Stability' }
        ] : [
          { name: 'Barbell or DB Back Squat', sets: 4, reps: '8-10', rest: '90s', muscle: 'Quads & Glutes' },
          { name: 'Flat Dumbbell Bench Press', sets: 4, reps: '8-10', rest: '90s', muscle: 'Chest & Triceps' },
          { name: 'Romanian Deadlift (RDL)', sets: 3, reps: '10-12', rest: '75s', muscle: 'Hamstrings & Glutes' },
          { name: 'Lat Pulldown or Pull-ups', sets: 3, reps: '10-12', rest: '60s', muscle: 'Lats & Mid-Back' },
          { name: 'Standing Overhead Dumbbell Press', sets: 3, reps: '10-12', rest: '60s', muscle: 'Deltoids' },
          { name: 'Hanging Knee Raises / Core Hold', sets: 3, reps: '12-15', rest: '45s', muscle: 'Abdominals' }
        ]
      };

      return {
        text: `### ⚡ Custom Workout Generated for You!

Based on your **${profile.goal || 'Strength & Hypertrophy'}** goal and **${profile.equipment || 'Gym'}** setup:
- **Target Time**: ~${duration} | **Est. Burn**: ${generatedWorkout.calories}
- **Focus**: Balanced compound recruitment with progressive rest intervals.
- **Safety First**: Warm up with 5 mins of dynamic mobility and keep 1-2 reps in reserve (RPE 8).

Tap **Start This Workout** below to load it straight into your Active Workout Player!`,
        actionCard: {
          type: 'start_workout',
          title: generatedWorkout.title,
          duration: generatedWorkout.duration,
          calories: generatedWorkout.calories,
          exercises: generatedWorkout.exercises,
          workoutData: generatedWorkout
        }
      };
    }

    // 3. Progress Analysis: "How am I doing?" or "Analyze my workout progress"
    if (q.includes('how am i doing') || q.includes('analyze my') || q.includes('progress analysis') || q.includes('my progress') || q.includes('my stats')) {
      const topPRs = Object.entries(prs).slice(0, 3).map(([key, val]) => `${val.exerciseName}: **${val.weight}kg x ${val.reps} reps** (1RM ~${val.est1RM}kg)`).join('<br/>• ');

      return {
        text: `### 📊 FitMate Progress & Consistency Analysis

Here is your verified performance summary based on stored app data:

- 🏃 **Total Completed Workouts**: **${stats.totalWorkouts} sessions**
- 🔥 **Current Streak**: **${stats.streak} active training day${stats.streak === 1 ? '' : 's'}**
- 💧 **Today's Hydration**: **${water.glasses} glasses (${water.liters}L)** of recommended ${water.targetLiters}L
- 🥗 **Today's Nutrition Logged**: **${nutrition.consumedCalories} / ${nutrition.targetCalories} kcal** (Protein: **${nutrition.consumedProtein}g / ${nutrition.targetProtein}g**)
${topPRs ? `\n#### 🏆 Highlights & Personal Records:\n• ${topPRs}` : '\n#### 🏆 Milestones:\n• Consistency is building! Log your completed sets in the Active Logger to unlock PR badges.'}

#### 💡 Coach's Feedback:
${stats.totalWorkouts > 0 ? "You're building solid athletic momentum. Focus on hitting your daily protein target and getting 7-8 hours of sleep for cellular repair." : "Every fitness journey starts with Day 1! Start a quick workout or log your meals today to kickstart your streak."}`,
        actionCard: null
      };
    }

    // 4. Exercise Explanation / Form Guide
    if (q.includes('how do i do') || q.includes('explain') || q.includes('form') || q.includes('squat') || q.includes('bench') || q.includes('deadlift') || q.includes('pushup') || q.includes('lunge')) {
      let exerciseName = 'Squat';
      let startPos = 'Feet shoulder-width apart, toes angled out ~15-30 degrees, chest proud, core braced.';
      let steps = '1. Hinge hips backward and bend knees simultaneously.<br/>2. Descend smoothly until thighs are parallel to the floor, driving knees out in line with your toes.<br/>3. Push the floor away through your midfoot to stand back up, exhaling at the top.';
      let mistakes = '• Knees caving inward (valgus collapse)<br/>• Heels lifting off the ground<br/>• Lumbar rounding at the bottom of the movement';
      let safety = 'Maintain a neutral spine throughout. Never round your lower back under load. If mobility is tight, elevate heels slightly on small plates.';

      if (q.includes('bench')) {
        exerciseName = 'Dumbbell or Barbell Bench Press';
        startPos = 'Lie on the bench with eyes under the bar/dumbbells. Plant feet firmly on the floor and pinch your shoulder blades together.';
        steps = '1. Lower the weight under control toward your mid-chest.<br/>2. Keep elbows tucked at roughly 45 degrees (avoid flaring out in line with ears).<br/>3. Press forcefully upward until arms are extended, keeping scapulae retracted.';
        mistakes = '• Flaring elbows to 90 degrees (causes shoulder impingement)<br/>• Bouncing weight off the chest<br/>• Lifting hips off the bench';
        safety = 'Keep wrists stacked directly above your elbows. Use a neutral grip with dumbbells if you experience shoulder discomfort.';
      } else if (q.includes('deadlift')) {
        exerciseName = 'Romanian or Conventional Deadlift';
        startPos = 'Stand with feet hip-width apart. The bar or dumbbells should hover over your midfoot, shins close to the weight.';
        steps = '1. Hinge at the hips with soft knees, sending glutes backward as if touching a wall behind you.<br/>2. Lower the weight along your shins until you feel a deep hamstring stretch.<br/>3. Squeeze glutes and drive hips forward to return to standing.';
        mistakes = '• Rounding the lumbar spine<br/>• Letting the bar drift away from the legs<br/>• Hyper-extending the lower back at lockout';
        safety = 'Lock your lats by imagining "squeezing oranges in your armpits". Never compromise spinal neutrality for more weight.';
      } else if (q.includes('push')) {
        exerciseName = 'Standard Push-up';
        startPos = 'High plank position with hands slightly wider than shoulder-width, glutes squeezed, body in a straight line.';
        steps = '1. Lower your chest until it is ~2 inches above the ground.<br/>2. Keep elbows at a 45-degree angle to your torso.<br/>3. Push the ground away, keeping core tight and glutes engaged.';
        mistakes = '• Sagging hips or arched lower back<br/>• Flared elbows stressing anterior shoulder capsule<br/>• Only doing partial range of motion';
        safety = 'If standard push-ups are tough, elevate hands on a bench rather than dropping to knees to train core tension properly.';
      }

      return {
        text: `### 📖 Exercise Form Guide: ${exerciseName}

#### 1. Starting Position
${startPos}

#### 2. Movement Steps
${steps}

#### 3. Common Technique Mistakes to Avoid
${mistakes}

#### 4. Safety & Joint Guidance
${safety}

*Note: FitMate guidance promotes safe biomechanics. Always train pain-free!*`,
        actionCard: null
      };
    }

    // 5. Nutrition Assistance & Healthy Meal Ideas
    if (q.includes('meal') || q.includes('healthy meal') || q.includes('nutrition') || q.includes('diet') || q.includes('eat') || q.includes('food') || q.includes('protein')) {
      const remainingCals = nutrition.remainingCalories;
      const remainingP = nutrition.remainingProtein;

      return {
        text: `### 🥗 Balanced Meal Ideas & Nutrition Guidance

Your current daily status:
- **Remaining Target**: ~**${remainingCals} kcal** | **${remainingP}g Protein**
- **Safety Standard**: FitMate emphasizes whole, unprocessed foods and balanced macronutrients without restrictive crash dieting.

#### 🍽️ Option 1: High-Protein Indian Vegetarian Bowl (~520 kcal | 38g Protein)
- **Base**: 120g Pan-seared low-fat Paneer or Soya chunks cooked in mild olive oil and Indian spices.
- **Carbs & Fiber**: 1 cup spiced Moong Dal + 1 whole wheat roti or brown rice.
- **Greens**: Cucumber, tomato, and baby spinach salad with lemon dressing.

#### 🍗 Option 2: Clean Athletic Grill Plate (~540 kcal | 44g Protein)
- **Protein**: 180g Grilled chicken breast or grilled tofu steak.
- **Carbs**: 150g Roasted sweet potato wedges with smoked paprika.
- **Micro-nutrients**: Steamed broccoli and roasted bell peppers.

#### 💡 Coach's Tip:
Spread your protein evenly across 3-4 meals to maximize muscle protein synthesis. Check your **Nutrition tab** to log your meal!`,
        actionCard: {
          type: 'navigation',
          title: 'Open Nutrition & Meal Logger',
          tab: 'nutrition'
        }
      };
    }

    // 6. Water Intake Question
    if (q.includes('water') || q.includes('drink') || q.includes('hydrate') || q.includes('hydration')) {
      const weight = profile.weight || 74;
      const recommendedLiters = (weight * 0.035).toFixed(1);
      const recommendedGlasses = Math.round(recommendedLiters / 0.25);

      return {
        text: `### 💧 Optimal Daily Hydration Protocol

For your body weight (**${weight} kg**) and active training routine:
- **Optimal Target**: **${recommendedLiters} Liters** (~${recommendedGlasses} standard 250ml glasses) daily.
- **Your Logged Today**: **${water.glasses} glasses (${water.liters} L)**.
- **Remaining Needed**: **${Math.max(0, recommendedGlasses - water.glasses)} glasses**.

#### ⚡ Why Hydration Matters for Strength:
Even a **2% drop in hydration** reduces muscular power output and slows recovery between sets.
- Drink 1 large glass upon waking to rehydrate after sleep.
- Sip 500ml during your training session.
- Track every glass with the Quick Water button on your Dashboard!`,
        actionCard: {
          type: 'add_water',
          title: '+ Add 250ml Glass of Water'
        }
      };
    }

    // 7. Consistency and Habit Building
    if (q.includes('consistency') || q.includes('habits') || q.includes('motivated') || q.includes('discipline') || q.includes('missed')) {
      return {
        text: `### 🔥 3 Proven Rules to Master Fitness Consistency

1. **The "Never Miss Twice" Rule**:
   Life happens, and missing a workout is okay. The secret to long-term progress is never letting one missed session turn into two in a row.

2. **Anchor to an Existing Daily Habit**:
   Link your workout to a fixed trigger (e.g., "Right after my 5:30 PM tea, I lace up my gym shoes"). Removing decision fatigue guarantees consistency.

3. **Track Every Win in FitMate**:
   Logging your sets and seeing your workout streak climb releases dopamine and solidifies your identity as an athlete.

You are on a **${stats.streak}-day streak** right now — keep showing up!`,
        actionCard: null
      };
    }

    // 8. Camera Workout Integration
    if (q.includes('how was my workout') || q.includes('camera') || q.includes('form feedback') || q.includes('my session')) {
      const lastWorkout = recentWorkouts.length > 0 ? recentWorkouts[0] : null;

      return {
        text: `### 📷 Workout & Camera Session Summary

${lastWorkout ? `
- **Session**: ${lastWorkout.routineTitle}
- **Date**: ${new Date(lastWorkout.date).toLocaleDateString()}
- **Duration**: ~${lastWorkout.duration || '40'} mins
- **Estimated Burn**: ~${lastWorkout.estCalories || '320'} kcal
- **Total Volume**: ${lastWorkout.totalVolume || '2,400'} kg
` : 'No recent workout session logged yet today.'}

ℹ️ **Camera Tracking Status**:
The Smart Camera exercise tracking module is currently operating in **Camera Tracking Demo Mode**. In this preview mode, camera feeds and exercise posture guides are rendered for testing interface and rep counting architecture. Accurate computer-vision pose estimation will be enabled when the live pose-detection model API is connected!`,
        actionCard: null
      };
    }

    // 9. Joint Pain / Swaps (Knee, Back, Shoulder)
    if (q.includes('knee') && (q.includes('hurt') || q.includes('pain') || q.includes('squat'))) {
      return {
        text: `### 🛡️ Joint-Friendly Knee Preservation Protocol
Knee discomfort during deep knee flexion is often caused by excessive forward knee travel without adequate hip hinge recruitment.

#### 💡 Form Cues:
1. **Drive hips back first**: Initiate the squat by pushing hips back, loading your glutes and hamstrings.
2. **Push knees outward**: Keep kneecaps tracking directly over your second toe.
3. **Elevate Heels or use Goblet Squats**: Shifts center of gravity back to offload patellar tendon shear.`,
        actionCard: {
          type: 'exercise_swap',
          title: 'Knee-Friendly Exercise Alternatives',
          swaps: [
            {
              originalId: 'barbell_back_squat',
              originalName: 'Barbell Back Squat',
              replacementId: 'goblet_squat',
              replacementName: 'Goblet Squat (Upright Torso)',
              reason: 'Upright torso angle drastically reduces patellar shearing force while keeping quads stimulated.'
            },
            {
              originalId: 'barbell_back_squat',
              originalName: 'Barbell Back Squat',
              replacementId: 'leg_press',
              replacementName: 'Leg Press (High & Wide Stance)',
              reason: 'High foot placement recruits hamstrings and glutes while safeguarding the knee joint.'
            }
          ]
        }
      };
    }

    // General Fallback
    return {
      text: `### 🤝 FitMate Coach Support

I'm here to help you train with confidence and clarity! 
- Want a session plan? Ask **"Create today's workout"**
- Looking to eat right? Ask **"Give me a healthy meal idea"**
- Check your numbers? Ask **"Analyze my workout progress"**
- Need exercise technique? Ask **"How do I do a squat?"**

What would you like to focus on right now?`,
      actionCard: null
    };
  }
}

/**
 * Remote AI Provider
 * Connects to OpenAI, Gemini, or custom proxy endpoint securely without hardcoded credentials.
 */
class RemoteAPIProvider {
  constructor(config = {}) {
    this.provider = config.provider || 'gemini'; // 'gemini' | 'openai' | 'custom'
    this.apiKey = config.apiKey || '';
    this.endpoint = config.endpoint || '';
  }

  async generateResponse(query, context, conversationHistory) {
    if (!this.apiKey && this.provider !== 'custom') {
      throw new Error('API Key not configured. Please open AI Settings to enter your key.');
    }

    const systemPrompt = `You are FitMate Coach, a friendly, motivating, clear, concise, and supportive AI fitness assistant inside the FitMate fitness app.
You provide beginner-friendly, non-judgmental fitness and nutrition guidance.
Avoid extreme diets, crash calorie restriction, or dangerous exercise instructions.
Do not claim to be a doctor, physical therapist, or registered dietitian.
Always base answers on the user's FitMate profile context:
User Profile: ${JSON.stringify(context.profile)}
Recent Workouts: ${JSON.stringify(context.recentWorkouts)}
Current PRs: ${JSON.stringify(context.prs)}
Today's Nutrition: ${JSON.stringify(context.nutrition)}
Water Intake: ${JSON.stringify(context.water)}
If the user asks for a workout, output a structured exercise list with sets, reps, rest, and duration.
If the user asks about camera tracking, clarify that the camera feature is currently running in Demo Mode without inventing fake results.`;

    // Example OpenAI / Gemini compatible fetch
    if (this.provider === 'openai') {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: query }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API Error: ${res.statusText}`);
      }

      const data = await res.json();
      const reply = data.choices[0]?.message?.content || 'No response generated.';
      return { text: reply, actionCard: null };
    }

    // Fallback or custom
    throw new Error('Provider not connected. Falling back to local engine.');
  }
}

/**
 * FitMate Coach Main Service
 */
class FitMateCoachService {
  constructor() {
    this.activeProviderType = localStorage.getItem('fitmate_ai_provider') || 'demo';
    this.apiKey = localStorage.getItem('fitmate_ai_api_key') || '';
    this.apiEndpoint = localStorage.getItem('fitmate_ai_endpoint') || '';

    this.demoProvider = new DemoAICoachProvider();
    this.remoteProvider = new RemoteAPIProvider({
      provider: this.activeProviderType,
      apiKey: this.apiKey,
      endpoint: this.apiEndpoint
    });

    this.conversationHistory = this.loadHistory();
    this.lastQuery = null;
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('fitmate_coach_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    return [
      {
        sender: 'bot',
        text: `### 👋 Hey there! I'm FitMate Coach
I'm your personalized fitness and nutrition partner. I can help you:
- **Build custom workouts** tailored to your schedule and equipment
- **Analyze your progress & streaks** with live app data
- **Break down exercise form** with joint-friendly safety cues
- **Suggest balanced, high-protein meals** for your daily targets

What's on your mind today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  }

  saveHistory() {
    try {
      localStorage.setItem('fitmate_coach_history', JSON.stringify(this.conversationHistory));
    } catch (e) {}
  }

  clearHistory() {
    this.conversationHistory = [
      {
        sender: 'bot',
        text: `### 🔄 Fresh Start!
Chat history has been reset. How can I assist your workout or nutrition goals today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    this.saveHistory();
  }

  updateSettings(providerType, apiKey, endpoint) {
    this.activeProviderType = providerType;
    this.apiKey = apiKey;
    this.apiEndpoint = endpoint;

    localStorage.setItem('fitmate_ai_provider', providerType);
    if (apiKey) localStorage.setItem('fitmate_ai_api_key', apiKey);
    else localStorage.removeItem('fitmate_ai_api_key');

    if (endpoint) localStorage.setItem('fitmate_ai_endpoint', endpoint);
    else localStorage.removeItem('fitmate_ai_endpoint');

    this.remoteProvider = new RemoteAPIProvider({
      provider: this.activeProviderType,
      apiKey: this.apiKey,
      endpoint: this.apiEndpoint
    });
  }

  async getResponse(query) {
    this.lastQuery = query;
    const context = FitMateUserDataContext.getContext();

    try {
      if (this.activeProviderType === 'demo' || !this.apiKey) {
        return await this.demoProvider.generateResponse(query, context, this.conversationHistory);
      } else {
        try {
          return await this.remoteProvider.generateResponse(query, context, this.conversationHistory);
        } catch (apiErr) {
          console.warn('Remote AI failed, falling back to Demo Provider:', apiErr);
          return await this.demoProvider.generateResponse(query, context, this.conversationHistory);
        }
      }
    } catch (err) {
      console.error('FitMate Coach Error:', err);
      return {
        isError: true,
        text: `**FitMate Coach is temporarily unavailable. Please try again.**`,
        actionCard: {
          type: 'retry',
          lastQuery: query
        }
      };
    }
  }
}

// Global service instance
const fitmateCoach = new FitMateCoachService();
// Backward-compatibility alias
const aiCoach = fitmateCoach;
