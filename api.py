import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Import services
from services.extraction_service import extract_pdf
from services.chat_service import chat_with_pdf
from services.analytics_service import get_analytics
from services.compare_service import compare_pdfs
from services.classification_service import classify_docs

# Flask app setup
app = Flask(__name__)
CORS(app)
Swagger(app)

# MongoDB setup
mongo_client = MongoClient(os.getenv("MONGO_URI"))
db = mongo_client.get_database("pdf_data")
pdf_collection = db.get_collection("extracted_data")
api_usage_collection = db.get_collection("api_usage")

MASTER_API_KEY = os.getenv("MASTER_API_KEY")

# ------------------ API KEY Middleware ------------------
@app.before_request
def check_api_key():
    if request.endpoint in ("apidocs.static", "flasgger.static", "static"):
        return
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token != MASTER_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

# ------------------ Routes ------------------
@app.route("/api/v1/extract", methods=["POST"])
def extract_route():
    file = request.files.get("pdf")
    user_id = request.form.get("user_id")
    if not file:
        return jsonify({"ok": False, "error": "pdf file required"}), 400

    result = extract_pdf(file.stream, file.filename, user_id, pdf_collection)
    return jsonify(result), 200 if result.get("ok") else 500

@app.route("/api/v1/chat", methods=["POST"])
def chat_route():
    data = request.get_json() or {}
    result = chat_with_pdf(data, pdf_collection)
    return jsonify(result), 200 if result.get("ok") else 500

@app.route("/api/v1/analytics", methods=["POST"])
def analytics_route():
    data = request.get_json() or {}
    result = get_analytics(data, pdf_collection)
    return jsonify(result), 200

@app.route("/api/v1/compare", methods=["POST"])
def compare_route():
    file1 = request.files.get("pdf1")
    file2 = request.files.get("pdf2")
    if not file1 or not file2:
        return jsonify({"ok": False, "error": "both pdf1 and pdf2 required"}), 400
    result = compare_pdfs(file1.stream, file2.stream)
    return jsonify(result), 200

@app.route("/api/v1/classify", methods=["POST"])
def classify_route():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"ok": False, "error": "files required"}), 400
    result = classify_docs(files)
    return jsonify(result), 200

# ------------------ Usage Logging ------------------
@app.after_request
def log_usage(response):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        api_usage_collection.insert_one({
            "api_key": token,
            "endpoint": request.path,
            "method": request.method,
            "timestamp": datetime.utcnow(),
            "status": response.status_code
        })
    except Exception:
        pass
    return response

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
