const fs = require('fs');
const path = require('path');

// Output directory
const outputDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Universal Note to Frequency calculator (supports naturals, sharps, flats across all octaves)
function getNoteFreq(note) {
  if (!note || note === 'REST') return 0;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const clean = note
    .replace('Db', 'C#')
    .replace('Eb', 'D#')
    .replace('Gb', 'F#')
    .replace('Ab', 'G#')
    .replace('Bb', 'A#');
  const match = clean.match(/^([A-G]#?)([0-8])$/);
  if (!match) return 440;
  const semitone = noteNames.indexOf(match[1]);
  const octave = parseInt(match[2], 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Standard 16-bit Stereo WAV file encoder
function encodeWAV(samplesL, samplesR, sampleRate = 44100) {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samplesL.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // Linear PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samplesL.length; i++) {
    const sL = Math.max(-1, Math.min(1, samplesL[i]));
    const sR = samplesR ? Math.max(-1, Math.min(1, samplesR[i])) : sL;

    const valL = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
    const valR = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;

    buffer.writeInt16LE(Math.round(valL), offset);
    buffer.writeInt16LE(Math.round(valR), offset + 2);
    offset += 4;
  }

  return buffer;
}

// Waveform Primitives
function pulseWave(phase, duty = 0.5) {
  return (phase % 1.0) < duty ? 1.0 : -1.0;
}

function triangleWave(phase) {
  const p = phase % 1.0;
  return 4.0 * Math.abs(p - 0.5) - 1.0;
}

function sineWave(phase) {
  return Math.sin(2 * Math.PI * phase);
}

function noiseWave() {
  return (Math.random() * 2.0) - 1.0;
}

// ==========================================
// TRACK 1: "Masayang Laro" (Playful Chiptune - 126 BPM)
// ==========================================
function generatePlayfulTrack() {
  const sampleRate = 44100;
  const bpm = 126;
  const secondsPerBeat = 60 / bpm;
  const sixteenth = secondsPerBeat / 4;
  const bars = 16;
  const totalBeats = bars * 4;
  const duration = totalBeats * secondsPerBeat;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  const chordRoots = [
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3',
    'C3', 'G3', 'A3', 'F3'
  ];

  const chordNotes = [
    ['C4', 'E4', 'G4', 'C5'],
    ['G3', 'B3', 'D4', 'G4'],
    ['A3', 'C4', 'E4', 'A4'],
    ['F3', 'A3', 'C4', 'F4']
  ];

  const melody = [
    'C5', 'REST', 'E5', 'G5', 'E5', 'REST', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5',
    'B4', 'REST', 'D5', 'G5', 'D5', 'REST', 'B4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'C5', 'B4', 'G4',
    'C5', 'REST', 'E5', 'A5', 'E5', 'REST', 'C5', 'D5', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'E5',
    'F5', 'G5', 'A5', 'C6', 'A5', 'G5', 'F5', 'E5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6',
    'E5', 'G5', 'C6', 'G5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'C6', 'D6', 'E6', 'REST',
    'D5', 'G5', 'B5', 'G5', 'D5', 'G5', 'D5', 'C5', 'B4', 'C5', 'D5', 'G5', 'B5', 'C6', 'D6', 'REST',
    'C5', 'E5', 'A5', 'E5', 'C5', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'E5', 'D5', 'C5', 'A4',
    'F4', 'A4', 'C5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'F5', 'A5', 'B5', 'G5', 'A5', 'B5', 'REST',
    'C5', 'C5', 'REST', 'E5', 'G5', 'G5', 'REST', 'E5', 'C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5', 'REST',
    'B4', 'B4', 'REST', 'D5', 'G5', 'G5', 'REST', 'D5', 'B4', 'D5', 'G5', 'B5', 'G5', 'D5', 'B4', 'REST',
    'A4', 'A4', 'REST', 'C5', 'E5', 'E5', 'REST', 'C5', 'A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'REST',
    'F4', 'F4', 'REST', 'A4', 'C5', 'C5', 'REST', 'A4', 'F4', 'A4', 'C5', 'F5', 'G5', 'A5', 'B5', 'REST',
    'C6', 'REST', 'G5', 'E5', 'C5', 'E5', 'G5', 'C6', 'E6', 'D6', 'C6', 'G5', 'A5', 'G5', 'E5', 'D5',
    'B5', 'REST', 'G5', 'D5', 'B4', 'D5', 'G5', 'B5', 'D6', 'C6', 'B5', 'G5', 'A5', 'G5', 'F5', 'D5',
    'A5', 'REST', 'E5', 'C5', 'A4', 'C5', 'E5', 'A5', 'C6', 'B5', 'A5', 'E5', 'G5', 'A5', 'B5', 'C6',
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

    const melodyNote = melody[currentSixteenthIndex];
    let leadSample = 0;
    if (melodyNote !== 'REST') {
      const noteFreq = getNoteFreq(melodyNote);
      const noteTime = t % sixteenth;
      let env = 0;
      if (noteTime < 0.006) env = noteTime / 0.006;
      else if (noteTime < 0.03) env = 1.0 - ((noteTime - 0.006) / 0.024) * 0.3;
      else if (noteTime < sixteenth - 0.015) env = 0.7;
      else env = 0.7 * Math.max(0, (sixteenth - noteTime) / 0.015);

      const vibrato = 1.0 + 0.008 * Math.sin(2 * Math.PI * 5.0 * t);
      melodyPhase += (noteFreq * vibrato) / sampleRate;
      leadSample = pulseWave(melodyPhase, 0.25) * env * 0.22;
    }

    const arpNoteIdx = Math.floor(t / (sixteenth / 2)) % 4;
    const arpNoteName = notesInChord[arpNoteIdx];
    const arpFreq = getNoteFreq(arpNoteName);
    arpPhase += arpFreq / sampleRate;
    const arpNoteTime = t % (sixteenth / 2);
    const arpEnv = Math.exp(-arpNoteTime * 25);
    const arpSample = pulseWave(arpPhase, 0.125) * arpEnv * 0.12;

    const beatTime = t % secondsPerBeat;
    const beatInBar = Math.floor((t % (secondsPerBeat * 4)) / secondsPerBeat);
    const rootFreq = getNoteFreq(chordRoots[currentBarIndex]);
    let bassFreq = rootFreq;
    if (beatInBar === 1 || beatInBar === 3) bassFreq = rootFreq * 1.5;
    bassPhase += bassFreq / sampleRate;
    const bassEnv = Math.max(0, 1.0 - (beatTime / (secondsPerBeat * 0.85)));
    const bassSample = triangleWave(bassPhase) * bassEnv * 0.32;

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
    bufferL[i] = mixed * 0.95;
    bufferR[i] = mixed * 0.95;
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK 2: "Bilis-Isip" (Quiz Battle - 144 BPM)
// ==========================================
function generateQuizTrack() {
  const sampleRate = 44100;
  const bpm = 144;
  const secondsPerBeat = 60 / bpm;
  const sixteenth = secondsPerBeat / 4;
  const bars = 16;
  const totalBeats = bars * 4;
  const duration = totalBeats * secondsPerBeat;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

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
    'A5', 'A5', 'REST', 'E5', 'A5', 'B5', 'C6', 'B5', 'A5', 'E5', 'C5', 'E5', 'A5', 'B5', 'C6', 'D6',
    'C6', 'C6', 'REST', 'A5', 'F5', 'A5', 'C6', 'D6', 'C6', 'A5', 'F5', 'A5', 'C6', 'D6', 'E6', 'REST',
    'E6', 'E6', 'REST', 'C6', 'G5', 'C6', 'E6', 'G6', 'E6', 'D6', 'C6', 'G5', 'E5', 'G5', 'C6', 'E6',
    'D6', 'D6', 'REST', 'B5', 'G5', 'B5', 'D6', 'E6', 'D6', 'B5', 'G5', 'B5', 'D6', 'E6', 'G6', 'REST',
    'E6', 'C6', 'A5', 'E5', 'A5', 'C6', 'E6', 'A6', 'G6', 'E6', 'C6', 'A5', 'C6', 'E6', 'G6', 'REST',
    'F6', 'C6', 'A5', 'F5', 'A5', 'C6', 'F6', 'A6', 'G6', 'F6', 'E6', 'D6', 'C6', 'D6', 'E6', 'F6',
    'G6', 'E6', 'C6', 'G5', 'C6', 'E6', 'G6', 'C6', 'D6', 'E6', 'F6', 'E6', 'D6', 'C6', 'B5', 'A5',
    'B5', 'G5', 'D5', 'G5', 'B5', 'D6', 'G6', 'F6', 'E6', 'D6', 'C6', 'B5', 'A5', 'B5', 'C6', 'D6',
    'A5', 'REST', 'A5', 'REST', 'C6', 'REST', 'C6', 'REST', 'E6', 'D6', 'C6', 'B5', 'A5', 'C6', 'E6', 'REST',
    'F5', 'REST', 'F5', 'REST', 'A5', 'REST', 'A5', 'REST', 'C6', 'B5', 'A5', 'G5', 'F5', 'A5', 'C6', 'REST',
    'C5', 'REST', 'C5', 'REST', 'E5', 'REST', 'E5', 'REST', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'G6', 'REST',
    'G5', 'REST', 'G5', 'REST', 'B5', 'REST', 'B5', 'REST', 'D6', 'C6', 'B5', 'A5', 'G5', 'B5', 'D6', 'REST',
    'E6', 'E6', 'D6', 'C6', 'B5', 'A5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'G6', 'E6', 'D6',
    'C6', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'F5', 'A5', 'C6', 'D6', 'E6', 'F6', 'E6', 'D6', 'C6',
    'G6', 'G6', 'F6', 'E6', 'D6', 'C6', 'B5', 'C6', 'E6', 'G6', 'A6', 'B6', 'C6', 'D6', 'E6', 'REST',
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

    const melodyNote = melody[currentSixteenthIndex];
    let leadSample = 0;
    if (melodyNote !== 'REST') {
      const noteFreq = getNoteFreq(melodyNote);
      const noteTime = t % sixteenth;
      let env = 0;
      if (noteTime < 0.003) env = noteTime / 0.003;
      else if (noteTime < 0.015) env = 1.0 - ((noteTime - 0.003) / 0.012) * 0.2;
      else if (noteTime < sixteenth - 0.01) env = 0.8;
      else env = 0.8 * Math.max(0, (sixteenth - noteTime) / 0.01);
      melodyPhase += noteFreq / sampleRate;
      leadSample = pulseWave(melodyPhase, 0.5) * env * 0.23;
    }

    const arpNoteIdx = Math.floor(t / (sixteenth / 2)) % 4;
    const arpNoteName = notesInChord[arpNoteIdx];
    const arpFreq = getNoteFreq(arpNoteName);
    arpPhase += (arpFreq * 2) / sampleRate;
    const arpNoteTime = t % (sixteenth / 2);
    const arpEnv = Math.exp(-arpNoteTime * 30);
    const arpSample = pulseWave(arpPhase, 0.125) * arpEnv * 0.13;

    const sixteenthInBar = Math.floor(t / sixteenth) % 16;
    const rootFreq = getNoteFreq(chordRoots[currentBarIndex]);
    let bFreq = rootFreq;
    if (sixteenthInBar % 4 === 2 || sixteenthInBar % 4 === 3) bFreq = rootFreq * 2;
    bassPhase += bFreq / sampleRate;
    const bNoteTime = t % sixteenth;
    const bEnv = Math.exp(-bNoteTime * 15);
    const bassSample = pulseWave(bassPhase, 0.5) * bEnv * 0.25;

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
    bufferL[i] = mixed * 0.95;
    bufferR[i] = mixed * 0.95;
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK 3: "Payapang Pag-aaral" (Calm Lo-Fi Study Beats - 78 BPM)
// ==========================================
function generateCalmTrack() {
  const sampleRate = 44100;
  const bpm = 78;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  // Soothing Lo-Fi Jazz Chords: Fmaj7 -> Em7 -> Dm7 -> Cmaj7 (repeated 2x)
  const chordRoots = ['F2', 'E2', 'D2', 'C2', 'F2', 'E2', 'D2', 'C2'];
  const chordVoicings = [
    ['F3', 'A3', 'C4', 'E4'], // Fmaj7
    ['E3', 'G3', 'B3', 'D4'], // Em7
    ['D3', 'F3', 'A3', 'C4'], // Dm7
    ['C3', 'E3', 'G3', 'B3'], // Cmaj7
    ['F3', 'A3', 'C4', 'E4'],
    ['E3', 'G3', 'B3', 'D4'],
    ['D3', 'F3', 'A3', 'C4'],
    ['C3', 'E3', 'G3', 'B3']
  ];

  // Relaxing pentatonic lead notes (spread across each bar)
  const lofiMelody = [
    // Bar 1 (Fmaj7)
    { t: 0.5, note: 'A4', dur: 1.2 }, { t: 2.0, note: 'C5', dur: 1.0 }, { t: 3.2, note: 'E5', dur: 0.6 },
    // Bar 2 (Em7)
    { t: 4.5, note: 'D5', dur: 1.0 }, { t: 6.0, note: 'B4', dur: 1.4 },
    // Bar 3 (Dm7)
    { t: 8.5, note: 'A4', dur: 0.8 }, { t: 9.8, note: 'F4', dur: 1.0 }, { t: 11.2, note: 'G4', dur: 0.7 },
    // Bar 4 (Cmaj7)
    { t: 12.5, note: 'E4', dur: 1.8 }, { t: 14.5, note: 'G4', dur: 1.2 },
    // Bar 5 (Fmaj7)
    { t: 16.5, note: 'C5', dur: 1.0 }, { t: 18.0, note: 'E5', dur: 1.2 }, { t: 19.5, note: 'D5', dur: 0.6 },
    // Bar 6 (Em7)
    { t: 20.5, note: 'B4', dur: 1.2 }, { t: 22.0, note: 'G4', dur: 1.5 },
    // Bar 7 (Dm7)
    { t: 24.5, note: 'A4', dur: 1.0 }, { t: 26.0, note: 'F4', dur: 1.0 }, { t: 27.2, note: 'D4', dur: 0.7 },
    // Bar 8 (Cmaj7)
    { t: 28.5, note: 'E4', dur: 2.5 }
  ];

  // Rhodes synthesizer function: warm sine + 2nd harmonic + gentle tremolo
  function rhodesSample(freq, noteTime, duration) {
    if (noteTime < 0 || noteTime > duration) return 0;
    const attack = 0.015;
    const env = noteTime < attack 
      ? noteTime / attack 
      : Math.exp(-(noteTime - attack) * 1.8);
    const tremolo = 1.0 + 0.08 * Math.sin(2 * Math.PI * 4.5 * noteTime);
    // fundamental + soft 2nd harmonic + subtle 3rd
    const f1 = sineWave(freq * noteTime);
    const f2 = sineWave(freq * 2 * noteTime) * 0.35;
    const f3 = sineWave(freq * 3 * noteTime) * 0.12;
    return (f1 + f2 + f3) * env * tremolo;
  }

  // Pre-generate vinyl crackle / tape warmth
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;
    const beatTime = t % secondsPerBeat;
    const beatInBar = Math.floor(barTime / secondsPerBeat);

    // 1. Warm Rhodes Chords (Strummed slightly on beat 0 and beat 2.5)
    let chordL = 0;
    let chordR = 0;
    const notes = chordVoicings[barIndex];
    // Chord hit 1: beat 0
    for (let n = 0; n < notes.length; n++) {
      const f = getNoteFreq(notes[n]);
      const strumDelay = n * 0.022; // natural loose lo-fi strum
      const noteTime = barTime - strumDelay;
      const s = rhodesSample(f, noteTime, barDuration * 0.85);
      const pan = (n / (notes.length - 1)) * 0.4 - 0.2; // slight stereo spread
      chordL += s * (0.5 - pan);
      chordR += s * (0.5 + pan);
    }
    // Chord hit 2: syncopated on beat 2.5
    if (barTime >= secondsPerBeat * 2.5) {
      const syncTime = barTime - secondsPerBeat * 2.5;
      for (let n = 0; n < notes.length; n++) {
        const f = getNoteFreq(notes[n]);
        const strumDelay = n * 0.02;
        const s = rhodesSample(f, syncTime - strumDelay, barDuration * 0.4);
        chordL += s * 0.35;
        chordR += s * 0.35;
      }
    }

    // 2. Warm Lo-Fi Sub Bass
    const rootF = getNoteFreq(chordRoots[barIndex]);
    const bassTime = barTime % (secondsPerBeat * 2);
    const bassEnv = Math.exp(-bassTime * 1.2);
    // Soft saturated sub bass
    const rawBass = sineWave(rootF * t) + 0.3 * sineWave(rootF * 2 * t);
    const bassSample = Math.tanh(rawBass * 1.2) * bassEnv * 0.35;

    // 3. Relaxed Lo-Fi Boom-Bap Drums
    let drumL = 0;
    let drumR = 0;
    // Kick on beat 0, and offbeat at beat 2.5
    const isKickTime = (beatInBar === 0 && beatTime < 0.15) || 
                       (beatInBar === 2 && beatTime >= secondsPerBeat * 0.5 && (beatTime - secondsPerBeat * 0.5) < 0.15);
    if (isKickTime) {
      const kTime = beatInBar === 0 ? beatTime : (beatTime - secondsPerBeat * 0.5);
      const kPitch = 85 * Math.exp(-kTime * 30) + 38;
      const kEnv = Math.exp(-kTime * 18);
      const kick = Math.sin(2 * Math.PI * kPitch * kTime) * kEnv * 0.45;
      drumL += kick;
      drumR += kick;
    }
    // Snare / Rim on beat 2 and beat 4 (beatInBar 1 and 3)
    if (beatInBar === 1 || beatInBar === 3) {
      if (beatTime < 0.16) {
        const sEnv = Math.exp(-beatTime * 20);
        // lowpass filtered noise + 160Hz tone
        const rim = (noiseWave() * 0.55 + Math.sin(2 * Math.PI * 165 * beatTime) * 0.45) * sEnv * 0.28;
        drumL += rim;
        drumR += rim;
      }
    }
    // Relaxed swung hi-hats (every 8th note, with slight swing delay on offbeat)
    const eighthDuration = secondsPerBeat / 2;
    const eighthIndex = Math.floor(t / eighthDuration);
    const isSwung = eighthIndex % 2 === 1;
    const swingOffset = isSwung ? 0.03 : 0;
    const hatTime = (t - swingOffset) % eighthDuration;
    if (hatTime >= 0 && hatTime < 0.035) {
      const hEnv = Math.exp(-hatTime * 85);
      const hat = noiseWave() * hEnv * (isSwung ? 0.09 : 0.13);
      drumL += hat * 0.6;
      drumR += hat * 0.4;
    }

    // 4. Lo-Fi Lead Melody
    let melL = 0;
    let melR = 0;
    for (let m = 0; m < lofiMelody.length; m++) {
      const item = lofiMelody[m];
      const itemTime = t - item.t;
      if (itemTime >= 0 && itemTime <= item.dur) {
        const f = getNoteFreq(item.note);
        const s = rhodesSample(f, itemTime, item.dur) * 0.38;
        melL += s * 0.55;
        melR += s * 0.45;
      }
    }

    // 5. Subtle vinyl crackle
    const vinyl = (Math.random() < 0.003 ? noiseWave() * 0.15 : 0) + noiseWave() * 0.006;

    const outL = chordL * 0.32 + bassSample + drumL + melL + vinyl;
    const outR = chordR * 0.32 + bassSample + drumR + melR + vinyl;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK 4: "Masiglang Umaga" (Joyful Acoustic Sunshine - 116 BPM)
// ==========================================
function generateJoyfulTrack() {
  const sampleRate = 44100;
  const bpm = 116;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  // Joyful, uplifting chord progression: G -> D -> Em -> C (played 2 times)
  const chordRoots = ['G2', 'D2', 'E2', 'C2', 'G2', 'D2', 'E2', 'C2'];
  const chordArps = [
    ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], // G
    ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], // D
    ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'], // Em
    ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], // C
    ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'],
    ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'],
    ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'],
    ['C3', 'E3', 'G3', 'C4', 'E4', 'G4']
  ];

  // Marimba sound generator (woody, round, bright exponential decay)
  function marimbaSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 12.0);
    const transient = Math.sin(2 * Math.PI * freq * 3.8 * time) * Math.exp(-time * 60) * 0.3;
    const body = Math.sin(2 * Math.PI * freq * time);
    const harmonic = Math.sin(2 * Math.PI * freq * 2.0 * time) * 0.25;
    return (body + harmonic + transient) * env;
  }

  // Acoustic Pluck Guitar
  function pluckSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 6.5);
    const s1 = triangleWave(freq * time);
    const s2 = sineWave(freq * 2 * time) * 0.2;
    return (s1 + s2) * env;
  }

  // Joyful whistling / flute melody
  const joyfulMelody = [
    // Bar 1 (G)
    { t: 0.0, note: 'B4', dur: 0.4 }, { t: 0.5, note: 'D5', dur: 0.4 }, { t: 1.0, note: 'G5', dur: 0.8 }, { t: 1.8, note: 'F#5', dur: 0.3 },
    // Bar 2 (D)
    { t: 2.1, note: 'D5', dur: 0.8 }, { t: 3.0, note: 'A4', dur: 0.6 }, { t: 3.6, note: 'B4', dur: 0.4 },
    // Bar 3 (Em)
    { t: 4.2, note: 'G5', dur: 0.6 }, { t: 4.8, note: 'E5', dur: 0.6 }, { t: 5.4, note: 'G5', dur: 0.6 }, { t: 6.0, note: 'B5', dur: 0.8 },
    // Bar 4 (C)
    { t: 6.8, note: 'A5', dur: 0.5 }, { t: 7.4, note: 'G5', dur: 0.8 }, { t: 8.0, note: 'E5', dur: 0.4 },
    // Bar 5 (G) - Variation
    { t: 8.5, note: 'G5', dur: 0.5 }, { t: 9.0, note: 'A5', dur: 0.5 }, { t: 9.5, note: 'B5', dur: 0.8 }, { t: 10.4, note: 'D6', dur: 0.5 },
    // Bar 6 (D)
    { t: 10.9, note: 'B5', dur: 0.6 }, { t: 11.5, note: 'A5', dur: 0.7 }, { t: 12.3, note: 'G5', dur: 0.4 },
    // Bar 7 (Em)
    { t: 12.8, note: 'E5', dur: 0.6 }, { t: 13.4, note: 'G5', dur: 0.6 }, { t: 14.0, note: 'A5', dur: 0.5 }, { t: 14.6, note: 'B5', dur: 0.6 },
    // Bar 8 (C) - Joyful resolution
    { t: 15.2, note: 'G5', dur: 1.2 }
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;
    const beatTime = t % secondsPerBeat;
    const sixteenth = secondsPerBeat / 4;
    const beatInBar = Math.floor(barTime / secondsPerBeat);

    // 1. Acoustic Guitar Pluck Arpeggio (16th notes cascading)
    const arpNotes = chordArps[barIndex];
    const sixteenthIdx = Math.floor(barTime / sixteenth) % 16;
    const noteInArp = arpNotes[sixteenthIdx % arpNotes.length];
    const timeSinceSixteenth = barTime % sixteenth;
    const guitarSample = pluckSample(getNoteFreq(noteInArp), timeSinceSixteenth) * 0.22;

    // 2. Woody Marimba Chords (accenting beats 0, 1.5, and 3)
    let marimbaL = 0;
    let marimbaR = 0;
    const mTriggers = [0, secondsPerBeat * 1.5, secondsPerBeat * 3];
    for (let m = 0; m < mTriggers.length; m++) {
      const mt = barTime - mTriggers[m];
      if (mt >= 0 && mt < 0.4) {
        for (let n = 0; n < 3; n++) {
          const f = getNoteFreq(arpNotes[n + 2]);
          const s = marimbaSample(f, mt + n * 0.015);
          marimbaL += s * 0.18;
          marimbaR += s * 0.18;
        }
      }
    }

    // 3. Upright Acoustic Bouncy Bass
    const rootF = getNoteFreq(chordRoots[barIndex]);
    let bassF = rootF;
    if (beatInBar === 2 || beatInBar === 3) bassF = rootF * 1.5; // 5th bounce
    const bassTime = beatTime;
    const bassEnv = Math.exp(-bassTime * 5.0);
    const bassSample = (triangleWave(bassF * t) * 0.7 + sineWave(bassF * t) * 0.3) * bassEnv * 0.35;

    // 4. Shaker & Handclap Drums
    let drumL = 0;
    let drumR = 0;
    // Bouncy kick on beat 0 and 2
    if ((beatInBar === 0 || beatInBar === 2) && beatTime < 0.12) {
      const kPitch = 120 * Math.exp(-beatTime * 35) + 45;
      const kEnv = Math.exp(-beatTime * 25);
      const kick = Math.sin(2 * Math.PI * kPitch * beatTime) * kEnv * 0.35;
      drumL += kick;
      drumR += kick;
    }
    // Crisp handclap / snare on beat 1 and 3
    if ((beatInBar === 1 || beatInBar === 3) && beatTime < 0.14) {
      const cEnv = Math.exp(-beatTime * 25);
      const clap = (noiseWave() * 0.7 + Math.sin(2 * Math.PI * 240 * beatTime) * 0.3) * cEnv * 0.25;
      drumL += clap;
      drumR += clap;
    }
    // 16th note crisp acoustic shaker
    const shakerTime = t % (sixteenth);
    if (shakerTime < 0.03) {
      const sEnv = Math.exp(-shakerTime * 110);
      const shaker = noiseWave() * sEnv * 0.08;
      drumL += shaker * 0.4;
      drumR += shaker * 0.6;
    }

    // 5. Joyful Whistling Flute
    let fluteSample = 0;
    for (let m = 0; m < joyfulMelody.length; m++) {
      const item = joyfulMelody[m];
      const itemTime = t - item.t;
      if (itemTime >= 0 && itemTime <= item.dur) {
        const f = getNoteFreq(item.note);
        const vibrato = 1.0 + 0.01 * Math.sin(2 * Math.PI * 5.5 * itemTime);
        const env = itemTime < 0.04 
          ? itemTime / 0.04 
          : itemTime > item.dur - 0.05 
          ? (item.dur - itemTime) / 0.05 
          : 1.0;
        const tone = sineWave(f * vibrato * t) + 0.15 * sineWave(f * 2 * vibrato * t);
        const breath = noiseWave() * 0.04;
        fluteSample += (tone + breath) * env * 0.28;
      }
    }

    const outL = guitarSample * 0.7 + marimbaL + bassSample + drumL + fluteSample * 0.75;
    const outR = guitarSample * 0.7 + marimbaR + bassSample + drumR + fluteSample * 0.75;

    bufferL[i] = Math.tanh(outL * 1.1);
    bufferR[i] = Math.tanh(outR * 1.1);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK 5: "Pagninilay-nilay" (Melancholic Piano & Strings - 70 BPM)
// ==========================================
function generateMelancholicTrack() {
  const sampleRate = 44100;
  const bpm = 70;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  // Poetic minor progression: Dm -> Bb -> F -> C (repeated 2x)
  const chordRoots = ['D2', 'A#1', 'F2', 'C2', 'D2', 'A#1', 'F2', 'C2'];
  const pianoChords = [
    ['D3', 'F3', 'A3', 'D4'], // Dm
    ['A#2', 'D3', 'F3', 'A#3'], // Bb
    ['F2', 'C3', 'F3', 'A3'],  // F
    ['C3', 'E3', 'G3', 'C4'],  // C
    ['D3', 'F3', 'A3', 'D4'],
    ['A#2', 'D3', 'F3', 'A#3'],
    ['F2', 'C3', 'F3', 'A3'],
    ['C3', 'E3', 'G3', 'C4']
  ];

  // Felt acoustic piano synthesis (sine harmonics + frequency-dependent decay)
  function feltPianoSample(freq, time) {
    if (time < 0) return 0;
    const attack = 0.008;
    const env = time < attack ? time / attack : 1.0;
    const h1 = Math.sin(2 * Math.PI * freq * time) * Math.exp(-time * 1.5);
    const h2 = Math.sin(2 * Math.PI * freq * 2.0 * time) * Math.exp(-time * 3.0) * 0.4;
    const h3 = Math.sin(2 * Math.PI * freq * 3.0 * time) * Math.exp(-time * 5.0) * 0.18;
    const h4 = Math.sin(2 * Math.PI * freq * 4.0 * time) * Math.exp(-time * 8.0) * 0.08;
    return (h1 + h2 + h3 + h4) * env;
  }

  // Melancholic, emotional piano melody
  const pianoMelody = [
    // Bar 1 (Dm)
    { t: 0.0, note: 'A4', dur: 1.8 }, { t: 2.0, note: 'F4', dur: 1.2 },
    // Bar 2 (Bb)
    { t: 3.5, note: 'D4', dur: 1.4 }, { t: 5.2, note: 'F4', dur: 1.6 },
    // Bar 3 (F)
    { t: 6.9, note: 'C5', dur: 1.8 }, { t: 8.8, note: 'A4', dur: 1.4 },
    // Bar 4 (C)
    { t: 10.3, note: 'G4', dur: 2.2 }, { t: 12.8, note: 'E4', dur: 0.8 },
    // Bar 5 (Dm) - Poignant climax
    { t: 13.8, note: 'D5', dur: 1.6 }, { t: 15.6, note: 'F5', dur: 1.5 },
    // Bar 6 (Bb)
    { t: 17.2, note: 'E5', dur: 1.2 }, { t: 18.6, note: 'D5', dur: 1.8 },
    // Bar 7 (F)
    { t: 20.6, note: 'C5', dur: 1.8 }, { t: 22.5, note: 'A4', dur: 1.4 },
    // Bar 8 (C) - Fading contemplation
    { t: 24.1, note: 'G4', dur: 3.0 }
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;

    // 1. Felt Piano Broken Chords (Arpeggiated softly on beats 0, 1, 2, 3)
    let pianoL = 0;
    let pianoR = 0;
    const chordNotes = pianoChords[barIndex];
    for (let n = 0; n < chordNotes.length; n++) {
      const f = getNoteFreq(chordNotes[n]);
      const noteDelay = n * (secondsPerBeat * 0.9);
      const nt = barTime - noteDelay;
      if (nt >= 0) {
        const s = feltPianoSample(f, nt) * 0.28;
        const pan = (n / (chordNotes.length - 1)) * 0.3 - 0.15;
        pianoL += s * (0.5 - pan);
        pianoR += s * (0.5 + pan);
      }
    }

    // 2. Ambient String Pad (Lush, slow attack & release behind piano)
    let padSample = 0;
    for (let n = 0; n < chordNotes.length; n++) {
      const f = getNoteFreq(chordNotes[n]);
      const saw = (triangleWave(f * t) * 0.8 + sineWave(f * t) * 0.2);
      padSample += saw * 0.05;
    }

    // 3. Deep Resonant Bass Notes
    const rootF = getNoteFreq(chordRoots[barIndex]);
    const bassTime = barTime;
    const bassEnv = Math.exp(-bassTime * 0.6);
    const bassSample = sineWave(rootF * t) * bassEnv * 0.32;

    // 4. Emotional Piano Solo Line
    let melL = 0;
    let melR = 0;
    for (let m = 0; m < pianoMelody.length; m++) {
      const item = pianoMelody[m];
      const itemTime = t - item.t;
      if (itemTime >= 0 && itemTime <= item.dur + 0.8) {
        const f = getNoteFreq(item.note);
        const s = feltPianoSample(f, itemTime) * 0.42;
        melL += s * 0.55;
        melR += s * 0.45;
      }
    }

    // 5. Delicate Ambient Chime Drop (sparse emotional water droplet/chime)
    let chimeSample = 0;
    const chimeTimes = [2.5, 6.0, 9.5, 13.0, 16.5, 20.0, 23.5];
    for (let c = 0; c < chimeTimes.length; c++) {
      const ct = t - chimeTimes[c];
      if (ct >= 0 && ct < 0.8) {
        const chimeFreq = 2093.0; // C7
        const cEnv = Math.exp(-ct * 8);
        chimeSample += sineWave(chimeFreq * ct) * cEnv * 0.04;
      }
    }

    const outL = pianoL + padSample + bassSample + melL + chimeSample;
    const outR = pianoR + padSample + bassSample + melR + chimeSample;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK 6: "Tahimik na Gabi" (Cozy Dreamy Ambient / Night - 84 BPM)
// ==========================================
function generateCozyTrack() {
  const sampleRate = 44100;
  const bpm = 84;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  // Soothing night chords: Cmaj7 -> Am7 -> Dm7 -> G7 (played 2 times)
  const chordRoots = ['C2', 'A1', 'D2', 'G1', 'C2', 'A1', 'D2', 'G1'];
  const bellChords = [
    ['C5', 'E5', 'G5', 'B5'],
    ['A4', 'C5', 'E5', 'G5'],
    ['D5', 'F5', 'A5', 'C6'],
    ['G4', 'B4', 'D5', 'F5'],
    ['C5', 'E5', 'G5', 'B5'],
    ['A4', 'C5', 'E5', 'G5'],
    ['D5', 'F5', 'A5', 'C6'],
    ['G4', 'B4', 'D5', 'F5']
  ];

  // Music Box / Celesta Bell synthesis
  function musicBoxSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 5.5);
    const b1 = Math.sin(2 * Math.PI * freq * time);
    const b2 = Math.sin(2 * Math.PI * freq * 2.0 * time) * 0.35;
    const b3 = Math.sin(2 * Math.PI * freq * 3.01 * time) * 0.15; // slightly inharmonic bell overtone
    return (b1 + b2 + b3) * env;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;
    const beatTime = t % secondsPerBeat;
    const beatInBar = Math.floor(barTime / secondsPerBeat);

    // 1. Music Box Bell Drops (soft tinkling lullaby pattern on 8th notes)
    let bellsL = 0;
    let bellsR = 0;
    const eighthDuration = secondsPerBeat / 2;
    const eighthIdx = Math.floor(barTime / eighthDuration) % 8;
    const timeSinceEighth = barTime % eighthDuration;
    const bellNotes = bellChords[barIndex];
    // Tinkling pattern
    const pattern = [0, 2, 1, 3, 2, 1, 2, 3];
    const note = bellNotes[pattern[eighthIdx]];
    const s = musicBoxSample(getNoteFreq(note), timeSinceEighth) * 0.24;
    const pan = (pattern[eighthIdx] / 3) * 0.4 - 0.2;
    bellsL = s * (0.5 - pan);
    bellsR = s * (0.5 + pan);

    // 2. Warm Dreamy Analog Pad (Slow undulating cutoff)
    const filterLFO = 1.0 + 0.2 * Math.sin(2 * Math.PI * 0.15 * t);
    let padSample = 0;
    for (let n = 0; n < bellNotes.length; n++) {
      const f = getNoteFreq(bellNotes[n]) * 0.5; // octave lower for warmth
      padSample += sineWave(f * t) * 0.08 * filterLFO;
    }

    // 3. Soothing Pulse Bass
    const rootF = getNoteFreq(chordRoots[barIndex]);
    const bassEnv = Math.exp(-(barTime % (secondsPerBeat * 2)) * 1.5);
    const bassSample = sineWave(rootF * t) * bassEnv * 0.32;

    // 4. Subtle Night Rain / Cozy Hum
    const cozyNoise = noiseWave() * 0.008;

    const outL = bellsL + padSample + bassSample + cozyNoise;
    const outR = bellsR + padSample + bassSample + cozyNoise;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK: "Kapihan sa Hatinggabi" (Midnight Café Jazz - 84 BPM)
// ==========================================
function generateJazzTrack() {
  const sampleRate = 44100;
  const bpm = 84;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  const jazzChords = [
    ['F3', 'A3', 'C4', 'E4'],        // Dm9
    ['F3', 'B3', 'E4', 'A4'],        // G13
    ['E3', 'G3', 'B3', 'D4'],        // Cmaj9
    ['G3', 'A#3', 'C#4', 'F4'],      // A7b9
    ['F3', 'A3', 'C4', 'E4'],        // Dm9
    ['F3', 'B3', 'D#4', 'G#4'],      // G7alt
    ['G3', 'B3', 'D4', 'F#4'],       // Em9
    ['F3', 'A3', 'C4', 'E4']         // Dm9 turnaround
  ];

  const walkingBass = [
    'D2', 'F2', 'G#2', 'A2',
    'G2', 'B2', 'D3', 'Db3',
    'C2', 'E2', 'G2', 'G#2',
    'A2', 'C#3', 'E3', 'Eb3',
    'D2', 'A2', 'C3', 'B2',
    'G2', 'F2', 'D#2', 'Db2',
    'E2', 'G2', 'B2', 'C3',
    'D2', 'F2', 'G2', 'G#2'
  ];

  const vibeMelody = [
    { t: 0.5, note: 'E5', dur: 0.6 }, { t: 1.4, note: 'C5', dur: 0.5 }, { t: 2.1, note: 'A4', dur: 0.8 },
    { t: 3.2, note: 'B4', dur: 0.5 }, { t: 4.0, note: 'E5', dur: 1.0 }, { t: 5.2, note: 'D5', dur: 0.6 },
    { t: 6.2, note: 'G5', dur: 0.7 }, { t: 7.2, note: 'E5', dur: 0.8 }, { t: 8.2, note: 'D5', dur: 0.6 },
    { t: 9.2, note: 'C#5', dur: 0.6 }, { t: 10.0, note: 'A#4', dur: 0.7 }, { t: 11.0, note: 'A4', dur: 0.8 },
    { t: 12.2, note: 'A5', dur: 0.8 }, { t: 13.3, note: 'F5', dur: 0.6 }, { t: 14.1, note: 'E5', dur: 0.5 },
    { t: 15.0, note: 'D#5', dur: 0.6 }, { t: 16.0, note: 'B4', dur: 0.9 }, { t: 17.2, note: 'G#4', dur: 0.6 },
    { t: 18.2, note: 'F#5', dur: 0.8 }, { t: 19.3, note: 'D5', dur: 0.7 }, { t: 20.2, note: 'B4', dur: 0.7 },
    { t: 21.2, note: 'C5', dur: 0.6 }, { t: 22.0, note: 'D5', dur: 0.9 }
  ];

  function vibraphoneSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 2.8);
    const tremolo = 1.0 + 0.15 * Math.sin(2 * Math.PI * 4.2 * time);
    const fundamental = Math.sin(2 * Math.PI * freq * time);
    const overtone = Math.sin(2 * Math.PI * freq * 3.98 * time) * Math.exp(-time * 12) * 0.25;
    return (fundamental + overtone) * env * tremolo;
  }

  function jazzGuitarSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 3.5);
    const f1 = Math.sin(2 * Math.PI * freq * time);
    const f2 = Math.sin(2 * Math.PI * freq * 2 * time) * 0.25;
    return (f1 + f2) * env;
  }

  function acousticBassSample(freq, time) {
    if (time < 0) return 0;
    const attack = 0.008;
    const env = time < attack ? time / attack : Math.exp(-(time - attack) * 3.2);
    const thumb = Math.sin(2 * Math.PI * freq * 0.5 * time) * Math.exp(-time * 20) * 0.2;
    const f1 = triangleWave(freq * time) * 0.65;
    const f2 = Math.sin(2 * Math.PI * freq * time) * 0.35;
    return (f1 + f2 + thumb) * env;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;
    const beatTime = t % secondsPerBeat;
    const beatIndex = Math.floor(t / secondsPerBeat) % (bars * 4);

    const bassNote = walkingBass[beatIndex];
    const bassF = getNoteFreq(bassNote);
    const bassSample = acousticBassSample(bassF, beatTime) * 0.38;

    let guitarL = 0;
    let guitarR = 0;
    const chordNotes = jazzChords[barIndex];
    const compTriggers = [0, secondsPerBeat * 1.5];
    for (let c = 0; c < compTriggers.length; c++) {
      const ct = barTime - compTriggers[c];
      if (ct >= 0 && ct < 0.6) {
        for (let n = 0; n < chordNotes.length; n++) {
          const f = getNoteFreq(chordNotes[n]);
          const s = jazzGuitarSample(f, ct + n * 0.012) * 0.18;
          guitarL += s * 0.45;
          guitarR += s * 0.55;
        }
      }
    }

    let drumL = 0;
    let drumR = 0;
    const beatInBar = Math.floor(barTime / secondsPerBeat);

    const swingEighth = secondsPerBeat * 0.66;
    const isRideMain = beatTime < 0.035;
    const isRideSwing = (beatInBar === 1 || beatInBar === 3) && beatTime >= swingEighth && (beatTime - swingEighth) < 0.035;
    if (isRideMain || isRideSwing) {
      const rt = isRideMain ? beatTime : (beatTime - swingEighth);
      const rEnv = Math.exp(-rt * 45);
      const ride = noiseWave() * rEnv * (isRideSwing ? 0.09 : 0.14);
      drumL += ride * 0.3;
      drumR += ride * 0.7;
    }

    if ((beatInBar === 1 || beatInBar === 3) && beatTime < 0.12) {
      const bEnv = Math.exp(-beatTime * 22);
      const brush = (noiseWave() * 0.8 + Math.sin(2 * Math.PI * 190 * beatTime) * 0.2) * bEnv * 0.18;
      drumL += brush * 0.5;
      drumR += brush * 0.5;
    }

    if ((beatInBar === 0 || beatInBar === 2) && beatTime < 0.08) {
      const kEnv = Math.exp(-beatTime * 25);
      const kick = Math.sin(2 * Math.PI * 65 * beatTime) * kEnv * 0.22;
      drumL += kick;
      drumR += kick;
    }

    let vibeSample = 0;
    for (let m = 0; m < vibeMelody.length; m++) {
      const item = vibeMelody[m];
      const vt = t - item.t;
      if (vt >= 0 && vt <= item.dur + 0.5) {
        const f = getNoteFreq(item.note);
        vibeSample += vibraphoneSample(f, vt) * 0.32;
      }
    }

    const roomHum = noiseWave() * 0.005;

    const outL = bassSample + guitarL + drumL + vibeSample * 0.6 + roomHum;
    const outR = bassSample + guitarR + drumR + vibeSample * 0.6 + roomHum;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK: "Huni ng Ulan" (Rainy Afternoon Study - 72 BPM)
// ==========================================
function generateRainyTrack() {
  const sampleRate = 44100;
  const bpm = 72;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  const acousticRoots = ['C2', 'A1', 'F2', 'G1', 'C2', 'A1', 'F2', 'G1'];
  const nylonChords = [
    ['C3', 'G3', 'B3', 'E4', 'G4'],
    ['A2', 'E3', 'G3', 'B3', 'C4'],
    ['F2', 'C3', 'E3', 'A3', 'C4'],
    ['G2', 'D3', 'G3', 'B3', 'D4'],
    ['C3', 'G3', 'B3', 'E4', 'G4'],
    ['A2', 'E3', 'G3', 'B3', 'C4'],
    ['F2', 'C3', 'E3', 'A3', 'C4'],
    ['G2', 'D3', 'G3', 'B3', 'D4']
  ];

  const rainyPianoMelody = [
    { t: 0.8, note: 'E5', dur: 1.2 }, { t: 2.2, note: 'G5', dur: 1.0 },
    { t: 4.2, note: 'B4', dur: 1.2 }, { t: 5.8, note: 'C5', dur: 1.4 },
    { t: 7.5, note: 'A4', dur: 1.4 }, { t: 9.0, note: 'E5', dur: 1.0 },
    { t: 10.5, note: 'D5', dur: 2.0 },
    { t: 13.8, note: 'G5', dur: 1.2 }, { t: 15.2, note: 'E5', dur: 1.0 },
    { t: 17.5, note: 'C5', dur: 1.5 }, { t: 19.2, note: 'B4', dur: 1.2 },
    { t: 21.0, note: 'A4', dur: 1.6 }, { t: 22.8, note: 'G4', dur: 1.2 },
    { t: 24.2, note: 'E4', dur: 2.8 }
  ];

  function nylonGuitarSample(freq, time) {
    if (time < 0) return 0;
    const attack = 0.005;
    const env = time < attack ? time / attack : Math.exp(-(time - attack) * 4.2);
    const f1 = Math.sin(2 * Math.PI * freq * time);
    const f2 = Math.sin(2 * Math.PI * freq * 2.0 * time) * 0.35;
    const f3 = Math.sin(2 * Math.PI * freq * 3.0 * time) * 0.12;
    return (f1 + f2 + f3) * env;
  }

  function feltPianoSoft(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 1.8);
    const fundamental = Math.sin(2 * Math.PI * freq * time);
    const second = Math.sin(2 * Math.PI * freq * 2.0 * time) * 0.3 * Math.exp(-time * 3.5);
    return (fundamental + second) * env;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDuration) % bars;
    const barTime = t % barDuration;
    const sixteenth = secondsPerBeat / 4;

    const chordNotes = nylonChords[barIndex];
    const sixteenthIndex = Math.floor(barTime / sixteenth) % 16;
    const timeSinceSixteenth = barTime % sixteenth;
    const fingerPattern = [0, 1, 2, 3, 1, 2, 3, 4, 0, 2, 3, 4, 1, 2, 3, 2];
    const noteIdx = fingerPattern[sixteenthIndex] % chordNotes.length;
    const noteFreq = getNoteFreq(chordNotes[noteIdx]);
    const guitarNote = nylonGuitarSample(noteFreq, timeSinceSixteenth) * 0.28;

    const rootF = getNoteFreq(acousticRoots[barIndex]);
    const bassTime = barTime % (secondsPerBeat * 2);
    const bassEnv = Math.exp(-bassTime * 1.2);
    const bassSample = sineWave(rootF * t) * bassEnv * 0.35;

    let pianoSample = 0;
    for (let m = 0; m < rainyPianoMelody.length; m++) {
      const item = rainyPianoMelody[m];
      const pt = t - item.t;
      if (pt >= 0 && pt <= item.dur + 0.8) {
        const f = getNoteFreq(item.note);
        pianoSample += feltPianoSoft(f, pt) * 0.35;
      }
    }

    const rainTextureL = noiseWave() * 0.018;
    const rainTextureR = noiseWave() * 0.018;
    const isDroplet = Math.random() < 0.0004;
    const droplet = isDroplet ? sineWave(2400 * t) * 0.08 : 0;

    const outL = guitarNote * 0.55 + bassSample + pianoSample * 0.5 + rainTextureL + droplet;
    const outR = guitarNote * 0.45 + bassSample + pianoSample * 0.5 + rainTextureR + droplet;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// TRACK: "Mahiwagang Pagsisiyasat" (Mystery Investigation - 80 BPM)
// ==========================================
function generateMysteryTrack() {
  const sampleRate = 44100;
  const bpm = 80;
  const secondsPerBeat = 60 / bpm;
  const barDuration = secondsPerBeat * 4;
  const bars = 8;
  const duration = bars * barDuration;
  const totalSamples = Math.floor(duration * sampleRate);
  const bufferL = new Float32Array(totalSamples);
  const bufferR = new Float32Array(totalSamples);

  const mysteryBass = [
    'C2', 'Eb2', 'G2', 'Ab2',
    'B1', 'D2', 'G2', 'F2',
    'Bb1', 'D2', 'Eb2', 'F#2',
    'G1', 'B1', 'D2', 'F2',
    'C2', 'G2', 'Eb2', 'D2',
    'F1', 'C2', 'Eb2', 'Ab2',
    'Ab1', 'C2', 'G1', 'B1',
    'C2', 'Eb2', 'D2', 'B1'
  ];

  const mysteryMelody = [
    { t: 0.75, note: 'G4', dur: 0.6 }, { t: 1.5, note: 'C5', dur: 0.8 }, { t: 2.25, note: 'Eb5', dur: 0.6 },
    { t: 3.0, note: 'D5', dur: 1.0 }, { t: 4.5, note: 'B4', dur: 1.2 },
    { t: 6.0, note: 'C5', dur: 0.8 }, { t: 7.0, note: 'Eb5', dur: 0.6 }, { t: 7.75, note: 'F#5', dur: 0.8 },
    { t: 9.0, note: 'G5', dur: 1.5 }, { t: 11.0, note: 'F5', dur: 0.7 },
    { t: 12.0, note: 'Eb5', dur: 0.9 }, { t: 13.0, note: 'D5', dur: 0.6 }, { t: 13.75, note: 'C5', dur: 1.0 },
    { t: 15.0, note: 'Ab5', dur: 0.9 }, { t: 16.2, note: 'G5', dur: 0.6 }, { t: 17.0, note: 'F5', dur: 0.8 },
    { t: 18.0, note: 'Eb5', dur: 0.8 }, { t: 19.2, note: 'D5', dur: 0.8 }, { t: 20.0, note: 'C#5', dur: 0.7 },
    { t: 21.0, note: 'D5', dur: 0.9 }, { t: 22.2, note: 'B4', dur: 1.4 }
  ];

  function pizzicatoSample(freq, time) {
    if (time < 0) return 0;
    const attack = 0.006;
    const env = time < attack ? time / attack : Math.exp(-(time - attack) * 5.0);
    const plunk = Math.sin(2 * Math.PI * freq * 1.5 * time) * Math.exp(-time * 40) * 0.35;
    const f1 = triangleWave(freq * time) * 0.7;
    const f2 = Math.sin(2 * Math.PI * freq * time) * 0.3;
    return (f1 + f2 + plunk) * env;
  }

  function clockTickSample(time, isHigh) {
    if (time < 0 || time > 0.035) return 0;
    const pitch = isHigh ? 1800 : 1200;
    const env = Math.exp(-time * 160);
    return (Math.sin(2 * Math.PI * pitch * time) * 0.7 + noiseWave() * 0.3) * env;
  }

  function darkVibeSample(freq, time) {
    if (time < 0) return 0;
    const env = Math.exp(-time * 2.2);
    const tremolo = 1.0 + 0.12 * Math.sin(2 * Math.PI * 5.0 * time);
    const fundamental = Math.sin(2 * Math.PI * freq * time);
    const darkOvertone = Math.sin(2 * Math.PI * freq * 2.98 * time) * Math.exp(-time * 8) * 0.3;
    return (fundamental + darkOvertone) * env * tremolo;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barTime = t % barDuration;
    const beatTime = t % secondsPerBeat;
    const beatIndex = Math.floor(t / secondsPerBeat) % (bars * 4);
    const sixteenth = secondsPerBeat / 4;
    const sixteenthInBar = Math.floor(barTime / sixteenth) % 16;
    const timeSinceSixteenth = barTime % sixteenth;

    const bassNote = mysteryBass[beatIndex];
    const bassF = getNoteFreq(bassNote);
    const bassSample = pizzicatoSample(bassF, beatTime) * 0.38;

    let clockL = 0;
    let clockR = 0;
    const eighth = secondsPerBeat / 2;
    const eighthIdx = Math.floor(barTime / eighth) % 8;
    const timeSinceEighth = barTime % eighth;
    const isHighTick = eighthIdx % 2 === 0;
    const tickSample = clockTickSample(timeSinceEighth, isHighTick) * 0.16;
    clockL = tickSample * (isHighTick ? 0.65 : 0.35);
    clockR = tickSample * (isHighTick ? 0.35 : 0.65);

    if (sixteenthInBar === 3 || sixteenthInBar === 11) {
      const woodTap = clockTickSample(timeSinceSixteenth, true) * 0.08;
      clockL += woodTap * 0.3;
      clockR += woodTap * 0.7;
    }

    let melodySample = 0;
    for (let m = 0; m < mysteryMelody.length; m++) {
      const item = mysteryMelody[m];
      const mt = t - item.t;
      if (mt >= 0 && mt <= item.dur + 0.6) {
        const f = getNoteFreq(item.note);
        melodySample += darkVibeSample(f, mt) * 0.35;
      }
    }

    const droneFreq = 65.41;
    const droneLFO = 1.0 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t);
    const drone = Math.sin(2 * Math.PI * droneFreq * t) * 0.12 * droneLFO;

    const beatInBar = Math.floor(barTime / secondsPerBeat);
    let brushSample = 0;
    if ((beatInBar === 1 || beatInBar === 3) && beatTime < 0.2) {
      const bEnv = Math.exp(-beatTime * 14);
      brushSample = noiseWave() * bEnv * 0.06;
    }

    const outL = bassSample * 0.9 + clockL + melodySample * 0.55 + drone + brushSample * 0.5;
    const outR = bassSample * 0.9 + clockR + melodySample * 0.55 + drone + brushSample * 0.5;

    bufferL[i] = Math.tanh(outL * 1.05);
    bufferR[i] = Math.tanh(outR * 1.05);
  }

  return encodeWAV(bufferL, bufferR, sampleRate);
}

// ==========================================
// BATCH EXECUTION: Generate Active Tracks
// ==========================================
console.log('--- Synthesizing Multi-Genre Background Music Library ---');

console.log('1/8: Masayang Laro (Playful Chiptune - 126 BPM)...');
const playfulWav = generatePlayfulTrack();
fs.writeFileSync(path.join(outputDir, 'chiptune-playful.wav'), playfulWav);
console.log(` -> chiptune-playful.wav (${(playfulWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('2/8: Bilis-Isip (Quiz Battle Chiptune - 144 BPM)...');
const quizWav = generateQuizTrack();
fs.writeFileSync(path.join(outputDir, 'chiptune-quiz.wav'), quizWav);
console.log(` -> chiptune-quiz.wav (${(quizWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('3/8: Payapang Pag-aaral (Calm Lo-Fi Study - 78 BPM)...');
const calmWav = generateCalmTrack();
fs.writeFileSync(path.join(outputDir, 'lofi-calm.wav'), calmWav);
console.log(` -> lofi-calm.wav (${(calmWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('4/8: Pagninilay-nilay (Melancholic Piano & Strings - 70 BPM)...');
const melancholicWav = generateMelancholicTrack();
fs.writeFileSync(path.join(outputDir, 'piano-melancholic.wav'), melancholicWav);
console.log(` -> piano-melancholic.wav (${(melancholicWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('5/8: Tahimik na Gabi (Cozy Dreamy Ambient - 84 BPM)...');
const cozyWav = generateCozyTrack();
fs.writeFileSync(path.join(outputDir, 'ambient-cozy.wav'), cozyWav);
console.log(` -> ambient-cozy.wav (${(cozyWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('6/8: Kapihan sa Hatinggabi (Midnight Café Jazz - 84 BPM)...');
const jazzWav = generateJazzTrack();
fs.writeFileSync(path.join(outputDir, 'jazz-cafe.wav'), jazzWav);
console.log(` -> jazz-cafe.wav (${(jazzWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('7/8: Huni ng Ulan (Rainy Afternoon Study - 72 BPM)...');
const rainyWav = generateRainyTrack();
fs.writeFileSync(path.join(outputDir, 'cozy-rain.wav'), rainyWav);
console.log(` -> cozy-rain.wav (${(rainyWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('8/8: Mahiwagang Pagsisiyasat (Mystery Investigation - 80 BPM)...');
const mysteryWav = generateMysteryTrack();
fs.writeFileSync(path.join(outputDir, 'mystery-detective.wav'), mysteryWav);
console.log(` -> mystery-detective.wav (${(mysteryWav.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('=== Active Background Music Tracks Generated Successfully! ===');
