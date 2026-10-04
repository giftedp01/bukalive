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
