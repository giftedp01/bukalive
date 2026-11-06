<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Destinations/businesses/listings are DB tables keyed by slug; events.destination_id stores the destination slug. Why: global taxonomy, no hard-coded geography.
- Demo rows carry is_sample=true and must show a Sample badge; verification_status only changes via admin (trigger). Why: trust.
- Ask Buka AI calls run server-side in src/lib/buka-ai.functions.ts via the Lovable AI Gateway (responses surface, JSON-only reply); the page falls back to local keyword matching when the AI call fails. Why: the gateway key is server-only and the page must degrade gracefully.

- Experience translations are generated server-side in src/lib/translate.functions.ts and cached in event_translations keyed by event+language, invalidated by events.updated_at. Why: avoid repeat AI cost and keep writes service-role only.
