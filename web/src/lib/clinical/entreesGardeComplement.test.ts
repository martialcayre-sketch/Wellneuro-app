import { describe, expect, it } from 'vitest';
import { lireDeclarationsEtat, lireEntreesGardeComplement } from './entreesGardeComplement';

// Les entrées de la garde lues dans le dossier (D-345 §3, §6) — sur un client
// simulé : la forme des lectures, pas la base.

type LignePhysio = {
  id: string;
  ordre: bigint;
  acte: string;
  critere: string;
  reponse: string | null;
  source: string;
  idLigneRemplacee: string | null;
  acteLe: Date;
};

function ligne(partiel: Partial<LignePhysio> & Pick<LignePhysio, 'id' | 'ordre' | 'critere'>): LignePhysio {
  return {
    acte: 'pose',
    reponse: 'oui',
    source: 'praticien',
    idLigneRemplacee: null,
    acteLe: new Date('2026-10-01T10:00:00.000Z'),
    ...partiel,
  } as LignePhysio;
}

function client(entrees: {
  physio?: LignePhysio[];
  consultations?: { anamnese: unknown; dateValidation: Date | null }[];
  dateNaissance?: string | null;
  patientAbsent?: boolean;
  choix?: { finalite: string; statut: string; enregistreLe: Date }[];
}) {
  const vus: { consultationWhere?: unknown } = {};
  const fake = {
    donneePhysiologique: {
      findMany: async () => (entrees.physio ?? []).map(l => ({
        ...l, mesure: null, mesureLe: null, praticienEmail: null,
      })),
    },
    traitementEnCours: { findMany: async () => [] },
    consultation: {
      findMany: async (args: { where: unknown }) => {
        vus.consultationWhere = args.where;
        return entrees.consultations ?? [];
      },
    },
    patient: {
      findUnique: async () => (entrees.patientAbsent ? null : { dateNaissance: 'dateNaissance' in entrees ? entrees.dateNaissance : '1990-01-01' }),
    },
    trustChoiceEvent: { findMany: async () => entrees.choix ?? [] },
  };
  return { fake: fake as never, vus };
}

describe('lireDeclarationsEtat — les lignes EN VIGUEUR (D-345 §3)', () => {
  it('fiche physiologique : la tête de fil seule, datée par acteLe', async () => {
    const { fake } = client({
      physio: [
        ligne({ id: 'g1', ordre: BigInt(1), critere: 'grossesse', reponse: 'oui' }),
        ligne({
          id: 'g2', ordre: BigInt(2), critere: 'grossesse', reponse: 'non', idLigneRemplacee: 'g1',
          acteLe: new Date('2026-10-05T10:00:00.000Z'),
        }),
      ],
    });
    expect(await lireDeclarationsEtat(fake, 'p')).toEqual([
      { critere: 'grossesse', reponse: 'non', source: 'praticien', le: '2026-10-05T10:00:00.000Z' },
    ]);
  });

  it('un fil clos par un retrait ne donne aucune déclaration', async () => {
    const { fake } = client({
      physio: [
        ligne({ id: 'a1', ordre: BigInt(1), critere: 'allaitement', reponse: 'oui' }),
        ligne({ id: 'a2', ordre: BigInt(2), critere: 'allaitement', acte: 'retrait', reponse: null, idLigneRemplacee: 'a1' }),
      ],
    });
    expect(await lireDeclarationsEtat(fake, 'p')).toEqual([]);
  });

  it('une réponse hors liste fermée se lit « inconnu »', async () => {
    const { fake } = client({ physio: [ligne({ id: 'g1', ordre: BigInt(1), critere: 'grossesse', reponse: 'peut-être' })] });
    expect((await lireDeclarationsEtat(fake, 'p'))[0]?.reponse).toBe('inconnu');
  });

  it('anamnèse : chaque consultation envoyée, datée par son envoi ; non datée = `le: null`', async () => {
    const { fake, vus } = client({
      consultations: [
        { anamnese: { etat_grossesse: 'Oui' }, dateValidation: new Date('2026-09-01T08:00:00.000Z') },
        { anamnese: { etat_grossesse: 'Non' }, dateValidation: null },
      ],
    });
    const declarations = await lireDeclarationsEtat(fake, 'p');
    const grossesse = declarations.filter(d => d.critere === 'grossesse');
    expect(grossesse).toEqual([
      { critere: 'grossesse', reponse: 'oui', source: 'anamnese', le: '2026-09-01T08:00:00.000Z' },
      { critere: 'grossesse', reponse: 'non', source: 'anamnese', le: null },
    ]);
    // Seules les consultations ENVOYÉES : la condition partagée de D-101.
    expect(vus.consultationWhere).toMatchObject({ idPatient: 'p', statut: 'validee' });
  });
});

describe('lireEntreesGardeComplement — âge, déclarations, accord', () => {
  it('rend l’âge, les déclarations et le motif de l’accord', async () => {
    const { fake } = client({
      dateNaissance: '2015-06-01',
      choix: [{ finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-10-01T00:00:00Z') }],
    });
    const entrees = await lireEntreesGardeComplement(fake, 'p', [], Date.parse('2026-10-24T00:00:00Z'));
    expect(entrees).toMatchObject({ statutAge: 'mineur', accordPartage: 'accorde', declarations: [] });
  });

  it('date de naissance absente : `date_manquante` ; silence sur l’accord : `jamais_exprime`', async () => {
    const { fake } = client({ dateNaissance: null });
    const entrees = await lireEntreesGardeComplement(fake, 'p', [], Date.parse('2026-10-24T00:00:00Z'));
    expect(entrees).toMatchObject({ statutAge: 'date_manquante', accordPartage: 'jamais_exprime' });
  });

  it('dossier absent : `null`', async () => {
    const { fake } = client({ patientAbsent: true });
    expect(await lireEntreesGardeComplement(fake, 'p', [], 0)).toBeNull();
  });
});
