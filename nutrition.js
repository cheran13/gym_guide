// Nutrition Planner with Indian & Global Cuisine Meal Plans and Interactive Food Log

class NutritionPlanner {
  constructor() {
    this.userProfile = this.loadNutritionProfile();
    this.loggedFoods = this.loadLoggedFoods();
    this.waterGlasses = parseInt(localStorage.getItem('pulsefit_water') || '6', 10);
  }

  loadNutritionProfile() {
    try {
      const stored = localStorage.getItem('pulsefit_nutrition_profile');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return {
      gender: 'male',
      age: 26,
      weight: 74, // kg
      height: 175, // cm
      activity: 'moderate', // 1.55 multiplier
      goal: 'hypertrophy', // +300 kcal
      cuisinePreference: 'indian-veg'
    };
  }

  saveNutritionProfile() {
    localStorage.setItem('pulsefit_nutrition_profile', JSON.stringify(this.userProfile));
  }

  loadLoggedFoods() {
    try {
      const stored = localStorage.getItem('pulsefit_logged_foods');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Realistic pre-logged items for instant visual appeal
    return [
      { id: 'log_1', name: 'Moong Dal & Paneer Cheela (2 pcs)', calories: 310, protein: 22, carbs: 34, fat: 9, time: 'Breakfast' },
      { id: 'log_2', name: 'Low-Fat Paneer (100g)', calories: 180, protein: 24, carbs: 4, fat: 7, time: 'Lunch' },
      { id: 'log_3', name: 'Soya Chunks / Meal-maker (50g raw)', calories: 172, protein: 26, carbs: 16, fat: 0.5, time: 'Lunch' },
      { id: 'log_4', name: 'Whey Protein Isolate (1 scoop)', calories: 120, protein: 27, carbs: 1.5, fat: 0.5, time: 'Post-Workout' }
    ];
  }

  saveLoggedFoods() {
    localStorage.setItem('pulsefit_logged_foods', JSON.stringify(this.loggedFoods));
  }

  /**
   * Calculates Basal Metabolic Rate (BMR) & Total Daily Energy Expenditure (TDEE) via Mifflin-St Jeor
   */
  calculateTargets() {
    const { gender, age, weight, height, activity, goal } = this.userProfile;

    // BMR
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'female' ? -161 : 5);

    // Activity Multiplier
    const mults = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very: 1.725
    };
    const tdee = Math.round(bmr * (mults[activity] || 1.55));

    // Goal Calorie Offset
    let targetCalories = tdee;
    if (goal === 'fatloss') targetCalories = tdee - 500;
    else if (goal === 'hypertrophy') targetCalories = tdee + 300;

    // Protein: 2.0g per kg for lifting / muscle retention
    const targetProtein = Math.round(weight * 2.0);
    // Fat: 25% of calories
    const targetFat = Math.round((targetCalories * 0.25) / 9);
    // Carbs: Remaining calories
    const proteinCals = targetProtein * 4;
    const fatCals = targetFat * 9;
    const remainingCals = Math.max(0, targetCalories - (proteinCals + fatCals));
    const targetCarbs = Math.round(remainingCals / 4);

    const waterTargetLiters = (weight * 0.035).toFixed(1);

    return {
      tdee,
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat,
      waterLiters: waterTargetLiters
    };
  }

  // Daily Totals from Logged Foods
  getLoggedTotals() {
    return this.loggedFoods.reduce((acc, item) => {
      acc.calories += (item.calories || 0);
      acc.protein += (item.protein || 0);
      acc.carbs += (item.carbs || 0);
      acc.fat += (item.fat || 0);
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  addFood(foodItem) {
    const logEntry = {
      id: 'log_' + Date.now(),
      name: foodItem.name,
      calories: parseFloat(foodItem.calories) || 0,
      protein: parseFloat(foodItem.protein) || 0,
      carbs: parseFloat(foodItem.carbs) || 0,
      fat: parseFloat(foodItem.fat) || 0,
      time: foodItem.time || 'Snack'
    };
    this.loggedFoods.push(logEntry);
    this.saveLoggedFoods();
  }

  removeFood(id) {
    this.loggedFoods = this.loggedFoods.filter(f => f.id !== id);
    this.saveLoggedFoods();
  }

  addWaterGlass() {
    this.waterGlasses++;
    localStorage.setItem('pulsefit_water', this.waterGlasses.toString());
  }

  resetWater() {
    this.waterGlasses = 0;
    localStorage.setItem('pulsefit_water', '0');
  }

  resetDailyLog() {
    this.loggedFoods = [];
    this.saveLoggedFoods();
  }
}

const nutritionPlanner = new NutritionPlanner();
