import csv, json, sys, re, os
SRC = sys.argv[1]; OUT = sys.argv[2]
def rd(n): return list(csv.DictReader(open(os.path.join(SRC, f"l10n_br_fiscal.{n}.csv"), encoding="utf-8")))
T = {}

# ---------- CFOP ----------
ESC = {"1":"Entrada – operação interna (do Estado)","2":"Entrada – interestadual (de outros Estados)","3":"Entrada – do exterior (importação)",
       "5":"Saída – operação interna (para o Estado)","6":"Saída – interestadual (para outros Estados)","7":"Saída – para o exterior (exportação)"}
def grupo(c):
    e = c[0] in "123"; g = int(c[1:])
    R = [(100,149,"Compras para industrialização, produção rural, comercialização ou prestação de serviços","Vendas de produção própria ou de terceiros"),
         (150,199,"Transferências para industrialização, produção rural, comercialização ou prestação de serviços","Transferências de produção própria ou de terceiros"),
         (200,249,"Devoluções de vendas de produção própria, de terceiros ou anulações de valores","Devoluções de compras para industrialização, produção rural, comercialização ou anulações de valores"),
         (250,299,"Compras de energia elétrica","Vendas de energia elétrica"),
         (300,349,"Aquisições de serviços de comunicação","Prestações de serviços de comunicação"),
         (350,399,"Aquisições de serviços de transporte","Prestações de serviços de transporte"),
         (400,449,"Entradas de mercadorias sujeitas ao regime de substituição tributária","Saídas de mercadorias sujeitas ao regime de substituição tributária"),
         (450,499,"Sistemas de integração","Sistemas de integração"),
         (500,549,"Entradas de mercadorias remetidas com fim específico de exportação e eventuais devoluções","Remessas com fim específico de exportação e eventuais devoluções"),
         (550,599,"Operações com bens de ativo imobilizado e materiais para uso ou consumo","Operações com bens de ativo imobilizado e materiais para uso ou consumo"),
         (600,649,"Créditos e ressarcimentos de ICMS","Créditos e ressarcimentos de ICMS"),
         (650,699,"Entradas de combustíveis, derivados ou não de petróleo, e lubrificantes","Saídas de combustíveis, derivados ou não de petróleo, e lubrificantes"),
         (900,999,"Outras entradas de mercadorias ou aquisições de serviços","Outras saídas de mercadorias ou prestações de serviços")]
    for a,b,i,o in R:
        if a<=g<=b: return i if e else o
    return ""
cf=[]
for x in rd("cfop"):
    c=x["code"].strip()
    if not re.fullmatch(r"\d{4}",c): continue
    fl=[k for k,lab in [("ind_devol","Devolução"),("ind_retor","Retorno"),("ind_remes","Remessa"),("ind_anula","Anulação"),("ind_comb","Combustível"),("is_icmsst","ST"),("ind_comunica","Comunicação"),("ind_transp","Transporte")] if x.get(k)=="1"]
    labs={"ind_devol":"Devolução","ind_retor":"Retorno","ind_remes":"Remessa","ind_anula":"Anulação","ind_comb":"Combustível","is_icmsst":"ST","ind_comunica":"Comunicação","ind_transp":"Transporte"}
    cf.append({"c":c[0]+"."+c[1:],"d":x["name"].strip(),"g":grupo(c),"e":ESC.get(c[0],""),"f":[labs[k] for k in fl],"nfe":x.get("ind_nfe")=="1"})
T["cfop"]=cf

# ---------- CST ----------
cst=rd("cst")
def pick(g): return [{"c":x["code"],"d":x["name"].strip(),"t":{"in":"Entrada","out":"Saída"}.get(x["cst_type"],"")} for x in cst if x["tax_group_id:id"]==g]
T["cst_icms"]=[{"c":x["c"],"d":x["d"]} for x in pick("tax_group_icms")]
T["csosn"]=[{"c":x["c"],"d":x["d"]} for x in pick("tax_group_icmssn")]
T["cst_ipi"]=pick("tax_group_ipi")
T["cst_pis"]=pick("tax_group_pis")
T["cst_ibscbs"]=[{"c":x["c"],"d":x["d"]} for x in pick("tax_group_ibs")]

# ---------- cClassTrib ----------
cc=[]
for x in rd("tax.classification"):
    red=re.search(r"red_(\d+(?:_\d+)?)", x.get("tax_ibs_id:id",""))
    cc.append({"c":x["code"],"cst":x["code"][:3],"d":x["name"].strip(),"x":x["description"].strip(),"red":(red.group(1).replace("_",",")+"%") if red else "","ini":x["date_start"],"fim":x["date_end"]})
T["cclasstrib"]=cc

# ---------- CEST ----------
segn={}
ce=[]
for x in rd("cest"):
    ncms=[n.strip() for n in x["ncms"].replace(";",",").split(",") if n.strip()]
    ce.append({"c":x["code"],"s":x["code"][:2],"i":x["item"],"d":x["name"].strip(),"n":ncms})
T["cest"]=ce

# ---------- Modelos de documentos ----------
T["modelos"]=[{"c":x["code"],"d":x["name"].strip(),"el":x["electronic"]=="True"} for x in rd("document.type")]

# ---------- LC 116 ----------
T["lc116"]=[{"c":x["code"],"d":x["name"].strip(),"h":x["internal_type"]=="view"} for x in rd("service.type")]

# ---------- NBS ----------
T["nbs"]=[{"c":x["code"],"d":x["name"].strip()} for x in rd("nbs")]

# ---------- NCM (arquivo separado) ----------
ipi={}
for x in rd("tax"):
    if x["tax_group_id:id"]=="tax_group_ipi": ipi[x["id"]]=x["name"].replace("IPI ","")
ncm=[]
for x in rd("ncm"):
    if x["active"]!="True" or x["code"].startswith("0000"): continue
    ncm.append([x["code"], x["exception"], x["name"].strip(), ipi.get(x["tax_ipi_id:id"],"")])

json.dump(T, open(os.path.join(OUT,"tabelas.json"),"w",encoding="utf-8"), ensure_ascii=False, separators=(",",":"))
json.dump(ncm, open(os.path.join(OUT,"ncm.json"),"w",encoding="utf-8"), ensure_ascii=False, separators=(",",":"))
for k,v in T.items(): print(k,len(v))
print("ncm",len(ncm))

# ---------- merge CEST com fonte 2 (thiagovalim) e nomes de segmentos ----------
if len(sys.argv) > 3:
    rows = list(csv.reader(open(sys.argv[3], encoding="utf-8"), delimiter=";"))[1:]
    seg = {}; extra = {}
    have = {x["c"] for x in T["cest"]}
    for r in rows:
        if len(r) < 5: continue
        s = r[2].strip()
        if "." in s:
            n, _, name = s.partition("."); seg[n.strip().zfill(2)] = name.strip()
        if r[0] not in have:
            e = extra.setdefault(r[0], {"c": r[0], "s": r[0][:2], "i": r[3], "d": r[4].strip(), "n": []})
            e["n"] += [n.replace(".", "").strip() for n in r[1].split() if n.strip()]
    T["cest"] += list(extra.values())
    T["cest"].sort(key=lambda x: x["c"])
    T["cest_seg"] = seg
    json.dump(T, open(os.path.join(OUT, "tabelas.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("cest final", len(T["cest"]), "segmentos", len(seg))

# ---------- META (controle de atualização) ----------
# uso: build_data.py <oca_data> <out> <thiago_cest.csv> [--commit HASH --commit-date ISO --prev-meta caminho]
import hashlib, datetime
def arg(name, default=None):
    return sys.argv[sys.argv.index(name)+1] if name in sys.argv else default
T = json.load(open(os.path.join(OUT, "tabelas.json"), encoding="utf-8"))
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
LISTS = ["cfop","cst_icms","csosn","cst_ipi","cst_pis","cst_ibscbs","cclasstrib","cest","modelos","lc116","nbs"]
meta = {
  "tabelas_atualizadas_em": datetime.date.today().isoformat(),
  "verificado_em": datetime.date.today().isoformat(),
  "fonte": "OCA l10n-brazil (l10n_br_fiscal/data) + tabela CEST CONFAZ (thiagovalim/sis-referencias)",
  "fonte_commit": arg("--commit", ""), "fonte_commit_data": arg("--commit-date", ""),
  "sha256": {"tabelas.json": sha(os.path.join(OUT,"tabelas.json")), "ncm.json": sha(os.path.join(OUT,"ncm.json"))},
  "contagens": {k: len(T.get(k, [])) for k in LISTS} | {"ncm": len(json.load(open(os.path.join(OUT,"ncm.json"), encoding="utf-8")))},
  "codigos": {k: sorted(x["c"] for x in T.get(k, [])) for k in ["cfop","cest","cclasstrib","cst_icms","csosn","cst_ibscbs"]},
}
prev = arg("--prev-meta")
if prev and os.path.exists(prev):
    P = json.load(open(prev, encoding="utf-8"))
    mudou = P.get("sha256") != meta["sha256"]
    if not mudou:
        meta["tabelas_atualizadas_em"] = P.get("tabelas_atualizadas_em", meta["tabelas_atualizadas_em"])
    rel = ["MUDOU" if mudou else "SEM_MUDANCA"]
    for k, novos in meta["codigos"].items():
        a = set(P.get("codigos", {}).get(k, [])); b = set(novos)
        if a != b: rel.append(f"{k}: +{len(b-a)} {sorted(b-a)[:15]} / -{len(a-b)} {sorted(a-b)[:15]}")
    for k, v in meta["contagens"].items():
        if P.get("contagens", {}).get(k) != v: rel.append(f"contagem {k}: {P.get('contagens',{}).get(k)} -> {v}")
    print("RELATORIO:: " + " | ".join(rel))
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("meta ok", meta["tabelas_atualizadas_em"], meta["contagens"])
