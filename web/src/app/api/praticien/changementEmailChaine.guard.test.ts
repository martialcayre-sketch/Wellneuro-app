// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// LA CHAÎNE COMPLÈTE : CHANGER L'E-MAIL NE REND MUETTE AUCUNE RÉPONSE
//
// CE BANC EXISTE PARCE QU'IL MANQUAIT, et son absence a été trouvée par la
// contre-revue de clôture, pas par le CI.
//
// Deux moitiés étaient gardées, et seulement deux :
//   — `PATCH /api/praticien/patients` émet bien quatre `updateMany` dans une
//     transaction (banc de la route des patients) ;
//   — `GET /api/praticien/reponses` interroge bien par `emailPatient` (banc de
//     la route des réponses).
// RIEN NE RELIAIT LES DEUX BOUTS. « Donc les réponses restent lisibles » était
// une inférence d'une ligne, juste, mais qu'aucun banc ne tenait — et c'est
// exactement le genre d'inférence qui survit à une refonte qui l'invalide.
//
// Ici, les deux routes partagent UN MÊME magasin en mémoire : le PATCH y écrit
// pour de vrai, le GET y lit pour de vrai. Si une seule des quatre réécritures
// disparaissait, ou si la route des réponses changeait de clé de lecture, ce
// banc tomberait — là où les deux autres resteraient verts.
// ═══════════════════════════════════════════════════════════════════════════

type Ligne = { idPatient: string; emailPatient: string; [k: string]: unknown };

const { getServerSession, prisma, magasin } = vi.hoisted(() => {
  const magasin = {
    patient: { idPatient: 'PAT_SEED_01', email: 'ancienne@fictif.wellneuro.fr' },
    reponses: [] as Ligne[],
    consultations: [] as Ligne[],
    assignations: [] as Ligne[],
    syntheses: [] as Ligne[],
  };
  const reecrire = (table: Ligne[]) => async (args: {
    where: { idPatient: string };
    data: { emailPatient: string };
  }) => {
    let n = 0;
    for (const ligne of table) {
      if (ligne.idPatient === args.where.idPatient) {
        ligne.emailPatient = args.data.emailPatient;
        n++;
      }
    }
    return { count: n };
  };
  return {
    getServerSession: vi.fn(),
    magasin,
    prisma: {
      patient: {
        findUnique: vi.fn(),
        update: vi.fn(async (args: { data: { email?: string } }) => {
          if (args.data.email) magasin.patient.email = args.data.email;
          return magasin.patient;
        }),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      questionnaireReponse: {
        updateMany: vi.fn(reecrire(magasin.reponses)),
        findMany: vi.fn(async (args: { where: { emailPatient: string } }) =>
          magasin.reponses.filter(r => r.emailPatient === args.where.emailPatient),
        ),
      },
      // LES TROIS AUTRES PORTEUSES ONT LEURS PROPRES LIGNES, et ce n'est pas du
      // décor (constat de revue, 2026-09-17). Écrites en `no-op`, elles ne
      // détectaient RIEN : supprimer l'un de leurs `updateMany` laissait ce banc
      // vert, alors qu'il prétend tomber si une seule réécriture disparaît.
      // Vérifié : la mutation passait. Un banc qui promet plus qu'il ne garde
      // est pire qu'un banc absent — on cesse de chercher ailleurs.
      consultation: { updateMany: vi.fn(reecrire(magasin.consultations)) },
      assignation: {
        updateMany: vi.fn(reecrire(magasin.assignations)),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      syntheseIA: { updateMany: vi.fn(reecrire(magasin.syntheses)) },
      portailMagicLink: { updateMany: vi.fn(async () => ({ count: 0 })) },
      journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
      agendaAlimentaireJour: { findMany: vi.fn() },
      // LES `$transaction` SONT EXÉCUTÉES, pas simplement comptées : les
      // constructeurs Prisma sont déjà évalués au moment où le tableau se
      // construit, donc les écritures ont réellement eu lieu sur le magasin.
      $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
  };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { PATCH } from '@/app/api/praticien/patients/route';
import { GET as LIRE_REPONSES } from '@/app/api/praticien/reponses/route';

const PRATICIEN = 'p@wellneuro.fr';
const ANCIENNE = 'ancienne@fictif.wellneuro.fr';
const NOUVELLE = 'nouvelle@fictif.wellneuro.fr';

function lireReponses(email: string): Request {
  return new Request(
    `http://localhost/api/praticien/reponses?email=${encodeURIComponent(email)}`,
  );
}

describe('Changer l’e-mail d’un dossier — la chaîne complète', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
    magasin.patient = { idPatient: 'PAT_SEED_01', email: ANCIENNE };
    for (const table of [
      magasin.reponses,
      magasin.consultations,
      magasin.assignations,
      magasin.syntheses,
    ]) {
      table.length = 0;
      table.push({ idPatient: 'PAT_SEED_01', emailPatient: ANCIENNE });
    }
    magasin.reponses.length = 0;
    magasin.reponses.push({
      idReponse: 'REP_AVANT',
      idPatient: 'PAT_SEED_01',
      emailPatient: ANCIENNE,
      idAssignation: 'ASS_1',
      idQuestionnaire: 'Q_SOM_06',
      titre: 'Sommeil',
      dateReponse: new Date('2026-07-01T00:00:00.000Z'),
      scoresJson: {},
      scorePrincipal: 3,
      interpretation: 'Faible',
    });
    // Appartenance, puis ancienne adresse, puis contrôle d'unicité.
    prisma.patient.findUnique
      .mockResolvedValueOnce({ idPatient: 'PAT_SEED_01', praticienEmail: PRATICIEN })
      .mockResolvedValueOnce({ email: ANCIENNE })
      .mockResolvedValueOnce(null);
  });

  it('★ une réponse déposée AVANT le changement reste lisible APRÈS', async () => {
    // Avant : la réponse se lit sur l'ancienne adresse.
    const avant = await LIRE_REPONSES(lireReponses(ANCIENNE));
    expect(((await avant.json()) as { reponses: unknown[] }).reponses).toHaveLength(1);

    const patch = await PATCH(
      new Request('http://localhost/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: 'PAT_SEED_01', email: NOUVELLE }),
      }),
    );
    expect(patch.status).toBe(200);

    // APRÈS : c'est la seule assertion qui compte. Sans la réécriture des
    // copies, cette liste serait VIDE — et le praticien lirait « aucune
    // réponse » sur un dossier qui en porte une.
    const apres = await LIRE_REPONSES(lireReponses(NOUVELLE));
    const corps = (await apres.json()) as { reponses: { idReponse: string }[] };
    expect(corps.reponses).toHaveLength(1);
    expect(corps.reponses[0].idReponse).toBe('REP_AVANT');
  });

  it('★ LES QUATRE COPIES SUIVENT, pas seulement celle qu’on interroge', async () => {
    // CE BANC EXISTE PARCE QUE LE PRÉCÉDENT NE SUFFISAIT PAS, et c'est une revue
    // qui l'a montré : `GET /api/praticien/reponses` n'interroge qu'UNE des
    // quatre tables, donc le banc de bout en bout ne pouvait attraper que
    // celle-là. Les trois autres étaient des mocks sans lignes — supprimer leur
    // `updateMany` laissait tout vert. Vérifié : la mutation passait.
    //
    // Les trois autres copies ne sont pas décoratives : `consultations` et
    // `assignations` sont lues par e-mail ailleurs dans l'application, et
    // `syntheses_ia` porte l'adresse d'un envoi. Une copie restée sur
    // l'ancienne adresse est une ligne orpheline, silencieuse.
    await PATCH(
      new Request('http://localhost/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: 'PAT_SEED_01', email: NOUVELLE }),
      }),
    );

    const tables: [string, typeof magasin.reponses][] = [
      ['questionnaire_reponses', magasin.reponses],
      ['consultations', magasin.consultations],
      ['assignations', magasin.assignations],
      ['syntheses_ia', magasin.syntheses],
    ];
    for (const [nom, lignes] of tables) {
      expect(lignes.length, `${nom} : le banc doit porter au moins une ligne`).toBeGreaterThan(0);
      for (const ligne of lignes) {
        expect(ligne.emailPatient, `${nom} est restée sur l’ancienne adresse`).toBe(NOUVELLE);
      }
    }
  });

  it('et l’ANCIENNE adresse ne rend plus rien — la copie a bougé, elle n’a pas été dupliquée', async () => {
    await PATCH(
      new Request('http://localhost/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: 'PAT_SEED_01', email: NOUVELLE }),
      }),
    );
    const apres = await LIRE_REPONSES(lireReponses(ANCIENNE));
    expect(((await apres.json()) as { reponses: unknown[] }).reponses).toHaveLength(0);
  });
});
