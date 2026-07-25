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
    return { min: null, max: null, erreur: 'calculateScore absent', categoriel: false };
  }
  try {
    const bas = calculateScore(idQuestionnaire, reponsesExtremes(items, 'min'));
    const haut = calculateScore(idQuestionnaire, reponsesExtremes(items, 'max'));
    const lire = (r) => (typeof r?.total === 'number' ? r.total : null);
    const min = lire(bas);
    const max = lire(haut);
    return { min, max, erreur: null, categoriel: min === null && max === null };
  } catch (e) {
    return { min: null, max: null, erreur: String(e?.message || e), categoriel: false };
  }
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
      // Le catalogue n'a aucun champ d'inversion : une inversion ne peut donc
      // exister que si le TYPE de scoring la porte (`sum_reversed`…).
      typePorteUneInversion: typeof scoring.type === 'string' && /revers/i.test(scoring.type),
    },
    bornesExecutees: bornesExecutees(id, items, calculateScore),
  };
}
