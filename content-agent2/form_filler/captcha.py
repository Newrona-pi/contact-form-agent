from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Optional, Protocol

logger = logging.getLogger(__name__)

# 複数プロバイダの環境変数候補を吸収（2captcha は先頭数字のため環境変数名が扱いづらい）
ENV_KEYS: dict[str, tuple[str, ...]] = {
    "anticaptcha": ("ANTICAPTCHA_API_KEY", "ANTICAPTCHA_KEY"),
    # 2captcha は複数の別名を許容
    "2captcha": ("TWOCAPTCHA_API_KEY", "TWO_CAPTCHA_API_KEY", "CAPTCHA2_API_KEY", "CAPTCHA_2_API_KEY"),
    "capsolver": ("CAPSOLVER_API_KEY", "CAPSOLVER_KEY"),
    "none": (),
}


class CaptchaSolver(Protocol):
    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]: ...
    async def solve_hcaptcha(self, site_key: str, page_url: str) -> Optional[str]: ...
    # 将来: v3, turnstile などを追加


class NullSolver:
    """CAPTCHA を解かないダミー実装（学習/ドライラン用）"""

    async def solve_recaptcha_v2(self, *_a, **_k) -> Optional[str]:
        return None

    async def solve_hcaptcha(self, *_a, **_k) -> Optional[str]:
        return None


def _read_api_key(api_type: str) -> Optional[str]:
    for env_name in ENV_KEYS.get(api_type, ()):
        val = os.getenv(env_name)
        if val:  # 空文字は無視
            return val
    return None


@dataclass
class _BaseAPISolver:
    api_key: str
    timeout: float
    max_retries: int
    retry_backoff: float = 1.5

    async def _retry(self, coro_factory):
        """指数バックオフで再試行（トークン取得共通処理の雛形）"""
        delay = 1.0
        for attempt in range(1, self.max_retries + 1):
            try:
                return await asyncio.wait_for(coro_factory(), timeout=self.timeout)
            except Exception as e:  # 具象実装で詳細ハンドリング
                logger.debug("CAPTCHA solve attempt %s failed: %s", attempt, e)
                if attempt >= self.max_retries:
                    break
                await asyncio.sleep(delay)
                delay *= self.retry_backoff
        return None


class AnticaptchaSolver(_BaseAPISolver):
    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None

    async def solve_hcaptcha(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None


class TwoCaptchaSolver(_BaseAPISolver):
    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None

    async def solve_hcaptcha(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None


class CapsolverSolver(_BaseAPISolver):
    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None

    async def solve_hcaptcha(self, site_key: str, page_url: str) -> Optional[str]:
        # TODO: 実API実装を追加
        return None


def _build_solver(api_type: str, api_key: str, timeout: float, max_retries: int) -> CaptchaSolver:
    t = api_type.lower()
    if t == "anticaptcha":
        return AnticaptchaSolver(api_key=api_key, timeout=timeout, max_retries=max_retries)
    if t == "2captcha":
        return TwoCaptchaSolver(api_key=api_key, timeout=timeout, max_retries=max_retries)
    if t == "capsolver":
        return CapsolverSolver(api_key=api_key, timeout=timeout, max_retries=max_retries)
    # 未対応は Null にフォールバック（将来の拡張に備える）
    logger.warning("未知の CAPTCHA API '%s'。解決をスキップします。", api_type)
    return NullSolver()


class CaptchaHandler:
    """CAPTCHA解決ハンドラ（プロバイダ切り替え・リトライ内蔵）"""

    def __init__(
        self,
        api_type: str = "anticaptcha",
        api_key: Optional[str] = None,
        timeout: float = 120.0,
        max_retries: int = 2,
    ):
        self.api_type = api_type.lower()
        # --api_key 優先、なければ環境変数から取得
        self.api_key = api_key or _read_api_key(self.api_type)
        if self.api_type != "none" and not self.api_key:
            # README の 2CAPTCHA_KEY ではなく TWOCAPTCHA_API_KEY 等を推奨
            raise ValueError(
                f"{self.api_type} のAPIキーが見つかりません。候補: {ENV_KEYS.get(self.api_type)} "
                f"または引数 api_key に直接指定してください。"
            )
        self.timeout = float(timeout)
        self.max_retries = int(max_retries)
        self._solver: CaptchaSolver = NullSolver() if self.api_type == "none" else _build_solver(
            self.api_type, self.api_key, self.timeout, self.max_retries  # type: ignore[arg-type]
        )

    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        """reCAPTCHA v2 解決（未対応プロバイダは None を返す）"""
        token = await self._solver.solve_recaptcha_v2(site_key, page_url)
        if token:
            logger.debug("reCAPTCHA v2 solved (provider=%s)", self.api_type)
        return token

    async def solve_hcaptcha(self, site_key: str, page_url: str) -> Optional[str]:
        """hCaptcha 解決（未対応プロバイダは None を返す）"""
        token = await self._solver.solve_hcaptcha(site_key, page_url)
        if token:
            logger.debug("hCaptcha solved (provider=%s)", self.api_type)
        return token
