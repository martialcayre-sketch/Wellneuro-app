import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LE TROU QUE CE BANC REFERME — `DC-19`, mesure de production du 2026-09-14
// ([[D-182]]).
//
// `DC-19` énumère ce qui ne s'invente pas : « bornes, cut-offs, pondérations,
// doses, **durées, fenêtres temporelles** ». Le banc qui la garde,
// `seuilsLitterauxMotives.guard.test.ts`, balaie `src/lib` et exige de chaque
// seuil LITTÉRAL qu'il soit nommé ou motivé. Il lit le code. Une fenêtre que le
// modèle produit à la génération n'est écrite dans aucun littéral : elle lui
// échappe entièrement, et le périmètre du garde ne couvrait donc pas la surface
// qui a effectivement failli.
//
// CE QUE LA PRODUCTION A MONTRÉ. Sur 32 synthèses `synthese-v29`, une écrit
// « le DASS-21 mesure des états des deux dernières semaines, le HAD une
// semaine ». Les deux durées sont fausses ET inversées par rapport à la
// consigne lue par le patient (`Q_STR_04` : « la dernière semaine » ;
// `Q_NEU_11` : « ces dernières semaines »). La conclusion — les deux échelles
// ne sont pas superposables — était juste ; sa PRÉMISSE était fabriquée, et
// servie au praticien avec le statut d'un fait.
//
// POURQUOI L'INTERDIT PLUTÔT QUE LA DONNÉE. `buildUserMessage` ne projette pas
// `instructions`, seul endroit où la période d'un instrument est écrite. La
// transmettre supposerait d'ÉCRIRE une fenêtre clinique sur une centaine
// d'instruments, chacune due à sa provenance — et au moins une est indécidable
// (`Q_GAS_01` : « 3 derniers mois » en première consultation, « 3 dernières
// semaines » en suivi). Voir [[D-182]].
//
// CE QUE CE BANC PROUVE, ET CE QU'IL NE PROUVE PAS. Comme ses deux jumeaux
// (`promptAssociationPreuve`, `promptPassationCourante`), il épingle **la
// consigne**, jamais la sortie du modèle. Il ne garantit pas que le modèle
// obéit ; il garantit qu'on ne lui a pas retiré l'interdit en silence.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;

/** La formule citable, seule ancre stable de la clause. */
const FORMULE = "La fenêtre de rappel d'un instrument ne t'est pas transmise";

// Premier titre de section topique du prompt. Tout ce qui précède appartient au
// cadre déontologique, que rien n'écarte plus bas.
const PREMIERE_SECTION_TOPIQUE = '## Questionnaires alimentaires';

describe('consigne système — la fenêtre de rappel d’un instrument ne s’énonce pas (DC-19)', () => {
  it('la version est bien v30 ou au-delà : la clause n’existe pas avant', () => {
    // v30 est le bump qui porte cette clause. Revenir à v29 en la gardant, ou
    // l'inverse, décrit un prompt qui n'est pas celui qui part au modèle.
    const numero = Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''));
    expect(Number.isFinite(numero)).toBe(true);
    expect(numero).toBeGreaterThanOrEqual(30);
  });

  it('la formule épinglée est présente, mot pour mot, et UNE SEULE FOIS', () => {
    // Une formule courte et citable est ce qui rend l'interdit épinglable : une
    // paraphrase se dilue au fil des révisions sans que personne ne décide de
    // la retirer. L'unicité n'est pas de la coquetterie — le test de position
    // ci-dessous raisonne sur la PREMIÈRE occurrence, et une seconde clause
    // posée plus bas, qui l'affaiblirait, resterait invisible à `indexOf`.
    expect(CONSIGNE).toContain(FORMULE);
    const occurrences = CONSIGNE.split(FORMULE).length - 1;
    expect(occurrences, 'la formule doit apparaître une seule fois dans la consigne').toBe(1);
  });

  it('l’OPÉRATEUR d’interdiction est épinglé, pas seulement le constat', () => {
    // LE DÉFAUT QUE CE TEST FERME. « La fenêtre ne t'est pas transmise » est un
    // CONSTAT : seul, il n'interdit rien, et un modèle peut le lire comme une
    // excuse pour combler le trou de mémoire. L'interdit tient à l'impératif
    // qui suit. Retirer la seule phrase « N'énonce donc aucune période… »
    // laisserait toutes les assertions de vocabulaire vertes.
    expect(CONSIGNE).toMatch(/n'énonce donc \*\*aucune période couverte par un instrument\*\*/i);
  });

  it('ce qui reste AUTORISÉ est nommé, pas seulement ce qui est interdit', () => {
    // Ce fichier de bancs documente deux fois la même classe de défaut : « une
    // consigne purement prohibitive laisse le modèle sans formulation de repli,
    // il en invente une, souvent équivalente à ce qu'on lui interdit ». Ici, le
    // repli est le geste clinique UTILE que la production a montré — dire que
    // deux instruments ne sont pas superposables. Le lui retirer avec la
    // fenêtre coûterait plus que le défaut corrigé.
    expect(CONSIGNE).toMatch(/ne sont pas superposables/i);
  });

  it('la règle BORNE sa portée aux instruments, et le dit', () => {
    // SANS CETTE BORNE, LA RÈGLE AURAIT ÉTEINT SIX OCCURRENCES LÉGITIMES sur
    // les sept que la mesure du 2026-09-14 a trouvées : la durée réelle d'un
    // agenda de trois semaines, une reprise du déclaratif patient, des
    // questions d'entretien (« votre moral ces dernières semaines ? »). Une
    // période que le PATIENT déclare est une donnée ; la portée d'un
    // INSTRUMENT est une propriété non transmise. Les confondre transformerait
    // un garde en censure du récit patient.
    expect(CONSIGNE).toMatch(/porte sur la portée des INSTRUMENTS, et sur elle seule/);
    expect(CONSIGNE).toMatch(/une période que le patient déclare/i);
  });

  it('la clause est posée AU-DESSUS des sections topiques', () => {
    // Le prompt contient une clause de primauté explicite : la section
    // « Recommandation d'exploration déterministe » prime sur toute autre
    // consigne relative aux explorations, mais « ne relève aucune des
    // interdictions posées plus haut ». Une clause posée au-dessus des sections
    // est donc hors de sa portée ; la même clause déplacée en dessous
    // deviendrait discutable sans que son texte ait bougé.
    const positionClause = CONSIGNE.indexOf(FORMULE);
    const positionSection = CONSIGNE.indexOf(PREMIERE_SECTION_TOPIQUE);
    expect(positionClause).toBeGreaterThan(-1);
    expect(positionSection).toBeGreaterThan(-1);
    expect(positionClause).toBeLessThan(positionSection);
  });

  it('la clause voisine sur les normes non transmises n’a pas été emportée', () => {
    // ANTI-VACUITÉ, ET PLUS QUE CELA. La nouvelle clause s'insère juste après
    // celle qui interdit déjà d'invoquer « ni norme ni étalonnage de population
    // que les données transmises ne portent pas » — même famille exacte : une
    // propriété de l'instrument qui n'arrive pas au modèle. Une édition qui
    // remplacerait l'une par l'autre laisserait ce fichier vert tout en ayant
    // retiré un interdit.
    expect(CONSIGNE).toMatch(/ni norme ni étalonnage de population/i);
  });
});
