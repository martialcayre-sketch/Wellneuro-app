import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LE TROU QUE CE BANC REFERME — `DC-09`, LOT-09 « Doctrine exécutable »
// ([[D-097]]).
//
// « Un claim associatif ne devient jamais une preuve » était, au constat de
// l'audit du 2026-08-11, le garde-fou le plus exposé de la chaîne : AUCUN
// ancrage, ni dans le prompt, ni dans la validation de sortie. Le déterministe
// le tenait déjà de son côté — `ContradictionFinding.description` impose une
// formulation neutre, et aucune table signée ne conclut — mais la synthèse
// RÉDIGÉE pouvait écrire « X explique Y » là où la donnée ne portait qu'un lien
// possible, sans que rien ne rougisse.
//
// CE QUE CE BANC PROUVE, ET CE QU'IL NE PROUVE PAS. Comme le banc jumeau de
// `DC-27` (`promptPassationCourante.guard.test.ts`), il épingle **la consigne**,
// jamais la sortie du modèle. Il ne garantit pas que le modèle obéit ; il
// garantit qu'on ne lui a pas retiré l'interdit en silence. C'est exactement la
// portée que le lot revendique, et elle est écrite ici plutôt que masquée.
//
// LE DÉFAUT CHERCHÉ EST DOUBLE, et le second est le moins visible :
//   · la clause disparaît ou se paraphrase — les `toMatch` ci-dessous ;
//   · la clause DESCEND dans une section topique. Le prompt contient une clause
//     de primauté explicite : la section « Recommandation d'exploration
//     déterministe » prime sur toute autre consigne relative aux explorations,
//     mais « ne relève aucune des interdictions posées plus haut ». Une clause
//     posée au-dessus des sections est donc hors de sa portée ; la même clause
//     déplacée en dessous deviendrait discutable sans que son texte ait bougé.
//     Le test de position tient ce bout-là.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;

/** La formule citable, seule ancre stable de la clause. */
const FORMULE = "Une association n'est pas une preuve";

// Premier titre de section topique du prompt. Tout ce qui précède appartient au
// cadre déontologique, que rien n'écarte plus bas.
const PREMIERE_SECTION_TOPIQUE = '## Questionnaires alimentaires';

/** Position de la formule, insensible à la casse — voir le test de position. */
function positionFormule(texte: string): number {
  return texte.toLowerCase().indexOf(FORMULE.toLowerCase());
}

describe('consigne système — une association ne se restitue pas en preuve (DC-09)', () => {
  it('la version est bien v29 ou au-delà : la clause n’existe pas avant', () => {
    // v29 est le bump qui porte cette clause. Revenir à v28 en la gardant, ou
    // l'inverse, décrit un prompt qui n'est pas celui qui part au modèle.
    const numero = Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''));
    expect(Number.isFinite(numero)).toBe(true);
    expect(numero).toBeGreaterThanOrEqual(29);
  });

  it('la formule épinglée est présente, mot pour mot, et UNE SEULE FOIS', () => {
    // Symétrique de « Association n'est pas causalité » (`DC-27`). Une formule
    // courte et citable est ce qui rend l'interdit épinglable : une paraphrase
    // se dilue au fil des révisions sans que personne ne décide de la retirer.
    expect(CONSIGNE).toMatch(/une association n'est pas une preuve/i);
    // L'unicité n'est pas de la coquetterie : le test de position ci-dessous
    // raisonne sur la PREMIÈRE occurrence. Une seconde clause posée plus bas —
    // qui contredirait la première, ou la répéterait en l'affaiblissant —
    // resterait invisible à `indexOf`. Constat de revue du 2026-08-23.
    const occurrences = CONSIGNE.toLowerCase().split(FORMULE.toLowerCase()).length - 1;
    expect(occurrences, 'la formule doit apparaître une seule fois dans la consigne').toBe(1);
  });

  it('l’OPÉRATEUR d’interdiction est épinglé, pas seulement les quatre formes', () => {
    // LE TROU QUE CE TEST FERME (constat de revue du 2026-08-23, P1). Les
    // assertions de vocabulaire vérifient que les quatre formes APPARAISSENT,
    // jamais qu'elles sont INTERDITES. Deux mutations réelles laissaient tout
    // le banc vert : « Ne l'écris jamais sous la forme » → « Tu peux l'écrire
    // sous la forme », et → « Évite de l'écrire ». L'interdit devenait une
    // préférence sans qu'une seule assertion bouge.
    //
    // Le filet restant était l'empreinte du prompt — mais son message d'échec
    // dit « incrémenter la version et reporter la nouvelle empreinte ici », ce
    // qu'un éditeur exécute mécaniquement. Une garde dont le rattrapage invite
    // à la mise à jour machinale ne garde rien.
    expect(CONSIGNE, "l'interdit doit rester un interdit, pas une préférence").toMatch(
      /Ne l'écris jamais sous la forme/,
    );
    expect(CONSIGNE).toMatch(/en faire une démonstration ne l'est jamais/);
  });

  it('le bloc DÉTERMINISTE est explicitement hors du périmètre de la clause', () => {
    // Résiduel relevé en revue : l'interdit porte sur une forme de surface
    // (« X explique Y »), son exception sur un acte (« expliciter un motif
    // donné »). Un modèle prudent pouvait ranger la restitution du bloc
    // d'orientation sous l'antécédent « ce qui t'est transmis comme un lien
    // possible » et couvrir d'un « pourrait être associé à » un motif que la
    // table SIGNÉE a, lui, tranché — c'est-à-dire affaiblir une recommandation
    // déterministe au nom d'une règle de prudence. La clause ferme la porte ;
    // ce test empêche qu'elle se rouvre en silence.
    expect(CONSIGNE).toMatch(/Cette règle porte sur les liens POSSIBLES/);
    expect(CONSIGNE).toMatch(/il a été décidé hors de toi/);
  });

  it('les quatre verbes du glissement sont nommés, pas seulement l’idée', () => {
    // `DC-09` nomme deux verbes (« prouve », « explique ») ; « démontre » et
    // « atteste » ferment les deux reformulations immédiates. « confirme » et
    // « signe » sont volontairement HORS de la liste : le prompt emploie déjà
    // « à confirmer par l'entretien » et « signale-le », et un interdit sur ces
    // deux mots-là se lirait comme une contradiction de consignes voisines.
    expect(CONSIGNE).toMatch(/« X prouve Y »/);
    expect(CONSIGNE).toMatch(/« X explique Y »/);
    expect(CONSIGNE).toMatch(/« X démontre Y »/);
    expect(CONSIGNE).toMatch(/« X atteste Y »/);
  });

  it('la clause dit ce qui reste ATTENDU, pas seulement ce qui est interdit', () => {
    // Sans cette moitié, la clause renverserait deux consignes légitimes du même
    // prompt — « Ton rôle est de le restituer et de l'expliquer » et « expliquer
    // en langage clinique le motif déjà énoncé ». Un interdit brut sur le verbe
    // « expliquer » ferait taire la restitution que la section orientation exige.
    // L'accord grammatical compte ici plus qu'ailleurs : « un motif ou une
    // hypothèse **qui t'est donné** » rattachait la relative au seul masculin,
    // et laissait lire que n'importe quelle hypothèse pouvait être explicitée.
    // Les deux compléments portent désormais leur propre qualification.
    expect(CONSIGNE).toMatch(
      /Expliciter un motif déjà énoncé ou une hypothèse déjà transmise reste attendu/i,
    );
  });

  it('les consignes voisines que la clause ne doit PAS renverser sont intactes', () => {
    // Le couple se garde des deux côtés : si l'une de ces deux phrases disparaît
    // un jour, c'est le sens de la clause ci-dessus qui change — elle n'aurait
    // plus rien à préserver, et l'équilibre « expliciter oui / démontrer non »
    // serait à re-trancher, pas à hériter.
    expect(CONSIGNE).toMatch(/restituer et de l'expliquer/i);
    expect(CONSIGNE).toMatch(/expliquer en langage clinique le motif déjà énoncé/i);
  });

  it('la clause vit dans le CADRE DÉONTOLOGIQUE, au-dessus des sections topiques', () => {
    // Le défaut le moins visible : un déplacement qui ne change pas un mot du
    // texte et lui fait pourtant perdre sa préséance. Voir l'en-tête.
    //
    // La recherche est insensible à la casse, comme l'assertion de formule : un
    // test de position qui rougirait sur une simple reformulation annoncerait
    // un défaut de préséance là où le défaut est textuel, et enverrait le
    // lecteur au mauvais endroit (constat de revue du 2026-08-23).
    const positionClause = positionFormule(CONSIGNE);
    const positionCadre = CONSIGNE.indexOf('## Cadre déontologique');
    const positionPremiereSection = CONSIGNE.indexOf(PREMIERE_SECTION_TOPIQUE);

    expect(positionCadre, 'le cadre déontologique doit exister').toBeGreaterThanOrEqual(0);
    expect(positionPremiereSection).toBeGreaterThan(positionCadre);
    expect(positionClause, 'la clause doit suivre le titre du cadre déontologique').toBeGreaterThan(
      positionCadre,
    );
    expect(
      positionClause,
      'la clause doit rester AU-DESSUS des sections topiques : plus bas, la primauté que se réserve la section orientation la rendrait discutable',
    ).toBeLessThan(positionPremiereSection);
  });
});
