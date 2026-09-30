import logging
from contextvars import ContextVar

from pythonjsonlogger.json import JsonFormatter

# Set per request by RequestIdMiddleware; read by the log filter below.
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # An explicit `extra={"request_id": ...}` wins: exception handlers run after the
        # middleware has reset the context variable.
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get()
        return True


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
            rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
        )
    )
    # Attached to the handler (not a logger) so records from every library get the ID.
    handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Route uvicorn through the JSON handler; our middleware logs requests, so drop its access log.
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
    access = logging.getLogger("uvicorn.access")
    access.handlers = []
    access.propagate = False
