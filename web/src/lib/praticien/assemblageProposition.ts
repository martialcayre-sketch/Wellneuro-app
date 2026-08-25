// L'ASSEMBLAGE d'une proposition d'objectif (Alliance 6.0-B) — la moitié
// SERVEUR du moteur. Le domaine pur — types, fabriques, balayage, bornes,
// disposition, caducité — vit dans `propositionObjectif.ts`, et cette
// séparation n'est pas un rangement.
//
// ELLE SUIT LA SEULE DÉPENDANCE QUI L'EXIGE. `assemblerPropositions` est la
// seule fonction du moteur qui ait besoin d'une empreinte, donc de
// `node:crypto` — lequel n'a pas de place dans un bundle de navigateur. Tant
// que les deux vivaient ensemble, le panneau du cockpit, qui ne prend du
// module qu'une borne de longueur, faisait échouer la CONSTRUCTION DE
// PRODUCTION (`Module not found: node:crypto`). Le défaut n'était visible ni
// de `tsc` ni de Vitest : seul le build l'a montré, au palier T2.
//
// SÉRIALISATION CANONIQUE DUPLIQUÉE — arbitrage 2 du LOT-02. L'original est
// `lib/clinical-engine/canonical.ts`, dont le `proposalHash` du cockpit est
// déjà l'usager ; la caducité de 6.0-B en est la copie conceptuelle. Mais G7
// interdit d'importer `clinical-engine/`, et l'exception aurait été
// parfaitement justifiable ici — c'est précisément ce qui la rend dangereuse :
// UNE GARDE QUI GAGNE UNE EXCEPTION LES PERD TOUTES. Un banc confronte les deux
// implémentations (`propositionObjectif.test.ts`), et c'est LUI qui importe
// l'original — aucun fichier applicatif ne le fait.

import { createHash } from 'node:crypto';
import {
  MAX_PROPOSITIONS,
  depuisAnamnese,
  depuisInstrument,
  depuisRegleSignee,
  type AnamneseCitable,
  type CandidatCitable,
  type EntreesAssemblage,
  type FragmentSource,
  type PropositionAssemblee,
} from './propositionObjectif';

function serialiser(valeur: unknown, vues: Set<object>, undefinedAdmis: boolean): string | undefined {
  if (valeur === undefined) {
    if (undefinedAdmis) return undefined;
    throw new TypeError('Une valeur undefined n’est pas autorisée dans un tableau canonique.');
  }
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'boolean') {
    return JSON.stringify(valeur);
  }
  if (typeof valeur === 'number') {
    if (!Number.isFinite(valeur)) throw new TypeError('Les nombres non finis ne sont pas sérialisables.');
    return JSON.stringify(valeur);
  }
  if (typeof valeur !== 'object') throw new TypeError('Valeur non JSON dans la sérialisation canonique.');
  if (valeur instanceof Date) {
    throw new TypeError('Les dates doivent être converties en chaîne ISO avant sérialisation.');
  }
  if (vues.has(valeur)) throw new TypeError('Les références circulaires ne sont pas sérialisables.');

  vues.add(valeur);
  try {
    if (Array.isArray(valeur)) {
      for (let index = 0; index < valeur.length; index++) {
        if (!(index in valeur)) throw new TypeError('Les tableaux creux ne sont pas sérialisables.');
      }
      return `[${valeur.map((entree) => serialiser(entree, vues, false)).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(valeur);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Seuls les objets JSON simples sont sérialisables.');
    }
    const entrees: string[] = [];
    for (const cle of Object.keys(valeur as object).sort()) {
      const serialisee = serialiser((valeur as Record<string, unknown>)[cle], vues, true);
      if (serialisee !== undefined) entrees.push(`${JSON.stringify(cle)}:${serialisee}`);
    }
    return `{${entrees.join(',')}}`;
  } finally {
    vues.delete(valeur);
  }
}

/** Sérialisation canonique — clés triées, formes exotiques refusées. */
export function jsonCanonique(valeur: unknown): string {
  const serialisee = serialiser(valeur, new Set<object>(), false);
  if (serialisee === undefined) throw new TypeError('La racine canonique ne peut pas être undefined.');
  return serialisee;
}

/** Empreinte d’intégrité uniquement : elle n’anonymise ni ne pseudonymise. */
export function empreinte(valeur: unknown): string {
  return createHash('sha256').update(jsonCanonique(valeur), 'utf8').digest('hex');
}

/**
 * Les fragments d'anamnèse citables — verbatim, jamais paraphrasés. `attentes`
 * est une liste ; chaque entrée devient un fragment, aucune n'est fusionnée
 * dans une phrase de synthèse.
 */
function fragmentsAnamnese(anamnese: AnamneseCitable | null): FragmentSource[] {
  if (!anamnese) return [];
  const date = anamnese.dateConsultation;
  const fragments = [
    depuisAnamnese('motif_principal', anamnese.motifPrincipal ?? '', date),
    depuisAnamnese('objectif_prioritaire', anamnese.objectifPrioritaire ?? '', date),
    ...anamnese.attentes.map((attente) => depuisAnamnese('attentes', attente, date)),
  ];
  return fragments.filter((fragment): fragment is FragmentSource => fragment !== null);
}

/**
 * Assemble les propositions — UNE PAR CANDIDAT SIGNÉ, au plus trois.
 *
 * SANS CANDIDAT, AUCUNE PROPOSITION, et ce n'est pas un manque à combler.
 * Table des priorités non signée, abstention requise, canal de plainte non
 * mesurable : dans les trois cas le cockpit ne sert aucun candidat, et la
 * machine n'a alors rien de signé à citer. Assembler quand même, sur la seule
 * anamnèse, ferait de Wellneuro l'auteur d'une proposition que rien ne fonde —
 * exactement ce que `D-094` interdit.
 *
 * L'ORDRE D'ENTRÉE EST CONSERVÉ, JAMAIS INTERPRÉTÉ. Ce module ne trie pas, ne
 * numérote pas et n'expose aucune position : `D-094` §3 interdit jusqu'à la
 * numérotation tant que le classement n'est pas signé (`D-093`).
 *
 * CHAQUE PROPOSITION PORTE SA PROPRE EMPREINTE, calculée sur les DONNÉES
 * SOURCES et jamais sur le texte des fragments : une reformulation praticien
 * ne doit pas rendre caduque une proposition dont les sources n'ont pas bougé
 * (arbitrage 2).
 */
export function assemblerPropositions(entrees: EntreesAssemblage): PropositionAssemblee[] {
  const sha = (entrees.shaPerimetre ?? '').trim();
  if (sha.length === 0) return [];

  const communs = fragmentsAnamnese(entrees.anamnese);
  const fragmentPlainte = entrees.plainte
    ? depuisInstrument(entrees.plainte.instrument, entrees.plainte.domaine, entrees.plainte.restitution)
    : null;

  // LE FILTRAGE PRÉCÈDE LA COUPE, et l'ordre n'est pas indifférent : couper
  // d'abord ferait qu'un candidat au libellé vide CONSOMMERAIT un des trois
  // créneaux, et le quatrième candidat — parfaitement citable — ne serait
  // jamais examiné. Le plafond borne ce qu'on PROPOSE, pas ce qu'on inspecte.
  //
  // LA DÉDUPLICATION PAR RÈGLE, ensuite, tient une propriété dont la caducité
  // dépend : l'empreinte porte la règle et non son libellé (arbitrage 2), si
  // bien que deux candidats de MÊME règle produiraient deux propositions au
  // hachage IDENTIQUE. La comparaison d'ensembles de la route ne verrait plus
  // l'assemblée rétrécir de deux lignes à une, et servirait indéfiniment une
  // proposition que le cockpit ne propose plus.
  const citables: CandidatCitable[] = [];
  const reglesVues = new Set<string>();
  for (const candidat of entrees.candidats) {
    if (candidat.texte.trim().length === 0) continue;
    if (reglesVues.has(candidat.regle)) continue;
    reglesVues.add(candidat.regle);
    citables.push(candidat);
    if (citables.length === MAX_PROPOSITIONS) break;
  }

  return citables.flatMap((candidat) => {
    const fragmentRegle = depuisRegleSignee(candidat.regle, candidat.texte, sha);
    // Inatteignable après le filtrage ci-dessus (le SHA est non vide, le
    // libellé aussi), mais la fabrique reste seule juge de ce qu'elle accepte :
    // s'en remettre à l'appelant pour le savoir serait rendre l'invariant
    // dépendant du site d'appel.
    if (!fragmentRegle) return [];

    const fragments = [fragmentRegle, ...(fragmentPlainte ? [fragmentPlainte] : []), ...communs];

    // L'EMPREINTE PORTE LES SOURCES, PAS LES FRAGMENTS : les identifiants et
    // les valeurs telles qu'elles ont été LUES, plus le SHA du périmètre
    // signé — rien du texte assemblé.
    const hashSources = empreinte({
      anamnese: entrees.anamnese,
      plainte: entrees.plainte,
      regle: candidat.regle,
      shaPerimetre: sha,
    });

    return [{ fragments, hashSources }];
  });
}
