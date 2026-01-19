from flask import Flask, request, jsonify
import tensorflow as tf
import librosa
import numpy as np
import pickle
import h5py
import os
import tempfile
from datetime import datetime, timezone
import time

app = Flask(__name__)

try:
    from flask_cors import CORS
    CORS(app)
except Exception:
    # CORS is mainly needed for browser clients; native apps typically don't require it.
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "respiratory_sound_model.h5")


def load_weights_from_h5(model: tf.keras.Model, h5_path: str) -> None:
    """Load weights from the saved .h5 by matching layer/weight names.

    The provided file contains a full model config that doesn't deserialize cleanly,
    and `model.load_weights()` tries to apply weights in an incompatible order.
    This loader reads the `model_weights` groups directly.
    """

    with h5py.File(h5_path, "r") as f:
        mw = f["model_weights"]

        # Backbone (ResNet50)
        backbone = model.get_layer("resnet50")
        resnet_group = mw["resnet50"]
        for layer in backbone.layers:
            if not layer.weights:
                continue
            if layer.name not in resnet_group:
                continue
            g = resnet_group[layer.name]
            arrays = []
            for w in layer.weights:
                base = w.name.split("/")[-1].split(":")[0]
                if base not in g:
                    arrays = []
                    break
                arrays.append(np.array(g[base]))
            if arrays and len(arrays) == len(layer.weights):
                layer.set_weights(arrays)

        # Dense head
        dense = model.get_layer("dense")
        g_dense = mw["dense"]["sequential"]["dense"]
        dense.set_weights([np.array(g_dense["kernel"]), np.array(g_dense["bias"])])

        dense_1 = model.get_layer("dense_1")
        g_dense_1 = mw["dense_1"]["sequential"]["dense_1"]
        dense_1.set_weights([np.array(g_dense_1["kernel"]), np.array(g_dense_1["bias"])])


def build_model():
    # Rebuild the architecture explicitly and load weights.
    # This avoids .h5 model_config deserialization issues.
    inputs = tf.keras.Input(shape=(128, 128, 3), name="input_layer_1")
    backbone = tf.keras.applications.ResNet50(
        include_top=False,
        weights=None,
        input_shape=(128, 128, 3),
        pooling=None,
        name="resnet50",
    )

    model = tf.keras.Sequential(
        [
            inputs,
            backbone,
            tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d"),
            tf.keras.layers.Dense(256, activation="relu", name="dense"),
            tf.keras.layers.Dropout(0.5, name="dropout"),
            tf.keras.layers.Dense(8, activation="softmax", name="dense_1"),
        ],
        name="sequential",
    )

    load_weights_from_h5(model, MODEL_PATH)
    return model


model = build_model()

with open(os.path.join(BASE_DIR, "label_encoder.pkl"), "rb") as f:
    label_encoder = pickle.load(f)

def preprocess_audio(file_path):
    audio, sr = librosa.load(file_path, sr=22050)
    if audio is None or len(audio) == 0:
        raise ValueError("Decoded audio is empty (0 samples). Try WAV or install ffmpeg.")

    # Fix mel dims: n_mels=128 gives a stable frequency axis.
    mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=128)
    mel_db = librosa.power_to_db(mel, ref=np.max).astype(np.float32)  # (128, frames)

    # Pad/crop time axis to 128 frames (avoid np.resize which repeats values).
    target_frames = 128
    frames = mel_db.shape[1]
    if frames < target_frames:
        pad = target_frames - frames
        mel_db = np.pad(mel_db, ((0, 0), (0, pad)), mode="constant", constant_values=float(np.min(mel_db)))
    elif frames > target_frames:
        mel_db = mel_db[:, :target_frames]

    # Normalize to 0..1 (safer than dividing by 255 on dB values)
    mn = float(np.min(mel_db))
    mx = float(np.max(mel_db))
    denom = (mx - mn) if (mx - mn) != 0 else 1.0
    mel_norm = (mel_db - mn) / denom

    # Model expects 3 channels (ResNet50). Transpose to (frames, mels) and repeat across channels.
    img = np.repeat(mel_norm.T[..., np.newaxis], 3, axis=-1)
    img = np.expand_dims(img, axis=0)
    return img

@app.route("/predict", methods=["POST"])
def predict():
    t0 = time.perf_counter()
    try:
        print(
            f"[predict] from={request.remote_addr} content_length={request.content_length} files={list(request.files.keys())}",
            flush=True,
        )
    except Exception:
        pass

    uploaded = request.files.get("audio") or request.files.get("file")
    if uploaded is None:
        return jsonify({"message": "Missing audio file. Send multipart/form-data with field 'audio'."}), 400

    try:
        print(f"[predict] filename={uploaded.filename} mimetype={uploaded.mimetype}", flush=True)
    except Exception:
        pass

    _, ext = os.path.splitext(uploaded.filename or "")
    suffix = ext if ext else ".m4a"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    tmp.close()

    uploaded.save(tmp_path)

    try:
        data = preprocess_audio(tmp_path)
        try:
            dt = (time.perf_counter() - t0) * 1000
            print(f"[predict] preprocess ok shape={getattr(data, 'shape', None)} t={dt:.0f}ms", flush=True)
        except Exception:
            pass
    except Exception as e:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        return jsonify({
            "message": "Failed to decode/process audio. If you are uploading .m4a, ensure ffmpeg/audioread backend is available, or upload WAV.",
            "error": str(e)
        }), 400

    try:
        t1 = time.perf_counter()
        print("[predict] inference start", flush=True)
        prediction = model.predict(data, verbose=0)
        print(f"[predict] inference done t={(time.perf_counter()-t1)*1000:.0f}ms", flush=True)
        class_index = int(np.argmax(prediction))
        disease = label_encoder.inverse_transform([class_index])[0]
        conf = float(np.max(prediction))
    except Exception as e:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        return jsonify({"message": "Model inference failed", "error": str(e)}), 500

    try:
        os.remove(tmp_path)
    except Exception:
        pass

    try:
        probs = prediction[0].tolist() if isinstance(prediction, np.ndarray) else None
    except Exception:
        probs = None

    return jsonify({
        "prediction": disease,
        "confidence": conf,
        "probabilities": probs,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    # Important for phone access: bind to all interfaces.
    # Disable the auto-reloader: it can restart mid-request (shows up as a network error on the phone).
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False, threaded=True)
