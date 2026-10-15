import numpy as np
from scipy.io import wavfile
import io


# Standard audiogram frequencies in Hz
AUDIOGRAM_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000]

# Hearing loss classification thresholds (dB HL)
HEARING_LOSS_LEVELS = {
    "normal": (None, 25),
    "mild": (26, 40),
    "moderate": (41, 55),
    "moderately_severe": (56, 70),
    "severe": (71, 90),
    "profound": (91, None),
}

SAMPLE_RATE = 44100  # Hz


def generate_pure_tone(frequency: float, duration: float, amplitude: float = 0.5) -> np.ndarray:
    """
    Generate a pure tone sine wave.

    Args:
        frequency: Tone frequency in Hz
        duration: Duration in seconds
        amplitude: Amplitude (0.0 to 1.0)

    Returns:
        NumPy array of audio samples
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    tone = amplitude * np.sin(2 * np.pi * frequency * t)

    # Apply fade in/out to avoid clicks (5ms)
    fade_samples = int(0.005 * SAMPLE_RATE)
    fade_in = np.linspace(0, 1, fade_samples)
    fade_out = np.linspace(1, 0, fade_samples)
    tone[:fade_samples] *= fade_in
    tone[-fade_samples:] *= fade_out

    return tone.astype(np.float32)


def db_hl_to_amplitude(db_hl: float) -> float:
    """
    Convert dB HL (Hearing Level) to a linear amplitude value.
    Reference: 0 dB HL ≈ 0.00002 Pa (threshold of normal hearing)

    Args:
        db_hl: Hearing level in dB

    Returns:
        Linear amplitude (0.0 to 1.0, clamped)
    """
    amplitude = 10 ** (db_hl / 20.0) * 0.00001
    return float(np.clip(amplitude, 0.0, 1.0))


def generate_tone_wav(frequency: float, db_hl: float, duration: float = 1.0) -> bytes:
    """
    Generate a WAV file bytes for a pure tone at a given frequency and hearing level.

    Args:
        frequency: Frequency in Hz
        db_hl: Hearing level in dB HL
        duration: Duration in seconds

    Returns:
        WAV file as bytes
    """
    amplitude = db_hl_to_amplitude(db_hl)
    tone = generate_pure_tone(frequency, duration, amplitude)

    # Convert to 16-bit PCM
    pcm = (tone * 32767).astype(np.int16)

    buffer = io.BytesIO()
    wavfile.write(buffer, SAMPLE_RATE, pcm)
    return buffer.getvalue()


def classify_hearing_loss(threshold_db: float) -> str:
    """
    Classify hearing loss based on a threshold in dB HL.

    Args:
        threshold_db: Pure tone threshold in dB HL

    Returns:
        Hearing loss category string
    """
    for level, (low, high) in HEARING_LOSS_LEVELS.items():
        if low is None and threshold_db <= high:
            return level
        if high is None and threshold_db >= low:
            return level
        if low is not None and high is not None and low <= threshold_db <= high:
            return level
    return "profound"


def analyze_audiogram(thresholds: dict) -> dict:
    """
    Analyze an audiogram given thresholds per frequency.

    Args:
        thresholds: Dict mapping frequency (int Hz) to threshold (float dB HL)
                    e.g. {250: 20, 500: 25, 1000: 40, 2000: 55, 4000: 70, 8000: 80}

    Returns:
        Dict with per-frequency classification and overall PTA (Pure Tone Average)
    """
    results = {}

    for freq in AUDIOGRAM_FREQUENCIES:
        db = thresholds.get(freq)
        if db is not None:
            results[freq] = {
                "threshold_db": db,
                "classification": classify_hearing_loss(db),
            }

    # Pure Tone Average: average of 500, 1000, 2000 Hz (speech frequencies)
    pta_freqs = [500, 1000, 2000]
    pta_values = [thresholds[f] for f in pta_freqs if f in thresholds]
    pta = round(sum(pta_values) / len(pta_values), 1) if pta_values else None

    return {
        "frequencies": results,
        "pure_tone_average": pta,
        "overall_classification": classify_hearing_loss(pta) if pta is not None else None,
    }
