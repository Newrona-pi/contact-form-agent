import asyncio
import types

import form_filler.core as core_module
from form_filler.core import FormFiller


class DummyLocator:
    def __init__(self) -> None:
        self.first = self

    async def count(self) -> int:
        return 0

    async def element_handle(self):
        return None


class DummyPage:
    def __init__(self) -> None:
        self.frames = []

    async def wait_for_selector(self, *args, **kwargs):
        return None

    async def content(self) -> str:
        return "<html></html>"

    async def query_selector(self, selector: str):
        return None

    def locator(self, selector: str) -> DummyLocator:
        return DummyLocator()


def test_address_not_mapped_when_selector_reserved(monkeypatch):
    core = FormFiller()
    core.fast_mode = True

    async def fake_extract_labels_bulk(page, scope_selector=None):
        return [
            {
                "selector": "#shared",
                "visible": True,
                "type": "email",
                "labelText": "Email address",
                "name": "email",
            },
            {
                "selector": None,
                "visible": True,
                "labelText": "mailing address",
                "name": "address_hint",
            },
        ]

    monkeypatch.setattr(core_module, "extract_labels_bulk", fake_extract_labels_bulk)

    async def fake_find_best_field_match(self, page, field_name, exclude_selectors=None):
        if exclude_selectors and "#shared" in exclude_selectors:
            return None
        return (page, "#shared")

    core.find_best_field_match = types.MethodType(fake_find_best_field_match, core)

    async def noop_record_learning_signal(self, page, soup, key):
        return None

    core._record_learning_signal = types.MethodType(noop_record_learning_signal, core)

    page = DummyPage()
    data = {"email": "user@example.com", "address": "123 example st"}

    async def run():
        result = await core.find_all_field_matches(page, data)
        assert result["email"][1] == "#shared"
        assert "address" not in result

    asyncio.run(run())
