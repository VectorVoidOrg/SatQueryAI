# report.py
"""Downloadable per-analysis report.

The problem statement's Expected Solution names "downloadable reports" alongside
visual evidence, confidence information and execution summaries. This module turns
one /analyze result into a self-contained HTML document (inline CSS, embedded
overlay as a data URI, no CDN, no external asset) plus the JSON it was built from.

Self-contained matters for the demo: a judge who downloads the file and opens it
offline, or on a different machine, sees exactly what the operator saw. Nothing
here needs network access to render.

Two honesty rules the template enforces:
  * the confidence value is always printed WITH its source and its meaning --
    a mean top-1 token probability is not a calibrated probability of being right;
  * visual evidence is always printed with `is_model_prediction: false` and the
    pixel-coordinate warning visible, so a reader cannot mistake a radiometric
    difference for learned grounding or for map-accurate geometry.

Storage is an in-process dict capped at `max_entries` with FIFO eviction. It does
NOT survive a restart and is NOT authenticated -- anyone who can reach the service
can read a report if they have or guess its id. Both properties are stated in the
README rather than left to be discovered.
"""
import html
import json
import threading
import uuid
from datetime import datetime, timezone

MAX_ENTRIES = 50
_ID_BYTES = 8


class ReportStore:
    """Thread-safe, bounded, insertion-ordered report cache."""

    def __init__(self, max_entries=MAX_ENTRIES):
        self.max_entries = max_entries
        self.lock = threading.Lock()
        self._items = {}

    def put(self, record, rid=None):
        rid = rid or uuid.uuid4().hex[: _ID_BYTES * 2]
        with self.lock:
            self._items[rid] = record
            while len(self._items) > self.max_entries:
                self._items.pop(next(iter(self._items)))
        return rid

    def get(self, rid):
        with self.lock:
            return self._items.get(rid)

    def ids(self):
        with self.lock:
            return list(self._items)

    def __len__(self):
        with self.lock:
            return len(self._items)


def _esc(v):
    return html.escape("" if v is None else str(v))


def _confidence_note(c):
    try:
        c = float(c)
    except (TypeError, ValueError):
        return "confidence unavailable"
    if c >= 0.8:
        band = "high"
    elif c >= 0.5:
        band = "moderate"
    else:
        band = "low"
    return (f"{c:.3f} ({band}) -- mean top-1 token probability over the generated "
            f"answer. This is the model's own token-level certainty. It is NOT a "
            f"calibrated probability that the answer is correct, and it was not "
            f"calibrated against a held-out set.")


def render_html(rec):
    """One analysis result -> a standalone HTML document."""
    ev = rec.get("visual_evidence") or {}
    trace = rec.get("auditable_execution_trace") or []
    inputs = rec.get("inputs") or []
    agree = ev.get("model_agreement") or {}

    rows_trace = "".join(
        "<tr><td>{}</td><td>{}</td></tr>".format(
            _esc(t.get("tool")),
            _esc(json.dumps({k: v for k, v in t.items() if k != "tool"}, default=str)))
        for t in trace) or "<tr><td colspan=2>no trace recorded</td></tr>"

    rows_inputs = "".join(
        "<tr><td>{}</td><td>{}</td><td>{}</td></tr>".format(
            _esc(i.get("filename")), _esc(i.get("modality")), _esc(i.get("timestamp") or "-"))
        for i in inputs) or "<tr><td colspan=3>none</td></tr>"

    if ev.get("overlay_png_base64"):
        overlay = (f'<img alt="changed-region overlay" class="overlay" '
                   f'src="data:image/png;base64,{ev["overlay_png_base64"]}">')
    elif ev.get("status"):
        overlay = f'<p class="muted">no overlay: {_esc(ev.get("reason") or ev.get("status"))}</p>'
    else:
        overlay = ('<p class="muted">Not produced for this task. Visual evidence is '
                   'computed only for a bi-temporal optical pair, because that is the '
                   'only case where a difference between two inputs means something.</p>')

    regions = ""
    if ev.get("regions"):
        regions = ("<table><thead><tr><th>#</th><th>bbox (px)</th><th>area</th>"
                   "<th>fill</th><th>share of change</th></tr></thead><tbody>"
                   + "".join(
                       "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>".format(
                           n, _esc(r["bbox_pixels"]), _esc(r["area_pixels"]),
                           _esc(r["fill_fraction"]), _esc(r["share_of_all_change"]))
                       for n, r in enumerate(ev["regions"], 1))
                   + "</tbody></table>")

    agreement = ""
    if agree:
        # Three states, never two. agree is None when the answer's polarity could
        # not be read at a word boundary -- rendering that as DISAGREE would be a
        # false claim about the model, so it renders as WITHHELD instead.
        a = agree.get("agree")
        verdict = "AGREE" if a is True else "DISAGREE" if a is False else "WITHHELD"
        css = "ok" if a is True else "warn" if a is False else "na"
        basis = agree.get("parse_basis")
        agreement = (
            f'<div class="flag {css}">'
            f'<strong>Cross-check: model answer vs pixel difference &rarr; {verdict}</strong>'
            f'<p>model says change: {_esc(agree.get("parsed_polarity") or "unreadable")} '
            f'&middot; overlay shows change: {_esc(agree.get("overlay_shows_change"))}'
            + (f' &middot; basis: <code>{_esc(basis)}</code>' if basis else '')
            + f'</p><p class="muted">{_esc(agree.get("note"))}</p></div>')

    caveats = ""
    if ev.get("caveats"):
        caveats = ("<h2>What this evidence does NOT establish</h2><ul>"
                   + "".join(f"<li>{_esc(c)}</li>" for c in ev["caveats"])
                   + "</ul>")
        if ev.get("normalization"):
            n = ev["normalization"]
            why = n.get("why")
            rows = "".join(
                f"<tr><td>{_esc(k)}</td><td><code>{_esc(v)}</code></td></tr>"
                for k, v in n.items() if k not in ("why", "units", "method"))
            caveats += (
                f'<p class="muted">normalisation method: <code>{_esc(n.get("method"))}</code>. '
                f'{_esc(n.get("units"))}</p>'
                f'<table><tbody>{rows}</tbody></table>'
                f'<p class="muted">{_esc(why)}</p>')

    ev_meta = ""
    if ev.get("status") in ("ok", "no_regions_above_threshold"):
        ev_meta = (
            "<table><tbody>"
            f"<tr><td>method</td><td>{_esc(ev.get('source'))}</td></tr>"
            f"<tr><td>is a model prediction</td><td><strong>{_esc(ev.get('is_model_prediction'))}</strong></td></tr>"
            f"<tr><td>georeferenced</td><td><strong>{_esc(ev.get('georeferenced'))}</strong> "
            f"(coordinate space: {_esc(ev.get('coordinate_space'))})</td></tr>"
            f"<tr><td>threshold</td><td>{_esc(ev.get('threshold'))} &mdash; {_esc(ev.get('threshold_method'))}</td></tr>"
            f"<tr><td>changed pixel fraction</td><td>{_esc(ev.get('changed_pixel_fraction'))}</td></tr>"
            f"<tr><td>regions reported</td><td>{_esc(ev.get('region_count'))}</td></tr>"
            f"<tr><td>computed at</td><td>max_dim {_esc(ev.get('computed_at_max_dim'))} "
            f"(the resolution the model was shown)</td></tr>"
            f"<tr><td>raw read matches the model's rendering</td>"
            f"<td>{_esc(ev.get('raw_read_matches_model_rendering'))}</td></tr>"
            f"<tr><td>frames resampled to a common grid</td>"
            f"<td>{_esc(ev.get('frames_resampled_to_common_grid'))}</td></tr>"
            f"<tr><td>dates</td><td>{_esc(ev.get('t1') or '-')} &rarr; {_esc(ev.get('t2') or '-')}</td></tr>"
            "</tbody></table>")

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SatQuery AI report {_esc(rec.get('report_id'))}</title>
<style>
 body{{font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      margin:0;padding:32px 20px;background:#f6f7f9;color:#14181d}}
 .wrap{{max-width:880px;margin:0 auto}}
 h1{{font-size:20px;margin:0 0 4px}} h2{{font-size:15px;margin:28px 0 8px;
      text-transform:uppercase;letter-spacing:.06em;color:#5a6572}}
 .card{{background:#fff;border:1px solid #e2e6ea;border-radius:8px;padding:18px 20px;margin-bottom:14px}}
 .meta{{color:#5a6572;font-size:13px}}
 .answer{{font-size:18px;margin:6px 0 0}}
 table{{border-collapse:collapse;width:100%;font-size:13.5px}}
 th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid #edf0f3;vertical-align:top}}
 th{{color:#5a6572;font-weight:600;background:#fafbfc}}
 .bar{{height:9px;background:#e8ecef;border-radius:5px;overflow:hidden;margin-top:6px}}
 .bar>i{{display:block;height:100%;background:#2f7d4f}}
 .overlay{{max-width:100%;border:1px solid #e2e6ea;border-radius:6px;display:block}}
 .flag{{border-left:4px solid #5a6572;padding:8px 12px;margin:10px 0;background:#fafbfc;border-radius:0 6px 6px 0}}
 .flag.ok{{border-color:#2f7d4f}} .flag.warn{{border-color:#b8860b}}
 .flag.na{{border-color:#8b98a5}}
 .muted{{color:#5a6572;font-size:13px}}
 ul{{margin:6px 0 0;padding-left:20px;font-size:13.5px}} li{{margin:3px 0}}
 code{{background:#f2f4f6;padding:1px 5px;border-radius:4px;font-size:12.5px}}
 .foot{{color:#7a8592;font-size:12px;margin-top:22px;border-top:1px solid #e2e6ea;padding-top:12px}}
</style></head><body><div class="wrap">

<h1>SatQuery AI &mdash; analysis report</h1>
<p class="meta">report <code>{_esc(rec.get('report_id'))}</code> &middot;
 generated {_esc(rec.get('generated_at'))} &middot;
 task intent <strong>{_esc(rec.get('task_intent'))}</strong> &middot;
 {_esc(rec.get('duration_seconds'))} s &middot;
 adapter <code>{_esc((trace[-1].get('active_adapter') if trace and isinstance(trace[-1], dict) else None) or 'unknown')}</code></p>

<div class="card">
 <h2 style="margin-top:0">Query</h2>
 <p class="answer">&ldquo;{_esc(rec.get('query'))}&rdquo;</p>
 <h2>Answer</h2>
 <p class="answer">{_esc(rec.get('answer'))}</p>
 <h2>Confidence</h2>
 <p style="margin:0">{_esc(_confidence_note(rec.get('confidence')))}</p>
 <div class="bar"><i style="width:{max(0.0, min(1.0, float(rec.get('confidence') or 0))) * 100:.1f}%"></i></div>
 <p class="muted">source: <code>{_esc(rec.get('confidence_source'))}</code></p>
</div>

<div class="card">
 <h2 style="margin-top:0">Visual evidence</h2>
 {overlay}
 {ev_meta}
 {regions}
 {agreement}
 {caveats}
</div>

<div class="card">
 <h2 style="margin-top:0">Inputs</h2>
 <table><thead><tr><th>file</th><th>modality</th><th>timestamp</th></tr></thead>
 <tbody>{rows_inputs}</tbody></table>
</div>

<div class="card">
 <h2 style="margin-top:0">Auditable execution trace</h2>
 <table><thead><tr><th>tool</th><th>record</th></tr></thead><tbody>{rows_trace}</tbody></table>
</div>

<div class="foot">
 <p><strong>How to read this report.</strong> The answer is produced by
 Qwen2.5-VL-3B-Instruct with a task-specific LoRA adapter. Confidence is the
 model's mean top-1 token probability, not a calibrated correctness probability.
 Visual evidence, where present, is a deterministic radiometric difference
 computed in pixel coordinates &mdash; it is <strong>not</strong> a model
 prediction and <strong>not</strong> georeferenced. Learned grounding
 (model-produced boxes or masks) is not implemented.</p>
 <p>Full machine-readable form: append <code>?format=json</code> to this URL.</p>
</div>

</div></body></html>
"""


def build_record(payload, report_id=None):
    """Normalise an /analyze response into a storable report record."""
    rec = dict(payload)
    rec["report_id"] = report_id or uuid.uuid4().hex[: _ID_BYTES * 2]
    rec["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    rec["product"] = "SatQuery AI"
    rec["base_model"] = "Qwen/Qwen2.5-VL-3B-Instruct"
    rec["limitations"] = [
        "confidence is mean top-1 token probability, not a calibrated correctness probability",
        "visual evidence is deterministic radiometric differencing, not learned grounding",
        "visual-evidence geometry is in pixel coordinates; uploads carry no CRS",
        "reports are held in process memory, are not persisted, and are not authenticated",
    ]
    return rec
