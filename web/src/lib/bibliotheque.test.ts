import { describe, expect, it } from 'vitest';
import {
  ALIAS_HISTORIQUES,
  CATALOGUE_DEFINITIONS,
  IDS_ASSIGNABLES,
  PASSATION_PRATICIEN,
  listeBibliotheque,
} from './bibliotheque';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from './questions';

describe('listeBibliotheque', () => {
  const entrees = listeBibliotheque();
  const parId = new Map(entrees.map(e => [e.id, e]));

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

  it('expose les 4 passations praticien, jamais assignables', () => {
    // Quatre depuis le 2026-07-29 : `Q_GEO_04` (MMSE) en est sorti sur arbitrage
    // des droits. Le compte est exact à dessein — sans lui, une boucle sur une
    // liste amputée resterait verte.
    expect(PASSATION_PRATICIEN.map(p => p.id))
      .toEqual(['Q_GEO_03', 'Q_GEO_05', 'Q_GEO_06', 'Q_URO_02']);
    for (const { id } of PASSATION_PRATICIEN) {
      const entree = parId.get(id);
      expect(entree, id).toBeDefined();
      expect(entree?.passationPraticien).toBe(true);
      expect(entree?.assignable).toBe(false);
      expect(IDS_ASSIGNABLES.has(id)).toBe(false);
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
// 2026-07-27 il y en a deux — Q_FIB_03 (ELFE) et Q_SOM_07 (MFI-20 divergent).
describe('questionnaire suspendu (actif: false)', () => {
  const suspendus = QUESTIONNAIRES_CATALOG.filter(q => !q.actif);
  const affiches = new Set(listeBibliotheque().map(e => e.id));

  // Contrôle négatif : sans lui, les deux gardes suivantes passeraient au vert
  // sur un ensemble vide et ne prouveraient rien.
  it('il en existe au moins un dans le catalogue', () => {
    expect(suspendus.length).toBeGreaterThan(0);
  });

  it('disparaît du rayon affiché et des ids assignables', () => {
    for (const q of suspendus) {
      expect(affiches.has(q.id), q.id).toBe(false);
      expect(IDS_ASSIGNABLES.has(q.id), q.id).toBe(false);
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

  // Les trois gardes ci-dessus étaient VERTES avant la suspension de Q_SOM_07 :
  // Q_FIB_03 les satisfaisait déjà à lui seul. Un invariant sur « les
  // suspendus » verrouille le mécanisme, jamais la décision — le repasser à
  // `actif: true` laisserait la suite entièrement verte. D'où cette assertion
  // nommée, qui est la seule à tomber si la suspension est défaite.
  it('Q_SOM_07 (MFI-20 divergent) est suspendu et le reste', () => {
    const mfi = QUESTIONNAIRES_CATALOG.find(q => q.id === 'Q_SOM_07');
    expect(mfi, 'Q_SOM_07 doit exister au catalogue').toBeDefined();
    expect(mfi?.actif).toBe(false);
    expect(IDS_SUSPENDUS.has('Q_SOM_07')).toBe(true);
  });

  // ── Arbitrage des droits du 2026-07-29 ──────────────────────────────────────
  //
  // Cinq instruments sous licence tierce fermés à l'assignation le temps
  // d'instruire leurs ayants droit. Même mécanisme que Q_SOM_07 — `actif: false`
  // alimente `IDS_SUSPENDUS`, que les trois routes d'assignation consultent —
  // parce qu'il est déjà câblé ET déjà gardé par le vérificateur du CI. Aucun
  // code neuf, donc aucune garde neuve à se tromper.
  const SUSPENDUS_DROITS = ['Q_PED_02', 'Q_PED_03', 'Q_GEO_04', 'Q_CAN_01', 'Q_CAN_02'];

  it('les cinq instruments à droits non dégagés sont fermés à l’assignation', () => {
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

  it('le MMSE est fermé des DEUX côtés — la route et l’usage', () => {
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
    expect(listeBibliotheque().filter(e => e.id === 'Q_GEO_04')).toHaveLength(0);
    expect(PASSATION_PRATICIEN.map(p => p.id)).not.toContain('Q_GEO_04');
    expect(IDS_SUSPENDUS.has('Q_GEO_04')).toBe(true);
    expect(IDS_ASSIGNABLES.has('Q_GEO_04')).toBe(false);
    // Et il reste scorable : les passations déjà enregistrées restent lisibles.
    expect(calculateScore('Q_GEO_04', {})).not.toHaveProperty('error');
  });

  it('la cancérologie est suspendue en entier, et c’est assumé', () => {
    // Anti-surprise : `Q_CAN_01` et `Q_CAN_02` sont les SEULS instruments de
    // cancérologie. Les fermer ferme le domaine — le dire ici évite de le
    // redécouvrir en production, et fait rougir le jour où un troisième arrive
    // sans que la question de sa licence ait été posée.
    const cancero = QUESTIONNAIRES_CATALOG.filter(q => q.categorie === 'Cancérologie');
    expect(cancero.map(q => q.id)).toEqual(['Q_CAN_01', 'Q_CAN_02']);
    expect(cancero.every(q => !q.actif)).toBe(true);
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
  //
  // La liste s'est VIDÉE de deux entrées le 2026-07-30. `Q_TAB_04` et `Q_PNE_01`
  // sont rouverts parce que leur condition de réouverture est remplie : leurs
  // sources sont au dossier et ne portent que la mention de droits SIIN, sans
  // attribution tierce — l'absence d'auteur nommé décrivait un questionnaire du
  // référentiel interne. `Q_FIB_03` reste fermé : son cas relève d'une
  // reconstruction, pas d'une identification.
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
    // est le SEUL instrument de pneumologie du catalogue. Le fermer ferme le
    // domaine ; le rouvrir le rouvre en entier. Ce test dit la FRAGILITÉ, pas
    // l'état : un domaine à un seul instrument bascule tout entier au moindre
    // geste, et c'est ce qu'il faut voir dans le diff.
    const pneumo = QUESTIONNAIRES_CATALOG.filter(q => q.categorie === 'Pneumologie');
    expect(pneumo.map(q => q.id)).toEqual(['Q_PNE_01']);
    expect(pneumo.every(q => q.actif)).toBe(true);
  });

  it('la tabacologie sert ses cinq instruments', () => {
    // Contrepartie : `Q_TAB_04` est parti, puis revenu le 2026-07-30, sans que son
    // domaine bascule jamais. Sans ce test, ce cas et celui d'un domaine entier se
    // liraient de la même façon dans le diff.
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
