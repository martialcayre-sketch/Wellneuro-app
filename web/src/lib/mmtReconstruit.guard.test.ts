// Banc du MMT reconstruit — 2026-07-31.
//
// `Q_NEU_06` a été reconstruit depuis sa source (WN-SRC-0445). Ce qu'il servait
// auparavant était un AUTRE instrument : dix plaintes auto-rapportées cotées 0-3
// dans le sens inverse, sur 30. Ce banc épingle les quatre propriétés que la
// reconstruction devait rétablir, et qu'une régression silencieuse défairait :
// le SENS de l'échelle, ses BORNES, les bandes de la source, et le fait que les
// trois items de rappel portent bien les mêmes trois mots.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import { IDS_ASSIGNABLES, PASSATION_PRATICIEN, listeBibliotheque } from '@/lib/bibliotheque';
import REGISTRE from '../../../docs/claude/corpus/instrument_registry.json';

const DEF: any = (QUESTIONNAIRE_CATALOGUE as any).Q_NEU_06;
const ITEMS = ['MM1','MM2','MM3','MM4','MM5','MM6','MM7','MM8','MM9','MM10'];
const toutA = (v: number) => Object.fromEntries(ITEMS.map(id => [id, v]));

describe('MMT — la cotation va dans le sens des troubles', () => {
  it('un test parfait vaut 0 et « Rien à signaler » ; le pire vaut 20 et l’avis spécialisé', () => {
    // LA garde du sens. L'ancien servi rendait l'inverse : 30 pour le meilleur
    // fonctionnement, 0 pour le pire. Un moteur qui reprendrait cette direction
    // ferait lire « troubles organiques » à un patient sans aucune erreur.
    const parfait: any = calculateScore('Q_NEU_06', toutA(0));
    expect(parfait.total).toBe(0);
    expect(parfait.interpretation?.label).toBe('Rien à signaler');

    const pire: any = calculateScore('Q_NEU_06', toutA(2));
    expect(pire.total).toBe(20);
    expect(pire.maxTotal).toBe(20);
    expect(pire.interpretation?.label).toBe('Troubles organiques — avis spécialisé demandé');
  });

  it('aucun item ne dépasse 2 points : dix items, vingt points, pas trente', () => {
    // L'ancienne échelle 0-3 sur dix items donnait 30. Le contrôle porte sur les
    // OPTIONS servies, pas sur `maxTotal` : une borne déclarée peut mentir.
    //
    // L'ORDRE compte autant que les valeurs. Un test qui ne lirait que le total
    // ne verrait pas une inversion : rendre `[2, 1, 0]` laisse le total d'une
    // passation « tout à 0 » à zéro, et la garde du sens ci-dessus passerait.
    // C'est cette assertion-ci qui l'attrape — vérifié par mutation.
    const items = (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []);
    expect(items.map((q: any) => q.id)).toEqual(ITEMS);
    for (const q of items) {
      expect(q.options.map((o: any) => o.v), q.id).toEqual([0, 1, 2]);
    }
  });

  it('la valeur 0 porte partout un libellé de réponse JUSTE, jamais de trouble', () => {
    // L'ancrage sémantique du sens, item par item. L'ordre des options se
    // contrôle plus haut ; ici c'est le contenu qui est épinglé — la valeur
    // basse doit dire l'absence de trouble, sinon l'échelle est retournée
    // quelle que soit la forme des options.
    const parId = new Map<string, any>(
      (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []).map((q: any) => [q.id, q]));
    const zeroAttendu: Record<string, string> = {
      MM1: "Réponse juste d'emblée", MM2: 'Réponses justes',
      MM3: 'Trois mots justes', MM4: 'Trois réponses justes', MM5: 'Trois réponses justes',
      MM6: 'Jamais', MM7: 'Jamais', MM8: "Pas d'oubli", MM9: 'Jamais',
      MM10: 'Trois mots justes',
    };
    for (const [id, libelle] of Object.entries(zeroAttendu)) {
      const zero = parId.get(id).options.find((o: any) => o.v === 0);
      expect(zero?.l, id).toBe(libelle);
    }
  });

  it('les quatre bandes de la source pavent 0–20 sans trou ni recouvrement', () => {
    // La source CHEVAUCHE à 1 (« De 0 à 1 » puis « De 1 à 4 ») ; l'arbitrage
    // donne 1 à la bande la plus sévère. Le pavage est vérifié valeur par
    // valeur : c'est le seul contrôle qui attrape à la fois un trou et un
    // doublon, et une bande servie deux fois est un score sans interprétation
    // stable.
    const attendus = [
      'Rien à signaler',
      ...Array(4).fill('Troubles fonctionnels : micronutrition'),
      ...Array(6).fill('Faire un Mini Mental State Examination (MMSE)'),
      ...Array(10).fill('Troubles organiques — avis spécialisé demandé'),
    ];
    for (let total = 0; total <= 20; total++) {
      const bandes = DEF.scoring.interpretation.filter((b: any) => total >= b.min && total <= b.max);
      expect(bandes, `total ${total}`).toHaveLength(1);
      expect(bandes[0].label, `total ${total}`).toBe(attendus[total]);
    }
  });

  it('l’arbitrage porte bien sur 1, et sur lui seul', () => {
    // Nommer la valeur arbitrée : si quelqu'un rebascule 1 vers « Rien à
    // signaler », ce test tombe, et la décision se rediscute au lieu de glisser.
    const une: any = calculateScore('Q_NEU_06', { ...toutA(0), MM1: 1 });
    expect(une.total).toBe(1);
    expect(une.interpretation?.label).toBe('Troubles fonctionnels : micronutrition');
  });

  it('aucune bande ne porte de conduite : les libellés de la source SONT la conduite', () => {
    // L'ancien servi logeait des `protocol` dans ses bandes — des conduites du
    // cabinet qui voyageaient avec l'instrument. Celles de la source y sont
    // désormais en toutes lettres, et rien ne s'y ajoute.
    for (const b of DEF.scoring.interpretation) {
      expect(b, b.label).not.toHaveProperty('protocol');
    }
  });
});

describe('MMT — les trois mots, et la passation qui les protège', () => {
  it('les items 3, 5 et 10 portent la même épreuve de rappel', () => {
    // Le rappel différé n'a de sens que si l'enregistrement (3), le rappel
    // immédiat (5) et le rappel différé (10) portent les MÊMES trois mots. Un
    // item recopié de travers casserait le test sans casser le score.
    const items = new Map<string, any>(
      (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []).map((q: any) => [q.id, q]));
    expect(items.get('MM3').texte).toContain('CITRON');
    expect(items.get('MM3').texte).toContain('CLÉ');
    expect(items.get('MM3').texte).toContain('BALLON');
    expect(items.get('MM5').texte).toContain('trois mots');
    expect(items.get('MM10').texte).toContain('trois mots');
  });

  it('sa route est rouverte par décision, et le risque de mesure reste nommé', () => {
    // Historique des deux fermetures, parce qu'elles n'avaient pas la même
    // raison et ne sont pas tombées le même jour. Le VERBATIM a rouvert le
    // 2026-07-31, son motif étant tombé : l'identité est instruite — document
    // « MMT ou Mini Mental Test » diffusé par l'IEDM (2005), dix items au mot
    // près, mêmes bandes ; sa bande 5-10 ordonne « Faire MMS », il n'est donc
    // pas le MMSE et la réserve © PAR ne le vise pas.
    //
    // La ROUTE a rouvert le 2026-08-16 ([[D-066]]) : déclencheur du panel
    // mémoire du catalogue biologie, fermé il rendait le panel inerte.
    //
    // LE RISQUE DE MESURE N'EST PAS TOMBÉ, LUI : trois items forment un
    // enregistrement de trois mots puis deux rappels — auto-rempli hors
    // surveillance, le test se corrige en remontant la page et les deux items
    // les plus discriminants deviennent des points offerts. La décision ne le
    // nie pas, elle le PORTE : l'assignation est un geste praticien de
    // consultation (le bandeau `administrationMode: 'clinicien'` reste dû),
    // jamais un envoi de routine. Ce commentaire est la trace de ce risque ;
    // le retirer exigerait un argument que la décision n'a pas donné.
    expect(IDS_SUSPENDUS.has('Q_NEU_06')).toBe(false);
    expect(IDS_ASSIGNABLES.has('Q_NEU_06')).toBe(true);
    expect(PASSATION_PRATICIEN.map(p => p.id)).toContain('Q_NEU_06');
    const enRayon = listeBibliotheque().find(e => e.id === 'Q_NEU_06');
    expect(enRayon?.passationPraticien).toBe(true);
    expect(enRayon?.assignable).toBe(true);

    // Et il reste SCORABLE : c'était vrai fermé, ça le reste ouvert.
    expect(calculateScore('Q_NEU_06', toutA(0))).not.toHaveProperty('error');
  });

  it('le registre porte l’identité instruite, et ne la surdéclare pas', () => {
    // Le registre est la seule pièce qui porte le motif. `referentiel_interne_siin`
    // reste INTERDIT : ce serait conclure de ce qu'un support ne dit pas — la
    // faute commise sur le VQ11 le 2026-07-30. L'identité est établie par un
    // exemplaire INDÉPENDANT et public, pas par le silence du support SIIN.
    const entree: any = (REGISTRE as any).instruments.find((i: any) => i.questionnaireId === 'Q_NEU_06');
    expect(entree.statutCertification).toBe('scoring_verifie');
    expect(entree.statutBibliographique).toBe('reference_identifiee');
    expect(entree.statutBibliographique).not.toBe('referentiel_interne_siin');
    expect(entree.sourceIds).toContain('WN-SRC-0445');
    // Le contenu n'est PAS déclaré `verbatim` : la consigne de passation est
    // réécrite, et le chevauchement de bandes à la valeur 1 est arbitré. Deux
    // écarts petits, mais réels — sous-déclarer est ici le bon sens de l'erreur.
    expect(entree.versionServie.statutContenu).toBe('adapte');
  });
});
