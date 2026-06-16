from flask import Blueprint, jsonify

monitoring_bp = Blueprint("monitoring", __name__)


@monitoring_bp.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "library-flask-api"})
