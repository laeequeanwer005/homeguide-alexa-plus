
import re
from pathlib import Path
from pypdf import PdfReader

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "documents"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return clean_text("\n\n".join(pages))

    if suffix in {".txt", ".md"}:
        return clean_text(path.read_text(encoding="utf-8", errors="replace"))

    raise ValueError("Unsupported file type. Upload a PDF, TXT, or MD file.")


def split_into_chunks(text: str, size: int = 900, overlap: int = 120):
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + size, len(text))
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end == len(text):
            break

        start = end - overlap

    return chunks


def save_document(filename: str, content: bytes) -> dict:
    safe_name = Path(filename).name

    if Path(safe_name).suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only PDF, TXT, and MD files are supported.")

    if not content:
        raise ValueError("The uploaded file is empty.")

    if len(content) > 15 * 1024 * 1024:
        raise ValueError("Files must be 15 MB or smaller.")

    destination = DATA_DIR / safe_name

    # Avoid overwriting an existing manual with the same filename.
    if destination.exists():
        destination = DATA_DIR / f"{destination.stem}_{__import__('uuid').uuid4().hex[:8]}{destination.suffix}"

    destination.write_bytes(content)

    try:
        text = extract_text(destination)
    except Exception:
        destination.unlink(missing_ok=True)
        raise

    if not text:
        destination.unlink(missing_ok=True)
        raise ValueError(
            "No readable text was found. This PDF may be scanned; OCR support can be added later."
        )

    chunks = split_into_chunks(text)

    return {
        "filename": destination.name,
        "characters": len(text),
        "chunks": len(chunks),
        "text": text,
        "parts": chunks,
    }


def list_documents() -> list[dict]:
    documents = []

    for path in sorted(DATA_DIR.iterdir()):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            try:
                text = extract_text(path)
                documents.append({
                    "filename": path.name,
                    "characters": len(text),
                })
            except Exception:
                continue

    return documents


def search_documents(question: str, limit: int = 4) -> list[dict]:
    terms = set(re.findall(r"[a-z0-9]+", question.lower()))
    stop_words = {
        "the", "and", "for", "with", "that", "this", "what", "how",
        "does", "can", "you", "are", "from", "have", "has", "help",
        "my", "is", "to", "in", "of", "a", "an", "it", "on"
    }
    terms -= stop_words

    results = []

    for document in list_documents():
        path = DATA_DIR / document["filename"]
        text = extract_text(path)

        for index, chunk in enumerate(split_into_chunks(text)):
            chunk_terms = set(re.findall(r"[a-z0-9]+", chunk.lower()))
            score = len(terms & chunk_terms)

            if score > 0:
                results.append({
                    "filename": document["filename"],
                    "chunk": index + 1,
                    "score": score,
                    "text": chunk,
                })

    results.sort(key=lambda item: item["score"], reverse=True)
    return results[:limit]
