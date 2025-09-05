from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

__all__ = ["FormTask", "FormResult"]

JSONDict = Dict[str, Any]


@dataclass(slots=True)
class FormTask:
    """フォームタスク情報"""
    form_url: str
    data: JSONDict
    index: int


@dataclass(slots=True)
class FormResult:
    """フォーム送信結果"""
    form_url: str
    status: str  # "OK" / "DRY_RUN" / "SUBMIT_FAIL" / "TIMEOUT" / "CAPTCHA_FAIL" / "ERROR"
    note: str
    timestamp: str
    unmapped_fields: str = field(default="")

    @staticmethod
    def csv_header() -> List[str]:
        return ["form_url", "status", "note", "timestamp", "unmapped_fields"]

    def to_csv_row(self) -> List[str]:
        return [self.form_url, self.status, self.note, self.timestamp, self.unmapped_fields]
