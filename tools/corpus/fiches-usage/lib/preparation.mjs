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

import { ErreurOutil } from '../../fiches/lib/assemblage.mjs';

/** La clé d'un claim épinglé dans l'instantané local. */
export const cleClaim = c => `${c.claimId}::${c.versionClaim}`;

/** Les claims épinglés d'une fiche, dans l'ordre de la structure — ou une erreur qui les nomme. */
export function claimsDeLaFiche(fiche, claims) {
  const cles = fiche.claims.map(cleClaim);
  const manquants = cles.filter(c => !claims.has(c));
  if (manquants.length > 0) {
    throw new ErreurOutil(`${fiche.id} : claim(s) épinglé(s) absent(s) de l'instantané : ${manquants.join(', ')}.`);
  }
  return cles.map(cle => ({ cle, texte: claims.get(cle).texte }));
}

/** Les claims des fiches qui citent un terme, sans doublon — la base d'un libellé. */
export function claimsDuTerme(termeId, structure, claims) {
  const fiches = structure.fiches.filter(f => f.population === termeId || f.hypotheses.includes(termeId));
  const vus = new Map();
  for (const f of fiches) for (const c of claimsDeLaFiche(f, claims)) vus.set(c.cle, c);
  return { fiches: fiches.map(f => f.id), claims: [...vus.values()] };
}

function listeDeClaims(liste) {
  return liste.length === 0 ? '(aucun)' : liste.map(c => `- "${c.cle}" : ${c.texte}`).join('\n');
}

/** Le message envoyé au rédacteur pour une fiche. Aucune donnée patient : la structure et des claims. */
export function messageRedactionFiche(fiche, claimsCites) {
  return (
    `MODE : fiche\nFICHE : ${fiche.id}\n` +
    `POPULATION D'USAGE : ${fiche.population}\n` +
    `HYPOTHÈSES : ${fiche.hypotheses.join(', ') || '(aucune)'}\n` +
    `CODES D'ANALYTE : ${fiche.codesAnalyte.join(', ') || '(aucun)'}\n` +
    `RUBRIQUES À RÉDIGER, DANS CET ORDRE : ${fiche.rubriques.join(', ')}\n\n` +
    `CLAIMS — SEULE BASE ADMISE :\n${listeDeClaims(claimsCites)}`
  );
}

/** Le message envoyé au rédacteur pour un libellé. */
export function messageRedactionLibelle(termeId, nature, fichesCitantes, claimsCites) {
  return (
    `MODE : libellé\nTERME : ${termeId}\nNATURE : ${nature === 'hypothese' ? 'hypothèse' : 'population d’usage'}\n` +
    `FICHES QUI LE CITENT : ${fichesCitantes.join(', ') || '(aucune)'}\n\n` +
    `CLAIMS — SEULE BASE ADMISE :\n${listeDeClaims(claimsCites)}`
  );
}

/** Le message envoyé au contre-lecteur pour un texte, dans son contexte. */
export function messageContreLecture({ nature, texte, contexte, claimsCites }) {
  return (
    `NATURE : ${nature}\n\nTEXTE À VÉRIFIER :\n"""\n${texte}\n"""\n\n` +
    (contexte ? `CONTEXTE (à ne pas juger, pour situer le texte) :\n"""\n${contexte}\n"""\n\n` : '') +
    `CLAIMS — SEULE BASE ADMISE :\n${listeDeClaims(claimsCites)}`
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
