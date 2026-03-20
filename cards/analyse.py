import os
import json
import anthropic
import re

CLIENT = None


def get_client():
    global CLIENT
    if CLIENT is None:
        CLIENT = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))
    return CLIENT


SYSTEM_PROMPT = """You analyse short text inputs and classify them.
Respond with a JSON object only — no prose around it.

Types:
- note: general thoughts, observations
- quote: quotes from people (often with em-dash at the end)
- book: book references
- link: URLs or web finds
- fact: isolated facts, numbers, data

JSON schema:
{
  "card_type": "note|quote|book|link|fact",
  "source": "extracted source or empty string",
  "meta": {}
}"""


VALID_TYPES = {'note', 'quote', 'book', 'link', 'fact'}


def analyse_card(content: str) -> dict:
    if not content.strip():
        return {'card_type': 'note', 'source': '', 'meta': {}}

    try:
        client = get_client()
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': content}],
        )
        raw = message.content[0].text.strip()
        raw = re.sub(r'^```json?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        result = json.loads(raw)
        if result.get('card_type') not in VALID_TYPES:
            result['card_type'] = 'note'
        return result
    except Exception as e:
        print(f'[analyse] error: {e}')
        return {'card_type': 'note', 'source': '', 'meta': {}}