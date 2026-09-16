// HARNAIS PARTAGÉ DES DEUX RAYONS NÉS DE LA SCISSION (2026-09-16).
//
// `RayonPatientsPanel` et `AssignationsPacksPanel` appellent les mêmes routes —
// `GET /api/praticien/patients` sert les dossiers à l'un et les assignations à
// l'autre — et se stubbent donc de la même façon. Deux copies de ce stub
// auraient dérivé : une branche ajoutée d'un côté, absente de l'autre, et un
// banc vert sur une route qui ne répond plus comme la vraie.
//
// CE FICHIER N'EST PAS COLLECTÉ PAR VITEST : son nom ne finit pas par
// `.test.tsx`. Il n'est importé que par des bancs, et par rien du code servi.
//
// Seuls les patients fictifs du dépôt peuvent apparaître ici.

import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

export const PATIENT = {
  idPatient: 'PAT_SEED_03',
  prenom: 'Michel',
  nom: 'Dogné',
  email: 'michel.dogne@fictif.wellneuro.fr',
  telephone: '',
  actif: 'OUI',
  suiviClotureLe: null as string | null,
  accesRevoque: false,
  // LE DOSSIER ADMINISTRATIF (LOT-05). Vides, et PRÉSENTS : la fiche rend des
  // champs contrôlés, et une valeur absente les ferait basculer en non
  // contrôlés — React le signale, puis la saisie se comporte autrement qu'en
  // production. Une fixture amputée du DTO ment sur ce que la route sert.
  dateNaissance: null as string | null,
  adresse: '',
  nir: '',
  medecinTraitantNom: '',
  medecinTraitantCoordonnees: '',
};

export const AUTRE_PATIENT = {
  idPatient: 'PAT_SEED_01',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@fictif.wellneuro.fr',
  telephone: '',
  actif: 'OUI',
  suiviClotureLe: null as string | null,
  accesRevoque: false,
  // LE DOSSIER ADMINISTRATIF (LOT-05). Vides, et PRÉSENTS : la fiche rend des
  // champs contrôlés, et une valeur absente les ferait basculer en non
  // contrôlés — React le signale, puis la saisie se comporte autrement qu'en
  // production. Une fixture amputée du DTO ment sur ce que la route sert.
  dateNaissance: null as string | null,
  adresse: '',
  nir: '',
  medecinTraitantNom: '',
  medecinTraitantCoordonnees: '',
};

/**
 * Le panneau charge plusieurs catalogues au montage ; on les rend vides.
 * `patient` permet de faire varier l'état du dossier affiché dans le tableau.
 */
export function stubFetch(options?: {
  surToken?: (body: unknown) => unknown;
  surCycleDeVie?: (body: unknown) => unknown;
  surAnnulation?: (body: unknown) => unknown;
  patient?: typeof PATIENT;
  patients?: (typeof PATIENT)[];
  /** Assignations exposées par le tableau « Assignations récentes » (Fil A). */
  assignations?: Record<string, unknown>[];
  /** Compte serveur du même ensemble : c'est lui qui révèle une troncature. */
  assignationsMeta?: { total: number; plafond: number; statut: string | null };
  /** Diffère la réponse du cycle de vie, pour éprouver la double soumission. */
  delaiCycleDeVie?: number;
  /**
   * Prend la main sur `GET /api/praticien/patients` : reçoit l'URL appelée et
   * rend la charge, ou lève pour simuler une panne réseau. Nécessaire dès que
   * la réponse doit DÉPENDRE de la requête — course entre deux statuts, échec.
   */
  surConsultations?: (body: unknown) => unknown;
  surPatients?: (url: string) => unknown;
}) {
  const appels: { url: string; method?: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      const body = init?.body ? JSON.parse(init.body) : undefined;
      appels.push({ url: String(url), method: init?.method, body });
      if (String(url).startsWith('/api/praticien/patients/cycle-de-vie')) {
        if (options?.delaiCycleDeVie) {
          await new Promise(resolve => setTimeout(resolve, options.delaiCycleDeVie));
        }
        return {
          ok: true,
          json: async () => options?.surCycleDeVie?.(body) ?? { success: true, action: 'cloture' },
        } as unknown as Response;
      }
      if (String(url).startsWith('/api/praticien/token')) {
        return {
          ok: true,
          json: async () => options?.surToken?.(body) ?? { success: true },
        } as unknown as Response;
      }
      // Sans cette branche, le POST consultation retombait sur le fourre-tout
      // du bas, qui rend `success: true` et RIEN d'autre. Le défaut ci-dessous
      // ne pose délibérément PAS `envoi` : c'est ce qui fait du banc existant
      // « la création de consultation refermée sur succès… » la garde du
      // défaut « champ absent ⇒ envoyé » de l'écran.
      if (String(url).startsWith('/api/praticien/consultations')) {
        return {
          ok: true,
          json: async () => options?.surConsultations?.(body) ?? { success: true, idConsultation: 'CONS_TEST' },
        } as unknown as Response;
      }
      if (String(url).startsWith('/api/praticien/assignations/annulation')) {
        return {
          ok: true,
          json: async () => options?.surAnnulation?.(body) ?? { ok: true },
        } as unknown as Response;
      }
      if (options?.surPatients && String(url).startsWith('/api/praticien/patients')) {
        const charge = await options.surPatients(String(url));
        return { ok: true, json: async () => charge } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          patients: options?.patients ?? [options?.patient ?? PATIENT],
          assignations: options?.assignations ?? [],
          ...(options?.assignationsMeta ? { assignationsMeta: options.assignationsMeta } : {}),
          questionnaires: [],
          packs: [],
          categories: [],
          success: true,
        }),
      } as unknown as Response;
    }),
  );
  return appels;
}

/**
 * Les actions sur un dossier vivent dans le menu de SA ligne. `rang` désigne
 * la ligne : c'est ce qui permet de vérifier qu'une confirmation porte bien
 * sur le patient dont on a ouvert le menu, et pas sur le premier du tableau.
 */
export async function ouvrirMenu(rang = 0) {
  const declencheurs = await screen.findAllByRole('button', { name: /gérer le dossier/i });
  fireEvent.click(declencheurs[rang]);
  return declencheurs[rang];
}

export const item = (motif: RegExp) => screen.getByRole('menuitem', { name: motif });
