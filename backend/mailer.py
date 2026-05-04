"""Transactional email via Resend. Falls back to logging when no API key is
set (so development/preview environments never leak emails).

All entry points are async-safe — the Resend SDK is synchronous, so we wrap
it with ``asyncio.to_thread`` to keep the FastAPI event loop non-blocking.
"""
from __future__ import annotations

import asyncio
import logging
import os

import resend

logger = logging.getLogger("aura.mailer")

# ---------------------------------------------------------------------------
# HTML templates (inline CSS, table layout — email clients are fragile)
# ---------------------------------------------------------------------------
_BRAND = "#BD5745"
_BG    = "#F5F1E8"
_TXT   = "#1A1A18"


def _area_labels(lang: str) -> tuple[str, str, str]:
    """Return (brand, area, city) in the requested language, with safe fallbacks.
    Reads from the active area.config.json so emails follow the current city."""
    try:
        from area_config import load_area
        cfg = load_area()
        def pick(key: str, default: str) -> str:
            v = cfg.get(key)
            if isinstance(v, dict):
                return v.get(lang) or v.get("en") or default
            return v or default
        return (
            pick("brand", "Aura"),
            pick("area", "Aura"),
            pick("city", ""),
        )
    except Exception:
        return ("Aura", "Aura", "")


def _shell(title: str, body_html: str, lang: str) -> str:
    brand, area, city = _area_labels(lang)
    year_line = f"{brand} · {city}" if city else brand
    return f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><title>{title}</title></head>
<body style="margin:0;padding:0;background:{_BG};font-family:Georgia,serif;color:{_TXT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0"
           style="max-width:560px;background:#FFFFFF;border:1px solid #E6DFD0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <p style="margin:0;color:{_BRAND};letter-spacing:0.14em;font-size:12px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;">
          {year_line}
        </p>
        <h1 style="margin:10px 0 0 0;font-size:28px;line-height:1.15;color:{_TXT};font-weight:400;">{title}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 28px 32px;font-size:16px;line-height:1.55;color:#3B3B35;">
        {body_html}
      </td></tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:11px;color:#8A877A;letter-spacing:0.12em;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;">
      {year_line}
    </p>
  </td></tr>
</table>
</body></html>"""


def password_reset_email(reset_url: str, lang: str = "it") -> tuple[str, str]:
    """Return (subject, html) for a password-reset email."""
    brand, _area, _city = _area_labels(lang)
    if lang == "it":
        subject = f"Reimposta la tua password · {brand}"
        body = f"""
        <p>Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account.</p>
        <p>Clicca sul pulsante qui sotto per sceglierne una nuova. Il link è valido per <strong>un'ora</strong>.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="{reset_url}"
             style="display:inline-block;background:{_BRAND};color:#FFFFFF;text-decoration:none;
                    padding:14px 28px;border-radius:28px;font-family:Helvetica,Arial,sans-serif;
                    font-size:14px;letter-spacing:0.06em;">Reimposta la password</a>
        </p>
        <p style="font-size:13px;color:#8A877A;">Se non hai richiesto questa modifica, ignora pure questa email —
        nessuna azione sarà intrapresa sul tuo account.</p>
        <p style="font-size:12px;color:#8A877A;word-break:break-all;">Link diretto: <a href="{reset_url}" style="color:{_BRAND};">{reset_url}</a></p>
        """
        return subject, _shell("Reimposta la password", body, lang)

    subject = f"Reset your password · {brand}"
    body = f"""
    <p>We received a request to reset the password on your account.</p>
    <p>Click the button below to choose a new one. The link is valid for <strong>one hour</strong>.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{reset_url}"
         style="display:inline-block;background:{_BRAND};color:#FFFFFF;text-decoration:none;
                padding:14px 28px;border-radius:28px;font-family:Helvetica,Arial,sans-serif;
                font-size:14px;letter-spacing:0.06em;">Reset password</a>
    </p>
    <p style="font-size:13px;color:#8A877A;">If you didn't request this change, feel free to ignore this email —
    no action will be taken on your account.</p>
    <p style="font-size:12px;color:#8A877A;word-break:break-all;">Direct link: <a href="{reset_url}" style="color:{_BRAND};">{reset_url}</a></p>
    """
    return subject, _shell("Reset your password", body, lang)


def contribution_moderated_email(user_name: str, status: str, poi_name: str,
                                 note: str | None, lang: str = "it") -> tuple[str, str]:
    _brand, area, _city = _area_labels(lang)
    if lang == "it":
        verb = "è stato pubblicato" if status == "approved" else "non è stato pubblicato"
        subject = f"Il tuo contributo su {poi_name} {verb}"
        ok = status == "approved"
        line = (f"Grazie, il tuo sussurro è ora tra quelli che {area} racconterà ai prossimi camminatori."
                if ok else
                "Abbiamo deciso di non pubblicarlo questa volta. Puoi inviarne un altro quando vuoi.")
    else:
        subject = f"Your contribution about {poi_name} has been {'approved' if status == 'approved' else 'not used'}"
        ok = status == "approved"
        line = (f"Thank you — your whisper now joins the ones {area} will tell to future walkers."
                if ok else
                "We've chosen not to publish this one this time. You're welcome to submit another whenever you like.")

    note_html = f"<blockquote style='margin:16px 0;padding:12px 16px;background:#F5F1E8;border-left:3px solid {_BRAND};color:#3B3B35;'>{note}</blockquote>" if note else ""
    body = f"<p>Ciao {user_name or ''},</p><p>{line}</p>{note_html}"
    return subject, _shell(subject, body, lang)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
async def send_email(to: str, subject: str, html: str) -> dict:
    """Send an email via Resend or, in dev/preview, log it instead.

    Never raises — email failures must not break the API request they came
    from (especially password-reset, which is always returned as 200 OK to
    prevent user enumeration).
    """
    api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    sender  = (os.environ.get("SENDER_EMAIL")   or "").strip()

    if not api_key or not sender:
        logger.info("[EMAIL DEV MODE] to=%s  subject=%s  (no RESEND_API_KEY set — skipping real send)",
                    to, subject)
        return {"status": "dev_logged"}

    resend.api_key = api_key
    params = {"from": sender, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("[EMAIL SENT] to=%s  id=%s", to, (result or {}).get("id"))
        return {"status": "sent", "id": (result or {}).get("id")}
    except Exception as err:  # Any network / auth / rate-limit issue
        logger.error("[EMAIL FAILED] to=%s  err=%s", to, err)
        return {"status": "failed", "error": str(err)}
