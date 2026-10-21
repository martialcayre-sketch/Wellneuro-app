import { describe, expect, it } from 'vitest';
import { lireDemandePhysio, lireDemandeTraitement } from './demande';

// La demande d'une ligne ([[D-335]] §2-§5), lue AVANT toute écriture. Les
// traitements des fixtures sont synthétiques : aucun nom de médicament réel.

const AUJOURDHUI = '2026-10-21';
const physio = (corps: Record<string, unknown>, main: 'patient' | 'praticien' = 'praticien') =>
  lireDemandePhysio(corps, main, AUJOURDHUI);
const raison = (lu: { ok: boolean; raison?: string }) => (lu.ok ? 'ok' : lu.raison);

describe('donnée physiologique', () => {
  it('« inconnu » est une réponse écrite, distincte d’une absence', () => {
    const lu = physio({ acte: 'pose', critere: 'grossesse', reponse: 'inconnu' });
    expect(lu).toEqual({
      ok: true,
      demande: { acte: 'pose', critere: 'grossesse', remplace: null, reponse: 'inconnu', mesure: null, mesureLe: null },
    });
    expect(raison(physio({ acte: 'pose', critere: 'grossesse' }))).toBe('reponse_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'grossesse', reponse: '' }))).toBe('reponse_invalide');
  });

  it('chaque critère fermé n’accepte que SA liste', () => {
    expect(raison(physio({ acte: 'pose', critere: 'sexe_declare', reponse: 'oui' }))).toBe('reponse_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'statut_menstruel', reponse: 'menopause' }))).toBe('ok');
    expect(raison(physio({ acte: 'pose', critere: 'imc', reponse: 'x' }))).toBe('critere_invalide');
  });

  it('le patient ne pose que le sexe déclaré et le statut menstruel', () => {
    expect(raison(physio({ acte: 'pose', critere: 'sexe_declare', reponse: 'inconnu' }, 'patient'))).toBe('ok');
    for (const critere of ['grossesse', 'allaitement', 'poids', 'taille']) {
      expect(raison(physio({ acte: 'pose', critere, reponse: 'oui' }, 'patient'))).toBe('critere_non_ouvert');
    }
  });

  it('une mesure se lit dans ses bornes techniques, avec sa date', () => {
    const lu = physio({ acte: 'pose', critere: 'poids', mesure: '72,5', mesureLe: '2026-10-20' });
    expect(lu.ok && lu.demande.acte === 'pose' && lu.demande.mesure).toBe('72.5');
    expect(raison(physio({ acte: 'pose', critere: 'poids', mesure: '0', mesureLe: '2026-10-20' }))).toBe('mesure_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'poids', mesure: '501', mesureLe: '2026-10-20' }))).toBe('mesure_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'poids', mesure: '72.55', mesureLe: '2026-10-20' }))).toBe('mesure_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '170.5', mesureLe: '2026-10-20' }))).toBe('mesure_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '29', mesureLe: '2026-10-20' }))).toBe('mesure_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '170' }))).toBe('date_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '170', mesureLe: '2026-10-22' }))).toBe('date_future');
    // L'an 0000 n'existe pas pour la base : refusé nommé, pas en 500 (revue `wn-reviewer`).
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '170', mesureLe: '0000-01-01' }))).toBe('date_invalide');
    expect(raison(physio({ acte: 'pose', critere: 'taille', mesure: '170', mesureLe: '2026-10-20', reponse: 'oui' }))).toBe('acte_invalide');
  });

  it('un retrait ne porte que la ligne qu’il retire', () => {
    expect(raison(physio({ acte: 'retrait', critere: 'poids', remplace: 'l1' }))).toBe('ok');
    expect(raison(physio({ acte: 'retrait', critere: 'poids' }))).toBe('remplacement_invalide');
    expect(raison(physio({ acte: 'retrait', critere: 'grossesse', remplace: 'l1', reponse: 'oui' }))).toBe('acte_invalide');
  });
});

describe('traitement', () => {
  const POSE = {
    acte: 'pose',
    nature: 'medicament',
    nom: 'Traitement A',
    debut: '2024-05',
    prescritParTiers: 'inconnu',
  };
  const traitement = (corps: Record<string, unknown>) => lireDemandeTraitement(corps, AUJOURDHUI);

  it('pose minimale : nom, nature, début, « prescrit par un autre soignant »', () => {
    const lu = traitement(POSE);
    expect(lu.ok).toBe(true);
    if (lu.ok && lu.demande.acte === 'pose') {
      expect(lu.demande.debut).toEqual({ precision: 'mois', premierJour: '2024-05-01' });
      expect(lu.demande.fin).toBeNull();
      expect(lu.demande.dose).toBeNull();
    }
  });

  it('normalise les blancs Unicode ; un nom fait de blancs n’est pas un nom', () => {
    const lu = traitement({ ...POSE, nom: '  Traitement  A​ ', dose: ' ' });
    expect(lu.ok && lu.demande.acte === 'pose' && lu.demande.nom).toBe('Traitement A');
    expect(lu.ok && lu.demande.acte === 'pose' && lu.demande.dose).toBeNull();
    expect(raison(traitement({ ...POSE, nom: '  ' }))).toBe('nom_requis');
    // U+0000, que PostgreSQL refuse dans un texte, devient un blanc (revue `wn-reviewer`).
    const nul = traitement({ ...POSE, nom: 'Traitement\u0000A', moment: '\u0000' });
    expect(nul.ok && nul.demande.acte === 'pose' && [nul.demande.nom, nul.demande.moment]).toEqual(['Traitement A', null]);
    expect(raison(traitement({ ...POSE, nom: 'x'.repeat(201) }))).toBe('texte_trop_long');
    expect(raison(traitement({ ...POSE, motif: 'x'.repeat(501) }))).toBe('texte_trop_long');
    // Les blancs de largeur nulle (U+200B à U+200D, U+2060, U+FEFF) aussi (revue CodeRabbit).
    expect(raison(traitement({ ...POSE, nom: '​‌‍⁠﻿' }))).toBe('nom_requis');
    const joint = traitement({ ...POSE, nom: 'Traitement⁠A' });
    expect(joint.ok && joint.demande.acte === 'pose' && joint.demande.nom).toBe('Traitement A');
  });

  it('les dates : illisible, future, fin avant début', () => {
    expect(raison(traitement({ ...POSE, debut: '' }))).toBe('date_invalide');
    expect(raison(traitement({ ...POSE, debut: '2026-11' }))).toBe('date_future');
    expect(raison(traitement({ ...POSE, fin: '2024-04' }))).toBe('fin_avant_debut');
    expect(raison(traitement({ ...POSE, debut: '2024-05-10', fin: '2024-05' }))).toBe('ok');
    expect(raison(traitement({ ...POSE, fin: 'inconnu' }))).toBe('ok');
  });

  it('listes fermées : nature et prescription', () => {
    expect(raison(traitement({ ...POSE, nature: 'classe_x' }))).toBe('nature_invalide');
    expect(raison(traitement({ ...POSE, prescritParTiers: undefined }))).toBe('prescrit_invalide');
  });

  it('un retrait ne porte rien d’autre que la ligne visée', () => {
    expect(raison(traitement({ acte: 'retrait', remplace: 't1' }))).toBe('ok');
    expect(raison(traitement({ acte: 'retrait', remplace: 't1', nom: 'Traitement A' }))).toBe('acte_invalide');
    expect(raison(traitement({ acte: 'retrait' }))).toBe('remplacement_invalide');
  });
});
