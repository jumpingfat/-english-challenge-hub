// English Challenge Hub — synthesized sound effects & background music (no audio files needed)
let sharedCtx;
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

const AudioFX = (() => {
  function tone({ freq = 440, freqEnd = null, duration = 0.15, type = 'sine', volume = 0.2, delay = 0 }) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + delay + duration);
    gain.gain.setValueAtTime(volume, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  }

  return {
    select() { tone({ freq: 440, freqEnd: 660, duration: 0.12, type: 'triangle', volume: 0.2 }); },
    reveal() {
      tone({ freq: 523, duration: 0.15, type: 'sine', volume: 0.22 });
      tone({ freq: 784, duration: 0.22, type: 'sine', volume: 0.2, delay: 0.1 });
    },
    tick() { tone({ freq: 800, duration: 0.04, type: 'square', volume: 0.1 }); },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, duration: 0.24, type: 'triangle', volume: 0.25, delay: i * 0.09 }));
    },
    swoosh() { tone({ freq: 300, freqEnd: 900, duration: 0.25, type: 'sawtooth', volume: 0.1 }); },
    scoreUp() { tone({ freq: 660, freqEnd: 880, duration: 0.1, type: 'sine', volume: 0.18 }); },
    scoreDown() { tone({ freq: 400, freqEnd: 220, duration: 0.15, type: 'sine', volume: 0.18 }); }
  };
})();

// Upbeat, bouncy 8-bit-style looping game theme (think kart-racer background music) —
// a quarter-note "oom-pah" bassline plus a peppy eighth-note lead riff over a
// C - G - Am - F progression, played softly (background level, not soothing).
const BackgroundMusic = (() => {
  const BPM = 152;
  const EIGHTH = 60 / BPM / 2; // seconds per eighth note

  // Two-octave C major scale, C4 up to C6
  const SCALE = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // C4-B4
    523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, // C5-B5
    1046.50
  ];
  // Bouncy 32-step lead riff (indices into SCALE), one loop = 32 eighths
  const MELODY = [
    7, 9, 11, 9, 7, 4, 7, 9,
    8, 10, 12, 10, 8, 6, 8, 10,
    7, 9, 11, 12, 11, 9, 7, 4,
    7, 9, 7, 4, 2, 4, 7, 9
  ];
  // Bass roots per 8-eighth (1 bar) segment: C - G - Am - F, "oom-pah" root/octave
  const BASS_ROOTS = [130.81, 196.00, 220.00, 174.61]; // C3 G3 A3 F3
  const STEPS_PER_BAR = 8;
  const TOTAL_STEPS = MELODY.length; // 32

  const MELODY_VOLUME = 0.05;
  const BASS_VOLUME = 0.045;

  let playing = false;
  let muted = false;
  let masterGain = null;
  let schedulerTimer = null;
  let stepIndex = 0;
  let nextStepTime = 0;

  function pluck(freq, startTime, duration, type, volume) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function scheduleStep(i, t) {
    // Melody: one note per eighth step
    pluck(SCALE[MELODY[i % TOTAL_STEPS]], t, EIGHTH * 0.85, 'square', MELODY_VOLUME);

    // Bass: quarter-note grid (every 2 eighth steps), alternating root/octave-up ("oom-pah")
    if (i % 2 === 0) {
      const bar = Math.floor(i / STEPS_PER_BAR) % BASS_ROOTS.length;
      const root = BASS_ROOTS[bar];
      const beatInBar = (i % STEPS_PER_BAR) / 2; // 0,1,2,3
      const freq = beatInBar % 2 === 0 ? root : root * 2;
      pluck(freq, t, EIGHTH * 1.7, 'triangle', BASS_VOLUME);
    }
  }

  function tick() {
    const c = getCtx();
    const lookahead = c.currentTime + 0.6;
    while (nextStepTime < lookahead) {
      scheduleStep(stepIndex, nextStepTime);
      stepIndex++;
      nextStepTime += EIGHTH;
    }
  }

  return {
    start() {
      if (playing) return;
      const c = getCtx();
      masterGain = c.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(c.destination);
      stepIndex = 0;
      nextStepTime = c.currentTime + 0.1;
      playing = true;
      tick();
      schedulerTimer = setInterval(tick, 150);
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(schedulerTimer);
      schedulerTimer = null;
      if (masterGain) {
        const c = getCtx();
        masterGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
        setTimeout(() => { if (masterGain) masterGain.disconnect(); }, 400);
      }
    },
    toggleMute() {
      muted = !muted;
      if (masterGain) {
        const c = getCtx();
        masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, c.currentTime + 0.15);
      }
      return muted;
    },
    isMuted() { return muted; }
  };
})();
