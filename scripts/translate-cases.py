#!/usr/bin/env python3
"""
批量翻译 mf_nv_cases 表中的中文内容

流程：
1. 为 cases 表新增 _cn 备份列（幂等）
2. 从 DB 读取含中文的行（symptom_summary_cn IS NULL 过滤，幂等）
3. 用 pub-kimi-k2.6 翻译中文 → 英文草稿
4. 用 pub-deepseek-v4-pro 校验、去 AI 味、修正歧义
5. 将最终英文写回 DB，原始中文写入 _cn 备份列
6. 内置翻译缓存（相同原文复用，减少 LLM 调用）

用法：
  python scripts/translate-cases.py
  python scripts/translate-cases.py --limit 20 --dry-run
"""

import argparse
import asyncio
import json
import re
from pathlib import Path

import aiomysql
from openai import AsyncOpenAI

# ── 配置 ──────────────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent.parent.parent / "ev-pipeline" / "llm-config.json"
ENV_PATH = Path(__file__).parent.parent / ".env.local"

TRANSLATOR_MODEL = "pub-kimi-k2.5"
REVIEWER_MODEL = "pub-kimi-k2.5"
CONCURRENCY = 30
LOG_FILE = Path(__file__).parent / "translate-cases-log.jsonl"

CN_PATTERN = re.compile(r"[\u4e00-\u9fff]")


def load_config() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"LiteLLM config not found: {CONFIG_PATH}")


def load_env() -> dict:
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def parse_db_url(url: str) -> dict:
    rest = url[len("mysql://"):]
    at_idx = rest.rfind("@")
    userinfo = rest[:at_idx]
    hostinfo = rest[at_idx + 1:]
    colon_idx = userinfo.index(":")
    user = userinfo[:colon_idx]
    password = userinfo[colon_idx + 1:]
    m = re.match(r"([^:]+):(\d+)/(.+)", hostinfo)
    if not m:
        raise ValueError(f"Cannot parse DATABASE_URL host: {hostinfo}")
    return dict(user=user, password=password, host=m[1], port=int(m[2]), db=m[3])


def has_chinese(val) -> bool:
    if not val:
        return False
    return bool(CN_PATTERN.search(str(val)))


def log_entry(entry: dict):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── AI 调用 ───────────────────────────────────────────────────────────────────

async def translate(client: AsyncOpenAI, chinese_text: str, context: str) -> str:
    resp = await client.chat.completions.create(
        model=TRANSLATOR_MODEL,
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional automotive technical translator. "
                    "Translate Chinese EV owner case reports into clear, natural British English "
                    "for Australian car owners.\n\n"
                    "Rules:\n"
                    "- Keep technical terms (DTC codes, part names, tool names) in standard English form\n"
                    "- Use active voice: 'Replaced the sensor', not 'The sensor was replaced'\n"
                    "- Preserve all specific values (voltages, costs, part numbers, km readings)\n"
                    "- Do NOT add commentary not in the original\n"
                    "- Do NOT use: 'Please note', 'It is worth mentioning', 'In conclusion'\n"
                    "- Output ONLY the translated text, no preamble"
                ),
            },
            {
                "role": "user",
                "content": f"Context: {context}\n\nTranslate to English:\n\n{chinese_text}",
            },
        ],
    )
    return resp.choices[0].message.content.strip()


async def review(client: AsyncOpenAI, chinese: str, english_draft: str, context: str) -> str:
    resp = await client.chat.completions.create(
        model=REVIEWER_MODEL,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a bilingual automotive technical editor reviewing an English translation "
                    "of a Chinese EV owner case report.\n\n"
                    "Your job:\n"
                    "1. Compare the English draft against the Chinese original for accuracy\n"
                    "2. Fix any mistranslations, omissions, or ambiguities\n"
                    "3. Remove AI-flavoured phrases: 'It is important to note', 'Please ensure', "
                    "'It should be noted', 'In order to'\n"
                    "4. Replace passive voice with active voice where natural\n"
                    "5. Preserve specific values (costs, km, part numbers) exactly\n"
                    "6. Tone: direct, factual — owner forum post, not a chatbot\n\n"
                    "Output ONLY the final corrected English. No commentary."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Context: {context}\n\n"
                    f"CHINESE ORIGINAL:\n{chinese}\n\n"
                    f"ENGLISH DRAFT:\n{english_draft}\n\n"
                    "Output the final corrected English:"
                ),
            },
        ],
    )
    return resp.choices[0].message.content.strip()


async def translate_field(client: AsyncOpenAI, chinese: str, context: str, cache: dict) -> str:
    if chinese in cache:
        return cache[chinese]
    draft = await translate(client, chinese, context)
    final = await review(client, chinese, draft, context)
    cache[chinese] = final
    return final


# ── DB 操作 ───────────────────────────────────────────────────────────────────

async def add_backup_columns(conn):
    print("Adding backup columns if not exist...")
    columns = [
        ("mf_nv_cases", "symptom_summary_cn", "TEXT"),
        ("mf_nv_cases", "resolution_cn", "TEXT"),
        ("mf_nv_cases", "vehicle_desc_cn", "TEXT"),
        ("mf_nv_cases", "cost_info_cn", "TEXT"),
    ]
    async with conn.cursor() as cur:
        for table, column, col_type in columns:
            await cur.execute(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                (table, column),
            )
            if await cur.fetchone():
                print(f"  ─ {table}.{column} already exists")
            else:
                await cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                print(f"  ✓ added {table}.{column}")
    await conn.commit()


async def translate_cases_table(conn, client: AsyncOpenAI, limit: int, dry_run: bool, sem: asyncio.Semaphore):
    print("\n── mf_nv_cases ─────────────────────────────────────")
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"""
            SELECT case_id, model_id, content_type,
                   symptom_summary, resolution, vehicle_desc, cost_info
            FROM mf_nv_cases
            WHERE symptom_summary_cn IS NULL
              AND (
                symptom_summary REGEXP '[\\u4e00-\\u9fff]'
                OR resolution REGEXP '[\\u4e00-\\u9fff]'
                OR vehicle_desc REGEXP '[\\u4e00-\\u9fff]'
                OR cost_info REGEXP '[\\u4e00-\\u9fff]'
              )
            LIMIT {limit}
            """
        )
        rows = await cur.fetchall()

    print(f"Found {len(rows)} rows needing translation")
    done = 0
    cache: dict = {}  # shared translation cache: chinese_text -> english_text

    async def process_row(row):
        nonlocal done
        ctx = f"{row['content_type']} case for {row['model_id']}"
        async with sem:
            try:
                orig_sym = row["symptom_summary"]
                orig_res = row["resolution"]
                orig_vd = row["vehicle_desc"]
                orig_ci = row["cost_info"]

                async def _sym():
                    if has_chinese(orig_sym):
                        return await translate_field(client, orig_sym, f"{ctx} — symptom summary", cache)
                    return orig_sym

                async def _res():
                    if has_chinese(orig_res):
                        return await translate_field(client, orig_res, f"{ctx} — resolution/repair description", cache)
                    return orig_res

                async def _vd():
                    if has_chinese(orig_vd):
                        return await translate_field(client, orig_vd, f"{ctx} — vehicle description", cache)
                    return orig_vd

                async def _ci():
                    if has_chinese(orig_ci):
                        return await translate_field(client, orig_ci, f"{ctx} — cost information", cache)
                    return orig_ci

                new_sym, new_res, new_vd, new_ci = await asyncio.gather(
                    _sym(), _res(), _vd(), _ci()
                )

                if not dry_run:
                    async with conn.cursor() as cur:
                        await cur.execute(
                            "UPDATE mf_nv_cases "
                            "SET symptom_summary=%s, resolution=%s, vehicle_desc=%s, cost_info=%s, "
                            "symptom_summary_cn=%s, resolution_cn=%s, vehicle_desc_cn=%s, cost_info_cn=%s, "
                            "translated_by=%s "
                            "WHERE case_id=%s",
                            (
                                new_sym, new_res, new_vd, new_ci,
                                orig_sym, orig_res, orig_vd, orig_ci,
                                TRANSLATOR_MODEL,
                                row["case_id"],
                            ),
                        )
                    await conn.commit()

                done += 1
                cache_hits = len(cache)
                log_entry({"case_id": row["case_id"], "model_id": row["model_id"], "status": "ok"})
                print(f"\r  {done}/{len(rows)} — case {row['case_id']} ({row['model_id']})  cache={cache_hits}    ", end="", flush=True)

            except Exception as e:
                print(f"\n  ✗ case_id {row['case_id']}: {e}")
                log_entry({"case_id": row["case_id"], "model_id": row["model_id"], "status": "error", "error": str(e)})

    await asyncio.gather(*[process_row(row) for row in rows])
    print(f"\n  Done: {done} rows (cache size: {len(cache)})")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=999999, help="Max rows to process")
    parser.add_argument("--dry-run", action="store_true", help="Translate but don't write to DB")
    parser.add_argument("--concurrency", type=int, default=CONCURRENCY)
    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN — no DB writes")

    config = load_config()
    env = load_env()
    db_cfg = parse_db_url(env.get("DATABASE_URL", ""))

    print(f"Cases translation script started")
    print(f"  Translator:  {TRANSLATOR_MODEL}")
    print(f"  Reviewer:    {REVIEWER_MODEL}")
    print(f"  Concurrency: {args.concurrency}")
    print(f"  Limit:       {args.limit}")
    print(f"  Dry run:     {args.dry_run}")
    print(f"  Log file:    {LOG_FILE}")

    client = AsyncOpenAI(
        api_key=config["llm_api_key"],
        base_url=config["llm_base_url"],
    )

    conn = await aiomysql.connect(
        host=db_cfg["host"],
        port=db_cfg["port"],
        user=db_cfg["user"],
        password=db_cfg["password"],
        db=db_cfg["db"],
        charset="utf8mb4",
        autocommit=False,
    )

    sem = asyncio.Semaphore(args.concurrency)

    await add_backup_columns(conn)
    await translate_cases_table(conn, client, args.limit, args.dry_run, sem)

    conn.close()
    print("\nAll done.")


if __name__ == "__main__":
    asyncio.run(main())
