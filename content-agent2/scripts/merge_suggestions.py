#!/usr/bin/env python3
import csv
import sys
from collections import Counter, defaultdict

"""
簡易マージツール: lexicon/suggestions.csv から頻出トークンを集計し、
キーごとの候補語リストを標準出力に YAML 風で出す（手動で確認して採用する）。
使い方: python scripts/merge_suggestions.py lexicon/suggestions.csv > lexicon/proposed_synonyms.yml
"""

def main(path: str):
    by_key = defaultdict(list)
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row.get('target_key') or ''
            text = (row.get('extracted_text') or '').strip()
            name = (row.get('name') or '').strip()
            if not key:
                continue
            token = text or name
            if not token:
                continue
            by_key[key].append(token)

    for key, toks in by_key.items():
        cnt = Counter(toks)
        common = [t for t, c in cnt.most_common(20)]
        print(f"{key}:")
        for t in common:
            print(f"  - {t}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: merge_suggestions.py lexicon/suggestions.csv", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])


