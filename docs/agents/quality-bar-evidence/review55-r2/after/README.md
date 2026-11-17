# Historical round-2 evidence

The deadline portions of this snapshot are superseded by the decision recorded in [quality-bar.md](../../../quality-bar.md): review-gate finding family: subprocess deadlines; simplified on 2026-11-17.

`audit-hang.txt`, `verify-row-timeout.txt`, `verify-row-timeout.json`, the matching records in `results-late.json` and `extra-results.json`, and the deadline sections in `probes-late.py` and `extra-probes.py` describe the removed per-subprocess timeout. `download-timeout-headers.txt` and `download-timeout-body.txt` and their probe/ledger entries used a removed test override. These historical deadline probes must not be used as evidence for the current implementation. Any `QUALITY_TIMEOUT_MS` environment values in this snapshot are obsolete and have no effect.

The scanner, typecheck, audit validation, CI writer refusal and concurrent-run isolation evidence remains applicable. CI step/job timeouts now bound subprocesses, local verification has no internal subprocess deadline, and the download retains a fixed 60-second in-process timeout.
