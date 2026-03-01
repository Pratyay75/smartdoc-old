# services/chat_service.py
def chat_with_pdf(payload, pdf_collection=None, **kwargs):
    """
    Chat with a PDF using embeddings + LLM.
    payload example: {"pdf_id": "...", "question": "...", "user_id": "..."}
    Returns: dict with answer
    """
    return {"ok": False, "error": "Not implemented yet"}
