import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LE COUPLAGE QUE CE BANC TIENT — LOT-01, étapes 3 et 6.
//
// L'étape 6 a mis `passationCourante` dans les DONNÉES transmises au modèle.
// Pendant quatre jours, la consigne n'en a rien dit : le repère était présent et
// inexpliqué, ce qui est pire qu'absent — le modèle pouvait l'ignorer, ou lui
// prêter un sens qu'il n'a pas (un degré de fiabilité au lieu d'un repère de
// récence). La v20 comble ce trou.
//
// Ce banc garde les DEUX bouts, parce que chacun seul se retire sans bruit :
//   · la consigne nomme le champ et dit ce qu'il n'autorise pas ;
//   · le champ est réellement serialisé dans le message utilisateur — une
//     consigne qui décrirait un champ absent décrit un fantôme.
// Le second bout est tenu par `passationCourante.test.ts`, qui reparse le
// message réellement envoyé ; celui-ci tient le premier.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;

describe('consigne système — le repère de passation courante est expliqué', () => {
  it('la version est bien v20 ou au-delà : la section n’existe pas avant', () => {
    // Si quelqu'un revient à v19 en gardant la section, ou l'inverse, le couple
    // version/empreinte de `promptAlimentaire.guard.test.ts` le dira aussi.
    // Ici on garde le sens : la section appartient à v20.
    const numero = Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''));
    expect(Number.isFinite(numero)).toBe(true);
    expect(numero).toBeGreaterThanOrEqual(20);
  });

  it('le cas « aucune passation exploitable » est dit, et interdit le repli', () => {
    // Ajouté en v21 après revue. Sans cette phrase, un instrument dont toutes
    // les passations sont écartées n'a AUCUN `true` — et rien n'empêchait le
    // modèle de se rabattre sur la plus récente, c'est-à-dire sur une mesure
    // que le praticien a précisément écartée.
    expect(CONSIGNE).toMatch(/aucun true/i);
    expect(CONSIGNE).toMatch(/pas même la plus récente/i);
    expect(CONSIGNE).toMatch(/aucune de ses passations ne fait foi/i);
  });

  it('le champ est nommé, littéralement, tel qu’il apparaît dans les données', () => {
    // Le nom exact, pas une paraphrase : le modèle doit pouvoir faire le lien
    // avec la clé qu'il lit dans le bloc.
    expect(CONSIGNE).toContain('passationCourante');
  });

  it('la consigne dit que les passations antérieures sont transmises À DESSEIN', () => {
    // Sans cette phrase, un modèle prudent pourrait traiter les antérieures
    // comme du bruit et les taire — or l'évolution entre deux enquêtes est
    // précisément ce que le praticien vient chercher.
    expect(CONSIGNE).toMatch(/évolution entre deux enquêtes est un signal clinique/i);
  });

  it('`false` est présenté comme une information, pas comme une absence', () => {
    // `DC-24` appliqué au repère lui-même : « remplacée » n'est pas « douteuse ».
    expect(CONSIGNE).toMatch(/remplacée par une passation plus récente/i);
  });

  it('INTERDIT de lire un écart comme un progrès ou un effet de prise en charge', () => {
    // Le cœur clinique de la section (`DC-27`) : deux mesures qui diffèrent
    // disent qu'elles diffèrent, jamais pourquoi. Sans cet interdit, la
    // comparaison entre deux passations fabrique de la causalité à chaque
    // synthèse.
    expect(CONSIGNE).toMatch(/ne qualifie pas cet écart de progrès/i);
    expect(CONSIGNE).toMatch(/association n'est pas causalité/i);
  });

  it('INTERDIT de moyenner deux passations, et une divergence se dit', () => {
    // `DC-30` : une discordance se signale, elle ne se lisse pas. C'est la même
    // règle que le moteur de contradictions applique côté déterministe — les
    // deux surfaces doivent dire la même chose.
    expect(CONSIGNE).toMatch(/ne moyenne jamais deux passations/i);
    expect(CONSIGNE).toMatch(/une divergence se signale, elle ne se lisse pas/i);
  });

  it('une passation non interprétable reste non interprétable, courante ou non', () => {
    // Le piège exact : `passationCourante: true` sur une passation dont aucun
    // résultat n'est transmis pourrait se lire comme « celle-ci fait foi, donc
    // exploitable ». La section renvoie explicitement à la règle précédente.
    expect(CONSIGNE).toMatch(/non interprétable[\s\S]*porte elle aussi ces champs/i);
    expect(CONSIGNE).toMatch(/ne rend pas son résultat exploitable/i);
  });

  it('le repère n’est pas un degré de fiabilité, et le dit', () => {
    expect(CONSIGNE).toMatch(/repère de lecture[\s\S]*pas un degré de fiabilité/i);
    expect(CONSIGNE).toMatch(/il ne classe pas leur qualité/i);
  });

  it('une passation unique NON ÉCARTÉE porte `true` — la réserve est dite', () => {
    // La v21 disait « un seul exemplaire porte true », sans réserve : faux dès
    // que cet exemplaire unique est écarté, c'est-à-dire le cas même que la
    // section traite. Ce banc épinglait donc une phrase devenue fausse.
    expect(CONSIGNE).toMatch(/passé une seule fois, et non écartée, porte/i);
  });

  it('le statut d’écartement est nommé comme une DONNÉE, pas déduit d’un silence', () => {
    // Le patron que `buildUserMessage` déclare insuffisant est « consigne
    // seule, données livrées ». Le champ arrive donc sur la ligne.
    expect(CONSIGNE).toContain('ecarteeDuRaisonnement');
    expect(CONSIGNE).toMatch(/aucun constat d'état, aucune évolution/i);
    expect(CONSIGNE).toMatch(/ne porte jamais \*\*passationCourante: true\*\*/i);
  });

  it('lire un `false` renvoie à la même ligne, et distingue écartée de remplacée', () => {
    expect(CONSIGNE).toMatch(/si elle porte \*\*ecarteeDuRaisonnement\*\*/i);
    expect(CONSIGNE).toMatch(/remplacée par une passation plus récente, ce qui ne la rend pas douteuse/i);
  });
});
