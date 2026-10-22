import { describe, expect, it } from 'vitest';
import { declarationsAnamnese, estDiscordant, sansGroupesRemplaces } from './anamnese';

// Ce que l'anamnèse déclare, à côté des lignes ([[D-335]] §2) : affiché tel
// quel ; une discordance « oui » contre « non » se montre, jamais ne se résout
// (DC-30) ; rien d'autre ne se compare.

describe('declarationsAnamnese', () => {
  it('rend la réponse telle qu’écrite, ou `null` sans réponse', () => {
    expect(declarationsAnamnese({ etat_grossesse: 'Non', taille: ' 170 ', poids_actuel: '' })).toEqual({
      grossesse: { valeur: 'Non' },
      allaitement: { valeur: null },
      taille: { valeur: '170' },
      poids: { valeur: null },
    });
    expect(declarationsAnamnese(null).grossesse).toEqual({ valeur: null });
  });
});

describe('estDiscordant', () => {
  it('« oui » contre « non » sur grossesse et allaitement', () => {
    expect(estDiscordant('grossesse', 'oui', 'Non')).toBe(true);
    expect(estDiscordant('allaitement', 'non', 'Oui')).toBe(true);
    expect(estDiscordant('grossesse', 'oui', 'Oui')).toBe(false);
  });
  it('« Je ne sais pas », « inconnu », une absence : aucune discordance', () => {
    expect(estDiscordant('grossesse', 'oui', 'Je ne sais pas')).toBe(false);
    expect(estDiscordant('grossesse', 'inconnu', 'Non')).toBe(false);
    expect(estDiscordant('grossesse', null, 'Non')).toBe(false);
    expect(estDiscordant('grossesse', 'oui', null)).toBe(false);
  });
  it('aucune comparaison de mesure', () => {
    expect(estDiscordant('poids', '72.5', '80')).toBe(false);
    expect(estDiscordant('taille', '170', '160')).toBe(false);
  });
});

describe('sansGroupesRemplaces', () => {
  it('retire les deux groupes de texte libre, garde l’automédication', () => {
    expect(sansGroupesRemplaces({
      medicaments: [{ nom: 'Traitement A' }],
      complements: [{ nom: 'Complément B' }],
      automedication: ['Antalgiques'],
      motif_principal: 'x',
    })).toEqual({ automedication: ['Antalgiques'], motif_principal: 'x' });
  });
});
