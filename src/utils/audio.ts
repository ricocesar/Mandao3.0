// Web Audio API Synthesizer for Mandao Delivery
let audioCtx: AudioContext | null = null;

export function initAudio() {
  if (!audioCtx) {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    } catch {
      // AudioContext not supported
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// User gesture trigger
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', initAudio, { once: true });
  window.addEventListener('click', initAudio, { once: true });
}

export type TipoSonido =
  | 'alerta'       // Campanita fuerte (nuevo pedido / pedido listo)
  | 'campana'      // Campanita estándar
  | 'chaching'     // Pedido con propina ($$$ monedas brillantes)
  | 'pop'          // Al agregar al carrito (suave)
  | 'exito'        // Confirmación de pedido / pago
  | 'error'        // Error de validación / conexión
  | 'suave'        // Cambio de estado sutil
  | 'epico';       // Al completar entrega (fanfarria triunfal)

export function playSonido(tipo: TipoSonido) {
  initAudio();
  if (!audioCtx) return;

  const ctx = audioCtx;
  const now = ctx.currentTime;

  try {
    switch (tipo) {
      case 'pop': {
        // Pop suave y agradable al agregar un ítem
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'chaching': {
        // Cha-ching de caja registradora / propina
        const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = now + idx * 0.07;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
          osc.start(start);
          osc.stop(start + 0.38);
        });
        break;
      }

      case 'alerta': {
        // Campanita fuerte para nuevo pedido
        const notes = [987.77, 1318.51, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = now + idx * 0.13;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
          osc.start(start);
          osc.stop(start + 0.25);
        });
        break;
      }

      case 'campana': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'exito': {
        // Acorde alegre de confirmación
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = now + idx * 0.06;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
          osc.start(start);
          osc.stop(start + 0.35);
        });
        break;
      }

      case 'error': {
        // Sonido de error grave descendente
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }

      case 'suave': {
        // Notificación sutil
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
        break;
      }

      case 'epico': {
        // Fanfarria triunfal para entrega completada
        const melody = [
          { f: 523.25, d: 0.15, t: 0.0 },
          { f: 659.25, d: 0.15, t: 0.15 },
          { f: 783.99, d: 0.18, t: 0.3 },
          { f: 1046.5, d: 0.45, t: 0.5 },
        ];
        melody.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.value = note.f;
          const start = now + note.t;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);
          osc.start(start);
          osc.stop(start + note.d + 0.05);
        });
        break;
      }
    }
  } catch {
    // Ignore audio synthesis errors
  }
}

export function vibrar(pattern: number[] = [200, 100, 200]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
}
