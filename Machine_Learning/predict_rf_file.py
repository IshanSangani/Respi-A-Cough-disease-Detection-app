import argparse
import json
import os
from typing import Any, Dict

import joblib
import numpy as np

# Import pipeline + model from eg.py (does NOT start the server because of __main__ guard)
import eg


def to_jsonable(obj: Any) -> Any:
    if isinstance(obj, (np.floating, np.integer)):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(x) for x in obj]
    return obj


def predict_one(path: str) -> Dict[str, Any]:
    features = eg.extract_features(path)
    try:
        features = eg.align_features_for_model(features)
    except Exception:
        pass
    pred = eg.model.predict(features)[0]
    proba = eg.model.predict_proba(features)[0]
    classes = list(getattr(eg.model, "classes_", []))

    probs_map = {str(c): float(p) for c, p in zip(classes, proba)}

    return {
        "file": os.path.basename(path),
        "prediction": str(pred),
        "confidence": float(np.max(proba)),
        "probabilities": probs_map,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Local CLI prediction for rf.pkl (same logic as eg.py)")
    parser.add_argument("audio_path", help="Path to .wav/.m4a file")
    args = parser.parse_args()

    audio_path = os.path.abspath(args.audio_path)
    if not os.path.exists(audio_path):
        print(f"ERROR: file not found: {audio_path}")
        return 2

    try:
        result = predict_one(audio_path)
    except Exception as e:
        print("ERROR:")
        print(str(e))
        return 1

    print(json.dumps(to_jsonable(result), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
