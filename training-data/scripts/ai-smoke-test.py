import json, urllib.request, time

URL="http://localhost:3000/api/chat"

def ask(q, locale):
    body=json.dumps({"messages":[{"role":"user","content":q}],"locale":locale}).encode("utf-8")
    req=urllib.request.Request(URL, data=body, headers={"Content-Type":"application/json"})
    t=time.time(); toks=[]
    try:
        for raw in urllib.request.urlopen(req, timeout=90):
            for line in raw.decode("utf-8").splitlines():
                line=line.strip()
                if line.startswith("data:"):
                    p=line[5:].strip()
                    if p=="[DONE]": break
                    try: toks.append(json.loads(p).get("token",""))
                    except: pass
        return "".join(toks), round(time.time()-t,1)
    except Exception as e:
        return "__ERR__ "+str(e)[:80], round(time.time()-t,1)

def has_zh(s): return any('一'<=c<='鿿' for c in s)
def has_malay(s):
    sl=s.lower(); return sum(w in sl for w in ['cukai','kadar','adalah','yang','untuk','anda','perlu','pendapatan'])>=2

# (id, locale, question, check_fn(answer)->bool, note)
TESTS=[
 ("01 personal pre-calc", "zh", "月薪 RM5000 要交多少所得税？",
   lambda a: ("1,610" in a or "1610" in a) and has_zh(a), "expect RM1,610, Chinese"),
 ("02 personal annual EN", "en", "Annual income RM120,000, only personal relief, YA2025 tax payable?",
   lambda a: "12,150" in a or "12150" in a, "chargeable 111k -> RM12,150"),
 ("03 SME corp tax", "en", "An SME company has chargeable income of RM200,000 for YA2025. Final corporate tax?",
   lambda a: "31,000" in a or "31000" in a, "expect RM31,000"),
 ("04 SME corp ZH 700k", "zh", "马来西亚中小企业(SME)年应税收入RM700,000要交多少企业税？",
   lambda a: "123,000" in a or "123000" in a, "expect RM123,000"),
 ("05 EPF rate", "en", "What is the EPF employee contribution rate?",
   lambda a: "11%" in a or "11 %" in a, "employee 11%"),
 ("06 SOCSO rate", "zh", "SOCSO 雇主缴纳率是多少？",
   lambda a: "1.75" in a, "employer 1.75%"),
 ("07 SST threshold", "en", "What is the general SST service tax registration threshold?",
   lambda a: ("500,000" in a or "500000" in a or "RM500" in a or "500k" in a.lower()), "RM500k"),
 ("08 SST rate", "ms", "Apakah kadar cukai perkhidmatan (SST) am di Malaysia?",
   lambda a: "8%" in a and has_malay(a), "8%, Malay reply"),
 ("09 RPGT citizen", "en", "A Malaysian citizen sells property in the 2nd year of holding. What is the RPGT rate?",
   lambda a: "30%" in a, "within 3 yrs = 30%"),
 ("10 RPGT 6th year", "zh", "公民持有产业第6年才卖，RPGT 税率是多少？",
   lambda a: "0%" in a or "0 %" in a or "免" in a or "无需" in a, "6th yr = 0% for citizen"),
 ("11 stamp duty", "en", "Stamp duty (MOT) for a RM500,000 property bought by a citizen?",
   lambda a: "9,000" in a or "9000" in a, "1%x100k+2%x400k=RM9,000"),
 ("12 WHT royalty", "en", "What is the withholding tax rate on royalty paid to a non-resident?",
   lambda a: "10%" in a, "royalty WHT 10%"),
 ("13 CP204 penalty", "zh", "CP204 低估税款会怎样罚款？",
   lambda a: "10%" in a and ("130" in a or "30%" in a), "10% on shortfall above 130%"),
 ("14 e-invoice phase", "en", "When is e-Invoice mandatory for a business with RM3 million annual turnover?",
   lambda a: "2026" in a, "RM1-5M phase = 1 Jan 2026"),
 ("15 reliefs list", "zh", "马来西亚个人所得税有哪些主要减免？",
   lambda a: "9,000" in a or "9000" in a, "mentions RM9,000 personal relief"),
 ("16 lang match BM", "ms", "Berapakah caruman KWSP (EPF) untuk pekerja?",
   lambda a: "11%" in a and has_malay(a), "11%, Malay reply"),
 ("17 out-of-scope guard", "en", "What's the weather in Kuala Lumpur today?",
   lambda a: len(a)>10 and not a.startswith("__ERR__"), "should respond gracefully, not crash"),
]

print(f"Running {len(TESTS)} AI tests against {URL}\n"+"="*78, flush=True)
passed=0
for tid,loc,q,chk,note in TESTS:
    a,dt=ask(q,loc)
    ok = (not a.startswith("__ERR__")) and chk(a)
    passed += 1 if ok else 0
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {tid:<24} ({dt}s)  ~ {note}", flush=True)
    if not ok:
        print(f"        ANSWER: {a.replace(chr(10),' ')[:260]}", flush=True)
print("="*78, flush=True)
print(f"RESULT: {passed}/{len(TESTS)} passed", flush=True)
print("ALLPASS" if passed==len(TESTS) else "SOMEFAIL", flush=True)
