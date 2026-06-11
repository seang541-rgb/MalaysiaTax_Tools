import json, urllib.request, time, sys
KEY="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"
URL="https://integrate.api.nvidia.com/v1/chat/completions"

MODELS=[
 "meta/llama-3.3-70b-instruct",
 "deepseek-ai/deepseek-v4-pro",
 "deepseek-ai/deepseek-v4-flash",
 "qwen/qwen3-next-80b-a3b-instruct",
 "qwen/qwen3.5-122b-a10b",
 "qwen/qwen3.5-397b-a17b",
 "nvidia/llama-3.3-nemotron-super-49b-v1.5",
 "nvidia/nemotron-3-super-120b-a12b",
 "z-ai/glm-5.1",
 "moonshotai/kimi-k2.6",
 "minimaxai/minimax-m2.7",
 "openai/gpt-oss-120b",
 "meta/llama-4-maverick-17b-128e-instruct",
]

SYS_Q1=("You are MYTax AI, a Malaysia tax assistant. Reply in the user's language. Keep it concise.\n\n"
 "--- PRE-CALCULATED TAX RESULT (use these EXACT numbers, do NOT recalculate) ---\n"
 "User's income: RM5,000 per month (= RM60,000 per year)\n"
 "Chargeable income: RM60,000 - RM9,000 = RM51,000\n"
 "Tax bands: 5,000-20,000:1%=RM150; 20,000-35,000:3%=RM450; 35,000-50,000:6%=RM900; 50,000-51,000:11%=RM110\n"
 "FINAL TAX PAYABLE: RM1,610\n--- END ---\nIMPORTANT: Present these EXACT numbers. Do NOT recalculate.")
SYS_PLAIN="You are MYTax AI, a Malaysia tax assistant. Reply in the user's language. Keep answers concise and correct."

def call(model, system, user, max_tokens=500):
    body=json.dumps({"model":model,"messages":[{"role":"system","content":system},{"role":"user","content":user}],"temperature":0.2,"max_tokens":max_tokens}).encode()
    req=urllib.request.Request(URL,data=body,headers={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"})
    t=time.time()
    try:
        d=json.load(urllib.request.urlopen(req,timeout=60))
        txt=(d["choices"][0]["message"].get("content") or "").strip()
        return txt, round(time.time()-t,1)
    except Exception as e:
        return "__ERR__ "+str(e)[:50], round(time.time()-t,1)

def has_zh(s): return any('一'<=c<='鿿' for c in s)
def looks_malay(s):
    sl=s.lower(); return sum(w in sl for w in ['cukai','kadar','perkhidmatan','adalah','yang','untuk','jualan'])>=2

print(f"{'MODEL':<46} {'Q1adh':<7} {'t1':<5} {'Q2ms':<5} {'t2':<5} {'Q3acc':<6} {'t3'}", flush=True)
print("-"*86, flush=True)
for m in MODELS:
    a1,t1=call(m,SYS_Q1,"月薪 RM5000 要交多少所得税？")
    q1=("OK" if ("1,610" in a1 or "1610" in a1) else ("ERR" if a1.startswith("__ERR__") else "NO")) + ("/zh" if has_zh(a1) else "/--")
    a2,t2=call(m,SYS_PLAIN,"Apakah kadar cukai perkhidmatan (SST) di Malaysia?")
    q2="ms" if looks_malay(a2) else ("ERR" if a2.startswith("__ERR__") else "--")
    a3,t3=call(m,SYS_PLAIN,"An SME company has chargeable income of RM200,000 for YA2025. How much corporate tax? Show the final amount.")
    q3="OK" if ("31,000" in a3 or "31000" in a3) else ("ERR" if a3.startswith("__ERR__") else "NO")
    print(f"{m:<46} {q1:<7} {t1:<5} {q2:<5} {t2:<5} {q3:<6} {t3}", flush=True)
print("DONE", flush=True)
