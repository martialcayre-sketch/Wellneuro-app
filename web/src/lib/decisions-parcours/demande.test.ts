import { describe, expect, it } from 'vitest';
import { lireDemande } from './demande';
import { MESSAGES_REFUS } from './messages';

// La demande d'une décision de parcours ([[D-343]] §2-§6), lue AVANT toute
// écriture. Les identifiants sont synthétiques.

const AUJOURDHUI = '2026-10-22';
const V = 'proto_fixture#abc';
const lire = (corps: Record<string, unknown>) => lireDemande(corps, AUJOURDHUI);
const raison = (lu: { ok: boolean; raison?: string }) => (lu.ok ? 'ok' : lu.raison);

const debut = { acte: 'pose', idVersion: V, nature: 'debut', source: 'rapporte_par_patient', evenementLe: '2026-10-20' };
const refus = { acte: 'pose', idVersion: V, nature: 'refus', source: 'rapporte_par_patient', motif: 'choix_du_patient' };
const revision = { acte: 'pose', idVersion: V, nature: 'revision', issue: 'maintenir' };

describe('décision de parcours — lecture de la demande', () => {
  it('un début réel daté se lit entier, sans motif ni issue', () => {
    expect(lire(debut)).toEqual({
      ok: true,
      demande: {
        acte: 'pose',
        idVersion: V,
        idAction: null,
        nature: 'debut',
        issue: null,
        motif: null,
        note: null,
        evenementLe: '2026-10-20',
        evenementInconnu: false,
        source: 'rapporte_par_patient',
        idVersionSuivante: null,
        remplace: null,
      },
    });
  });

  it('la date d’un événement : au jour, ou « inconnue » écrite ; jamais devinée ni future (§4)', () => {
    expect(raison(lire({ ...debut, evenementLe: undefined }))).toBe('date_requise');
    expect(lire({ ...debut, evenementLe: undefined, evenementInconnu: true })).toMatchObject({
      ok: true,
      demande: { evenementLe: null, evenementInconnu: true },
    });
    expect(raison(lire({ ...debut, evenementInconnu: true }))).toBe('date_invalide');
    expect(raison(lire({ ...debut, evenementLe: '2026-02-31' }))).toBe('date_invalide');
    expect(raison(lire({ ...debut, evenementLe: '2026-10' }))).toBe('date_invalide');
    // L'an 0 : la base le refuserait en 22008, une 500 au lieu d'un refus nommé.
    expect(raison(lire({ ...debut, evenementLe: '0000-01-01' }))).toBe('date_invalide');
    expect(raison(lire({ ...debut, evenementLe: '2026-10-23' }))).toBe('date_future');
    expect(raison(lire({ ...debut, evenementLe: AUJOURDHUI }))).toBe('ok');
  });

  it('choix et révision ne portent aucune date d’événement', () => {
    expect(raison(lire({ ...refus, evenementLe: '2026-10-20' }))).toBe('date_interdite');
    expect(raison(lire({ ...revision, evenementInconnu: true }))).toBe('date_interdite');
  });

  it('chaque nature n’accepte que SA liste de motifs ; aucun motif d’efficacité (§4, DC-39)', () => {
    expect(raison(lire({ ...refus, motif: 'effet_indesirable_rapporte' }))).toBe('motif_invalide');
    expect(raison(lire({ ...refus, motif: undefined }))).toBe('motif_invalide');
    expect(raison(lire({ ...refus, motif: 'inefficace' }))).toBe('motif_invalide');
    expect(raison(lire({ ...debut, motif: 'choix_du_patient' }))).toBe('motif_interdit');
    expect(raison(lire({ ...debut, nature: 'interruption', motif: 'evenement_intercurrent' }))).toBe('ok');
    expect(raison(lire({ ...debut, nature: 'arret' }))).toBe('motif_invalide');
    expect(raison(lire({ ...revision, motif: 'autre', note: 'x' }))).toBe('motif_interdit');
    expect(raison(lire({ ...revision, issue: 'ajuster', motif: 'mise_en_oeuvre_incomplete' }))).toBe('ok');
    expect(raison(lire({ ...revision, issue: 'arreter', motif: 'objectif_atteint' }))).toBe('motif_invalide');
  });

  it('la note : obligatoire avec « autre » et pour une préférence, jamais réduite à des blancs', () => {
    expect(raison(lire({ ...refus, motif: 'autre' }))).toBe('note_requise');
    expect(raison(lire({ ...refus, motif: 'autre', note: '    ' }))).toBe('note_requise');
    expect(raison(lire({ ...refus, motif: 'autre', note: 'précision' }))).toBe('ok');
    expect(raison(lire({ ...refus, nature: 'preference' }))).toBe('note_requise');
    expect(raison(lire({ ...refus, nature: 'preference', note: 'le soir' }))).toBe('ok');
    expect(raison(lire({ ...refus, note: 'x'.repeat(2001) }))).toBe('texte_trop_long');
  });

  it('la source : choix et mise en œuvre l’exigent, la révision n’en porte pas (§5)', () => {
    expect(raison(lire({ ...refus, source: undefined }))).toBe('source_invalide');
    expect(raison(lire({ ...refus, source: 'praticien' }))).toBe('source_invalide');
    expect(raison(lire({ ...revision, source: 'constate_par_praticien' }))).toBe('source_invalide');
  });

  it('l’issue : la révision seule, de sa liste', () => {
    expect(raison(lire({ ...revision, issue: undefined }))).toBe('issue_invalide');
    expect(raison(lire({ ...revision, issue: 'continuer' }))).toBe('issue_invalide');
    expect(raison(lire({ ...refus, issue: 'maintenir' }))).toBe('issue_invalide');
  });

  it('l’action : facultative, bornée, jamais sur une révision (§2)', () => {
    expect(lire({ ...refus, idAction: ' act_1 ' })).toMatchObject({ ok: true, demande: { idAction: 'act_1' } });
    expect(raison(lire({ ...refus, idAction: '' }))).toBe('action_invalide');
    expect(raison(lire({ ...refus, idAction: 'a'.repeat(201) }))).toBe('action_invalide');
    expect(raison(lire({ ...revision, idAction: 'act_1' }))).toBe('action_sur_revision');
  });

  it('la version suivante : « ajuster » seule, autre que la version révisée (§6)', () => {
    const ajuster = { ...revision, issue: 'ajuster', motif: 'nouvelle_donnee_au_dossier' };
    expect(lire({ ...ajuster, idVersionSuivante: 'proto_b#def' })).toMatchObject({
      ok: true,
      demande: { idVersionSuivante: 'proto_b#def' },
    });
    expect(raison(lire({ ...ajuster, idVersionSuivante: V }))).toBe('version_suivante_invalide');
    expect(raison(lire({ ...revision, idVersionSuivante: 'proto_b#def' }))).toBe('version_suivante_invalide');
    expect(raison(lire({ ...refus, idVersionSuivante: 'proto_b#def' }))).toBe('version_suivante_invalide');
  });

  it('un retrait ne vise que la tête désignée, et rien d’autre ne se lit', () => {
    expect(lire({ acte: 'retrait', idVersion: V, remplace: 'l1', motif: 'autre' })).toEqual({
      ok: true,
      demande: { acte: 'retrait', idVersion: V, remplace: 'l1' },
    });
    expect(raison(lire({ acte: 'retrait', idVersion: V }))).toBe('remplacement_invalide');
  });

  it('acte, version et nature inconnus se refusent, nommés', () => {
    expect(raison(lire({ ...refus, acte: 'modifier' }))).toBe('acte_invalide');
    expect(raison(lire({ ...refus, idVersion: '' }))).toBe('version_invalide');
    expect(raison(lire({ ...refus, idVersion: 'v'.repeat(513) }))).toBe('version_invalide');
    expect(raison(lire({ ...refus, nature: 'efficacite' }))).toBe('nature_invalide');
    expect(raison(lire({ ...refus, remplace: '' }))).toBe('remplacement_invalide');
  });

  it('chaque refus de la demande a son message en français', () => {
    const raisons = [
      'acte_invalide', 'version_invalide', 'remplacement_invalide', 'nature_invalide', 'action_invalide',
      'action_sur_revision', 'issue_invalide', 'source_invalide', 'motif_invalide', 'motif_interdit', 'note_requise',
      'texte_trop_long', 'date_invalide', 'date_requise', 'date_interdite', 'date_future', 'version_suivante_invalide',
    ];
    for (const r of raisons) expect(MESSAGES_REFUS[r], r).toBeTruthy();
  });
});
