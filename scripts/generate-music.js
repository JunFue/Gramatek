const fs = require('fs');
const path = require('path');

// Output directory
const outputDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Note frequencies in Hz
const NOTE_FREQS = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53,
  'REST': 0
};

// Standard WAV file encoder
function encodeWAV(samples, sampleRate = 44100) {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write stereo samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    const intVal = Math.round(val);
    buffer.writeInt16LE(intVal, offset); // Left
    buffer.writeInt16LE(intVal, offset + 2); // Right
    offset += 4;
  }

  return buffer;
}

// Waveforms
function pulseWave(phase, duty = 0.5) {
  return (phase % 1.0) < duty ? 1.0 : -1.0;
}

function triangleWave(phase) {
  const p = phase % 1.0;
  return 4.0 * Math.abs(p - 0.5) - 1.0;
}

function noiseWave() {
  return (Math.random() * 2.0) - 1.0;
}

// Generate Track 1: "Masayang Laro" (Playful Chiptune)
function generatePlayfulTrack() {
  const sampleRate = 44100;
  const bpm = 126;
  const secondsPerBeat = 60 / bpm;
  const sixteenth = secondsPerBeat / 4;
  const bars = 16;
  const totalBeats = bars * 4;
  const duration = totalBeats * secondsPerBeat;
  const totalSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(totalSamples);

  const chordRoots = [
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3'
  ];

  const chordNotes = [
    ['C4', 'E4', 'G4', 'C5'], // C
    ['G3', 'B3', 'D4', 'G4'], // G
    ['A3', 'C4', 'E4', 'A4'], // Am
    ['F3', 'A3', 'C4', 'F4']  // F
  ];

  const melody = [
    // Bar 1 (C)
    'C5', 'REST', 'E5', 'G5', 'E5', 'REST', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5',
    // Bar 2 (G)
    'B4', 'REST', 'D5', 'G5', 'D5', 'REST', 'B4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'C5', 'B4', 'G4',
    // Bar 3 (Am)
    'C5', 'REST', 'E5', 'A5', 'E5', 'REST', 'C5', 'D5', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'E5',
    // Bar 4 (F)
    'F5', 'G5', 'A5', 'C6', 'A5', 'G5', 'F5', 'E5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6',

    // Bar 5 (C) - Playful variation
    'E5', 'G5', 'C6', 'G5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'C6', 'D6', 'E6', 'REST',
    // Bar 6 (G)
    'D5', 'G5', 'B5', 'G5', 'D5', 'G5', 'D5', 'C5', 'B4', 'C5', 'D5', 'G5', 'B5', 'C6', 'D6', 'REST',
    // Bar 7 (Am)
    'C5', 'E5', 'A5', 'E5', 'C5', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'E5', 'D5', 'C5', 'A4',
    // Bar 8 (F)
    'F4', 'A4', 'C5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'F5', 'A5', 'B5', 'G5', 'A5', 'B5', 'REST',

    // Bar 9 (C) - Bouncy staccato
    'C5', 'C5', 'REST', 'E5', 'G5', 'G5', 'REST', 'E5', 'C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5', 'REST',
    // Bar 10 (G)
    'B4', 'B4', 'REST', 'D5', 'G5', 'G5', 'REST', 'D5', 'B4', 'D5', 'G5', 'B5', 'G5', 'D5', 'B4', 'REST',
    // Bar 11 (Am)
    'A4', 'A4', 'REST', 'C5', 'E5', 'E5', 'REST', 'C5', 'A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'REST',
    // Bar 12 (F)
    'F4', 'F4', 'REST', 'A4', 'C5', 'C5', 'REST', 'A4', 'F4', 'A4', 'C5', 'F5', 'G5', 'A5', 'B5', 'REST',

    // Bar 13 (C) - Climax
    'C6', 'REST', 'G5', 'E5', 'C5', 'E5', 'G5', 'C6', 'E6', 'D6', 'C6', 'G5', 'A5', 'G5', 'E5', 'D5',
    // Bar 14 (G)
    'B5', 'REST', 'G5', 'D5', 'B4', 'D5', 'G5', 'B5', 'D6', 'C6', 'B5', 'G5', 'A5', 'G5', 'F5', 'D5',
    // Bar 15 (Am)
    'A5', 'REST', 'E5', 'C5', 'A4', 'C5', 'E5', 'A5', 'C6', 'B5', 'A5', 'E5', 'G5', 'A5', 'B5', 'C6',
    // Bar 16 (F -> Loop turnaround)
    'F5', 'A5', 'C6', 'A5', 'G5', 'A5', 'B5', 'G5', 'A5', 'B5', 'C6', 'D6', 'C6', 'B5', 'A5', 'G5'
  ];

  let melodyPhase = 0;
  let arpPhase = 0;
  let bassPhase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentSixteenthIndex = Math.floor(t / sixteenth) % melody.length;
    const currentBarIndex = Math.floor(t / (secondsPerBeat * 4)) % 16;
    const chordIndex = currentBarIndex % 4;
    const notesInChord = chordNotes[chordIndex];

    // 1. LEAD MELODY
    const melodyNote = melody[currentSixteenthIndex];
    let leadSample = 0;
    if (melodyNote !== 'REST') {
      const noteFreq = NOTE_FREQS[melodyNote] || 440;
      const noteTime = t % sixteenth;
      let env = 0;
      if (noteTime < 0.006) {
        env = noteTime / 0.006;
      } else if (noteTime < 0.03) {
        env = 1.0 - ((noteTime - 0.006) / 0.024) * 0.3;
      } else if (noteTime < sixteenth - 0.015) {
        env = 0.7;
      } else {
        env = 0.7 * Math.max(0, (sixteenth - noteTime) / 0.015);
      }

      const vibrato = 1.0 + 0.008 * Math.sin(2 * Math.PI * 5.0 * t);
      melodyPhase += (noteFreq * vibrato) / sampleRate;
      leadSample = pulseWave(melodyPhase, 0.25) * env * 0.22;
    }

    // 2. ARPEGGIO CHORD
    const arpNoteIdx = Math.floor(t / (sixteenth / 2)) % 4;
    const arpNoteName = notesInChord[arpNoteIdx];
    const arpFreq = NOTE_FREQS[arpNoteName] || 440;
    arpPhase += arpFreq / sampleRate;
    const arpNoteTime = t % (sixteenth / 2);
    const arpEnv = Math.exp(-arpNoteTime * 25);
    const arpSample = pulseWave(arpPhase, 0.125) * arpEnv * 0.12;

    // 3. BASSLINE
    const beatTime = t % secondsPerBeat;
    const beatInBar = Math.floor((t % (secondsPerBeat * 4)) / secondsPerBeat);
    const rootFreq = NOTE_FREQS[chordRoots[currentBarIndex]] || 130;
    let bassFreq = rootFreq;
    if (beatInBar === 1 || beatInBar === 3) {
      bassFreq = rootFreq * 1.5;
    }
    bassPhase += bassFreq / sampleRate;
    const bassEnv = Math.max(0, 1.0 - (beatTime / (secondsPerBeat * 0.85)));
    const bassSample = triangleWave(bassPhase) * bassEnv * 0.32;

    // 4. PERCUSSION
    let drumSample = 0;
    if (beatInBar === 0 || beatInBar === 2) {
      if (beatTime < 0.12) {
        const kickPitch = 130 * Math.exp(-beatTime * 35) + 40;
        const kickEnv = Math.exp(-beatTime * 25);
        drumSample += Math.sin(2 * Math.PI * kickPitch * beatTime) * kickEnv * 0.35;
      }
    }
    if (beatInBar === 1 || beatInBar === 3) {
      if (beatTime < 0.14) {
        const snareEnv = Math.exp(-beatTime * 22);
        const snareTone = Math.sin(2 * Math.PI * 180 * Math.exp(-beatTime * 20) * beatTime);
        drumSample += (noiseWave() * 0.7 + snareTone * 0.3) * snareEnv * 0.28;
      }
    }
    const eighthTime = t % (secondsPerBeat / 2);
    if (eighthTime < 0.04) {
      const hatEnv = Math.exp(-eighthTime * 80);
      drumSample += noiseWave() * hatEnv * 0.12;
    }

    let mixed = leadSample + arpSample + bassSample + drumSample;
    mixed = Math.tanh(mixed * 1.1);
    buffer[i] = mixed;
  }

  return encodeWAV(buffer, sampleRate);
}

// Generate Track 2: "Bilis-Isip" (Upbeat Quiz Battle)
function generateQuizTrack() {
  const sampleRate = 44100;
  const bpm = 144;
  const secondsPerBeat = 60 / bpm;
  const sixteenth = secondsPerBeat / 4;
  const bars = 16;
  const totalBeats = bars * 4;
  const duration = totalBeats * secondsPerBeat;
  const totalSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(totalSamples);

  const chordRoots = [
    'A3', 'F3', 'C3', 'G3',
    'A3', 'F3', 'C3', 'G3',
    'A3', 'F3', 'C3', 'G3',
    'A3', 'F3', 'C3', 'G3'
  ];

  const chordNotes = [
    ['A3', 'C4', 'E4', 'A4'],
    ['F3', 'A3', 'C4', 'F4'],
    ['C4', 'E4', 'G4', 'C5'],
    ['G3', 'B3', 'D4', 'G4']
  ];

  const melody = [
    // Bar 1 (Am)
    'A5', 'A5', 'REST', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'E5', 'C5', 'E5', 'A5', 'B5', 'C6', 'D6',
    // Bar 2 (F)
    'C6', 'C6', 'REST', 'A5', 'F5', 'A5', 'C6', 'D6', 'C6', 'A5', 'F5', 'A5', 'C6', 'D6', 'E6', 'REST',
    // Bar 3 (C)
    'E6', 'E6', 'REST', 'C6', 'G5', 'C6', 'E6', 'G6', 'E6', 'D6', 'C6', 'G5', 'E5', 'G5', 'C6', 'E6',
    // Bar 4 (G)
    'D6', 'D6', 'REST', 'B5', 'G5', 'B5', 'D6', 'E6', 'D6', 'B5', 'G5', 'B5', 'D6', 'E6', 'G6', 'REST',

    // Bar 5 (Am)
    'E6', 'C6', 'A5', 'E5', 'A5', 'C6', 'E6', 'A6', 'G6', 'E6', 'C6', 'A5', 'C6', 'E6', 'G6', 'REST',
    // Bar 6 (F)
    'F6', 'C6', 'A5', 'F5', 'A5', 'C6', 'F6', 'A6', 'G6', 'F6', 'E6', 'D6', 'C6', 'D6', 'E6', 'F6',
    // Bar 7 (C)
    'G6', 'E6', 'C6', 'G5', 'C6', 'E6', 'G6', 'C6', 'D6', 'E6', 'F6', 'E6', 'D6', 'C6', 'B5', 'A5',
    // Bar 8 (G)
    'B5', 'G5', 'D5', 'G5', 'B5', 'D6', 'G6', 'F6', 'E6', 'D6', 'C6', 'B5', 'A5', 'B5', 'C6', 'D6',

    // Bar 9 (Am)
    'A5', 'REST', 'A5', 'REST', 'C6', 'REST', 'C6', 'REST', 'E6', 'D6', 'C6', 'B5', 'A5', 'C6', 'E6', 'REST',
    // Bar 10 (F)
    'F5', 'REST', 'F5', 'REST', 'A5', 'REST', 'A5', 'REST', 'C6', 'B5', 'A5', 'G5', 'F5', 'A5', 'C6', 'REST',
    // Bar 11 (C)
    'C5', 'REST', 'C5', 'REST', 'E5', 'REST', 'E5', 'REST', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'G6', 'REST',
    // Bar 12 (G)
    'G5', 'REST', 'G5', 'REST', 'B5', 'REST', 'B5', 'REST', 'D6', 'C6', 'B5', 'A5', 'G5', 'B5', 'D6', 'REST',

    // Bar 13 (Am)
    'E6', 'E6', 'D6', 'C6', 'B5', 'A5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'G6', 'E6', 'D6',
    // Bar 14 (F)
    'C6', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'F5', 'A5', 'C6', 'D6', 'E6', 'F6', 'E6', 'D6', 'C6',
    // Bar 15 (C)
    'G6', 'G6', 'F6', 'E6', 'D6', 'C6', 'B5', 'C6', 'E6', 'G6', 'A6', 'B6', 'C6', 'D6', 'E6', 'REST',
    // Bar 16 (G)
    'D6', 'REST', 'B5', 'REST', 'G5', 'REST', 'D5', 'REST', 'G5', 'B5', 'D6', 'G6', 'F6', 'E6', 'D6', 'B5'
  ];

  let melodyPhase = 0;
  let arpPhase = 0;
  let bassPhase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentSixteenthIndex = Math.floor(t / sixteenth) % melody.length;
    const currentBarIndex = Math.floor(t / (secondsPerBeat * 4)) % 16;
    const chordIndex = currentBarIndex % 4;
    const notesInChord = chordNotes[chordIndex];

    // 1. LEAD MELODY
    const melodyNote = melody[currentSixteenthIndex];
    let leadSample = 0;
    if (melodyNote !== 'REST') {
      const noteFreq = NOTE_FREQS[melodyNote] || 440;
      const noteTime = t % sixteenth;
      let env = 0;
      if (noteTime < 0.003) {
        env = noteTime / 0.003;
      } else if (noteTime < 0.015) {
        env = 1.0 - ((noteTime - 0.003) / 0.012) * 0.2;
      } else if (noteTime < sixteenth - 0.01) {
        env = 0.8;
      } else {
        env = 0.8 * Math.max(0, (sixteenth - noteTime) / 0.01);
      }
      melodyPhase += noteFreq / sampleRate;
      leadSample = pulseWave(melodyPhase, 0.5) * env * 0.23;
    }

    // 2. RAPID ARPEGGIO
    const arpNoteIdx = Math.floor(t / (sixteenth / 2)) % 4;
    const arpNoteName = notesInChord[arpNoteIdx];
    const arpFreq = NOTE_FREQS[arpNoteName] || 440;
    arpPhase += (arpFreq * 2) / sampleRate;
    const arpNoteTime = t % (sixteenth / 2);
    const arpEnv = Math.exp(-arpNoteTime * 30);
    const arpSample = pulseWave(arpPhase, 0.125) * arpEnv * 0.13;

    // 3. GALLOPING BASS
    const sixteenthInBar = Math.floor(t / sixteenth) % 16;
    const rootFreq = NOTE_FREQS[chordRoots[currentBarIndex]] || 130;
    let bFreq = rootFreq;
    if (sixteenthInBar % 4 === 2 || sixteenthInBar % 4 === 3) {
      bFreq = rootFreq * 2;
    }
    bassPhase += bFreq / sampleRate;
    const bNoteTime = t % sixteenth;
    const bEnv = Math.exp(-bNoteTime * 15);
    const bassSample = pulseWave(bassPhase, 0.5) * bEnv * 0.25;

    // 4. DRUMS
    let drumSample = 0;
    const beatTime = t % secondsPerBeat;
    const beatInBar = Math.floor((t % (secondsPerBeat * 4)) / secondsPerBeat);

    if (beatTime < 0.1) {
      const kickPitch = 150 * Math.exp(-beatTime * 45) + 45;
      const kickEnv = Math.exp(-beatTime * 30);
      drumSample += Math.sin(2 * Math.PI * kickPitch * beatTime) * kickEnv * 0.4;
    }

    if (beatInBar === 1 || beatInBar === 3) {
      if (beatTime < 0.15) {
        const snareEnv = Math.exp(-beatTime * 20);
        drumSample += (noiseWave() * 0.75 + Math.sin(2 * Math.PI * 220 * beatTime) * 0.25) * snareEnv * 0.32;
      }
    }

    const sixteenthTime = t % sixteenth;
    if (sixteenthTime < 0.025) {
      const hatEnv = Math.exp(-sixteenthTime * 100);
      drumSample += noiseWave() * hatEnv * 0.14;
    }

    let mixed = leadSample + arpSample + bassSample + drumSample;
    mixed = Math.tanh(mixed * 1.15);
    buffer[i] = mixed;
  }

  return encodeWAV(buffer, sampleRate);
}

console.log('Generating Track 1: Masayang Laro (Playful Chiptune)...');
const playfulWav = generatePlayfulTrack();
fs.writeFileSync(path.join(outputDir, 'chiptune-playful.wav'), playfulWav);
console.log(`Saved chiptune-playful.wav (${(playfulWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('Generating Track 2: Bilis-Isip (Quiz Battle)...');
const quizWav = generateQuizTrack();
fs.writeFileSync(path.join(outputDir, 'chiptune-quiz.wav'), quizWav);
console.log(`Saved chiptune-quiz.wav (${(quizWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('Music generation complete!');
