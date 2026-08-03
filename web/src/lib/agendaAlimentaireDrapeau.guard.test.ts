import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * LA CONTREPARTIE DE `WN_AGENDA_ALI`, et sa seule raison d'exister.
 *
 * `Q_ALI_09` est fermé par un drapeau qui pilote son champ `actif`
 * (`questionnaires-catalog.ts`). Ce choix ferme les deux surfaces d'un geste —
 * route d'assignation via `IDS_SUSPENDUS`, bibliothèque via `IDS_ASSIGNABLES` —
 * mais il crée un angle mort qu'il faut nommer :
 *
 *   `extraireIdsSuspendus` (scripts/lib/verifier_registre_instruments.js) parse
 *   le TEXTE SOURCE du catalogue à la recherche du littéral `actif: false`. Un
 *   appel de fonction lui est INVISIBLE. `Q_ALI_09` n'entre donc dans
 *   `idsSuspendus` dans AUCUNE des deux positions du drapeau, et la règle
 *   « retiré de la production ⟹ statutCertification terminal » ne s'y applique
 *   jamais. Le CI reste vert et ne dit rien — ce n'est pas un échec, c'est un
 *   silence, la classe de défaut exacte que ce dépôt traque.
 *
 * Ce fichier épingle donc ce que l'extracteur statique ne voit plus, DANS LES
 * DEUX POSITIONS. Un `actif: true` posé en dur, une inversion du test du
 * drapeau, ou un renommage de la variable d'environnement doivent rougir ici.
 *
 * `QUESTIONNAIRES_CATALOG` est un `const` de module évalué à l'import : le
 * drapeau ne peut donc pas être changé après coup. D'où `vi.stubEnv` +
 * `vi.resetModules()` + `await import()` à chaque position.
 */

const ID = 'Q_ALI_09';

async function chargerCatalogue(valeurDrapeau: string | undefined) {
  vi.resetModules();
  // `stubEnv(nom, undefined)` fait un `delete` : c'est la variable ABSENTE, et
  // c'est l'état réel de Vercel aujourd'hui. Une première version posait la
  // chaîne vide — une variable présente mais vide, qui n'est pas la même chose.
  // Le trou était concret : une implémentation `value === undefined ? true :
  // value === 'true'` (patron « ouvert sauf mention contraire ») serait restée
  // VERTE sur `''` et aurait ouvert l'instrument en production, là où la
  // variable n'existe pas. Un garde écrit contre le silence était silencieux
  // exactement là où il fallait qu'il parle.
  vi.stubEnv('WN_AGENDA_ALI', valeurDrapeau as string);
  const catalogue = await import('./questionnaires-catalog');
  const bibliotheque = await import('./bibliotheque');
  return {
    entree: catalogue.QUESTIONNAIRES_CATALOG.find(q => q.id === ID),
    idsSuspendus: catalogue.IDS_SUSPENDUS,
    idsAssignables: bibliotheque.IDS_ASSIGNABLES,
    liste: bibliotheque.listeBibliotheque(),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('drapeau WN_AGENDA_ALI — agenda alimentaire Q_ALI_09', () => {
  it('éteint : l’instrument est fermé sur les DEUX surfaces', async () => {
    const { entree, idsSuspendus, idsAssignables, liste } = await chargerCatalogue(undefined);
    expect(entree, 'Q_ALI_09 doit rester au catalogue, drapeau éteint').toBeDefined();
    expect(entree?.actif, 'drapeau éteint : actif doit être false').toBe(false);
    // Surface 1 — la route d'assignation. C'est celle qu'un retrait de l'écran
    // seul laisse ouverte : « invisible et assignable » est la pire des
    // combinaisons (cf. le commentaire de Q_GEO_04 dans le catalogue).
    expect(idsSuspendus.has(ID), 'drapeau éteint : doit être dans IDS_SUSPENDUS').toBe(true);
    // Surface 2 — la bibliothèque praticien.
    expect(idsAssignables.has(ID), 'drapeau éteint : ne doit pas être assignable').toBe(false);
    expect(liste.some(e => e.id === ID), 'drapeau éteint : ne doit pas paraître en bibliothèque').toBe(false);
  });

  it('allumé : l’instrument est ouvert sur les DEUX surfaces', async () => {
    const { entree, idsSuspendus, idsAssignables, liste } = await chargerCatalogue('true');
    expect(entree?.actif, 'drapeau allumé : actif doit être true').toBe(true);
    expect(idsSuspendus.has(ID), 'drapeau allumé : ne doit plus être suspendu').toBe(false);
    expect(idsAssignables.has(ID), 'drapeau allumé : doit être assignable').toBe(true);
    expect(liste.some(e => e.id === ID), 'drapeau allumé : doit paraître en bibliothèque').toBe(true);
  });

  it('fail-closed : seule la chaîne exacte « true » ouvre', async () => {
    // Une variable posée à « 1 », « TRUE » ou « yes » dans un panneau
    // d'environnement ne doit jamais ouvrir un chemin vers un patient par
    // accident. Même doctrine que WN_AGENDA_RELANCE / WN_C4_ENABLED.
    //
    // La chaîne VIDE est dans la liste, et distincte du cas « absente » testé
    // plus haut : une variable créée puis effacée au panneau Vercel laisse une
    // valeur vide, pas une variable supprimée. Les deux doivent fermer.
    for (const valeur of ['', '1', 'TRUE', 'True', 'yes', 'oui', ' true', 'true ']) {
      const { entree } = await chargerCatalogue(valeur);
      expect(entree?.actif, `« ${valeur} » ne doit pas ouvrir l’instrument`).toBe(false);
    }
  });

  it('dans les DEUX positions : présent au catalogue et au registre', async () => {
    // Ce que l'extracteur statique ne contrôle plus. L'appartenance au catalogue
    // et au registre doit être INVARIANTE : c'est elle qui garantit que
    // `verifier_registre_instruments` continue de tenir l'entrée par tous ses
    // autres contrôles (droits, contenu, échelle de certification).
    const registre = await import('../../../docs/claude/corpus/instrument_registry.json');
    const entreeRegistre = (registre.default ?? registre).instruments
      .find((e: { questionnaireId: string }) => e.questionnaireId === ID);
    expect(entreeRegistre, 'Q_ALI_09 doit avoir une entrée de registre').toBeDefined();
    // `sourceMonEquilibre: false` n'est pas un détail : l'agenda n'alimente PAS
    // le besoin 3, déjà sourcé par le sous-score RYTHME_CHRONO de Q_ALI_01.
    // Le brancher ferait deux mesures d'un même thème. Le garde de registre
    // contrôle ce champ contre `BESOIN_SOURCES` dans les deux sens ; on épingle
    // ici l'intention, pour qu'un branchement futur soit un geste explicite.
    expect(entreeRegistre?.sourceMonEquilibre, 'l’agenda ne doit pas être source de Mon Équilibre').toBe(false);

    for (const valeur of [undefined, 'true']) {
      const { entree } = await chargerCatalogue(valeur);
      expect(entree, `drapeau ${valeur ?? 'éteint'} : l’entrée doit rester au catalogue`).toBeDefined();
    }
  });
});
