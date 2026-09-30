from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    # "ok" means the process is serving; database reachability is reported separately.
    status: Literal["ok"]
    db: bool
