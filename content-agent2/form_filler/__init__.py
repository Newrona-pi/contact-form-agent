"""form_filler package

公開APIをまとめます。
"""

from typing import TYPE_CHECKING
from importlib.metadata import PackageNotFoundError, version as _pkg_version

__all__ = ["FormFiller", "__version__"]


def _get_version() -> str:
    """パッケージ版取得（未インストール時はローカル版にフォールバック）"""
    try:
        return _pkg_version("form_filler")
    except PackageNotFoundError:
        return "0.0.0+local"


__version__ = _get_version()

# 遅延インポートで起動を高速化し、副作用を最小化
if TYPE_CHECKING:
    from .core import FormFiller  # pragma: no cover
else:
    def __getattr__(name: str):
        if name == "FormFiller":
            from .core import FormFiller  # noqa: WPS433 (runtime import)
            return FormFiller
        raise AttributeError(name)
