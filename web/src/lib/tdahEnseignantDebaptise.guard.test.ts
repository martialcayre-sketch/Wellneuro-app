// Banc du repérage TDAH par l'enseignant (`Q_PED_02`), débaptisé — 2026-08-01.
//
// L'instrument s'annonçait « Échelle de Conners — Version Enseignant ». Il ne
// l'était pas, et c'est le cas que la règle du « nombre d'items » désigne comme
// le plus dangereux : 28 items des deux côtés, cotés 0-3 des deux côtés, ZÉRO
// divergence critique au banc — et un autre instrument. Un comptage identique à
// contenus différents est le seul cas que le compteur déclare conforme.
//
// Ce banc tient deux choses de nature très différente :
//   · le DÉBAPTISAGE, qui est une décision et se relit comme telle ;
//   · le sous-score renommé, qui est un FAIT CLINIQUE et l'aurait été dans les
//     deux branches de l'arbitrage — reconstruire ou débaptiser.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';

const DEF: any = (QUESTIONNAIRE_CATALOGUE as any).Q_PED_02;
const items = (): any[] => (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []);
const sousScores = (): any[] => DEF.scoring.subScores;

describe('TDAH enseignant — le nom ne revendique plus ce que le servi n’est pas', () => {
  it('ne porte le nom de Conners nulle part, dans aucune des deux surfaces', () => {
    // Les deux catalogues portent des titres DISTINCTS, et le patient comme le
    // praticien ne voient pas le même : les garder tous les deux est ce qui
    // empêche d'en débaptiser un seul.
    const auRayon: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_PED_02');
    for (const texte of [DEF.titre, DEF.instructions, auRayon.titre, auRayon.description]) {
      expect(String(texte).toLowerCase()).not.toContain('conners');
    }
    // Et il dit ce qu'il EST : une grille du cabinet, pas une échelle publiée.
    expect(DEF.titre).toContain('WellNeuro');
  });

  it('est rouvert à l’assignation', () => {
    const auRayon: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_PED_02');
    expect(auRayon.actif).toBe(true);
  });
});

describe('TDAH enseignant — le sous-score qui nommait un trouble jamais mesuré', () => {
  it('n’intitule plus « opposition » un axe qui n’en contient aucun item', () => {
    // LE POINT LE PLUS IMPORTANT DE CE LOT, et il était indépendant du nom de
    // l'instrument : un praticien lisant « Opposition / Impulsivité : 13/15 »
    // aurait conclu à un trouble oppositionnel chez un enfant à qui la question
    // n'a jamais été posée. Le contrôle porte sur TOUS les axes et sur les
    // titres de section, pas sur le seul libellé corrigé — sinon le mot
    // reviendrait ailleurs sans qu'un test bouge.
    for (const axe of sousScores()) {
      expect(String(axe.label).toLowerCase(), `sous-score ${axe.id}`).not.toContain('opposition');
    }
    for (const section of DEF.sections) {
      expect(String(section.titre).toLowerCase(), `section ${section.id}`).not.toContain('opposition');
    }
  });

  it('nomme « Impulsivité » l’axe dont les cinq items mesurent l’impulsivité', () => {
    const axe = sousScores().find((s: any) => s.id === 'IMP');
    expect(axe, 'le sous-score IMP doit exister').toBeDefined();
    expect(axe.label).toBe('Impulsivité');
    // La composition est épinglée : renommer l'étiquette en changeant les items
    // rendrait le nom faux d'une autre manière.
    expect(axe.items).toEqual(['CE1', 'CE2', 'CE5', 'CE6', 'CE7']);
  });

  it('aucun item de la grille n’interroge l’opposition', () => {
    // Le contrôle NÉGATIF du renommage, et le seul qui vaille : ce n'est pas
    // l'étiquette qui était fausse, c'est l'écart entre elle et le contenu. Si
    // un item d'opposition était ajouté un jour, ce test rougirait — et il
    // faudrait alors rediscuter l'étiquette, pas le supprimer.
    const OPPOSITION = /refuse d.obéir|s.oppose|provoqu|colère|défie|conteste l.autorité|rancun/i;
    const fautifs = items().filter((q: any) => OPPOSITION.test(q.label ?? q.texte ?? ''));
    expect(fautifs.map((q: any) => q.id)).toEqual([]);
  });
});

describe('TDAH enseignant — ce que le scoring rend, et ce qu’il ne rend pas', () => {
  it('ne rend AUCUN seuil, aucune bande, aucun total global', () => {
    // C'est ce qui distingue cet instrument de `Q_GEO_04`, tenu au barreau
    // inférieur le même jour : là-bas des bandes non vérifiées rendaient
    // « Démence sévère ». Ici il n'y a rien qui puisse se lire comme un verdict,
    // et la description patient promet explicitement l'inverse d'un diagnostic.
    expect(DEF.scoring.interpretation).toBeUndefined();
    expect(DEF.scoring.maxTotal).toBeUndefined();
    const r: any = calculateScore('Q_PED_02', { CE1: 3, CE2: 3, CE5: 3, CE6: 3, CE7: 3 });
    expect(r.interpretation ?? null).toBeNull();
  });

  it('rend les quatre axes, et l’axe impulsivité se calcule', () => {
    // Contrôle négatif : sans lui, un moteur qui ne rendrait plus rien
    // passerait le test ci-dessus.
    const r: any = calculateScore('Q_PED_02', { CE1: 3, CE2: 3, CE5: 3, CE6: 3, CE7: 3 });
    const imp = r.subScores.find((s: any) => s.id === 'IMP');
    expect(r.subScores.map((s: any) => s.id)).toEqual(['IMP', 'INA', 'HYP', 'IDX']);
    expect(imp.total).toBe(15);
    expect(imp.max).toBe(15);
  });
});
