from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import librosa
import joblib
import os
import warnings
import traceback
import hashlib
from datetime import datetime, timezone

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ----------------------------
# CONFIG
# ----------------------------
UPLOAD_FOLDER = "uploads"
UPLOAD_FOLDER = os.path.join(BASE_DIR, UPLOAD_FOLDER)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MODEL_PATH = os.path.join(BASE_DIR, "rf.pkl")

# Optional additional models (place these .pkl files next to this script)
MODEL_PATHS = {
    "rf": MODEL_PATH,
    "logreg": os.path.join(BASE_DIR, "logreg_classifier.pkl"),
    "mlp": os.path.join(BASE_DIR, "mlp_classifier.pkl"),
    "svm": os.path.join(BASE_DIR, "svm_classifier.pkl"),
}

DEFAULT_MODEL_KEY = "rf"

# Use the same duration the model was trained with (avoid distribution shift)
TARGET_DURATION = 7.8560090702947845  # seconds
SAMPLE_RATE = 22050

# ----------------------------
# LOAD MODELS
# ----------------------------
def _load_models(paths: dict):
    loaded = {}
    preprocess = {}
    errors = {}
    for key, path in paths.items():
        if not os.path.exists(path):
            msg = f"missing file: {path}"
            errors[key] = msg
            print(f"[models] missing key={key} path={path}", flush=True)
            continue
        try:
            obj = joblib.load(path)

            # Common pattern: joblib dump of a bundle {'model': estimator, 'scaler': transformer}
            if isinstance(obj, dict) and "model" in obj:
                loaded[key] = obj.get("model")
                preprocess[key] = obj.get("scaler")
            else:
                loaded[key] = obj
                preprocess[key] = None

            # If still not a usable estimator, record an error.
            if not hasattr(loaded[key], "predict"):
                raise TypeError(f"Loaded object is not a predictor (type={type(loaded[key]).__name__})")

            print(f"[models] loaded key={key} path={path}", flush=True)
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            errors[key] = msg
            print(f"[models] failed key={key} path={path} err={e}", flush=True)
    return loaded, preprocess, errors


MODELS, MODEL_PREPROCESS, MODEL_LOAD_ERRORS = _load_models(MODEL_PATHS)


def _model_meta(model_obj, scaler_obj=None) -> dict:
    meta = {
        "type": type(model_obj).__name__,
        "wrapped": scaler_obj is not None,
        "scaler_type": type(scaler_obj).__name__ if scaler_obj is not None else None,
        "n_features_in": getattr(model_obj, "n_features_in_", None),
        "has_feature_names_in": getattr(model_obj, "feature_names_in_", None) is not None,
        "n_feature_names_in": None,
        "n_classes": None,
        "classes": None,
        "has_predict_proba": hasattr(model_obj, "predict_proba"),
        "has_decision_function": hasattr(model_obj, "decision_function"),
    }
    try:
        fni = getattr(model_obj, "feature_names_in_", None)
        if fni is not None:
            meta["n_feature_names_in"] = len(list(fni))
    except Exception:
        pass
    try:
        cls = getattr(model_obj, "classes_", None)
        if cls is not None:
            meta["n_classes"] = len(list(cls))
            meta["classes"] = [str(c) for c in list(cls)]
    except Exception:
        pass
    return meta


MODEL_META = {k: _model_meta(MODELS[k], MODEL_PREPROCESS.get(k)) for k in MODELS.keys()}

try:
    for k in sorted(MODEL_META.keys()):
        print(f"[models] meta key={k} {MODEL_META[k]}", flush=True)
except Exception:
    pass

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


def align_features_for_model(df: pd.DataFrame, model_obj) -> pd.DataFrame:
    """Align DataFrame columns to exactly what the trained model expects."""
    expected = getattr(model_obj, "feature_names_in_", None)
    if expected is None:
        return df

    expected = list(expected)
    missing = [c for c in expected if c not in df.columns]
    extra = [c for c in df.columns if c not in expected]
    if missing or extra:
        print(f"[features] align missing={len(missing)} extra={len(extra)}", flush=True)

    return df.reindex(columns=expected, fill_value=0)


def _softmax(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float64)
    x = x - np.max(x)
    exp = np.exp(x)
    s = np.sum(exp)
    return (exp / s) if s != 0 else np.ones_like(exp) / float(len(exp))


def get_model_key_from_request() -> str:
    # Accept model key from multipart field or query string.
    key = None
    try:
        key = request.form.get("model")
    except Exception:
        key = None
    if not key:
        try:
            key = request.args.get("model")
        except Exception:
            key = None
    if not key:
        return DEFAULT_MODEL_KEY
    key = str(key).strip().lower()
    return key or DEFAULT_MODEL_KEY

# ----------------------------
# ROUTES
# ----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    model_key = get_model_key_from_request()
    model_obj = MODELS.get(model_key)
    scaler_obj = MODEL_PREPROCESS.get(model_key)
    if model_obj is None:
        available = sorted(list(MODELS.keys()))
        return jsonify({
            "error": "Unknown or unavailable model",
            "requested": model_key,
            "available": available,
            "hint": "Place the .pkl files in Machine_Learning/ with the expected names (rf.pkl, logreg_classifier.pkl, mlp_classifier.pkl, svm_classifier.pkl).",
        }), 400

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
                f"[predict] model={model_key} from={request.remote_addr} content_length={request.content_length} filename={filename}",
                flush=True,
            )
            if size_bytes is not None and sha is not None:
                print(f"[predict] size={size_bytes} sha256={sha}", flush=True)
        except Exception:
            pass

        try:
            features = extract_features(filepath)
        except Exception as e:
            return jsonify({
                "error": "Feature extraction failed",
                "model": model_key,
                "details": str(e),
            }), 400

        features = align_features_for_model(features, model_obj)

        # Apply optional preprocessing (e.g., StandardScaler) for models that were trained with it.
        X = features
        if scaler_obj is not None:
            try:
                features_for_scaler = align_features_for_model(features, scaler_obj)
                try:
                    X = scaler_obj.transform(features_for_scaler)
                except Exception:
                    # Some sklearn versions are picky about DataFrame inputs.
                    X = scaler_obj.transform(features_for_scaler.values)
            except Exception as e:
                return jsonify({
                    "error": "Preprocessing failed",
                    "model": model_key,
                    "details": str(e),
                }), 400

        try:
            x_shape = getattr(X, "shape", None)
            print(f"[features] model={model_key} X_shape={x_shape} scaled={scaler_obj is not None}", flush=True)
        except Exception:
            pass

        try:
            print(
                f"[features] model={model_key} shape={getattr(features, 'shape', None)} expected_n={getattr(model_obj, 'n_features_in_', None)}",
                flush=True,
            )
        except Exception:
            pass

        # If features become NaN/inf, RF can collapse to a single class.
        if np.isnan(features.values).any() or np.isinf(features.values).any():
            return jsonify({
                "error": "Feature extraction produced NaN/inf values. Try WAV or a cleaner recording.",
            }), 400

        try:
            prediction = model_obj.predict(X)[0]
        except ValueError as e:
            # Most common: feature count mismatch.
            return jsonify({
                "error": "Model prediction failed (likely feature mismatch)",
                "model": model_key,
                "details": str(e),
                "feature_shape": getattr(features, "shape", None),
                "model_n_features_in": getattr(model_obj, "n_features_in_", None),
                "hint": "Your non-RF models may have been trained with a different feature set/order. Re-train/export using the same feature pipeline, ideally with a pandas DataFrame so feature_names_in_ is saved.",
            }), 400

        probabilities = None
        if hasattr(model_obj, "predict_proba"):
            try:
                probabilities = model_obj.predict_proba(X)[0]
            except Exception:
                probabilities = None

        # Fallback for models without predict_proba (e.g., some SVM configs)
        if probabilities is None and hasattr(model_obj, "decision_function"):
            try:
                scores = model_obj.decision_function(X)
                scores = np.asarray(scores)
                if scores.ndim == 2:
                    scores = scores[0]
                if scores.ndim == 0:
                    scores = np.array([float(scores)])
                classes = list(getattr(model_obj, "classes_", []))
                if len(classes) == 2 and scores.size == 1:
                    s = float(scores[0])
                    p1 = 1.0 / (1.0 + np.exp(-s))
                    probabilities = np.array([1.0 - p1, p1], dtype=np.float64)
                elif scores.size >= 2:
                    probabilities = _softmax(scores)
            except Exception:
                probabilities = None

        if probabilities is None:
            return jsonify({
                "error": "Selected model does not provide probabilities",
                "model": model_key,
                "hint": "Train/export the model with probability estimates (e.g., SVC(probability=True)) or use a model that supports predict_proba.",
            }), 400

        # Server-side debug print (so you can compare app vs curl in console)
        try:
            classes = list(model_obj.classes_)
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
            "model": model_key,
            "prediction": prediction,
            "confidence": float(np.max(probabilities)),
            "probabilities": dict(zip(model_obj.classes_, probabilities)),
            "top": top3,
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
        try:
            print(f"[error] model={model_key} exception={type(e).__name__}: {e}", flush=True)
            print(traceback.format_exc(), flush=True)
        except Exception:
            pass
        return jsonify({
            "error": "Prediction failed",
            "model": model_key,
            "details": str(e),
            "trace": traceback.format_exc(),
        }), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": sorted(list(MODELS.keys())),
        "default": DEFAULT_MODEL_KEY,
        "load_errors": MODEL_LOAD_ERRORS,
        "meta": MODEL_META,
    })


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
