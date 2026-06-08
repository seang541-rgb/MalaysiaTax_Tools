"""
Merge all JSONL Q&A files into a single training dataset.
Output formats:
  1. merged.jsonl — for Unsloth / Hugging Face fine-tuning
  2. ollama-modelfile.txt — Ollama Modelfile with system prompt
"""
import json
import glob
import os

QA_DIR = os.path.join(os.path.dirname(__file__), "..", "qa-pairs")
RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "processed")
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Merge all JSONL files
all_examples = []
for f in sorted(glob.glob(os.path.join(QA_DIR, "*.jsonl"))):
    with open(f, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    obj = json.loads(line)
                    all_examples.append(obj)
                except json.JSONDecodeError:
                    print(f"  ⚠ Skipping bad line in {os.path.basename(f)}")

out_path = os.path.join(OUT_DIR, "merged.jsonl")
with open(out_path, "w", encoding="utf-8") as fh:
    for ex in all_examples:
        fh.write(json.dumps(ex, ensure_ascii=False) + "\n")

print(f"✅ Merged {len(all_examples)} examples → {out_path}")

# 2. Collect raw knowledge for system prompt
raw_texts = []
for f in sorted(glob.glob(os.path.join(RAW_DIR, "*.md"))):
    with open(f, "r", encoding="utf-8") as fh:
        raw_texts.append(fh.read())

combined_knowledge = "\n\n---\n\n".join(raw_texts)

# 3. Generate Ollama Modelfile
system_prompt = f"""You are MYTax AI — a Malaysia tax expert assistant. You answer questions about Malaysian taxation accurately, concisely, and in the user's language (English, 中文, or Bahasa Malaysia).

You have deep knowledge of:
- Malaysia personal income tax (YA2025) — progressive rates, reliefs, rebates
- Corporate tax — SME preferential rates, standard rates
- EPF (KWSP) — employer/employee rates, age-based, wage ceiling
- SOCSO (PERKESO) — contribution rates, eligibility
- EIS (SIP) — contribution rates, coverage
- SST — service tax 8%, sales tax 5%/10%, registration threshold
- PCB — monthly tax deduction mechanism

Rules:
1. Always cite specific rates, ceilings, thresholds with numbers
2. Mention Year of Assessment (YA2025) when relevant
3. If uncertain, say so and recommend consulting LHDN or a tax professional
4. Keep answers concise but complete
5. Match the user's language
6. Always add a disclaimer: answers are for reference only
7. Use tables and structured formatting for clarity

REFERENCE DATA:
{combined_knowledge[:8000]}"""  # Truncate if too long for Modelfile

modelfile_path = os.path.join(OUT_DIR, "Modelfile")
with open(modelfile_path, "w", encoding="utf-8") as fh:
    fh.write(f'FROM gemma4:12b\n\n')
    fh.write(f'SYSTEM """\n{system_prompt}\n"""\n\n')
    fh.write('PARAMETER temperature 0.3\n')
    fh.write('PARAMETER top_p 0.9\n')
    fh.write('PARAMETER num_ctx 8192\n')

print(f"✅ Modelfile generated → {modelfile_path}")

# 4. Stats
langs = {"en": 0, "zh": 0, "ms": 0}
for ex in all_examples:
    user_msg = ex["messages"][0]["content"]
    if any(ord(c) > 0x4E00 for c in user_msg):
        langs["zh"] += 1
    elif any(w in user_msg.lower() for w in ["apakah", "berapa", "bagaimana", "cukai", "gaji"]):
        langs["ms"] += 1
    else:
        langs["en"] += 1

print(f"\n📊 Dataset stats:")
print(f"   Total examples: {len(all_examples)}")
print(f"   English: {langs['en']}")
print(f"   Chinese: {langs['zh']}")
print(f"   Malay: {langs['ms']}")
print(f"   Raw knowledge files: {len(raw_texts)}")
