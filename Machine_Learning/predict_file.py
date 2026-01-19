import argparse
import os
import pickle
from typing import Dict, List, Tuple

import h5py
import numpy as np
import tensorflow as tf

# librosa is used for audio decoding + mel features.
import librosa


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "respiratory_sound_model.h5")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")


def build_model() -> tf.keras.Model:
    # Rebuild the architecture explicitly and load weights.
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

    return model


def load_weights_from_h5(model: tf.keras.Model, h5_path: str) -> Tuple[int, int]:
    """Load weights by name from the saved .h5 file.

    Returns (layers_loaded, total_layers_with_weights).
    """

    layers_loaded = 0
    total_layers_with_weights = 0

    with h5py.File(h5_path, "r") as f:
        mw = f["model_weights"]

        # Backbone (ResNet50)
        backbone = model.get_layer("resnet50")
        resnet_group = mw.get("resnet50")
        if resnet_group is not None:
            for layer in backbone.layers:
                if not layer.weights:
                    continue
                total_layers_with_weights += 1
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
                    layers_loaded += 1

        # Dense head
        dense = model.get_layer("dense")
        dense_1 = model.get_layer("dense_1")

        # These groups exist in your inspected file structure.
        g_dense = mw["dense"]["sequential"]["dense"]
        dense.set_weights([np.array(g_dense["kernel"]), np.array(g_dense["bias"])])
        layers_loaded += 1
        total_layers_with_weights += 1

        g_dense_1 = mw["dense_1"]["sequential"]["dense_1"]
        dense_1.set_weights([np.array(g_dense_1["kernel"]), np.array(g_dense_1["bias"])])
        layers_loaded += 1
        total_layers_with_weights += 1

    return layers_loaded, total_layers_with_weights


def preprocess_audio(
    file_path: str,
    *,
    sr: int = 22050,
    n_mels: int = 128,
    target_frames: int = 128,
) -> np.ndarray:
    """Decode audio and convert into a (1, 128, 128, 3) tensor.

    Important: avoid np.resize (it repeats values and can make inputs look similar).
    We pad/crop the time axis to a fixed frame count instead.
    """

    y, sr = librosa.load(file_path, sr=sr, mono=True)
    if y is None or len(y) == 0:
        raise ValueError("Decoded audio is empty (0 samples). Try converting to WAV, or install ffmpeg.")

    # Use fixed n_mels so the freq axis is always 128.
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels)
    mel_db = librosa.power_to_db(mel, ref=np.max).astype(np.float32)  # shape (128, frames)

    # Pad/crop time frames to target_frames.
    frames = mel_db.shape[1]
    if frames < target_frames:
        pad = target_frames - frames
        mel_db = np.pad(mel_db, ((0, 0), (0, pad)), mode="constant", constant_values=np.min(mel_db))
    elif frames > target_frames:
        mel_db = mel_db[:, :target_frames]

    # Normalize to 0..1 per-sample.
    mn = float(np.min(mel_db))
    mx = float(np.max(mel_db))
    denom = (mx - mn) if (mx - mn) != 0 else 1.0
    mel_norm = (mel_db - mn) / denom

    # Convert (128,128) -> (128,128,3)
    img = np.repeat(mel_norm.T[..., np.newaxis], 3, axis=-1)  # (frames, mels, 3) = (128,128,3)
    img = np.expand_dims(img, axis=0).astype(np.float32)
    return img


def topk(probs: np.ndarray, labels: List[str], k: int = 5) -> List[Tuple[str, float]]:
    idx = np.argsort(-probs)[:k]
    return [(labels[i], float(probs[i])) for i in idx]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run local prediction using respiratory_sound_model.h5")
    parser.add_argument("audio_path", help="Path to .wav/.m4a audio")
    args = parser.parse_args()

    audio_path = os.path.abspath(args.audio_path)
    if not os.path.exists(audio_path):
        print(f"ERROR: file not found: {audio_path}")
        return 2

    # Load label encoder
    with open(LABEL_ENCODER_PATH, "rb") as f:
        label_encoder = pickle.load(f)

    # Robustly obtain the class labels list.
    if hasattr(label_encoder, "classes_"):
        labels = [str(x) for x in list(label_encoder.classes_)]
    else:
        # Fallback: infer labels by trying inverse_transform indices.
        labels = [str(label_encoder.inverse_transform([i])[0]) for i in range(8)]

    # Build and load model
    model = build_model()
    loaded, total = load_weights_from_h5(model, MODEL_PATH)
    print(f"Loaded weights: {loaded} layers (of {total} layers with weights in rebuilt model)")
    if loaded < 3:
        print("WARNING: Very few layers were loaded. Predictions may be wrong/constant.")

    # Preprocess and predict
    x = preprocess_audio(audio_path)
    probs = model.predict(x, verbose=0)[0]

    # Basic sanity checks
    print(f"Input shape: {x.shape}")
    print(f"Prob sum: {float(np.sum(probs)):.6f}")

    best_idx = int(np.argmax(probs))
    best_label = labels[best_idx] if best_idx < len(labels) else str(best_idx)
    best_conf = float(probs[best_idx])

    print(f"Prediction: {best_label}")
    print(f"Confidence: {best_conf:.6f}")

    print("Top-5:")
    for name, p in topk(probs, labels, k=min(5, len(labels))):
        print(f"  {name}: {p:.6f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
