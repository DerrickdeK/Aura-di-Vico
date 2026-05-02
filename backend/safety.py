"""Lightweight content-safety screener for student contributions.

Runs each submission through Claude Haiku (fast + cheap) before it ever
reaches the human moderation queue. Flags hate speech, slander, dangerous
instructions, explicit content and obvious vandalism.

The classifier is conservative on purpose — borderline content lands in the
``auto_blocked`` bucket where the admin can still rescue it manually.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("brera.safety")

MODEL_PROVIDER = "anthropic"
MODEL_NAME     = "claude-haiku-4-5-20251001"
MAX_TOKENS     = 200

VERDICT_OK     = "ok"
VERDICT_BLOCK  = "blocked"

SCREENING_PROMPT = """You are a content-safety classifier for a community
walking app for the historic Brera quarter of Milan. Students and curators
submit short narratives, fun-facts and dialogue prompts about real places.
Your job is to flag submissions that violate the project's social-cohesion
mission.

BLOCK if the submission contains any of:
- Hate speech, slurs, or attacks on a protected group (race, religion, gender, orientation, nationality)
- Slander or defamation against a named living person (false accusations, sexual rumours)
- Personal data of identifiable private individuals (home addresses, phone numbers, etc.)
- Explicit sexual content or graphic violence
- Instructions for illegal acts, self-harm, or harming others
- Spam, advertising, or promotional content unrelated to the place
- Obvious vandalism (gibberish, repeated characters, off-topic political propaganda)
- Language that incites neighbourly conflict or harassment

ALLOW (do NOT block) the following — they are part of the project's value:
- Personal memories, family anecdotes, opinions on the place itself
- Historical or cultural facts about the neighbourhood, even if unverified
- Critique of architecture, art, food, urban planning
- References to historical figures (Hemingway, Manzoni, Napoleon, etc.) or to past events
- Religious or political content presented as historical context (e.g. "this church was built in 1234")
- Italian, English, dialect, slang — language alone never disqualifies

OUTPUT FORMAT — return exactly one valid JSON object, nothing else:
{"verdict": "ok"} or {"verdict": "blocked", "reason": "<one short sentence in English explaining the category>"}

Be lenient with tone and creativity. Block only when a real harm is plausible.
"""


async def screen_contribution(
    *, kind: str, title: Optional[str], content: str, lang: str = "it",
) -> dict:
    """Return ``{'verdict': 'ok'}`` or ``{'verdict': 'blocked', 'reason': '...'}``.

    Soft-fails to ``ok`` when the safety service is unreachable — we'd rather
    let a contribution land in the human moderation queue than block silently.
    """
    api_key = (os.environ.get("EMERGENT_LLM_KEY") or "").strip()
    if not api_key:
        logger.info("Safety filter disabled (no EMERGENT_LLM_KEY) — passing through.")
        return {"verdict": VERDICT_OK}

    body = (
        f"TYPE: {kind}\n"
        f"LANGUAGE_HINT: {lang}\n"
        f"TITLE: {title or '(none)'}\n"
        f"CONTENT:\n{content.strip()}"
    )

    chat = LlmChat(
        api_key=api_key,
        session_id=f"safety-{kind}",
        system_message=SCREENING_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME).with_params(max_tokens=MAX_TOKENS)

    try:
        raw = await chat.send_message(UserMessage(text=body))
        raw = (raw or "").strip()
        # Strip Markdown code-fences if present
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw
            raw = raw.rsplit("\n```", 1)[0] if "```" in raw else raw
        data = json.loads(raw)
        verdict = data.get("verdict", VERDICT_OK)
        if verdict == VERDICT_BLOCK:
            return {"verdict": VERDICT_BLOCK, "reason": data.get("reason", "policy violation")}
        return {"verdict": VERDICT_OK}
    except Exception as err:
        logger.warning("Safety filter failed (passing through): %s", err)
        return {"verdict": VERDICT_OK}
