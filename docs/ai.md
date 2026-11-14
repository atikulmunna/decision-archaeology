# AI pipelines

All AI in Decision Archaeology goes through one client and one router. The demo shows both uses: a [pattern report](https://decision-archaeology.vercel.app/demo/reports) and the Devil's Advocate questions on several of Rowan's decisions.

Back to the [README](../README.md), or see the [case study](https://decision-archaeology.vercel.app/how-it-works).

## The client

`generateStructured` in `src/lib/ai.ts` is the only way the app calls a model.

- **Routing.** Every request goes to OpenRouter's Auto Router (`openrouter/auto`), which picks a model per request. `require_parameters` keeps it to models that honour structured outputs, and `OPENROUTER_ALLOWED_MODELS` can narrow the choice further.
- **Schemas.** The caller passes a Zod schema. It is converted to the strict JSON Schema subset that structured outputs accept and sent as the response format.
- **Validation and repair.** The reply is parsed and validated again with Zod. If it does not match, the call retries once with the validation problems attached. A second failure is an error.
- **Cost tiers.** Each call names a tier (low, medium or high) that steers the router; `OPENROUTER_COST_TIER` sets the default.
- **Deadlines.** Each request has a timeout. A caller can instead set one overall deadline that the repair shares.
- **Credit.** The result carries the model that actually answered, and the app shows it.

## Pattern reports

`src/lib/ai-pipeline.ts` runs four schema-typed passes over 10 to 60 decisions: assumptions in parallel batches of 20 (low tier), then biases (medium) alongside calibration (low), then a synthesis (high). Reports run as a QStash job, so a slow model never holds a request open. The demo report was generated once by the live pipeline with `npm run demo:report`, over demo data only.

## The Devil's Advocate

Before a decision is sealed, the app can ask a few pointed questions about it.

- It is ask-first: you choose to take the step, skip it, or it reports that it is unavailable.
- `POST /api/decisions/[id]/challenge` is the only writer of questions, once per draft, with a 20 second deadline and a limit of 20 calls per user per rolling day.
- It claims the draft with a conditional write, so nothing is ever written onto a decision that sealed in the meantime.
- The outcome, the model and the questions are sealed in `da-seal-v3`; your answers autosave with the draft.

## When it fails

A report whose pipeline fails is marked `FAILED`, and the failure is logged on the server. A failed or slow Devil's Advocate call records the step as unavailable and never blocks sealing.
