import { beforeEach, describe, expect, it, vi } from 'vitest';

const { anthropic } = vi.hoisted(() => ({
  anthropic: { messages: { create: vi.fn() } },
}));
vi.mock('@/lib/anthropic', () => ({ anthropic, CLAUDE_MODEL: 'claude-par-defaut' }));

import {
  LONGUEUR_MAX_SYNTHESE,
  LONGUEUR_VISEE,
  VERSION_CONSIGNE,
  messageDeMatiere,
  modelePropositionComprehension,
  proposerComprehension,
} from './propositionComprehension';
import type { MatiereComprehension } from './matiereComprehension';

const matiere = (p: Partial<MatiereComprehension> = {}): MatiereComprehension => ({
  syntheses: [
    { idSynthese: 'SYN_1', narratifPatient: 'Premier texte validé.', axes: ['Sommeil', 'Digestif'] },
    { idSynthese: 'SYN_2', narratifPatient: 'Second texte validé.', axes: ['Énergie'] },
  ],
  desaccords: [],
  ...p,
});

const repond = (texte: string) =>
  anthropic.messages.create.mockResolvedValue({ content: [{ type: 'text', text: texte }] });

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.WN_MODELE_PROPOSITION_COMPREHENSION;
});

describe('le message de matière — ce qu’on donne au modèle', () => {
  it('donne les axes SANS numérotation — numéroter réintroduirait le rang interdit', () => {
    const message = messageDeMatiere(matiere());
    expect(message).toContain('Axes de travail validés avec ce texte : Sommeil, Digestif');
    expect(message).not.toMatch(/^\s*1\.\s/m);
    expect(message).not.toMatch(/^\s*[-•]\s*Sommeil/m);
  });

  it('donne les textes dans l’ordre de la matière, du plus ancien au plus récent', () => {
    const message = messageDeMatiere(matiere());
    expect(message.indexOf('Premier texte validé.')).toBeLessThan(
      message.indexOf('Second texte validé.'),
    );
  });

  it('une synthèse SANS axe garde son narratif — l’absence d’axes n’est pas l’absence de matière', () => {
    const message = messageDeMatiere(
      matiere({ syntheses: [{ idSynthese: 'SYN_1', narratifPatient: 'Un texte.', axes: [] }] }),
    );
    expect(message).toContain('Un texte.');
    expect(message).not.toContain('Axes de travail validés');
  });

  it('les désaccords arrivent sous leur propre intitulé, tels qu’écrits', () => {
    const message = messageDeMatiere(
      matiere({ desaccords: [{ idDesaccord: 'DES_1', texte: 'Ce n’est pas la fatigue.' }] }),
    );
    expect(message).toContain('CE QUE LE PATIENT A CONTESTÉ');
    expect(message).toContain('Ce n’est pas la fatigue.');
  });

  it('sans désaccord, la section n’existe pas — pas d’intitulé vide', () => {
    expect(messageDeMatiere(matiere())).not.toContain('CONTESTÉ');
  });
});

describe('l’appel qui propose un résumé global', () => {
  it('rend le texte, le modèle et la version de consigne', async () => {
    repond('  Vous décrivez un sommeil qui ne répare pas.  ');
    const resultat = await proposerComprehension(matiere());

    expect(resultat).toEqual({
      ok: true,
      texte: 'Vous décrivez un sommeil qui ne répare pas.',
      modele: 'claude-par-defaut',
      versionConsigne: VERSION_CONSIGNE,
    });
  });

  it('la consigne interdit d’inventer un ordre, et le dit au modèle', async () => {
    repond('Un texte.');
    await proposerComprehension(matiere());
    const consigne = (anthropic.messages.create.mock.calls[0][0].system as string).toLowerCase();
    for (const mot of ['ordre', 'hiérarchise', 'rang', 'liste', 'numérotation', 'diagnostic', 'score', 'seuil', 'bande']) {
      expect(consigne, `la consigne ne dit rien de « ${mot} »`).toContain(mot);
    }
    expect(consigne).toContain("n'ajoute rien");
  });

  it('un échec d’appel ne laisse RIEN remonter du fournisseur', async () => {
    anthropic.messages.create.mockRejectedValue(new Error('clé API sk-ant-xxxx invalide'));
    const resultat = await proposerComprehension(matiere());
    expect(resultat).toEqual({ ok: false, motif: 'indisponible' });
    expect(JSON.stringify(resultat)).not.toContain('sk-ant');
  });

  it('un texte vide est un ÉCHEC nommé, pas une proposition muette', async () => {
    repond('   ');
    expect(await proposerComprehension(matiere())).toEqual({ ok: false, motif: 'vide' });
  });

  it('une réponse sans bloc texte est un échec « vide », pas un plantage', async () => {
    anthropic.messages.create.mockResolvedValue({ content: [{ type: 'tool_use' }] });
    expect(await proposerComprehension(matiere())).toEqual({ ok: false, motif: 'vide' });
  });

  it('un dépassement se REFUSE, il ne se coupe pas', async () => {
    repond('a'.repeat(LONGUEUR_MAX_SYNTHESE + 1));
    expect(await proposerComprehension(matiere())).toEqual({ ok: false, motif: 'trop_longue' });
  });

  it('exactement la borne passe — un `<` la déplacerait d’un cran', async () => {
    repond('a'.repeat(LONGUEUR_MAX_SYNTHESE));
    const resultat = await proposerComprehension(matiere());
    expect(resultat.ok).toBe(true);
  });

  it('la longueur VISÉE ne fait rien respecter — un texte plus long est accepté', async () => {
    // Couper à 1 500 rendrait un texte que le modèle n'a pas écrit. Seule la
    // borne de 4 000 refuse.
    repond('a'.repeat(LONGUEUR_VISEE + 500));
    const resultat = await proposerComprehension(matiere());
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.texte).toHaveLength(LONGUEUR_VISEE + 500);
  });

  it('le modèle est réglable séparément, et suit CLAUDE_MODEL par défaut', () => {
    expect(modelePropositionComprehension()).toBe('claude-par-defaut');
    process.env.WN_MODELE_PROPOSITION_COMPREHENSION = 'claude-autre';
    expect(modelePropositionComprehension()).toBe('claude-autre');
  });

  it('l’appel ne vérifie PAS le minimum de deux synthèses — ce n’est pas sa charge', async () => {
    // La règle est opposée par la route et par un CHECK en base. La redoubler
    // ici en ferait une troisième copie, à dériver le jour où l'une bouge.
    repond('Un texte.');
    const resultat = await proposerComprehension(
      matiere({ syntheses: [{ idSynthese: 'SYN_1', narratifPatient: 'Seule.', axes: [] }] }),
    );
    expect(resultat.ok).toBe(true);
  });
});
