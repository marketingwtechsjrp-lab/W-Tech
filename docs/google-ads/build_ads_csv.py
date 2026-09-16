# -*- coding: utf-8 -*-
"""Gera a planilha de upload em massa do Google Ads (3 campanhas Search)."""
import csv, sys

SUFFIX = "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}"
URL_ONLINE = "https://w-techbrasil.com.br/curso-suspensao-piloto"
URL_LISBOA = "https://w-techbrasil.com.br/lp-wtech-lisboa-nov"
URL_CURSOS = "https://w-techbrasil.com.br/cursos"

C1 = "[Search] Curso Online Piloto | BR"
C2 = "[Search] Curso Presencial Lisboa | PT"
C3 = "[Search] Cursos Presenciais | BR"

campaigns = [
    # nome, orçamento diário (BRL), idioma(s), local
    (C1, "60,00", "pt", "Brazil", URL_ONLINE),
    (C2, "150,00", "pt", "Portugal", URL_LISBOA),
    (C3, "60,00", "pt", "Brazil", URL_CURSOS),
]

# ---------------------------------------------------------------- grupos
groups = {
 C1: {
  "Regulagem de Suspensão / SAG": [
   "curso de regulagem de suspensão","curso de suspensão de moto","curso online de suspensão","como regular a suspensão da moto",
   "curso de sag da moto","regulagem de sag","curso de suspensão off-road","aprender a regular suspensão de moto",
   "curso de cliques de suspensão","curso de ergonomia da moto","curso de suspensão para pilotos","como ajustar suspensão da moto"],
  "Trilha, Enduro e Motocross": [
   "curso de suspensão para trilha","curso de suspensão enduro","curso de suspensão motocross","ajuste de suspensão off road",
   "curso de suspensão para hard enduro","regulagem de suspensão para trilha","curso de suspensão big trail","como regular suspensão para trilha",
   "curso de pilotagem off road suspensão","curso de suspensão para enduro e motocross"],
  "Mecânico e Revalvulação": [
   "curso de mecânica de suspensão","curso de revalvulação de suspensão","curso de preparação de suspensão de moto","curso técnico de suspensão de moto",
   "curso para mecânico de suspensão","curso de válvulas de suspensão","curso de customização de suspensão","curso online para mecânico de moto suspensão",
   "curso de suspensão para oficina"],
  "Marca W-Tech": [
   "curso w-tech suspensão","w-tech brasil curso online","curso wtech","alex crepaldi curso","w-tech curso de suspensão",
   "curso wtech suspensão online","w-tech suspensões curso","rafa paschoalin curso"],
 },
 C2: {
  "Curso de Suspensões Lisboa / Sintra": [
   "curso de suspensão de motas lisboa","curso de suspensões sintra","formação suspensão de motas portugal","curso presencial suspensão moto portugal",
   "curso de suspensões motas portugal","formação técnica motas lisboa","curso de suspensões lisboa","curso presencial motas sintra"],
  "Afinação / Regulação de Suspensão": [
   "afinação de suspensão de mota","regulação de suspensão de mota","curso de afinação de suspensões","curso de mecânica de motas suspensão",
   "como afinar a suspensão da mota","curso de suspensões para motas","afinação de suspensões curso","curso de regulação de suspensões mota"],
  "Marca / Evento W-Tech Lisboa": [
   "w-tech lisboa curso","curso w-tech portugal","alex crepaldi lisboa","formação w-tech suspensões","w-tech europa curso",
   "curso wtech sintra","w-tech lisboa 2ª edição","wtech suspensões portugal"],
  "Mecânico / Oficina Portugal": [
   "curso para mecânico de motas","curso técnico suspensão motas","curso de revalvulação suspensão portugal","formação profissional motas portugal",
   "curso de mecânica de motas portugal","curso profissional suspensões motas","formação técnica suspensões motas","curso de oficina de motas suspensão"],
 },
 C3: {
  "Curso Presencial de Suspensão": [
   "curso presencial de suspensão de moto","curso presencial de regulagem de suspensão","curso prático de suspensão de moto","imersão em suspensão de moto",
   "curso presencial de sag e suspensão","curso presencial de mecânica de suspensão","workshop de suspensão de moto","curso presencial w-tech",
   "curso de fim de semana suspensão moto"],
  "Mecânico / Oficina / Profissionalização": [
   "curso profissionalizante de suspensão","curso de especialização em suspensão de moto","curso de revalvulação presencial","curso para abrir oficina de suspensão",
   "curso técnico presencial de suspensão","curso de preparação de suspensão presencial","curso presencial para mecânico de moto","curso de suspensão para donos de oficina"],
  "Marca / Agenda de Turmas": [
   "cursos w-tech brasil","agenda de cursos w-tech","turmas w-tech suspensão","w-tech curso presencial","próximas turmas w-tech",
   "cursos wtech brasil presencial","calendário de cursos w-tech","alex crepaldi curso presencial"],
  "Trilha / Enduro / Motocross Presencial": [
   "curso presencial de suspensão enduro","curso presencial de suspensão motocross","curso presencial de suspensão off road","curso presencial de suspensão trilha",
   "workshop de suspensão off road","curso presencial de preparação off road","imersão suspensão enduro e motocross","curso presencial para pilotos de trilha"],
 },
}

# ---------------------------------------------------------------- negativas
MASTER_NEG = [
 "grátis","gratuito","gratuita","de graça","pdf","download","ebook","manual pdf","apostila pdf","curso gratuito",
 "emprego","vaga de emprego","vagas de emprego","trabalho","salário","currículo","contratando","contrata-se","estágio",
 "carro","automóvel","caminhão","ônibus","bicicleta","bike","patinete","suspensão de carro","suspensão automotiva carro",
 "comprar amortecedor","preço de amortecedor","peça de suspensão preço","revenda de suspensão",
 "youtube","jogo","game","hot wheels","grau de moto","som automotivo",
 "curso de mecânica de carro","curso de elétrica automotiva","curso de motor","curso de injeção eletrônica",
 "reclame aqui","golpe","é confiável","cupom","cupom de desconto",
]
NEG = {
 C1: MASTER_NEG + ["curso presencial","turma presencial","imersão presencial","evento presencial","com hospedagem","hotel do curso","lisboa","sintra","portugal","europa","final de semana intensivo","vagas por turma"],
 C2: MASTER_NEG + ["online","curso online","ead","12 meses de acesso","assistir quando quiser","kiwify","hotmart","em reais","brasil","curso à distância","r$"],
 C3: MASTER_NEG + ["online","curso online","ead","12 meses de acesso","assistir quando quiser","kiwify","hotmart","lisboa","sintra","portugal","europa","em portugal"],
}

# ---------------------------------------------------------------- anúncios (RSA)
ads = {
 (C1,"Regulagem de Suspensão / SAG"): dict(
  h=["Curso de Suspensão de Moto","Aprenda a Regular o SAG","Curso Online de Suspensão","Do Zero ao Acerto Perfeito","SAG, Molas, Cliques e Óleo",
     "12 Meses de Acesso Online","Garantia Incondicional","R$ 347 à Vista ou 12x","11 Módulos + Bônus Exclusivo","Com Alex Crepaldi, W-Tech",
     "Curso p/ Trilha e Enduro","Certificado Digital W-Tech","Assista Onde e Quando Quiser","Menos Dor, Mais Controle","Bônus: Planilhas de SAG/PSI"],
  d=["Curso online de regulagem de suspensão off-road: SAG, molas, cliques e óleo.",
     "Do zero ao acerto: prática real, 11 módulos + bônus exclusivo com Paschoalin.",
     "Acesso por 12 meses, certificado digital e garantia incondicional de 7 dias.",
     "347 à vista ou 12x de R$ 35,89. Bônus: planilhas de SAG e PSI grátis."],
  p=("curso","suspensao"), url=URL_ONLINE),
 (C1,"Trilha, Enduro e Motocross"): dict(
  h=["Suspensão p/ Trilha e Enduro","Curso de Suspensão Off-Road","Regule a Suspensão da Trilha","Ideal p/ Motocross e Enduro","Curso de Suspensão Enduro",
     "Fim do Achismo na Trilha","Mais Tração nas Subidas","Moto Sem Espalhar nas Curvas","Curso Online p/ Off-Road","Do Zero ao Acerto de Trilha",
     "Menos Fadiga nos Braços","Garantia de 7 Dias","R$ 347 à Vista, 12 Meses","Alex Crepaldi Ensina","Suspensão Certa p/ Hard Enduro"],
  d=["Regulagem de suspensão para trilha, enduro e motocross, do zero ao acerto fino.",
     "Aprenda com Alex Crepaldi: SAG, molas, cliques e ergonomia para o off-road.",
     "12 meses de acesso, certificado digital e garantia incondicional de 7 dias.",
     "Chega de sentir a moto quicar. Regule sua suspensão com quem é referência."],
  p=("curso","off-road"), url=URL_ONLINE),
 (C1,"Mecânico e Revalvulação"): dict(
  h=["Curso p/ Mecânico de Suspensão","Agregue Serviço na Oficina","Curso de Revalvulação","Especialize-se em Suspensão","O Serviço Mais Lucrativo",
     "Curso Técnico W-Tech","Domine Molas, Óleo e Cliques","Saia da Revisão Básica","Certificado Digital W-Tech","Fidelize Clientes na Oficina",
     "Curso 100% Online e Prático","Aprenda com Quem é Referência","R$ 347 à Vista ou 12x","Curso de Válvulas e Shims","+3 Mil Mecânicos Formados"],
  d=["Curso técnico de suspensão para mecânicos e donos de oficina, 100% online.",
     "Agregue o serviço mais lucrativo da oficina: acerto e revalvulação de suspensão.",
     "+3.000 mecânicos e pilotos já formados pela W-Tech. Certificado digital incluso.",
     "347 à vista ou 12x de R$ 35,89. Garantia incondicional de 7 dias para testar."],
  p=("curso","mecanico"), url=URL_ONLINE),
 (C1,"Marca W-Tech"): dict(
  h=["Curso Oficial W-Tech Brasil","Com Alex Crepaldi","Referência em Suspensão","Fundador da W-Tech Ensina","Curso W-Tech 100% Online",
     "+3 Mil Alunos Formados","Módulo Bônus c/ Paschoalin","A Escola Técnica W-Tech","Curso Online, Selo W-Tech","Alex Crepaldi: Suspensão",
     "Garantia de 7 Dias","12 Meses de Acesso","Certificado Oficial W-Tech","W-Tech: 11 Módulos + Bônus","Marca Referência em Off-Road"],
  d=["O curso oficial da W-Tech Brasil, com Alex Crepaldi. Referência nacional.",
     "Mais de 3.000 mecânicos e pilotos já formados pela metodologia W-Tech.",
     "11 módulos + bônus exclusivo com Rafa Paschoalin. Acesso por 12 meses.",
     "Curso online com certificado digital e garantia incondicional de 7 dias."],
  p=("w-tech","curso"), url=URL_ONLINE),
 (C2,"Curso de Suspensões Lisboa / Sintra"): dict(
  h=["Curso de Suspensões em Lisboa","W-Tech Lisboa: 2ª Edição","23, 24 e 25 de Outubro","Formação em Sintra, Portugal","3 Dias de Imersão Técnica",
     "Art on Wheels Garage","Certificação W-Tech","Com Alex Crepaldi","Sinal de Apenas €150","Vagas Estritamente Limitadas",
     "Curso Presencial p/ Motas","Prática em Bancada Real","Garanta Já a Sua Vaga","Reserve com Sinal de €150","Padrão Internacional W-Tech"],
  d=["Formação presencial de 3 dias em Sintra, com Alex Crepaldi. 23 a 25/10.",
     "Reserve sua vaga com sinal de €150 ou pague o valor integral de €480.",
     "Hidráulica, molas, valving e rebuild completo. Certificação internacional.",
     "Vagas estritamente limitadas para a 2ª edição em Sintra, Portugal."],
  p=("lisboa","curso"), url=URL_LISBOA),
 (C2,"Afinação / Regulação de Suspensão"): dict(
  h=["Afinação de Suspensão de Mota","Curso de Afinação de Motas","Regulação Profissional de Mota","Aprenda a Afinar a Suspensão","Formação Técnica em Sintra",
     "Curso de Mecânica de Motas","3 Dias 100% Práticos","Com Certificação W-Tech","Domina a Hidráulica da Mota","Reserva já com Sinal de €150",
     "Vagas Muito Limitadas","Formação com Alex Crepaldi","Curso de Suspensões Motas","Formação Prática e Técnica","Nível Internacional W-Tech"],
  d=["Curso presencial de afinação de suspensões de motas, com Alex Crepaldi.",
     "3 dias de formação técnica em Sintra: hidráulica, molas e valving.",
     "Reserva a tua vaga com sinal de €150. Vagas estritamente limitadas.",
     "Certificação internacional W-Tech. 2ª edição em Sintra, 23 a 25/10."],
  p=("afinacao","suspensao"), url=URL_LISBOA),
 (C2,"Marca / Evento W-Tech Lisboa"): dict(
  h=["W-Tech Lisboa II","Curso Oficial W-Tech Europa","2ª Edição em Portugal","Com Alex Crepaldi","Sucesso da 1ª Edição",
     "Veja Vídeos da 1ª Edição","Parceria Oficial Liqui Moly","W-Tech: Padrão Internacional","Formação W-Tech em Sintra","A Metodologia W-Tech",
     "Vagas Limitadas: Garanta Já","Curso Wtech Sintra 2026","Referência em Suspensão","23 a 25 de Outubro 2026","Certificação W-Tech"],
  d=["A 2ª edição oficial do curso W-Tech em Portugal. Vagas muito limitadas.",
     "Com Alex Crepaldi e apoio Liqui Moly. Certificação internacional W-Tech.",
     "Prática real em bancada: hidráulica, valving e rebuild completo.",
     "Formação de referência internacional, agora na 2ª edição em Sintra."],
  p=("w-tech","lisboa"), url=URL_LISBOA),
 (C2,"Mecânico / Oficina Portugal"): dict(
  h=["Curso para Mecânico de Motas","Formação Técnica p/ Oficinas","Curso de Revalvulação PT","Especializa-te em Suspensão","Agrega Valor à Tua Oficina",
     "Curso Técnico W-Tech PT","Domina Molas, Óleo, Valving","Formação Profissional Motas","Certificação Internacional","3 Dias, Teoria e Prática",
     "Com Alex Crepaldi","Reserva com Sinal de €150","Curso Presencial em Sintra","Vagas Muito Limitadas","Formação p/ Donos de Oficina"],
  d=["Curso técnico presencial para mecânicos e oficinas de motas em Portugal.",
     "Agrega o serviço de suspensões à tua oficina. Formação com Alex Crepaldi.",
     "3 dias de teoria e prática em bancada real, com certificação internacional.",
     "Vagas estritamente limitadas. Reserva já com sinal de €150."],
  p=("mecanico","motas"), url=URL_LISBOA),
 (C3,"Curso Presencial de Suspensão"): dict(
  h=["Curso Presencial de Suspensão","Aprenda na Prática, ao Vivo","Imersão Técnica W-Tech","Curso com Alex Crepaldi","Turmas em Todo o Brasil",
     "Prática 100% Presencial","Referência Nacional","Certificado W-Tech","Mãos na Massa, de Verdade","Do Zero ao Acerto Fino",
     "Formação Técnica Intensiva","Vagas Limitadas por Turma","+3 Mil Alunos Formados","Pagamento por Pix ou Cartão","Ver Turmas Abertas Agora"],
  d=["Curso presencial e prático de regulagem de suspensão, com Alex Crepaldi.",
     "Turmas em várias cidades do Brasil. Vagas limitadas por turma.",
     "+3.000 mecânicos e pilotos já formados pela metodologia W-Tech.",
     "Veja as próximas turmas e garanta sua vaga. Pagamento por Pix ou cartão."],
  p=("cursos","presencial"), url=URL_CURSOS),
 (C3,"Mecânico / Oficina / Profissionalização"): dict(
  h=["Curso Profissionalizante","Especialize-se em Suspensão","Curso p/ Mecânico de Moto","Abra sua Oficina de Suspensão","Curso de Revalvulação",
     "Agregue Valor à Oficina","Formação Técnica Completa","Certificado Profissional","Curso Técnico Presencial","Com Alex Crepaldi",
     "O Serviço Mais Lucrativo","Turmas em Todo o Brasil","Referência Nacional","Domine Molas, Óleo e Shims","Vagas Limitadas por Turma"],
  d=["Curso presencial e técnico para mecânicos e donos de oficina de motos.",
     "Agregue o serviço mais lucrativo da oficina: revalvulação de suspensão.",
     "Formação técnica completa, com certificado e prática 100% presencial.",
     "Turmas em várias cidades. Aprenda com Alex Crepaldi e vire referência."],
  p=("cursos","mecanico"), url=URL_CURSOS),
 (C3,"Marca / Agenda de Turmas"): dict(
  h=["Cursos W-Tech Brasil","Veja a Agenda de Cursos","Turmas W-Tech Suspensão","Próximas Turmas Abertas","Curso Oficial W-Tech",
     "Com Alex Crepaldi","Referência Nacional","+3 Mil Alunos Formados","Baixe a Agenda em PDF","Calendário Nacional 2026",
     "Cursos em Todo o Brasil","Certificado Oficial W-Tech","Escolha sua Cidade e Data","Garanta Já a Sua Vaga","Turmas Sempre Atualizadas"],
  d=["Confira a agenda nacional de cursos presenciais W-Tech e escolha a sua.",
     "Turmas em várias cidades do Brasil, com certificado e vagas limitadas.",
     "Baixe a agenda completa em PDF e escolha a turma mais perto de você.",
     "Curso oficial com Alex Crepaldi e certificado W-Tech reconhecido."],
  p=("cursos","agenda"), url=URL_CURSOS),
 (C3,"Trilha / Enduro / Motocross Presencial"): dict(
  h=["Suspensão Presencial p/ Trilha","Curso Presencial de Trilha","Suspensão p/ Motocross","Suspensão p/ Enduro Real","Curso Presencial Off-Road",
     "Prática Real em Trilha","Imersão p/ Pilotos Off-Road","Fim do Achismo na Trilha","Com Alex Crepaldi","Turmas em Todo o Brasil",
     "Certificado W-Tech","Vagas Limitadas por Turma","Referência Nacional","Setup Ideal p/ Cada Terreno","Mãos na Massa, de Verdade"],
  d=["Curso presencial de suspensão para trilha, enduro e motocross, na prática.",
     "Mãos na massa em bancada real: molas, óleo, cliques e setup de terreno.",
     "Turmas em várias cidades do Brasil, com certificado oficial W-Tech.",
     "Vagas limitadas por turma. Garanta a sua com Alex Crepaldi, ao vivo."],
  p=("cursos","off-road"), url=URL_CURSOS),
}

# ---------------------------------------------------------------- validação
erros = []
for (c, g), a in ads.items():
    assert (c in groups and g in groups[c]), (c, g)
    for h in a["h"]:
        if len(h) > 30: erros.append(f"TÍTULO >30 ({len(h)}): {h}")
    for d in a["d"]:
        if len(d) > 90: erros.append(f"DESCRIÇÃO >90 ({len(d)}): {d}")
    if len(a["h"]) < 3 or len(a["d"]) < 2: erros.append(f"poucos ativos em {c}/{g}")
    for pth in a["p"]:
        if len(pth) > 15: erros.append(f"PATH >15: {pth}")
if erros:
    print("\n".join(erros)); sys.exit(1)

# ---------------------------------------------------------------- CSV
cols = ["Row Type","Action","Campaign status","Campaign","Campaign type","Networks","Budget","Budget type","Bid strategy type","Language","Location",
        "Final URL suffix","EU political ads",
        "Ad group status","Ad group","Ad group type",
        "Keyword status","Keyword","Type","Level","Negative keyword",
        "Ad status","Ad type","Path 1","Path 2","Final URL"] + [f"Headline {i}" for i in range(1,16)] + [f"Description {i}" for i in range(1,5)]
rows = []
def row(**kw):
    r = {c: "" for c in cols}; r.update(kw); rows.append(r)

for name, budget, lang, loc, url in campaigns:
    row(**{"Row Type":"Campaign","Action":"Add","Campaign status":"Paused","Campaign":name,"Campaign type":"Search","Networks":"Google search",
           "Budget":budget,"Budget type":"Daily","Bid strategy type":"Maximize Conversions","Language":lang,"Location":loc,
           "Final URL suffix":SUFFIX,"EU political ads":"No"})
for c, gs in groups.items():
    for g, kws in gs.items():
        row(**{"Row Type":"Ad group","Action":"Add","Campaign":c,"Ad group status":"Enabled","Ad group":g,"Ad group type":"Standard"})
        for kw in kws:
            for t in ("Phrase match","Exact match"):
                row(**{"Row Type":"Keyword","Action":"Add","Campaign":c,"Ad group":g,"Keyword status":"Enabled","Keyword":kw,"Type":t})
for c, negs in NEG.items():
    for n in negs:
        row(**{"Row Type":"Negative keyword","Action":"Add","Campaign":c,"Level":"Campaign","Negative keyword":n,"Type":"Phrase match"})
for (c, g), a in ads.items():
    r = {"Row Type":"Ad","Action":"Add","Campaign":c,"Ad group":g,"Ad status":"Enabled","Ad type":"Responsive search ad",
         "Path 1":a["p"][0],"Path 2":a["p"][1],"Final URL":a["url"]}
    for i, h in enumerate(a["h"], 1): r[f"Headline {i}"] = h
    for i, d in enumerate(a["d"], 1): r[f"Description {i}"] = d
    row(**r)

out = "/Users/daniel/Downloads/wtech-google-ads-campanhas.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
from collections import Counter
print(out, Counter(r["Row Type"] for r in rows))
