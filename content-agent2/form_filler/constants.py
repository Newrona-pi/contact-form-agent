from __future__ import annotations

import os

# スコア閾値の設定（キー別）
SPECIAL_MIN_SCORE = {"name": 4, "email": 4}

# lexicon（外部辞書）デフォルトパス
DEFAULT_LEXICON_BASE = os.path.join("lexicon", "base_synonyms.yml")
DEFAULT_LEXICON_CUSTOM = os.path.join("lexicon", "custom_synonyms.yml")

# 学習モードで除外するストップワード（ラベルなど）
LEARN_STOPWORDS = [
    "必須", "任意", "※", "（半角）", "(半角)", "（全角）", "(全角)", "入力例",
]

# フィールドマッピング用の正規表現パターン（初期値: 元実装と同等）
CANDIDATES: dict[str, list[str]] = {
    "name":    [r"(氏名|お名前|おなまえ|ご担当者|ご担当者名|担当者名|namae|(?<![a-z])person(?!al)|firstname|form_name|kanji|name01|name02|__name|corp_name1|rcp-name|your-name|fullname|contact-name|customer-name|user-name|client-name|cust_name)", r"(full\s*name|your[-_ ]?name|contact[-_ ]?name|customer[-_ ]?name|user[-_ ]?name|client[-_ ]?name|cust[-_ ]?name)"],
    "first_name": [r"(名|お名前\(名\)|first[-_ ]?name|given[-_ ]?name|名\(めい\)|name_first|name02|your[-_]?mei|firstname|givenname|first_name|given_name|your-first-name|contact-first-name|customer-first-name|user-first-name|client-first-name|太郎|花子|例\)太郎|例\)[^）]*太郎|例\)[^）]*花子)", r"name[_-]?mei"],
    "last_name":  [r"(姓|氏|お名前\(姓\)|last[-_ ]?name|family[-_ ]?name|姓\(せい\)|name_last|name01|your[-_]?sei|lastname|familyname|last_name|family_name|your-last-name|contact-last-name|customer-last-name|user-last-name|client-last-name|山田|田中|例\)山田|例\)[^）]*山田|例\)[^）]*田中)", r"name[_-]?sei"],
    "nameSei": [r"namesei", r"name_sei", r"姓"],
    "nameMei": [r"namemei", r"name_mei", r"名"],
    "kanaSei": [
        r"kanasei", r"kana_sei", r"セイ",
        r"name[_-]?sei[_-]?kana",   # 追加: name_sei_kana / name-sei-kana 等
        r"sei[_-]?kana"            # 追加: sei_kana / sei-kana
    ],
    "kanaMei": [
        r"kanamei", r"kana_mei", r"メイ",
        r"name[_-]?mei[_-]?kana",   # 追加: name_mei_kana / name-mei-kana 等
        r"mei[_-]?kana"            # 追加: mei_kana / mei-kana
    ],
    "furigana": [r"furigana", r"kana", r"yomigana", r"ふりがな", r"フリガナ", r"かな", r"カナ", r"よみがな", r"ヨミガナ", r"氏名カナ", r"氏名ふりがな", r"名前カナ", r"名前ふりがな", r"furi", r"kana_last", r"kana_first", r"form_name_ruby", r"corp_name2"],
    "email":   [r"e[-_ ]?mail", r"email", r"mail address", r"メール", r"form_email", r"mail", r"corp_email", r"sendmailaddress|your-email|contact-email|customer-email|user-email|client-email|email-address|mail-address|your-mail|contact-mail|customer-mail|user-mail|client-mail", r"email[_-]?address"],
    "email_confirm": [r"e[-_ ]?mail[-_ ]?confirm", r"email[-_ ]?confirm", r"confirm[-_ ]?email", r"e[-_ ]?mail[-_ ]?verification", r"email[-_ ]?verification", r"verify[-_ ]?email", r"e[-_ ]?mail[-_ ]?check", r"email[-_ ]?check", r"check[-_ ]?email", r"e[-_ ]?mail[-_ ]?retype", r"email[-_ ]?retype", r"retype[-_ ]?email", r"e[-_ ]?mail[-_ ]?again", r"email[-_ ]?again", r"again[-_ ]?email", r"e[-_ ]?mail[-_ ]?repeat", r"email[-_ ]?repeat", r"repeat[-_ ]?email", r"e[-_ ]?mail[-_ ]?2", r"email[-_ ]?2", r"e[-_ ]?mail[-_ ]?second", r"email[-_ ]?second", r"second[-_ ]?email", r"e[-_ ]?mail[-_ ]?duplicate", r"email[-_ ]?duplicate", r"duplicate[-_ ]?email", r"e[-_ ]?mail[-_ ]?copy", r"email[-_ ]?copy", r"copy[-_ ]?email", r"form_email_confirm", r"メールアドレス（確認）", r"mail_to2", r"re_email", r"mail_confirm", r"sendmailaddresscfm|your-email-confirm|contact-email-confirm|customer-email-confirm|user-email-confirm|client-email-confirm|email-confirm|mail-confirm|your-mail-confirm|contact-mail-confirm|customer-mail-confirm|user-mail-confirm|client-mail-confirm|form_check_mail"],
    "phone":   [r"phone", r"tel", r"telephone", r"電話", r"電話番号", r"電話番号", r"お電話番号", r"tel", r"form_tel", r"corp_phone|your-phone|contact-phone|customer-phone|user-phone|client-phone|phone-number|tel-number|telephone-number|your-tel|contact-tel|customer-tel|user-tel|client-tel|your-telephone|contact-telephone|customer-telephone|user-telephone|client-telephone"],
    "company": [r"company", r"corporate", r"organization", r"会社", r"企業名", r"kaisya", r"会社名", r"form_company_name", r"御社名", r"貴社名", r"corp_name3", r"corp-name|your-company|contact-company|customer-company|user-company|client-company|company-name|organization-name|corporate-name|your-organization|contact-organization|customer-organization|user-organization|client-organization|your-corporate|contact-corporate|customer-corporate|user-corporate|client-corporate"],
    "department": [
        r"部署名", r"部署", r"ご?所属(先)?", r"所属(部署)?", r"部門", r"部[・/／]?課名?",
        r"課名", r"部署[・/／]役職", r"division", r"dept", r"department", r"section", r"yakusyoku", r"corp_name4", r"your[-_]?busho|your-department|contact-department|customer-department|user-department|client-department|department-name|section-name|division-name|your-section|contact-section|customer-section|user-section|client-section|your-division|contact-division|customer-division|user-division|client-division"
    ],
    "position": [
        r"役職", r"役職名", r"ご?役職", r"職位", r"職位名", r"position", r"job[-_ ]?title",
        r"職種", r"職務", r"役割", r"肩書き", r"職名", r"職責", r"役目|your-position|contact-position|customer-position|user-position|client-position|position-name|job-title|your-job-title|contact-job-title|customer-job-title|user-job-title|client-job-title|title-name|your-title|contact-title|customer-title|user-title|client-title"
    ],
    "website": [
        r"(会社|企業)?(hp|url|website|web ?site|homepage|ホームページ|WEBサイト|webサイト)(\s*url)?",
        r"webサイト", r"サイト ?url", r"公式サイト", r"コーポレートサイト", r"official ?site", r"会社URL|your-website|contact-website|customer-website|user-website|client-website|website-url|your-url|contact-url|customer-url|user-url|client-url|url-address|your-homepage|contact-homepage|customer-homepage|user-homepage|client-homepage|your-site|contact-site|customer-site|user-site|client-site"
    ],
    "subject": [
        r"(件名|題名|タイトル|ご用件|お問い合わせ(の)?(種類|種別|区分)|カテゴリ|区分|種別|select|お問い合わせ先|お問い合わせ内容|corp_sub|corp_category|title)"
        r"|your-subject|contact-subject|customer-subject|user-subject|client-subject|subject-title|your-title|contact-title|customer-title|user-title|client-title"
        r"|your-category|contact-category|customer-category|user-category|client-category|category-name"
        r"|your-inquiry-type|contact-inquiry-type|customer-inquiry-type|user-inquiry-type|client-inquiry-type|inquiry[-_ ]?type"
        r"|your-topic|contact-topic|customer-topic|user-topic|client-topic|topic-name"
        r"|form_inq08"
        r"|qtype"   # 追加：問い合わせ種別の省略名（このサイトの実装）
    ],
    "message": [r"message", r"お問い合わせ", r"contact ?content", r"ご用件", r"内容", r"詳細", r"説明", r"備考", r"ご相談内容", r"ご要望", r"コメント", r"textarea-781", r"お問い合わせ詳細", r"お問い合わせ内容", r"form_content", r"詳細", r"お問い合わせ内容詳細", r"corp_messages|your-message|contact-message|customer-message|user-message|client-message|message-content|your-content|contact-content|customer-content|user-content|client-content|content-text|your-inquiry|contact-inquiry|customer-inquiry|user-inquiry|client-inquiry|inquiry-content|your-comment|contact-comment|customer-comment|user-comment|client-comment|comment-text|your-request|contact-request|customer-request|user-request|client-request|request-content|your-detail|contact-detail|customer-detail|user-detail|client-detail|detail-content|your-description|contact-description|customer-description|user-description|client-description|description-text"],
    # 住所関連フィールドを追加
    "address": [
        r"住所", r"ご住所", r"お住所", r"住まい", r"ご住まい", r"お住まい",
        r"郵便番号", r"〒", r"postal", r"zip", r"postcode",
        r"都道府県", r"県", r"府", r"都", r"道", r"prefecture", r"state",
        r"市区町村", r"市", r"区", r"町", r"村", r"city", r"town", r"village",
        r"丁目", r"番地", r"建物", r"部屋", r"building", r"room",
        r"street", r"address", r"location",
        r"your-address", r"contact-address", r"customer-address", r"user-address", r"client-address",
        r"billing-address", r"shipping-address", r"delivery-address"
    ],
    "postal_code": [
        r"郵便番号", r"〒", r"postal[-_ ]?code", r"zip[-_ ]?code", r"postcode",
        r"your[-_ ]?postal", r"contact[-_ ]?postal", r"customer[-_ ]?postal",
        r"your[-_ ]?zip", r"contact[-_ ]?zip", r"customer[-_ ]?zip",
        # 動的な名前パターンを追加
        r"ext_01", r"ext_02", r"ext_03", r"ext_04", r"ext_05",
        r"field_01", r"field_02", r"field_03", r"field_04", r"field_05",
        r"input_01", r"input_02", r"input_03", r"input_04", r"input_05"
    ],
    "prefecture": [
        r"都道府県", r"県", r"府", r"都", r"道", r"prefecture", r"state",
        r"your[-_ ]?prefecture", r"contact[-_ ]?prefecture", r"customer[-_ ]?prefecture"
    ],
    "city": [
        r"市区町村", r"市", r"区", r"町", r"村", r"city", r"town", r"village",
        r"your[-_ ]?city", r"contact[-_ ]?city", r"customer[-_ ]?city"
    ],
    "street": [
        r"丁目", r"番地", r"建物", r"部屋", r"street", r"address", r"location",
        r"your[-_ ]?street", r"contact[-_ ]?street", r"customer[-_ ]?street"
    ]
}

# 入力可能なフィールドキー（初期値: 元実装と同等）
FILLABLE_KEYS: set[str] = {
    "name", "first_name", "last_name", "name_last", "name_first", "name01", "name02", "nameSei", "nameMei", "your-sei", "your-mei", "cust_name", "furigana", "kana_last", "kana_first", "kanaSei", "kanaMei", "company", "department",
    "email", "email_confirm", "phone", "website", "subject", "message", "position", "title",
    "contact_type", "inquiry_type", "address", "budget", "timeline",
    # 住所関連フィールドを追加
    "postal_code", "prefecture", "city", "street",
    # 動的な名前フィールドを追加
    "ext_01", "ext_02", "ext_03", "ext_04", "ext_05",
    "field_01", "field_02", "field_03", "field_04", "field_05",
    "input_01", "input_02", "input_03", "input_04", "input_05",
    # 新しいフィールド名パターン
    "your-name", "contact-name", "customer-name", "user-name", "client-name", "fullname",
    "your-email", "contact-email", "customer-email", "user-email", "client-email", "email-address", "mail-address", "form_check_mail", "email_address",
    "your-phone", "contact-phone", "customer-phone", "user-phone", "client-phone", "phone-number", "tel-number",
    "your-company", "contact-company", "customer-company", "user-company", "client-company", "company-name", "organization-name", "company_name",
    "your-department", "contact-department", "customer-department", "user-department", "client-department", "department-name", "section-name",
    "your-position", "contact-position", "customer-position", "user-position", "client-position", "position-name", "job-title",
    "your-website", "contact-website", "customer-website", "user-website", "client-website", "website-url", "your-url", "contact-url", "customer-url", "user-url", "client-url",
    "your-subject", "contact-subject", "customer-subject", "user-subject", "client-subject", "your-category", "contact-category", "customer-category", "user-category", "client-category", "your-topic", "contact-topic", "customer-topic", "user-topic", "client-topic", "form_inq08",
    "your-message", "contact-message", "customer-message", "user-message", "client-message", "your-content", "contact-content", "customer-content", "user-content", "client-content", "your-inquiry", "contact-inquiry", "customer-inquiry", "user-inquiry", "client-inquiry", "your-comment", "contact-comment", "customer-comment", "user-comment", "client-comment", "content", "inquiry", "comment",
    # 住所関連の新しいフィールド名パターン
    "your-address", "contact-address", "customer-address", "user-address", "client-address",
    "your-postal", "contact-postal", "customer-postal", "your-zip", "contact-zip", "customer-zip",
    "your-prefecture", "contact-prefecture", "customer-prefecture",
    "your-city", "contact-city", "customer-city",
    "your-street", "contact-street", "customer-street",
    # 分割された電話番号フィールド
    "phone1", "phone2", "phone3"
}

# 入力順序の優先リスト（FILLABLE_KEYS の順序に依存しない）
PRIORITY_KEYS = [
    "subject", "name", "last_name", "first_name", "furigana", "kanaSei", "kanaMei",
    "email", "email_confirm", "phone", "company", "department", "website", "address", "message"
]
# --- ここから追記 ---

# 強トークン（決め打ちカスケード用）
STRONG_TOKENS: dict[str, list[str]] = {
    "email": [
        r"(?<![a-z])e[-_]?mail(?![a-z])",
        r"(?<![a-z])email(?![a-z])",
        r"メール",
        r"email[_-]?address"
    ],
    "email_confirm": [
        r"confirm", r"conf", r"retype", r"again",
        r"duplicate", r"copy", r"確認", r"再入力", r"もう一度", r"再度"
    ],
    "phone": [
        r"(?<![a-z])tel(?![a-z])",
        r"(?<![a-z])phone(?![a-z])",
        r"電話"
    ],
    "name": [
        r"(?<![a-z])name(?![a-z])",
        r"氏名", r"お名前", r"fullname"
    ],
    "first_name": [
        r"名", r"太郎", r"花子",
        r"例[)：:\s]*太郎", r"例[)：:\s]*花子",
        r"name[_-]?mei"
    ],
    "last_name": [
        r"姓", r"氏", r"山田", r"田中",
        r"例[)：:\s]*山田", r"例[)：:\s]*田中",
        r"name[_-]?sei"
    ],
    "company": [
        r"(?<![a-z])company(?![a-z])",
        r"(?<![a-z])corporate(?![a-z])",
        r"(?<![a-z])organization(?![a-z])",
        r"会社", r"企業名", r"会社名",
        # 追加：アンダースコア/ハイフン区切りのパターンに対応
        r"company[_-]", r"corporate[_-]", r"organization[_-]"
    ],
    "website": [
        r"(?<![a-z])url(?![a-z])",
        r"website", r"ホームページ", r"ウェブサイト"
    ],
    "subject": [
        r"件名", r"題名", r"タイトル", r"ご用件",
        # 「お問い合わせ」単独ではマッチさせず、種類/種別/区分が付くときだけ
        r"(お問い合わせ|お問[い]?合わせ|問い合わせ)(の)?(種類|種別|区分)"
    ],
    "message": [
        r"お問い合わせ", r"メッセージ", r"本文", r"ご相談", r"ご要望",
        r"備考", r"コメント", r"詳細", r"自由記入"
    ],
    # 住所関連の強トークンを追加
    "address": [
        r"住所", r"ご住所", r"お住所", r"住まい", r"ご住まい", r"お住まい",
        r"street", r"address", r"location"
    ],
    "postal_code": [
        r"郵便番号", r"〒", r"postal", r"zip", r"postcode"
    ],
    "prefecture": [
        r"都道府県", r"県", r"府", r"都", r"道", r"prefecture", r"state"
    ],
    "city": [
        r"市区町村", r"市", r"区", r"町", r"村", r"city", r"town", r"village"
    ],
    "street": [
        r"丁目", r"番地", r"建物", r"部屋", r"street", r"address", r"location"
    ],
    # 追加: フリガナ（姓/名）の強トークン
    "kanaSei": [
        r"name[_-]?sei[_-]?kana",
        r"kana[_-]?sei",
        r"セイ", r"せい", r"ｾｲ"
    ],
    "kanaMei": [
        r"name[_-]?mei[_-]?kana",
        r"kana[_-]?mei",
        r"メイ", r"めい", r"ﾒｲ"
    ],
}

# 確認欄検出語
CONFIRM_TOKENS: list[str] = [
    "confirm", "conf", "retype", "again",
    "duplicate", "copy", "確認", "再入力", "もう一度", "再度"
]

# 検索欄除外語
SEARCH_TOKENS: list[str] = ["search", "q", "s", "検索"]

# honeypot除外語（不可視＋これらの語でhoneypot判定）
HONEYPOT_TOKENS: list[str] = [
    "honeypot", "_wpcf7_ak_hp", "h-captcha-response", "g-recaptcha-response", "website", "homepage", "url"
]

# ラジオ／チェックの自動選択で避けたい/選びたい語（安全側ヒューリスティック）
RADIO_NEGATIVE_TOKENS: list[str] = [
    "no", "いいえ", "不同意", "不要", "拒否", "受け取らない", "配信しない", "unsubscribe", "オプトアウト"
]
RADIO_MARKETING_TOKENS: list[str] = [
    "newsletter", "mailmag", "mail magazine", "メルマガ", "プロモ", "キャンペーン", "マーケ", "販促", "広告"
]
RADIO_POSITIVE_TOKENS: list[str] = [
    "yes", "同意", "承諾", "受け取る", "許可", "ok"
]
RADIO_REQUIRED_ATTRS: list[str] = [
    "required", "aria-required"
]

# 住所系NG語（textareaをmessage扱いするときに除外する用）
ADDRESS_TOKENS: list[str] = [
    "住所", "郵便", "郵便番号", "都道府県", "市区町村", "丁目", "番地", "建物", "部屋",
    "配送先", "送り先", "請求先", "billing", "shipping"
]

# ===== 企業/個人 分岐検出・フォーム特定補助語彙 =====
# タブ/ボタン/ラジオの切替トリガー用（プレフライトに利用）
CORP_TABS_TOKENS: list[str] = ["法人", "企業", "会社", "法人・団体", "法人/団体", "法人／団体", "企業の方", "法人の方"]
PERSON_TABS_TOKENS: list[str] = ["個人", "個人の方", "フリーランス", "個人事業主"]

# フォーム本文テキストのスコアリング用（企業側シグナル）
CORP_FIELD_TOKENS: list[str] = ["法人", "会社名", "企業名", "法人／団体名", "部署", "役職", "御社名", "貴社名"]
PERSON_FIELD_TOKENS: list[str] = ["活動名", "ハンドルネーム", "ペンネーム", "ニックネーム", "個人の方"]

# autocomplete → キー のマッピング
AUTOCOMPLETE_MAP: dict[str, str] = {
    "email": "email",
    "tel": "phone",
    "phone": "phone",
    "url": "website",
    "name": "name",
    "given-name": "first_name",
    "family-name": "last_name",
    "organization": "company",
    "organization-title": "position",
    "street-address": "address",
    "address-line1": "address",
    "address-line2": "address",
    "postal-code": "address",
}
# --- 追記ここまで ---

