# The seal

Every save rebuilds a decision's seal, and the seal becomes final when the five-minute edit window closes. The seal is a SHA-256 fingerprint of everything that locked, and anyone can recompute it in the browser. Try it in the [case study](https://decision-archaeology.vercel.app/how-it-works) or on [DA-0007 in the demo](https://decision-archaeology.vercel.app/demo/decisions/demo-0007?view=then).

Back to the [README](../README.md).

## The canonical payload

`src/lib/seal.ts` turns a record into one exact string:

- every field that locks, in a fixed key order, as pretty-printed JSON with no trailing newline;
- text normalised to Unicode NFC, with CRLF and lone CR line endings turned into LF, so the same words always give the same bytes;
- dates as ISO strings in UTC.

The hash is the SHA-256 of that string's UTF-8 bytes, computed with Web Crypto and written as lowercase hex. The same module runs on the server, which stores the hash at sealing, and in the browser, which recomputes it when you press Verify.

## Four versions

| Version | Used when | Adds |
| --- | --- | --- |
| `da-seal-v1` | Always the base | Every locked field |
| `da-seal-v2` | The record has forecasts | The forecasts: statement, probability, resolve-by date |
| `da-seal-v3` | The Devil's Advocate step was taken | Its outcome and model, and the questions and your answers when they were asked |
| `da-seal-v4` | The record has a letter | The letter's opening day and the SHA-256 of its text, never the text |

A record uses the newest version whose field it has. A record without the newer fields keeps producing the older payload byte for byte, so no existing seal ever stops verifying. Fixed hashes for each version are pinned in the test suite.

## In the browser

The seal panel shows the stored hash, recomputes it on Verify, and can show or download the exact payload. In the demo, a checkbox changes one word of the reasoning in your browser only, so you can watch Verify fail.

## Corrections, imports and older records

- After sealing, only typo corrections are possible, and only through an audited request. The seal keeps covering the original text, and the panel says how many corrections were approved since.
- Imported records are never sealed, because their history cannot be vouched for.
- Records finalised before seals existed were sealed retroactively by `npm run seal:backfill`. The panel says so: such a seal covers the content as it was on the day of the backfill.

## What a seal does not prove

A seal shows that the record matches the hash stored when it was sealed. It does not prove when that hash was stored to anyone outside the app, because there is no external timestamping, and a party with write access to the database could replace both a record and its hash. Outcomes, field notes, assumption reviews and comments are not sealed; they are meant to grow after the decision.
