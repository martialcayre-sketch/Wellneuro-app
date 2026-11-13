// LA LECTURE DE L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, BP-17
// PR 5) : la structure du jour (références seules) et, pour chaque couple
// option × rubrique, la DERNIÈRE version saisie et son état dérivé.
//
// Les textes d'une option que la structure ne déclare plus restent listés, à
// part, « hors structure » : rien ne disparaît en silence, et le retrait reste
// offert.
//
// Lecture de l'atelier seul (D-480 §8) : ni le portail, ni le courrier, ni le
// scoring, ni la recherche, ni un modèle n'appellent ce module. Aucun texte
// n'en sort vers un journal ([[D-251]] §4).

import { prisma } from '@/lib/prisma';
import { dernierActe, etatDuTexte, jetonDernierActe, serialiserActe, type ActeSerialise, type EtatTexte } from '@/lib/fiches-usage/etat';
import { etatDeLaRubrique, type ActeLu, type EtatRubriqueOption } from './etat';
import { contexteDuDepot, RUBRIQUES_OPTION, type ContexteAtelier, type EtatBibliotheque } from './structure';

export type VersionAffichee = {
  id: string;
  numero: number;
  texte: string;
  texteSha256: string;
  auteur: string;
  creeLe: string;
  dernierActe: ActeSerialise | null;
  /** Le jeton du dernier acte, que l'écran renvoie avec un acte. */
  jeton: string | null;
  /** Le nombre de versions du couple, la dernière comprise. */
  nombreVersions: number;
};

export type RubriqueAffichee = {
  rubrique: string;
  /** Les renvois de la structure (vide hors structure). */
  renvois: readonly string[];
  version: VersionAffichee | null;
  etat: EtatRubriqueOption;
  /** L'état de la dernière version au vu de ses SEULS actes (le geste s'y règle), ou `null` sans version. */
  etatActes: EtatTexte | null;
};

export type OptionAffichee = {
  id: string;
  hypothese: string;
  populations: readonly string[];
  rubriques: RubriqueAffichee[];
};

export type AtelierOptions = {
  structure: { etat: EtatBibliotheque; empreinte: string; nombreOptions: number };
  rubriques: readonly string[];
  options: OptionAffichee[];
  /** Les textes d'options que la structure du jour ne déclare pas. */
  horsStructure: { optionId: string; rubriques: RubriqueAffichee[] }[];
};

type LigneLue = {
  id: string;
  optionId: string;
  rubrique: string;
  numero: number;
  texte: string;
  texteSha256: string;
  structureSha256: string;
  auteur: string;
  creeLe: Date;
  actes: ActeLu[];
};

/** Assemble l'atelier depuis les lignes lues — pur, testé sans base. */
export function assemblerAtelier(lignes: readonly LigneLue[], contexte: ContexteAtelier): AtelierOptions {
  const parCouple = new Map<string, { derniere: LigneLue; nombre: number }>();
  for (const l of lignes) {
    const cle = `${l.optionId}|${l.rubrique}`;
    const vu = parCouple.get(cle);
    if (!vu) parCouple.set(cle, { derniere: l, nombre: 1 });
    else parCouple.set(cle, { derniere: l.numero > vu.derniere.numero ? l : vu.derniere, nombre: vu.nombre + 1 });
  }

  const declarees = new Set(contexte.options.map(o => o.id));
  const rubrique = (optionId: string, nom: string, renvois: readonly string[]): RubriqueAffichee => {
    const trouve = parCouple.get(`${optionId}|${nom}`) ?? null;
    const d = trouve?.derniere ?? null;
    const acte = d ? dernierActe(d.actes) : null;
    return {
      rubrique: nom,
      renvois,
      version: d
        ? {
            id: d.id,
            numero: d.numero,
            texte: d.texte,
            texteSha256: d.texteSha256,
            auteur: d.auteur,
            creeLe: d.creeLe.toISOString(),
            dernierActe: acte ? serialiserActe(acte) : null,
            jeton: jetonDernierActe(d.actes),
            nombreVersions: trouve?.nombre ?? 0,
          }
        : null,
      etat: etatDeLaRubrique(d, { empreinteStructure: contexte.empreinteStructure, optionDeclaree: declarees.has(optionId) }),
      etatActes: d ? etatDuTexte(d.texteSha256, d.actes) : null,
    };
  };

  const options = contexte.options.map(o => ({
    id: o.id,
    hypothese: o.hypothese,
    populations: o.populations,
    rubriques: RUBRIQUES_OPTION.map(r => rubrique(o.id, r, o.renvois[r])),
  }));

  const orphelines = [...new Set(lignes.map(l => l.optionId))].filter(id => !declarees.has(id)).sort();
  const horsStructure = orphelines.map(optionId => ({
    optionId,
    rubriques: [...new Set(lignes.filter(l => l.optionId === optionId).map(l => l.rubrique))]
      .sort((a, b) => RUBRIQUES_OPTION.indexOf(a as never) - RUBRIQUES_OPTION.indexOf(b as never))
      .map(r => rubrique(optionId, r, [])),
  }));

  return {
    structure: { etat: contexte.etatStructure, empreinte: contexte.empreinteStructure, nombreOptions: contexte.options.length },
    rubriques: RUBRIQUES_OPTION,
    options,
    horsStructure,
  };
}

/**
 * Deux lectures : les versions SANS leur texte (de quoi trouver la dernière de
 * chaque couple et juger son état), puis le texte des seules dernières
 * versions — l'historique ne se charge pas à chaque affichage (`wn-reviewer`).
 */
export async function lireAtelierOptions(contexte: ContexteAtelier = contexteDuDepot()): Promise<AtelierOptions> {
  const versions = await prisma.bibliothequeOptionTexte.findMany({
    orderBy: [{ optionId: 'asc' }, { rubrique: 'asc' }, { numero: 'asc' }],
    select: {
      id: true,
      optionId: true,
      rubrique: true,
      numero: true,
      texteSha256: true,
      structureSha256: true,
      auteur: true,
      creeLe: true,
      actes: {
        select: { ordre: true, acte: true, empreinte: true, validateur: true, relectureIntegrale: true, motif: true, le: true },
      },
    },
  });
  const dernieres = new Map<string, { id: string; numero: number }>();
  for (const v of versions) {
    const cle = `${v.optionId}|${v.rubrique}`;
    const vu = dernieres.get(cle);
    if (!vu || v.numero > vu.numero) dernieres.set(cle, { id: v.id, numero: v.numero });
  }
  const ids = [...dernieres.values()].map(d => d.id);
  const textes = ids.length === 0
    ? []
    : await prisma.bibliothequeOptionTexte.findMany({ where: { id: { in: ids } }, select: { id: true, texte: true } });
  const texteDe = new Map(textes.map(t => [t.id, t.texte]));
  // Le texte d'une DERNIÈRE version ne manque jamais (CHECK, ajout seul) : s'il
  // manquait, l'écran montrerait un texte vide sur l'empreinte d'un autre, et un
  // acte pourrait s'y poser. On ferme plutôt que d'afficher (DC-24, `wn-reviewer`).
  if (ids.some(id => !texteDe.has(id))) throw new Error('Texte d’une dernière version introuvable : lecture de l’atelier refusée.');
  // Une version qui n'est pas la dernière n'est jamais affichée : son texte reste vide.
  return assemblerAtelier(versions.map(v => ({ ...v, texte: texteDe.get(v.id) ?? '' })), contexte);
}
