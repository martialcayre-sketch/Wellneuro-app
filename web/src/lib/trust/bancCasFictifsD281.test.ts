import { afterEach, describe, expect, it } from 'vitest';
import { REGLE_SECURITE_EFFET_INDESIRABLE, SAFETY_EI_METADATA, SAFETY_EI_SHA256 } from '@/lib/clinical/safetyEffetIndesirableV1';
import { construireSafetyFindings } from '@/lib/clinical-engine/safetyFindings';
import {
  elementsEnPause,
  messageDiffusionEnAttente,
  signalementsEnAttente,
  type SignalementRattache,
  type VerdictEffetIndesirable,
} from './pauseEffetIndesirable';

// LE BANC DE CAS FICTIFS DE LA RÈGLE AMENDÉE — [[D-281]] §6, étape 4.
//
// Le banc de vingt cas qui a éprouvé la règle livrée (§1) a été joué
// localement et n'a pas été suivi. Celui-ci le refait sur la règle amendée, en
// cas DÉCLARÉS : chacun pose un dossier fictif — signalements, verdicts,
// version du programme — et lit les trois sorties de la règle :
//
//   - ce qui est EN PAUSE au portail, et sous quel texte (§3, §4) ;
//   - si la DIFFUSION est refusée (§3) ;
//   - que la CARTE n'est jamais touchée : aucun constat (§1, §3).
//
// Aucun dossier réel : identifiants et intitulés de fiction (`D-125`). Les
// cas prouvent un mécanisme, ils ne décrivent aucun parcours.

const ORIENTATION = { actionId: 'action-1', type: 'medical_referral', title: 'Consulter votre médecin traitant' };
const BILAN = { actionId: 'action-2', type: 'biological_exploration', title: 'Prise de sang' };
const MAGNESIUM = { actionId: 'action-3', type: 'supplement_exploration', title: 'Magnésium le soir' };
const OMEGA = { actionId: 'action-4', type: 'supplement_exploration', title: 'Oméga-3 au déjeuner' };
const MARCHE = { actionId: 'action-5', type: 'gentle_activity', title: 'Marche de vingt minutes' };
const ASSIETTE = { actionId: 'action-6', type: 'dietary_adjustment', title: 'Légumes au dîner' };
const PROGRAMME = [ORIENTATION, BILAN, MAGNESIUM, OMEGA, MARCHE, ASSIETTE];
const V1 = 'programme-v1';
const V2 = 'programme-v2';

type Cas = {
  nom: string;
  signalements: SignalementRattache[];
  verdicts?: VerdictEffetIndesirable[];
  /** Version courante du programme (défaut : V1). */
  version?: string;
  pauses: Record<string, 'element' | 'complements' | 'avis_rendu'>;
  diffusionRefusee: boolean;
};

const sig = (id: string, over: Partial<SignalementRattache> = {}): SignalementRattache => ({
  id, rattachement: 'element', elementActionId: MAGNESIUM.actionId, protocolDraftId: V1, ...over,
});
/** Le formulaire d'avant : « oui » au programme, sans élément désigné (D-281 §5). */
const avant = (id: string, over: Partial<SignalementRattache> = {}): SignalementRattache =>
  sig(id, { rattachement: null, elementActionId: null, ...over });
const avis = (id: string, reportId: string, over: Partial<VerdictEffetIndesirable> = {}): VerdictEffetIndesirable => ({
  id, reportId, verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null, ...over,
});

const CAS: Cas[] = [
  {
    nom: '01 — élément désigné, sans avis : lui seul en pause, diffusion refusée',
    signalements: [sig('s1')],
    pauses: { [MAGNESIUM.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '02 — « Je ne sais pas » : tous les compléments, ni l’alimentation ni les routines',
    signalements: [sig('s1', { rattachement: 'ne_sait_pas', elementActionId: null })],
    pauses: { [MAGNESIUM.actionId]: 'complements', [OMEGA.actionId]: 'complements' },
    diffusionRefusee: true,
  },
  {
    nom: '03 — « un autre produit » : traité comme « Je ne sais pas » (§2)',
    signalements: [sig('s1', { rattachement: 'autre_produit', elementActionId: null })],
    pauses: { [MAGNESIUM.actionId]: 'complements', [OMEGA.actionId]: 'complements' },
    diffusionRefusee: true,
  },
  {
    nom: '04 — orientation et prise de sang désignées par erreur : jamais en pause',
    signalements: [sig('s1', { elementActionId: ORIENTATION.actionId }), sig('s2', { elementActionId: BILAN.actionId })],
    pauses: {},
    diffusionRefusee: true,
  },
  {
    nom: '05 — avis « non impliqué » : la pause est levée, la diffusion rouverte',
    signalements: [sig('s1')],
    verdicts: [avis('v1', 's1')],
    pauses: {},
    diffusionRefusee: false,
  },
  {
    nom: '06 — avis « impliqué » : l’élément reste en pause sous le texte de l’avis, l’aménagement peut partir',
    signalements: [sig('s1')],
    verdicts: [avis('v1', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId, amenagement: 'reduire' })],
    pauses: { [MAGNESIUM.actionId]: 'avis_rendu' },
    diffusionRefusee: false,
  },
  {
    nom: '07 — « Je ne sais pas », le praticien désigne un complément : lui seul reste en pause',
    signalements: [sig('s1', { rattachement: 'ne_sait_pas', elementActionId: null })],
    verdicts: [avis('v1', 's1', { verdict: 'implique', elementActionId: OMEGA.actionId, amenagement: 'retirer' })],
    pauses: { [OMEGA.actionId]: 'avis_rendu' },
    diffusionRefusee: false,
  },
  {
    nom: '08 — « Je ne sais pas », le praticien désigne « aucun » : tout est levé',
    signalements: [sig('s1', { rattachement: 'ne_sait_pas', elementActionId: null })],
    verdicts: [avis('v1', 's1')],
    pauses: {},
    diffusionRefusee: false,
  },
  {
    nom: '09 — avis corrigé, « impliqué » puis « non impliqué » : le dernier fait foi',
    signalements: [sig('s1')],
    verdicts: [
      avis('v1', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId, amenagement: 'differer' }),
      avis('v2', 's1', { supersedesVerdictId: 'v1' }),
    ],
    pauses: {},
    diffusionRefusee: false,
  },
  {
    nom: '10 — avis corrigé, « non impliqué » puis « impliqué » : l’élément revient en pause',
    signalements: [sig('s1')],
    verdicts: [
      avis('v1', 's1'),
      avis('v2', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId, amenagement: 'retirer', supersedesVerdictId: 'v1' }),
    ],
    pauses: { [MAGNESIUM.actionId]: 'avis_rendu' },
    diffusionRefusee: false,
  },
  {
    nom: '11 — chaîne à deux têtes : aucun avis élu, l’attente tient (fail-closed)',
    signalements: [sig('s1')],
    verdicts: [avis('v1', 's1'), avis('v2', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId })],
    pauses: { [MAGNESIUM.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '12 — signalement sur la version remplacée : rien en pause sur la nouvelle, la diffusion reste refusée',
    signalements: [sig('s1')],
    version: V2,
    pauses: {},
    diffusionRefusee: true,
  },
  {
    nom: '13 — même élément, un avis rendu et un signalement qui attend : le texte d’attente l’emporte',
    signalements: [sig('s1'), sig('s2')],
    verdicts: [avis('v1', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId, amenagement: 'reduire' })],
    pauses: { [MAGNESIUM.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '14 — un élément et « Je ne sais pas » : l’élément désigné garde son texte précis',
    signalements: [sig('s1'), sig('s2', { rattachement: 'ne_sait_pas', elementActionId: null })],
    pauses: { [MAGNESIUM.actionId]: 'element', [OMEGA.actionId]: 'complements' },
    diffusionRefusee: true,
  },
  {
    nom: '15 — deux signalements, un seul avis rendu : la diffusion reste refusée',
    signalements: [sig('s1'), sig('s2', { elementActionId: OMEGA.actionId })],
    verdicts: [avis('v1', 's1')],
    pauses: { [OMEGA.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '16 — l’avis d’un autre signalement ne lève rien',
    signalements: [sig('s1')],
    verdicts: [avis('v1', 's9')],
    pauses: { [MAGNESIUM.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '17 — aucun signalement : rien en pause, rien de refusé',
    signalements: [],
    pauses: {},
    diffusionRefusee: false,
  },
  // LE FORMULAIRE D'AVANT (D-281 §5, arbitrage du 2026-10-14) : « oui » au
  // programme sans élément désigné. Il attend l'avis comme les autres ; rien
  // n'est mis en pause au portail, faute d'élément désigné.
  {
    nom: '24 — formulaire d’avant, sans avis : rien en pause, diffusion refusée',
    signalements: [avant('s1')],
    pauses: {},
    diffusionRefusee: true,
  },
  {
    nom: '25 — formulaire d’avant, le praticien désigne « aucun » : diffusion rouverte',
    signalements: [avant('s1')],
    verdicts: [avis('v1', 's1')],
    pauses: {},
    diffusionRefusee: false,
  },
  {
    nom: '26 — formulaire d’avant, le praticien désigne un complément : rien en pause, diffusion rouverte',
    signalements: [avant('s1')],
    verdicts: [avis('v1', 's1', { verdict: 'implique', elementActionId: MAGNESIUM.actionId, amenagement: 'differer' })],
    pauses: {},
    diffusionRefusee: false,
  },
  {
    nom: '27 — formulaire d’avant sur la version remplacée : la diffusion reste refusée',
    signalements: [avant('s1')],
    version: V2,
    pauses: {},
    diffusionRefusee: true,
  },
  {
    nom: '28 — formulaire d’avant et élément désigné : l’élément seul en pause, diffusion refusée',
    signalements: [avant('s1'), sig('s2', { elementActionId: OMEGA.actionId })],
    pauses: { [OMEGA.actionId]: 'element' },
    diffusionRefusee: true,
  },
  {
    nom: '29 — formulaire d’avant sans avis, élément désigné avec avis : la diffusion reste refusée',
    signalements: [avant('s1'), sig('s2')],
    verdicts: [avis('v1', 's2')],
    pauses: {},
    diffusionRefusee: true,
  },
];

describe('banc de cas fictifs — D-281, règle amendée', () => {
  it.each(CAS.map(c => [c.nom, c] as const))('%s', (_nom, cas) => {
    const verdicts = cas.verdicts ?? [];
    const pauses = elementsEnPause({
      signalements: cas.signalements,
      verdicts,
      protocolDraftId: cas.version ?? V1,
      actions: PROGRAMME,
    });
    expect(Object.fromEntries(pauses.map(p => [p.actionId, p.texte]))).toEqual(cas.pauses);
    expect(signalementsEnAttente(cas.signalements, verdicts).length > 0).toBe(cas.diffusionRefusee);
  });
});

describe('ce que la règle amendée ne regarde pas', () => {
  // §5 : « le statut ne lève rien ». Le signalement porte ici son statut, et
  // le calcul ne le lit pas : passé à « traité » ou « clos » sans avis, il
  // attend toujours.
  it.each(['recu', 'en_cours', 'traite', 'clos'])('18 — statut %o sans avis : l’attente tient', (statutTraitement) => {
    expect(signalementsEnAttente([{ ...sig('s1'), statutTraitement }], [])).toHaveLength(1);
    expect(signalementsEnAttente([{ ...avant('s2'), statutTraitement }], [])).toHaveLength(1);
  });

  // §2 : sans programme visé — aucun programme diffusé, « non » au programme,
  // désignation illisible —, aucun avis ne s'y rend, et rien n'attend :
  // compter une attente qu'aucun geste ne lève enfermerait le dossier.
  it('19 — signalement sans rattachement ni programme : rien n’attend', () => {
    expect(signalementsEnAttente([{ id: 's1', rattachement: null, protocolDraftId: null }], [])).toHaveLength(0);
  });
});

describe('la carte n’est jamais touchée — règle signée simulée', () => {
  const ETAT_LIVRE = { ...SAFETY_EI_METADATA };
  afterEach(() => { Object.assign(SAFETY_EI_METADATA, ETAT_LIVRE); });

  // §3 : le praticien garde ses propositions et prépare la version suivante.
  it('20 — un signalement en attente ne produit aucun constat, quel que soit son rattachement', () => {
    Object.assign(SAFETY_EI_METADATA, {
      validationExterne: true,
      dateValidation: '2026-10-14T00:00:00.000Z',
      sourceReference: 'Signature simulée par le banc — jamais servie en production.',
      shaPerimetre: SAFETY_EI_SHA256,
    });
    const { findings } = construireSafetyFindings([], [
      { id: 's1', protocolDraftId: V1, rattachement: 'element', statutTraitement: 'recu' },
      { id: 's2', protocolDraftId: V1, rattachement: 'ne_sait_pas', statutTraitement: 'traite' },
      { id: 's3', protocolDraftId: V1, rattachement: 'autre_produit', statutTraitement: 'clos' },
      { id: 's4', protocolDraftId: V1, rattachement: null, statutTraitement: 'recu' },
    ], []);
    expect(findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)).toEqual([]);
  });
});

describe('le refus de diffusion nomme les signalements', () => {
  it('21 — un signalement : sa date de dépôt, à l’heure de Paris', () => {
    // 23 h 30 UTC le 12 = 01 h 30 le 13 à Paris.
    const message = messageDiffusionEnAttente([{ soumisLe: new Date('2026-10-12T23:30:00.000Z') }]);
    expect(message).toMatch(/^Un signalement d’effet indésirable, déposé le 13\/10\/2026, attend votre avis/);
    expect(message).toContain('Vos propositions et la version en préparation restent disponibles.');
  });

  it('22 — plusieurs signalements : leur nombre et chacune des dates', () => {
    const message = messageDiffusionEnAttente([
      { soumisLe: new Date('2026-10-10T10:00:00.000Z') },
      { soumisLe: new Date('2026-10-11T10:00:00.000Z') },
      { soumisLe: new Date('2026-10-12T10:00:00.000Z') },
    ]);
    expect(message).toMatch(
      /^3 signalements d’effet indésirable, déposés le 10\/10\/2026, le 11\/10\/2026 et le 12\/10\/2026, attendent votre avis/,
    );
  });

  it('23 — deux signalements du même jour : le nombre, la date une seule fois', () => {
    const message = messageDiffusionEnAttente([
      { soumisLe: new Date('2026-10-12T08:00:00.000Z') },
      { soumisLe: new Date('2026-10-12T15:00:00.000Z') },
    ]);
    expect(message).toMatch(/^2 signalements d’effet indésirable, déposés le 12\/10\/2026, attendent votre avis/);
  });
});
