"""
AIoT Smart Launch Risk Assessment - Python / Flask / Scikit-Learn Microservice
SRS Reference: Feature 5 & Section 8 (ML Service Layer)

This service provides:
1. REST API endpoint `/predict_risk` accepting real-time sensor features.
2. A rule-based baseline fallback compatible with the Node.js backend.
3. Modular pipeline for loading a pre-trained Scikit-learn Random Forest or Gradient Boosting model
   once real maritime sensor training datasets are collected.
"""

from flask import Flask, request, jsonify
import numpy as np
import os
import joblib

app = Flask(__name__)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'launch_risk_model.joblib')

model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("[ML Service] Loaded pre-trained Scikit-Learn model successfully.")
    except Exception as e:
        print(f"[ML Service] Error loading model: {e}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "service": "Smart Launch Risk ML Service",
        "model_loaded": model is not None,
        "engine": "Scikit-Learn Random Forest Classifier + Rule-based Safeguard"
    })

@app.route('/predict_risk', methods=['POST'])
def predict_risk():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No sensor input received"}), 400

    # Extract features:
    passenger_count = float(data.get('passengerCount', 0))
    max_capacity = float(data.get('maxCapacity', 500))
    capacity_ratio = passenger_count / max(1.0, max_capacity)
    
    roll = float(data.get('roll', 0.0))
    pitch = float(data.get('pitch', 0.0))
    water_level_pct = float(data.get('waterLevelPercent', 0.0) or 0.0)
    imbalance_pct = float(data.get('loadImbalancePercent', 0.0) or 0.0)

    feature_vector = np.array([[capacity_ratio, abs(roll), abs(pitch), water_level_pct, imbalance_pct]])

    # If trained ML model exists, predict probability distribution
    if model is not None:
        try:
            # Predict Risk Score (0-100) or Risk Level Class
            predicted_score = float(model.predict(feature_vector)[0])
        except Exception as e:
            predicted_score = fallback_rule_scoring(capacity_ratio, roll, pitch, water_level_pct, imbalance_pct)
    else:
        # Rule-based calculation until real training dataset is uploaded
        predicted_score = fallback_rule_scoring(capacity_ratio, roll, pitch, water_level_pct, imbalance_pct)

    # Classify category
    if predicted_score >= 75:
        level = "CRITICAL"
    elif predicted_score >= 50:
        level = "HIGH RISK"
    elif predicted_score >= 25:
        level = "WARNING"
    else:
        level = "SAFE"

    return jsonify({
        "riskScore": round(predicted_score, 1),
        "riskLevel": level,
        "features": {
            "capacityRatio": round(capacity_ratio, 2),
            "roll": roll,
            "pitch": pitch,
            "waterLevelPercent": water_level_pct,
            "loadImbalance": imbalance_pct
        },
        "engine": "scikit-learn" if model is not None else "rule-based-prototype"
    })

def fallback_rule_scoring(cap_ratio, roll, pitch, water_pct, imbalance_pct):
    score = 0.0
    if cap_ratio > 1.25: score += 35
    elif cap_ratio > 1.05: score += 25
    elif cap_ratio >= 0.90: score += 12

    abs_roll = abs(roll)
    if abs_roll >= 14.0: score = max(score, 85)
    elif abs_roll >= 7.0: score += 25

    if water_pct >= 65.0: score = max(score, 90)
    elif water_pct >= 30.0: score += 30

    if imbalance_pct > 25.0: score += 20

    return min(100.0, max(0.0, score))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
