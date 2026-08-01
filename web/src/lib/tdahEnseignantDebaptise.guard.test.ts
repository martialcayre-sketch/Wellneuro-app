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
import { PASSATION_PRATICIEN, listeBibliotheque } from '@/lib/bibliotheque';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const REGISTRE = JSON.parse(
  readFileSync(resolve(process.cwd(), '../docs/claude/corpus/instrument_registry.json'), 'utf8'),
) as { instruments: any[] };

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

  it('n’est PAS envoyé au portail patient : c’est l’enseignant qui le renseigne', () => {
    // Une première rédaction de ce lot le rouvrait à l'assignation. L'arbitrage
    // du 2026-07-31 tranchait l'IDENTITÉ, pas la SURFACE — et la surface pose un
    // problème propre. Deux issues, toutes deux mauvaises : le parent remplit à
    // la place de l'informant annoncé (les consignes disent « destiné aux
    // ENSEIGNANTS » et huit items portent sur le comportement EN CLASSE), ou le
    // lien magique du patient est transmis à un tiers, qui accède alors à TOUT
    // son portail.
    const auRayon: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_PED_02');
    expect(auRayon.actif).toBe(false);
    expect(PASSATION_PRATICIEN.map(p => p.id)).toContain('Q_PED_02');
    // Et il reste servi en consultation : sans ceci, le fermer des deux côtés
    // passerait ce test en ayant supprimé l'usage.
    const enRayon = listeBibliotheque().find(e => e.id === 'Q_PED_02');
    expect(enRayon?.passationPraticien).toBe(true);
    expect(enRayon?.assignable).toBe(false);
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

  it('nomme l’axe d’après ce que ses cinq items mesurent', () => {
    const axe = sousScores().find((s: any) => s.id === 'IMP');
    expect(axe, 'le sous-score IMP doit exister').toBeDefined();
    // « et agitation », pas « Impulsivité » seule : CE2 (« mal à rester assis »)
    // est un item d'agitation motrice. L'étiquette doit couvrir ses cinq items.
    expect(axe.label).toBe('Impulsivité et agitation');
    // La composition est épinglée : renommer l'étiquette en changeant les items
    // rendrait le nom faux d'une autre manière.
    expect(axe.items).toEqual(['CE1', 'CE2', 'CE5', 'CE6', 'CE7']);
  });

  it('n’emprunte plus AUCUN intitulé d’échelle publiée', () => {
    // L'arbitrage demandait de retirer « ni le nom Conners NI LES INTITULÉS
    // empruntés ». Une première rédaction n'avait retiré que celui qui était
    // cliniquement faux : les trois autres — « Inattention / Cognitif »,
    // « Hyperactivité », « Index TDAH » — sont les traductions littérales des
    // quatre échelles du CTRS-R:S, dans l'ordre. « Index TDAH » en particulier
    // est le « Conners' ADHD Index » au mot près : l'architecture s'en réclamait
    // encore quand le nom ne s'en réclamait plus.
    // ET LES TITRES DE SECTIONS, que la première rédaction de ce test ne
    // regardait pas — alors que le test frère, trois blocs plus haut, les
    // regardait pour « opposition ». Deux motifs interdits y survivaient donc
    // pendant que le test s'intitulait « n'emprunte plus AUCUN intitulé » :
    // « Inattention et cognitif » et surtout « Index TDAH — Items clés ». Sur la
    // seule surface qui reste — l'aperçu praticien — le titre de section est
    // affiché en capitales : le praticien lisait « INDEX TDAH » en tête de la
    // dernière section pendant que l'axe correspondant portait un autre nom.
    //
    // Un test qui affirme plus qu'il ne vérifie est exactement le défaut que ce
    // lot existe pour corriger, rejoué dans le lot lui-même.
    const EMPRUNTS = [/index\s*tdah/i, /cognitif/i, /opposition/i];
    const intitules = [
      ...sousScores().map((a: any) => ({ ou: `sous-score ${a.id}`, texte: String(a.label) })),
      ...DEF.sections.map((sec: any) => ({ ou: `section ${sec.id}`, texte: String(sec.titre) })),
    ];
    for (const { ou, texte } of intitules) {
      for (const motif of EMPRUNTS) {
        expect(motif.test(texte), `${ou} : « ${texte} »`).toBe(false);
      }
    }
  });

  it('porte le MÊME titre dans les trois pièces qui le nomment', () => {
    // Trois variantes circulaient, dont une — « … (grille WellNeuro, critères
    // DSM) » — qu'aucun document ne déclarait et qui était pourtant la SEULE
    // visible dans l'application : l'aperçu praticien rend `def.titre`, et le
    // changelog citait l'autre. Rien ne s'en apercevait.
    const auRayon: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_PED_02');
    const entree: any = REGISTRE.instruments.find((i: any) => i.questionnaireId === 'Q_PED_02');
    expect(DEF.titre).toBe(auRayon.titre);
    expect(entree.instrument.nomOfficiel).toBe(auRayon.titre);
  });

  it('aucun item de la grille n’interroge l’opposition', () => {
    // Le contrôle NÉGATIF du renommage, et le seul qui vaille : ce n'est pas
    // l'étiquette qui était fausse, c'est l'écart entre elle et le contenu. Si
    // un item d'opposition était ajouté un jour, ce test rougirait — et il
    // faudrait alors rediscuter l'étiquette, pas le supprimer.
    // La première rédaction de cette regex laissait passer DIX formulations sur
    // douze — « provocant », « réplique », « refuse activement », « désobéit »,
    // « s'obstine »… dont six qui sont, mot pour mot, des items du Conners parent
    // déjà présent dans le dépôt. Un banc qui ne les attrape pas ne protège pas
    // de la mutation la plus probable : recopier un item du fichier d'à côté.
    const OPPOSITION =
      /refus|désobé|oppos|provoc|répliqu|s.obstine|veng|rancun|colère|défie|blâme|délibérément|conteste|susceptib/i;
    const fautifs = items().filter((q: any) => OPPOSITION.test(q.label ?? q.texte ?? ''));
    expect(fautifs.map((q: any) => q.id)).toEqual([]);
  });

  it('sert exactement les 28 items connus, et pas un de plus', () => {
    // LE CONTRÔLE HONNÊTE, celui qui ne dépend d'aucun vocabulaire. Une regex,
    // si large soit-elle, reste un pari sur la formulation de l'item qu'on
    // n'a pas écrit. Épingler les identifiants fait rougir TOUTE addition, et
    // oblige alors à rediscuter l'étiquette de l'axe qui l'accueille.
    expect(items().map((q: any) => q.id))
      .toEqual(Array.from({ length: 28 }, (_, i) => `CE${i + 1}`));
  });
});

describe('TDAH enseignant — ce que le scoring rend, et ce qu’il ne rend pas', () => {
  it('ne rend AUCUN seuil, aucune bande, aucun total global', () => {
    // C'est ce qui distingue cet instrument de `Q_GEO_04`, tenu au barreau
    // inférieur le même jour : là-bas des bandes non vérifiées rendaient
    // « Démence sévère ». Ici il n'y a rien qui puisse se lire comme un verdict —
    // et c'est le CODE qui le garantit, pas une phrase d'écran : depuis que
    // l'instrument est en passation praticien, `listeBibliotheque` rend sa
    // description à `null`. Une garantie qui ne s'affiche plus ne garantit rien.
    expect(DEF.scoring.interpretation).toBeUndefined();
    expect(DEF.scoring.maxTotal).toBeUndefined();
    // LE TOTAL, et c'est lui qui manquait. Sans `sansTotalGlobal`, le moteur
    // additionne les quatre axes et rend 84 : ce nombre partait en
    // `scorePrincipal`, s'affichait « Score brut : 62 » au Fil praticien — sans
    // dénominateur, sans bande — et arrivait au modèle de synthèse. Aucune
    // source ne donne de sens à un /84 sur cette grille.
    //
    // Le contrôle porte sur le RÉSULTAT du moteur, pas sur le drapeau : un
    // moteur qui cesserait de lire `sansTotalGlobal` rougirait ici.
    expect(DEF.scoring.sansTotalGlobal).toBe(true);
    const r: any = calculateScore('Q_PED_02', { CE1: 3, CE2: 3, CE5: 3, CE6: 3, CE7: 3 });
    expect(r.total).toBeNull();
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
