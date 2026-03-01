# services/extraction_service.py
def extract_pdf(file_stream, filename, user_id, pdf_collection, **kwargs):
    """
    Handles PDF extraction logic.
    - file_stream: file-like object (uploaded PDF)
    - filename: original PDF filename
    - user_id: calling user
    - pdf_collection: MongoDB collection for saving results
    - kwargs: extra configs (azure client, deployment, etc.)
    Returns: dict (not jsonify)
    """
    result = {
        "ok": False,
        "error": "Not implemented yet",
        "pdf_id": None,
        "extracted_data": {},
        "field_page_map": {}
    }
    return result
