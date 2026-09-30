# Status — pliamem-public (archive / pointer)

**Updated:** 2026-09-30 (PT)  
**Role of this repo:** Public **near-mirror / showcase twin** of the private recall router.  
**Canonical product tree:** [`jmiaie/pliamem`](https://github.com/jmiaie/pliamem) (private).

## Do not treat this twin as source of truth

| Concern | Where it lives |
|---|---|
| Active development / STATUS decisions | **`jmiaie/pliamem`** (private) |
| This public twin | Snapshot / portfolio pointer — expect **drift**; do not dual-maintain features here |
| Memory **product** SKU (vector / brain) | **`jmiaie/ompa`** (public) — not this repo |

## Relationship to OMPA (same decision as private STATUS)

- **pliamem** = multi-source **recall / routing** microservice + CLI (adapters over existing stores).
- **OMPA** = **vector / brain memory** product SKU.
- Repos are **related / legacy companions**, **not** merge candidates and **not** renames of each other.

Full wording and SKU guidance: see `STATUS.md` on [`jmiaie/pliamem`](https://github.com/jmiaie/pliamem) after the 2026-09-30 hygiene merge.

## Honesty notes for this twin

- README / badges here may still advertise npm/PyPI v1.0.0 — **verify publish state before citing**.
- Prefer linking portfolio readers to **private pliamem** (if they have access) or to **OMPA** for the memory-SKU story.
- Archiving this twin remains an acceptable outcome if dual maintenance is unwanted.

## Next (owner)

1. Keep as read-mostly pointer **or** archive — avoid silent feature drift vs private.
2. Any doc/code changes that matter belong on **`jmiaie/pliamem`** first, then optional public sync.
