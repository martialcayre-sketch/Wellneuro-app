// Projection de la moisson Compl'Alim vers les entrées du référentiel.
//
// EXTRAIT de `ingest.mjs` (2026-07-31), sans changement de comportement, pour
// qu'un SECOND lecteur existe : l'outil de projection des compositions
// (`tools/supplements/compositions/projeter.mjs`) doit résoudre les libellés
// contre EXACTEMENT l'index qui est en base. Deux copies de cette projection
// divergeraient au premier ajustement, et la divergence serait silencieuse —
// le rapport de couverture porterait alors sur un référentiel qui n'existe pas.

/**
 * Code lisible et stable : c'est lui que les règles cliniques manipuleront.
 *
 * L'ORDRE COMPTE : on tronque À 80, PUIS on retire les tirets de bord.
 * L'inverse — trimmer avant de couper — laisse la troncature retomber sur un
 * tiret, que le service refuse. Deux noms officiels tombaient dedans le
 * 2026-07-31, dont « Sel de sodium de 3-sialyllactose… » : l'ingestion s'est
 * arrêtée au 3e lot sur 9, 800 ingrédients déjà écrits.
 */
export function slug(nom) {
  return (
    nom
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 80)
      .replace(/^-+|-+$/g, '') || 'sans-nom'
  );
}

/**
 * Rend la liste d'ingrédients (avec leurs formes) telle que la voie
 * d'ingestion la pose en base.
 *
 * Quatre familles : `substance:<id>`, `form_of_supply:<id>` (une forme d'apport
 * sans substance rattachée EST son propre ingrédient), `plant:<id>`,
 * `microorganism:<id>`.
 *
 * Les formes des PLANTES (partie × préparation) et des MICRO-ORGANISMES
 * (souche) ne sont pas engendrées ici : seules comptent les combinaisons
 * réellement déclarées, que seul le transport des compositions connaît. Les
 * inventer d'avance produirait des milliers de formes que personne n'emploie.
 */
export function projeterReferentiel({ substances, formes, plantes, micro }) {
  const ingredients = [];
  const codesPris = new Map(); // code -> sourceIdentifiant, pour désambiguïser

  /** Deux noms officiels peuvent produire le même code : on suffixe, jamais on n'écrase. */
  function codeUnique(nom, sourceIdentifiant) {
    const base = slug(nom);
    if (!codesPris.has(base)) {
      codesPris.set(base, sourceIdentifiant);
      return base;
    }
    if (codesPris.get(base) === sourceIdentifiant) return base;
    const suffixe = `${base}-${sourceIdentifiant.replace(':', '-')}`;
    codesPris.set(suffixe, sourceIdentifiant);
    return suffixe;
  }

  // Les formes d'apport, rangées par substance qu'elles apportent. La relation
  // vient de la SOURCE (`other-ingredients[].substances`), jamais du libellé —
  // « Hydrogénosélénite de sodium » apporte du sélénium, pas du sodium.
  const formesParSubstance = new Map();
  const formesSansSubstance = [];
  for (const f of formes) {
    const liens = f.substances ?? [];
    if (liens.length === 0) {
      formesSansSubstance.push(f);
      continue;
    }
    for (const s of liens) {
      if (!formesParSubstance.has(s.id)) formesParSubstance.set(s.id, []);
      formesParSubstance.get(s.id).push(f);
    }
  }

  for (const s of substances) {
    const id = `substance:${s.id}`;
    const codesFormes = new Set();
    const listeFormes = [];
    for (const f of formesParSubstance.get(s.id) ?? []) {
      let c = slug(f.name);
      while (codesFormes.has(c)) c = `${c}-${f.id}`; // collision intra-ingrédient
      codesFormes.add(c);
      listeFormes.push({ sourceIdentifiant: `form_of_supply:${f.id}`, code: c, labelFr: f.name });
    }
    ingredients.push({
      sourceIdentifiant: id,
      code: codeUnique(s.name, id),
      nomFr: s.name,
      formes: listeFormes,
    });
  }

  for (const f of formesSansSubstance) {
    const id = `form_of_supply:${f.id}`;
    ingredients.push({ sourceIdentifiant: id, code: codeUnique(f.name, id), nomFr: f.name, formes: [] });
  }

  for (const p of plantes) {
    const id = `plant:${p.id}`;
    ingredients.push({ sourceIdentifiant: id, code: codeUnique(p.name, id), nomFr: p.name, formes: [] });
  }
  for (const m of micro) {
    const id = `microorganism:${m.id}`;
    ingredients.push({ sourceIdentifiant: id, code: codeUnique(m.name, id), nomFr: m.name, formes: [] });
  }

  return ingredients;
}
