// Empreinte structurée de ce que l'application SERT réellement pour un
// questionnaire donné.
//
// Fonction PURE : elle prend une entrée du catalogue (et, si fourni,
// `calculateScore`) et rend une empreinte comparable à la spécification
// extraite de la source PDF. Aucun accès disque, aucun appel réseau — c'est ce
// qui rend le banc testable (`comparaison.test.mjs`).
//
// Principe : les bornes de score ne sont PAS lues dans la déclaration
// (`maxTotal`), elles sont OBTENUES EN EXÉCUTANT `calculateScore` sur les jeux
// de réponses extrêmes. Une borne déclarée peut mentir ; une borne exécutée,
// non. C'est la différence entre auditer un commentaire et auditer un moteur.
//
// MAIS une borne exécutée par balayage ne dit pas tout, et la première version
// de ce module l'a oublié. Mettre chaque item à sa valeur maximale ne maximise
// le TOTAL que si le total croît avec chaque item. Dès qu'une composante est
// non monotone — la durée de sommeil du PSQI (dormir plus baisse le score), les
// « jours ressentis bien » du QIF (item inversé) — le balayage produit un
// plafond ARBITRAIRE, inférieur au vrai. Le banc l'a signalé comme divergence
// critique sur le PSQI (0–21 attendu, « 2–15 » observé) et sur le QIF (0–100
// attendu, « 10–89.9 » observé) : deux faux positifs. Or les deux instruments
// atteignent bien leur plafond publié avec un jeu de réponses cohérent.
//
// D'où `nature` : un balayage rend un PLANCHER du maximum, jamais le maximum.
// Un plafond dépassé est une preuve ; un plafond non atteint n'en est pas une.

/** Items d'une entrée de catalogue, à plat, avec leur section d'origine. */
export function itemsDuServi(entree) {
  const items = [];
  for (const section of entree.sections ?? []) {
    for (const question of section.questions ?? []) {
      items.push({
        id: question.id,
        texte: question.texte ?? '',
        type: question.type ?? 'likert',
        options: (question.options ?? []).map((o) => ({ v: o.v, l: o.l })),
        min: question.min ?? null,
        max: question.max ?? null,
        unite: question.unit ?? null,
        conditionnel: question.conditionnel ?? null,
        section: section.id ?? null,
      });
    }
  }
  return items;
}

/** Valeurs numériques admissibles d'un item (options ou bornes numériques). */
function valeursPossibles(item) {
  if (item.options.length > 0) return item.options.map((o) => o.v);
  if (item.min !== null && item.max !== null) return [item.min, item.max];
  return [];
}

/**
 * Jeu de réponses extrême : `sens` vaut 'min' ou 'max'.
 * Les items conditionnels sont inclus — le moteur décide lui-même s'il les
 * compte ; les exclure ici reviendrait à préjuger de son comportement.
 */
export function reponsesExtremes(items, sens) {
  const reponses = {};
  for (const item of items) {
    const valeurs = valeursPossibles(item);
    if (valeurs.length === 0) continue;
    reponses[item.id] = sens === 'min' ? Math.min(...valeurs) : Math.max(...valeurs);
  }
  return reponses;
}

/**
 * Bornes réellement produites par le moteur, par exécution.
 *
 * `categoriel` distingue les deux façons de ne pas avoir de bornes : le moteur
 * a tourné mais ne rend aucun total numérique (Berlin rend un niveau de
 * risque — c'est légitime), ou le moteur a échoué (`erreur`). Confondre les
 * deux ferait passer une panne pour un choix de conception.
 *
 * @returns {{min: number|null, max: number|null, erreur: string|null, categoriel: boolean}}
 */
export function bornesExecutees(idQuestionnaire, items, calculateScore) {
  if (typeof calculateScore !== 'function') {
    return { min: null, max: null, erreur: 'calculateScore absent', categoriel: false, nature: 'inconnue' };
  }
  try {
    const bas = calculateScore(idQuestionnaire, reponsesExtremes(items, 'min'));
    const haut = calculateScore(idQuestionnaire, reponsesExtremes(items, 'max'));
    const lire = (r) => (typeof r?.total === 'number' ? r.total : null);
    const min = lire(bas);
    const max = lire(haut);
    return {
      min,
      max,
      erreur: null,
      categoriel: min === null && max === null,
      // Plusieurs moteurs rendent leur maximum dans le RÉSULTAT sans le
      // déclarer dans `scoring.maxTotal` (PSQI, QIF, Q_GAS_01, Q_GAS_02).
      // L'ignorer privait le comparateur du seul repère dont il disposait
      // quand le balayage n'atteint pas le plafond.
      maxTotalRendu: typeof haut?.maxTotal === 'number' ? haut.maxTotal : null,
      // `max` est atteignable, donc un PLANCHER du maximum réel ; `min` est
      // atteignable, donc un PLAFOND du minimum réel. Nommer cette asymétrie
      // évite de relire ces nombres comme un intervalle exact.
      nature: 'encadrement_par_balayage',
    };
  } catch (e) {
    return { min: null, max: null, erreur: String(e?.message || e), categoriel: false, nature: 'inconnue' };
  }
}

/**
 * Items dont le catalogue déclare l'inversion.
 *
 * La première version cherchait l'inversion dans le seul TYPE de scoring
 * (`/revers/i`), avec ce commentaire : « le catalogue n'a aucun champ
 * d'inversion ». C'était faux. `scoring.subScores[].reversed` porte des
 * identifiants d'items, et le moteur les applique : sur l'UPPS, 45 items tous
 * cotés 1 donnent 45/48 en Urgence — un score haut à partir de réponses basses,
 * ce qui n'arrive que si l'inversion a lieu. Le banc a pourtant annoncé
 * « 25 items non inversés » sur cet instrument : un faux positif critique.
 *
 * @returns {{ids: Set<string>, porteeParLeType: boolean}}
 */
export function inversionsDeclarees(entree) {
  const scoring = entree?.scoring ?? {};
  const ids = new Set();
  const recolter = (liste) => {
    for (const bloc of liste ?? []) {
      for (const id of bloc?.reversed ?? []) ids.add(id);
    }
  };
  recolter(scoring.subScores);
  recolter(scoring.parts);
  // Le catalogue nomme ces listes de plusieurs façons selon le moteur :
  // `reversed` (UPPS), `reversedItems` / `reversedAutonomieItems` /
  // `reversedUsageItems` (Karasek). Les énumérer ne suffit pourtant pas — voir
  // `inversionsAppliquees`, qui seule fait foi.
  for (const [cle, valeur] of Object.entries(scoring)) {
    if (/^reversed/i.test(cle) && Array.isArray(valeur)) {
      for (const id of valeur) if (typeof id === 'string') ids.add(id);
    }
  }
  return {
    ids,
    porteeParLeType: typeof scoring.type === 'string' && /revers/i.test(scoring.type),
  };
}

/** Toutes les valeurs numériques d'un résultat de scoring, agrégées. */
function mesureGlobale(resultat) {
  if (!resultat || typeof resultat !== 'object') return null;
  let somme = 0;
  let vue = false;
  if (typeof resultat.total === 'number') { somme += resultat.total; vue = true; }
  for (const cle of ['subScores', 'components', 'parts', 'categories', 'phases']) {
    for (const d of resultat[cle] ?? []) {
      for (const champ of ['total', 'val', 'score', 'count']) {
        if (typeof d?.[champ] === 'number') { somme += d[champ]; vue = true; break; }
      }
    }
  }
  if (typeof resultat.count === 'number') { somme += resultat.count; vue = true; }
  return vue ? somme : null;
}

/**
 * Items que le moteur inverse RÉELLEMENT, établis en l'exécutant.
 *
 * Lire l'inversion dans une déclaration ne marche pas : le catalogue l'exprime
 * d'au moins trois façons — `subScores[].reversed` (UPPS), `reversedItems` et
 * ses variantes (Karasek), et parfois rien du tout parce qu'elle est écrite
 * dans le corps du moteur (`(7 - q12) * 1.43` pour le QIF, `EC10` pour l'ECAB).
 * Une revue indépendante a montré que la version « par déclaration » laissait
 * vivre le faux positif sur ces trois instruments — et en escaladait un au
 * praticien comme décision clinique.
 *
 * La sonde applique au module sa propre doctrine : on monte un item de son
 * minimum à son maximum, toutes choses égales par ailleurs, et l'on regarde le
 * sens dans lequel bouge l'agrégat des mesures. Il baisse ⇒ l'item est inversé.
 *
 * @returns {{inverses: Set<string>, directs: Set<string>, indetermines: Set<string>}}
 */
export function inversionsAppliquees(idQuestionnaire, items, calculateScore) {
  const inverses = new Set();
  const directs = new Set();
  const indetermines = new Set();
  if (typeof calculateScore !== 'function') return { inverses, directs, indetermines };

  const base = reponsesExtremes(items, 'min');
  let reference;
  try {
    reference = mesureGlobale(calculateScore(idQuestionnaire, base));
  } catch {
    return { inverses, directs, indetermines };
  }
  if (reference === null) return { inverses, directs, indetermines };

  for (const item of items) {
    const valeurs = valeursPossibles(item);
    if (valeurs.length === 0) { indetermines.add(item.id); continue; }
    const haut = Math.max(...valeurs);
    const bas = Math.min(...valeurs);
    if (haut === bas) { indetermines.add(item.id); continue; }
    let mesure;
    try {
      mesure = mesureGlobale(calculateScore(idQuestionnaire, { ...base, [item.id]: haut }));
    } catch {
      indetermines.add(item.id);
      continue;
    }
    if (mesure === null || mesure === reference) indetermines.add(item.id);
    else if (mesure < reference) inverses.add(item.id);
    else directs.add(item.id);
  }
  return { inverses, directs, indetermines };
}

/**
 * Dimensions de scoring RÉELLEMENT servies, lues sur le résultat du moteur.
 *
 * Les `sections` d'une entrée de catalogue sont un découpage d'ÉCRAN : le
 * DASS-21 tient en une seule section et calcule pourtant trois sous-échelles,
 * le PSQI en compte trois et produit sept composantes. Comparer les
 * sous-échelles d'une source aux sections servies a donc fabriqué quatre
 * divergences « majeures » là où le découpage existait bel et bien.
 *
 * Les moteurs nomment leurs dimensions de cinq façons — mêmes clés que
 * `web/src/lib/scoring/rubriques.ts`, qui a rencontré le même problème côté
 * restitution. La première clé non vide gagne ; à défaut, l'interprétation par
 * sous-échelle (`interpretation[].subscale`, cas du HAD) fait foi.
 *
 * @returns {{noms: string[], origine: string}}
 */
export function dimensionsServies(idQuestionnaire, entree, items, calculateScore) {
  const scoring = entree?.scoring ?? {};
  if (typeof calculateScore === 'function') {
    try {
      // Jeu de réponses au MAXIMUM : on ne cherche pas un score, seulement la
      // FORME du résultat. Le maximum plutôt que le minimum parce qu'un jeu
      // bas peut faire court-circuiter le calcul (`Q_SOM_09` rend 4 dimensions
      // au maximum et 0 au minimum) — l'inverse ne s'observe sur aucun des
      // 64 instruments.
      const resultat = calculateScore(idQuestionnaire, reponsesExtremes(items, 'max'));
      // `dimensions` d'abord : c'est la clé la plus explicite, et un scoring
      // `sum` ne rend qu'elle. `mesureGlobale` ne la lit PAS, volontairement —
      // les dimensions somment déjà à `total`, les compter deux fois fausserait
      // la détection du sens des items.
      for (const cle of ['dimensions', 'subScores', 'components', 'parts', 'categories', 'phases']) {
        const liste = resultat?.[cle];
        if (Array.isArray(liste) && liste.length > 0) {
          return { noms: liste.map((d) => String(d.label ?? d.id ?? '')), origine: cle };
        }
      }
    } catch {
      // Moteur en échec : on retombe sur la déclaration, jamais sur les sections.
    }
  }
  for (const cle of ['subScores', 'parts']) {
    const liste = scoring[cle];
    if (Array.isArray(liste) && liste.length > 0) {
      return { noms: liste.map((d) => String(d.label ?? d.id ?? '')), origine: `scoring.${cle}` };
    }
  }
  const sousEchelles = (scoring.interpretation ?? []).filter((b) => b?.subscale).map((b) => String(b.subscale));
  if (sousEchelles.length > 0) {
    return { noms: [...new Set(sousEchelles)], origine: 'interpretation.subscale' };
  }
  return { noms: [], origine: 'aucune' };
}

/**
 * Empreinte complète du questionnaire servi.
 * @param {string} id
 * @param {object} entree entrée du QUESTIONNAIRE_CATALOGUE
 * @param {Function} [calculateScore]
 */
export function empreinteServie(id, entree, calculateScore) {
  const items = itemsDuServi(entree);
  const scoring = entree.scoring ?? {};
  const inversion = inversionsDeclarees(entree);
  const appliquees = inversionsAppliquees(id, items, calculateScore);
  const bandes = (scoring.interpretation ?? []).map((b) => ({
    min: b.min,
    max: b.max,
    label: b.label,
    // `protocol` est une conduite clinique, pas une bande d'interprétation :
    // le banc le remonte séparément pour que le mélange se voie (cas IRLS).
    protocole: b.protocol ?? null,
  }));
  return {
    id,
    titre: entree.titre ?? '',
    sections: (entree.sections ?? []).map((s) => ({
      id: s.id ?? null,
      titre: s.titre ?? '',
      itemIds: (s.questions ?? []).map((q) => q.id),
    })),
    items,
    scoring: {
      type: scoring.type ?? null,
      maxTotalDeclare: scoring.maxTotal ?? null,
      bandes,
      // Inversion : portée par le type de scoring OU par les identifiants
      // listés dans `reversed`. Voir `inversionsDeclarees`.
      typePorteUneInversion: inversion.porteeParLeType,
      itemsInversesDeclares: [...inversion.ids],
      // Ce que le moteur fait, par opposition à ce que le catalogue annonce.
      itemsInversesAppliques: [...appliquees.inverses],
      itemsInversionIndeterminee: [...appliquees.indetermines],
    },
    dimensions: dimensionsServies(id, entree, items, calculateScore),
    bornesExecutees: bornesExecutees(id, items, calculateScore),
  };
}
