// ===================================================
// AUDIO ENGINE - Pure tone generation & H-W algorithm
// ===================================================
import { Audio } from "expo-av";

// ---- Calibration Table ----
// Maps (frequency, dB_HL) → approximate digital amplitude
// This is a simplified internal calibration table.
// In a real deployment, calibrate with a real audiometer per headphone model.
const CALIBRATION_TABLE = {
  250: { offset: -10, retspl: 26.5 },
  500: { offset: -5, retspl: 14.0 },
  1000: { offset: 0, retspl: 7.0 },
  2000: { offset: 0, retspl: 9.0 },
  4000: { offset: 0, retspl: 9.5 },
  8000: { offset: 0, retspl: 13.0 },
};

// Convert dB HL → approximate linear amplitude (0–1)
export const dbHLtoAmplitude = (freq, dbHL) => {
  const cal = CALIBRATION_TABLE[freq] || { retspl: 0, offset: 0 };
  // dBSPL = dBHL + RETSPL
  const dbSPL = dbHL + cal.retspl + cal.offset;
  // Reference: 94 dBSPL = amplitude ~1.0 (full scale)
  const amplitude = Math.pow(10, (dbSPL - 94) / 20);
  return Math.min(Math.max(amplitude, 0.001), 1.0);
};

// ---- Pure Tone Generation ----
// Generates a WAV file buffer for a pure sine tone
const generateSineWAV = (
  frequency,
  durationSec,
  amplitude,
  channel = "both",
) => {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationSec);
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV Header
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Apply cosine ramp (10ms) to avoid clicks
  const rampSamples = Math.floor(sampleRate * 0.01);
  const maxVal = 32767;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let ramp = 1;
    if (i < rampSamples) ramp = i / rampSamples;
    else if (i > numSamples - rampSamples)
      ramp = (numSamples - i) / rampSamples;

    const sample =
      Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude * ramp;
    const sampleInt = Math.round(sample * maxVal);

    const leftSample = channel === "right" ? 0 : sampleInt;
    const rightSample = channel === "left" ? 0 : sampleInt;

    view.setInt16(offset, leftSample, true);
    offset += 2;
    view.setInt16(offset, rightSample, true);
    offset += 2;
  }

  return buffer;
};

// Convert ArrayBuffer → base64
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

// Play a pure tone and resolve after it finishes
// export const playTone = async (frequency, dbHL, durationSec = 1.0, channel = 'both') => {
//   const amplitude = dbHLtoAmplitude(frequency, dbHL);
//   const wavBuffer  = generateSineWAV(frequency, durationSec, amplitude, channel);
//   const base64     = arrayBufferToBase64(wavBuffer);
//   const uri        = `data:audio/wav;base64,${base64}`;

//   await Audio.setAudioModeAsync({
//     allowsRecordingIOS: false,
//     playsInSilentModeIOS: true,
//     staysActiveInBackground: false,
//     shouldDuckAndroid: false,
//   });

//   const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });

//   return new Promise((resolve) => {
//     sound.setOnPlaybackStatusUpdate((status) => {
//       if (status.didJustFinish) {
//         sound.unloadAsync();
//         resolve();
//       }
//     });
//   });
// };

export const playTone = async (
  frequency,
  dbHL,
  durationSec = 1.0,
  channel = "both",
) => {
  const amplitude = dbHLtoAmplitude(frequency, dbHL);
  const wavBuffer = generateSineWAV(frequency, durationSec, amplitude, channel);
  const base64 = arrayBufferToBase64(wavBuffer);
  const uri = `data:audio/wav;base64,${base64}`;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume: 1.0 },
  );

  return new Promise((resolve) => {
    setTimeout(
      async () => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {
          console.log("cleanup error", e);
        }
        resolve();
      },
      durationSec * 1000 + 100,
    );
  });
};

// ===================================================
// HUGHSON-WESTLAKE ALGORITHM
// Standard ascending method for threshold determination
// ===================================================
export class HughsonWestlake {
  constructor(frequency, ear, onUpdate) {
    this.frequency = frequency;
    this.ear = ear; // 'left' | 'right'
    this.onUpdate = onUpdate; // callback(currentDB, responses)
    this.currentDB = 40; // Start at 40 dB HL
    this.threshold = null;
    this.responses = [];
    this.consecutiveCorrect = 0;
    this.done = false;
  }

  recordResponse(heard) {
    this.responses.push({ db: this.currentDB, heard });
    this.onUpdate(this.currentDB, this.responses);

    if (heard) {
      this.consecutiveCorrect++;
      if (this.consecutiveCorrect >= 2) {
        // ✅ Threshold confirmed at this level — set BEFORE changing dB
        this.threshold = this.currentDB;
        this.done = true;
        return;
      }
      // Heard once — descend 10 dB to find actual threshold
      this.currentDB = Math.max(-10, this.currentDB - 10);
    } else {
      this.consecutiveCorrect = 0;
      // Not heard — ascend 5 dB
      this.currentDB = Math.min(120, this.currentDB + 5);
    }
  }

  isComplete() {
    return this.done;
  }
  getThreshold() {
    return this.threshold ?? this.currentDB;
  }
  getCurrentDB() {
    return this.currentDB;
  }
}
