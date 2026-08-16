import { describe, expect, it } from 'vitest';
import {
  ALIAS_HISTORIQUES,
  CATALOGUE_DEFINITIONS,
  IDS_ASSIGNABLES,
  PASSATION_PRATICIEN,
  listeBibliotheque,
  scoreMax,
} from './bibliotheque';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from './questions';
import { motifNonInterpretable } from './scoring/passationsNonInterpretables';

describe('listeBibliotheque', () => {
  const entrees = listeBibliotheque();
  const parId = new Map(entrees.map(e => [e.id, e]));

  it('n’annonce aucun dénominateur pour un instrument sans total global', () => {
    // Relevé en revue le 2026-08-01. Le rayon et l'aperçu lisent `maxTotal` dans
    // la DÉFINITION, pas dans le retour du moteur : `Q_TAB_04` continuait
    // d'afficher « · /36 » alors que son moteur avait cessé de rendre un total,
    // et que le registre déclare « AUCUN total global ». Le praticien lisait le
    // dénominateur au rayon, assignait, ne recevait rien.
    //
    // La garde est GÉNÉRIQUE, pas nominative : tout instrument qui posera
    // `sansTotalGlobal` demain héritera de la propriété sans qu'on y repense.
    const porteurs = Object.entries(CATALOGUE_DEFINITIONS)
      .filter(([, def]) => (def as any)?.scoring?.sansTotalGlobal === true)
      .map(([id]) => id);
    // Contrôle négatif : sans lui, vider `sansTotalGlobal` du catalogue rendrait
    // la boucle vide et le test vert.
    expect(porteurs).toContain('Q_TAB_04');
    for (const id of porteurs) {
      expect(scoreMax(CATALOGUE_DEFINITIONS[id]), id).toBeNull();
      const entree = parId.get(id);
      if (entree) expect(entree.scoreMax, id).toBeNull();
    }
  });

  it('expose les instruments assignables avec leur nombre de questions', () => {
    const pss = parId.get('Q_STR_02');
    expect(pss).toBeDefined();
    expect(pss?.assignable).toBe(true);
    expect(pss?.nbQuestions).toBe(10);
    expect(pss?.passationPraticien).toBe(false);
  });

  it('marque les alias historiques non assignables, grille cible renseignée', () => {
    for (const [alias, cible] of Object.entries(ALIAS_HISTORIQUES)) {
      const entree = parId.get(alias);
      expect(entree, alias).toBeDefined();
      expect(entree?.assignable).toBe(false);
      expect(entree?.aliasVers).toBe(cible);
      expect(IDS_ASSIGNABLES.has(alias)).toBe(false);
    }
  });

  it('expose les 7 passations praticien, chacune dans sa position d’assignabilité', () => {
    // SIX depuis le 2026-07-31 : `Q_GEO_04` (MMSE) y REVIENT et `Q_NEU_06` (MMT)
    // y ENTRE, tous deux sur arbitrage praticien — le premier par renversement de
    // la décision du 2026-07-29, le second parce que son identité est désormais
    // instruite (document IEDM de 2005, dix items au mot près). Les motifs sont
    // écrits à côté de chaque ligne dans `bibliotheque.ts`, et la décision
    // d'exposition est gardée par `droitsAssignabilite.guard.test.ts`.
    //
    // Le compte est exact à dessein — sans lui, une boucle sur une liste amputée
    // resterait verte. La liste est ORDONNÉE comme la source : une entrée qui se
    // glisse ailleurs qu'à sa place se voit.
    // SEPT depuis le 2026-08-01 : `Q_PED_02`, débaptisé, y entre parce qu'il est
    // renseigné par un ENSEIGNANT — l'envoyer au portail patient ferait remplir
    // le parent à la place de l'informant annoncé, ou ferait transiter le lien
    // magique du patient vers un tiers.
    expect(PASSATION_PRATICIEN.map(p => p.id))
      .toEqual(['Q_GEO_03', 'Q_GEO_04', 'Q_GEO_05', 'Q_GEO_06', 'Q_NEU_06', 'Q_PED_02', 'Q_URO_02']);
    // « Jamais assignables » a cessé d'être vrai le 2026-08-16 ([[D-066]]) :
    // les cinq déclencheurs cognitifs des panels biologie sont réactivés, et
    // leur assignation est un geste praticien assumé par la décision. La
    // sentinelle est INVERSÉE, pas supprimée : chaque instrument est épinglé
    // dans SA position, et le bandeau de consultation reste dû partout.
    const ASSIGNABLES_PAR_DECISION = new Set(['Q_GEO_03', 'Q_GEO_04', 'Q_GEO_05', 'Q_GEO_06', 'Q_NEU_06']);
    for (const { id } of PASSATION_PRATICIEN) {
      const entree = parId.get(id);
      expect(entree, id).toBeDefined();
      expect(entree?.passationPraticien).toBe(true);
      expect(entree?.assignable, id).toBe(ASSIGNABLES_PAR_DECISION.has(id));
      expect(IDS_ASSIGNABLES.has(id), id).toBe(ASSIGNABLES_PAR_DECISION.has(id));
    }
  });

  it('ne contient aucun doublon de TITRE — le sélecteur n’affiche que ça', () => {
    // La garde d'identifiant ci-dessous ne voyait pas ce défaut. Le sélecteur
    // d'assignation (`api/praticien/questionnaires`) ne filtre que sur `actif` et
    // rend « titre (catégorie) », sans badge : deux entrées au même libellé y
    // sont indiscernables, et l'une des deux peut être un alias sans grille, qui
    // échoue en 404. C'est ce qu'a produit l'ajout de l'entrée `Q_NEU_11` face à
    // son alias `Q_STR_07`, avant désambiguïsation. Relevé en revue.
    const parTitre = new Map<string, string[]>();
    for (const e of entrees) parTitre.set(e.titre, [...(parTitre.get(e.titre) ?? []), e.id]);
    const doublons = [...parTitre].filter(([, ids]) => ids.length > 1);
    expect(doublons, `titres partagés :\n  ${doublons.map(([t, ids]) => `${t} → ${ids}`).join('\n  ')}`)
      .toEqual([]);
  });

  it('un alias suit sa cible dans la suspension', () => {
    // La promesse de gouvernabilité du lot du 2026-07-29 : `actif: false` sur la
    // grille doit suffire à la fermer. Elle ne tient que si l'alias suit — sinon
    // il reste au rayon avec son aperçu, et l'usage licencié se poursuit sur
    // papier, exactement l'argument qui a sorti le MMSE de `PASSATION_PRATICIEN`
    // dans #460. Vert à vide aujourd'hui : aucun alias ne vise un suspendu. Il
    // mordra le jour où l'un le fera.
    for (const [alias, cible] of Object.entries(ALIAS_HISTORIQUES)) {
      if (IDS_SUSPENDUS.has(cible)) {
        expect(IDS_SUSPENDUS.has(alias), `${alias} doit suivre ${cible}`).toBe(true);
      }
    }
    // Anti-vacuité : la boucle porte bien sur des paires réelles.
    expect(Object.keys(ALIAS_HISTORIQUES).length).toBeGreaterThan(0);
  });

  it('ne contient aucun doublon d’identifiant', () => {
    expect(parId.size).toBe(entrees.length);
  });
});

// Suspendre un instrument (`actif: false`) doit couper l'assignation SANS
// rendre illisibles les passations déjà enregistrées. Les deux moitiés se
// tiennent : couper sans préserver ferait disparaître des données cliniques,
// préserver sans couper laisserait proposer un instrument retiré.
//
// Formulé en invariant sur TOUS les suspendus, et non sur un identifiant
// nommé : la propriété doit valoir pour la prochaine suspension aussi. Au
// 2026-07-31 ils sont huit — `Q_SOM_07` en est SORTI, reconstruit depuis sa
// source et rouvert, et `Q_FIB_03` (ELFE) reste le témoin de référence : fermé
// faute d'usage, non pour un défaut de mesure.
describe('questionnaire suspendu (actif: false)', () => {
  const suspendus = QUESTIONNAIRES_CATALOG.filter(q => !q.actif);
  const affiches = new Set(listeBibliotheque().map(e => e.id));

  // Contrôle négatif : sans lui, les deux gardes suivantes passeraient au vert
  // sur un ensemble vide et ne prouveraient rien.
  it('il en existe au moins un dans le catalogue', () => {
    expect(suspendus.length).toBeGreaterThan(0);
  });

  // L'INVARIANT S'EST DÉDOUBLÉ LE 2026-07-31, parce que `actif: false` portait
  // deux sens qu'il a fallu séparer : « retiré » et « jamais destiné au
  // patient ». Un test administré par le clinicien est `actif: false` À VIE —
  // c'est ainsi que sa route d'assignation reste fermée — tout en devant
  // s'afficher au praticien pour être administré.
  //
  // La partie ASSIGNATION reste absolue et ne souffre aucune exception : elle
  // est ce qui protège réellement le patient. La partie AFFICHAGE en admet une,
  // et cette exception est une LISTE FERMÉE, pas un prédicat — `passationPraticien`
  // aurait fait passer au vert n'importe quel ajout futur à cette liste, y
  // compris celui qu'on n'aurait pas voulu.
  // SIX depuis le 2026-08-01 : les quatre autres instruments de consultation ont
  // reçu leur entrée `actif: false` le même jour, pour fermer leur route
  // d'assignation — mesurée ouverte par appel direct. Ils étaient déjà affichés
  // par `PASSATION_PRATICIEN` ; seule leur route change.
  const AFFICHES_EN_CONSULTATION = [
    'Q_GEO_03', 'Q_GEO_04', 'Q_GEO_05', 'Q_GEO_06', 'Q_NEU_06', 'Q_PED_02', 'Q_URO_02',
  ];

  it('n’est jamais assignable, quel qu’en soit le motif', () => {
    for (const q of suspendus) {
      expect(IDS_ASSIGNABLES.has(q.id), q.id).toBe(false);
    }
  });

  it('disparaît du rayon affiché, sauf les deux instruments de consultation', () => {
    for (const q of suspendus) {
      expect(affiches.has(q.id), q.id).toBe(AFFICHES_EN_CONSULTATION.includes(q.id));
    }
    // Et l'exception est REMPLIE, pas seulement tolérée : sans ceci, retirer les
    // deux lignes de `PASSATION_PRATICIEN` laisserait ce test vert.
    for (const id of AFFICHES_EN_CONSULTATION) {
      expect(affiches.has(id), `${id} doit rester affiché pour être administré`).toBe(true);
    }
  });

  it('reste scorable — les passations existantes restent lisibles', () => {
    for (const q of suspendus) {
      const cible = ALIAS_HISTORIQUES[q.id] ?? q.id;
      expect(CATALOGUE_DEFINITIONS[cible], q.id).toBeDefined();
      // Assertion sur le vrai point d'entrée, pas sur un proxy : `calculateScore`
      // rend `{ error: 'Questionnaire introuvable' }` sur un id absent du
      // catalogue de scoring. Une « purge des inactifs » de ce catalogue —
      // le nettoyage plausible — ferait donc échouer ceci.
      expect(calculateScore(cible, {}), q.id).not.toHaveProperty('error');
    }
  });

  // Les trois gardes ci-dessus verrouillent le MÉCANISME, jamais la décision :
  // un invariant sur « les suspendus » reste vert quand un instrument précis
  // change de camp. D'où une assertion NOMMÉE, qui est la seule à tomber quand
  // la décision bouge — et elle est tombée le 2026-07-31, comme prévu.
  //
  // Elle disait « Q_SOM_07 est suspendu et le reste ». Il ne l'est plus : il a
  // été reconstruit depuis sa source, et sa suspension du 2026-07-27 annonçait
  // elle-même « réactivation prévue à la reconstruction depuis la source ». Ce
  // qui doit rester nommé, c'est donc le couple que la réactivation ne doit PAS
  // défaire — l'instrument rouvert d'un côté, ses passations historiques
  // toujours neutralisées de l'autre. Rouvrir en blanchissant le passé serait la
  // régression que ce test existe désormais pour empêcher.
  it('Q_SOM_07 est rouvert, SANS blanchir ses passations historiques', () => {
    const mfi = QUESTIONNAIRES_CATALOG.find(q => q.id === 'Q_SOM_07');
    expect(mfi, 'Q_SOM_07 doit exister au catalogue').toBeDefined();
    expect(mfi?.actif).toBe(true);
    expect(IDS_SUSPENDUS.has('Q_SOM_07')).toBe(false);

    // Les quatre passations de production datent d'avant la reconstruction :
    // elles portent une autre échelle et d'autres items, et restent illisibles
    // comme mesure.
    expect(motifNonInterpretable('Q_SOM_07', new Date('2026-07-21T08:00:00.000Z'))).not.toBeNull();
    // Une passation neuve, elle, est une mesure ordinaire.
    expect(motifNonInterpretable('Q_SOM_07', new Date('2026-08-01T08:00:00.000Z'))).toBeNull();
  });

  // ── Arbitrage des droits du 2026-07-29 ──────────────────────────────────────
  //
  // Cinq instruments sous licence tierce fermés à l'assignation le temps
  // d'instruire leurs ayants droit. Même mécanisme que Q_SOM_07 — `actif: false`
  // alimente `IDS_SUSPENDUS`, que les trois routes d'assignation consultent —
  // parce qu'il est déjà câblé ET déjà gardé par le vérificateur du CI. Aucun
  // code neuf, donc aucune garde neuve à se tromper.
  // Les deux EORTC ont quitté cette liste le 2026-07-30 : rouverts sur décision
  // du praticien, en même temps que leur cotation est passée aux manuels
  // officiels. La réserve « © EORTC » n'est pas levée pour autant — elle est
  // gardée par `droitsAssignabilite.guard.test.ts`, qui exige une décision écrite
  // pour chaque instrument ouvert sous réserve.
  // Q_PED_02 est SORTI puis REVENU dans cette liste le 2026-07-30 : rouvert sur
  // son verdict de banc, refermé le jour même quand la revue a montré que « 0
  // divergence critique » portait sur les deux seuls contrôles que la source
  // permettait, et que le servi porte des items DSM là où Conners porte les
  // siens. Le motif complet est au catalogue, à côté de l'entrée.
  // `Q_PED_02` et `Q_GEO_04` restaient tous deux dans cette liste après le
  // 2026-08-01 : leur réouverture portait sur l'usage EN CONSULTATION, jamais
  // sur la route. `Q_GEO_04` en est SORTI le 2026-08-16 ([[D-066]]) : la route
  // rouvre sur déclaration du praticien-propriétaire que l'usage est couvert
  // (patron EORTC) — la décision est gardée, avec son motif, par
  // `droitsAssignabilite.guard.test.ts`. Les Conners restent fermés.
  const SUSPENDUS_DROITS = ['Q_PED_02', 'Q_PED_03'];

  it('les instruments à droits non dégagés sont fermés à l’assignation', () => {
    for (const id of SUSPENDUS_DROITS) {
      const entree = QUESTIONNAIRES_CATALOG.find(q => q.id === id);
      expect(entree, `${id} doit exister au catalogue`).toBeDefined();
      expect(entree?.actif, id).toBe(false);
      expect(IDS_SUSPENDUS.has(id), id).toBe(true);
      expect(IDS_ASSIGNABLES.has(id), id).toBe(false);
      // Fermé, pas effacé : la définition reste, les passations enregistrées
      // restent lisibles, et la réactivation ne demande qu'une ligne.
      expect(CATALOGUE_DEFINITIONS[id], id).toBeDefined();
    }
  });

  it('le MMSE est rouvert des deux côtés, et la séparation des deux gestes survit', () => {
    // Il n'avait aucune entrée au catalogue : il ne figurait qu'en
    // `PASSATION_PRATICIEN`, une liste d'AFFICHAGE que les routes d'assignation
    // ne consultent pas. Non proposé à l'écran, donc — mais accepté par un appel
    // direct à `api/praticien/assignations`, qui n'exige qu'une définition une
    // fois passé le filtre `IDS_SUSPENDUS`. « Invisible et assignable » est
    // exactement la combinaison contre laquelle `questionnaires-catalog.ts` met
    // en garde. Sans entrée au catalogue, `actif: false` ne l'atteignait pas.
    //
    // Deux gestes INDÉPENDANTS, et il fallait les deux. L'entrée de catalogue
    // en `actif: false` ferme la ROUTE ; le retrait de `PASSATION_PRATICIEN`
    // ferme l'USAGE, car cette ligne portait l'aperçu de la grille — le seul
    // accès aux 30 items pour une passation en consultation. Fermer la seule
    // assignation en continuant d'afficher la grille laisserait l'usage
    // licencié se poursuivre sur papier.
    //
    // Une rédaction antérieure justifiait le retrait par un doublon d'affichage
    // qui n'existe pas : `listeBibliotheque` ne montre jamais une entrée
    // inactive. Le geste tenait, sa raison était fausse — et une raison fausse
    // ne garde rien, puisqu'elle serait retirée sans que rien ne rougisse.
    // RENVERSEMENT DU 2026-07-31, sur arbitrage praticien : des deux gestes, le
    // second est repris — l'usage en consultation rouvre, la route reste fermée.
    //
    // SECOND RENVERSEMENT LE 2026-08-16 ([[D-066]]) : la ROUTE rouvre à son
    // tour, sur déclaration du praticien-propriétaire que l'usage est couvert
    // (patron EORTC — la réserve « © PAR » reste au registre). Le MMSE est un
    // déclencheur du panel mémoire du catalogue biologie : fermé, aucune
    // passation ne peut naître et le panel est inerte. Ce qui SURVIT aux deux
    // renversements, et que ce cas épingle : la séparation des deux gestes
    // (l'acquis de #460), l'unicité de l'entrée en rayon, et le bandeau de
    // consultation que porte `passationPraticien` — l'assignation est un geste
    // praticien, jamais un envoi de routine.
    expect(listeBibliotheque().filter(e => e.id === 'Q_GEO_04')).toHaveLength(1);
    expect(PASSATION_PRATICIEN.map(p => p.id)).toContain('Q_GEO_04');
    expect(IDS_SUSPENDUS.has('Q_GEO_04')).toBe(false);
    expect(IDS_ASSIGNABLES.has('Q_GEO_04')).toBe(true);
    // Affiché en consultation ET assignable par geste praticien : la
    // distinction que porte `passationPraticien` reste due à l'écran.
    const enRayon = listeBibliotheque().find(e => e.id === 'Q_GEO_04');
    expect(enRayon?.passationPraticien).toBe(true);
    expect(enRayon?.assignable).toBe(true);
    // Et il reste scorable : les passations déjà enregistrées restent lisibles.
    expect(calculateScore('Q_GEO_04', {})).not.toHaveProperty('error');
  });

  it('la cancérologie tient à deux instruments, désormais rouverts', () => {
    // Anti-surprise : `Q_CAN_01` et `Q_CAN_02` sont les SEULS instruments de
    // cancérologie. Le domaine bascule donc tout entier au moindre geste — il a
    // été fermé le 2026-07-29, rouvert le 2026-07-30 — et ce test dit cette
    // fragilité plutôt qu'un état. Il fait rougir le jour où un troisième arrive
    // sans que la question de sa licence ait été posée.
    const cancero = QUESTIONNAIRES_CATALOG.filter(q => q.categorie === 'Cancérologie');
    expect(cancero.map(q => q.id)).toEqual(['Q_CAN_01', 'Q_CAN_02']);
    expect(cancero.every(q => q.actif)).toBe(true);
  });

  it('HAD est servable par l’interface, et son alias reste refusé', () => {
    // Arbitrage du 2026-07-29. Avant : aucune entrée de rayon, donc proposé par
    // aucun écran — mais accepté par un appel direct à la route d'assignation.
    // Après : proposé, assignable, et surtout ATTEIGNABLE par `actif: false`, ce
    // qui n'était pas le cas. Sur un instrument sous licence tierce non
    // instruite, la gouvernabilité était l'enjeu.
    const had = QUESTIONNAIRES_CATALOG.find(q => q.id === 'Q_NEU_11');
    expect(had, 'Q_NEU_11 doit exister au catalogue').toBeDefined();
    expect(had?.actif).toBe(true);
    expect(IDS_ASSIGNABLES.has('Q_NEU_11'), 'et porter une définition').toBe(true);
    expect(IDS_SUSPENDUS.has('Q_NEU_11')).toBe(false);

    // L'alias historique reste ce qu'il est : affiché, jamais assignable, et
    // pointant vers la grille. Assigner `Q_STR_07` échouerait — il n'a pas de
    // définition de scoring, et c'est pour cela que HAD n'était servable par
    // aucun chemin d'interface avant ce lot.
    expect(ALIAS_HISTORIQUES.Q_STR_07).toBe('Q_NEU_11');
    expect(CATALOGUE_DEFINITIONS['Q_STR_07']).toBeUndefined();
    expect(IDS_ASSIGNABLES.has('Q_STR_07')).toBe(false);
  });

  // ── Fermetures du 2026-07-29, motif DOCUMENTATION ──────────────────────────
  //
  // Distinctes des cinq de #460, qui étaient fermées pour motif de DROITS. Ici
  // les droits sont couverts par la déclaration praticien étendue le même jour :
  // ce qui manque est l'identité de l'instrument. Le registre ne nomme aucun
  // auteur et sa référence bibliographique est à compléter — on ne sait pas dire
  // ce qu'il est, donc on ne peut pas le certifier.
  // `Q_PNE_01` en est SORTI le 2026-07-31 : la condition posée à sa fermeture —
  // « réactivation à la première source identifiée » — est remplie. C'est le
  // VQ11 de Ninot et al. (2010), établi par la revue adversariale du 2026-07-30
  // sur la correspondance exacte des onze items et des trois composantes
  // publiées.
  //
  // `Q_TAB_04` en est SORTI le 2026-08-01, et par le chemin que sa fermeture
  // annonçait : « réactivation à l'identification de la source ». La source est
  // identifiée — c'est le Know Cannabis Test de Roel Kerssemakers (clinique
  // Jellinek, Amsterdam, 2000), lu à l'image sur les deux volets de trois pages
  // du support et recoupé à la fiche p. 32 du guide de repérage de l'OFDT
  // (janvier 2013), pièce inscrite au registre des sources.
  //
  // Mais l'identification a produit l'inverse de ce qu'on en attendait : le servi
  // ne partage AUCUN item avec cette source au sens strict — zéro paire de même
  // question ET mêmes modalités sur 32 items ; neuf de même construit, sept
  // propres au servi, sept propres à la source, 9 + 7 = 16 de chaque côté — et la
  // source ne donne AUCUN point
  // par option. Il est donc débaptisé et dégréé de ses bandes, plutôt que
  // reconstruit — reconstruire aurait exigé d'inventer le barème menant à son
  // /36. Ce qui rouvre l'instrument n'est pas la conformité à sa source : c'est
  // qu'il cesse de s'en réclamer.
  const FERMES_DOCUMENTATION = ['Q_FIB_03'];

  it('les instruments sans auteur nommé sont fermés à l’assignation', () => {
    for (const id of FERMES_DOCUMENTATION) {
      const entree = QUESTIONNAIRES_CATALOG.find(q => q.id === id);
      expect(entree, `${id} doit exister au catalogue`).toBeDefined();
      expect(entree?.actif, id).toBe(false);
      expect(IDS_SUSPENDUS.has(id), id).toBe(true);
      expect(IDS_ASSIGNABLES.has(id), id).toBe(false);
      // Fermé, pas effacé : les passations enregistrées restent lisibles.
      expect(CATALOGUE_DEFINITIONS[id], id).toBeDefined();
    }
  });

  it('la pneumologie tient à un seul instrument, désormais rouvert', () => {
    // Anti-surprise, même garde que pour la cancérologie dans #460 : `Q_PNE_01`
    // est le SEUL instrument de pneumologie du catalogue. Le fermer fermait le
    // domaine ; le rouvrir le rouvre en entier. Ce test dit cette fragilité
    // plutôt qu'un état, et il fait rougir le jour où un second arrive sans que
    // sa documentation ait été instruite.
    //
    // Rouvert le 2026-07-31 : la condition posée à sa fermeture — « réactivation
    // à la première source identifiée » — est remplie, c'est le VQ11 de Ninot et
    // al. (2010).
    const pneumo = QUESTIONNAIRES_CATALOG.filter(q => q.categorie === 'Pneumologie');
    expect(pneumo.map(q => q.id)).toEqual(['Q_PNE_01']);
    expect(pneumo.every(q => q.actif)).toBe(true);
  });

  it('la tabacologie sert ses cinq instruments', () => {
    // Ce test disait « quatre » du 2026-07-29 au 2026-08-01, pendant la
    // suspension de `Q_TAB_04` : sa contrepartie était que le domaine survive à
    // la fermeture d'un instrument. Il revient, débaptisé — le compte redevient
    // cinq, et le test garde toujours la même chose : qu'on distingue dans le
    // diff la fermeture d'un domaine de celle d'un instrument parmi d'autres.
    const tabaco = QUESTIONNAIRES_CATALOG.filter(q => q.categorie === 'Tabacologie');
    expect(tabaco.filter(q => q.actif).map(q => q.id))
      .toEqual(['Q_TAB_01', 'Q_TAB_02', 'Q_TAB_03', 'Q_TAB_04', 'Q_TAB_05']);
  });

  it('les instruments laissés hors suspension le restent', () => {
    // L'arbitrage a porté sur CINQ des huit sous licence. Sans cette garde, un
    // élargissement silencieux de la suspension passerait pour la décision
    // prise. Epworth et HIT-6 sont réellement assignables ; `Q_STR_07` est un
    // ALIAS sans définition de scoring, donc jamais assignable — l'assertion
    // `!IDS_SUSPENDUS.has()` seule serait vraie de n'importe quel identifiant,
    // `Q_FAUX` compris, et c'est ce qui masquait le cas de HAD ci-dessous.
    for (const id of ['Q_SOM_02', 'Q_INF_04', 'Q_STR_07', 'Q_NEU_11']) {
      expect(IDS_SUSPENDUS.has(id), id).toBe(false);
    }
    expect(IDS_ASSIGNABLES.has('Q_SOM_02')).toBe(true);
    expect(IDS_ASSIGNABLES.has('Q_INF_04')).toBe(true);
    expect(IDS_ASSIGNABLES.has('Q_STR_07')).toBe(false);
    expect(CATALOGUE_DEFINITIONS['Q_STR_07']).toBeUndefined();
    // HAD, lui, est désormais assignable — c'est l'objet du lot du 2026-07-29.
    expect(IDS_ASSIGNABLES.has('Q_NEU_11')).toBe(true);
  });

  it('les définitions sans entrée de rayon sont recensées, jamais découvertes', () => {
    // L'INVARIANT DE CLASSE que ce lot aurait dû écrire d'emblée.
    //
    // `api/praticien/assignations` n'exige, une fois passé le filtre
    // `IDS_SUSPENDUS`, qu'une définition de scoring. Un instrument qui porte une
    // définition sans figurer ni au catalogue ni en passation praticien est donc
    // INVISIBLE à l'écran et ASSIGNABLE par appel direct — la combinaison contre
    // laquelle `questionnaires-catalog.ts` met en garde, et celle que ce lot a
    // fermée sur `Q_GEO_04`.
    //
    // `Q_NEU_11` (HAD) en est SORTI le 2026-07-29 : il a reçu une entrée de rayon
    // active, sur arbitrage praticien. Il n'y reste donc que `Q_NEU_12`, cible de
    // l'alias `Q_SOM_08` et dans la même position exactement — définition
    // présente, aucune entrée de rayon, donc invisible et pourtant accepté par un
    // appel direct. Nommé pour ne pas être redécouvert ; son sort n'a pas été
    // arbitré.
    const auRayon = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));
    const enPassation = new Set(PASSATION_PRATICIEN.map(p => p.id));
    const orphelins = Object.keys(QUESTIONNAIRE_CATALOGUE)
      .filter(id => !auRayon.has(id) && !enPassation.has(id))
      .sort();
    expect(orphelins).toEqual(['Q_NEU_12']);
  });
});
