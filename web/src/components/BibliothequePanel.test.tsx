// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { BibliothequePanel } from './BibliothequePanel';
import {
  LIBELLE_INSTRUMENT_CABINET,
  TEXTE_INSTRUMENTS_CABINET,
} from '@/lib/certification-libelles';
import type { BibliothequeEntree } from '@/lib/bibliotheque';

// Rendu des libellés de vérification de scoring — D-036 (LOT-02).
//
// POURQUOI CE FICHIER EXISTE. Le renommage de « Certifié » en « Scoring
// vérifié » était gardé par `lib/certificationLibelles.guard.test.ts` (les
// valeurs rendues par le module) et par un banc de rendu sur la fiche patient.
// La revue adversariale a montré que **la surface principale n'avait aucun rendu
// asséré** : `app/dashboard/bibliotheque/page.test.tsx` MOCKE ce composant, et
// l'E2E ne touche que le badge cabinet. Un composant qui calculerait le libellé
// par le module puis en afficherait un autre passait donc tout le CI, sur
// l'écran qui porte les 64 instruments du catalogue.
//
// Le contrôle de source du garde ne peut pas fermer ce trou : il refuse les
// ANCIENS libellés, à la casse près, donc `'Instrument certifié'` en minuscule
// lui échappe. Seul le rendu le ferme.

const ENTREE_BASE: BibliothequeEntree = {
  id: 'Q_TEST_01',
  titre: 'Instrument de banc — scoring vérifié',
  categorie: 'Sommeil',
  duree: '5 min',
  description: null,
  nbQuestions: 10,
  scoreMax: 30,
  certifie: true,
  statutCertification: 'certifie',
  assignable: true,
  aliasVers: null,
  passationPraticien: false,
};

function entree(surcharges: Partial<BibliothequeEntree>): BibliothequeEntree {
  return { ...ENTREE_BASE, ...surcharges };
}

// Les quatre états qui couvrent les quatre variantes de badge servies par la
// liste. Attendus **écrits à la main** : les dériver du module rendrait ce banc
// vrai par construction, et il ne dirait plus rien de l'affichage.
const ENTREES: Array<{ entree: BibliothequeEntree; libelleAttendu: string }> = [
  {
    entree: entree({ id: 'Q_VERT', titre: 'Instrument vérifié', certifie: true, statutCertification: 'certifie' }),
    libelleAttendu: 'Scoring vérifié',
  },
  {
    entree: entree({ id: 'Q_AMBIGU', titre: 'Instrument ambigu', certifie: false, statutCertification: 'ambigu' }),
    libelleAttendu: 'Scoring ambigu',
  },
  {
    entree: entree({ id: 'Q_AVERIF', titre: 'Instrument à vérifier', certifie: false, statutCertification: 'a_verifier' }),
    libelleAttendu: 'Scoring à vérifier',
  },
  {
    entree: entree({ id: 'Q_NON', titre: 'Instrument non vérifié', certifie: false, statutCertification: 'non_certifie' }),
    libelleAttendu: 'Scoring non vérifié',
  },
];

const ENTREE_CABINET = entree({
  id: 'CAB_TEST_01',
  titre: 'Instrument du cabinet de banc',
  certifie: false,
  statutCertification: 'non_certifie',
  cabinet: { statutRelecture: 'valide' },
});

function stubFetch() {
  const ok = (data: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/praticien/file-envoi')) return ok({ brouillons: [] });
    // Rendre `entrees: []` est délibéré : le composant ne remplace ses entrées
    // serveur que si la réponse en porte au moins une. Les entrées passées en
    // prop — celles que ce banc contrôle — restent donc affichées.
    if (url.includes('/api/praticien/bibliotheque')) return ok({ entrees: [] });
    if (url.includes('/api/praticien/instruments')) return ok({ instruments: [] });
    if (url.includes('/api/praticien/patients')) return ok({ patients: [] });
    return ok({});
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BibliothequePanel — libellés de vérification de scoring (D-036)', () => {
  it.each(ENTREES)(
    'la liste du catalogue rend « $libelleAttendu » pour $entree.id',
    async ({ entree: e, libelleAttendu }) => {
      stubFetch();
      render(<BibliothequePanel entrees={[e]} />);

      const ligne = (await screen.findByText(e.titre)).closest('li')!;
      expect(within(ligne).getByText(libelleAttendu)).toBeTruthy();
    },
  );

  it('aucun badge du catalogue ne porte plus le mot « certifié », dans aucun état', async () => {
    // Contrôle transversal : le banc ci-dessus prouve la présence du bon
    // libellé, celui-ci refuse la coexistence de l'ancien. Les deux sont
    // nécessaires — une présence seule est satisfaite par un écran qui affiche
    // les deux, une absence seule par un écran vide.
    stubFetch();
    render(<BibliothequePanel entrees={ENTREES.map(c => c.entree)} />);

    for (const { entree: e, libelleAttendu } of ENTREES) {
      const ligne = (await screen.findByText(e.titre)).closest('li')!;
      expect(within(ligne).getByText(libelleAttendu)).toBeTruthy();
      expect(ligne.textContent ?? '').not.toMatch(/certifi/i);
    }
  });

  it('le badge d’un instrument du cabinet dit que son scoring n’est pas vérifié', async () => {
    stubFetch();
    render(<BibliothequePanel entrees={[ENTREE_CABINET]} />);

    const ligne = (await screen.findByText(ENTREE_CABINET.titre)).closest('li')!;
    expect(within(ligne).getByText(LIBELLE_INSTRUMENT_CABINET)).toBeTruthy();
    expect(ligne.textContent ?? '').not.toMatch(/certifi/i);
  });

  it('la prose du tiroir cabinet DIT que le scoring n’est pas vérifié, pas l’inverse', async () => {
    // Le sens, pas seulement le vocabulaire : « leur scoring EST vérifié par
    // WellNeuro » ne porte pas le mot interdit et affirmerait l'inverse de
    // D-034. La constante est épinglée au mot près dans le garde du module ;
    // ici on vérifie qu'elle atteint bien l'écran.
    stubFetch();
    render(<BibliothequePanel entrees={[ENTREE_BASE]} />);

    const tiroir = await waitFor(() => screen.getByTestId('instruments-cabinet'));
    expect(within(tiroir).getByText(TEXTE_INSTRUMENTS_CABINET)).toBeTruthy();
    expect(tiroir.textContent ?? '').not.toMatch(/certifi/i);
  });
});
