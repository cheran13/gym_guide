// Workout Logger & PR Tracking System with Web Audio Synth and Confetti

class WorkoutLogger {
  constructor() {
    this.activeSession = null;
    this.restTimerInterval = null;
    this.restTimeRemaining = 0;
    this.audioCtx = null;
    this.personalRecords = this.loadPersonalRecords();
    this.sessionHistory = this.loadHistory();
  }

  // Web Audio Synthesizer for ultra-responsive sound effects
  playAudioChime(type = 'beep') {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'timer_done') {
        // High 3-tone chime
        [659.25, 880, 1046.5].forEach((freq, idx) => {
          const subOsc = this.audioCtx.createOscillator();
          const subGain = this.audioCtx.createGain();
          subOsc.connect(subGain);
          subGain.connect(this.audioCtx.destination);
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
          subGain.gain.setValueAtTime(0.2, now + idx * 0.12);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
          subOsc.start(now + idx * 0.12);
          subOsc.stop(now + idx * 0.12 + 0.3);
        });
      } else if (type === 'pr_fanfare') {
        // Glorious victory fanfare
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const subOsc = this.audioCtx.createOscillator();
          const subGain = this.audioCtx.createGain();
          subOsc.type = 'triangle';
          subOsc.connect(subGain);
          subGain.connect(this.audioCtx.destination);
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.15);
          subGain.gain.setValueAtTime(0.25, now + idx * 0.15);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.45);
          subOsc.start(now + idx * 0.15);
          subOsc.stop(now + idx * 0.15 + 0.45);
        });
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Personal Records Store
  loadPersonalRecords() {
    try {
      const stored = localStorage.getItem('pulsefit_prs');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Initial realistic baseline PRs
    return {
      barbell_bench_press: { weight: 70, reps: 8, est1RM: 86.8, date: '2026-09-15' },
      barbell_back_squat: { weight: 95, reps: 6, est1RM: 114.0, date: '2026-09-18' },
      barbell_deadlift: { weight: 120, reps: 5, est1RM: 140.0, date: '2026-09-22' },
      dumbbell_bench_press: { weight: 26, reps: 10, est1RM: 34.6, date: '2026-09-28' }
    };
  }

  savePersonalRecords() {
    localStorage.setItem('pulsefit_prs', JSON.stringify(this.personalRecords));
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('pulsefit_history');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Pre-populate with 2 realistic previous workouts for rich graphs & overload demonstration
    return [
      {
        id: 'hist_1',
        title: 'Day 1: Upper Body (A - Horizontal Focus)',
        date: '2026-09-27T10:00:00Z',
        totalVolume: 5120,
        exercises: [
          {
            id: 'barbell_bench_press',
            name: 'Barbell Bench Press',
            sets: [
              { setNum: 1, weight: 65, reps: 10, rpe: 7.5, completed: true },
              { setNum: 2, weight: 65, reps: 10, rpe: 8, completed: true },
              { setNum: 3, weight: 65, reps: 10, rpe: 8, completed: true }
            ]
          },
          {
            id: 'chest_supported_row',
            name: 'Incline Chest-Supported DB Row',
            sets: [
              { setNum: 1, weight: 22, reps: 12, rpe: 7.5, completed: true },
              { setNum: 2, weight: 22, reps: 12, rpe: 8, completed: true },
              { setNum: 3, weight: 22, reps: 11, rpe: 8.5, completed: true }
            ]
          }
        ]
      },
      {
        id: 'hist_2',
        title: 'Day 2: Lower Body (A - Quad Dominant)',
        date: '2026-09-29T10:00:00Z',
        totalVolume: 6480,
        exercises: [
          {
            id: 'barbell_back_squat',
            name: 'Barbell Back Squat',
            sets: [
              { setNum: 1, weight: 90, reps: 8, rpe: 7.5, completed: true },
              { setNum: 2, weight: 90, reps: 8, rpe: 8, completed: true },
              { setNum: 3, weight: 90, reps: 8, rpe: 8.5, completed: true }
            ]
          },
          {
            id: 'romanian_deadlift_db',
            name: 'Dumbbell Romanian Deadlift (RDL)',
            sets: [
              { setNum: 1, weight: 28, reps: 10, rpe: 7.5, completed: true },
              { setNum: 2, weight: 28, reps: 10, rpe: 8, completed: true },
              { setNum: 3, weight: 28, reps: 10, rpe: 8, completed: true }
            ]
          }
        ]
      }
    ];
  }

  saveHistory() {
    localStorage.setItem('pulsefit_history', JSON.stringify(this.sessionHistory));
  }

  // 1RM Calculation via Epley formula
  calculate1RM(weight, reps) {
    if (!weight || !reps || reps <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  }

  // Check and log new PR
  checkPR(exerciseId, exerciseName, weight, reps) {
    const est1RM = this.calculate1RM(weight, reps);
    const existing = this.personalRecords[exerciseId];

    if (!existing || est1RM > existing.est1RM || (weight > existing.weight && reps >= existing.reps)) {
      this.personalRecords[exerciseId] = {
        exerciseName: exerciseName,
        weight: weight,
        reps: reps,
        est1RM: est1RM,
        date: new Date().toISOString().split('T')[0]
      };
      this.savePersonalRecords();
      this.triggerPRCelebration(exerciseName, weight, reps, est1RM);
      return true;
    }
    return false;
  }

  triggerPRCelebration(exerciseName, weight, reps, est1RM) {
    this.playAudioChime('pr_fanfare');
    this.launchConfetti();

    // Show PR toast notification
    const existingToast = document.querySelector('.pr-badge-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'pr-badge-toast';
    toast.innerHTML = `
      <div class="pr-icon-gold">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
      </div>
      <div>
        <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: #fbbf24; letter-spacing: 0.08em;">NEW PERSONAL RECORD!</div>
        <div style="font-size: 1rem; font-weight: 700; color: #fff;">${exerciseName}</div>
        <div style="font-size: 0.85rem; color: #94a3b8;">${weight} kg &times; ${reps} reps (Est. 1RM: <strong style="color: #00f59b;">${est1RM} kg</strong>)</div>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 4500);
  }

  // Pure Canvas Confetti Explosion
  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas') || document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const colors = ['#00f59b', '#10b981', '#fbbf24', '#f59e0b', '#6366f1', '#38bdf8', '#f43f5e'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 50,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    let animationFrame;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vRot;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  }

  // Rest Timer Controller
  startRestTimer(seconds) {
    clearInterval(this.restTimerInterval);
    this.restTimeRemaining = seconds;
    this.playAudioChime('beep');

    const timerFloater = document.getElementById('rest-timer-floater');
    if (timerFloater) timerFloater.style.display = 'flex';

    this.updateTimerDisplay();

    this.restTimerInterval = setInterval(() => {
      this.restTimeRemaining--;
      this.updateTimerDisplay();

      if (this.restTimeRemaining <= 0) {
        clearInterval(this.restTimerInterval);
        this.playAudioChime('timer_done');
        if (timerFloater) {
          timerFloater.classList.add('timer-finished');
          setTimeout(() => {
            timerFloater.classList.remove('timer-finished');
          }, 3000);
        }
      }
    }, 1000);
  }

  addTimerSeconds(sec) {
    this.restTimeRemaining += sec;
    this.updateTimerDisplay();
  }

  stopRestTimer() {
    clearInterval(this.restTimerInterval);
    const timerFloater = document.getElementById('rest-timer-floater');
    if (timerFloater) timerFloater.style.display = 'none';
  }

  updateTimerDisplay() {
    const el = document.getElementById('rest-timer-digits');
    if (!el) return;
    const mins = Math.floor(Math.max(0, this.restTimeRemaining) / 60);
    const secs = Math.max(0, this.restTimeRemaining) % 60;
    el.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

const workoutLogger = new WorkoutLogger();
