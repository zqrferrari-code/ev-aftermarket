#!/usr/bin/env python3
"""
批量翻译 DTC 内容脚本

流程：
1. 为两张表新增 _cn 备份列（幂等）
2. 从 DB 读取含中文的行
3. 用 pub-gpt-5.4 将中文翻译成英文
4. 用 pub-gemini-3.1-pro-preview 对比中英文，修正歧义、去 AI 味
5. 将最终英文写回 DB，原始中文写入 _cn 备份列

用法：
  python scripts/translate-dtc-content.py
  python scripts/translate-dtc-content.py --table dtcs --limit 10 --dry-run
"""

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path

import aiomysql
from openai import AsyncOpenAI

# ── 配置 ──────────────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent.parent.parent / "ev-pipeline" / "llm-config.json"
ENV_PATH = Path(__file__).parent.parent / ".env.local"

TRANSLATOR_MODEL = "pub-gpt-5.4"
REVIEWER_MODEL = "pub-gemini-3.1-pro-preview"
CONCURRENCY = 3       # 并发翻译数
LOG_FILE = Path(__file__).parent / "translate-log.jsonl"

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
    # mysql://user:pass@host:port/db  (password may contain @)
    # Strip scheme
    rest = url[len("mysql://"):]
    # Split on last @ to get userinfo vs hostinfo
    at_idx = rest.rfind("@")
    userinfo = rest[:at_idx]
    hostinfo = rest[at_idx + 1:]
    colon_idx = userinfo.index(":")
    user = userinfo[:colon_idx]
    password = userinfo[colon_idx + 1:]
    m = re.match(r"([^:]+):(\d+)/(.+)", hostinfo)
    if not m:
        raise ValueError(f"Cannot parse host portion of DATABASE_URL: {hostinfo}")
    return dict(user=user, password=password, host=m[1], port=int(m[2]), db=m[3])


def has_chinese(val) -> bool:
    if val is None:
        return False
    s = json.dumps(val, ensure_ascii=False) if not isinstance(val, str) else val
    return bool(CN_PATTERN.search(s))


def parse_json_field(val):
    if val is None:
        return val
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return val


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
                    "Translate Chinese EV fault code documentation into clear, natural British English "
                    "for Australian car owners.\n\n"
                    "Rules:\n"
                    "- Keep technical terms (DTC codes, part names, tool names) in standard English form\n"
                    "- Use active voice: 'Check the X', not 'It is recommended to check the X'\n"
                    "- Preserve all specific values (voltages, resistances, temperatures, part numbers)\n"
                    "- Do NOT add commentary not in the original\n"
                    "- Do NOT use: 'Please note', 'It is worth mentioning', 'In conclusion', 'It is important to'\n"
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
                    "of Chinese EV fault code documentation.\n\n"
                    "Your job:\n"
                    "1. Compare the English draft against the Chinese original for accuracy\n"
                    "2. Fix any mistranslations, omissions, or ambiguities\n"
                    "3. Remove AI-flavoured phrases: 'It is important to note', 'Please ensure', "
                    "'It should be noted', 'In order to'\n"
                    "4. Replace passive voice with active voice where natural\n"
                    "5. Preserve technical values (voltages, part numbers, tool names) exactly\n"
                    "6. Tone: direct, factual — workshop manual, not a chatbot\n\n"
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


async def translate_field(client: AsyncOpenAI, chinese: str, context: str) -> str:
    draft = await translate(client, chinese, context)
    final = await review(client, chinese, draft, context)
    return final


async def translate_json_array(client: AsyncOpenAI, val, context: str):
    arr = parse_json_field(val)
    if not isinstance(arr, list) or not arr:
        return arr

    if isinstance(arr[0], str):
        results = []
        for item in arr:
            if has_chinese(item):
                results.append(await translate_field(client, item, context))
            else:
                results.append(item)
        return results
    else:
        # {title, body} format
        results = []
        for item in arr:
            translated = dict(item)
            if item.get("title") and has_chinese(item["title"]):
                translated["title"] = await translate_field(
                    client, item["title"], context + " (step title)"
                )
            if item.get("body") and has_chinese(item["body"]):
                translated["body"] = await translate_field(
                    client, item["body"], context + " (step detail)"
                )
            results.append(translated)
        return results


# ── DB 操作 ───────────────────────────────────────────────────────────────────

async def add_backup_columns(conn):
    print("Adding backup columns if not exist...")
    columns = [
        ("mf_nv_dtcs", "description_cn", "LONGTEXT"),
        ("mf_nv_dtcs", "safety_warning_cn", "TEXT"),
        ("mf_nv_dtc_model_notes", "likely_causes_cn", "JSON"),
        ("mf_nv_dtc_model_notes", "suggested_actions_cn", "JSON"),
        ("mf_nv_dtc_model_notes", "climate_notes_cn", "TEXT"),
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


async def translate_dtcs_table(conn, client: AsyncOpenAI, limit: int, dry_run: bool, sem: asyncio.Semaphore):
    print("\n── mf_nv_dtcs ──────────────────────────────────────")
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"""
            SELECT dtc_id, dtc_code, description_en, safety_warning
            FROM mf_nv_dtcs
            WHERE (description_en REGEXP '[\u4e00-\u9fff]' OR safety_warning REGEXP '[\u4e00-\u9fff]')
              AND description_cn IS NULL
            LIMIT {limit}
            """
        )
        rows = await cur.fetchall()

    print(f"Found {len(rows)} rows needing translation")
    done = 0

    async def process_row(row):
        nonlocal done
        ctx = f"DTC code {row['dtc_code']} — fault description for an EV"
        async with sem:
            try:
                new_desc = row["description_en"]
                new_safety = row["safety_warning"]

                if has_chinese(row["description_en"]):
                    new_desc = await translate_field(client, row["description_en"], ctx)
                if has_chinese(row["safety_warning"]):
                    new_safety = await translate_field(
                        client, row["safety_warning"],
                        f"{ctx} — safety warning shown to driver"
                    )

                if not dry_run:
                    async with conn.cursor() as cur:
                        await cur.execute(
                            "UPDATE mf_nv_dtcs SET description_en=%s, safety_warning=%s, "
                            "description_cn=%s, safety_warning_cn=%s WHERE dtc_id=%s",
                            (new_desc, new_safety, row["description_en"], row["safety_warning"], row["dtc_id"]),
                        )
                    await conn.commit()

                done += 1
                log_entry({"table": "dtcs", "dtc_id": row["dtc_id"], "dtc_code": row["dtc_code"],
                           "status": "ok", "en": new_desc[:80]})
                print(f"\r  {done}/{len(rows)} — {row['dtc_code']}          ", end="", flush=True)

            except Exception as e:
                print(f"\n  ✗ dtc_id {row['dtc_id']}: {e}")
                log_entry({"table": "dtcs", "dtc_id": row["dtc_id"], "dtc_code": row["dtc_code"],
                           "status": "error", "error": str(e)})

    await asyncio.gather(*[process_row(row) for row in rows])
    print(f"\n  Done: {done} rows")


async def translate_notes_table(conn, client: AsyncOpenAI, limit: int, dry_run: bool, sem: asyncio.Semaphore):
    print("\n── mf_nv_dtc_model_notes ───────────────────────────")
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"""
            SELECT n.id, n.model_id, d.dtc_code,
                   n.likely_causes, n.suggested_actions, n.climate_notes
            FROM mf_nv_dtc_model_notes n
            JOIN mf_nv_dtcs d ON n.dtc_id = d.dtc_id
            WHERE (
              n.likely_causes REGEXP '[\u4e00-\u9fff]'
              OR n.suggested_actions REGEXP '[\u4e00-\u9fff]'
              OR n.climate_notes REGEXP '[\u4e00-\u9fff]'
            )
            AND n.likely_causes_cn IS NULL
            LIMIT {limit}
            """
        )
        rows = await cur.fetchall()

    print(f"Found {len(rows)} rows needing translation")
    done = 0

    async def process_row(row):
        nonlocal done
        ctx = f"DTC code {row['dtc_code']} on {row['model_id']}"
        async with sem:
            try:
                orig_causes = parse_json_field(row["likely_causes"])
                orig_actions = parse_json_field(row["suggested_actions"])
                orig_climate = row["climate_notes"]

                async def _translate_causes():
                    if has_chinese(row["likely_causes"]):
                        return await translate_json_array(
                            client, row["likely_causes"], f"{ctx} — likely causes list"
                        )
                    return orig_causes

                async def _translate_actions():
                    if has_chinese(row["suggested_actions"]):
                        return await translate_json_array(
                            client, row["suggested_actions"], f"{ctx} — repair steps"
                        )
                    return orig_actions

                async def _translate_climate():
                    if has_chinese(row["climate_notes"]):
                        return await translate_field(
                            client, row["climate_notes"], f"{ctx} — climate/environment note"
                        )
                    return orig_climate

                new_causes, new_actions, new_climate = await asyncio.gather(
                    _translate_causes(), _translate_actions(), _translate_climate()
                )

                if not dry_run:
                    async with conn.cursor() as cur:
                        await cur.execute(
                            "UPDATE mf_nv_dtc_model_notes "
                            "SET likely_causes=%s, suggested_actions=%s, climate_notes=%s, "
                            "likely_causes_cn=%s, suggested_actions_cn=%s, climate_notes_cn=%s "
                            "WHERE id=%s",
                            (
                                json.dumps(new_causes, ensure_ascii=False),
                                json.dumps(new_actions, ensure_ascii=False),
                                new_climate,
                                json.dumps(orig_causes, ensure_ascii=False),
                                json.dumps(orig_actions, ensure_ascii=False),
                                orig_climate,
                                row["id"],
                            ),
                        )
                    await conn.commit()

                done += 1
                log_entry({"table": "notes", "note_id": row["id"], "dtc_code": row["dtc_code"], "status": "ok"})
                print(f"\r  {done}/{len(rows)} — note {row['id']} ({row['dtc_code']})          ", end="", flush=True)

            except Exception as e:
                print(f"\n  ✗ note_id {row['id']}: {e}")
                log_entry({"table": "notes", "note_id": row["id"], "dtc_code": row["dtc_code"],
                           "status": "error", "error": str(e)})

    await asyncio.gather(*[process_row(row) for row in rows])
    print(f"\n  Done: {done} rows")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", choices=["dtcs", "notes"], help="Only run one table")
    parser.add_argument("--limit", type=int, default=999999, help="Max rows to process")
    parser.add_argument("--dry-run", action="store_true", help="Translate but don't write to DB")
    parser.add_argument("--concurrency", type=int, default=CONCURRENCY)
    args = parser.parse_args()

    if args.dry_run:
        print("🔍 DRY RUN — no DB writes")

    config = load_config()
    env = load_env()
    db_cfg = parse_db_url(env.get("DATABASE_URL", ""))

    print(f"Translation script started")
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

    if not args.table or args.table == "dtcs":
        await translate_dtcs_table(conn, client, args.limit, args.dry_run, sem)
    if not args.table or args.table == "notes":
        await translate_notes_table(conn, client, args.limit, args.dry_run, sem)

    conn.close()
    print("\nAll done.")


if __name__ == "__main__":
    asyncio.run(main())
