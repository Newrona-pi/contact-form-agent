import asyncio
import types

import yaml

import form_filler.auto_select as auto_select_module
import form_filler.core as core_module
from form_filler.auto_select import _get_pref_from_data, auto_select_all
from form_filler.consent import choose_second_option_in_form
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


def test_prefecture_defaults_survive_and_selection(monkeypatch, tmp_path):
    filler = FormFiller(concurrency=1)
    captured_data = []

    async def fake_worker(self, queue, output_file):
        while True:
            try:
                task = await queue.get()
            except asyncio.CancelledError:
                break
            captured_data.append(dict(task.data))
            queue.task_done()

    monkeypatch.setattr(FormFiller, "_worker", fake_worker)

    default_path = tmp_path / "defaults.yml"
    default_path.write_text(yaml.safe_dump({"prefecture": "東京都"}), encoding="utf-8")

    input_missing = tmp_path / "input_missing.csv"
    input_missing.write_text(
        "form_url,company\nhttp://example.com,Example Inc\n",
        encoding="utf-8",
    )
    output_missing = tmp_path / "out_missing.csv"
    asyncio.run(filler.run(str(input_missing), str(default_path), str(output_missing)))

    input_blank = tmp_path / "input_blank.csv"
    input_blank.write_text(
        "form_url,prefecture\nhttp://example.org,\n",
        encoding="utf-8",
    )
    output_blank = tmp_path / "out_blank.csv"
    asyncio.run(filler.run(str(input_blank), str(default_path), str(output_blank)))

    assert {d["form_url"] for d in captured_data} == {"http://example.com", "http://example.org"}
    for data in captured_data:
        assert data["prefecture"] == "東京都"
        assert _get_pref_from_data(data) == "東京都"

    target_data = captured_data[0]

    options_data = [{"label": "選択してください", "value": "", "disabled": False}]
    prefectures = [
        ("北海道", "hokkaido"),
        ("青森県", "aomori"),
        ("岩手県", "iwate"),
        ("宮城県", "miyagi"),
        ("秋田県", "akita"),
        ("山形県", "yamagata"),
        ("福島県", "fukushima"),
        ("茨城県", "ibaraki"),
        ("栃木県", "tochigi"),
        ("群馬県", "gunma"),
        ("埼玉県", "saitama"),
        ("千葉県", "chiba"),
        ("東京都", "tokyo"),
        ("神奈川県", "kanagawa"),
        ("新潟県", "niigata"),
        ("富山県", "toyama"),
        ("石川県", "ishikawa"),
        ("福井県", "fukui"),
        ("山梨県", "yamanashi"),
        ("長野県", "nagano"),
    ]
    for label, value in prefectures:
        options_data.append({"label": label, "value": value, "disabled": False})

    class DummySelect:
        def __init__(self, options):
            self.options = options
            self.selected_index = 0

        async def evaluate(self, script, *args):
            if "selectedIndex" in script:
                return {
                    "selectedIndex": self.selected_index,
                    "values": [
                        {"value": opt["value"], "disabled": opt["disabled"]}
                        for opt in self.options
                    ],
                }
            return None

        async def select_option(self, index=None, label=None, value=None):
            if index is not None:
                self.selected_index = index
                return
            if label is not None:
                for idx, opt in enumerate(self.options):
                    if opt["label"] == label:
                        self.selected_index = idx
                        return
            if value is not None:
                for idx, opt in enumerate(self.options):
                    if opt["value"] == value:
                        self.selected_index = idx
                        return

        @property
        def current_label(self):
            return self.options[self.selected_index]["label"]

    class DummyPage:
        def __init__(self, select):
            self.select = select

        async def query_selector(self, selector):
            return None

        async def query_selector_all(self, selector):
            return [self.select]

        async def select_option(self, selector, *, label=None, value=None):
            await self.select.select_option(label=label, value=value)

        async def evaluate(self, script, *args):
            if "getClientRects" in script:
                return True
            return None

    select = DummySelect(options_data)
    page = DummyPage(select)

    async def fake_extract_labels_bulk(page_obj, scope_selector=None):
        return [
            {
                "selector": "#prefecture",
                "tag": "select",
                "name": "prefecture",
                "labelText": "都道府県",
            }
        ]

    async def fake_get_options(page_obj, selector):
        return [
            (opt["label"], opt["value"], opt["disabled"])
            for opt in options_data
        ]

    monkeypatch.setattr(auto_select_module, "extract_labels_bulk", fake_extract_labels_bulk)
    monkeypatch.setattr(auto_select_module, "_get_options", fake_get_options)

    async def run_auto_and_choose():
        select.selected_index = 0
        await auto_select_all(page, target_data)
        assert select.current_label == "東京都"
        changed = await choose_second_option_in_form(page)
        return changed

    changed = asyncio.run(run_auto_and_choose())
    assert changed == 0
    assert select.current_label == "東京都"
