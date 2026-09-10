import { prisma } from '@/lib/prisma';
import { CANAL_PLAINTE } from '@/lib/clinical/priorityRulesV1';
import { scoresRecalculesPourRaisonnement } from '@/lib/clinical/orientationService';
import { plainteDominanteDepuisScores } from '@/lib/clinical-engine/chaineC1';

// L'ADAPTATEUR DE VÉRIFICATION D'UNE RESTITUTION D'INSTRUMENT — la SECONDE
// porte, et il faut dire pourquoi elle s'ouvre.
//
// LE DÉFAUT (`F1`, P1, contre-revue adverse du 2026-09-09). La route de
// proposition acceptait du NAVIGATEUR le fragment de restitution
// `{instrument, domaine, restitution}` et n'en contrôlait que la FORME avant de
// le recopier. Le praticien lisait ensuite « Restitution publiée par… » sous un
// texte que rien n'avait confronté. Deux conséquences, et la seconde est la
// pire : le texte entre dans l'empreinte de caducité, si bien qu'un envoi forgé
// SUPPLANTE l'assemblée légitime et rend les vraies propositions caduques.
//
// POURQUOI `D-115` NE SUFFISAIT PAS. Son adaptateur ne lit QUE le registre des
// règles — son point 3 l'écrit : « ni `clinical-engine`, ni `scoring`, ni
// `instruments`, ni `equilibre` ». Or une plainte dominante n'est pas dans le
// registre : elle se DÉRIVE des sous-scores d'une passation. Vérifier au serveur
// demandait donc d'amender `G7-1` une seconde fois, et cela ne pouvait pas se
// faire en douce : `D-115` écrit elle-même qu'« une exception non bornée
// transforme un interdit en préférence ».
//
// CE QUE CETTE PORTE ADMET, ET RIEN D'AUTRE :
//
//   1. `CANAL_PLAINTE` — quel instrument porte la plainte, depuis le registre ;
//   2. `scoresRecalculesPourRaisonnement` — la MÊME lecture que le cockpit, pour
//      que les deux ne puissent pas diverger. La recopier ici en ferait une
//      seconde vérité, et les cinq fermetures cliniques qu'elle porte seraient à
//      corriger deux fois ;
//   3. `plainteDominanteDepuisScores` — la dérivation, elle aussi partagée avec
//      le cockpit, départage technique compris.
//
// CE QUI RESTE INTERDIT :
//
//   - LA LECTURE BASE VIT ICI, ET C'EST `G7-2` QUI L'A EXIGÉ. Le premier
//     brouillon la laissait dans la route, qui sélectionnait `scoresJson` : le
//     banc « ni score, ni seuil, ni rang dans la route » a mordu, et il avait
//     raison. La route ne doit jamais TOUCHER un score — elle demande « quelle
//     plainte publies-tu ? » et compare. Aucun score ne franchit cette
//     frontière : ce fichier rend un domaine et une bande, jamais un chiffre ;
//   - il NE FABRIQUE AUCUN TEXTE. Il rend ce que l'instrument publie, ou `null` ;
//   - il NE CONCLUT RIEN. Une plainte dominante n'est pas un diagnostic : c'est
//     la restitution d'une bande déjà publiée (`D-054`, arbitrage 7) ;
//   - le module PUR `propositionObjectif.ts` n'importe toujours rien, ni ce
//     fichier ni un autre. Il part dans le bundle patient.

/** Une réponse de passation, telle que l'appelant l'a lue en base. */
export type ReponseCanal = {
  questionnaireId: string;
  scoresJson: unknown;
  observedAt: Date;
  statutValidite?: string | null;
};

/** La plainte que l'instrument publie réellement, telle que le serveur la lit. */
export type PlainteAuthentique = {
  instrument: string;
  domaine: string;
  restitution: string | null;
};

/**
 * LA PLAINTE DOMINANTE, RELUE AU SERVEUR — jamais reçue.
 *
 * `null` EST UNE RÉPONSE VALIDE et n'est pas une erreur : le canal de plainte
 * n'est pas toujours mesurable, une passation peut être invalidée, un dossier
 * peut n'en porter aucune. L'appelant doit alors REFUSER un fragment reçu, pas
 * en fabriquer un de remplacement (`DC-24`).
 *
 * LA PLUS RÉCENTE DÉCIDE, et le départage est explicite : à horodatage égal,
 * l'identifiant de réponse ne nous est pas passé, donc on retient la dernière
 * rencontrée dans l'ordre reçu. L'appelant sert un ordre déterministe.
 */
export function plainteDominanteVerifiee(reponses: ReponseCanal[]): PlainteAuthentique | null {
  const duCanal = reponses.filter((reponse) => reponse.questionnaireId === CANAL_PLAINTE);
  if (duCanal.length === 0) return null;

  const derniere = duCanal.reduce((plusRecente, reponse) =>
    reponse.observedAt.getTime() >= plusRecente.observedAt.getTime() ? reponse : plusRecente,
  );

  const scores = scoresRecalculesPourRaisonnement(
    CANAL_PLAINTE,
    (derniere.scoresJson ?? null) as Record<string, unknown> | null,
    derniere.observedAt,
    derniere.statutValidite ?? null,
  );
  // `scoresRecalculesPourRaisonnement` rend le même objet que celui que la
  // chaîne C1 passe à cette dérivation : la forme est partagée, pas convertie.
  const dominante = plainteDominanteDepuisScores(scores as Parameters<typeof plainteDominanteDepuisScores>[0]);
  if (dominante === null) return null;

  return {
    instrument: CANAL_PLAINTE,
    domaine: dominante.domaine,
    restitution: dominante.bande,
  };
}

/**
 * LE FRAGMENT REÇU DIT-IL CE QUE L'INSTRUMENT PUBLIE ?
 *
 * COMPARAISON STRICTE, ET C'EST LE POINT. Une tolérance — insensibilité à la
 * casse, espaces normalisés — rendrait la garde négociable : c'est exactement
 * par une « forme plausible » que le défaut est passé la première fois.
 *
 * UN FRAGMENT ABSENT CONCORDE AVEC UNE PLAINTE ABSENTE : ne rien citer quand il
 * n'y a rien à citer est la conduite juste, pas un échec.
 */
export function fragmentPlainteConcorde(
  recu: { instrument: string; domaine: string; restitution: string | null } | null,
  authentique: PlainteAuthentique | null,
): boolean {
  // NE RIEN CITER EST TOUJOURS PERMIS, même quand l'instrument publie quelque
  // chose : le cockpit qui s'abstient n'invente rien. C'est l'inverse — citer
  // quand l'instrument ne publie rien — qui est un mensonge.
  if (recu === null) return true;
  if (authentique === null) return false;
  return (
    recu.instrument === authentique.instrument
    && recu.domaine === authentique.domaine
    && (recu.restitution ?? null) === (authentique.restitution ?? null)
  );
}

/**
 * LA PLAINTE PUBLIÉE POUR UN DOSSIER, bornée à l'ÉPISODE CONFIRMÉ le plus
 * récent — jamais « la dernière passation du dossier ».
 *
 * LA BORNE N'EST PAS DU ZÈLE : une passation arrivée entre la confirmation de
 * l'épisode et l'assemblage n'a pas servi au calcul des candidats. La citer
 * ferait coexister DEUX plaintes dans une même proposition — celle qui a
 * déclenché les règles, et celle qu'on affiche.
 *
 * SANS ÉPISODE CONFIRMÉ, IL N'Y A RIEN À PUBLIER, donc rien à citer. Ce n'est
 * pas une erreur : c'est l'état d'un dossier qui n'a pas encore de `T0`.
 */
export async function plainteDominantePubliee(
  idPatient: string,
): Promise<PlainteAuthentique | null> {
  const episode = await prisma.assessmentEpisode.findFirst({
    where: { idPatient },
    select: { payload: true },
    orderBy: { confirmedAt: 'desc' },
  });
  if (!episode) return null;

  const payload = episode.payload as { includedResponseIds?: unknown } | null;
  const inclus = Array.isArray(payload?.includedResponseIds)
    ? (payload.includedResponseIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];
  if (inclus.length === 0) return null;

  const lignes = await prisma.questionnaireReponse.findMany({
    where: { idPatient, idReponse: { in: inclus } },
    select: {
      idQuestionnaire: true,
      scoresJson: true,
      dateReponse: true,
      statutValidite: true,
    },
  });

  return plainteDominanteVerifiee(
    lignes.map((ligne) => ({
      questionnaireId: ligne.idQuestionnaire,
      scoresJson: ligne.scoresJson,
      observedAt: ligne.dateReponse,
      statutValidite: ligne.statutValidite,
    })),
  );
}
