// Les FILS des décisions de parcours ([[D-343]] §3, patron de [[D-331]] §2)
// — PUR, lu par la route et par le panneau du cockpit (aucun import serveur).
// Une révision a un fil par version ; choix et mise en œuvre, un fil par
// événement. La séquence lacunaire se DIT (DC-30), rien n'en est déduit.

import { construireFils, type Fil } from '@/lib/physio-traitements/fils';
import { famille, type Issue, type Nature, type Source } from './liste';

export type DecisionLue = {
  id: string;
  /** `ordre` de la base, en chaîne (BigInt ne passe pas en JSON). */
  ordre: string;
  acte: 'pose' | 'retrait';
  idVersion: string;
  idAction: string | null;
  nature: Nature | null;
  issue: Issue | null;
  motif: string | null;
  note: string | null;
  /** `AAAA-MM-JJ`, ou `null`. */
  evenementLe: string | null;
  evenementInconnu: boolean | null;
  source: Source | null;
  idVersionSuivante: string | null;
  idLigneRemplacee: string | null;
  praticienEmail: string;
  /** ISO, posé par la base. */
  acteLe: string;
};

export type ActionDeVersion = { actionId: string; titre: string };

export type VersionLue = {
  id: string;
  /** ISO. */
  creeLe: string;
  /** ISO de la première diffusion recevable, ou `null` : version non diffusée ([[D-343]] §7, §9). */
  diffuseeLe: string | null;
  /** `null` : le contenu ne se relit pas (empreinte incohérente) ; aucune action désignable. */
  actions: ActionDeVersion[] | null;
};

export type { Fil };

/** Les fils d'une version, dans l'ordre de la base. */
export function filsDeLaVersion(lignes: readonly DecisionLue[], idVersion: string): Fil<DecisionLue>[] {
  return construireFils(lignes.filter(l => l.idVersion === idVersion));
}

/** La famille d'un fil : celle de sa racine. */
export function familleDuFil(fil: Fil<DecisionLue>) {
  return fil.racine.nature === null ? null : famille(fil.racine.nature);
}

/** La révision en vigueur d'une version, ou `null`. */
export function revisionEnVigueur(fils: readonly Fil<DecisionLue>[]): DecisionLue | null {
  const tetes = fils
    .filter(f => familleDuFil(f) === 'revision')
    .map(f => f.tete)
    .filter((t): t is DecisionLue => t !== null);
  return tetes.sort((a, b) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1)).at(-1) ?? null;
}

/**
 * Une séquence de mise en œuvre est LACUNAIRE, pour une portée (la version
 * entière, ou une action), quand un événement en vigueur en suppose un autre
 * qui n'est pas posé : une interruption, une reprise ou un arrêt sans début ;
 * une reprise sans interruption. Ce sont des déclarations : la base les
 * accepte ([[D-343]] §3), l'écran le dit, et rien n'est complété.
 */
export function sequenceIncomplete(fils: readonly Fil<DecisionLue>[], idAction: string | null): boolean {
  const natures = new Set<Nature | null>(
    fils
      .filter(f => familleDuFil(f) === 'mise_en_oeuvre' && f.tete !== null && f.tete.idAction === idAction)
      .map(f => f.tete!.nature),
  );
  const sansDebut = !natures.has('debut') && (natures.has('interruption') || natures.has('reprise') || natures.has('arret'));
  const repriseSansInterruption = natures.has('reprise') && !natures.has('interruption');
  return sansDebut || repriseSansInterruption;
}
