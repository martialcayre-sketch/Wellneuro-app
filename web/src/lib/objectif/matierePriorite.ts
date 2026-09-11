import { prisma } from '@/lib/prisma';

// L'ADAPTATEUR BORNÉ DE LA MATIÈRE DE PRIORITÉ — `D-167` §10, sur le patron de
// `plainteVerifiee.ts` (`D-164`).
//
// CE QU'IL ADMET, ET RIEN D'AUTRE :
//
//   1. `resume_praticien` d'une synthèse `Validee_Praticien` — l'entrée de
//      l'appel (`D-167` §3) ;
//   2. `narratif_patient` de la MÊME synthèse — la citation qui pré-remplit la
//      reformulation (`D-167` §2) ;
//   3. le dernier dépôt « ce qui compte pour moi », verbatim.
//
// CE QUI RESTE INTERDIT, ET POURQUOI CE FICHIER EXISTE :
//
//   - `axes_prioritaires` NE SORT JAMAIS D'ICI. C'est le point. Ces deux
//     clés vivent dans le MÊME blob `syntheseJson` qu'`axes_prioritaires`, qui
//     est un TABLEAU ORDONNÉ et tombe sous `DC-19`/`DC-20` : rendre le blob
//     entier le ferait voyager avec elles, et il suffirait ensuite d'une ligne
//     d'appelant pour le lire. La fonction extrait DEUX clés et construit un
//     objet neuf ; le blob ne franchit pas cette frontière ;
//   - AUCUN score, seuil, bande ni rang. Aucun de ces objets n'est lu ;
//   - AUCUN `Brouillon_IA`, aucune `Corrigee_Praticien` non validée. Une
//     synthèse non validée n'a pas été relue par un praticien : la citer
//     reviendrait à faire dire au dossier ce que la machine a écrit seule ;
//   - CE FICHIER NE FABRIQUE AUCUN TEXTE. Il rend ce qui est écrit, ou `null`.
//
// UNE CORRECTION À `D-167` §10, ÉCRITE PLUTÔT QUE TUE. La décision annonçait
// que la garde `G3` (`comprehensionAppendOnly.guard.test.ts`) verrait son
// `IMPORTS_INTERDITS` s'ouvrir à cet adaptateur. C'était une erreur de lecture :
// `G3` garde `syntheseComprehension.ts` et trois routes, et ce fichier n'en est
// pas — il lit `syntheses_ia`, une autre table. Il n'y avait donc rien à ouvrir.
// Et surtout, `IMPORTS_INTERDITS` n'aurait rien prouvé ici : interdire un import
// ne dit rien de ce qu'on EXTRAIT une fois la table lue. La garde qui compte est
// celle qui éprouve la SURFACE EXPOSÉE — `matierePriorite.guard.test.ts`.

/** Le statut, et le seul, qu'une synthèse doit porter pour être citable. */
export const STATUT_SYNTHESE_CITABLE = 'Validee_Praticien';

/**
 * La matière d'une synthèse validée, réduite à deux textes.
 *
 * PAS D'INDEX SIGNATURE, PAS DE CHAMP OUVERT : le type est fermé, et c'est lui
 * que la garde de surface énumère. Y ajouter une clé se voit.
 */
export type MatiereSynthese = {
  idSynthese: string;
  resumePraticien: string;
  narratifPatient: string;
};

/** Le dernier dépôt du patient, tel qu'il l'a écrit. */
export type MatiereDepot = {
  idDepot: string;
  texte: string;
  saisiLe: Date | null;
};

/**
 * Ce que les deux lectures rendent ensemble.
 *
 * `null` DIT « ABSENT », JAMAIS « VIDE » (`DC-24`). Une synthèse manquante et
 * une synthèse illisible ne se confondent pas non plus : la seconde lève, elle
 * ne rend pas `null`. L'appelant décide quoi en dire ; ce fichier ne décide pas
 * à sa place.
 */
export type MatierePriorite = {
  synthese: MatiereSynthese | null;
  depot: MatiereDepot | null;
};

/**
 * Extrait une clé texte d'un blob JSON, sans laisser passer le blob.
 *
 * EXPORTÉ depuis le 2026-09-11 pour le second adaptateur borné
 * (`matiereComprehension.ts`), qui lit le MÊME blob et doit le faire de la même
 * manière. Une seconde copie de six lignes dériverait de celle-ci le jour où
 * l'une change de définition du vide — et deux définitions du vide sur la même
 * donnée sont exactement le genre d'écart qui ne se voit pas.
 *
 * L'EXPORT N'OUVRE RIEN. Ce qui garde ces blobs n'a jamais été la portée de
 * cette fonction, mais la SURFACE de chaque adaptateur : les clés qu'il nomme,
 * et les types qu'il rend. Chacun a sa garde, et elles les énumèrent.
 */
export function texteDepuisBlob(blob: unknown, cle: string): string | null {
  if (typeof blob !== 'object' || blob === null) return null;
  const valeur = (blob as Record<string, unknown>)[cle];
  if (typeof valeur !== 'string') return null;
  const propre = valeur.trim();
  return propre === '' ? null : propre;
}

/**
 * La dernière synthèse VALIDÉE du dossier, réduite à ses deux textes.
 *
 * `select` NOMME SES COLONNES et ne prend pas `syntheseJson` par confort : il
 * lui faut le blob, mais rien d'autre — ni `donneesEntree`, ni `modele`, ni
 * `notesPraticien`. Ce qui n'est pas demandé ne peut pas fuir.
 */
export async function lireSyntheseCitable(idPatient: string): Promise<MatiereSynthese | null> {
  const ligne = await prisma.syntheseIA.findFirst({
    where: { idPatient, statut: STATUT_SYNTHESE_CITABLE },
    orderBy: { dateValidation: 'desc' },
    select: { idSynthese: true, syntheseJson: true },
  });
  if (ligne === null) return null;

  const resumePraticien = texteDepuisBlob(ligne.syntheseJson, 'resume_praticien');
  const narratifPatient = texteDepuisBlob(ligne.syntheseJson, 'narratif_patient');

  // LES DEUX SONT EXIGÉS. Une synthèse validée dont l'un des deux manque n'est
  // pas une demi-matière : elle ne permet ni de citer, ni d'appeler. Rendre un
  // objet à moitié rempli ferait porter l'arbitrage à chaque appelant.
  if (resumePraticien === null || narratifPatient === null) return null;

  return { idSynthese: ligne.idSynthese, resumePraticien, narratifPatient };
}

/** Le dernier dépôt « ce qui compte pour moi », verbatim. */
export async function lireDernierDepot(idPatient: string): Promise<MatiereDepot | null> {
  const ligne = await prisma.entreeCeQuiCompte.findFirst({
    where: { idPatient },
    orderBy: { creeLe: 'desc' },
    select: { id: true, texte: true, saisiLe: true },
  });
  if (ligne === null) return null;

  const texte = ligne.texte.trim();
  if (texte === '') return null;

  return { idDepot: ligne.id, texte, saisiLe: ligne.saisiLe };
}

/** Les deux pièces, lues ensemble. */
export async function lireMatierePriorite(idPatient: string): Promise<MatierePriorite> {
  const [synthese, depot] = await Promise.all([
    lireSyntheseCitable(idPatient),
    lireDernierDepot(idPatient),
  ]);
  return { synthese, depot };
}
