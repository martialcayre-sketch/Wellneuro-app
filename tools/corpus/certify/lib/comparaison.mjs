// Comparaison SOURCE ↔ SERVI pour un instrument.
//
// Doctrine (campagne de certification) : le banc CONSTATE, il ne corrige
// jamais. Chaque divergence est une pièce versée à un arbitrage praticien, pas
// un correctif à appliquer. Aucune fonction d'ici n'écrit dans le catalogue.
//
// Fonction PURE, sans accès disque ni réseau : c'est ce qui la rend testable
// (`comparaison.test.mjs`), et ce qui permet d'éprouver qu'elle ÉCHOUE quand
// elle doit échouer — une comparaison qui ne sait pas dire non ne certifie rien.

/** Gravités, de la plus forte à la plus faible. */
export const GRAVITES = ['critique', 'majeur', 'mineur'];

const RANG_GRAVITE = Object.fromEntries(GRAVITES.map((g, i) => [g, i]));

/** Normalise un libellé pour la comparaison textuelle (casse, accents, ponctuation). */
export function normaliserTexte(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similarité de Jaccard sur les mots — grossière mais explicable et stable. */
export function similarite(a, b) {
  const motsA = new Set(normaliserTexte(a).split(' ').filter(Boolean));
  const motsB = new Set(normaliserTexte(b).split(' ').filter(Boolean));
  if (motsA.size === 0 && motsB.size === 0) return 1;
  if (motsA.size === 0 || motsB.size === 0) return 0;
  let communs = 0;
  for (const mot of motsA) if (motsB.has(mot)) communs++;
  return communs / (motsA.size + motsB.size - communs);
}

/**
 * Sens de la suite des valeurs d'options d'un item : 1 croissant, -1
 * décroissant, 0 indécidable.
 */
export function sensOptions(item) {
  const valeurs = (item.options ?? []).map((o) => o.v).filter((v) => typeof v === 'number');
  let montees = 0;
  let descentes = 0;
  for (let i = 1; i < valeurs.length; i++) {
    if (valeurs[i] > valeurs[i - 1]) montees++;
    else if (valeurs[i] < valeurs[i - 1]) descentes++;
  }
  if (montees === descentes) return 0;
  return montees > descentes ? 1 : -1;
}

/**
 * Une inversion peut être MATÉRIALISÉE dans la clé de réponse plutôt
 * qu'appliquée par une formule : c'est le cas du PSS-10, dont la source cote
 * « Jamais = 5 » aux items positifs. Un comparateur qui ne chercherait
 * l'inversion que dans le TYPE de scoring signalerait à tort tout instrument
 * correctement implémenté de cette façon.
 *
 * @returns {{materialisees: number[], manquantes: number[]}} positions (1-indexées)
 */
export function inversionsMaterialisees(itemsServis, positionsInverses) {
  const inverses = new Set(positionsInverses);
  const sensDirects = itemsServis
    .map((item, i) => (inverses.has(i + 1) ? null : sensOptions(item)))
    .filter((s) => s !== null && s !== 0);
  // Sens de référence = celui de la majorité des items non inversés.
  const croissants = sensDirects.filter((s) => s === 1).length;
  const reference = sensDirects.length === 0 ? 1 : (croissants * 2 >= sensDirects.length ? 1 : -1);

  const materialisees = [];
  const manquantes = [];
  for (const position of positionsInverses) {
    const item = itemsServis[position - 1];
    if (!item) continue;
    if (sensOptions(item) === -reference) materialisees.push(position);
    else manquantes.push(position);
  }
  return { materialisees, manquantes };
}

/** Amplitude des valeurs de cotation réellement servies (hors items numériques). */
export function echelleServie(items) {
  const valeurs = items.flatMap((item) => item.options.map((o) => o.v)).filter((v) => typeof v === 'number');
  if (valeurs.length === 0) return null;
  return { min: Math.min(...valeurs), max: Math.max(...valeurs) };
}

function divergence(code, gravite, message, attendu, obtenu, item) {
  return { code, gravite, message, attendu, obtenu, item: item ?? null };
}

/**
 * Compare l'empreinte servie à la spécification extraite de la source.
 *
 * @param {object} servi empreinte produite par `empreinteServie`
 * @param {object} spec spécification extraite de la source (schéma README)
 * @returns {{divergences: object[], resume: object}}
 */
export function comparer(servi, spec) {
  const divergences = [];

  // ── Échelle de cotation ────────────────────────────────────────────────
  // Une échelle décalée fausse TOUT score, item par item : c'est la
  // divergence la plus lourde et la plus facile à ne pas voir.
  const echelle = echelleServie(servi.items);
  const attendue = spec.echelleReponse;
  if (echelle && attendue && (echelle.min !== attendue.min || echelle.max !== attendue.max)) {
    divergences.push(
      divergence(
        'echelle_de_cotation',
        'critique',
        "L'échelle de cotation servie ne couvre pas celle de la source : tous les scores en dépendent.",
        `${attendue.min}–${attendue.max}`,
        `${echelle.min}–${echelle.max}`,
      ),
    );
  }

  // ── Nombre d'items ─────────────────────────────────────────────────────
  const itemsSource = spec.items ?? [];
  if (itemsSource.length > 0 && itemsSource.length !== servi.items.length) {
    divergences.push(
      divergence(
        'nombre_items',
        'critique',
        "Le nombre d'items servis diffère de la source.",
        itemsSource.length,
        servi.items.length,
      ),
    );
  }

  // ── Inversions ─────────────────────────────────────────────────────────
  // Une inversion peut venir de TROIS endroits, et n'en manquer qu'un suffit à
  // accuser à tort un instrument correct :
  //   1. le TYPE de scoring (`sum_reversed`…) ;
  //   2. `scoring.subScores[].reversed`, qui liste des identifiants d'items —
  //      oublié par la première version, d'où le faux positif critique sur
  //      l'UPPS, dont les 25 inversions sont pourtant appliquées ;
  //   3. la clé de réponse elle-même, quand les options sont cotées à rebours
  //      (cas du PSS-10) — c'est ce que vérifie `inversionsMaterialisees`.
  const inverses = itemsSource.filter((i) => i.inverse);
  const declares = new Set(servi.scoring.itemsInversesDeclares ?? []);
  if (inverses.length > 0 && !servi.scoring.typePorteUneInversion) {
    // Position dans l'ordre de la source (le `numero` quand il existe).
    const positions = inverses.map((i, rang) => (typeof i.numero === 'number' ? i.numero : itemsSource.indexOf(i) + 1 || rang + 1));
    const { manquantes: nonMaterialisees } = inversionsMaterialisees(servi.items, positions);
    // Une position dont l'item servi figure dans `reversed` est inversée par le
    // moteur, quoi que disent ses options.
    const manquantes = nonMaterialisees.filter((p) => !declares.has(servi.items[p - 1]?.id));
    if (manquantes.length > 0) {
      const partielle = manquantes.length < positions.length;
      divergences.push(
        divergence(
          'inversion_absente',
          'critique',
          partielle
            ? `Inversion appliquée à une PARTIE seulement des items que la source inverse : ${manquantes.length} item(s) sur ${positions.length} restent cotés dans le sens direct — un score partiellement inversé est plus trompeur qu'un score qui ne l'est pas du tout.`
            : `La source impose d'inverser ${positions.length} item(s) (${spec.formuleInversion ?? 'inversion portée par la clé de réponse'}) ; ni le scoring servi (type « ${servi.scoring.type} ») ni la cotation des options ne l'appliquent.`,
          `${positions.length} items inversés (${positions.join(', ')})`,
          `${manquantes.length} non inversé(s) : ${manquantes.join(', ')}`,
          manquantes.join(', '),
        ),
      );
    }
  }

  // ── Sous-échelles ──────────────────────────────────────────────────────
  // Comparer aux `sections` — le découpage d'ÉCRAN — accusait à tort tout
  // instrument calculant plusieurs dimensions dans une seule page : le DASS-21
  // (1 section, 3 sous-échelles), le HAD (1 section, 2), le PSQI (3 sections,
  // 7 composantes). Ce sont les dimensions RENDUES PAR LE MOTEUR qui font foi.
  const sousEchelles = spec.sousEchelles ?? [];
  const dimensions = servi.dimensions ?? { noms: [], origine: 'aucune' };
  if (sousEchelles.length > 0 && sousEchelles.length !== dimensions.noms.length) {
    divergences.push(
      divergence(
        'sous_echelles',
        'majeur',
        "Le découpage en sous-échelles diffère : un score global masque des dimensions que la source distingue.",
        `${sousEchelles.length} (${sousEchelles.map((s) => s.nom).join(', ')})`,
        dimensions.noms.length === 0
          ? 'aucune dimension calculée (score global seul)'
          : `${dimensions.noms.length} via ${dimensions.origine} (${dimensions.noms.join(', ')})`,
      ),
    );
  }

  // ── Barème d'interprétation ────────────────────────────────────────────
  // Le cas le plus insidieux : la source dit explicitement qu'il n'existe PAS
  // de barème global, et l'application en affiche un. L'interprétation est
  // alors une création locale présentée comme un résultat d'instrument.
  const bandes = servi.scoring.bandes ?? [];
  if (spec.baremeGlobal === false && bandes.length > 0) {
    divergences.push(
      divergence(
        'bareme_sans_source',
        'critique',
        "La source indique qu'aucun barème d'interprétation global n'existe ; l'application en affiche un.",
        'aucun barème global',
        `${bandes.length} bandes : ${bandes.map((b) => `${b.min}–${b.max} ${b.label}`).join(' · ')}`,
      ),
    );
  }

  // ── Seuils de la source non représentés ────────────────────────────────
  for (const seuil of spec.seuils ?? []) {
    const trouve = bandes.some(
      (b) => b.min === seuil.valeur || b.max === seuil.valeur || normaliserTexte(b.label).includes(normaliserTexte(seuil.perimetre)),
    );
    if (!trouve) {
      divergences.push(
        divergence(
          'seuil_non_represente',
          'majeur',
          `Seuil de la source absent du scoring servi (${seuil.perimetre}${seuil.population ? `, ${seuil.population}` : ''}).`,
          `${seuil.operateur ?? '≥'} ${seuil.valeur}`,
          'non représenté',
        ),
      );
    }
  }

  // ── Bornes réellement produites par le moteur ──────────────────────────
  const bornes = servi.bornesExecutees ?? {};
  const attenduBornes = spec.bornesTotal;
  if (bornes.erreur) {
    divergences.push(
      divergence('bornes_non_executables', 'majeur', `Les bornes n'ont pas pu être obtenues en exécutant le moteur : ${bornes.erreur}`, 'exécution possible', bornes.erreur),
    );
  } else if (bornes.max === null && bornes.min === null) {
    // Le moteur a tourné sans rendre de total numérique. Légitime pour un
    // scoring catégoriel (Berlin rend un niveau de risque) — mais seulement
    // si la source n'attend pas de total. Le silence n'est jamais l'option :
    // sans information de nature, on signale plutôt que de laisser passer.
    if (attenduBornes && typeof attenduBornes.max === 'number') {
      divergences.push(
        divergence(
          'total_numerique_absent',
          'critique',
          `La source définit un score total numérique ; le moteur servi n'en produit aucun${bornes.categoriel ? ' (scoring catégoriel)' : ''}.`,
          `${attenduBornes.min ?? '?'}–${attenduBornes.max}`,
          'aucun total numérique',
        ),
      );
    } else if (bornes.categoriel !== true) {
      divergences.push(
        divergence(
          'bornes_indeterminees',
          'majeur',
          "Le moteur ne rend pas de total et rien n'indique un scoring catégoriel assumé : la nature du résultat servi est indéterminée.",
          'total numérique ou catégoriel assumé',
          'indéterminé',
        ),
      );
    }
  } else if (attenduBornes && typeof attenduBornes.max === 'number' && bornes.max !== null && bornes.max !== attenduBornes.max) {
    // Le balayage rend un score ATTEIGNABLE, donc un plancher du maximum réel.
    // Les deux écarts ne pèsent pas pareil :
    //   dépassement — un patient PEUT obtenir un score au-dessus du plafond
    //     publié : preuve directe, et le barème d'interprétation ne le couvre
    //     probablement pas ;
    //   plafond non atteint — le balayage n'a rien prouvé. Le PSQI (durée du
    //     sommeil) et le QIF (jours ressentis bien, item inversé) atteignent
    //     leur maximum publié avec un jeu cohérent, que le balayage ne trouve
    //     pas. Les annoncer « critiques » était deux fois faux.
    if (bornes.max > attenduBornes.max) {
      divergences.push(
        divergence(
          'bornes_score_depassees',
          'critique',
          "Le moteur produit un score supérieur au maximum de la source : ce jeu de réponses est atteignable par un patient.",
          `${attenduBornes.min ?? '?'}–${attenduBornes.max}`,
          `atteint ${bornes.max}`,
        ),
      );
    } else if (servi.scoring.maxTotalDeclare !== null && servi.scoring.maxTotalDeclare !== attenduBornes.max) {
      divergences.push(
        divergence(
          'bornes_score_declarees',
          'majeur',
          "Le maximum DÉCLARÉ par le catalogue diffère de celui de la source (le balayage n'a pas atteint le plafond : il ne prouve rien à lui seul).",
          `${attenduBornes.min ?? '?'}–${attenduBornes.max}`,
          `maxTotal déclaré ${servi.scoring.maxTotalDeclare}, balayage ${bornes.min ?? '?'}→${bornes.max}`,
        ),
      );
    }
  }

  // ── Conduites cliniques logées dans les bandes d'interprétation ────────
  const bandesAvecProtocole = bandes.filter((b) => b.protocole);
  if (bandesAvecProtocole.length > 0) {
    divergences.push(
      divergence(
        'protocole_dans_interpretation',
        'majeur',
        "Des conduites cliniques (`protocol`) sont logées dans les bandes d'interprétation du scoring : elles ne viennent pas de l'instrument et se propagent avec lui.",
        "bandes d'interprétation seules",
        `${bandesAvecProtocole.length} bande(s) porteuse(s) de conduite`,
      ),
    );
  }

  // ── Libellés d'items ───────────────────────────────────────────────────
  // Comparés dans l'ordre : c'est l'ordre qui porte la numérotation d'un
  // instrument, et un item déplacé change la sous-échelle à laquelle il
  // appartient. Le seuil est volontairement bas — on signale, on ne juge pas
  // d'une traduction.
  const SEUIL_SIMILARITE = 0.5;
  const paires = Math.min(itemsSource.length, servi.items.length);
  for (let i = 0; i < paires; i++) {
    const source = itemsSource[i];
    const rendu = servi.items[i];
    const score = similarite(source.texte, rendu.texte);
    if (score < SEUIL_SIMILARITE) {
      divergences.push(
        divergence(
          'libelle_item',
          'mineur',
          `Libellé d'item éloigné de la source en position ${i + 1} (similarité ${score.toFixed(2)}).`,
          source.texte,
          rendu.texte,
          rendu.id,
        ),
      );
    }
  }

  divergences.sort((a, b) => RANG_GRAVITE[a.gravite] - RANG_GRAVITE[b.gravite]);

  const parGravite = Object.fromEntries(GRAVITES.map((g) => [g, divergences.filter((d) => d.gravite === g).length]));
  return {
    divergences,
    resume: {
      instrument: servi.id,
      total: divergences.length,
      parGravite,
      // Un instrument ne peut être proposé à la certification que si aucune
      // divergence critique ne subsiste. Le banc ne certifie pas lui-même :
      // il dit seulement si la question peut être posée au praticien.
      certifiable: parGravite.critique === 0,
    },
  };
}
