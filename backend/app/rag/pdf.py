import io

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.errors import AppError


def pdf_text(data: bytes) -> str:
    """Plain text of every page, pages separated by blank lines."""
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except (PdfReadError, ValueError):
        raise AppError("invalid_file", "That PDF couldn't be read.", 422) from None
    return "\n\n".join(p.strip() for p in pages if p.strip())
