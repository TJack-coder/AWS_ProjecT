BOOK_WRITABLE_FIELDS = {"title", "author", "category", "description", "available"}
REQUIRED_CREATE_FIELDS = ["title", "author"]


def _normalize_string(value):
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    return value.strip()


def validate_create_book_payload(payload: dict):
    payload = payload or {}
    missing = [field for field in REQUIRED_CREATE_FIELDS if not _normalize_string(payload.get(field))]
    if missing:
        return None, {"message": "Missing required fields", "fields": missing}

    normalized = {
        "title": _normalize_string(payload.get("title")),
        "author": _normalize_string(payload.get("author")),
        "category": _normalize_string(payload.get("category")) or "General",
        "description": _normalize_string(payload.get("description")) or "",
        "available": bool(payload.get("available", True)),
    }
    return normalized, None


def validate_update_book_payload(payload: dict):
    payload = payload or {}
    unknown_fields = sorted(set(payload.keys()) - BOOK_WRITABLE_FIELDS)
    if unknown_fields:
        return None, {"message": "Unknown fields", "fields": unknown_fields}

    normalized = {}
    for field in ["title", "author", "category", "description"]:
        if field in payload:
            value = _normalize_string(payload.get(field))
            if field in ["title", "author"] and not value:
                return None, {"message": f"{field} cannot be empty"}
            normalized[field] = value if value is not None else ""

    if "available" in payload:
        normalized["available"] = bool(payload["available"])

    return normalized, None
