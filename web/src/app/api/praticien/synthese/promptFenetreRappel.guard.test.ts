import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LE TROU QUE CE BANC REFERME — `DC-19`, mesure de production du 2026-09-14
// ([[D-183]]).
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
// semaines » en suivi). Voir [[D-183]].
//
// CE QUE CE BANC PROUVE, ET CE QU'IL NE PROUVE PAS. Comme ses deux jumeaux
// (`promptAssociationPreuve`, `promptPassationCourante`), il épingle **la
// consigne**, jamais la sortie du modèle. Il ne garantit pas que le modèle
// obéit ; il garantit qu'on ne lui a pas retiré l'interdit en silence.
//
// CE QUE LA PASSE CODEX RÉTROACTIVE DU 2026-09-16 A MONTRÉ, ET QUI A REFAIT CE
// FICHIER ([[D-201]]). La première rédaction vérifiait des FRAGMENTS
// INDÉPENDANTS, jamais une clause cohérente. Deux mutations, jouées ici et
// vertes sur 55 cas — ré-ancrage des deux empreintes compris, sans quoi on ne
// teste que l'ancre :
//
//   A. Ajouter « sauf si elle est habituellement admise pour cette échelle »
//      APRÈS l'opérateur. C'est l'exact comportement que la clause existe pour
//      interdire : toutes les assertions de vocabulaire restaient vraies, parce
//      qu'aucune ne lisait la phrase ENTIÈRE.
//   B. Déplacer le seul OPÉRATEUR sous la première section topique. Le test de
//      position ne localisait que le CONSTAT ; l'opérateur pouvait donc migrer
//      sous une section que la clause de primauté de « Recommandation
//      d'exploration déterministe » rend discutable, sans qu'une assertion
//      bouge.
//
// LA RÉPONSE EST STRUCTURELLE, PAS LEXICALE, et c'est délibéré. Blacklister
// « sauf si » aurait reproduit le défaut que ce dépôt a payé quatre fois en deux
// jours : une garde qui NOMME ce qu'elle interdit sans pouvoir le VOIR. Ce banc
// épingle donc la PUCE ENTIÈRE par empreinte, et vérifie que ses cinq
// composants y vivent tous et qu'elle reste au-dessus des sections topiques.
//
// POURQUOI UNE EMPREINTE DE PLUS, alors que deux gardes hachent déjà le prompt
// entier. Parce qu'elles ne coûtent pas la même chose. L'empreinte du prompt
// bouge à CHAQUE édition, de n'importe quelle ligne : la ré-ancrer est un geste
// de routine, et c'est précisément par là qu'une clause affaiblie de bonne foi
// passe. Celle-ci ne bouge QUE si cette clause-ci est touchée. La ré-ancrer
// n'est alors plus une formalité : c'est un acte posé sur un interdit `DC-19`,
// qui appelle une décision avant le report.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;

/** La formule citable, seule ancre stable de la clause. */
const FORMULE = "La fenêtre de rappel d'un instrument ne t'est pas transmise";

// Premier titre de section topique du prompt. Tout ce qui précède appartient au
// cadre déontologique, que rien n'écarte plus bas.
const PREMIERE_SECTION_TOPIQUE = '## Questionnaires alimentaires';

/**
 * La PHRASE-OPÉRATEUR, en entier. Un fragment ne suffit pas : la mutation A
 * insère son exception À L'INTÉRIEUR de cette phrase, et tout motif partiel la
 * laisse passer.
 */
const OPERATEUR =
  "N'énonce donc **aucune période de rappel d'un instrument**, ni pour la décrire,"
  + " ni pour motiver quoi que ce soit, et n'en déduis aucune de ce que tu croirais"
  + " savoir de l'échelle : ce serait une supposition servie comme un fait.";

/** Empreinte de la PUCE seule — voir l'en-tête pour ce qu'elle achète. */
const EMPREINTE_PUCE = 'e04e130e8778ae3e';

/**
 * La puce markdown qui PORTE la clause, délimitée par ses propres bornes.
 *
 * Extraire la puce plutôt que chercher dans tout le prompt est ce qui fait la
 * différence : « le mot est quelque part dans la consigne » et « le mot est dans
 * LA MÊME puce que l'interdit » ne disent pas la même chose, et la mutation B
 * vit exactement dans cet écart.
 */
function puceDeLaClause(): string {
  const position = CONSIGNE.indexOf(FORMULE);
  if (position < 0) throw new Error('la formule épinglée a disparu de la consigne');
  const debut = CONSIGNE.lastIndexOf('\n- ', position);
  if (debut < 0) throw new Error('la clause n’est plus portée par une puce');
  const puceSuivante = CONSIGNE.indexOf('\n- ', debut + 3);
  const sectionSuivante = CONSIGNE.indexOf('\n## ', debut + 3);
  const fin = Math.min(
    ...[puceSuivante, sectionSuivante, CONSIGNE.length].filter(index => index > 0),
  );
  return CONSIGNE.slice(debut + 1, fin);
}

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

  it('MUTATION B — l’OPÉRATEUR vit dans la MÊME PUCE que le constat', () => {
    // LE DÉFAUT QUE CE TEST FERME. « La fenêtre ne t'est pas transmise » est un
    // CONSTAT : seul, il n'interdit rien, et un modèle peut le lire comme une
    // excuse pour combler le trou de mémoire. L'interdit tient à l'impératif
    // qui suit.
    //
    // La première rédaction cherchait cet impératif dans TOUTE la consigne. Le
    // déplacer sous une section topique la laissait donc verte — mutation jouée,
    // 55 cas verts. Ici, il doit être dans la puce, et EN ENTIER : la mutation A
    // insère son exception au milieu de cette même phrase.
    expect(puceDeLaClause()).toContain(OPERATEUR);
  });

  it('ce qui reste AUTORISÉ est nommé dans la puce, pas seulement ce qui est interdit', () => {
    // Ce fichier de bancs documente deux fois la même classe de défaut : « une
    // consigne purement prohibitive laisse le modèle sans formulation de repli,
    // il en invente une, souvent équivalente à ce qu'on lui interdit ». Ici, le
    // repli est le geste clinique UTILE que la production a montré — dire que
    // deux instruments ne sont pas superposables. Le lui retirer avec la
    // fenêtre coûterait plus que le défaut corrigé.
    expect(puceDeLaClause()).toMatch(/ne sont pas superposables/i);
  });

  it('une DURÉE PORTÉE PAR LES DONNÉES reste restituable — Q_SOM_09', () => {
    // LE DÉFAUT QUE CE TEST FERME, TROUVÉ EN REVUE (Copilot, PR #1098). La
    // première rédaction interdisait « aucune période couverte par un
    // instrument ». Trop large : la durée de recueil de `Q_SOM_09` EST
    // transmise, deux fois — son `titre` est « Agenda du sommeil — 21 nuits »
    // et `buildUserMessage` projette `titre` ; son agrégat `AGD_NB_NUITS`
    // (« Nombre de nuits renseignées », 0 à 21) part dans les scores. La règle
    // aurait donc censuré la SEULE occurrence que la mesure du 2026-09-14
    // classait comme légitime sur ce motif — « les indicateurs de l'agenda sur
    // trois semaines », qui ne suppose rien : il restitue ce qu'on lui a donné.
    //
    // La ligne de partage est là, et elle est nette : une période de RAPPEL
    // (sur quoi l'instrument interroge) n'arrive jamais ; une durée de RECUEIL
    // portée par un titre, un libellé de score ou une date arrive toujours.
    //
    // L'exception doit vivre DANS la puce : sortie d'elle, elle cesserait de
    // borner cet interdit-ci et deviendrait une autorisation générale.
    const puce = puceDeLaClause();
    expect(puce).toMatch(/une durée que les données elles-mêmes portent se restitue/i);
    // L'exemple est cité dans la consigne, pas seulement la catégorie : une
    // autorisation abstraite laisse le modèle trancher lui-même ce qui « est
    // porté par les données », et il tranchera au plus large.
    expect(puce).toContain('Agenda du sommeil — 21 nuits');
  });

  it('la règle BORNE sa portée aux instruments, et le dit DANS la puce', () => {
    // SANS CETTE BORNE, LA RÈGLE AURAIT ÉTEINT SIX OCCURRENCES LÉGITIMES sur
    // les sept que la mesure du 2026-09-14 a trouvées : la durée réelle d'un
    // agenda de trois semaines, une reprise du déclaratif patient, des
    // questions d'entretien (« votre moral ces dernières semaines ? »). Une
    // période que le PATIENT déclare est une donnée ; la portée d'un
    // INSTRUMENT est une propriété non transmise. Les confondre transformerait
    // un garde en censure du récit patient.
    const puce = puceDeLaClause();
    expect(puce).toMatch(/porte sur la période de rappel des INSTRUMENTS, et sur elle seule/);
    expect(puce).toMatch(/une période que le patient déclare/i);
  });

  it('la clause ENTIÈRE est posée AU-DESSUS des sections topiques', () => {
    // Le prompt contient une clause de primauté explicite : la section
    // « Recommandation d'exploration déterministe » prime sur toute autre
    // consigne relative aux explorations, mais « ne relève aucune des
    // interdictions posées plus haut ». Une clause posée au-dessus des sections
    // est donc hors de sa portée ; la même clause déplacée en dessous
    // deviendrait discutable sans que son texte ait bougé.
    //
    // On borne la PUCE, pas seulement son premier mot : la mutation B laissait
    // le constat en place et ne déplaçait que l'opérateur.
    const puce = puceDeLaClause();
    const finDeLaPuce = CONSIGNE.indexOf(puce) + puce.length;
    const positionSection = CONSIGNE.indexOf(PREMIERE_SECTION_TOPIQUE);
    expect(positionSection).toBeGreaterThan(-1);
    expect(finDeLaPuce).toBeLessThan(positionSection);
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

  it('MUTATION A — la puce est épinglée par EMPREINTE, donc toute addition rougit', () => {
    // CE QUE CETTE EMPREINTE ATTRAPE ET QUE RIEN D'AUTRE N'ATTRAPE : une phrase
    // AJOUTÉE dans la puce. L'épinglage verbatim de l'opérateur tue la mutation
    // A telle que Codex l'a posée (une exception insérée dans la phrase), mais
    // pas sa variante — une exception posée en phrase SUIVANTE, qui laisserait
    // l'opérateur intact. Seule une empreinte de la puce entière les tue toutes.
    //
    // ELLE NE PROUVE TOUJOURS PAS QUE LE MODÈLE OBÉIT. Elle prouve qu'on ne peut
    // plus toucher à cet interdit sans le décider : le report de cette valeur
    // est un acte sur du `DC-19`, et il appelle une décision `D-xxx` avant, pas
    // après.
    const empreinte = createHash('sha256').update(puceDeLaClause()).digest('hex').slice(0, 16);
    expect(
      empreinte,
      "CLAUSE DC-19 MODIFIÉE. Ce n'est pas un report mécanique : relire ce qui a bougé,"
      + " et si l'interdit s'est affaibli — une exception ajoutée, une borne élargie, un"
      + " repli retiré — une décision `D-xxx` et un fragment `changelog.d/` sont dus AVANT"
      + " de reporter cette empreinte. Incrémenter aussi `VERSION_PROMPT_SYNTHESE`.",
    ).toBe(EMPREINTE_PUCE);
  });
});
