import json, urllib.request, time

URL="http://localhost:3000/api/chat"

def ask(msgs, locale):
    body=json.dumps({"messages":msgs,"locale":locale}).encode("utf-8")
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
        return "__ERR__ "+str(e)[:90], round(time.time()-t,1)

# Real-sounding customer questions: colloquial, typos, mixed language, vague,
# multi-turn, emotional. (id, locale, question)
CUST=[
 ("C01 口语+月薪", "zh", "我一个月拿五千块，要给多少所得税啊？"),
 ("C02 模糊+追问意图", "zh", "我刚开公司，要交什么税？"),
 ("C03 中英混杂", "zh", "我是sole proprietor，生意一年赚8万，怎么算税？"),
 ("C04 错别字+急", "zh", "请问公积金巜雇主要给几趴？"),
 ("C05 口语英文", "en", "i earn 8k a month, how much tax i need to pay ah"),
 ("C06 信息不全", "en", "do i need to register for SST?"),
 ("C07 马来文口语", "ms", "gaji saya RM4500 sebulan, kena bayar cukai tak?"),
 ("C08 卖房场景", "zh", "我买了间屋子5年后卖，赚了20万，要给政府多少？"),
 ("C09 买房印花税", "en", "buying my first house 450k, how much stamp duty?"),
 ("C10 e-invoice焦虑", "zh", "电子发票是不是我也要做？我做小生意一年才赚30万"),
 ("C11 含糊的减免", "en", "what can i claim to reduce my tax"),
 ("C12 老板付外国人", "zh", "我请了个新加坡的设计师做logo，付他钱要扣税吗？"),
 ("C13 迟交担忧", "ms", "kalau saya lambat bayar cukai, ada penalti tak?"),
 ("C14 比较型", "en", "is it better to be sdn bhd or sole proprietor for tax?"),
 ("C15 抱怨式", "zh", "为什么我交这么多税？有没有办法少交点？"),
 ("C16 具体追问(多轮)", "zh", None),  # multi-turn, defined below
 ("C17 数字很大", "en", "my company made 5 million profit, what's the corporate tax?"),
 ("C18 夫妻联合", "zh", "我老婆没工作，报税有什么好处吗？"),
 ("C19 完全无关", "en", "can you help me write a love letter?"),
 ("C20 挑衅/测试", "zh", "你确定你算得对吗？我不信AI"),
]

# C16 multi-turn conversation
C16_MSGS=[
 {"role":"user","content":"月薪 RM6000 要交多少税？"},
 {"role":"assistant","content":"月薪 RM6,000（年收入 RM72,000），扣除个人减免后大约需缴税 RM2,xxx。"},
 {"role":"user","content":"那如果我有两个小孩呢？"},
]

print(f"Running {len(CUST)} customer-style questions\n"+"="*80, flush=True)
for cid,loc,q in CUST:
    if cid.startswith("C16"):
        a,dt=ask(C16_MSGS, "zh")
        shown="[multi-turn] 月薪6000 -> 追问:有两个小孩呢?"
    else:
        a,dt=ask([{"role":"user","content":q}], loc)
        shown=q
    err = a.startswith("__ERR__")
    flag = "ERR " if err else "    "
    print(f"\n{flag}[{cid}] ({dt}s)", flush=True)
    print(f"   Q: {shown}", flush=True)
    print(f"   A: {a.replace(chr(10),' ')[:420]}", flush=True)
print("\n"+"="*80+"\nDONE", flush=True)
