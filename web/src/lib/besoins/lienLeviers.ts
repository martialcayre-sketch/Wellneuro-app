// LE CONTRAT DU LIEN BESOIN → LEVIERS ([[D-338]] §1, fiche H84) — pur.
//
// Un levier (règle, action, analyte, axe, fiche) dit quels besoins il sert.
// Ce module en fixe la forme et le vocabulaire, rien de plus : il ne pose
// aucune clé sur aucune ligne, ne lit aucune table signée et ne décide
// d'aucun contenu. La clé vit dans la table signée du levier lui-même
// (D-338 §1) — posée à la naissance d'une table neuve, ou par retouche
// regroupée avec J3-12f pour une table existante (D-338 §2).
//
// Trois modes, arbitrés le 2026-10-22 :
// - `cle_signee` : la clé est posée dans la table signée du levier — le
//   patron des `needIds` des règles et du champ `besoins` des fiches d'usage ;
// - `deduit_amont_signe` : le lien est déduit d'une table signée en amont,
//   seul cas admis par D-338 §1 (re-passation ciblée, hiérarchie des
//   assiettes, [[D-254]] §2). Une déduction n'est pas une clé : `BESOIN_SOURCES`
//   dit quels instruments sourcent le score, pas ce qu'un levier vise
//   (`orientationRulesV1.ts`, note des `needIds`) ;
// - `sans_objet` : le levier ne sert aucun besoin, motif écrit obligatoire
//   (critère de fin de H84). Aucune liste de motifs n'est arbitrée : texte
//   libre non vide, qu'une liste fermée remplacera par décision.
//
// Hors contrat (arbitrage du 2026-10-22) : l'état de mesure d'un besoin
// (`NON_MESURE` du score ; constat praticien, D-338 §4).
//
// Module PUR, sans `node:crypto` ni Prisma : un écran peut l'importer.

import { BESOINS } from '@/lib/fiches-usage/vocabulaire';

export { BESOINS };

/** Un besoin du guide, par son numéro — la forme des `needIds` du dépôt. */
export type Besoin = (typeof BESOINS)[number];

export function estBesoin(valeur: unknown): valeur is Besoin {
  return (BESOINS as readonly unknown[]).includes(valeur);
}

/** La liste fermée des leviers (D-338 §1). */
export const NATURES_LEVIER = ['regle', 'action', 'analyte', 'axe', 'fiche'] as const;
export type NatureLevier = (typeof NATURES_LEVIER)[number];

export function estNatureLevier(valeur: unknown): valeur is NatureLevier {
  return (NATURES_LEVIER as readonly unknown[]).includes(valeur);
}

/** Les trois modes du lien entre un levier et les besoins qu'il sert. */
export const MODES_LIEN = ['cle_signee', 'deduit_amont_signe', 'sans_objet'] as const;
export type ModeLien = (typeof MODES_LIEN)[number];

export function estModeLien(valeur: unknown): valeur is ModeLien {
  return (MODES_LIEN as readonly unknown[]).includes(valeur);
}

/** Les tables signées dont un lien peut être déduit (D-338 §1). */
export const AMONTS_SIGNES = ['BESOIN_SOURCES'] as const;
export type AmontSigne = (typeof AMONTS_SIGNES)[number];

export function estAmontSigne(valeur: unknown): valeur is AmontSigne {
  return (AMONTS_SIGNES as readonly unknown[]).includes(valeur);
}

/**
 * Un levier, désigné par sa nature et son identifiant dans sa propre table.
 * Le format de l'identifiant appartient à cette table, pas au contrat.
 */
export type RefLevier = { nature: NatureLevier; id: string };

export type LienBesoinLevier =
  | { levier: RefLevier; mode: 'cle_signee'; besoins: readonly Besoin[] }
  | {
      levier: RefLevier;
      mode: 'deduit_amont_signe';
      amont: AmontSigne;
      besoins: readonly Besoin[];
    }
  | { levier: RefLevier; mode: 'sans_objet'; motif: string };

export type ResultatControleLien =
  | { ok: true; lien: LienBesoinLevier }
  | { ok: false; erreurs: string[] };

function texteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim().length > 0;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/** Une liste de besoins : non vide, chaque élément un besoin, sans doublon. */
function controlerBesoins(valeur: unknown, erreurs: string[]): Besoin[] | null {
  if (!Array.isArray(valeur)) {
    erreurs.push('Les besoins ne sont pas une liste.');
    return null;
  }
  if (valeur.length === 0) {
    erreurs.push('La liste des besoins est vide : un lien porte au moins un besoin.');
    return null;
  }
  const inconnus = valeur.filter((b) => !estBesoin(b));
  if (inconnus.length > 0) {
    erreurs.push(`Besoins inconnus : ${inconnus.map((b) => JSON.stringify(b)).join(', ')}.`);
    return null;
  }
  if (new Set(valeur).size !== valeur.length) {
    erreurs.push('La liste des besoins contient un doublon.');
    return null;
  }
  return valeur as Besoin[];
}

/**
 * Contrôle un lien venu de l'extérieur et le rend typé, ou dit ce qui manque.
 * Refuse les champs qui n'appartiennent pas à son mode : un lien
 * « sans objet » qui porterait des besoins serait deux choses à la fois.
 */
export function controlerLien(valeur: unknown): ResultatControleLien {
  const erreurs: string[] = [];
  if (!estObjet(valeur)) return { ok: false, erreurs: ['Le lien n’est pas un objet.'] };

  const levier = valeur.levier;
  let ref: RefLevier | null = null;
  if (!estObjet(levier)) {
    erreurs.push('Le levier est absent.');
  } else if (!estNatureLevier(levier.nature)) {
    erreurs.push(`Nature de levier inconnue : ${JSON.stringify(levier.nature)}.`);
  } else if (!texteNonVide(levier.id)) {
    erreurs.push('L’identifiant du levier est vide.');
  } else if (levier.id !== levier.id.trim()) {
    // Deux écritures d'un même identifiant désigneraient deux leviers.
    erreurs.push('L’identifiant du levier commence ou finit par un espace.');
  } else {
    ref = { nature: levier.nature, id: levier.id };
  }

  const mode = valeur.mode;
  if (!estModeLien(mode)) {
    erreurs.push(`Mode de lien inconnu : ${JSON.stringify(mode)}.`);
    return { ok: false, erreurs };
  }

  const champsAdmis: Record<ModeLien, readonly string[]> = {
    cle_signee: ['levier', 'mode', 'besoins'],
    deduit_amont_signe: ['levier', 'mode', 'amont', 'besoins'],
    sans_objet: ['levier', 'mode', 'motif'],
  };
  const etrangers = Object.keys(valeur).filter((c) => !champsAdmis[mode].includes(c));
  if (etrangers.length > 0) {
    erreurs.push(`Champs étrangers au mode « ${mode} » : ${etrangers.join(', ')}.`);
  }

  if (mode === 'sans_objet') {
    const motif = valeur.motif;
    if (!texteNonVide(motif)) {
      erreurs.push('Un levier « sans objet » porte un motif écrit.');
      return { ok: false, erreurs };
    }
    if (erreurs.length > 0 || ref === null) return { ok: false, erreurs };
    return { ok: true, lien: { levier: ref, mode, motif: motif.trim() } };
  }

  const besoins = controlerBesoins(valeur.besoins, erreurs);
  if (mode === 'deduit_amont_signe') {
    const amont = valeur.amont;
    if (!estAmontSigne(amont)) {
      erreurs.push(`Amont signé inconnu : ${JSON.stringify(amont)}.`);
      return { ok: false, erreurs };
    }
    if (erreurs.length > 0 || ref === null || besoins === null) return { ok: false, erreurs };
    return { ok: true, lien: { levier: ref, mode, amont, besoins } };
  }

  if (erreurs.length > 0 || ref === null || besoins === null) return { ok: false, erreurs };
  return { ok: true, lien: { levier: ref, mode, besoins } };
}
