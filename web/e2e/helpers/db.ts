// Accès DB direct pour le nettoyage des tests Playwright — même schéma de
// connexion que web/prisma/seed.ts (imports relatifs, pas d'alias @/, ce
// fichier n'est pas exécuté via le resolver Next.js).
// N'agit que sur le patient fictif Michel Dogné (PAT_SEED_03, déjà seedé par
// `npm run prisma:seed`) : jamais de patient réel, jamais de DROP/TRUNCATE.
// La provision de la consultation/du token d'accès passe par la vraie route
// praticien (POST /api/praticien/consultations, cf. le spec) plutôt que par
// une écriture DB directe ici — sinon le patient atterrit dans un état
// ("aucune consultation") que le parcours normal ne produit jamais.
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma';
import { withSupabaseSslMode, supabasePoolSsl } from '../../src/lib/postgres';
import { getDocumentCourant } from '../../src/lib/trust/contenus/registre';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://node@localhost:5433/wellneuro_dev?host=/home/node/pgdata&schema=public';

const pool = new Pool({
  connectionString: withSupabaseSslMode(DATABASE_URL),
  ssl: supabasePoolSsl(DATABASE_URL),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Nettoie l'état "portail" laissé par un run de test précédent (assignations,
 * consultations, réponses liées) avant de reprovisionner une consultation
 * fraîche via l'API praticien. Ne touche jamais aux 5 réponses historiques
 * seedées par `npm run prisma:seed` (elles ont idAssignation=null, filtrées
 * ici).
 */
export async function resetPortailState(idPatient: string): Promise<void> {
  // Les nuits d'agenda AVANT les assignations : la clé étrangère
  // `agenda_sommeil_nuits_id_assignation_fkey` n'a pas de cascade, si bien
  // qu'une seule nuit laissée en base faisait échouer ce reset — et donc tous
  // les specs suivants du même patient, avec un message qui ne désignait pas
  // le coupable.
  await prisma.agendaSommeilNuit.deleteMany({ where: { idPatient } });
  // Journées d'agenda alimentaire : même FK RESTRICT vers `assignations`, donc
  // même piège, ajouté AVANT qu'une seule ligne n'existe. Attendre que le
  // symptôme revienne aurait coûté le diagnostic une seconde fois.
  await prisma.agendaAlimentaireJour.deleteMany({ where: { idPatient } });
  await prisma.assignation.deleteMany({ where: { idPatient } });
  await prisma.consultation.deleteMany({ where: { idPatient } });
  await prisma.questionnaireReponse.deleteMany({ where: { idPatient, idAssignation: { not: null } } });
  // TRUST : purge des traces du patient fictif pour que la séquence « Avant
  // de commencer » se représente à chaque run (idempotence du parcours).
  await prisma.trustAcknowledgement.deleteMany({ where: { idPatient } });
  await prisma.trustChoiceEvent.deleteMany({ where: { idPatient } });
  await prisma.trustAdverseEffectReport.deleteMany({ where: { idPatient } });
  await prisma.trustPrivacyIncident.deleteMany({ where: { idPatient } });
  await prisma.trustRightsRequest.deleteMany({ where: { idPatient } });
  // Le bilan transmis : sans ça, un run interrompu entre la provision et son
  // `afterAll` laisse le patient fictif avec un bilan visible dans la base
  // partagée — et un lien de plus dans la nav des specs suivants.
  await cleanupBilanTransmis();
}

/**
 * Met un patient fictif dans l'état « reprise » attendu par la proposition de
 * pack de réévaluation (SP-SPI / LOT-01), et renvoie son jeton d'accès portail.
 *
 * Réservé à un patient qu'aucun autre spec n'utilise (Jennifer Martin,
 * PAT_SEED_02) : ce helper mute ses réponses et son jeton, et deux specs
 * s'exécutent en parallèle sur la même base éphémère. L'appliquer à
 * `PAT_SEED_03` casserait `portail-parcours`.
 *
 * Trois écritures, toutes fidèles à un vrai patient qui revient après une longue
 * absence :
 *  1. un jeton d'accès permanent, tel qu'il aurait été posé à l'onboarding ;
 *  2. ses réponses transmises antidatées au-delà du seuil de reprise
 *     (`SEUIL_REPRISE_MOIS`), pour que « la dernière fois » soit lointaine ;
 *  3. l'accusé de lecture du cadre TRUST déjà donné — un patient qui revient a
 *     consenti à l'origine —, ce qui fait sauter « Avant de commencer ».
 * Et une remise à zéro : aucune proposition antérieure, sinon la question ne se
 * reposerait pas.
 */
export async function preparerReprisePourTest(idPatient: string): Promise<string> {
  const accessToken = `E2E_REPRISE_${idPatient}`;

  await prisma.patient.update({
    where: { idPatient },
    data: {
      accessToken,
      accessTokenRevoked: false,
      actif: true,
      accessTokenCreatedAt: new Date(),
      sessionsInvalidesAvant: null,
    },
  });

  // Bien au-delà de six mois : la reprise se déclenche sur la réponse la plus
  // récente, on antidate donc toutes les réponses seedées du patient.
  await prisma.questionnaireReponse.updateMany({
    where: { idPatient },
    data: { dateReponse: new Date('2025-01-01T00:00:00.000Z') },
  });

  const cadre = getDocumentCourant('cadre_accompagnement');
  await prisma.trustAcknowledgement.deleteMany({
    where: { idPatient, documentKey: 'cadre_accompagnement' },
  });
  await prisma.trustAcknowledgement.create({
    data: {
      idPatient,
      documentKey: 'cadre_accompagnement',
      documentVersion: cadre.version,
      contentHash: 'e2e-reprise',
      type: 'pris_connaissance',
    },
  });

  await prisma.packProposition.deleteMany({ where: { idPatient } });

  return accessToken;
}

/**
 * Pose l'accusé de lecture du cadre TRUST, et rien d'autre.
 *
 * `resetPortailState` l'efface, si bien qu'un spec qui ouvre le hub tombe sur
 * la séquence « Avant de commencer » (4 écrans) au lieu de l'écran qu'il teste.
 * `preparerReprisePourTest` le pose aussi, mais en antidatant les réponses —
 * ce qui déclencherait la bannière de reprise. D'où ce helper minimal.
 */
export async function accuserCadreTrust(idPatient: string): Promise<void> {
  const cadre = getDocumentCourant('cadre_accompagnement');
  await prisma.trustAcknowledgement.deleteMany({
    where: { idPatient, documentKey: 'cadre_accompagnement' },
  });
  await prisma.trustAcknowledgement.create({
    data: {
      idPatient,
      documentKey: 'cadre_accompagnement',
      documentVersion: cadre.version,
      contentHash: 'e2e-cadre',
      type: 'pris_connaissance',
    },
  });
}

/** Nettoie l'état de reprise laissé par un run (jeton, propositions, ack). */
export async function nettoyerReprise(idPatient: string): Promise<void> {
  await prisma.packProposition.deleteMany({ where: { idPatient } });
  await prisma.patient.update({
    where: { idPatient },
    data: { accessToken: null, accessTokenCreatedAt: null },
  });
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// Fixture « bilan transmis » — une synthèse validée ET l'envoi réussi qui la
// rend visible au patient. Les deux lignes comptent : la page « Mon bilan » ne
// sert QUE ce que le praticien a transmis (`BookletEnvoi.statut = 'Envoye'`),
// jamais une synthèse seulement validée. La fixture porte donc la paire.
//
// Le JSON embarque volontairement les trois blocs réservés au praticien (axes,
// vigilance, questions d'entretien) : sans eux, le spec ne prouverait pas
// qu'ils ne s'affichent pas.
const ID_SYNTHESE_E2E = 'SYN_E2E_BILAN_TRANSMIS';

export async function provisionBilanTransmis(
  idPatient: string,
  emailPatient: string,
  // `statutEnvoi` permet de jouer le contrôle NÉGATIF : un envoi en `Erreur`
  // n'a pas atteint le patient et ne doit rien rendre visible. Sans ce
  // paramètre, le spec ne prouverait que la moitié de la règle.
  options: { statutEnvoi?: 'Envoye' | 'Erreur' } = {},
): Promise<void> {
  await cleanupBilanTransmis();
  await prisma.syntheseIA.create({
    data: {
      idSynthese: ID_SYNTHESE_E2E,
      idPatient,
      emailPatient,
      modele: 'claude-opus-5',
      donneesEntree: { source: 'e2e-bilan-transmis' },
      syntheseJson: {
        resume_praticien: 'Résumé réservé au praticien',
        axes_prioritaires: [
          {
            axe: 'Sommeil',
            niveau_priorite: 'eleve',
            arguments: ['Réveils nocturnes répétés'],
            points_a_confirmer: ['Doser la ferritine'],
          },
        ],
        points_de_vigilance: ['Fatigue persistante à surveiller'],
        questions_entretien: ['Depuis quand dormez-vous mal ?'],
        narratif_patient: 'Vos réponses évoquent un sommeil fragmenté depuis plusieurs semaines.',
        limites: 'À valider en consultation.',
      },
      statut: 'Validee_Praticien',
      dateValidation: new Date('2026-07-18T09:00:00.000Z'),
      notesPraticien: 'On en reparle à votre prochain rendez-vous.',
    },
  });
  await prisma.bookletEnvoi.create({
    data: {
      idSynthese: ID_SYNTHESE_E2E,
      idPatient,
      emailPatientMasque: 'm***@fictif.wellneuro.fr',
      statut: options.statutEnvoi ?? 'Envoye',
      operation: 'Envoi',
      dateEnvoi: new Date('2026-07-18T09:30:00.000Z'),
      // L'instantané de ce qui est parti — ce que le portail sert. Il vaut ici
      // la note de la synthèse : c'est l'état juste après un envoi réel.
      noteTransmise: 'On en reparle à votre prochain rendez-vous.',
    },
  });
}

/**
 * Réécrit la note de la SYNTHÈSE après coup, sans rien envoyer — le geste
 * `annoter`, qui n'a aucune garde de cycle de vie. L'instantané de l'envoi
 * n'est pas touché : c'est exactement ce que le portail doit continuer de
 * servir, sans quoi un praticien publierait au patient un texte jamais
 * transmis, y compris sur un dossier clôturé.
 */
export async function annoterApresEnvoi(texte: string): Promise<void> {
  await prisma.syntheseIA.update({
    where: { idSynthese: ID_SYNTHESE_E2E },
    data: { notesPraticien: texte },
  });
}

/**
 * Rejette la synthèse déjà transmise — le geste du praticien qui s'aperçoit
 * après coup que le bilan était erroné. L'envoi reste en base (il a bien eu
 * lieu) ; c'est le rejet qui doit retirer le document de l'écran du patient.
 */
export async function rejeterBilanTransmis(): Promise<void> {
  await prisma.syntheseIA.update({
    where: { idSynthese: ID_SYNTHESE_E2E },
    data: { statut: 'Rejetee' },
  });
}

// L'envoi avant la synthèse : `booklet_envois.id_synthese` référence
// `syntheses_ia` sans cascade.
export async function cleanupBilanTransmis(): Promise<void> {
  await prisma.bookletEnvoi.deleteMany({ where: { idSynthese: ID_SYNTHESE_E2E } });
  await prisma.syntheseIA.deleteMany({ where: { idSynthese: ID_SYNTHESE_E2E } });
}

/**
 * Peuple la trajectoire d'un patient fictif d'un épisode T0 confirmé
 * (SP-TRAJ LOT-06) — le strict nécessaire pour que la Spirale ait un repère :
 * l'index se construit sur les épisodes confirmés, pas sur les valeurs. La
 * ligne est marquée par son id pour un nettoyage idempotent.
 *
 * Réservé à `PAT_SEED_03` (Michel Dogné) : aucun autre spec ne lit ses
 * épisodes — les parcours portail ne touchent pas `assessment_episodes`, et
 * les captures pixel du cockpit portent sur PAT_SEED_01.
 */
const ID_EPISODE_E2E = 'ep_e2e_spirale_peuplee';

export async function provisionEpisodeTrajectoire(idPatient: string): Promise<Date> {
  await cleanupEpisodeTrajectoire();
  const dateT0 = new Date('2026-06-01T09:00:00.000Z');
  await prisma.assessmentEpisode.create({
    data: {
      id: ID_EPISODE_E2E,
      idPatient,
      milestone: 'T0',
      targetAt: dateT0,
      confirmedAt: dateT0,
      payload: { source: 'e2e-spirale-peuplee' },
      payloadHash: 'e2e-spirale-peuplee',
      contractVersion: 'objets-cliniques-v1',
      cycleId: ID_EPISODE_E2E,
      versionScore: 'v1',
    },
  });
  return dateT0;
}

export async function cleanupEpisodeTrajectoire(): Promise<void> {
  await prisma.assessmentEpisode.deleteMany({ where: { id: ID_EPISODE_E2E } });
}

// ---------------------------------------------------------------------------
// Fixture « tirage caduc » (Atelier corpus, voie rapide) — reproduit l'état de
// WN-SRC-0056 : un tirage OUVERT dont le lot d'éligibles a divergé (ici : un
// claim VALIDÉ individuellement, donc plus aucun éligible voie rapide), rendant
// le tirage ni signable (etat_divergent) ni relançable → à clôturer par la
// nouvelle issue tirage_caduc. Tables SQL-brut (rag_corpus_*), hors modèles
// Prisma : SQL direct. Le claim est VALIDE (pas EN_ATTENTE) pour ne PAS peupler
// la file « En attente » que d'autres specs attendent vide.
const CADUC_SOURCE_ID = 'WN-SRC-0056';
const CADUC_CLAIM_PK = 'E2E_CADUC_0056_CLAIM';

export async function seedTirageCaducFixture(): Promise<string> {
  // Idempotence : claim propre à chaque run (table normale, DELETE permis).
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.rag_corpus_claims WHERE id = '${CADUC_CLAIM_PK}'`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.rag_corpus_claims
       (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
        typologie_lecture, prescriptif, statut, validateur, valide_at,
        embedding_model, embedding_dimensions, embedding)
     VALUES
       ('${CADUC_CLAIM_PK}', 'WN-CL-0056-901', '${CADUC_SOURCE_ID}', 'v1.0',
        'claim e2e caduc', repeat('e', 64), 'déclaré', false,
        'VALIDE', 'e2e@wellneuro.fr', now(), 'e2e', 1536,
        ('[' || repeat('0,', 1535) || '0]')::extensions.vector)`,
  );
  // Tirage OUVERT (sans issue) dont les éligibles figés ne correspondent plus
  // au lot courant (vide, le claim étant VALIDE) → tirageOuvertDeSource le rend
  // avec caduc = true, et la modale propose la clôture.
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, source_id, echantillon)
     VALUES ('tirage_echantillon', 'e2e@wellneuro.fr', '${CADUC_SOURCE_ID}',
             '{"seed":1,"taux":0.3,"taille":1,"lot":1,"eligibles":["E2E_CADUC_0056_GHOST"],"tires":["E2E_CADUC_0056_GHOST"]}'::jsonb)`,
  );
  return CADUC_SOURCE_ID;
}

// Le journal des décisions est append-only (DELETE bloqué par trigger) : on ne
// nettoie que le claim — la source disparaît alors de la vue d'ensemble ; les
// lignes de tirage/clôture restent comme trace, inertes pour les autres specs.
export async function cleanupTirageCaducFixture(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.rag_corpus_claims WHERE id = '${CADUC_CLAIM_PK}'`,
  );
}
