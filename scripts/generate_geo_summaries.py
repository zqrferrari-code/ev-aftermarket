#!/usr/bin/env python3
"""
GEO Summary Generator
用法:
  python scripts/generate_geo_summaries.py --type=dtc|parts|problems|all
  python scripts/generate_geo_summaries.py --type=dtc --limit=100 --dry-run
  python scripts/generate_geo_summaries.py --concurrency=10
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from openai import AsyncOpenAI
from supabase import create_client, Client

# ── 配置 ──────────────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent.parent.parent / "ev-pipeline" / "llm-config.json"
SUPABASE_URL = "https://xerjbccayvqvaxbqrabu.supabase.co"
SUPABASE_KEY_PATH = Path(__file__).parent.parent / ".env.local"

MODEL = "pub-gpt-5.5"
SEMAPHORE_SIZE = 10  # 并发数，由 --concurrency 覆盖


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_supabase_key() -> str:
    for line in SUPABASE_KEY_PATH.read_text().splitlines():
        if line.startswith("SUPABASE_SERVICE_KEY="):
            return line.split("=", 1)[1].strip()
    raise ValueError("SUPABASE_SERVICE_KEY not found in .env.local")


# ── LLM 调用 ──────────────────────────────────────────────────────────────────

async def call_llm(client: AsyncOpenAI, prompt: str, max_tokens: int = 200) -> str:
    resp = await client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        timeout=60,
    )
    text = resp.choices[0].message.content
    if not text:
        raise ValueError("Empty response from model")
    return text.strip()


# ── DTC ───────────────────────────────────────────────────────────────────────

async def process_dtc_note(note: dict, sb: Client, client: AsyncOpenAI, sem: asyncio.Semaphore, dry_run: bool, counter: list):
    dtc = note["mf_nv_dtcs"]
    model = note["mf_nv_models"]

    # Parse likely_causes
    lc = note.get("likely_causes") or []
    if isinstance(lc, str):
        try:
            lc = json.loads(lc)
        except Exception:
            lc = []
    causes = " and ".join(lc[:2]) if lc else "various electrical or software faults"

    # Parse suggested_actions
    sa = note.get("suggested_actions") or []
    if isinstance(sa, list) and sa:
        action = sa[0].get("title", "visiting an authorised dealer") if isinstance(sa[0], dict) else "visiting an authorised dealer"
    else:
        action = "visiting an authorised dealer"

    # Get case count
    res = sb.from_("mf_nv_case_dtc_links").select("*", count="exact", head=True).eq("dtc_id", note["dtc_id"]).execute()
    case_count = res.count or 0

    prompt = f"""Write a 60-80 word plain English summary for a fault code page. Be factual and concise.

DTC code: {dtc['dtc_code']}
Vehicle: {model['model_name']}
Description: {dtc.get('description_en') or 'unknown'}
Severity: {dtc.get('severity') or 'unknown'}
Common causes: {causes}
First recommended action: {action}
Real cases recorded: {case_count}

Start with "The {dtc['dtc_code']} fault code on the {model['model_name']} indicates...". Include severity, 1-2 causes, and fix. If case_count > 0, mention typical repair cost data is available. Output only the paragraph, no headings."""

    async with sem:
        summary = await call_llm(client, prompt, max_tokens=200)

    if dry_run:
        print(f"[DRY RUN] {dtc['dtc_code']} — {model['model_name']}:\n{summary}\n")
    else:
        sb.from_("mf_nv_dtc_model_notes").update({"geo_summary": summary}).eq("id", note["id"]).execute()

    counter[0] += 1
    print(f"\r  Progress: {counter[0]} (latest: {dtc['dtc_code']} {model['model_name']})", end="", flush=True)


async def process_dtcs(sb: Client, client: AsyncOpenAI, limit: int, dry_run: bool, concurrency: int):
    sem = asyncio.Semaphore(concurrency)
    total = 0
    round_num = 0

    while True:
        round_num += 1
        fetch_limit = min(limit - total, 1000) if limit else 1000
        if fetch_limit <= 0:
            break

        print(f"\n📋 Fetching DTC notes (round {round_num})...")
        res = sb.from_("mf_nv_dtc_model_notes") \
            .select("id, dtc_id, model_id, likely_causes, suggested_actions, mf_nv_dtcs!inner(dtc_code, description_en, severity), mf_nv_models!inner(model_name)") \
            .is_("geo_summary", "null") \
            .limit(fetch_limit) \
            .execute()

        notes = res.data or []
        if not notes:
            break

        print(f"Found {len(notes)} notes to process")
        counter = [0]
        tasks = [process_dtc_note(n, sb, client, sem, dry_run, counter) for n in notes]
        await asyncio.gather(*tasks, return_exceptions=True)
        print()

        total += len(notes)
        if dry_run or len(notes) < fetch_limit:
            break

    print(f"\n✅ DTC: {total} processed")


# ── PARTS ─────────────────────────────────────────────────────────────────────

async def process_part(part: dict, sb: Client, client: AsyncOpenAI, sem: asyncio.Semaphore, dry_run: bool, counter: list):
    hs_res = sb.from_("mf_part_hs_codes").select("hs_code, description_en") \
        .eq("part_id", part["id"]).eq("country_code", "AU").eq("hs_code_type", "import").limit(1).execute()

    if not hs_res.data:
        return

    hs = hs_res.data[0]
    tariff_res = sb.from_("mf_tariff_rates").select("mfn_rate, fta_rate, fta_name, vat_rate") \
        .eq("country_code", "AU").eq("hs_code", hs["hs_code"]).limit(1).execute()
    tariff = tariff_res.data[0] if tariff_res.data else {}

    mfn = f"{tariff.get('mfn_rate', '5')}%"
    fta = f"{tariff.get('fta_rate', '0')}%"
    fta_name = tariff.get("fta_name") or "ChAFTA"
    gst = f"{tariff.get('vat_rate', '10')}%"

    fta_rate_num = float(tariff.get("fta_rate") or 0)
    gst_rate_num = float(tariff.get("vat_rate") or 10)
    cif = 230
    duty = round(cif * fta_rate_num / 100, 2)
    gst_val = round((cif + duty) * gst_rate_num / 100, 2)
    total = round(cif + duty + gst_val, 2)

    prompt = f"""Write a plain English import cost explanation for an EV part page. Australian audience, costs in AUD. Be specific with numbers.

Part: {part['name_en']}
AU HS Code: {hs['hs_code']}
HS Description: {hs.get('description_en') or 'EV replacement part'}
MFN duty rate: {mfn}
{fta_name} FTA rate (Chinese origin): {fta}
GST: {gst}

Example with $200 part + $30 shipping = CIF ${cif}:
- Duty at {fta_name} rate: ${duty}
- GST: ${gst_val}
- Total landed cost: ${total} AUD

Format as 3-4 bullet points listing the rates, then one sentence with the example calculation. Output only the content, no headings."""

    async with sem:
        summary = await call_llm(client, prompt, max_tokens=200)

    if dry_run:
        print(f"[DRY RUN] {part['name_en']}:\n{summary}\n")
    else:
        sb.from_("mf_parts").update({"geo_summary": summary}).eq("id", part["id"]).execute()

    counter[0] += 1
    print(f"\r  Progress: {counter[0]} ({part['name_en']})", end="", flush=True)


async def process_parts(sb: Client, client: AsyncOpenAI, limit: int, dry_run: bool, concurrency: int):
    sem = asyncio.Semaphore(concurrency)
    print("\n📋 Fetching parts without geo_summary...")
    res = sb.from_("mf_parts").select("id, name_en").is_("geo_summary", "null").limit(limit or 1000).execute()
    parts = res.data or []
    if not parts:
        print("Nothing to process.")
        return
    print(f"Found {len(parts)} parts")
    counter = [0]
    await asyncio.gather(*[process_part(p, sb, client, sem, dry_run, counter) for p in parts], return_exceptions=True)
    print(f"\n✅ Parts: {counter[0]} processed")


# ── MODELS (problems) ─────────────────────────────────────────────────────────

async def process_model(model: dict, sb: Client, client: AsyncOpenAI, sem: asyncio.Semaphore, dry_run: bool, counter: list):
    cases_res = sb.from_("mf_nv_cases").select("symptom_summary, cost_info") \
        .eq("model_id", model["model_id"]).eq("content_type", "problem") \
        .not_.is_("symptom_summary", "null").execute()
    cases = cases_res.data or []
    if not cases:
        return

    count_map: dict = {}
    for c in cases:
        key = (c["symptom_summary"] or "")[:60]
        if key not in count_map:
            count_map[key] = {"cost_info": c.get("cost_info"), "count": 0}
        count_map[key]["count"] += 1

    top = sorted(count_map.items(), key=lambda x: -x[1]["count"])[:5]
    top_list = "\n".join(
        f"{i+1}. {s[:80]}{' (cost: ' + v['cost_info'] + ')' if v['cost_info'] else ''} — {v['count']} report(s)"
        for i, (s, v) in enumerate(top)
    )

    prompt = f"""Write a top problems summary for a vehicle reliability page. Australian audience, costs in AUD. Use real data only.

Vehicle: {model['model_name']}
Total owner reports: {len(cases)}
Top reported problems:
{top_list}

Format as:
"Top reported problems for {model['model_name']} in Australia ({len(cases)} owner reports):"
Then a numbered list (max 5), each: brief problem description — N owner report(s), cost if available.
End with one sentence about where to find more detail.
Output only the content, no extra headings."""

    async with sem:
        summary = await call_llm(client, prompt, max_tokens=250)

    if dry_run:
        print(f"[DRY RUN] {model['model_name']}:\n{summary}\n")
    else:
        sb.from_("mf_nv_models").update({"geo_summary": summary}).eq("model_id", model["model_id"]).execute()

    counter[0] += 1
    print(f"\r  Progress: {counter[0]} ({model['model_name']})", end="", flush=True)


async def process_models(sb: Client, client: AsyncOpenAI, limit: int, dry_run: bool, concurrency: int):
    sem = asyncio.Semaphore(concurrency)
    print("\n📋 Fetching models without geo_summary...")
    res = sb.from_("mf_nv_models").select("model_id, model_name").is_("geo_summary", "null").limit(limit or 100).execute()
    models = res.data or []
    if not models:
        print("Nothing to process.")
        return
    print(f"Found {len(models)} models")
    counter = [0]
    await asyncio.gather(*[process_model(m, sb, client, sem, dry_run, counter) for m in models], return_exceptions=True)
    print(f"\n✅ Models: {counter[0]} processed")


# ── MAIN ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", default="all", choices=["dtc", "parts", "problems", "all"])
    parser.add_argument("--limit", type=int, default=0, help="0 = no limit")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--concurrency", type=int, default=SEMAPHORE_SIZE)
    args = parser.parse_args()

    config = load_config()
    key = load_supabase_key()

    llm = AsyncOpenAI(api_key=config["llm_api_key"], base_url=config["llm_base_url"])
    sb = create_client(SUPABASE_URL, key)

    print(f"🚀 GEO Summary Generator — type={args.type}, limit={args.limit or 'all'}, dry_run={args.dry_run}, concurrency={args.concurrency}, model={MODEL}\n")

    if args.type in ("dtc", "all"):
        await process_dtcs(sb, llm, args.limit, args.dry_run, args.concurrency)
    if args.type in ("parts", "all"):
        await process_parts(sb, llm, args.limit, args.dry_run, args.concurrency)
    if args.type in ("problems", "all"):
        await process_models(sb, llm, args.limit, args.dry_run, args.concurrency)

    print("\n✅ Done.")


if __name__ == "__main__":
    asyncio.run(main())
