// @ts-nocheck
/* eslint-disable */
// ─── IMPORTS CATALOGUE (lot 7) ──────────────────────────────────────────────
import { Q_ALI_01, Q_ALI_02, Q_ALI_03, Q_CAN_01, Q_CAN_02, Q_CAR_01, Q_FIB_01, Q_FIB_02, Q_FIB_03, Q_GAS_01, Q_GAS_02, Q_GAS_03, Q_GEO_01, Q_GEO_02, Q_GEO_03, Q_GEO_04, Q_GEO_05, Q_GEO_06, Q_INF_01, Q_INF_02, Q_INF_03, Q_INF_04, Q_INF_05, Q_MOD_01, Q_MOD_02, Q_MOD_03, Q_NEU_01, Q_NEU_02, Q_NEU_03, Q_NEU_04, Q_NEU_05, Q_NEU_06, Q_NEU_07, Q_NEU_08, Q_NEU_09, Q_NEU_10, Q_NEU_11, Q_NEU_12, Q_PED_01, Q_PED_02, Q_PED_03, Q_PNE_01, Q_SOM_01, Q_SOM_02, Q_SOM_03, Q_SOM_04, Q_SOM_05, Q_SOM_06, Q_SOM_07, Q_STR_01, Q_STR_02, Q_STR_03, Q_STR_04, Q_STR_05, Q_STR_06, Q_STR_08, Q_TAB_01, Q_TAB_02, Q_TAB_03, Q_TAB_04, Q_TAB_05, Q_URO_01, Q_URO_02 } from './questionnaires/index';
// ═══════════════════════════════════════════════════════════════════════════════
// Wellneuro SIIN — Questions.gs — DÉFINITIF v4 corrigé Dev
// Dr Martial Cayre — 23/06/2026
// 14 thématiques certifiées · ~67 entrées catalogue
// ─── Corrections v2 (session précédente) :
//   STR (PSS-10 seuils · Karasek 4D) · PNE_01 · GEO_01 Tinetti /28 observateur
//   GEO_02 SARC-F · CAN_02 (15 corrections) · CAR_01 (9 corrections)
//   URO_01 IPSS (3 corrections) · URO_02 Catalogue Mictionnel (nouveau)
//   Recatégorisations : Q_STR_07 → Q_NEU_11 (HAD)
// ─── Corrections v3 (23/06/2026 — compilation définitive) :
//   Q_NEU_01 : BDI-II 21 items → BDI 13 items (Freston 1994) — correction version
//   Q_NEU_02 MADRS : 7 niveaux → 4 niveaux (0/2/4/6) + MA1 restauré + MA10 fantôme supprimé
//   Q_NEU_05 U33 : 'J'aimais' → 'J'aime' (imparfait incohérent)
//   Q_NEU_12 IDTAS-AE : restauré depuis Q_SOM_08 SUPPRIMÉ (nouveau ID · 4 parties)
//   Q_STR_08 WART : restauré depuis stub SUPPRIMÉ (25 items · 1-4 · /100)
//   Q_GEO_03 Alzheimer (AQ) : ajouté (21 items OUI/NON · /21)
//   Q_GEO_04 MMSE GRECO : ajouté (30 items · /30 · clinicien ⚠️)
//   Q_GEO_05 QDRS : ajouté (10 domaines · sum_decimal · /30)
//   Q_GEO_06 Test 5 mots Dubois : ajouté (sum_two_phases · /10 · clinicien ⚠️)
// ─── Escalades SIIN documentées :
//   BDI version label · MADRS options · MMSE seuils HAS 2011 · AQ pondération
// ═══════════════════════════════════════════════════════════════════════════════

// ─── HELPERS PARTAGÉS ───────────────────────────────────────────────────────
// Jeux d'options standards (O_*) et fabriques d'items (q/qn/qs) déplacés dans
// ./questionnaires/shared (lot 7). Importés en tête de fichier.

// ─── CATALOGUE ───────────────────────────────────────────────────────────────

export const QUESTIONNAIRE_CATALOGUE = {

// ════════════════════════════════════════════════════════
// STRESS & AXE HPA
// ════════════════════════════════════════════════════════

Q_STR_01,


Q_STR_02,


Q_STR_04,


Q_STR_05,


// HAD recatégorisé Stress → Neuro-psychologie — certifié v2 — 22/06/2026
Q_NEU_11,


Q_NEU_12,


Q_STR_08,



// ════════════════════════════════════════════════════════
// SOMMEIL
// ════════════════════════════════════════════════════════

Q_SOM_01,


Q_SOM_02,


Q_SOM_06,


Q_SOM_07,


// ════════════════════════════════════════════════════════
// INFLAMMATION & IMMUNITÉ
// ════════════════════════════════════════════════════════

Q_INF_01,


Q_INF_02,


Q_INF_03,


Q_INF_04,


Q_INF_05,


// ════════════════════════════════════════════════════════
// INTESTIN & MICROBIOTE
// ════════════════════════════════════════════════════════

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN TFD v2021
// 31 items · 5 catégories · max 93 · double période (3 mois/3 semaines)
// Seuils par catégorie et global confirmés sur PDF PRO
Q_GAS_01,


// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Bristol
// Outil qualitatif pur (pas de score numérique) — groupes : 1-2=Constipation · 3-4=Normal · 5-6-7=Diarrhée
// Affichage illustré des 7 types recommandé
Q_GAS_03,


// ════════════════════════════════════════════════════════
// FIBROMYALGIE
// ════════════════════════════════════════════════════════

Q_FIB_01,


Q_FIB_02,


// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE
// ════════════════════════════════════════════════════════

Q_NEU_01,


Q_NEU_04,


Q_NEU_05,


Q_NEU_07,


Q_NEU_09,


Q_NEU_10,


// ── CARDIOLOGIE ──────────────────────────────────────────────────────────────
Q_CAR_01,


// ── TABACOLOGIE ───────────────────────────────────────────────────────────────
Q_TAB_01,


Q_TAB_02,


// ── PNEUMOLOGIE ───────────────────────────────────────────────────────────────
Q_PNE_01,


// ── UROLOGIE ──────────────────────────────────────────────────────────────────
Q_URO_01,


// ── UROLOGIE — Catalogue Mictionnel ───────────────────────────────────────────
Q_URO_02,


// ── PÉDIATRIE ─────────────────────────────────────────────────────────────────────────────
Q_PED_01,


// ── MODE DE VIE — AUDIT ───────────────────────────────────────────────────────────────
Q_MOD_03,



// ════════════════════════════════════════════════════════
// ALIMENTAIRE
// ════════════════════════════════════════════════════════

Q_ALI_01,


Q_ALI_02,


Q_ALI_03,



// ════════════════════════════════════════════════════════
// GASTRO-ENTÉROLOGIE
// ════════════════════════════════════════════════════════

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Score de Francis
// Formule : FR1 + (FR2×10) + FR3 + (100-FR4) + FR5 = max 500
// Seuils : <70 normal · 70-300 significatif · >300 sévère
// ⚠️ GAP : EVA 0-100% idéale — alternative discrète 0/25/50/75/100 implémentée
Q_GAS_02,


// ════════════════════════════════════════════════════════
// MODE DE VIE
// ════════════════════════════════════════════════════════

Q_MOD_01,


Q_MOD_02,



// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE (MADRS, SIGH-SAD-SA, MMT, ECAB)
// ════════════════════════════════════════════════════════

Q_NEU_02,


Q_NEU_03,


Q_NEU_06,


Q_NEU_08,



// ════════════════════════════════════════════════════════
// SOMMEIL (Berlin, IRLS, Horne, IDTAS-AE)
// ════════════════════════════════════════════════════════

Q_SOM_03,


Q_SOM_04,


Q_SOM_05,


// Q_SOM_08 IDTAS-AE — SUPPRIMÉ : absent des PDF SIIN (certification 22/06/2026)


// ════════════════════════════════════════════════════════
// STRESS (Cungi, Karasek)
// ════════════════════════════════════════════════════════

Q_STR_03,


Q_STR_06,



// ════════════════════════════════════════════════════════
// FIBROMYALGIE (ELFE)
// ════════════════════════════════════════════════════════

Q_FIB_03,


// ════════════════════════════════════════════════════════
// GÉRONTOLOGIE (Tinetti, SARC-F)
// ════════════════════════════════════════════════════════

Q_GEO_01,


Q_GEO_02,



// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// GÉRONTOLOGIE — suite (Q_GEO_03 à Q_GEO_06)
// Ajout 23/06/2026 — certifiés session NEU/GEO
// ════════════════════════════════════════════════════════

Q_GEO_03,


Q_GEO_04,


Q_GEO_05,


Q_GEO_06,


// TABACOLOGIE (QCT2 Gilliard, Cannabis, Di Franza)
// ════════════════════════════════════════════════════════

Q_TAB_03,


Q_TAB_04,


Q_TAB_05,



// ════════════════════════════════════════════════════════
// PÉDIATRIE (Conners enseignant, Conners parents)
// ════════════════════════════════════════════════════════

Q_PED_02,


Q_PED_03,



// ════════════════════════════════════════════════════════
// CANCÉROLOGIE (QLQ-C30, QLQ-BR23)
// ════════════════════════════════════════════════════════

Q_CAN_01,

Q_CAN_02,


}; // fin QUESTIONNAIRE_CATALOGUE

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS MOTEUR
// ═══════════════════════════════════════════════════════════════════════════════


// ─── ACCES CATALOGUE POUR CODE.GS ────────────────────────────────────────────
// Dans Google Apps Script V8, les variables globales déclarées dans un autre
// fichier peuvent parfois ne pas être directement visibles depuis Code.gs.
// Ces fonctions globales servent d'interface stable entre Questions.gs et Code.gs.
function getQuestionnaireCatalogue() {
  return QUESTIONNAIRE_CATALOGUE;
}

function getQuestionnaireIds() {
  return Object.keys(QUESTIONNAIRE_CATALOGUE).sort();
}

function getQuestionnaire(idQ) {
  const q = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!q) return null;
  return JSON.parse(JSON.stringify(q, (k, val) => {
    if (k === 'v') return undefined;
    return val;
  }));
}

// Version sérialisable pour le client (remplace v/l par value/label)
function getQuestionnaireForClient(idQ) {
  const def = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!def) return null;
  function normalize(obj) {
    if (Array.isArray(obj)) return obj.map(normalize);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const k in obj) {
        if (k === 'v') out['value'] = obj[k];
        else if (k === 'l') out['label'] = obj[k];
        else out[k] = normalize(obj[k]);
      }
      return out;
    }
    return obj;
  }
  return normalize(def);
}

export function calculateScore(idQ, answers) {
  const def = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!def) return {error: 'Questionnaire introuvable'};
  const sc = def.scoring;

  // Collecter toutes les questions
  const allQ = [];
  def.sections.forEach(s => s.questions.forEach(q => allQ.push(q)));

  // Évaluer un conditionnel de type 'QREF>=N' — items optionnels (BR5, BR16)
  function evalConditionnel(cond) {
    if (!cond) return true;
    const m = cond.match(/^(\w+)(>=|<=|>|<|==)(\d+)$/);
    if (!m) return true;
    const v = getVal(m[1]); if (v === null) return false;
    const n = parseFloat(m[3]);
    if (m[2] === '>=') return v >= n;
    if (m[2] === '<=') return v <= n;
    if (m[2] === '>')  return v > n;
    if (m[2] === '<')  return v < n;
    return v === n;
  }

  // Convertir answers en valeurs numériques
  function getVal(qid) {
    const raw = answers[qid];
    if (raw === undefined || raw === null || raw === '') return null;
    return parseFloat(raw);
  }

  // Somme d'un sous-ensemble d'items
  function sumItems(items, reversed) {
    let total = 0, missing = 0;
    items.forEach(id => {
      const q = allQ.find(q => q.id === id);
      if (q && q.conditionnel && !evalConditionnel(q.conditionnel)) return;
      const v = getVal(id);
      if (v === null) { missing++; return; }
      let minV = 0, maxV = 4;
      if (q && q.options && q.options.length) {
        const vals = q.options.map(o => o.v !== undefined ? o.v : o.value).map(Number);
        minV = Math.min(...vals);
        maxV = Math.max(...vals);
      }
      total += (reversed && reversed.includes(id)) ? (minV + maxV - v) : v;
    });
    return {total, missing};
  }

  // Interpréter un score selon des plages
  function interpretRanges(score, ranges) {
    for (const r of ranges) {
      if (score >= r.min && score <= r.max) return r;
    }
    return ranges[ranges.length - 1];
  }

  // ── SUM ──────────────────────────────────────────────
  if (sc.type === 'sum') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'sum', total, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── SUM_NO_INTERPRETATION ───────────────────────────
  if (sc.type === 'sum_no_interpretation') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    return {type:'sum_no_interpretation', total, maxTotal: sc.maxTotal, interpretation: null};
  }


  // ── SUM_ITEMS (source Drive) ─────────────────────────
  if (sc.type === 'sum_items') {
    const items = sc.items || allQ.map(q => q.id);
    let total = 0;
    let missing = 0;
    const missingIds = [];
    const notApplicable = [];
    items.forEach(id => {
      const q = allQ.find(q => q.id === id);
      if (q && q.conditionnel && !evalConditionnel(q.conditionnel)) {
        notApplicable.push(id);
        return;
      }
      const v = getVal(id);
      if (v === null) {
        missing++;
        missingIds.push(id);
        return;
      }
      total += v;
    });
    const interp = sc.interpretation ? interpretRanges(total, sc.interpretation) : null;
    return {type:'sum_items', total, maxTotal: sc.maxTotal, missing, missingIds, notApplicable, interpretation: interp, note: sc.note || null, certification: sc.certification || null};
  }

  // ── SIGH-SAD-SA (source Drive) ───────────────────────
  if (sc.type === 'sigh_sad_sa') {
    const scoreIds = [...(sc.groupA || []), ...(sc.groupB || []), ...(sc.dualItems || [])];
    const missingIds = scoreIds.filter(id => getVal(id) === null);
    const sumIds = ids => ids.reduce((sum, id) => sum + (getVal(id) || 0), 0);
    const q15 = getVal('SIGH_Q015') || 0;
    const q16 = getVal('SIGH_Q016') || 0;
    const q17 = getVal('SIGH_Q017') || 0;
    const dualRawMax = Math.max(q15, q16, q17);
    let scoreDual1517 = dualRawMax;
    if (q17 >= 3 && q17 >= q15 && q17 >= q16) scoreDual1517 = 2;
    else if (dualRawMax === 2) scoreDual1517 = 1;
    const scoreGroupeA = sumIds(sc.groupA || []) + scoreDual1517;
    const scoreGroupeB = sumIds(sc.groupB || []) + scoreDual1517;
    const total = scoreGroupeA + scoreGroupeB;
    return {
      type:'sigh_sad_sa',
      scoreGroupeA,
      scoreGroupeB,
      scoreDual1517,
      dualRawMax,
      total,
      maxTotal: sc.maxTotal,
      missing: missingIds.length,
      missingIds,
      subScores:[
        {id:'A', label:'Groupe A', total: scoreGroupeA},
        {id:'B', label:'Groupe B', total: scoreGroupeB},
        {id:'Q15_Q17', label:'Score corrigé questions 15 à 17', total: scoreDual1517},
      ],
      note: sc.note || null,
      certification: sc.certification || null
    };
  }

  // ── BMS_AVERAGE ──────────────────────────────────────
  if (sc.type === 'bms_average') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const average = parseFloat((total / items.length).toFixed(1));
    const interp = interpretRanges(average, sc.interpretation);
    return {type:'bms_average', total, average, minTotal: sc.minTotal, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── COUNT_THRESHOLD ───────────────────────────────────
  // Utilisé par : Q_INF_05 (Auto-évaluation anxiété SIIN)
  // Logique : compte les items dont la réponse >= threshold
  // La somme brute est ignorée — seul le COMPTAGE est scoré
  // Certifié v2 — 23/06/2026 — PDF PRO SIIN Auto-anxiété_def_Pro.pdf
  if (sc.type === 'count_threshold') {
    const threshold = sc.threshold !== undefined ? sc.threshold : 3;
    const items = allQ.map(q => q.id);
    let count = 0;
    let missing = 0;
    items.forEach(id => {
      const v = getVal(id);
      if (v === null) { missing++; return; }
      if (v >= threshold) count++;
    });
    const interp = interpretRanges(count, sc.interpretation);
    return {
      type: 'count_threshold',
      threshold,
      count,
      maxTotal: sc.maxTotal || items.length,
      missing,
      interpretation: interp
    };
  }

  // ── SUM_REVERSED ─────────────────────────────────────
  if (sc.type === 'sum_reversed') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, sc.reversed);
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'sum', total, maxTotal: sc.maxTotal || items.length*4, interpretation: interp};
  }

  // ── SUBSCORE ─────────────────────────────────────────
  if (sc.type === 'subscore') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      const scaled = sub.multiplier ? total * sub.multiplier : total;
      let interp = null;
      if (sc.interpretation) {
        const interpDef = sc.interpretation.find(i => i.subscale === sub.id || i.subscale === '*');
        if (interpDef) interp = interpretRanges(scaled, interpDef.ranges);
      }
      return {id: sub.id, label: sub.label, total, scaled, max: sub.max, maxScaled: sub.multiplier ? sub.max*sub.multiplier : sub.max, interpretation: interp};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);

    // Sortie enrichie pour Monnier : calories de base = protéines (g/j) x 24
    if (def.id === 'Q_ALI_03') {
      const prot = subResults.find(s => s.id === 'MONNIER_PROT');
      const calSup = subResults.find(s => s.id === 'MONNIER_CAL_SUP');
      const proteinesGJour = prot ? Number(prot.total.toFixed(1)) : 0;
      const caloriesAdditionnelles = calSup ? Number(calSup.total.toFixed(0)) : 0;
      const caloriesBaseEstimees = Number((proteinesGJour * 24).toFixed(1));
      const caloriesTotalesEstimees = Number((caloriesBaseEstimees + caloriesAdditionnelles).toFixed(1));
      return {
        type:'subscore',
        subScores: subResults,
        total: globalTotal,
        monnier: {
          proteinesGJour,
          caloriesBaseEstimees,
          caloriesAdditionnelles,
          caloriesTotalesEstimees
        }
      };
    }

    return {type:'subscore', subScores: subResults, total: globalTotal};
  }

  // ── EORTC QLQ ───────────────────────────────────────
  // Source : EORTC scoring manuals. Raw score = moyenne des items renseignés ;
  // score 0-100 direct = ((RS-1)/range)*100 ; inverse = (1-(RS-1)/range)*100.
  if (sc.type === 'eortc') {
    const subResults = sc.subScores.map(sub => {
      const activeItems = sub.items.filter(id => {
        const q = allQ.find(q => q.id === id);
        return !(q && q.conditionnel && !evalConditionnel(q.conditionnel));
      });
      let rawTotal = 0;
      let answered = 0;
      activeItems.forEach(id => {
        const v = getVal(id);
        if (v === null) return;
        rawTotal += v;
        answered++;
      });
      const rawMean = answered ? rawTotal / answered : null;
      const range = sub.range || 3;
      let score = null;
      if (rawMean !== null) {
        const direct = ((rawMean - 1) / range) * 100;
        score = sub.transform === 'inverse' ? 100 - direct : direct;
        score = Number(Math.max(0, Math.min(100, score)).toFixed(1));
      }
      return {
        id: sub.id,
        label: sub.label,
        total: score,
        score,
        rawTotal,
        rawMean: rawMean === null ? null : Number(rawMean.toFixed(2)),
        answered,
        missing: activeItems.length - answered,
        max: 100,
        transform: sub.transform
      };
    });
    const scored = subResults.filter(r => r.score !== null);
    const total = scored.length
      ? Number((scored.reduce((sum, r) => sum + r.score, 0) / scored.length).toFixed(1))
      : null;
    return {type:'eortc', subScores: subResults, total, maxTotal:100};
  }

  // ── GROUP_MAJORITY (Q_STR_01) ────────────────────────
  if (sc.type === 'group_majority') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      return {id: sub.id, label: sub.label, total, max: sub.max};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    let interp = interpretRanges(globalTotal, sc.interpretation);
    if (globalTotal >= 4 && globalTotal < 15) {
      const dominant = subResults.reduce((a, b) => a.total >= b.total ? a : b);
      const proto = {A:'dopaminergique', B:'sérotoninergique', C:'mixte'};
      interp = {...interp, dominant: dominant.id, protocol: `Protocole ${proto[dominant.id] || dominant.id}`};
    }
    return {type:'group_majority', subScores: subResults, total: globalTotal, interpretation: interp};
  }

  // ── HAD ──────────────────────────────────────────────
  if (sc.type === 'had') {
    const {total: scoreA} = sumItems(sc.subscalesA, []);
    const {total: scoreD} = sumItems(sc.subscalesD, []);
    function interpHad(score, sub) {
      const def = sc.interpretation.find(i => i.subscale === sub);
      return def ? interpretRanges(score, def.ranges) : null;
    }
    return {
      type:'had',
      subScores:[
        {id:'A', label:'Anxiété', total: scoreA, max:21, interpretation: interpHad(scoreA,'A')},
        {id:'D', label:'Dépression', total: scoreD, max:21, interpretation: interpHad(scoreD,'D')},
      ],
      total: scoreA + scoreD
    };
  }

  // ── PSQI ─────────────────────────────────────────────
  if (sc.type === 'psqi') {
    const hCoucher = getVal('Q1') || 23;
    const minEndorm = getVal('Q2') || 30;
    const hLever   = getVal('Q3') || 7;
    const hDormies = getVal('Q4') || 7;
    let tLit = hLever - hCoucher;
    if (tLit <= 0) tLit += 24;
    const efficiency = tLit > 0 ? (hDormies / tLit) * 100 : 0;
    const C1 = getVal('Q6') || 0;
    const lat = minEndorm <= 15 ? 0 : minEndorm <= 30 ? 1 : minEndorm <= 60 ? 2 : 3;
    const q5a = getVal('Q5a') || 0;
    const latSum = lat + q5a;
    const C2 = latSum === 0 ? 0 : latSum <= 2 ? 1 : latSum <= 4 ? 2 : 3;
    const C3 = hDormies > 7 ? 0 : hDormies >= 6 ? 1 : hDormies >= 5 ? 2 : 3;
    const C4 = efficiency >= 85 ? 0 : efficiency >= 75 ? 1 : efficiency >= 65 ? 2 : 3;
    const c5Items = ['Q5b','Q5c','Q5d','Q5e','Q5f','Q5g','Q5h','Q5i','Q5j'];
    const c5Sum = c5Items.reduce((s, id) => s + (getVal(id) || 0), 0);
    const C5 = c5Sum === 0 ? 0 : c5Sum <= 9 ? 1 : c5Sum <= 18 ? 2 : 3;
    const C6 = getVal('Q7') || 0;
    const c7Sum = (getVal('Q8') || 0) + (getVal('Q9') || 0);
    const C7 = c7Sum === 0 ? 0 : c7Sum <= 2 ? 1 : c7Sum <= 4 ? 2 : 3;
    const total = C1 + C2 + C3 + C4 + C5 + C6 + C7;
    const interp = total <= 4 ? {label:'Pas de trouble du sommeil',color:'success'}
                 : total <= 10 ? {label:'Troubles du sommeil légers',color:'info'}
                 : total <= 16 ? {label:'Troubles du sommeil modérés',color:'warning'}
                 : {label:'Troubles du sommeil sévères',color:'danger'};
    return {type:'psqi', total, maxTotal:21,
      components:[
        {id:'C1',label:'Qualité subjective',val:C1},
        {id:'C2',label:'Latence du sommeil',val:C2},
        {id:'C3',label:'Durée du sommeil',val:C3},
        {id:'C4',label:'Efficacité habituelle',val:C4},
        {id:'C5',label:'Perturbations',val:C5},
        {id:'C6',label:'Médication hypnotique',val:C6},
        {id:'C7',label:'Dysfonction diurne',val:C7},
      ],
      efficiency: Math.round(efficiency),
      interpretation: interp
    };
  }

  // ── TFD ──────────────────────────────────────────────────
  if (sc.type === 'tfd') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      const interp = interpretRanges(total, sub.ranges);
      return {id: sub.id, label: sub.label, total, max: sub.max, interpretation: interp};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    const globalInterp = interpretRanges(globalTotal, sc.globalInterpretation);
    return {type:'tfd', subScores: subResults, total: globalTotal, maxTotal:93, interpretation: globalInterp};
  }

  // ── FRANCIS ─────────────────────────────────────────────────
  if (sc.type === 'francis') {
    const fr1 = getVal('FR1') || 0;
    const fr2 = (getVal('FR2') || 0) * 10;
    const fr3 = getVal('FR3') || 0;
    const fr4sat = getVal('FR4');
    const fr4 = fr4sat !== null ? 100 - fr4sat : 0;
    const fr5 = getVal('FR5') || 0;
    const total = fr1 + fr2 + fr3 + fr4 + fr5;
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'francis', total, maxTotal:500,
      components:[
        {id:'FR1',label:'Douleur (intensité)',     val:fr1, max:100},
        {id:'FR2',label:'Douleur (fréquence ×10)', val:fr2, max:100},
        {id:'FR3',label:'Distension',              val:fr3, max:100},
        {id:'FR4',label:'Insatisfaction transit',  val:fr4, max:100},
        {id:'FR5',label:'Impact vie quotidienne',  val:fr5, max:100},
      ],
      interpretation: interp
    };
  }

  // ── BRISTOL ───────────────────────────────────────────────
  if (sc.type === 'bristol') {
    const v = getVal('BR1');
    const interp = v <= 2 ? {label:'Constipation',color:'danger'}
                 : v <= 4 ? {label:'Normal',color:'success'}
                 : {label:'Selles molles / diarrhée',color:'warning'};
    return {type:'bristol', total: v, interpretation: interp};
  }

  // ── UPPS ─────────────────────────────────────────────────
  if (sc.type === 'upps') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, sub.reversed);
      return {id: sub.id, label: sub.label, total, max: sub.items.length * 4};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    return {type:'upps', subScores: subResults, total: globalTotal};
  }

  // ── KARASEK (Q_STR_06) ───────────────────────────────
  if (sc.type === 'karasek') {
    const latDef = sc.weightedLatitude || null;
    let latWeighted = null;
    if (latDef) {
      const {total: auto} = sumItems(latDef.autonomieItems || [], []);
      const {total: usage} = sumItems(latDef.usageItems || [], []);
      latWeighted = (4 * auto) + (2 * usage);
    }

    const subResults = sc.subScores.map(sub => {
      const rawTotal = sumItems(sub.items, []).total;
      const total = sub.id === 'LAT' && latWeighted !== null ? latWeighted : rawTotal;
      let atRisk = false;
      if (typeof sub.seuil === 'number' && sub.seuilDir) {
        atRisk = sub.seuilDir === 'gte' ? total >= sub.seuil
              : sub.seuilDir === 'gt'  ? total > sub.seuil
              : total < sub.seuil;
      }
      return {id:sub.id, label:sub.label, total, rawTotal, max:sub.max, seuil:sub.seuil, atRisk, seuilLabel:sub.seuilLabel};
    });
    const dem = subResults.find(s => s.id==='DEM'), lat = subResults.find(s => s.id==='LAT'),
          sou = subResults.find(s => s.id==='SOU');
    const jobStrain = dem&&lat ? dem.atRisk && lat.atRisk : false;
    const isoStrain = jobStrain && sou && sou.atRisk;
    const interp = isoStrain ? {label:'Iso-Strain — risque burnout élevé',color:'danger'}
                 : jobStrain ? {label:'Job Strain — stress professionnel',color:'warning'}
                 : dem&&dem.atRisk ? {label:'Forte demande psychologique',color:'info'}
                 : {label:'Situation professionnelle équilibrée',color:'success'};
    return {type:'karasek', subScores:subResults, jobStrain, isoStrain, interpretation:interp};
  }

  // ── ECAB ─────────────────────────────────────────────
  // Item 10 inversé : Faux (=0) vaut 1 point selon la source ECAB.
  if (sc.type === 'ecab') {
    const items = allQ.map(q => q.id);
    let total = 0;
    items.forEach(id => {
      const v = getVal(id);
      if (v === null) return;
      if (id === 'EC10') total += (v === 0 ? 1 : 0);
      else total += v;
    });
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'ecab', total, maxTotal: sc.maxTotal || 10, interpretation: interp};
  }

  // ── AUDIT ────────────────────────────────────────────
  // Source Drive : seuils différenciés Femme/Homme, dépendance probable ≥13.
  if (sc.type === 'audit') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const sexRaw = (answers.sexe ?? answers.sex ?? answers.gender ?? answers.__sex ?? '').toString().trim().toLowerCase();
    const isFemale = sexRaw.startsWith('f');
    const isMale = sexRaw.startsWith('h') || sexRaw.startsWith('m');

    let interpretation;
    if (total >= 13) {
      interpretation = {label:'Alcoolodépendance probable', color:'danger'};
    } else if (isFemale) {
      interpretation = total < 6
        ? {label:'Risque faible ou anodin', color:'success'}
        : {label:'Consommation à risque ou à problème', color:'warning'};
    } else if (isMale) {
      interpretation = total < 7
        ? {label:'Risque faible ou anodin', color:'success'}
        : {label:'Consommation à risque ou à problème', color:'warning'};
    } else {
      interpretation = {
        label:'Interprétation à préciser selon le sexe (F < 6, H < 7 ; risque si F 6-12 / H 7-12 ; dépendance ≥ 13)',
        color:'info'
      };
    }

    return {type:'audit', total, maxTotal: sc.maxTotal || 40, interpretation};
  }

  // ── IDTAS-AE ─────────────────────────────────────────
  // Partie 1 : dépistage dépressif (>5 = trouble dépressif important probable)
  // Partie 2 : GSS (saisonnalité)
  // Partie 3 : profils saisonniers par comptage mensuel
  // Partie 4 : symptômes hivernaux (nombre de OUI)
  if (sc.type === 'idtas_ae') {
    const countOui = (items) => items.reduce((sum, id) => sum + (getVal(id) === 1 ? 1 : 0), 0);
    const sumVals = (items) => items.reduce((sum, id) => sum + (getVal(id) || 0), 0);

    const partie1 = countOui(['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9']);
    const gssScore = sumVals(['IG1','IG2','IG3','IG4','IG5','IG6']);
    const partie3A = sumVals(['IMA1','IMA2','IMA3','IMA4','IMA5','IMA6','IMA7','IMA8','IMA9','IMA10','IMA11','IMA12']);
    const partie3B = sumVals(['IMB1','IMB2','IMB3','IMB4','IMB5','IMB6','IMB7','IMB8','IMB9','IMB10','IMB11','IMB12']);
    const partie4 = countOui(['IS1','IS2','IS3','IS4','IS5','IS6','IS7','IS8','IS9']);

    const gssInterpretation = (() => {
      for (const r of sc.interpretation || []) {
        if (gssScore >= r.gss_min && gssScore <= r.gss_max) return r;
      }
      return null;
    })();

    const winterHits = (sc.winterMonthsA || []).filter((id) => (getVal(id) || 0) > (sc.monthlyPatternThreshold || 4)).length;
    const inverseHits = (sc.springSummerMonthsB || []).filter((id) => (getVal(id) || 0) > (sc.monthlyPatternThreshold || 4)).length;
    const winterPatternLikely = winterHits >= (sc.monthlyPatternMinMonths || 3);
    const inversePatternLikely = inverseHits >= (sc.monthlyPatternMinMonths || 3);

    return {
      type:'idtas_ae',
      parts:[
        {
          id:'P1',
          label:'Dépistage dépressif',
          total: partie1,
          maxTotal: 9,
          probableMajorDepression: partie1 > (sc.partie1DepressionThreshold || 5),
          suicidalIdeation: getVal('IA9') === 1,
        },
        {
          id:'P2',
          label:'Score GSS',
          total: gssScore,
          maxTotal: 24,
          interpretation: gssInterpretation,
        },
        {
          id:'P3A',
          label:'Comptage mensuel liste A',
          total: partie3A,
          maxTotal: 72,
          winterPatternLikely,
          winterHits,
        },
        {
          id:'P3B',
          label:'Comptage mensuel liste B',
          total: partie3B,
          maxTotal: 72,
          inversePatternLikely,
          inverseHits,
        },
        {
          id:'P4',
          label:'Symptômes hivernaux',
          total: partie4,
          maxTotal: 9,
        },
      ],
      gssScore,
      interpretation: gssInterpretation,
    };
  }

  // ── WEIGHTED_PER_AXIS (Tinetti Q_GEO_01) ─────────────
  if (sc.type === 'weighted_per_axis') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      return {id:sub.id, label:sub.label, total, max:sub.max};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    const interp = sc.interpretation ? interpretRanges(globalTotal, sc.interpretation) : null;
    return {type:'weighted_per_axis', subScores:subResults, total:globalTotal, maxTotal:sc.maxTotal||28, interpretation:interp};
  }

  // ── BERLIN ───────────────
  // Catégorie 1 — Ronflements (items BE1-BE4)
  if (sc.type === 'berlin') {
    const be1 = getVal('BE1') || 0;
    const be2 = getVal('BE2') || 0;
    const be3 = getVal('BE3') || 0;
    const be4 = getVal('BE4') || 0;
    const cat1Score = be2 + be3 + be4;
    const cat1Positive = be1 === 1 && cat1Score >= 2;

    // Catégorie 2 — Somnolence diurne (items BE5-BE7)
    const be5 = getVal('BE5') || 0;
    const be6 = getVal('BE6') || 0;
    const be7 = getVal('BE7') || 0;
    const cat2Positive = be5 >= 1 || be6 >= 1 || be7 === 1;

    // Catégorie 3 — Facteurs de risque (HTA + IMC)
    const be8 = getVal('BE8') || 0;
    const be9 = getVal('BE9') || 0;
    const cat3Positive = be8 === 1 || be9 > 30;

    const posCount = [cat1Positive, cat2Positive, cat3Positive].filter(Boolean).length;
    const highRisk  = posCount >= 2;

    return {
      type: 'berlin',
      categories: [
        {id:'C1', label:'Ronflements',         score: cat1Score, positive: cat1Positive},
        {id:'C2', label:'Somnolence diurne',   positive: cat2Positive},
        {id:'C3', label:'Facteurs de risque',  positive: cat3Positive},
      ],
      positiveCategoryCount: posCount,
      highRisk,
      interpretation: highRisk
        ? {label:"Risque élevé d'apnée obstructive du sommeil", color:'danger',
           protocol:'Consultation pneumologue — polysomnographie recommandée'}
        : {label:"Risque faible d'apnée du sommeil",            color:'success',
           protocol:'Surveillance clinique — réévaluer si symptômes aggravés'}
    };
  }

  // ── HORNE ────────────────────────────────────────────
  // MEQ 19 items — maxTotal 86
  if (sc.type === 'horne') {
    const hoItems = ['HO1','HO2','HO3','HO4','HO5','HO6','HO7','HO8',
                     'HO9','HO10','HO11','HO12','HO13','HO14','HO15','HO16','HO17','HO18','HO19'];
    const {total} = sumItems(hoItems, []);
    const interp =
      total < 30 ? {label:'Tout à fait du soir', color:'danger'}
    : total <= 41 ? {label:'Modérément du soir', color:'warning'}
    : total <= 58 ? {label:'Neutre', color:'success'}
    : total <= 69 ? {label:'Modérément du matin', color:'info'}
    :              {label:'Tout à fait du matin', color:'primary'};
    return {type:'horne', total, maxTotal: sc.maxTotal || 86, interpretation: interp};
  }

  // ── QIF — Questionnaire d'Impact de la Fibromyalgie ──
  // Référence : Burckhardt CS et al. (1991). J Rheumatol, 18(5), 728-733.
  // Scoring : Fonction(0-9.9) + Jours_bien(0-10) + Absentéisme(0-10) + EVA×7(0-70) → /100 environ
  if (sc.type === 'qif') {
    // Partie 1 — Capacité fonctionnelle Q1-Q11 : moyenne des 11 sous-items × 3.3
    const funcItems = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Q11'];
    let funcSum = 0;
    let funcCount = 0;
    funcItems.forEach(id => {
      const v = getVal(id);
      if (v !== null) {
        funcSum += v;
        funcCount += 1;
      }
    });
    const funcAverage = funcCount > 0 ? (funcSum / funcCount) : 0;
    const funcScaled = parseFloat((funcAverage * 3.3).toFixed(1));

    // Q12 — Jours ressentis bien (0-7) → (7 - n) × 1.43
    const q12 = getVal('Q12');
    const q12Score = q12 !== null ? parseFloat(((7 - q12) * 1.43).toFixed(1)) : 0;

    // Q13 — Jours d'absentéisme (0-7) → n × 1.43
    const q13 = getVal('Q13');
    const q13Score = q13 !== null ? parseFloat((q13 * 1.43).toFixed(1)) : 0;

    // Q14-Q20 — EVA directs 0 à 10
    const evaItems = ['Q14','Q15','Q16','Q17','Q18','Q19','Q20'];
    let evaSum = 0;
    evaItems.forEach(id => { const v = getVal(id); if (v !== null) evaSum += v; });

    const total = parseFloat((funcScaled + q12Score + q13Score + evaSum).toFixed(1));
    const interp =
      total === 0 ? {label:'Score très bas — à confronter au contexte clinique', color:'success'}
    : total < 35  ? {label:'Impact faible — tranche peu explicitée dans la source', color:'info'}
    : total <= 50 ? {label:'Impact modéré — phase compatible avec une bonne période', color:'warning'}
    : total <= 65 ? {label:'Impact important — peut correspondre à une mauvaise semaine', color:'danger'}
    :              {label:'Consultation médicale nécessaire pour réévaluer la prise en charge', color:'danger'};

    return {
      type:'qif', total, maxTotal:100,
      components:[
        {id:'FN', label:'Capacité fonctionnelle (/9.9)', val: funcScaled},
        {id:'JB', label:'Jours ressentis bien (/10)',     val: q12Score},
        {id:'AB', label:'Absentéisme (/10)',              val: q13Score},
        {id:'EV', label:'EVA douleur/humeur/fatigue (/70)', val: evaSum},
      ],
      interpretation: interp
    };
  }

  // ── SUM_DECIMAL — somme avec valeurs flottantes (ex. QDRS : 0/0.5/1/2/3) ──
  // Requis pour Q_GEO_05 QDRS (Galvin 2015) — 10 domaines × max 3 → /30
  if (sc.type === 'sum_decimal') {
    const items = allQ.map(q => q.id);
    let total = 0;
    items.forEach(id => {
      const v = getVal(id); // parseFloat() → gère 0.5
      if (v !== null) total += v;
    });
    total = parseFloat(total.toFixed(1));
    const interp = sc.interpretation ? interpretRanges(total, sc.interpretation) : null;
    return {type:'sum_decimal', total, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── SUM_TWO_PHASES — rappel immédiat + différé (Test 5 mots Dubois) ────────
  // Requis pour Q_GEO_06 — Phase 1 (/5) + Phase 2 (/5) → total /10
  // Note clinique : rappel différé ≤ 2/5 → évocateur MA (sensibilité 85 %, spécificité 90 %)
  if (sc.type === 'sum_two_phases') {
    const phaseResults = sc.phases.map(ph => {
      const {total} = sumItems(ph.items, []);
      return {id: ph.id, label: ph.label, total, maxTotal: ph.maxTotal};
    });
    const globalTotal = phaseResults.reduce((s, p) => s + p.total, 0);

    // Alerte clinique si rappel différé ≤ 2
    const phaseD   = phaseResults.find(p => p.id === 'phase2');
    const alertMA  = phaseD ? phaseD.total <= 2 : false;

    const interp = sc.interpretation ? interpretRanges(globalTotal, sc.interpretation) : null;
    return {
      type:'sum_two_phases',
      phases:      phaseResults,
      total:       globalTotal,
      maxTotal:    sc.maxTotal,
      alertMA,
      alertLabel:  alertMA ? 'Rappel différé ≤ 2/5 — évocateur de maladie d\'Alzheimer (Dubois 2002)' : null,
      interpretation: interp
    };
  }


  // ── COUNT_OUI — comptage de réponses OUI (v=1) ──────
  // Utilisé comme sous-scoring dans composite_multi_parties (IDTAS-AE P1, P3)
  if (sc.type === 'count_oui') {
    const items = allQ.map(q => q.id);
    let count = 0;
    items.forEach(id => { const v = getVal(id); if (v === 1) count++; });
    return {type:'count_oui', count, maxTotal: sc.maxTotal || items.length};
  }

  // ── JOURNAL — recueil de données sans score global ────
  // Utilisé par Q_URO_02 Catalogue Mictionnel (journal 3 jours — interprétation praticien)
  if (sc.type === 'journal') {
    return {
      type:'journal',
      note: sc.note || 'Recueil de données brutes — pas de score global. Interprétation clinique par le praticien.',
      scored: false
    };
  }

  // ── COMPOSITE_MULTI_PARTIES — scoring multi-parties hétérogènes ─────────
  // Utilisé par Q_NEU_12 IDTAS-AE (4 parties : count_oui / sum / count_oui / sum)
  // L'interprétation principale repose sur le score GSS (Partie 2)
  if (sc.type === 'composite_multi_parties') {
    const partResults = sc.parts.map(part => {
      // Collecter les items de cette partie
      const partItems = allQ.filter(q => part.items.includes(q.id));

      if (part.type === 'count_oui') {
        let count = 0;
        part.items.forEach(id => { const v = getVal(id); if (v === 1) count++; });
        return {id: part.id, label: part.label || part.id, type:'count_oui',
                count, maxTotal: part.maxTotal};
      }
      if (part.type === 'sum') {
        const {total} = sumItems(part.items, []);
        return {id: part.id, label: part.label || part.id, type:'sum',
                total, maxTotal: part.maxTotal};
      }
      return {id: part.id, label: part.id, type: part.type, raw: null};
    });

    // Interprétation basée sur le score GSS (P2)
    const gssResult = partResults.find(p => p.id === 'P2');
    const gssScore  = gssResult ? (gssResult.total || 0) : 0;
    let interp = null;
    if (sc.interpretation) {
      for (const r of sc.interpretation) {
        if (gssScore >= r.gss_min && gssScore <= r.gss_max) { interp = r; break; }
      }
      if (!interp) interp = sc.interpretation[sc.interpretation.length - 1];
    }

    return {
      type: 'composite_multi_parties',
      parts: partResults,
      gssScore,
      interpretation: interp
    };
  }

  // ── DEFAULT ───────────────────────────────────────────
  return {error: `Type de scoring non implémenté : ${sc.type}`};

} // fin calculateScore
