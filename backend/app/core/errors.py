class AppError(Exception):
    """Expected, client-facing failure. Rendered as {"code", "message"} with `status`."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
