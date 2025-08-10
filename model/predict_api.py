from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
model = joblib.load("focusguard_model.pkl")

# ✅ Root route to confirm server is running
@app.route("/")
def index():
    return "FocusGuard API is running"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    text = data.get("text", "")
    prediction = model.predict([text])[0]
    return jsonify({"prediction": prediction})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)

