You are editing the repository `contact-form-agent`.

Goal: ensure `content-agent2` can correctly map split name fields and the `email_address` input on production forms.

Required changes
1. Update `content-agent2/form_filler/constants.py`.
   - In `CANDIDATES["first_name"]`, append a regex that captures both `name_mei` and `name-mei` (e.g. `r"name[_-]?mei"`). Do the same for `CANDIDATES["last_name"]` with `name[_-]?sei`.
   - Extend `CANDIDATES["email"]` with a dedicated `email[_-]?address` pattern so `email_address` is recognized even when the underscore biases scoring.
   - Mirror these additions in `STRONG_TOKENS`: add patterns for `name[_-]?mei`, `name[_-]?sei`, and `email[_-]?address` under the respective keys.
   - Add `"email_address"` to the `FILLABLE_KEYS` set so downstream code treats it as a valid email target.

2. Update `content-agent2/lexicon/base_synonyms.yml`.
   - Under `first_name`, append `name_mei`.
   - Under `last_name`, append `name_sei`.
   - Under `email`, append `email_address`.

3. After editing, run `python -m compileall form_filler` from inside `content-agent2` to make sure the module still compiles.

Commit the changes once the check passes.
