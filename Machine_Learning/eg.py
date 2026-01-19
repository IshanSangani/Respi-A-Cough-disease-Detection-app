from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import librosa
import joblib
import os
import warnings
import traceback
import hashlib

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ----------------------------
# CONFIG
# ----------------------------
UPLOAD_FOLDER = "uploads"
UPLOAD_FOLDER = os.path.join(BASE_DIR, UPLOAD_FOLDER)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MODEL_PATH = os.path.join(BASE_DIR, "rf.pkl")
# Use the same duration the model was trained with (avoid distribution shift)
TARGET_DURATION = 7.8560090702947845  # seconds
SAMPLE_RATE = 22050

# ----------------------------
# LOAD MODEL
# ----------------------------
model = joblib.load(MODEL_PATH)

app = Flask(__name__)

# ----------------------------
# AUDIO UTILS
# ----------------------------
def load_and_trim_audio(file_path, target_duration=10.0, sr=22050):
    try:
        y, sr = librosa.load(file_path, sr=sr, mono=True)
    except Exception as e:
        raise ValueError(
            "Failed to decode audio. If uploading .m4a on Windows, install ffmpeg or convert to WAV. "
            f"Inner error: {e}"
        )

    if y is None or len(y) == 0:
        raise ValueError("Decoded audio is empty (0 samples). Try a different file or convert to WAV.")

    target_len = int(target_duration * sr)

    if len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))
    else:
        y = y[:target_len]

    return y, sr


def extract_features(file_path):
    y, sr = load_and_trim_audio(file_path, TARGET_DURATION, SAMPLE_RATE)

    features = {
        "chroma_stft": librosa.feature.chroma_stft(y=y, sr=sr),
        "mfcc": librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13),
        "mel_spectrogram": librosa.feature.melspectrogram(y=y, sr=sr),
        "spectral_contrast": librosa.feature.spectral_contrast(y=y, sr=sr),
        "spectral_centroid": librosa.feature.spectral_centroid(y=y, sr=sr),
        "spectral_bandwidth": librosa.feature.spectral_bandwidth(y=y, sr=sr),
        "spectral_rolloff": librosa.feature.spectral_rolloff(y=y, sr=sr),
        "zero_crossing_rate": librosa.feature.zero_crossing_rate(y=y),
    }

    row = {}
    for name, val in features.items():
        row[f"{name}_mean"] = np.mean(val)
        row[f"{name}_std"] = np.std(val)
        row[f"{name}_max"] = np.max(val)
        row[f"{name}_min"] = np.min(val)

    df = pd.DataFrame([row])

    # Some training pipelines excluded these; drop to avoid feature-name mismatch.
    df = df.drop(columns=["mel_spectrogram_min", "chroma_stft_max"], errors="ignore")

    # Keep only numeric columns.
    df = df.select_dtypes(exclude=["object"])
    return df


def file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def align_features_for_model(df: pd.DataFrame) -> pd.DataFrame:
    """Align DataFrame columns to exactly what the trained model expects."""
    expected = getattr(model, "feature_names_in_", None)
    if expected is None:
        return df

    expected = list(expected)
    missing = [c for c in expected if c not in df.columns]
    extra = [c for c in df.columns if c not in expected]
    if missing or extra:
        print(f"[features] align missing={len(missing)} extra={len(extra)}", flush=True)

    return df.reindex(columns=expected, fill_value=0)

# ----------------------------
# ROUTES
# ----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    uploaded = request.files.get("audio") or request.files.get("file")
    if uploaded is None:
        return jsonify({"error": "No audio file uploaded"}), 400

    filename = uploaded.filename or "upload.wav"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    uploaded.save(filepath)

    try:
        # Debug metadata to compare curl vs app uploads.
        size_bytes = None
        sha = None
        try:
            size_bytes = int(os.path.getsize(filepath))
            sha = file_sha256(filepath)
        except Exception:
            pass

        try:
            print(
                f"[predict] from={request.remote_addr} content_length={request.content_length} filename={filename}",
                flush=True,
            )
            if size_bytes is not None and sha is not None:
                print(f"[predict] size={size_bytes} sha256={sha}", flush=True)
        except Exception:
            pass

        features = extract_features(filepath)
        features = align_features_for_model(features)

        # If features become NaN/inf, RF can collapse to a single class.
        if np.isnan(features.values).any() or np.isinf(features.values).any():
            return jsonify({
                "error": "Feature extraction produced NaN/inf values. Try WAV or a cleaner recording.",
            }), 400

        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        # Server-side debug print (so you can compare app vs curl in console)
        try:
            classes = list(model.classes_)
            pairs = list(zip(classes, [float(p) for p in probabilities]))
            pairs_sorted = sorted(pairs, key=lambda x: x[1], reverse=True)
            top3 = pairs_sorted[:3]
            conf = float(max(probabilities))
            print(f"[result] prediction={prediction} confidence={conf:.6f}", flush=True)
            print(f"[result] top3={top3}", flush=True)
        except Exception:
            top3 = None

        # Decode metadata (helps spot when app sent a different file or decode failed)
        sr_dbg = None
        dur_dbg = None
        try:
            y_dbg, sr_dbg = librosa.load(filepath, sr=SAMPLE_RATE, mono=True)
            dur_dbg = float(len(y_dbg) / float(sr_dbg)) if sr_dbg else None
        except Exception:
            pass

        result = {
            "prediction": prediction,
            "confidence": float(np.max(probabilities)),
            "probabilities": dict(zip(model.classes_, probabilities)),
            "top": top3,
            "debug": {
                "filename": filename,
                "size_bytes": size_bytes,
                "sha256": sha,
                "decoded_sr": sr_dbg,
                "decoded_duration_s": dur_dbg,
            },
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": "Prediction failed",
            "details": str(e),
            "trace": traceback.format_exc(),
        }), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ----------------------------
# RUN SERVER
# ----------------------------
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )
