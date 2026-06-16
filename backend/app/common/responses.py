from flask import jsonify


def success(data=None, message=None, status_code=200):
    body = {}
    if message is not None:
        body["message"] = message
    if data is not None:
        body["data"] = data
    return jsonify(body), status_code


def error(message, status_code=400, **extra):
    body = {"message": message}
    body.update(extra)
    return jsonify(body), status_code
