// English Challenge Hub — synthesized sound effects (no audio files needed)
const AudioFX = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

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
