import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.errors import AppError

MAX_COVER_BYTES = 5 * 1024 * 1024
_COVER_DIR = "event-covers"
_LISTING_DIR = "listing-photos"
_NAME_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$"
)

_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"RIFF", "webp"),
)


def _upload_root() -> Path:
    root = Path(get_settings().UPLOAD_DIR).expanduser()
    if not root.is_absolute():
        root = Path.cwd() / root
    return root.resolve()


def _upload_dir(name: str) -> Path:
    path = _upload_root() / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def event_cover_dir() -> Path:
    return _upload_dir(_COVER_DIR)


def _stored_path(directory: Path, filename: str) -> Path:
    if not _NAME_RE.match(filename):
        raise AppError("not_found", "File not found.", 404)
    path = (directory / filename).resolve()
    if not path.is_relative_to(directory.resolve()) or not path.is_file():
        raise AppError("not_found", "File not found.", 404)
    return path


def event_cover_path(filename: str) -> Path:
    return _stored_path(event_cover_dir(), filename)


def listing_photo_path(filename: str) -> Path:
    return _stored_path(_upload_dir(_LISTING_DIR), filename)


def _extension_for(header: bytes) -> str:
    for signature, ext in _SIGNATURES:
        if header.startswith(signature):
            if ext == "webp" and header[8:12] != b"WEBP":
                break
            return ext
    raise AppError("validation_error", "Image must be a JPEG, PNG, or WebP file.", 422)


async def _save_image(file: UploadFile, directory: Path) -> str:
    header = await file.read(16)
    if not header:
        raise AppError("validation_error", "Choose an image to upload.", 422)
    ext = _extension_for(header)
    dest_name = f"{uuid.uuid4()}.{ext}"
    dest = directory / dest_name
    written = len(header)
    try:
        with dest.open("wb") as out:
            out.write(header)
            while True:
                chunk = await file.read(64 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_COVER_BYTES:
                    raise AppError("validation_error", "Image must be 5 MB or smaller.", 422)
                out.write(chunk)
    except AppError:
        dest.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return dest_name


async def save_event_cover(file: UploadFile) -> str:
    return f"/v1/uploads/event-covers/{await _save_image(file, event_cover_dir())}"


async def save_listing_photo(file: UploadFile) -> str:
    return f"/v1/uploads/listing-photos/{await _save_image(file, _upload_dir(_LISTING_DIR))}"
