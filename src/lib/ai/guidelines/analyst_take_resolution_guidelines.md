# Take Resolution Guidelines — Sports Analyst Takes

## Step 1 — Identify Time Horizon from Language

| Language in Take | Time Horizon |
|---|---|
| "this week", "Sunday", "tonight", "in this game" | `immediate` |
| "this season", "this year", "in 2026", "down the stretch" | `this_season` |
| "next season", "going forward", "in the next few years" | `multi_year` |
| "never", "ever", "GOAT", "greatest", "in his career" | `career` |
| "by [future year]", "in the next X years" | `multi_year` |
| "if [condition]", "when [event] happens" | `event_based` |

---

## Step 2 — Resolution Dates by Sport & Horizon

### NFL
| Horizon | Resolution Date | Notes |
|---|---|---|
| Immediate | End of that game week | Monday night for MNF games |
| This season | **Feb 1** (year+1) | Day after Super Bowl |
| Offseason / roster / draft | **Sep 1** | Roster cutdown day |
| Multi-year | End of contract or referenced year | |
| Career | Age-based (see Step 3) | |

### NBA
| Horizon | Resolution Date | Notes |
|---|---|---|
| Immediate | End of that game night | |
| This season | **Jun 30** | After NBA Finals |
| Multi-year | End of contract or referenced year | |
| Career | Age-based | |

### MLB
| Horizon | Resolution Date | Notes |
|---|---|---|
| Immediate | End of that game | |
| This season | **Nov 1** | After World Series |
| Multi-year | End of contract or referenced year | |
| Career | Age-based | |

### NHL
| Horizon | Resolution Date | Notes |
|---|---|---|
| This season | **Jul 1** | After Stanley Cup |
| Career | Age-based | |

---

## Step 3 — Career Takes: Age-Based Estimation

| Player Age | Estimated Career End | Years to Add |
|---|---|---|
| 20–25 | ~35–37 | +10–15 years |
| 26–29 | ~34–36 | +7–10 years |
| 30–32 | ~35–37 | +3–6 years |
| 33+ | ~36–38 | +1–4 years |

### Position Adjustments (NFL)
- QB: extend to ~38–40 (high variance, Brady effect)
- RB: cap at ~31–32 (high wear)
- WR/TE: through ~34–36
- Defensive players: through ~32–34

### Position Adjustments (NBA)
- Guards/wings: through ~36–38
- Bigs/centers: through ~33–35

---

## Step 4 — Edge Cases

**Contradicted early** — if clearly proven wrong before resolution (injury, trade, firing), grade it immediately and note the early resolution date.

**Conditional takes** — resolve when the condition triggers, or end of season if it never does.

**Vague with no time reference** — default to `this_season`. Shorter is better; you can extend.

**Coach/GM/front office takes** — resolve at end of current season or when the personnel decision is made, whichever comes first.

---

## Quick Decision Tree

```
Specific game or matchup mentioned?
  → immediate: end of that game week

"This season" / specific current year?
  → this_season: end of league season (Feb 1 NFL, Jun 30 NBA, Nov 1 MLB, Jul 1 NHL)

Offseason roster/draft/trade take?
  → Sep 1 (NFL) or start of referenced season

Future year or "next season"?
  → multi_year: end of that future season

"Never" / "career" / "GOAT" language?
  → career: age-based estimate

None of the above?
  → default to this_season
```
