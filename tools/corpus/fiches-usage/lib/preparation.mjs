// LE CŒUR PUR DE LA RÉDACTION DES FICHES D'USAGE ([[D-314]] §4) — sans réseau,
// sans modèle, sans fichier : ce que l'outil envoie, et ce qu'il garde.
//
// LES ENTRÉES. Une fiche de la structure signée, et les claims qu'elle épingle
// par paire `claimId::versionClaim`, lus dans l'instantané local. Un claim
// épinglé absent de l'instantané arrête la fiche : le modèle ne rédige pas
// sur un savoir qu'on ne lui a pas donné.
//
// CE QUI EST GARDÉ. Toutes les rubriques, ou rien. Une version n'est valide que
// si elle porte exactement les rubriques attendues (arbitrage 5, `controle.ts`) :
// exclure une rubrique rendrait la version « non conforme » à jamais. Un
// désaccord du contre-lecteur, un échec technique ou un verdict DC-03
// `ok: false` sur UNE rubrique fait donc échouer la fiche entière, sans
// repêchage — l'échec s'écrit dans le rapport de revue, jamais au terminal.
//
// DC-03 ([[D-266]] §7) : un identifiant ou un nombre cité qui n'existe pas dans
// les sources fournies au modèle refuse la sortie. Les sources sont exactement
// ce que la consigne a reçu : identifiants de la structure et textes des claims.
//
// LES AXES ET LA RÉSERVE ([[D-501]], consigne v2). Le rédacteur et le
// contre-lecteur reçoivent les axes signés de la fiche (nature du lien, usage
// décisionnel, marqueur sécurité / admissibilité, statut d'usage, niveau de
// mesure) — des plafonds, pas des contenus — et chaque claim sous réserve
// d'indication ([[D-465]] §3, [[D-498]]) porte une marque dans la liste.
// Depuis la v3 ([[D-501]] §5), ils reçoivent aussi les désignations approuvées.

import { ErreurOutil } from '../../fiches/lib/assemblage.mjs';

/** La clé d'un claim épinglé dans l'instantané local. */
export const cleClaim = c => `${c.claimId}::${c.versionClaim}`;

/** La marque d'un claim sous réserve d'indication, telle que la consigne la nomme. */
export const MARQUE_RESERVE = "[SOUS RÉSERVE D'INDICATION]";

/**
 * Les claims épinglés d'une fiche, dans l'ordre de la structure — ou une erreur
 * qui les nomme. `reserve` : les identifiants de claims sous réserve d'indication.
 */
export function claimsDeLaFiche(fiche, claims, reserve = []) {
  const cles = fiche.claims.map(cleClaim);
  const manquants = cles.filter(c => !claims.has(c));
  if (manquants.length > 0) {
    throw new ErreurOutil(`${fiche.id} : claim(s) épinglé(s) absent(s) de l'instantané : ${manquants.join(', ')}.`);
  }
  return fiche.claims.map(c => ({ cle: cleClaim(c), texte: claims.get(cleClaim(c)).texte, sousReserve: reserve.includes(c.claimId) }));
}

/** Les claims des fiches qui citent un terme, sans doublon — la base d'un libellé. */
export function claimsDuTerme(termeId, structure, claims, reserve = []) {
  const fiches = structure.fiches.filter(f => f.population === termeId || f.hypotheses.includes(termeId));
  const vus = new Map();
  for (const f of fiches) for (const c of claimsDeLaFiche(f, claims, reserve)) vus.set(c.cle, c);
  return { fiches: fiches.map(f => f.id), claims: [...vus.values()] };
}

function listeDeClaims(liste) {
  return liste.length === 0
    ? '(aucun)'
    : liste.map(c => `- "${c.cle}"${c.sousReserve ? ` ${MARQUE_RESERVE}` : ''} : ${c.texte}`).join('\n');
}

/** Les axes signés d'une fiche, en identifiants : des plafonds que la consigne explique. */
export function axesDeLaFiche(fiche) {
  return (
    `NATURE DU LIEN : ${fiche.nature}\n` +
    `USAGE DÉCISIONNEL : ${fiche.usageDecisionnel}\n` +
    `MARQUEUR SÉCURITÉ / ADMISSIBILITÉ : ${fiche.securiteAdmissibilite ? 'oui' : 'non'}\n` +
    `STATUT D'USAGE : ${fiche.statutUsage}\n` +
    `NIVEAU DE MESURE : ${fiche.niveauMesure}`
  );
}

// LES DÉSIGNATIONS APPROUVÉES ([[D-501]] §5, consigne v3). La population, les
// hypothèses rattachées, les analytes et l'usage décisionnel d'une fiche se
// NOMMENT par une désignation approuvée — jamais à partir de l'identifiant
// seul, qui est opaque : le libellé validé en base (population, hypothèse), le
// libellé du catalogue (analyte), le libellé de [[D-266]] §3 (usage
// décisionnel). Une désignation nomme ; elle n'établit aucun fait, que seuls
// les claims portent. Une fiche dont une désignation manque ne part pas.

/** Les libellés de [[D-266]] §3 pour l'usage décisionnel — table de la décision, recopiée. */
export const LIBELLES_USAGE_DECISIONNEL = {
  confirmer_hypothese: 'confirmer une hypothèse',
  reduire_plausibilite: 'réduire sa plausibilité',
  departager_options: 'départager des options',
  surveiller_intervention: 'surveiller une intervention',
  reexaminer_strategie: 'réexaminer la stratégie',
};

/**
 * Le bloc des désignations d'une fiche — ou une erreur qui nomme ce qui
 * manque, avant tout appel de modèle. `designations` : `{ termes: {POP_…|HYP_…:
 * libellé validé}, analytes: {BIO_…: libellé du catalogue} }`.
 */
export function designationsDeLaFiche(fiche, designations) {
  const termes = designations?.termes ?? {};
  const analytes = designations?.analytes ?? {};
  const manquants = [
    ...[fiche.population, ...fiche.hypotheses].filter(t => typeof termes[t] !== 'string' || !/\S/u.test(termes[t])),
    ...fiche.codesAnalyte.filter(a => typeof analytes[a] !== 'string' || !/\S/u.test(analytes[a])),
    ...(LIBELLES_USAGE_DECISIONNEL[fiche.usageDecisionnel] ? [] : [fiche.usageDecisionnel]),
  ];
  if (manquants.length > 0) {
    throw new ErreurOutil(`${fiche.id} : désignation(s) approuvée(s) absente(s) : ${manquants.join(', ')}.`);
  }
  const lignes = [
    `- population d'usage ${fiche.population} : « ${termes[fiche.population]} »`,
    ...(fiche.hypotheses.length === 0
      ? ['- hypothèses rattachées : (aucune)']
      : fiche.hypotheses.map(h => `- hypothèse rattachée ${h} : « ${termes[h]} »`)),
    ...(fiche.codesAnalyte.length === 0
      ? ['- analytes : (aucun)']
      : fiche.codesAnalyte.map(a => `- analyte ${a} : « ${analytes[a]} »`)),
    `- usage décisionnel ${fiche.usageDecisionnel} : « ${LIBELLES_USAGE_DECISIONNEL[fiche.usageDecisionnel]} »`,
  ];
  return lignes.join('\n');
}

/**
 * Le message envoyé au rédacteur pour une fiche. Aucune donnée patient : la
 * structure, ses désignations approuvées et des claims.
 */
export function messageRedactionFiche(fiche, claimsCites, designations) {
  return (
    `MODE : fiche\nFICHE : ${fiche.id}\n` +
    `POPULATION D'USAGE : ${fiche.population}\n` +
    `HYPOTHÈSES : ${fiche.hypotheses.join(', ') || '(aucune)'}\n` +
    `CODES D'ANALYTE : ${fiche.codesAnalyte.join(', ') || '(aucun)'}\n` +
    `${axesDeLaFiche(fiche)}\n` +
    `RUBRIQUES À RÉDIGER, DANS CET ORDRE : ${fiche.rubriques.join(', ')}\n\n` +
    `DÉSIGNATIONS APPROUVÉES — POUR NOMMER, JAMAIS POUR ÉTABLIR UN FAIT :\n${designations}\n\n` +
    `CLAIMS — SEULE BASE ADMISE POUR TOUT FAIT :\n${listeDeClaims(claimsCites)}`
  );
}

/**
 * La réponse du rédacteur pour une fiche : ses rubriques, ou un refus motivé
 * quand les claims contredisent le cadre signé (consigne v3).
 */
export function lireReponseFiche(reponse, attendues) {
  if (reponse && typeof reponse.refus === 'string') {
    if (!/\S/u.test(reponse.refus)) throw new ErreurOutil('refus sans motif.');
    return { refus: reponse.refus.trim() };
  }
  return { rubriques: rubriquesRedigees(reponse, attendues) };
}

/** Le message envoyé au rédacteur pour un libellé. */
export function messageRedactionLibelle(termeId, nature, fichesCitantes, claimsCites) {
  return (
    `MODE : libellé\nTERME : ${termeId}\nNATURE : ${nature === 'hypothese' ? 'hypothèse' : 'population d’usage'}\n` +
    `FICHES QUI LE CITENT : ${fichesCitantes.join(', ') || '(aucune)'}\n\n` +
    `CLAIMS — SEULE BASE ADMISE :\n${listeDeClaims(claimsCites)}`
  );
}

/**
 * Le message envoyé au contre-lecteur pour un texte, dans son contexte.
 * `axes` et `designations` : ceux de la fiche, pour une rubrique — les mêmes
 * que le rédacteur a reçus ; absents pour un libellé.
 */
export function messageContreLecture({ nature, texte, contexte, claimsCites, axes = null, designations = null }) {
  return (
    `NATURE : ${nature}\n\n` +
    (axes ? `AXES SIGNÉS DE LA FICHE :\n${axes}\n\n` : '') +
    (designations ? `DÉSIGNATIONS APPROUVÉES — POUR NOMMER, JAMAIS POUR ÉTABLIR UN FAIT :\n${designations}\n\n` : '') +
    `TEXTE À VÉRIFIER :\n"""\n${texte}\n"""\n\n` +
    (contexte ? `CONTEXTE (à ne pas juger, pour situer le texte) :\n"""\n${contexte}\n"""\n\n` : '') +
    (designations ? 'CLAIMS — SEULE BASE ADMISE POUR TOUT FAIT :\n' : 'CLAIMS — SEULE BASE ADMISE :\n') +
    listeDeClaims(claimsCites)
  );
}

/** Les sources DC-03 : exactement ce que le rédacteur a reçu. */
export const sourcesDc03 = (message, claimsCites) => [message, ...claimsCites.map(c => c.texte)];

/**
 * Les rubriques rédigées, lues dans la réponse du modèle : exactement celles
 * attendues, chacune une chaîne non vide. Sinon une erreur qui ne nomme que des
 * rubriques.
 */
export function rubriquesRedigees(reponse, attendues) {
  const r = reponse?.rubriques;
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new ErreurOutil('réponse sans objet « rubriques ».');
  const recues = Object.keys(r);
  const manquantes = attendues.filter(a => !recues.includes(a));
  const enTrop = recues.filter(k => !attendues.includes(k));
  if (manquantes.length > 0 || enTrop.length > 0) {
    throw new ErreurOutil(`rubriques non conformes (manquantes : ${manquantes.join(', ') || '—'} ; en trop : ${enTrop.join(', ') || '—'}).`);
  }
  const vides = attendues.filter(a => typeof r[a] !== 'string' || !/\S/u.test(r[a]));
  if (vides.length > 0) throw new ErreurOutil(`rubrique(s) vide(s) : ${vides.join(', ')}.`);
  return Object.fromEntries(attendues.map(a => [a, r[a].trim()]));
}

/** Le contexte d'une rubrique : les autres, titrées, en lecture seule. */
export function contexteDeRubrique(rubriques, rubrique) {
  return Object.entries(rubriques)
    .filter(([nom]) => nom !== rubrique)
    .map(([nom, texte]) => `[${nom}]\n${texte}`)
    .join('\n\n');
}

/**
 * Le verdict d'ensemble : chaque texte doit être jugé fidèle par le
 * contre-lecteur ET passer DC-03. `jugements` : `[{ id, verdict, dc03 }]`.
 * Rend `{ issue: 'garde' }` ou `{ issue: 'echec', exclusions }` — tout ou rien.
 */
export function verdictDEnsemble(jugements) {
  const exclusions = [];
  for (const { id, verdict, dc03 } of jugements) {
    if (verdict.technique) exclusions.push({ id, motif: 'contre_lecture_incomplete', raison: verdict.raison });
    else if (!verdict.fidele) exclusions.push({ id, motif: 'contre_lecture', raison: verdict.raison });
    if (!dc03.ok) exclusions.push({ id, motif: 'dc03', inconnus: dc03.inconnus });
  }
  return exclusions.length === 0 ? { issue: 'garde' } : { issue: 'echec', exclusions };
}

/** Ce qu'un brouillon dit de lui sans texte : des comptes. */
export function resumeSansTexte(brouillon) {
  if ('contenu' in brouillon) return { rubriques: Object.keys(brouillon.contenu).length };
  return { caracteres: brouillon.libelle.length };
}
