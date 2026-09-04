/**
 * Dossiers de DÉMONSTRATION locale — jamais créés par défaut.
 *
 * POURQUOI CE MODULE EXISTE. Les trois dossiers du seed ordinaire sont VIDES à
 * dessein : leur absence d'anamnèse, d'épisode et de trajectoire est le contrat
 * que la suite de tests vérifie — 39 assertions d'état vide, dont
 * `copilote-prevol.spec.ts` qui exige « Aucune consultation validée à ce jour »
 * sur `PAT_SEED_01`, et `visual.spec.ts` qui photographie son cockpit au pixel.
 * Les enrichir casserait la suite. Un cockpit local peuplé demande donc des
 * dossiers SUPPLÉMENTAIRES, que rien ne teste.
 *
 * LES IDENTITÉS NE CHANGENT PAS. La règle du dépôt (`CLAUDE.md`,
 * `.claude/rules/frontend-ui.md`) n'autorise que Sophie Nicola, Jennifer Martin
 * et Michel Dogné comme données d'exemple. Ces dossiers les REPRENNENT, avec
 * des identifiants et des adresses distincts — un même patient peut avoir
 * plusieurs dossiers, et la contrainte d'unicité ne porte que sur l'e-mail.
 * Aucune identité nouvelle n'entre dans le dépôt.
 *
 * ILS NE SORTENT QUE SOUS DEMANDE (`WN_SEED_DEMO=1`, posé par
 * `scripts/wn-dev-db.sh --demo`). Le CI, `test:worktree` et les E2E ne les
 * voient jamais : leur base est semée sans le drapeau.
 *
 * AUCUNE DONNÉE RÉELLE, ici comme ailleurs. Les réponses sont celles du seed
 * ordinaire, réutilisées sous d'autres identifiants — recopier le catalogue une
 * seconde fois aurait ouvert la dérive que `seedCertification.guard.test.ts`
 * existe pour fermer.
 */
import { REPONSES_MICHEL, REPONSES_SOPHIE } from './seedReponses';

const PRATICIEN = 'martialcayre@wellneuro.fr';

/**
 * Trois situations que le seed ordinaire ne peut pas porter.
 *
 * Elles sont choisies pour ce qu'elles font VOIR à l'écran, pas pour couvrir un
 * modèle de données : un dossier au travail, un dossier qui attend son patient,
 * un dossier clos. Ce sont les trois états entre lesquels le praticien navigue.
 */
export const PATIENTS_DEMO = [
  {
    idPatient: 'PAT_DEMO_01',
    email: 'sophie.nicola+demo-au-travail@fictif.wellneuro.fr',
    prenom: 'Sophie',
    nom: 'Nicola',
    dateNaissance: '1985-03-12',
    telephone: '06 11 22 33 44',
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  },
  {
    idPatient: 'PAT_DEMO_02',
    email: 'jennifer.martin+demo-en-attente@fictif.wellneuro.fr',
    prenom: 'Jennifer',
    nom: 'Martin',
    dateNaissance: '1979-07-28',
    telephone: '06 55 66 77 88',
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  },
  {
    idPatient: 'PAT_DEMO_03',
    email: 'michel.dogne+demo-clos@fictif.wellneuro.fr',
    prenom: 'Michel',
    nom: 'Dogné',
    dateNaissance: '1971-11-05',
    telephone: '06 99 00 11 22',
    praticienEmail: PRATICIEN,
    actif: true,
    // Suivi clôturé : le dossier reste lisible, les assignations cessent.
    suiviClotureLe: new Date('2026-08-20T10:00:00.000Z'),
  },
];

/**
 * Les consultations validées, avec leur anamnèse.
 *
 * LES TROIS CLÉS SONT CELLES QUE LA ROUTE LIT (`api/praticien/objectifs`,
 * `lireAncrage`) : `motif_principal`, `objectif_prioritaire`, `attentes`.
 * En inventer d'autres remplirait la base sans rien changer à l'écran.
 *
 * `PAT_DEMO_02` porte une anamnèse VOLONTAIREMENT PARTIELLE : sa consultation
 * est validée, son objectif prioritaire ne l'est pas. C'est la distinction que
 * `DC-24` impose de rendre visible — « non renseigné à l'anamnèse » n'est pas
 * « aucune consultation validée », et les deux phrases diffèrent à l'écran.
 */
export const CONSULTATIONS_DEMO = [
  {
    idConsultation: 'CONS_DEMO_01',
    idPatient: 'PAT_DEMO_01',
    emailPatient: 'sophie.nicola+demo-au-travail@fictif.wellneuro.fr',
    praticienEmail: PRATICIEN,
    statut: 'validee',
    motif: 'Fatigue persistante et sommeil fragmenté',
    dateValidation: new Date('2026-06-05T09:00:00.000Z'),
    anamnese: {
      motif_principal: 'Fatigue au réveil malgré des nuits complètes, depuis environ six mois.',
      objectif_prioritaire: 'Retrouver de l’énergie le matin sans dépendre du café.',
      attentes: ['Mieux dormir', 'Comprendre ce qui se joue', 'Éviter les compléments inutiles'],
    },
  },
  {
    idConsultation: 'CONS_DEMO_02',
    idPatient: 'PAT_DEMO_02',
    emailPatient: 'jennifer.martin+demo-en-attente@fictif.wellneuro.fr',
    praticienEmail: PRATICIEN,
    statut: 'validee',
    motif: 'Digestion difficile en fin de journée',
    dateValidation: new Date('2026-08-28T09:00:00.000Z'),
    anamnese: {
      motif_principal: 'Ballonnements réguliers en soirée, sans lien alimentaire identifié.',
      // Volontairement absent : voir le commentaire du bloc.
      attentes: [],
    },
  },
  {
    idConsultation: 'CONS_DEMO_03',
    idPatient: 'PAT_DEMO_03',
    emailPatient: 'michel.dogne+demo-clos@fictif.wellneuro.fr',
    praticienEmail: PRATICIEN,
    statut: 'validee',
    motif: 'Bilan de fin de suivi',
    dateValidation: new Date('2026-05-14T09:00:00.000Z'),
    anamnese: {
      motif_principal: 'Suivi arrivé à son terme, bilan demandé par le patient.',
      objectif_prioritaire: 'Consolider ce qui a été mis en place.',
      attentes: ['Faire le point'],
    },
  },
];

/**
 * Les passations, RÉUTILISÉES du seed ordinaire sous d'autres identifiants.
 *
 * `PAT_DEMO_02` n'en reçoit AUCUNE, et c'est tout l'intérêt du dossier : il
 * montre l'écran « en attente du patient », que les trois dossiers ordinaires
 * ne peuvent pas montrer puisqu'ils portent tous des réponses.
 */
export const REPONSES_DEMO = [
  {
    idPatient: 'PAT_DEMO_01',
    email: 'sophie.nicola+demo-au-travail@fictif.wellneuro.fr',
    reponses: REPONSES_SOPHIE.map((r) => ({ ...r, idReponse: `${r.idReponse}_DEMO` })),
  },
  {
    idPatient: 'PAT_DEMO_03',
    email: 'michel.dogne+demo-clos@fictif.wellneuro.fr',
    reponses: REPONSES_MICHEL.map((r) => ({ ...r, idReponse: `${r.idReponse}_DEMO` })),
  },
];
