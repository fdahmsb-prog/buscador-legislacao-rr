#!/usr/bin/env python3
"""Gera data/calc_rtc.json a partir do código-fonte oficial da Calculadora de Tributos
da Receita Federal (github.com/ReceitaFederal/calculadora-rtc-regime-regular, licença MIT).

Uso: python3 -I build_calc_rtc.py <repo-calculadora> <saida.json> [--commit HASH]
Monta o banco SQLite a partir das migrações Flyway (flyway/sql) e exporta as tabelas
usadas no cálculo da CBS, do IBS e do Imposto Seletivo (regime regular)."""
import sqlite3, re, glob, os, sys, json, argparse

ap = argparse.ArgumentParser()
ap.add_argument("repo"); ap.add_argument("saida"); ap.add_argument("--commit", default="")
a = ap.parse_args()
base = os.path.join(a.repo, "flyway", "sql")

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys=OFF")
erros = []
def rodar(f):
    sql = open(f, encoding="utf-8").read()
    sql = re.sub(r"(?im)^\s*pragma\s+foreign_keys\s*=\s*on\s*;", "", sql)
    try: con.executescript(sql)
    except Exception as e: erros.append(f"{os.path.basename(f)}: {e}")
for f in sorted(glob.glob(os.path.join(base, "criacao", "B*.sql"))): rodar(f)
vk = lambda f: int(re.search(r"V(\d+)__", f).group(1))
for f in sorted(glob.glob(os.path.join(base, "manutencao", "V*.sql")), key=vk): rodar(f)
con.row_factory = sqlite3.Row
q = lambda s, *p: [dict(r) for r in con.execute(s, p)]

def vig(r, ini, fim): return {"ini": r[ini], "fim": r[fim]}

versao = q("select VRBD_VERSAO_BASE_DADO v, VRBD_DATA d, VRBD_DESCRICAO x from VERSAO_BASE_DADO order by VRBD_ID desc limit 1")
trat = {}
for r in q("select * from TRATAMENTO_TRIBUTARIO"):
    trat[r["TRTR_ID"]] = {"d": r["TRTR_DESCRICAO"], "aliq": r["TRTR_EXPRESSAO_ALIQUOTA"] or "", "ef": r["TRTR_EXPRESSAO_ALIQUOTA_EFETIVA"] or "",
        "bc": r["TRTR_EXPRESSAO_BASE_CALCULO"] or "", "tc": r["TRTR_EXPRESSAO_TRIBUTO_CALCULADO"] or "", "td": r["TRTR_EXPRESSAO_TRIBUTO_DEVIDO"] or "",
        "pd": r["TRTR_EXPRESSAO_PERCENTUAL_DIFERIMENTO"] or "", "vd": r["TRTR_EXPRESSAO_VALOR_DIFERIMENTO"] or "",
        "red": r["TRTR_IN_POSSUI_PERCENTUAL_REDUCAO"], "aj": r["TRTR_IN_POSSUI_AJUSTE"], "mono": r["TRTR_IN_POSSUI_MONOFASIA"]}

classes = []
for r in q("""select ct.*, s.SITR_CD, s.SITR_DESCRICAO, s.SITR_IND_GIBSCBS, s.SITR_IND_GRED, s.SITR_IND_GDIF
              from CLASSIFICACAO_TRIBUTARIA ct join SITUACAO_TRIBUTARIA s on s.SITR_ID = ct.CLTR_SITR_ID order by ct.CLTR_CD"""):
    cid = r["CLTR_ID"]
    c = {"id": cid, "cd": r["CLTR_CD"], "d": r["CLTR_DESCRICAO"], "cst": r["SITR_CD"], "cstd": r["SITR_DESCRICAO"],
         "tipo": r["CLTR_TIPO_ALIQUOTA"], "ini": r["CLTR_INICIO_VIGENCIA"], "fim": r["CLTR_FIM_VIGENCIA"],
         "gibs": r["SITR_IND_GIBSCBS"], "gred": r["SITR_IND_GRED"], "gdif": r["SITR_IND_GDIF"],
         "nom": r["CLTR_NOMENCLATURA"], "anexo": r["CLTR_ANEXO"], "mem": r["CLTR_MEMORIA_CALCULO"],
         "credCbs": r["CLTR_IN_APROPRIACAO_CREDITOS_ADQUIRENTES_CBS"], "credIbs": r["CLTR_IN_APROPRIACAO_CREDITOS_ADQUIRENTES_IBS"],
         "trat": [dict(t=t["TRCL_TRTR_ID"], **vig(t, "TRCL_INICIO_VIGENCIA", "TRCL_FIM_VIGENCIA")) for t in q("select * from TRATAMENTO_CLASSIFICACAO where TRCL_CLTR_ID=?", cid)],
         "red": [dict(t=p["PERE_TBTO_ID"], v=p["PERE_VALOR"], **vig(p, "PERE_INICIO_VIGENCIA", "PERE_FIM_VIGENCIA")) for p in q("select * from PERCENTUAL_REDUCAO where PERE_CLTR_ID=?", cid)],
         "aliq": [dict(t=p["AADV_TBTO_ID"], v=p["AADV_VALOR"], **vig(p, "AADV_INICIO_VIGENCIA", "AADV_FIM_VIGENCIA")) for p in q("select * from ALIQUOTA_AD_VALOREM where AADV_CLTR_ID=?", cid)],
         "fund": [f["FDLG_TEXTO_CURTO"] or f["FDLG_REFERENCIA_NORMATIVA"] or "" for f in q("""select fl.* from FUNDAMENTACAO_CLASSIFICACAO fc join FUNDAMENTACAO_LEGAL fl on fl.FDLG_ID=fc.FDCL_FDLG_ID where fc.FDCL_CLTR_ID=?""", cid)],
         "ref": [f["FDLG_REFERENCIA_NORMATIVA"] or "" for f in q("""select fl.* from FUNDAMENTACAO_CLASSIFICACAO fc join FUNDAMENTACAO_LEGAL fl on fl.FDLG_ID=fc.FDCL_FDLG_ID where fc.FDCL_CLTR_ID=?""", cid)]}
    classes.append(c)

ref = [dict(t=r["ALRE_TBTO_ID"], v=r["ALRE_VALOR"], **vig(r, "ALRE_INICIO_VIGENCIA", "ALRE_FIM_VIGENCIA")) for r in q("select * from ALIQUOTA_REFERENCIA")]
padrao = [dict(t=r["ALRE_TBTO_ID"], v=r["ALPA_VALOR"], uf=r["ALPA_UF_CD"], mun=r["ALPA_MUNI_CD"], forma=r["ALPA_FORMA_APLICACAO"], **vig(r, "ALPA_INICIO_VIGENCIA", "ALPA_FIM_VIGENCIA"))
          for r in q("select p.*, r.ALRE_TBTO_ID from ALIQUOTA_PADRAO p join ALIQUOTA_REFERENCIA r on r.ALRE_ID=p.ALPA_ALRE_ID")]
redGov = [dict(v=r["RCGO_VALOR"], **vig(r, "RCGO_INICIO_VIGENCIA", "RCGO_FIM_VIGENCIA")) for r in q("select * from REDUTOR_COMPRA_GOVERNAMENTAL")]
isAdv = [dict(ncm=r["AAVP_NCM_CD"], v=r["AADV_VALOR"], **vig(r, "AAVP_INICIO_VIGENCIA", "AAVP_FIM_VIGENCIA"))
         for r in q("select p.AAVP_NCM_CD, p.AAVP_INICIO_VIGENCIA, p.AAVP_FIM_VIGENCIA, a.AADV_VALOR from ALIQUOTA_AD_VALOREM_PRODUTO p join ALIQUOTA_AD_VALOREM a on a.AADV_ID=p.AAVP_AADV_ID where a.AADV_TBTO_ID=1")]
isRem = [dict(ncm=r["AARP_NCM_CD"], v=r["AARE_VALOR"], un=r["UNMD_SIGLA"] if "UNMD_SIGLA" in r.keys() else "", **vig(r, "AARP_INICIO_VIGENCIA", "AARP_FIM_VIGENCIA"))
         for r in q("select p.*, a.AARE_VALOR, u.* from ALIQUOTA_AD_REM_PRODUTO p join ALIQUOTA_AD_REM a on a.AARE_ID=p.AARP_AARE_ID left join UNIDADE_MEDIDA u on u.UNMD_ID=a.AARE_UNMD_ID")]
ufs = q("select UF_CD cd, UF_SIGLA s, UF_NOME n from UF order by UF_SIGLA") if [c for c in con.execute("pragma table_info(UF)") if c[1]=="UF_SIGLA"] else []

out = {"fonte": "Receita Federal – Calculadora de Tributos (regime regular), github.com/ReceitaFederal/calculadora-rtc-regime-regular, licença MIT",
       "commit": a.commit, "versaoBase": versao[0] if versao else None, "erros": erros,
       "tributos": {1: "IS", 2: "CBS", 3: "IBS UF", 4: "IBS Mun"},
       "tratamentos": trat, "classes": classes, "aliqRef": ref, "aliqPadrao": padrao, "redutorGov": redGov,
       "isAdValorem": isAdv, "isAdRem": isRem, "ufs": ufs}
os.makedirs(os.path.dirname(os.path.abspath(a.saida)), exist_ok=True)
json.dump(out, open(a.saida, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"calc_rtc.json: {len(classes)} cClassTrib, {len(trat)} tratamentos, {len(ref)} alíquotas de referência, IS {len(isAdv)}+{len(isRem)} NCM; base {versao[0]['v'] if versao else '?'}; avisos {len(erros)}")
