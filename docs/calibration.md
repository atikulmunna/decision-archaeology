# Calibration

Calibration asks a simple question: when you said 70%, did it happen about 70% of the time? See Rowan's numbers on the [demo calibration page](https://decision-archaeology.vercel.app/demo/calibration).

Back to the [README](../README.md), or see the [case study](https://decision-archaeology.vercel.app/how-it-works).

## Forecasts

A decision can carry up to three forecasts. Each is a yes or no statement with a probability from 5% to 95% in steps of 5, and a date to resolve it by. Forecasts are sealed with the decision (`da-seal-v2`), so they cannot be adjusted after the fact. Once the date has passed, each one is resolved as Happened, Didn't happen, or Can't tell. Can't tell is left out of every score.

## The Brier score

The score is the mean, over the resolved forecasts, of `(p - o)²`, where `p` is the stated probability and `o` is 1 if it happened and 0 if it did not.

- 0 is perfect; always answering 50% scores 0.25; confident and wrong approaches 1.
- The score appears once five forecasts are scored, and a domain gets its own score at three.

The maths lives in `src/lib/forecasting.ts`, a pure module that also runs in the browser.

## Reliability bands

Forecasts are grouped by stated probability into ten bands: 5% alone, then 10% and 15%, and so on up to 90% and 95%. Each band compares the mean stated probability with the share that came true, which draws the reliability curve. A short finding sums it up in plain words, for example that confident forecasts came true less often than stated.

## The older measure

Before forecasts existed, calibration came from outcome ratings alone. It is still shown, labelled "Outcome alignment (older measure)":

- aligned: as expected, slightly better, or slightly worse;
- misaligned: much better or much worse;
- too early to tell is left out;
- the score is aligned divided by aligned plus misaligned, as a percentage.

It says whether outcomes matched expectations, not whether the stated confidence was right, which is why forecasts replaced it as the main measure.
