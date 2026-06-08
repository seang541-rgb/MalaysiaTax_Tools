"""
Comprehensive validation of all training data resources.
Checks:
1. Q&A JSONL format correctness
2. Raw knowledge file completeness
3. Coverage gap analysis
4. Duplicate detection
5. Language distribution
6. Merged dataset integrity
"""
import json
import os
import glob
import hashlib

BASE = os.path.join(os.path.dirname(__file__), "..")
QA_DIR = os.path.join(BASE, "qa-pairs")
RAW_DIR = os.path.join(BASE, "raw")
PROC_DIR = os.path.join(BASE, "processed")

print("=" * 60)
print("MYTax Training Data Validation Report")
print("=" * 60)

# ============================================================
# 1. Q&A JSONL Validation
# ============================================================
print("\n[1/6] Q&A JSONL FORMAT VALIDATION")
print("-" * 40)

all_examples = []
errors = []
file_stats = {}

for f in sorted(glob.glob(os.path.join(QA_DIR, "*.jsonl"))):
    name = os.path.basename(f)
    valid = 0
    bad = 0
    with open(f, "r", encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                msgs = obj.get("messages", [])
                if len(msgs) < 2:
                    errors.append(f"{name}:L{i} less than 2 messages")
                    bad += 1
                elif not msgs[0].get("content", "").strip():
                    errors.append(f"{name}:L{i} empty user message")
                    bad += 1
                elif not msgs[1].get("content", "").strip():
                    errors.append(f"{name}:L{i} empty assistant answer")
                    bad += 1
                elif msgs[0].get("role") != "user":
                    errors.append(f"{name}:L{i} first msg not 'user'")
                    bad += 1
                elif msgs[1].get("role") != "assistant":
                    errors.append(f"{name}:L{i} second msg not 'assistant'")
                    bad += 1
                else:
                    valid += 1
                    all_examples.append(obj)
            except json.JSONDecodeError as e:
                errors.append(f"{name}:L{i} JSON error: {e}")
                bad += 1

    status = "PASS" if bad == 0 else "FAIL"
    print(f"  [{status}] {name}: {valid} valid, {bad} errors")
    file_stats[name] = {"valid": valid, "bad": bad}

total_valid = sum(s["valid"] for s in file_stats.values())
total_bad = sum(s["bad"] for s in file_stats.values())
print(f"\n  Total: {total_valid} valid, {total_bad} errors")

if errors:
    print(f"\n  Errors found:")
    for e in errors[:10]:
        print(f"    - {e}")
    if len(errors) > 10:
        print(f"    ... and {len(errors) - 10} more")

# ============================================================
# 2. Raw Knowledge Files
# ============================================================
print("\n[2/6] RAW KNOWLEDGE FILES")
print("-" * 40)

raw_files = sorted(glob.glob(os.path.join(RAW_DIR, "*.md")))
total_raw_chars = 0
for f in raw_files:
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()
    chars = len(content)
    total_raw_chars += chars
    lines = content.count("\n")
    # Check if file has meaningful content
    status = "PASS" if chars > 500 else "WARN (small)"
    print(f"  [{status}] {os.path.basename(f)}: {chars:,} chars, {lines} lines")

print(f"\n  Total: {len(raw_files)} files, {total_raw_chars:,} characters")

# ============================================================
# 3. Language Distribution
# ============================================================
print("\n[3/6] LANGUAGE DISTRIBUTION")
print("-" * 40)

langs = {"en": [], "zh": [], "ms": []}
for ex in all_examples:
    q = ex["messages"][0]["content"]
    if any(ord(c) > 0x4E00 for c in q):
        langs["zh"].append(q[:50])
    elif any(w in q.lower() for w in ["apakah", "berapa", "bagaimana", "cukai", "gaji",
                                        "berapakah", "adakah", "sebulan"]):
        langs["ms"].append(q[:50])
    else:
        langs["en"].append(q[:50])

total = len(all_examples)
for lang, items in langs.items():
    pct = len(items) / total * 100 if total > 0 else 0
    bar = "#" * int(pct / 2)
    print(f"  {lang.upper()}: {len(items):3d} ({pct:5.1f}%) {bar}")

# Check balance
min_lang = min(len(v) for v in langs.values())
max_lang = max(len(v) for v in langs.values())
ratio = min_lang / max_lang if max_lang > 0 else 0
if ratio < 0.3:
    print(f"\n  WARNING: Language imbalance detected (ratio {ratio:.2f})")
    print(f"  Consider adding more {min(langs, key=lambda k: len(langs[k]))} examples")
else:
    print(f"\n  Balance ratio: {ratio:.2f} (OK)")

# ============================================================
# 4. Duplicate Detection
# ============================================================
print("\n[4/6] DUPLICATE DETECTION")
print("-" * 40)

seen_questions = {}
duplicates = []
for ex in all_examples:
    q = ex["messages"][0]["content"].strip().lower()
    q_hash = hashlib.md5(q.encode()).hexdigest()[:12]
    if q_hash in seen_questions:
        duplicates.append((q[:60], seen_questions[q_hash][:60]))
    else:
        seen_questions[q_hash] = q

if duplicates:
    print(f"  Found {len(duplicates)} duplicate questions:")
    for dup, orig in duplicates[:5]:
        print(f"    DUP: {dup}...")
    if len(duplicates) > 5:
        print(f"    ... and {len(duplicates) - 5} more")
else:
    print(f"  No duplicates found across {len(all_examples)} examples")

# ============================================================
# 5. Coverage Gap Analysis
# ============================================================
print("\n[5/6] TOPIC COVERAGE ANALYSIS")
print("-" * 40)

topics = {
    "personal_tax_calc": {"keywords": ["salary", "gaji", "tax for", "cukai untuk", "月薪", "交多少税"], "count": 0, "target": 50},
    "corporate_tax": {"keywords": ["corporate", "company", "syarikat", "企业", "公司"], "count": 0, "target": 15},
    "epf_kwsp": {"keywords": ["epf", "kwsp", "公积金"], "count": 0, "target": 15},
    "socso_perkeso": {"keywords": ["socso", "perkeso", "社险"], "count": 0, "target": 10},
    "eis_sip": {"keywords": ["eis", "sip", "就业保险"], "count": 0, "target": 8},
    "sst": {"keywords": ["sst", "service tax", "sales tax", "销售", "服务税"], "count": 0, "target": 10},
    "pcb_mtd": {"keywords": ["pcb", "potongan cukai", "预扣税", "monthly tax"], "count": 0, "target": 10},
    "tax_relief": {"keywords": ["relief", "pelepasan", "减免", "deduction"], "count": 0, "target": 15},
    "employer_contrib": {"keywords": ["employer", "majikan", "caruman", "雇主", "contribution"], "count": 0, "target": 15},
    "filing_deadline": {"keywords": ["deadline", "filing", "报税", "tarikh"], "count": 0, "target": 5},
    "tax_residency": {"keywords": ["resident", "pemastautin", "居民", "182 days"], "count": 0, "target": 3},
    "rpgt": {"keywords": ["rpgt", "property", "harta", "房产"], "count": 0, "target": 3},
    "zakat": {"keywords": ["zakat", "fitrah", "天课"], "count": 0, "target": 3},
    "bik": {"keywords": ["benefit", "bik", "manfaat", "福利"], "count": 0, "target": 3},
}

for ex in all_examples:
    q = ex["messages"][0]["content"].lower()
    a = ex["messages"][1]["content"].lower()
    text = q + " " + a
    for topic, info in topics.items():
        if any(kw in text for kw in info["keywords"]):
            info["count"] += 1

for topic, info in topics.items():
    count = info["count"]
    target = info["target"]
    pct = count / target * 100 if target > 0 else 0
    status = "PASS" if pct >= 80 else ("WEAK" if pct >= 40 else "GAP!")
    bar = "#" * min(int(pct / 5), 20)
    label = topic.replace("_", " ").title()
    print(f"  [{status}] {label:25s} {count:3d}/{target:3d} ({pct:5.1f}%) {bar}")

gaps = [t.replace("_"," ").title() for t, i in topics.items() if i["count"] / i["target"] < 0.4]
if gaps:
    print(f"\n  GAPS NEEDING EXPANSION: {', '.join(gaps)}")

# ============================================================
# 6. Processed Files
# ============================================================
print("\n[6/6] PROCESSED OUTPUT FILES")
print("-" * 40)

merged_path = os.path.join(PROC_DIR, "merged.jsonl")
if os.path.exists(merged_path):
    with open(merged_path, "r", encoding="utf-8") as fh:
        merged_count = sum(1 for line in fh if line.strip())
    size_kb = os.path.getsize(merged_path) / 1024
    status = "PASS" if merged_count == total_valid else "MISMATCH"
    print(f"  [{status}] merged.jsonl: {merged_count} examples, {size_kb:.1f}KB")
else:
    print(f"  [MISS] merged.jsonl NOT FOUND")

modelfile_path = os.path.join(PROC_DIR, "Modelfile")
if os.path.exists(modelfile_path):
    size_kb = os.path.getsize(modelfile_path) / 1024
    print(f"  [PASS] Modelfile: {size_kb:.1f}KB")
else:
    print(f"  [MISS] Modelfile NOT FOUND")

# ============================================================
# Summary
# ============================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"  Q&A examples:     {total_valid} valid / {total_bad} errors")
print(f"  Raw knowledge:    {len(raw_files)} files / {total_raw_chars:,} chars")
print(f"  Languages:        EN {len(langs['en'])} / ZH {len(langs['zh'])} / MS {len(langs['ms'])}")
print(f"  Duplicates:       {len(duplicates)}")
print(f"  Coverage gaps:    {len(gaps) if gaps else 'None'}")
overall = "PASS" if total_bad == 0 and len(duplicates) == 0 else "NEEDS FIX"
print(f"\n  Overall status:   [{overall}]")
if gaps:
    print(f"\n  Action needed:    Expand Q&A for: {', '.join(gaps)}")
