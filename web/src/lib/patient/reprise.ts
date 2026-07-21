import { SEUIL_REPRISE_MOIS } from '@/lib/fil/cartes';

/*
 * Reprise en douceur côté patient (SP-SPI / LOT-01).
 *
 * Le praticien voit déjà un signal « Suivi interrompu » dans son Fil
 * (`lib/fil/cartes.ts`, `cartesReprise`). Ce module donne au patient la même
 * lecture, à partir de la **même horloge et du même seuil** : sans quoi les
 * deux surfaces se contrediraient — un patient accueilli en reprise que le
 * praticien ne voit pas signalé, ou l'inverse.
 *
 * Le seuil n'est donc PAS redéfini ici : il est importé de sa source unique.
 *
 * Ce que la campagne interdit et qui se lit dans ce fichier : aucun compte à
 * rebours, aucun décompte de jours manqués, aucun jugement. L'absence n'est
 * jamais présentée comme un manquement — c'est une décision actée
 * (« reprise sans pression », REGISTRE_FRONTIERES.md, fiche SP-SPI).
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

export type EtatReprise =
  | { enReprise: false }
  | { enReprise: true; moisEcoules: number };

/**
 * Décide si le patient revient après une absence longue.
 *
 * `derniereReponseLe` est la date de la dernière réponse **transmise** — la
 * même horloge que le Fil praticien (`max(QuestionnaireReponse.dateReponse)`),
 * et non la dernière connexion : se connecter n'est pas participer.
 *
 * Un patient qui n'a jamais répondu n'est jamais « en reprise » : il n'a rien
 * interrompu. C'est le même choix que côté praticien.
 */
export function evaluerReprise(
  derniereReponseLe: string | null | undefined,
  maintenant: Date,
): EtatReprise {
  if (!derniereReponseLe) return { enReprise: false };

  const derniere = new Date(derniereReponseLe);
  if (Number.isNaN(derniere.getTime())) return { enReprise: false };

  const seuil = new Date(maintenant);
  seuil.setMonth(seuil.getMonth() - SEUIL_REPRISE_MOIS);
  if (derniere >= seuil) return { enReprise: false };

  // Même arrondi que le Fil praticien : jamais moins que le seuil, et exprimé
  // en mois — un décompte en jours ressemblerait à un reproche.
  const moisEcoules = Math.max(
    SEUIL_REPRISE_MOIS,
    Math.floor((maintenant.getTime() - derniere.getTime()) / (30 * JOUR_MS)),
  );
  return { enReprise: true, moisEcoules };
}

/**
 * Phrase d'accueil d'une reprise. Registre non injonctif, repris du
 * vocabulaire déjà employé côté praticien (« peut se discuter »), jamais
 * « vous devez » ni « vous avez manqué ».
 */
export function phraseReprise(moisEcoules: number): string {
  return `Votre dernier envoi date d’environ ${moisEcoules} mois. Reprenez à votre rythme, rien n’a été perdu.`;
}
