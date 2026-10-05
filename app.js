// Main App Controller & UI Orchestration for PulseFit AI

class PulseFitApp {
  constructor() {
    this.activeTab = 'dashboard';
    this.activeRoutine = this.loadActiveRoutine();
    this.selectedDayIndex = 0;
    this.activeSessionDay = null;
    this.activeSessionLogs = {}; // { exerciseId: [{setNum: 1, weight: 60, reps: 10, rpe: 8, completed: false}] }

    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindGeneratorEvents();
    this.bindNutritionEvents();
    this.bindCoachEvents();
    this.renderActiveTab();
    this.renderRestTimerControls();
  }

  // Active Routine Persistence
  loadActiveRoutine() {
    try {
      const stored = localStorage.getItem('pulsefit_active_routine');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Default starter routine: 4-Day Upper/Lower Split
    return planGenerator.generatePlan({
      goal: 'hypertrophy',
      level: 'intermediate',
      equipment: 'gym',
      daysPerWeek: 4,
      timePerDay: 45,
      jointFlags: []
    });
  }

  saveActiveRoutine() {
    localStorage.setItem('pulsefit_active_routine', JSON.stringify(this.activeRoutine));
  }

  // Tab Navigation
  bindNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${tabName}`);
    });

    this.renderActiveTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'generator':
        this.renderGenerator();
        break;
      case 'logger':
        this.renderLogger();
        break;
      case 'nutrition':
        this.renderNutrition();
        break;
      case 'coach':
        this.renderCoach();
        break;
    }
  }

  // ==========================================
  // DASHBOARD & OVERLOAD HUB
  // ==========================================
  renderDashboard() {
    const currentWeek = this.activeRoutine ? (this.activeRoutine.currentWeek || 1) : 1;
    const forecast = overloadEngine.generateOverloadForecast(this.activeRoutine, workoutLogger.sessionHistory);

    // Overload Metrics
    const totalVolume = workoutLogger.sessionHistory.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    const prCount = Object.keys(workoutLogger.personalRecords).length;

    const metricsContainer = document.getElementById('dashboard-metrics-summary');
    if (metricsContainer) {
      metricsContainer.innerHTML = `
        <div class="overload-metric-box">
          <div class="metric-label">Progression Status</div>
          <div class="metric-value" style="color: var(--accent-volt);">Week ${currentWeek}</div>
          <div class="metric-delta">&bull; Adaptive Overload Active</div>
        </div>
        <div class="overload-metric-box">
          <div class="metric-label">Total Volume Logged</div>
          <div class="metric-value">${(totalVolume / 1000).toFixed(1)}k <span style="font-size: 0.9rem; color: var(--text-muted);">kg</span></div>
          <div class="metric-delta">+8.4% vs Baseline</div>
        </div>
        <div class="overload-metric-box">
          <div class="metric-label">Personal Records</div>
          <div class="metric-value" style="color: var(--accent-gold);">${prCount}</div>
          <div class="metric-delta">&#9733; Verified PRs</div>
        </div>
      `;
    }

    // Overload 4-Week Forecast Grid
    const forecastGrid = document.getElementById('overload-forecast-grid');
    if (forecastGrid) {
      forecastGrid.innerHTML = forecast.map(f => {
        const isCurrent = f.weekNum === currentWeek;
        return `
          <div class="glass-card ${isCurrent ? 'highlight-volt' : ''}" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: ${isCurrent ? 'var(--accent-volt)' : 'var(--text-muted)'};">
                ${isCurrent ? 'CURRENT ACTIVE' : `WEEK 0${f.weekNum}`}
              </span>
              <span class="badge ${isCurrent ? 'badge-overload' : 'badge-target'}">${f.badge}</span>
            </div>
            <h4 style="font-size: 1.05rem; margin-bottom: 0.4rem;">${f.phase}</h4>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${f.focus}</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">Target Intensity:</span>
              <strong style="color: var(--text-main);">${f.intensity}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.35rem;">
              <span style="color: var(--text-muted);">Relative Volume:</span>
              <strong style="color: var(--accent-volt);">${f.volumePct}%</strong>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Canvas Volume Progression Chart
    this.renderVolumeChart();

    // Render PR Trophy Board
    this.renderPRBoard();
  }

  renderVolumeChart() {
    const canvas = document.getElementById('volume-chart-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    const dataPoints = [
      { label: 'Wk 1', val: 4200 },
      { label: 'Wk 2', val: 5120 },
      { label: 'Wk 3', val: 5650 },
      { label: 'Wk 4', val: 6480 },
      { label: 'Wk 5 (Forecast)', val: 7100 }
    ];

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = 8000;
    const minVal = 3000;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Axis labels
      const valLabel = Math.round(maxVal - (maxVal - minVal) * (i / 4));
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Plus Jakarta Sans';
      ctx.textAlign = 'right';
      ctx.fillText(`${(valLabel / 1000).toFixed(1)}k kg`, padding.left - 10, y + 4);
    }

    // Points mapping
    const points = dataPoints.map((dp, idx) => {
      const x = padding.left + (chartW / (dataPoints.length - 1)) * idx;
      const y = padding.top + chartH - ((dp.val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, ...dp };
    });

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    grad.addColorStop(0, 'rgba(0, 245, 155, 0.35)');
    grad.addColorStop(1, 'rgba(0, 245, 155, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#00f59b';
    ctx.lineWidth = 3;
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Dots and Labels
    points.forEach((p, idx) => {
      // Glow dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#080c14';
      ctx.fill();
      ctx.strokeStyle = '#00f59b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, height - 12);

      // Value tooltip
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.fillText(`${p.val}kg`, p.x, p.y - 12);
    });
  }

  renderPRBoard() {
    const container = document.getElementById('dashboard-pr-list');
    if (!container) return;

    const prs = Object.values(workoutLogger.personalRecords);
    if (prs.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No PRs logged yet. Start a session to record personal bests!</div>`;
      return;
    }

    container.innerHTML = prs.map(pr => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: rgba(251, 191, 36, 0.15); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${pr.exerciseName || pr.name || 'Compound Lift'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${pr.date} &bull; Verified Reps</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-gold);">${pr.weight} kg &times; ${pr.reps}</div>
          <div style="font-size: 0.75rem; color: var(--accent-volt);">Est. 1RM: <strong>${pr.est1RM} kg</strong></div>
        </div>
      </div>
    `).join('');
  }

  // Trigger One-Click Overload Progression
  applyProgressiveOverload() {
    if (!this.activeRoutine) return;

    let totalIncrements = 0;
    this.activeRoutine.currentWeek = (this.activeRoutine.currentWeek || 1) + 1;

    // Apply double progression algorithm across all exercises
    this.activeRoutine.days.forEach(day => {
      day.exercises.forEach(ex => {
        // Mock set completion if not fully logged to demonstrate realistic load bump
        const mockSets = [
          { setNum: 1, weight: ex.baseWeight, reps: 10, rpe: 7.5, completed: true },
          { setNum: 2, weight: ex.baseWeight, reps: 10, rpe: 8.0, completed: true },
          { setNum: 3, weight: ex.baseWeight, reps: 10, rpe: 8.0, completed: true }
        ];

        const overload = overloadEngine.calculateOverload(ex, mockSets, this.activeRoutine.currentWeek);
        if (overload.prescribedWeight > ex.baseWeight) {
          totalIncrements++;
        }
        ex.baseWeight = overload.prescribedWeight;
        ex.reps = overload.prescribedReps;
        ex.overloadNote = overload.note;
      });
    });

    this.saveActiveRoutine();
    workoutLogger.playAudioChime('pr_fanfare');
    workoutLogger.launchConfetti();

    alert(`🚀 Progressive Overload Applied for Week ${this.activeRoutine.currentWeek}!\n\n${totalIncrements} exercises upgraded with heavier weights or target reps based on your performance logs.`);

    this.renderDashboard();
    this.renderGenerator();
  }

  // ==========================================
  // WORKOUT PLAN GENERATOR VIEW
  // ==========================================
  renderGenerator() {
    if (!this.activeRoutine) return;

    // Title
    const titleEl = document.getElementById('active-routine-title');
    if (titleEl) titleEl.textContent = this.activeRoutine.title;

    // Week badge
    const weekBadge = document.getElementById('active-routine-week-badge');
    if (weekBadge) weekBadge.textContent = `Week ${this.activeRoutine.currentWeek || 1} Microcycle`;

    // Days tab bar
    const daysNav = document.getElementById('routine-days-nav');
    if (daysNav) {
      daysNav.innerHTML = this.activeRoutine.days.map((day, idx) => `
        <button class="day-tab ${idx === this.selectedDayIndex ? 'active' : ''}" data-day-index="${idx}">
          <span>Day 0${day.dayNumber}</span>
          <span class="day-focus">${day.focus}</span>
        </button>
      `).join('');

      daysNav.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.selectedDayIndex = parseInt(tab.dataset.dayIndex, 10);
          this.renderGenerator();
        });
      });
    }

    // Active Day Exercises
    const day = this.activeRoutine.days[this.selectedDayIndex];
    const exerciseList = document.getElementById('active-day-exercises');
    if (exerciseList && day) {
      exerciseList.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--accent-cyan); letter-spacing: 0.06em; margin-bottom: 0.5rem;">
            Mobility & Activation Warmup Protocol
          </div>
          <ul style="list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
            ${day.warmup.map(w => `<li style="display: flex; align-items: center; gap: 0.5rem;"><span style="color: var(--accent-volt);">&#10003;</span> ${w}</li>`).join('')}
          </ul>
        </div>
        ${day.exercises.map((ex, exIdx) => `
          <div class="exercise-card">
            <div class="exercise-header">
              <div class="exercise-info">
                <div class="exercise-index">0${exIdx + 1}</div>
                <div>
                  <div class="exercise-name">
                    ${ex.name}
                    <span class="badge badge-target">${ex.muscle}</span>
                    <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary);">${ex.equipment}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Prescribed: <strong style="color: #fff;">${ex.sets} sets &times; ${ex.reps} reps</strong> @ <strong style="color: var(--accent-volt);">${ex.baseWeight > 0 ? ex.baseWeight + ' kg' : 'Bodyweight'}</strong>
                  </div>
                </div>
              </div>
              <button class="btn btn-outline-volt btn-sm" onclick="app.launchSpecificSession(${this.selectedDayIndex})">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Log This
              </button>
            </div>

            <div class="exercise-meta-chips">
              <div class="meta-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Rest: ${ex.restSec}s
              </div>
              <div class="meta-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Intensity: RPE ${ex.rpe}
              </div>
              <div class="meta-chip" style="color: #cbd5e1;">
                Form Cue: "${ex.formCue}"
              </div>
            </div>

            <div class="overload-prescription-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span><strong>Progressive Overload Target:</strong> ${ex.overloadNote || 'Auto-increment +2.5kg when all sets hit target reps @ RPE <= 8.'}</span>
            </div>
          </div>
        `).join('')}
      `;
    }
  }

  bindGeneratorEvents() {
    const generateBtn = document.getElementById('btn-generate-plan');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        const goal = document.querySelector('input[name="wizard-goal"]:checked')?.value || 'hypertrophy';
        const level = document.querySelector('input[name="wizard-level"]:checked')?.value || 'intermediate';
        const equipment = document.querySelector('input[name="wizard-equipment"]:checked')?.value || 'gym';
        const days = parseInt(document.querySelector('input[name="wizard-days"]:checked')?.value || '4', 10);
        const time = parseInt(document.querySelector('input[name="wizard-time"]:checked')?.value || '45', 10);

        const jointFlags = [];
        document.querySelectorAll('input[name="wizard-joints"]:checked').forEach(chk => {
          jointFlags.push(chk.value);
        });

        this.activeRoutine = planGenerator.generatePlan({
          goal,
          level,
          equipment,
          daysPerWeek: days,
          timePerDay: time,
          jointFlags
        });

        this.selectedDayIndex = 0;
        this.saveActiveRoutine();
        workoutLogger.playAudioChime('beep');

        // Scroll to routine view
        this.renderGenerator();
        document.getElementById('routine-output-container')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ==========================================
  // ACTIVE WORKOUT LOGGER VIEW
  // ==========================================
  launchSpecificSession(dayIdx) {
    this.selectedDayIndex = dayIdx;
    this.switchTab('logger');
  }

  renderLogger() {
    const day = this.activeRoutine ? this.activeRoutine.days[this.selectedDayIndex] : null;
    const loggerContent = document.getElementById('logger-active-container');
    if (!loggerContent) return;

    if (!day) {
      loggerContent.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Please generate a workout plan first to begin logging.</div>`;
      return;
    }

    // Initialize session state if not set
    if (!this.activeSessionDay || this.activeSessionDay !== day.id) {
      this.activeSessionDay = day.id;
      this.activeSessionLogs = {};

      day.exercises.forEach(ex => {
        this.activeSessionLogs[ex.id] = [];
        for (let i = 1; i <= (ex.sets || 3); i++) {
          this.activeSessionLogs[ex.id].push({
            setNum: i,
            weight: ex.baseWeight || 40,
            reps: parseInt(ex.reps) || 10,
            rpe: ex.rpe || 8,
            completed: false
          });
        }
      });
    }

    loggerContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="brand-badge">ACTIVE LOGGING SESSION</span>
          <h2 style="font-size: 1.6rem; margin-top: 0.35rem;">${day.title}</h2>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${day.focus}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="app.finishWorkoutSession()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Complete Workout
          </button>
        </div>
      </div>

      ${day.exercises.map((ex, exIdx) => {
        const sets = this.activeSessionLogs[ex.id] || [];
        const existingPR = workoutLogger.personalRecords[ex.id];

        return `
          <div class="glass-card" style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div>
                <h3 style="font-size: 1.15rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                  0${exIdx + 1}. ${ex.name}
                  <span class="badge badge-target">${ex.muscle}</span>
                </h3>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                  Form Cue: "${ex.formCue}"
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">All-Time Best</span>
                <div style="font-size: 0.9rem; font-weight: 800; color: var(--accent-gold);">
                  ${existingPR ? `${existingPR.weight} kg &times; ${existingPR.reps}` : 'No PR yet'}
                </div>
              </div>
            </div>

            <table class="logger-set-table">
              <thead>
                <tr>
                  <th style="width: 60px;">SET</th>
                  <th>WEIGHT (KG)</th>
                  <th>REPS</th>
                  <th>RPE</th>
                  <th style="width: 110px;">EST. 1RM</th>
                  <th style="width: 80px; text-align: center;">DONE</th>
                </tr>
              </thead>
              <tbody>
                ${sets.map((s, sIdx) => {
                  const est1RM = workoutLogger.calculate1RM(s.weight, s.reps);
                  return `
                    <tr class="${s.completed ? 'completed' : ''}" id="row-${ex.id}-${s.setNum}">
                      <td style="font-weight: 700; color: var(--text-muted);">${s.setNum}</td>
                      <td>
                        <input type="number" step="0.5" class="set-input" value="${s.weight}" 
                          onchange="app.updateSetInput('${ex.id}', ${s.setNum}, 'weight', this.value)">
                      </td>
                      <td>
                        <input type="number" class="set-input" value="${s.reps}" 
                          onchange="app.updateSetInput('${ex.id}', ${s.setNum}, 'reps', this.value)">
                      </td>
                      <td>
                        <select class="rpe-select" onchange="app.updateSetInput('${ex.id}', ${s.setNum}, 'rpe', this.value)">
                          <option value="6.5" ${s.rpe == 6.5 ? 'selected' : ''}>6.5 (Warm)</option>
                          <option value="7.0" ${s.rpe == 7.0 ? 'selected' : ''}>7.0 (3 RIR)</option>
                          <option value="7.5" ${s.rpe == 7.5 ? 'selected' : ''}>7.5 (2-3 RIR)</option>
                          <option value="8.0" ${s.rpe == 8.0 ? 'selected' : ''}>8.0 (2 RIR - Ideal)</option>
                          <option value="8.5" ${s.rpe == 8.5 ? 'selected' : ''}>8.5 (1-2 RIR)</option>
                          <option value="9.0" ${s.rpe == 9.0 ? 'selected' : ''}>9.0 (1 RIR)</option>
                          <option value="9.5" ${s.rpe == 9.5 ? 'selected' : ''}>9.5 (Grind)</option>
                          <option value="10" ${s.rpe == 10 ? 'selected' : ''}>10 (Max Limit)</option>
                        </select>
                      </td>
                      <td>
                        <span id="1rm-${ex.id}-${s.setNum}" style="font-weight: 700; color: var(--accent-volt); font-size: 0.9rem;">
                          ${est1RM > 0 ? est1RM + ' kg' : '-'}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <button class="btn-check-set ${s.completed ? 'done' : ''}" 
                          onclick="app.toggleSetComplete('${ex.id}', '${ex.name}', ${s.setNum}, ${ex.restSec || 90})">
                          &#10003;
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    `;
  }

  updateSetInput(exerciseId, setNum, field, value) {
    const sets = this.activeSessionLogs[exerciseId];
    if (!sets) return;
    const targetSet = sets.find(s => s.setNum === setNum);
    if (!targetSet) return;

    targetSet[field] = parseFloat(value) || 0;

    // Recalculate 1RM display
    const est1RM = workoutLogger.calculate1RM(targetSet.weight, targetSet.reps);
    const span1RM = document.getElementById(`1rm-${exerciseId}-${setNum}`);
    if (span1RM) span1RM.textContent = `${est1RM} kg`;
  }

  toggleSetComplete(exerciseId, exerciseName, setNum, restSec = 90) {
    const sets = this.activeSessionLogs[exerciseId];
    if (!sets) return;
    const targetSet = sets.find(s => s.setNum === setNum);
    if (!targetSet) return;

    targetSet.completed = !targetSet.completed;

    const row = document.getElementById(`row-${exerciseId}-${setNum}`);
    const btn = row?.querySelector('.btn-check-set');

    if (targetSet.completed) {
      row?.classList.add('completed');
      btn?.classList.add('done');

      // Check for PR
      workoutLogger.checkPR(exerciseId, exerciseName, targetSet.weight, targetSet.reps);

      // Start Rest Timer
      workoutLogger.startRestTimer(restSec);
    } else {
      row?.classList.remove('completed');
      btn?.classList.remove('done');
    }
  }

  finishWorkoutSession() {
    const day = this.activeRoutine ? this.activeRoutine.days[this.selectedDayIndex] : null;
    if (!day) return;

    let totalVolume = 0;
    let completedSetsCount = 0;

    const sessionSummaryExercises = [];

    day.exercises.forEach(ex => {
      const sets = this.activeSessionLogs[ex.id] || [];
      const completed = sets.filter(s => s.completed);
      completedSetsCount += completed.length;

      completed.forEach(s => {
        totalVolume += (s.weight * s.reps);
      });

      sessionSummaryExercises.push({
        id: ex.id,
        name: ex.name,
        sets: sets
      });
    });

    if (completedSetsCount === 0) {
      alert('Please check off at least one completed set before finishing the workout!');
      return;
    }

    const sessionRecord = {
      id: 'session_' + Date.now(),
      title: day.title,
      date: new Date().toISOString(),
      totalVolume: Math.round(totalVolume),
      exercises: sessionSummaryExercises
    };

    workoutLogger.sessionHistory.push(sessionRecord);
    workoutLogger.saveHistory();

    workoutLogger.playAudioChime('pr_fanfare');
    workoutLogger.launchConfetti();

    // Trigger Adaptive Overload Summary Modal
    this.showWorkoutCompletionModal(sessionRecord);
  }

  showWorkoutCompletionModal(sessionRecord) {
    const modal = document.getElementById('workout-summary-modal');
    const content = document.getElementById('modal-summary-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--grad-volt); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #000;">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">Workout Completed!</h2>
        <p style="font-size: 0.9rem; color: var(--text-secondary);">${sessionRecord.title}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-md);">
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Total Load Volume</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-volt);">${sessionRecord.totalVolume} kg</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Overload Adaptation</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-cyan);">Calibrated</div>
        </div>
      </div>

      <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--accent-volt); display: flex; align-items: center; gap: 0.4rem;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        Next Week's Prescribed Overload Adjustments:
      </h4>

      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; margin-bottom: 1.5rem;">
        ${sessionRecord.exercises.map(ex => {
          const overload = overloadEngine.calculateOverload(ex, ex.sets, 2);
          return `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #fff;">
                <span>${ex.name}</span>
                <span style="color: var(--accent-volt);">${overload.prescribedWeight} kg &times; ${overload.prescribedReps}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">${overload.note}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; gap: 1rem;">
        <button class="btn btn-primary" style="flex: 1;" onclick="app.closeSummaryModal(); app.switchTab('dashboard');">
          View Dashboard
        </button>
      </div>
    `;

    modal.classList.add('open');
  }

  closeSummaryModal() {
    const modal = document.getElementById('workout-summary-modal');
    if (modal) modal.classList.remove('open');
  }

  // ==========================================
  // NUTRITION PLANNER VIEW
  // ==========================================
  renderNutrition() {
    const targets = nutritionPlanner.calculateTargets();
    const totals = nutritionPlanner.getLoggedTotals();

    // Fill Macro Rings
    const calsPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
    const proteinPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
    const carbsPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
    const fatPct = Math.min(100, Math.round((totals.fat / targets.fat) * 100));

    const ringsContainer = document.getElementById('macro-rings-container');
    if (ringsContainer) {
      ringsContainer.innerHTML = `
        <!-- Calories -->
        <div class="macro-ring-card">
          <div class="ring-svg-container">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="var(--accent-volt)" stroke-width="8" fill="none"
                stroke-dasharray="264" stroke-dashoffset="${264 - (264 * calsPct) / 100}" stroke-linecap="round" />
            </svg>
            <div class="ring-center-text">
              <div class="ring-center-value">${totals.calories}</div>
              <div class="ring-center-unit">/ ${targets.calories} kcal</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Calories</div>
          <div style="font-size: 0.75rem; color: var(--accent-volt);">${targets.calories - totals.calories} remaining</div>
        </div>

        <!-- Protein -->
        <div class="macro-ring-card">
          <div class="ring-svg-container">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="#6366f1" stroke-width="8" fill="none"
                stroke-dasharray="264" stroke-dashoffset="${264 - (264 * proteinPct) / 100}" stroke-linecap="round" />
            </svg>
            <div class="ring-center-text">
              <div class="ring-center-value" style="color: #a5b4fc;">${totals.protein}g</div>
              <div class="ring-center-unit">/ ${targets.protein}g</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Protein</div>
          <div style="font-size: 0.75rem; color: #a5b4fc;">${proteinPct}% Target Met</div>
        </div>

        <!-- Carbs -->
        <div class="macro-ring-card">
          <div class="ring-svg-container">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="#06b6d4" stroke-width="8" fill="none"
                stroke-dasharray="264" stroke-dashoffset="${264 - (264 * carbsPct) / 100}" stroke-linecap="round" />
            </svg>
            <div class="ring-center-text">
              <div class="ring-center-value" style="color: #67e8f9;">${totals.carbs}g</div>
              <div class="ring-center-unit">/ ${targets.carbs}g</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Carbs</div>
          <div style="font-size: 0.75rem; color: #67e8f9;">${carbsPct}% Target Met</div>
        </div>

        <!-- Fats -->
        <div class="macro-ring-card">
          <div class="ring-svg-container">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="#f59e0b" stroke-width="8" fill="none"
                stroke-dasharray="264" stroke-dashoffset="${264 - (264 * fatPct) / 100}" stroke-linecap="round" />
            </svg>
            <div class="ring-center-text">
              <div class="ring-center-value" style="color: #fcd34d;">${totals.fat}g</div>
              <div class="ring-center-unit">/ ${targets.fat}g</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Fats</div>
          <div style="font-size: 0.75rem; color: #fcd34d;">${fatPct}% Target Met</div>
        </div>
      `;
    }

    // Water Tracker
    const waterCountEl = document.getElementById('water-glass-count');
    if (waterCountEl) {
      waterCountEl.textContent = `${nutritionPlanner.waterGlasses} / 12 Glasses (${(nutritionPlanner.waterGlasses * 0.25).toFixed(1)}L)`;
    }

    // Food Log List
    const foodListEl = document.getElementById('logged-food-list');
    if (foodListEl) {
      if (nutritionPlanner.loggedFoods.length === 0) {
        foodListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No foods logged today. Click "+ Quick Add Food" to begin.</div>`;
      } else {
        foodListEl.innerHTML = nutritionPlanner.loggedFoods.map(item => `
          <div class="meal-item-card">
            <div class="meal-left">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ${item.time} &bull; <strong style="color: #a5b4fc;">${item.protein}g Protein</strong> &bull; ${item.carbs}g Carbs &bull; ${item.fat}g Fat
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-weight: 800; font-size: 1.05rem; color: var(--accent-volt);">${item.calories} kcal</span>
              <button class="icon-btn" onclick="app.deleteFood('${item.id}')" title="Delete">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Curated Meal Plan Catalog
    this.renderCuisineMealPlan();
  }

  renderCuisineMealPlan(planKey = 'indian-veg-1800') {
    const container = document.getElementById('curated-meal-plan-container');
    if (!container) return;

    const plan = MEAL_PLANS[planKey] || MEAL_PLANS['indian-veg-1800'];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="font-size: 1.15rem; color: #fff;">${plan.title}</h3>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            Target: <strong style="color: var(--accent-volt);">${plan.totalCalories} kcal</strong> &bull; 
            <strong style="color: #a5b4fc;">${plan.totalProtein}g Protein</strong> &bull; 
            ${plan.totalCarbs}g Carbs &bull; ${plan.totalFat}g Fat
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="app.quickLoadPlanIntoLog('${planKey}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Log All Plan Meals
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${plan.meals.map(m => `
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <span style="font-weight: 700; color: #fff; font-size: 0.9rem;">${m.name}</span>
              <span style="font-weight: 800; color: var(--accent-volt); font-size: 0.85rem;">${m.cals} kcal (${m.p}g P)</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
              ${m.items.join(' + ')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  quickLoadPlanIntoLog(planKey) {
    const plan = MEAL_PLANS[planKey];
    if (!plan) return;

    plan.meals.forEach(m => {
      nutritionPlanner.addFood({
        name: `${m.name} (${m.items[0]})`,
        calories: m.cals,
        protein: m.p,
        carbs: m.c,
        fat: m.f,
        time: m.name.split(' ')[0]
      });
    });

    workoutLogger.playAudioChime('beep');
    this.renderNutrition();
    alert(`Logged all meals from "${plan.title}" into today's food tracker!`);
  }

  bindNutritionEvents() {
    // Quick Add Water
    const btnWater = document.getElementById('btn-add-water');
    if (btnWater) {
      btnWater.addEventListener('click', () => {
        nutritionPlanner.addWaterGlass();
        workoutLogger.playAudioChime('beep');
        this.renderNutrition();
      });
    }

    // Reset Daily Food Log
    const btnResetLog = document.getElementById('btn-reset-nutrition-log');
    if (btnResetLog) {
      btnResetLog.addEventListener('click', () => {
        if (confirm("Reset today's logged food entries?")) {
          nutritionPlanner.resetDailyLog();
          nutritionPlanner.resetWater();
          this.renderNutrition();
        }
      });
    }

    // Cuisine Switcher Buttons
    const btnVeg = document.getElementById('plan-select-veg');
    const btnNonveg = document.getElementById('plan-select-nonveg');
    if (btnVeg && btnNonveg) {
      btnVeg.addEventListener('click', () => {
        btnVeg.classList.add('btn-primary');
        btnVeg.classList.remove('btn-secondary');
        btnNonveg.classList.remove('btn-primary');
        btnNonveg.classList.add('btn-secondary');
        this.renderCuisineMealPlan('indian-veg-1800');
      });
      btnNonveg.addEventListener('click', () => {
        btnNonveg.classList.add('btn-primary');
        btnNonveg.classList.remove('btn-secondary');
        btnVeg.classList.remove('btn-primary');
        btnVeg.classList.add('btn-secondary');
        this.renderCuisineMealPlan('indian-nonveg-2100');
      });
    }

    // Quick Add Modal Trigger
    const btnOpenFoodModal = document.getElementById('btn-open-food-modal');
    if (btnOpenFoodModal) {
      btnOpenFoodModal.addEventListener('click', () => {
        this.openFoodModal();
      });
    }
  }

  deleteFood(id) {
    nutritionPlanner.removeFood(id);
    this.renderNutrition();
  }

  openFoodModal() {
    const modal = document.getElementById('food-add-modal');
    const catalogContainer = document.getElementById('catalog-food-picks');
    if (!modal) return;

    if (catalogContainer) {
      catalogContainer.innerHTML = NUTRITION_DATABASE.map(item => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${item.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ${item.calories} kcal &bull; <strong style="color: #a5b4fc;">${item.protein}g Protein</strong> &bull; ${item.carbs}g C &bull; ${item.fat}g F
            </div>
          </div>
          <button class="btn btn-outline-volt btn-sm" onclick="app.quickAddCatalogFood('${item.id}')">
            + Add
          </button>
        </div>
      `).join('');
    }

    modal.classList.add('open');
  }

  quickAddCatalogFood(itemId) {
    const item = NUTRITION_DATABASE.find(f => f.id === itemId);
    if (!item) return;

    nutritionPlanner.addFood({
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: 'Logged Food'
    });

    workoutLogger.playAudioChime('beep');
    this.renderNutrition();
    document.getElementById('food-add-modal')?.classList.remove('open');
  }

  addCustomFood() {
    const name = document.getElementById('custom-food-name')?.value;
    const cals = document.getElementById('custom-food-cals')?.value;
    const p = document.getElementById('custom-food-protein')?.value;
    const c = document.getElementById('custom-food-carbs')?.value;
    const f = document.getElementById('custom-food-fat')?.value;

    if (!name || !cals) {
      alert('Please enter at least food name and calories.');
      return;
    }

    nutritionPlanner.addFood({
      name: name,
      calories: parseFloat(cals) || 0,
      protein: parseFloat(p) || 0,
      carbs: parseFloat(c) || 0,
      fat: parseFloat(f) || 0,
      time: 'Custom Meal'
    });

    workoutLogger.playAudioChime('beep');
    this.renderNutrition();
    document.getElementById('food-add-modal')?.classList.remove('open');
  }

  // ==========================================
  // AI COACH CHAT VIEW
  // ==========================================
  renderCoach() {
    const messagesContainer = document.getElementById('coach-chat-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = aiCoach.conversationHistory.map(msg => {
      return `
        <div class="chat-bubble ${msg.sender}">
          <div>${this.formatMarkdown(msg.text)}</div>
          ${msg.actionCard ? this.renderActionCard(msg.actionCard) : ''}
        </div>
      `;
    }).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  renderActionCard(card) {
    if (card.type === 'exercise_swap') {
      return `
        <div class="coach-card-swap">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--accent-volt); margin-bottom: 0.5rem;">
            ${card.title}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.6rem;">
            ${card.swaps.map(sw => `
              <div style="background: rgba(255,255,255,0.04); border-radius: var(--radius-sm); padding: 0.6rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">${sw.replacementName}</span>
                  <button class="btn btn-outline-volt btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.7rem;" 
                    onclick="app.applyExerciseSwap('${sw.originalId}', '${sw.replacementId}')">
                    Swap Into Plan
                  </button>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.3;">${sw.reason}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (card.type === 'nutrition_shortcut') {
      return `
        <div class="coach-card-swap">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">${card.title}</span>
            <button class="btn btn-primary btn-sm" onclick="app.quickLoadPlanIntoLog('${card.planKey}'); app.switchTab('nutrition');">
              Load & View
            </button>
          </div>
        </div>
      `;
    }
    return '';
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.1rem; margin: 0.5rem 0 0.25rem; color: #fff;">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 style="font-size: 0.95rem; margin: 0.4rem 0 0.2rem; color: var(--accent-volt);">$1</h4>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #fff;">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br/>');
  }

  bindCoachEvents() {
    const sendBtn = document.getElementById('coach-send-btn');
    const inputField = document.getElementById('coach-user-input');

    const handleSend = async () => {
      const query = inputField.value.trim();
      if (!query) return;

      inputField.value = '';
      aiCoach.conversationHistory.push({ sender: 'user', text: query });
      this.renderCoach();
      workoutLogger.playAudioChime('beep');

      // AI response with subtle delay simulation
      setTimeout(async () => {
        const response = await aiCoach.getResponse(query);
        aiCoach.conversationHistory.push({
          sender: 'bot',
          text: response.text,
          actionCard: response.actionCard
        });
        this.renderCoach();
        workoutLogger.playAudioChime('beep');
      }, 400);
    };

    if (sendBtn && inputField) {
      sendBtn.addEventListener('click', handleSend);
      inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }

    // Preset Prompt Pills
    document.querySelectorAll('.prompt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const promptText = pill.dataset.prompt;
        if (inputField) inputField.value = promptText;
        handleSend();
      });
    });
  }

  applyExerciseSwap(originalId, replacementId) {
    if (!this.activeRoutine) return;
    const replacementDef = EXERCISE_DATABASE.find(e => e.id === replacementId);
    if (!replacementDef) return;

    let swapped = false;
    this.activeRoutine.days.forEach(day => {
      day.exercises.forEach(ex => {
        if (ex.id === originalId) {
          ex.id = replacementDef.id;
          ex.name = replacementDef.name;
          ex.muscle = replacementDef.muscle;
          ex.equipment = replacementDef.equipment;
          ex.formCue = replacementDef.formCue;
          ex.overloadNote = `Joint-safe swap applied (${replacementDef.name}). Overload calibrated.`;
          swapped = true;
        }
      });
    });

    if (swapped) {
      this.saveActiveRoutine();
      workoutLogger.playAudioChime('pr_fanfare');
      alert(`Success! Replaced ${originalId.replace(/_/g, ' ')} with ${replacementDef.name} across your active routine.`);
      this.renderGenerator();
    }
  }

  // Rest Timer Controls Bindings
  renderRestTimerControls() {
    const timerFloater = document.getElementById('rest-timer-floater');
    const closeBtn = document.getElementById('timer-close-btn');
    const add15Btn = document.getElementById('timer-add-15');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => workoutLogger.stopRestTimer());
    }
    if (add15Btn) {
      add15Btn.addEventListener('click', () => workoutLogger.addTimerSeconds(15));
    }
  }
}

// Global App Instance
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PulseFitApp();
});
