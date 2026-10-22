
import json
import os
import urllib.request
import urllib.error

from app.services.documents import search_documents

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen2.5:3b"


def answer_question(question):
    if not isinstance(question, str) or not question.strip():
        return {
            "answer": "Please enter a question.",
            "sources": [],
            "mode": "validation",
        }

    question = question.strip()
    results = search_documents(question, limit=4)

    if not results:
        return {
            "answer": "I couldn't find relevant information in your uploaded manuals.",
            "sources": [],
            "mode": "no_relevant_documents",
        }

    sources = [
        {
            "filename": r.get("filename", "Unknown"),
            "chunk": r.get("chunk"),
            "score": r.get("score"),
        }
        for r in results
    ]

    context = "\n\n".join(
        f"Source: {r.get('filename', 'Unknown')}\n{r.get('text', '')}"
        for r in results
        if r.get("text", "").strip()
    )

    if not context.strip():
        return {
            "answer": "The retrieved passages contain no readable text.",
            "sources": sources,
            "mode": "empty_context",
        }

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are HomeGuide, a careful appliance troubleshooting "
                    "assistant. Answer only from the supplied manual excerpts. "
                    "Do not invent instructions. Keep the answer concise. "
                    "If the excerpts do not support an answer, say so. "
                    "Never advise opening electrical components or bypassing "
                    "safety mechanisms. Recommend a qualified technician "
                    "for unsafe or unsupported repairs."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    f"Manual excerpts:\n{context}\n\n"
                    "Give a direct answer based only on these excerpts."
                ),
            },
        ],
        "options": {"temperature": 0.1, "num_predict": 300},
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))

        answer = data.get("message", {}).get("content", "").strip()

        if not answer:
            raise ValueError("Ollama returned an empty answer.")

        return {
            "answer": answer,
            "sources": sources,
            "mode": "local_llm",
            "model": OLLAMA_MODEL,
        }

    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        excerpts = "\n\n".join(
            f"From {r.get('filename', 'Unknown')}:\n{r.get('text', '')}"
            for r in results
            if r.get("text", "").strip()
        )

        return {
            "answer": (
                "Local AI generation failed; showing retrieved manual excerpts instead.\n\n"
                + excerpts
            ),
            "sources": sources,
            "mode": "retrieval_fallback",
            "detail": str(exc),
        }
