from flask import Flask, request, jsonify
import joblib
import librosa
import numpy as np
import tempfile
import os

app = Flask(__name__)

# Load model
model = joblib.load("rf.joblib")
label_encoder = joblib.load("label_encoder.pkl")

def extract_features(file_path):
    audio, sr = librosa.load(file_path, sr=22050)

    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=30)
    mfcc_mean = np.mean(mfcc.T, axis=0)

    return mfcc_mean.reshape(1, -1)

@app.route("/predict", methods=["POST"])
def predict():
    file = request.files.get("audio")
    if not file:
        return jsonify({"error": "No audio file provided"}), 400

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    file.save(tmp.name)

    try:
        features = extract_features(tmp.name)
        pred = model.predict(features)
        label = label_encoder.inverse_transform(pred)[0]
    finally:
        os.remove(tmp.name)

    return jsonify({
        "prediction": label
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
