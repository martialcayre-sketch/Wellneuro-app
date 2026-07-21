import { describe, expect, it } from 'vitest';
import {
  accuseReponse,
  choisirPackPropose,
  doitProposer,
  texteProposition,
  type PackCandidat,
} from './packReevaluation';

const pack = (over: Partial<PackCandidat> = {}): PackCandidat => ({
  idPack: 'PACK_BASE',
  nom: 'Base de consultation',
  description: null,
  nbQuestionnaires: 4,
  ...over,
});

describe('choisirPackPropose', () => {
  // Décision A6-5 : la réévaluation porte sur les mêmes instruments, sinon les
  // deux passages ne se comparent pas.
  it('préfère le pack déjà rempli au pack par défaut', () => {
    const dejaRempli = pack({ idPack: 'PACK_DEJA', nom: 'Sommeil' });
    expect(choisirPackPropose(dejaRempli, pack())?.idPack).toBe('PACK_DEJA');
  });

  it('retombe sur le pack par défaut si le patient n’en a rempli aucun', () => {
    expect(choisirPackPropose(null, pack())?.idPack).toBe('PACK_BASE');
  });

  it('sans candidat, aucune proposition — plutôt que d’en inventer une', () => {
    expect(choisirPackPropose(null, null)).toBeNull();
  });

  it('un pack vide ne se propose pas', () => {
    expect(choisirPackPropose(pack({ nbQuestionnaires: 0 }), null)).toBeNull();
  });
});

describe('doitProposer', () => {
  it('hors reprise, on ne propose rien', () => {
    expect(doitProposer(false, pack(), null)).toBe(false);
  });

  it('en reprise avec un candidat et aucune réponse : on propose', () => {
    expect(doitProposer(true, pack(), null)).toBe(true);
  });

  // LE point de la réserve : reposer la question à chaque visite transformerait
  // la proposition en relance. Un refus vaut autant qu'une acceptation.
  it('ne repropose pas le même pack après une réponse, quelle qu’elle soit', () => {
    expect(doitProposer(true, pack(), { idPack: 'PACK_BASE', statut: 'declinee' })).toBe(false);
    expect(doitProposer(true, pack(), { idPack: 'PACK_BASE', statut: 'acceptee' })).toBe(false);
  });

  it('un autre pack reste proposable', () => {
    expect(doitProposer(true, pack({ idPack: 'PACK_AUTRE' }), { idPack: 'PACK_BASE', statut: 'declinee' })).toBe(true);
  });
});

describe('textes', () => {
  const invariants = (texte: string) => {
    // Aucun chiffre hors nombre de questionnaires ; aucune pression ; aucun
    // vocabulaire de jeu ni de reproche.
    expect(texte).not.toMatch(/score|%|points|jours manqués|vous devez|il faut/i);
    expect(texte).not.toMatch(/bravo|félicitations|dernière chance|urgent/i);
  };

  it('la proposition dit qu’elle n’assigne rien et qu’on peut refuser', () => {
    const { titre, corps } = texteProposition(pack());
    expect(titre).toMatch(/si vous le souhaitez/i);
    expect(corps).toMatch(/Rien ne vous est assigné/i);
    expect(corps).toMatch(/répondre non/i);
    invariants(`${titre} ${corps}`);
  });

  it('accorde le pluriel du nombre de questionnaires', () => {
    expect(texteProposition(pack({ nbQuestionnaires: 1 })).corps).toMatch(/1 questionnaire\b/);
    expect(texteProposition(pack({ nbQuestionnaires: 4 })).corps).toMatch(/4 questionnaires\b/);
  });

  it('l’accusé de refus promet que la question ne reviendra pas', () => {
    const texte = accuseReponse('declinee');
    expect(texte).toMatch(/ne vous sera pas reposée/i);
    invariants(texte);
  });

  it('l’accusé d’acceptation n’engage le patient à rien d’ici là', () => {
    const texte = accuseReponse('acceptee');
    expect(texte).toMatch(/Rien ne vous est demandé/i);
    invariants(texte);
  });
});
