import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import {
  ORIENTATION_METADATA,
  ORIENTATION_RULES_SHA256,
  ORIENTATION_RULES_V1,
  type OrientationRule,
} from './orientationRulesV1';
import { idBaseDepuisPackId, type PackId } from '@/lib/questionnaires-functional';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import { extraireDrapeauxAnamnese, type DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { IDS_ASSIGNABLES, estAdministrableParLaRoute } from '@/lib/bibliotheque';
import { MOTIFS_PASSATION_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import { calculateScore } from '@/lib/questions';

// Épinglage du verrou sombre (patron questions.pss10.test.ts) : si ce test
// casse, la table de règles ou son statut de validation a changé — cela
// n'arrive légitimement qu'au lot 9 (table compilée signée par le praticien),
// avec arbitrage explicite et fragment changelog.
describe('orientationRulesV1 — verrou v1', () => {
  // LOT-05 (2026-08-03) : la table est REMPLIE, et volontairement PAS signée.
  // SIGNÉE le 2026-08-04, sur demande explicite du praticien après relecture des
  // vingt règles. Écrire les règles et les signer restent deux gestes distincts ;
  // ce banc a changé de sens, pas de rôle — il épingle l'état de signature, quel
  // qu'il soit, pour qu'un basculement ne puisse pas passer inaperçu.
  it('la table v1 est remplie et SIGNÉE, aux trois marqueurs', () => {
    expect(ORIENTATION_RULES_V1.length).toBeGreaterThan(0);
    // Trois marqueurs, pas un : la route exige les trois pour s'ouvrir.
    expect(ORIENTATION_METADATA.validationExterne).toBe(true);
    // RE-SIGNÉE le 2026-08-06 (LOT-02) : les six suggestions à `packId` sont
    // devenues des suggestions à `questionnaireId`, et les 23 claims ont été
    // relus en base ce jour-là — 23/23 VALIDE, prescriptif, actif, v1.0.
    expect(ORIENTATION_METADATA.dateValidation).toBe('2026-08-06');
    expect(ORIENTATION_METADATA.claimsSource.length).toBeGreaterThan(0);
    expect(ORIENTATION_METADATA.version).toBe('orientation-nnpp2-v1');
  });

  // CE QUE LA SIGNATURE COUVRE, ET CE QU'ELLE NE PEUT PAS COUVRIR.
  //
  // Une signature porte sur un PÉRIMÈTRE relu à une date. Sans ce banc, ajouter
  // une règle citant un claim jamais relu laissait la table « signée » — la
  // signature couvrait alors un périmètre qui n'existait plus. Le défaut est
  // silencieux par construction : rien dans le code ne relie `claimsSource` aux
  // claims réellement cités.
  //
  // Ce banc pose l'égalité EXACTE, dans les deux sens. Un claim cité par une
  // règle et absent de `claimsSource` = une règle hors périmètre signé. Un claim
  // dans `claimsSource` que plus aucune règle ne cite = un périmètre qui a
  // dérivé de la table. Les deux rougissent, et la sortie de secours est la
  // même : re-lire les claims en base, puis re-signer avec une nouvelle date.
  it('claimsSource est EXACTEMENT l’ensemble des claims cités par la table', () => {
    const cites = [...new Set(
      ORIENTATION_RULES_V1.flatMap(regle => regle.justificationClaims.map(c => c.claimId)),
    )].sort();
    const signes = [...new Set(ORIENTATION_METADATA.claimsSource.map(c => c.claimId))].sort();
    expect(signes).toEqual(cites);
    // La version fait partie de l'identité d'un claim : `v1.0` relu ne garantit
    // rien sur `v2.0`. Un claim signé en `v1.0` mais cité en `v2.0` par une règle
    // serait un périmètre faussement couvert, que la comparaison des seuls
    // identifiants laisserait passer.
    for (const claim of ORIENTATION_METADATA.claimsSource) {
      expect(claim.versionClaim).toBe('v1.0');
      expect(claim.claimId).toMatch(/^WN-CL-\d{4}-\d{3}$/);
    }
    for (const regle of ORIENTATION_RULES_V1) {
      for (const claim of regle.justificationClaims) {
        expect(claim.versionClaim).toBe('v1.0');
      }
    }
  });

  it('chaque règle est identifiée de façon unique et porte au moins un claim', () => {
    const ids = ORIENTATION_RULES_V1.map(regle => regle.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const regle of ORIENTATION_RULES_V1) {
      expect(regle.declencheurs.length).toBeGreaterThan(0);
      expect(regle.suggestions.length).toBeGreaterThan(0);
      // Invariant de traçabilité : le moteur ignore en silence une règle sans
      // claim. Ce banc transforme ce silence en échec de CI.
      expect(regle.justificationClaims.length).toBeGreaterThan(0);
    }
  });

  it('chaque claim cité respecte le format du registre', () => {
    for (const regle of ORIENTATION_RULES_V1) {
      for (const claim of regle.justificationClaims) {
        expect(claim.claimId).toMatch(/^WN-CL-\d{4}-\d{3}$/);
        expect(claim.versionClaim).not.toBe('');
      }
    }
  });

  // CE TEST NE POUVAIT PAS ROUGIR, et c'est le seul qui aurait pu attraper une
  // règle modifiée après signature.
  //
  // `ORIENTATION_RULES_SHA256` est DÉFINI comme `sha256(JSON.stringify(
  // ORIENTATION_RULES_V1))`. Le comparer à la même expression est une
  // tautologie : les deux membres bougent ensemble à chaque édition de la table.
  // Défaut pré-existant, sans conséquence tant que la table n'était pas signée —
  // et matériel depuis qu'elle l'est.
  //
  // CE QUE LE LITTÉRAL AJOUTE. `D-018` dit qu'une signature porte sur un
  // périmètre RELU, et le périmètre relu ce sont les RÈGLES, pas la seule liste
  // des claims. Le banc d'égalité plus haut reste vert sur trois mutations que la
  // revue a nommées : élargir la zone de `R-SOM-01` à `success`, changer le
  // `packId` d'une règle, ou ajouter une règle ne citant que des claims DÉJÀ
  // signés. Le littéral ci-dessous rougit sur les trois.
  //
  // La sortie de secours n'est pas de mettre le sha à jour en silence : c'est de
  // RE-SIGNER — relire les claims en base, poser une nouvelle `dateValidation`,
  // puis seulement épingler le nouveau sha. C'est ce que `D-018` décrit.
  //
  // RE-SIGNÉE LE 2026-08-06 (LOT-02), et la procédure a été suivie dans cet
  // ordre : les six suggestions à `packId` re-ciblées et leurs objectifs
  // réécrits, les bancs comportementaux re-ciblés, les 23 claims RELUS EN BASE
  // (`execute_sql` sur `rag_corpus_claims` — 23/23 en `statut = 'VALIDE'`,
  // `prescriptif = true`, `active = true`, `version_claim = 'v1.0'`),
  // `dateValidation` portée au 2026-08-06, et le sha épinglé EN DERNIER.
  //
  // SIGNATURE REPRISE LE MÊME JOUR, APRÈS UNE REVUE ADVERSARIALE EN NO-GO, et
  // c'est le geste que `D-018` décrit : la table a changé, donc la signature se
  // refait — on ne rattrape pas un sha. Trois arbitrages cliniques du praticien
  // l'ont motivée :
  //   · `R2-SOM-05` ramenée à `Q_SOM_01` + `Q_SOM_05` — Epworth et Berlin
  //     retirés, le second parce qu'il contournait la porte de `R2-SOM-04` ;
  //   · `WN-CL-0243-005` déplacé de `R2-STR-02` (où il ne fondait aucune cible)
  //     vers `R-STR-02`, qui propose Karasek, l'instrument qu'il nomme ;
  //   · deux objectifs de `Q_INF_01` renommaient l'instrument.
  // La DATE ne bouge pas — même journée, même relecture de claims, et le jeu
  // des 23 identifiants est resté identique (vérifié par le banc d'égalité
  // `claimsSource` ↔ union des `justificationClaims`, plus haut).
  //
  // Ancien sha signé (2026-08-04) :
  // `528004de579724f17da99d796025cdef430f4dcd498895315740ec93b750c603`.
  const SHA_SIGNE_2026_08_06 = '547119c6868eb59ffbb153b395bf424804c81a91b9f8d970765e27474ce7397d';

  it('le sha publié correspond au contenu de la table', () => {
    expect(ORIENTATION_RULES_SHA256).toBe(sha256(JSON.stringify(ORIENTATION_RULES_V1)));
  });

  it('le contenu de la table est EXACTEMENT celui qui a été signé', () => {
    expect(ORIENTATION_RULES_V1.length).toBe(20);
    expect(ORIENTATION_RULES_SHA256).toBe(SHA_SIGNE_2026_08_06);
  });

  // ── DEUX BANCS DE RÉSOLUBILITÉ, ET LE SECOND EST LE SEUL QUI ATTRAPE LE NO-OP
  //
  // Ils remplacent, depuis le 2026-08-06, le banc « chaque pack cité existe
  // réellement en base » — vacant depuis toujours, et définitivement sans objet
  // depuis qu'aucune règle ne cible plus un pack. Un banc qui ne peut plus
  // rougir n'est pas une garantie, c'est une ligne verte.
  //
  // (a) RÉSOLUBILITÉ. Une règle publiée dont AUCUNE suggestion ne se résout —
  // questionnaire non assignable, pack sans correspondance en base — ne
  // recommande rien, en silence : le moteur écarte la cible sans rien dire. Ce
  // banc transforme ce silence en échec de CI.
  //
  // LE PRÉDICAT EST CELUI DE LA ROUTE D'ÉCRITURE, ET PAS UN AUTRE — corrigé le
  // 2026-08-06 à la revue adversariale. Ce banc utilisait
  // `estAdministrableParLaRoute` (définition présente ET non suspendu), qui
  // n'est PAS ce que consomme le geste praticien : `POST /file-envoi` filtre sur
  // `idsAssignablesPour()`, dont la part catalogue est `IDS_ASSIGNABLES` —
  // laquelle exige EN PLUS `actif === true` (`bibliotheque.ts`). Un instrument
  // dépublié (`actif: false`) sans être suspendu passait donc le banc et
  // échouait au clic.
  //
  // Les deux prédicats coïncident sur les données d'AUJOURD'HUI — aucun
  // instrument du catalogue n'est à la fois défini, non suspendu et inactif —,
  // et c'est exactement pour cela que l'erreur ne se voyait pas. Le banc de
  // mutation qui suit démonte cette coïncidence.
  const cibleResoluble = (
    suggestion: OrientationRule['suggestions'][number],
    assignables: ReadonlySet<string>,
  ): boolean => {
    if (suggestion.questionnaireId) return assignables.has(suggestion.questionnaireId);
    if (suggestion.packId) return idBaseDepuisPackId(suggestion.packId) !== null;
    return false;
  };

  it('BANC (a) — aucune règle publiée sans cible résoluble', () => {
    const muettes = ORIENTATION_RULES_V1
      .filter(regle => regle.statut === 'publiee')
      .filter(regle => !regle.suggestions.some(s => cibleResoluble(s, IDS_ASSIGNABLES)))
      .map(regle => regle.id);
    expect(muettes).toEqual([]);
  });

  // MUTATION DU BANC (a) — la preuve que le prédicat corrigé attrape bien la
  // classe que l'ancien laissait passer.
  //
  // On dépublie un instrument RÉELLEMENT CIBLÉ par une règle (`actif: false`,
  // sans le suspendre), on recalcule `IDS_ASSIGNABLES` à partir du catalogue
  // muté, et l'on vérifie les deux moitiés de l'énoncé : le prédicat de la
  // route l'écarte (donc la règle qui n'a que lui devient muette et le banc
  // rougirait), tandis que `estAdministrableParLaRoute` — l'ancien prédicat —
  // l'accepte encore. Sans cette seconde assertion, le test passerait aussi
  // avec le mauvais prédicat.
  it('BANC (a) — un instrument dépublié (actif: false, non suspendu) fait rougir le banc', async () => {
    vi.resetModules();
    const { QUESTIONNAIRES_CATALOG } = await import('@/lib/questionnaires-catalog');
    // `Q_SOM_05` est la cible propre de `R2-SOM-03` et de `R2-SOM-05`.
    const cible = 'Q_SOM_05';
    const mute = QUESTIONNAIRES_CATALOG.map(q => (q.id === cible ? { ...q, actif: false } : q));
    expect(mute.find(q => q.id === cible)?.actif, 'la mutation doit porter').toBe(false);
    vi.doMock('@/lib/questionnaires-catalog', async importer => ({
      ...(await importer<typeof import('@/lib/questionnaires-catalog')>()),
      QUESTIONNAIRES_CATALOG: mute,
    }));
    const biblio = await import('@/lib/bibliotheque');

    // Le prédicat de la ROUTE écarte l'instrument dépublié…
    expect(biblio.IDS_ASSIGNABLES.has(cible)).toBe(false);
    // …et `R2-SOM-03`, qui n'a que lui, devient muette : le banc rougit.
    const r2som03 = ORIENTATION_RULES_V1.find(r => r.id === 'R2-SOM-03')!;
    expect(r2som03.suggestions.some(s => cibleResoluble(s, biblio.IDS_ASSIGNABLES))).toBe(false);

    // L'ANCIEN prédicat, lui, l'accepte encore — c'est la coïncidence que la
    // mutation démonte, et la raison pour laquelle ce banc existe.
    expect(biblio.estAdministrableParLaRoute(cible)).toBe(true);

    vi.doUnmock('@/lib/questionnaires-catalog');
    vi.resetModules();
  });

  // (b) NON-REDONDANCE — et c'est LUI qui ferme la classe de défaut nommée au
  // cadrage du 2026-08-06. Une règle peut être parfaitement résoluble ET
  // définitivement muette : il suffit qu'une règle sœur au déclencheur PLUS
  // LARGE vise déjà toutes ses cibles. Le moteur déduplique alors
  // (`orientationEngine.ts`, `parCible`), la règle n'ajoute jamais rien, et le
  // banc (a) reste vert. C'est le risque exact des suggestions
  // mono-questionnaire écartées au cadrage : trois des six règles re-ciblées
  // seraient nées mortes.
  //
  // Le banc construit, POUR CHAQUE RÈGLE, un jeu d'entrées dérivé de ses PROPRES
  // déclencheurs — jamais écrit à la main, sinon il dériverait de la table à la
  // première modification de seuil —, puis compare la sortie du moteur AVEC et
  // SANS la règle. Si l'ensemble des cibles est identique, la règle n'apporte
  // rien même dans le scénario qui lui est le plus favorable : elle est
  // redondante.
  //
  // Ce que le banc n'affirme PAS : que le scénario dérivé soit clinique. Il ne
  // sert qu'à faire s'allumer la règle ; les seuils et les bandes sont épinglés
  // par les cas nommés plus bas.
  const CHAMPS_LISTE = new Set([
    'signauxAlerte', 'antecedentsDomaines', 'facteursDeclenchants', 'attentes', 'automedication',
  ]);

  function valeurQuiSatisfait(operateur: '>=' | '<=' | '>' | '<' | '==', reference: number): number {
    switch (operateur) {
      case '>': return reference + 1;
      case '<': return reference - 1;
      default: return reference;
    }
  }

  /** Un jeu d'entrées dérivé des déclencheurs d'une règle — de quoi l'allumer. */
  function scenarioPour(regle: (typeof ORIENTATION_RULES_V1)[number]) {
    const drapeaux: DrapeauxAnamnese = {
      signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
      attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
    };
    // Un `scores` par questionnaire visé : une règle peut porter plusieurs
    // déclencheurs sur le même instrument, à des étages différents.
    const scores = new Map<string, { subScores: Record<string, unknown>[]; global: Record<string, unknown> }>();
    const porteurPour = (id: string) => {
      const connu = scores.get(id);
      if (connu) return connu;
      const neuf = { subScores: [] as Record<string, unknown>[], global: {} as Record<string, unknown> };
      scores.set(id, neuf);
      return neuf;
    };

    for (const declencheur of regle.declencheurs) {
      if (declencheur.type === 'drapeau') {
        const valeur = declencheur.valeurs[0];
        if (CHAMPS_LISTE.has(declencheur.champ)) {
          (drapeaux[declencheur.champ] as string[]) = [valeur];
        } else {
          (drapeaux as Record<string, unknown>)[declencheur.champ] = valeur;
        }
        continue;
      }
      const porteur = porteurPour(declencheur.idQuestionnaire);
      // Ce que le déclencheur exige de la mesure, traduit en score servi. Aucun
      // compte d'items n'est publié : la garde de complétude ne lit alors rien
      // et laisse passer — c'est bien un recueil complet qu'on décrit ici.
      const contenu: Record<string, unknown> = {};
      if (declencheur.type === 'comparaison') {
        contenu.total = valeurQuiSatisfait(declencheur.operateur, declencheur.valeur);
      } else if (declencheur.zone.type === 'plage') {
        contenu.total = declencheur.zone.min;
      } else if (declencheur.zone.type === 'interpretation') {
        contenu.total = 0;
        contenu.interpretation = { label: declencheur.zone.labels[0] };
      } else {
        contenu.total = 0;
        contenu.interpretation = { color: declencheur.zone.couleurs[0] };
      }
      if (declencheur.sousScore) {
        porteur.subScores.push({ id: declencheur.sousScore, label: declencheur.sousScore, ...contenu });
      } else {
        Object.assign(porteur.global, contenu);
      }
    }

    const reponses: ReponseOrientation[] = [...scores.entries()].map(([idQuestionnaire, porteur]) => ({
      idQuestionnaire,
      dateReponse: '2026-08-06T10:00:00.000Z',
      scores: porteur.subScores.length > 0
        ? { ...porteur.global, subScores: porteur.subScores }
        : porteur.global,
    }));
    return { reponses, drapeaux };
  }

  it('BANC (b) — aucune règle publiée redondante', () => {
    const publiees = ORIENTATION_RULES_V1.filter(regle => regle.statut === 'publiee');
    // Le banc ne prouverait rien sur une table vide de règles publiées.
    expect(publiees.length).toBeGreaterThan(0);

    const cles = (recos: ReturnType<typeof evaluerOrientation>) => new Set(recos.map(r =>
      r.cible.type === 'questionnaire' ? `q:${r.cible.questionnaireId}` : `p:${r.cible.packId}`));

    const inutiles: string[] = [];
    for (const regle of publiees) {
      const { reponses, drapeaux } = scenarioPour(regle);
      const avec = cles(evaluerOrientation({
        reponses, drapeaux, idsQuestionnairesAssignes: [], regles: ORIENTATION_RULES_V1,
      }));
      const sans = cles(evaluerOrientation({
        reponses, drapeaux, idsQuestionnairesAssignes: [],
        regles: ORIENTATION_RULES_V1.filter(autre => autre.id !== regle.id),
      }));
      // Contre-épreuve : un scénario qui n'allume même pas sa propre règle ne
      // dirait rien de sa redondance. Une règle absente de sa propre sortie est
      // aussi grave qu'une règle redondante, et se signale ici.
      const propres = [...avec].filter(cle => !sans.has(cle));
      if (propres.length === 0) inutiles.push(regle.id);
    }
    expect(inutiles).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gardes anti-dérive (LOT-05). Chacune ferme un silence : une règle mal câblée
// ne casse rien, elle cesse simplement de se déclencher — et personne ne le voit.
describe('orientationRulesV1 — gardes anti-dérive', () => {
  const declencheurs = ORIENTATION_RULES_V1.flatMap(regle =>
    regle.declencheurs.map(declencheur => ({ regleId: regle.id, declencheur })),
  );

  function optionsDuChamp(champId: string): readonly string[] {
    for (const section of ANAMNESE_SECTIONS) {
      const champ = section.champs?.find(c => c.id === champId);
      if (champ?.options) return champ.options;
    }
    return [];
  }

  // Les clés typées de `DrapeauxAnamnese` ne portent pas le nom du champ
  // d'anamnèse : la correspondance est faite par `extraireDrapeauxAnamnese`.
  // Recopiée ici, elle dériverait en silence — d'où le banc qui suit, qui la
  // confronte à l'extraction réelle plutôt que de la croire sur parole.
  const CHAMP_ANAMNESE: Record<string, string> = {
    signauxAlerte: 'signaux_alerte',
    antecedentsDomaines: 'antecedents_domaines',
    facteursDeclenchants: 'facteurs_declenchants',
    attentes: 'attentes',
    automedication: 'automedication',
    debut: 'debut',
    evolution: 'evolution',
    variationPoids: 'variation_poids',
  };

  // La correspondance clé typée ↔ champ d'anamnèse, vérifiée contre
  // l'extraction RÉELLE et non recopiée : on injecte la première option du
  // champ et on exige de la retrouver sous la clé attendue. Si
  // `extraireDrapeauxAnamnese` change de mapping, la garde du dessous
  // chercherait dans le mauvais champ et resterait verte — celle-ci rougit.
  it('CHAMP_ANAMNESE décrit bien ce que extraireDrapeauxAnamnese fait', () => {
    const drapeauxVides = extraireDrapeauxAnamnese({});
    // Aucune clé oubliée : un neuvième drapeau forcerait la mise à jour.
    expect(Object.keys(CHAMP_ANAMNESE).sort()).toEqual(Object.keys(drapeauxVides).sort());
    for (const [cle, champId] of Object.entries(CHAMP_ANAMNESE)) {
      const options = optionsDuChamp(champId);
      expect(options.length, `aucune option pour ${champId}`).toBeGreaterThan(0);
      // Un champ liste se stocke en tableau, un champ radio en valeur seule :
      // injecter la mauvaise forme ferait échouer la garde sur sa propre
      // fixture au lieu du mapping. La forme se lit sur l'extraction vide.
      const estListe = Array.isArray(drapeauxVides[cle as keyof DrapeauxAnamnese]);
      const extrait = extraireDrapeauxAnamnese({ [champId]: estListe ? [options[0]] : options[0] });
      const valeur = extrait[cle as keyof typeof extrait];
      const obtenues = Array.isArray(valeur) ? valeur : valeur === null ? [] : [valeur];
      expect(obtenues, `${cle} ne lit pas ${champId}`).toContain(options[0]);
    }
  });

  // LA garde du lot. Un libellé retouché dans `anamnese.ts` — une apostrophe,
  // un accent — ferait taire la règle sans rien casser. Ici, elle casse le CI.
  it("chaque valeur de drapeau existe verbatim dans ANAMNESE_SECTIONS", () => {
    const inconnues: string[] = [];
    for (const { regleId, declencheur } of declencheurs) {
      if (declencheur.type !== 'drapeau') continue;
      const champId = CHAMP_ANAMNESE[declencheur.champ];
      expect(champId, `champ non mappé : ${declencheur.champ}`).toBeDefined();
      const options = optionsDuChamp(champId);
      expect(options.length, `aucune option lue pour ${champId}`).toBeGreaterThan(0);
      for (const valeur of declencheur.valeurs) {
        if (!options.includes(valeur)) inconnues.push(`${regleId} → ${champId} : « ${valeur} »`);
      }
    }
    expect(inconnues).toEqual([]);
  });

  // Arbitrage praticien du 2026-08-03 : un signal d'alerte appelle un
  // adressage, pas une exploration — et cette table ne sait produire qu'une
  // cible. Y répondre par un questionnaire ferait passer le signal pour une
  // chose que l'outil traite. La surface qui les affichera sans les traiter
  // reste à écrire (lot dédié) ; d'ici là, ce banc empêche qu'une règle
  // s'engouffre dans le trou.
  it("aucune règle ne s'appuie sur signauxAlerte", () => {
    const fautives = declencheurs
      .filter(({ declencheur }) => declencheur.type === 'drapeau' && declencheur.champ === 'signauxAlerte')
      .map(({ regleId }) => regleId);
    expect(fautives).toEqual([]);
  });

  // ARBITRAGE DU 2026-08-06 (LOT-02, D-030), épinglé ici pour qu'il ne se
  // défasse pas par inadvertance. Le geste praticien de l'orientation est
  // devenu « ajouter à la file d'envoi », instrument par instrument : le
  // panneau ne sait plus assigner un pack, et le garde de restitution de la
  // synthèse interdit toute mention de pack tant que l'allowlist est vide.
  // Réintroduire une suggestion à `packId` produirait donc une ligne sans geste
  // possible — c'est une décision produit, pas une correction de code, et ce
  // banc l'oblige à passer par une modification explicite.
  it('aucune règle publiée ne cible un pack', () => {
    const avecPack = ORIENTATION_RULES_V1
      .filter(regle => regle.statut === 'publiee')
      .filter(regle => regle.suggestions.some(suggestion => Boolean(suggestion.packId)))
      .map(regle => regle.id);
    expect(avecPack).toEqual([]);
  });

  // LOT-03 — CE BANC REMPLACE UNE JOURNALISATION QUI SERAIT INATTEIGNABLE.
  //
  // Le lot demandait de tracer la perte de cible d'orientation au moment où
  // elle se produirait. Ce code serait MORT-NÉ : depuis le LOT-02, plus une
  // seule entrée de la table ne porte de `packId` (le fichier source l'écrit
  // lui-même), et `packId` ne survit que dans l'union de type. Un log serait
  // donc vert en test et MUET À VIE en production — il ne dirait jamais rien,
  // et son silence ne prouverait rien.
  //
  // Un banc, lui, empêche la réintroduction au lieu de la constater après coup.
  //
  // CE QU'IL AJOUTE au banc « aucune règle PUBLIÉE ne cible un pack » juste
  // au-dessus : celui-ci ne filtre RIEN. Une règle `brouillon` ou `suspendue`
  // portant un `packId` est invisible du banc publié, et le jour où on la
  // publierait la cible pack reviendrait en production sans qu'aucune ligne de
  // ce fichier ne bouge — c'est-à-dire silencieusement, ce qui est exactement
  // ce qu'on cherche à éviter. La table ne contient que des règles publiées
  // aujourd'hui ; c'est un état, pas une garantie.
  it('aucune ENTRÉE de la table, quel que soit son statut, ne cible un pack', () => {
    const avecPack = ORIENTATION_RULES_V1
      .flatMap(regle =>
        regle.suggestions
          .filter(suggestion => Boolean(suggestion.packId))
          .map(suggestion => `${regle.id} (${regle.statut}) → ${suggestion.packId}`),
      );
    // Message d'échec : dit POURQUOI le banc existe, à qui le fera rougir.
    expect(
      avecPack,
      'Une suggestion à `packId` a été réintroduite. Le geste praticien de '
      + "l'orientation est « ajouter à la file d'envoi », instrument par "
      + 'instrument : le panneau ne sait plus assigner un pack, et une telle '
      + 'suggestion produirait une ligne sans geste possible. Aucune '
      + 'journalisation ne peut le signaler — elle serait muette à vie, la '
      + "table n'ayant plus aucune cible pack à perdre. C'est une décision "
      + 'produit (D-030) : la rouvrir explicitement, ou retirer le `packId`.',
    ).toEqual([]);
  });

  it('chaque questionnaire cité existe au catalogue et est administrable', () => {
    const cites = new Set<string>();
    for (const { declencheur } of declencheurs) {
      if (declencheur.type !== 'drapeau') cites.add(declencheur.idQuestionnaire);
    }
    for (const regle of ORIENTATION_RULES_V1) {
      for (const suggestion of regle.suggestions) {
        if (suggestion.questionnaireId) cites.add(suggestion.questionnaireId);
      }
    }
    expect(cites.size).toBeGreaterThan(0);
    const introuvables = [...cites].filter(id => !estAdministrableParLaRoute(id));
    expect(introuvables).toEqual([]);
  });

  // L'invariant n'est PAS « citer les trois couleurs » — une règle peut
  // légitimement ne viser que la bande la plus haute. C'est qu'une règle ne
  // doit jamais s'arrêter en dessous du plus sévère : viser `danger` sans
  // `dark`, ou `warning` sans ce qui suit, laisserait dehors des patients PLUS
  // atteints que ceux qu'on retient. C'est le défaut que LOT-05 a corrigé dans
  // le type ; ce banc empêche de le réintroduire règle par règle.
  const GRAVITE = ['info', 'warning', 'danger', 'dark'] as const;

  it('une zone de couleur ne s\'arrête jamais sous la bande la plus sévère', () => {
    const trous: string[] = [];
    for (const { regleId, declencheur } of declencheurs) {
      if (declencheur.type !== 'zone' || declencheur.zone.type !== 'couleur') continue;
      const citees = declencheur.zone.couleurs;
      if (citees.length === 0) { trous.push(`${regleId} → aucune couleur`); continue; }
      // Une couleur hors de l'échelle rendrait -1, et `slice(-1)` ne vérifierait
      // plus que la dernière bande : on la refuse plutôt que de la subir.
      const rangs = citees.map(c => GRAVITE.indexOf(c));
      if (rangs.some(rang => rang < 0)) { trous.push(`${regleId} → couleur hors échelle`); continue; }
      const plusBasse = Math.min(...rangs);
      // Tout ce qui est au-dessus de la plus basse couleur citée doit l'être aussi.
      for (const attendue of GRAVITE.slice(plusBasse)) {
        if (!citees.includes(attendue)) trous.push(`${regleId} → ${attendue} manquante`);
      }
    }
    expect(trous).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Les six règles RÉELLES, évaluées par le moteur réel. Les bancs ci-dessus
// inspectent la table sans jamais l'exécuter, et ceux du moteur l'exécutent sur
// des règles fabriquées : ni les uns ni les autres ne diraient qu'une règle
// livrée ne se déclenche jamais.
describe('orientationRulesV1 — les règles livrées, dans le moteur', () => {
  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  function evaluer(reponses: ReponseOrientation[], drapeaux = anamneseVide) {
    return evaluerOrientation({
      reponses,
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux,
    });
  }

  const reponse = (idQuestionnaire: string, scores: Record<string, unknown>): ReponseOrientation =>
    ({ idQuestionnaire, dateReponse: '2026-08-01T10:00:00.000Z', scores });

  it('R-SOM-01 : un PSQI en zone défavorable propose HAD puis Cungi', () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 14, interpretation: { label: 'Troubles du sommeil modérés', color: 'warning' } }),
    ]);
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    // Cungi, nommé par le claim WN-CL-0323-013 — pas le PSS-10.
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_03' });
  });

  // Arbitrage du 2026-08-03 : bande d'entrée par instrument. Le PSQI démarre à
  // `info` (total 5-10), au-dessus du seuil de 4 qu'il publie. Ce banc échoue si
  // quelqu'un « harmonise » les règles en les faisant toutes partir de warning.
  it("R-SOM-01 : un PSQI en bande `info` déclenche déjà", () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 7, interpretation: { label: 'Troubles du sommeil légers', color: 'info' } }),
    ]);
    expect(recos.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
  });

  it('R-STR-01 : un PSS-10 défavorable propose le BMS-10', () => {
    const recos = evaluer([
      reponse('Q_STR_02', { total: 30, interpretation: { label: 'Niveau élevé de stress', color: 'danger' } }),
    ]);
    expect(recos.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_05' });
  });

  // RE-CIBLÉE le 2026-08-06 : plus de pack stress, trois questionnaires. Le
  // DASS-21 (`Q_STR_04`) est la cible de tête, et elle est PROPRE à cette règle
  // sur ce scénario — `R-STR-01`, qui s'allume aussi, vise `Q_STR_05`.
  it('R-STR-02 : les instruments du stress exigent le drapeau ET la mesure', () => {
    const mesure = reponse('Q_STR_02', { total: 30, interpretation: { label: 'Élevé', color: 'danger' } });
    const cible = { type: 'questionnaire', questionnaireId: 'Q_STR_04' };
    // Mesure seule : rien.
    expect(evaluer([mesure]).map(r => r.cible)).not.toContainEqual(cible);
    // Drapeau seul : rien non plus.
    expect(evaluer([], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] })
      .map(r => r.cible)).not.toContainEqual(cible);
    // Les deux : les trois instruments sortent.
    const cibles = evaluer([mesure], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] })
      .map(r => r.cible);
    expect(cibles).toContainEqual(cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_06' });
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_08' });
    // Aucun pack, plus jamais : c'est le sens du lot.
    expect(cibles.filter(c => c.type === 'pack')).toEqual([]);
  });

  it('R-GAS-01 : un TFD défavorable propose Bristol et l’hyperexcitabilité', () => {
    const recos = evaluer([
      reponse('Q_GAS_01', { total: 55, interpretation: { label: 'C — Prédominance', color: 'danger' } }),
    ]);
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_03' });
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_INF_01' });
    // Le TFD ne se repropose pas : le déclencheur vient de le lire.
    expect(cibles).not.toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_01' });
    expect(cibles.filter(c => c.type === 'pack')).toEqual([]);
  });

  // Héritier direct du banc `R-ANA-01 et R-ANA-02` de V1. `R-ANA-02` est
  // devenue `R2-NEU-02` à l'identique ; `R-ANA-01` est retirée — le PSQI se
  // propose désormais sur une MESURE (`R2-SOM-01`, `R2-SOM-02`) et non plus sur
  // l'attente déclarée seule, si bien que l'attente ne peut plus, à elle seule,
  // produire quoi que ce soit. Ce qui est vérifié ici reste ce qui l'était : la
  // ligne de doctrine « un drapeau déclaré seul ne propose jamais un pack ».
  it('R2-NEU-02 : une déclaration seule propose un instrument, jamais un pack', () => {
    const recos = evaluer([], {
      ...anamneseVide,
      attentes: ['Améliorer le sommeil'],
      antecedentsDomaines: ['Psychiatrique (anxiété, dépression, burn-out)'],
    });
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    expect(cibles.filter(c => c.type === 'pack')).toEqual([]);
    // L'attente « Améliorer le sommeil » ne suffit plus : R-ANA-01 est retirée,
    // et R2-SOM-05 exige en plus une mesure de sommeil non réparateur.
    expect(cibles).not.toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    // R2-NEU-02 est la SEULE règle de la table à déclencheur unique de drapeau.
    const aDeclencheurDrapeauSeul = ORIENTATION_RULES_V1
      .filter(r => r.declencheurs.length === 1 && r.declencheurs[0].type === 'drapeau')
      .map(r => r.id);
    expect(aDeclencheurDrapeauSeul).toEqual(['R2-NEU-02']);
  });

  it('un patient sans réponse ni anamnèse ne reçoit rien', () => {
    expect(evaluer([])).toEqual([]);
  });

  // Une zone favorable ne déclenche jamais d'exploration : c'est la règle que
  // l'union de couleurs encode (`success` en est absente).
  it('une zone favorable ne déclenche aucune règle', () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 2, interpretation: { label: 'Pas de trouble du sommeil', color: 'success' } }),
      reponse('Q_STR_02', { total: 14, interpretation: { label: 'Bonne gestion du stress', color: 'success' } }),
    ]);
    expect(recos).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREMIER TOUR (V2) — les règles qui s'allument sur le pack de base réellement
// administré (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01`) et sur l'anamnèse.
//
// Chaque cas moteur ASSERTE SUR LE `regleId` DU MOTIF, et pas seulement sur la
// cible. Ce n'est pas du zèle : `Q_SOM_01` est proposé par `R2-SOM-01` ET par
// `R2-SOM-02`, `Q_NEU_11` par trois règles. Un banc qui ne regarderait que la
// cible resterait vert alors qu'une des deux règles est morte — c'est exactement
// ce qu'une faute de frappe sur un `sousScore` produit, en silence.
//
// Chaque cas n'alimente donc QUE l'instrument de la règle visée.
describe('orientationRulesV1 — premier tour, dans le moteur', () => {
  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  // Composition RÉELLE des trois packs de doctrine, relue en base le
  // 2026-08-06 — COMPLÉTÉE ce jour-là. La version précédente était partielle
  // (`pack_digestif_intestin_cerveau: ['Q_GAS_01']` pour huit membres réels), ce
  // qui rendait les bancs d'absorption plus faciles à satisfaire qu'ils
  // n'auraient dû : un membre absent de la fixture ne pouvait pas être absorbé,
  // donc pas non plus manquer à l'appel.
  //
  // Elle ne décrit plus AUCUNE règle publiée depuis le re-ciblage du 2026-08-06 :
  // c'est le matériel des règles SYNTHÉTIQUES d'absorption plus bas, et le
  // moteur reste seul à savoir absorber. La capacité est conservée, elle n'est
  // simplement plus exercée par la table.
  const COMPOSITION_PACKS: Partial<Record<PackId, string[]>> = {
    pack_sommeil_chronobiologie: ['Q_SOM_01', 'Q_SOM_02', 'Q_SOM_03', 'Q_SOM_05', 'Q_SOM_04', 'Q_SOM_06', 'Q_INF_03', 'Q_NEU_11'],
    pack_stress_chronique_burnout: ['Q_STR_02', 'Q_STR_04', 'Q_STR_03', 'Q_STR_06', 'Q_STR_05', 'Q_STR_08', 'Q_SOM_01', 'Q_INF_01', 'Q_INF_03'],
    pack_digestif_intestin_cerveau: ['Q_GAS_01', 'Q_GAS_03', 'Q_ALI_01', 'Q_STR_02', 'Q_SOM_01', 'Q_INF_03', 'Q_INF_01', 'Q_MOD_03'],
  };

  function evaluer(
    reponses: ReponseOrientation[],
    drapeaux = anamneseVide,
    compositionPacks?: Partial<Record<PackId, string[]>>,
  ) {
    return evaluerOrientation({
      reponses,
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux,
      compositionPacks,
    });
  }

  // Forme RÉELLE des `scoresJson` d'un moteur à sous-scores : la clé est
  // `subScores`, et `extraireCible` y matche sur `id` (l'`id` prime sur le
  // `label`). Le moteur `plaintes_actuelles` de `Q_MOD_03` émet la même forme,
  // bien qu'il déclare ses axes sous le nom `domains` dans le catalogue.
  //
  // `repondus`/`items` ÉGAUX par défaut : c'est ce que le moteur `subscore`
  // sert sur une passation complète depuis le 2026-08-04, et c'est ce que la
  // garde de complétude d'`extraireCible` lit. Une fixture qui les omettrait
  // décrirait un moteur qui n'existe plus, et laisserait la garde non exercée
  // sur le chemin heureux. `manquants` les désolidarise pour les cas partiels.
  const sousScores = (
    idQuestionnaire: string,
    axes: Array<{ id: string; total: number; interpretation?: { label: string; color: string } | null; manquants?: number }>,
  ): ReponseOrientation => ({
    idQuestionnaire,
    dateReponse: '2026-08-04T10:00:00.000Z',
    scores: {
      subScores: axes.map(axe => ({
        id: axe.id,
        label: axe.id,
        total: axe.total,
        interpretation: axe.interpretation ?? null,
        repondus: 5,
        items: 5 + (axe.manquants ?? 0),
      })),
    },
  });

  /** Avec la composition réelle des packs — sans effet sur la table du
   *  2026-08-06, qui ne cible plus aucun pack : conservé parce que le cas
   *  d'abandon plus bas décrit un patient RÉEL, composition fournie comprise. */
  function evaluerAvecPacks(reponses: ReponseOrientation[], drapeaux = anamneseVide) {
    return evaluer(reponses, drapeaux, COMPOSITION_PACKS);
  }

  /** Les règles qui ont motivé une cible donnée — `[]` si la cible est absente. */
  function reglesPour(recos: ReturnType<typeof evaluer>, cible: { type: string; questionnaireId?: string; packId?: string }) {
    const trouvee = recos.find(r =>
      r.cible.type === cible.type
      && (r.cible as { questionnaireId?: string }).questionnaireId === cible.questionnaireId
      && (r.cible as { packId?: string }).packId === cible.packId);
    return trouvee ? trouvee.motifs.map(m => m.regleId) : [];
  }

  it('SOMMEIL — un contexte de sommeil insuffisant propose le PSQI (R2-SOM-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 14, interpretation: { label: 'Sommeil insuffisant', color: 'warning' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  it('STRESS — une adaptation insuffisante propose le PSS-10 (R2-STR-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'ADAPTATION_STRESS', total: 17, interpretation: { label: 'Adaptation insuffisante', color: 'warning' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('HUMEUR — une plainte de moral intense propose le HAD (R2-NEU-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [
        { id: 'moral', total: 8, interpretation: { label: 'Intensité élevée', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' })).toContain('R2-NEU-01');
  });

  it('DIGESTIF — une plainte digestive intense propose le TFD (R2-GAS-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [
        { id: 'digestion', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_GAS_01' })).toContain('R2-GAS-01');
  });

  it("NON-DÉCLENCHEMENT — un sommeil contextuel satisfaisant (15) ne propose pas le PSQI", () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 15, interpretation: { label: 'Sommeil satisfaisant', color: 'success' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toEqual([]);
  });

  // ── LE CAS DU TROU ────────────────────────────────────────────────────────
  //
  // LE banc de ce lot, et la raison pour laquelle `R2-SOM-01` est écrite en
  // `comparaison` plutôt qu'en `couleur`. La grille `SOMMEIL` de `Q_MOD_01` va
  // 0-8, PUIS 10-14 : la valeur 9 n'appartient à AUCUNE bande, et
  // `interpretRanges` y rend `null` (son unique repli ne joue que par le haut,
  // au-dessus du plafond de grille). Un patient à 9 dort donc plus mal qu'un
  // patient à 10, et n'a aucune couleur à quoi s'accrocher.
  //
  // Un déclencheur `{type:'couleur', couleurs:['warning','danger','dark']}` le
  // laisserait échapper EN SILENCE — et resterait vert au banc de monotonie des
  // couleurs, qui n'a rien à redire à cette union. Ce test-ci est le seul à
  // rougir sur cette mutation ; ne pas le supprimer.
  it('TROU À 9 — un sommeil contextuel à 9 (aucune bande) déclenche bien R2-SOM-01', () => {
    const recos = evaluer([
      // `interpretation: null` est ce que le moteur produit RÉELLEMENT à 9 —
      // la fixture ne triche pas, elle reproduit le trou.
      sousScores('Q_MOD_01', [{ id: 'SOMMEIL', total: 9, interpretation: null }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  // Le défaut que V2 corrige, épinglé à l'envers : sur un patient qui n'a passé
  // que le pack de base, AUCUNE des quatre règles de second tour ne peut parler.
  // L'assertion porte sur les `regleId`, et non sur les cibles : `R2-GAS-01`
  // propose `Q_GAS_01` dès le premier tour, si bien qu'un banc écrit sur les
  // cibles confondrait les deux tours.
  it('SECOND TOUR — aucune règle de mesure V1 ne parle sur le seul pack de base', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
        { id: 'ADAPTATION_STRESS', total: 8, interpretation: { label: 'Adaptation perturbée', color: 'danger' } },
      ]),
      sousScores('Q_MOD_03', [
        { id: 'digestion', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
        { id: 'moral', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
      ]),
      sousScores('Q_INF_03', [
        { id: 'SE', total: 25, interpretation: { label: 'Fortement perturbé', color: 'danger' } },
      ]),
    ], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] });

    // Le premier tour, lui, a bien parlé : le banc ne prouverait rien sur un
    // patient dont personne ne dit rien.
    expect(recos.length).toBeGreaterThan(0);

    const SECOND_TOUR = ['R-SOM-01', 'R-STR-01', 'R-STR-02', 'R-GAS-01'];
    const declenchees = new Set(recos.flatMap(r => r.motifs.map(m => m.regleId)));
    expect(SECOND_TOUR.filter(id => declenchees.has(id))).toEqual([]);
  });

  // ── LE BLOQUANT DE LA REVUE DU 2026-08-04 ─────────────────────────────────
  //
  // Une passation ABANDONNÉE produisait une orientation, et la produisait à
  // l'envers. La fixture n'est pas écrite à la main : elle passe par
  // `calculateScore`, le moteur RÉEL, sur les trois seules réponses du scénario
  // — un item par axe, chacun à sa MEILLEURE option. Tout ce que ce test
  // affirme sur la forme servie est donc vérifié en passant.
  //
  // Sans la garde de complétude : sept recommandations, dont DEUX PACKS,
  // motivées par un « Sommeil non réparateur » chez un patient qui vient de
  // cocher « Excellent sommeil ». Le biais est structurel — un total partiel
  // manque de ce qui n'a pas été répondu, et les sept déclencheurs de
  // `Q_MOD_01` comparent en `<=` sur une échelle inversée.
  it('ABANDON — trois items de Q_MOD_01 à leur MEILLEURE valeur ne recommandent RIEN', () => {
    const scores = calculateScore('Q_MOD_01', {
      SOMMEIL_Q001: 4,             // « Excellent sommeil »
      RYTHME_BIOLOGIQUE_Q001: 4,   // « Oui toujours »
      ADAPTATION_STRESS_Q001: 8,   // « Je gère très bien, toujours »
    });

    // Ce que le moteur sert vraiment : des totaux BAS (4, 4, 8) sur des axes de
    // 5 items dont un seul est répondu. Le test perdrait tout son sens si la
    // fixture n'était pas dans cet état — on le vérifie plutôt que de le
    // supposer.
    const axes = (scores as { subScores: Array<{ id: string; total: number | null; repondus: number; items: number }> }).subScores;
    const sommeil = axes.find(a => a.id === 'SOMMEIL');
    expect(sommeil?.total).toBe(4);
    expect(sommeil?.repondus).toBe(1);
    expect(sommeil?.items).toBe(5);

    const recos = evaluerAvecPacks(
      [{ idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-08-04T10:00:00.000Z', scores: scores as Record<string, unknown> }],
      {
        ...anamneseVide,
        antecedentsDomaines: ['Respiratoire / apnée du sommeil'],
        facteursDeclenchants: ['Stress aigu / burn-out'],
        attentes: ['Améliorer le sommeil'],
      },
    );
    expect(recos).toEqual([]);
  });

  // Le pendant du test ci-dessus : la garde ne doit pas non plus tout éteindre.
  // Mêmes trois axes, complets cette fois et RÉELLEMENT dégradés — l'orientation
  // repart. Sans lui, supprimer la table entière laisserait le test du bloquant
  // vert.
  it('ABANDON — la garde ne mord PAS sur une passation complète et dégradée', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 4, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  // ── UN CAS MOTEUR PAR RÈGLE, ASSERTÉ SUR LE `regleId` ─────────────────────
  //
  // Neuf règles n'avaient AUCUN cas moteur, et deux sont neuves. Ce qu'une règle
  // non couverte coûte, mesuré : la mutation `sousScore: 'digestion'` →
  // `'digestions'` sur `R2-GAS-02` laissait le banc ENTIER vert. Une règle morte
  // ne casse rien — elle cesse de parler.

  it('R2-SOM-02 — une plainte de sommeil intense propose le PSQI', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [{ id: 'sommeil', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-02');
  });

  it('R2-SOM-03 — un rythme biologique insuffisant propose le chronotype de Horne', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'RYTHME_BIOLOGIQUE', total: 14, interpretation: { label: 'Rythme insuffisant', color: 'warning' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_05' })).toContain('R2-SOM-03');
  });

  it('R2-SOM-04 — un antécédent respiratoire ET un sommeil dégradé proposent Berlin', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 14, interpretation: { label: 'Sommeil insuffisant', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, antecedentsDomaines: ['Respiratoire / apnée du sommeil'] };
    // L'ET logique, dans les deux sens : ni la mesure seule, ni le drapeau seul.
    expect(reglesPour(evaluer([mesure]), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toEqual([]);
    expect(reglesPour(evaluer([mesure], drapeau), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toContain('R2-SOM-04');
  });

  // RE-CIBLÉE le 2026-08-06, puis RESSERRÉE le même jour à la revue
  // adversariale : DEUX questionnaires — le PSQI et le chronotype de Horne, les
  // deux instruments que `WN-CL-0178-017` nomme et que cette table sait
  // proposer. Le banc s'asserte sur `Q_SOM_05` (Horne), cible PROPRE à cette
  // règle sur ce scénario — `Q_SOM_01` est déjà servi par `R2-SOM-01`, qui
  // s'allume aussi à 8.
  it('R2-SOM-05 — une attente de sommeil ET un sommeil non réparateur proposent PSQI et Horne', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
    ]);
    const drapeau = { ...anamneseVide, attentes: ['Améliorer le sommeil'] };
    const cible = { type: 'questionnaire', questionnaireId: 'Q_SOM_05' };
    expect(reglesPour(evaluer([mesure]), cible)).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), cible)).toEqual([]);
    const recos = evaluer([mesure], drapeau);
    expect(reglesPour(recos, cible)).toContain('R2-SOM-05');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-05');
  });

  // LE RETRAIT DE BERLIN EST UNE DÉCISION CLINIQUE, ET IL SE GARDE.
  //
  // Une rédaction du 2026-08-06 proposait `Q_SOM_03` (Berlin) sur cette règle.
  // `R2-SOM-04` conditionne le dépistage d'apnées à un ANTÉCÉDENT RESPIRATOIRE
  // déclaré : le proposer ici sur la seule attente de sommeil CONTOURNAIT cette
  // porte. Ce banc échoue si quelqu'un le réintroduit — et la seconde assertion
  // vérifie que la porte, elle, laisse toujours passer qui de droit.
  it('R2-SOM-05 — ne contourne PAS la porte de R2-SOM-04 (antécédent respiratoire)', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
    ]);
    const attenteSeule = { ...anamneseVide, attentes: ['Améliorer le sommeil'] };
    // Sans antécédent respiratoire : Berlin n'est proposé par personne.
    expect(reglesPour(evaluer([mesure], attenteSeule), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' }))
      .toEqual([]);
    // Avec l'antécédent : c'est `R2-SOM-04`, et elle seule, qui l'ouvre.
    const avecAntecedent = { ...attenteSeule, antecedentsDomaines: ['Respiratoire / apnée du sommeil'] };
    expect(reglesPour(evaluer([mesure], avecAntecedent), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' }))
      .toEqual(['R2-SOM-04']);
  });

  // Epworth suit la même logique, par un autre motif : il n'est pas nommé par
  // `WN-CL-0178-017`, et reste porté par `R2-SOM-06` (plainte de fatigue).
  it('R2-SOM-05 — ne propose pas Epworth, qui reste à R2-SOM-06', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
    ]);
    const recos = evaluer([mesure], { ...anamneseVide, attentes: ['Améliorer le sommeil'] });
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_02' })).toEqual([]);
  });

  it('R2-SOM-06 — une plainte de fatigue intense propose Epworth PUIS Pichot', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [{ id: 'fatigue', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } }]),
    ]);
    // Les deux instruments, et l'ordre que le claim leur donne (priorité 1 puis 2).
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_02' })).toContain('R2-SOM-06');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_06' })).toContain('R2-SOM-06');
    const epworth = recos.find(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_SOM_02');
    const pichot = recos.find(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_SOM_06');
    expect(epworth?.priorite).toBe(1);
    expect(pichot?.priorite).toBe(2);
  });

  // RE-CIBLÉE le 2026-08-06. Assertion sur `Q_STR_04` (DASS-21) : cible PROPRE
  // à cette règle — `Q_STR_02` est aussi servi par `R2-STR-01`, qui s'allume à 17.
  it('R2-STR-02 — un burn-out déclaré ET une adaptation insuffisante engagent les trois instruments', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'ADAPTATION_STRESS', total: 17, interpretation: { label: 'Adaptation insuffisante', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] };
    const cible = { type: 'questionnaire', questionnaireId: 'Q_STR_04' };
    expect(reglesPour(evaluer([mesure]), cible)).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), cible)).toEqual([]);
    const recos = evaluer([mesure], drapeau);
    expect(reglesPour(recos, cible)).toContain('R2-STR-02');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_03' })).toContain('R2-STR-02');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-02');
  });

  it('R2-STR-03 — une adaptation perturbée propose le BMS-10 sans attendre', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'ADAPTATION_STRESS', total: 8, interpretation: { label: 'Adaptation perturbée', color: 'danger' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_05' })).toContain('R2-STR-03');
    // Correction du 2026-08-04 : à 8, `R2-STR-01` s'allume AUSSI (`8 <= 17`).
    // Le resserrement de `R2-STR-03` n'évite donc aucun doublon — il borne
    // seulement sa propre portée. Les deux règles visent des cibles distinctes.
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('R2-NEU-03 — une échelle fonctionnelle sérotonine perturbée propose le HAD', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [{ id: 'SE', total: 10, interpretation: { label: 'Perturbations probables', color: 'warning' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' })).toContain('R2-NEU-03');
  });

  // La jumelle de `R2-NEU-03` sur l'axe dopamine — ajoutée le 2026-08-04 parce
  // que les deux claims nomment « les scores fonctionnels D ET S » au même rang.
  // Le test l'isole : SEUL `DA` est renseigné, si bien qu'un `R2-NEU-04` muet ne
  // peut pas être masqué par `R2-NEU-03`.
  it('R2-NEU-04 — une échelle fonctionnelle dopamine perturbée propose le HAD', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [{ id: 'DA', total: 10, interpretation: { label: 'Perturbations probables', color: 'warning' } }]),
    ]);
    const motifs = reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    expect(motifs).toContain('R2-NEU-04');
    expect(motifs).not.toContain('R2-NEU-03');
  });

  it('R2-NEU-03 et R2-NEU-04 — les deux axes perturbés motivent UNE recommandation à DEUX motifs', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [
        { id: 'DA', total: 12, interpretation: { label: 'Perturbations probables', color: 'warning' } },
        { id: 'SE', total: 15, interpretation: { label: 'Perturbations probables', color: 'warning' } },
      ]),
    ]);
    const had = recos.filter(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_NEU_11');
    expect(had).toHaveLength(1);
    expect(had[0].motifs.map(m => m.regleId).sort()).toEqual(['R2-NEU-03', 'R2-NEU-04']);
  });

  // RE-CIBLÉE le 2026-08-06 : trois questionnaires. À `digestion = 4`,
  // `R2-GAS-01` (qui exige `>= 7`) ne s'allume pas : les trois cibles sont
  // PROPRES à cette règle sur ce scénario.
  it('R2-GAS-02 — un antécédent digestif ET une plainte modérée engagent les trois instruments', () => {
    const mesure = sousScores('Q_MOD_03', [
      { id: 'digestion', total: 4, interpretation: { label: 'Intensité modérée', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, antecedentsDomaines: ['Digestif (SII, reflux, MICI…)'] };
    const cible = { type: 'questionnaire', questionnaireId: 'Q_GAS_03' };
    expect(reglesPour(evaluer([mesure]), cible)).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), cible)).toEqual([]);
    const recos = evaluer([mesure], drapeau);
    expect(reglesPour(recos, cible)).toContain('R2-GAS-02');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_GAS_01' })).toContain('R2-GAS-02');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_INF_01' })).toContain('R2-GAS-02');
  });

  // La SECONDE porte de `WN-CL-0287-009`, câblée le 2026-08-04. Déclencheur
  // GLOBAL : `Q_ALI_01` (moteur `seuils_points`) n'émet aucun `subScores`.
  //
  // Le banc de cette règle ne vit PAS ici : `Q_ALI_01` désigne deux instruments
  // selon `WN_ALI_01_SIIN57`, et une fixture écrite à la main ne dirait rien de
  // la position du drapeau. Il est plus bas, sur les définitions RÉELLES —
  // « R2-ALI-01 sur l'instrument réel, dans les deux positions du drapeau ».

  // ── NON-DÉCLENCHEMENT AUX BORNES DES SEUILS RESSERRÉS ─────────────────────
  //
  // Trois règles descendent SOUS le seuil de leur voisine, et chacune le motive.
  // Un seuil qu'aucun test ne borne se laisse « harmoniser » sans rien casser.

  it('BORNE — SOMMEIL à 9 : pas de chronotype de Horne (R2-SOM-05 exige <= 8)', () => {
    const recos = evaluer(
      [sousScores('Q_MOD_01', [{ id: 'SOMMEIL', total: 9, interpretation: null }])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_05' })).toEqual([]);
    // Le patient n'est pas laissé sans rien : `R2-SOM-01` lui propose le PSQI
    // seul. C'est l'effet de bord voulu du seuil resserré.
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  it('BORNE — ADAPTATION_STRESS à 9 : pas de BMS-10 (R2-STR-03 exige <= 8)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'ADAPTATION_STRESS', total: 9, interpretation: null }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_05' })).toEqual([]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('BORNE — digestion à 3 : aucun instrument digestif (R2-GAS-02 exige >= 4)', () => {
    const recos = evaluer(
      [sousScores('Q_MOD_03', [{ id: 'digestion', total: 3, interpretation: { label: 'Intensité faible ou absente', color: 'success' } }])],
      { ...anamneseVide, antecedentsDomaines: ['Digestif (SII, reflux, MICI…)'] },
    );
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_GAS_01' })).toEqual([]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_GAS_03' })).toEqual([]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_INF_01' })).toEqual([]);
  });

  // ── UN PACK ABSORBE SES MEMBRES (arbitrage praticien du 2026-08-04) ────────
  //
  // RÉÉCRITS SUR RÈGLES SYNTHÉTIQUES le 2026-08-06. Ces quatre bancs tournaient
  // sur `R2-SOM-05` & consorts, qui ciblaient un pack ; depuis le re-ciblage,
  // AUCUNE règle publiée ne cible plus un pack, et les écrire sur la table
  // vivante n'était plus possible — les laisser tomber aurait retiré du CI la
  // seule couverture de l'absorption, une capacité que le moteur garde et qu'un
  // lot futur peut rallumer.
  //
  // Les règles ci-dessous n'ont donc PAS d'existence clinique : elles ne sont
  // pas dans `ORIENTATION_RULES_V1`, ne sont pas signées, ne citent leurs claims
  // que pour franchir l'invariant de traçabilité du moteur. Ce qu'elles
  // exercent, c'est le moteur — jamais la doctrine.
  const CLAIM_FICTIF = [{ claimId: 'WN-CL-0178-017', versionClaim: 'v1.0' }];
  const DECLENCHEUR_ATTENTE_SOMMEIL = {
    type: 'drapeau' as const, champ: 'attentes' as const, valeurs: ['Améliorer le sommeil'],
  };

  const REGLE_SYNTH_PACK_SOMMEIL: OrientationRule = {
    id: 'SYNTH-PACK-SOMMEIL',
    statut: 'publiee',
    declencheurs: [DECLENCHEUR_ATTENTE_SOMMEIL],
    suggestions: [{
      packId: 'pack_sommeil_chronobiologie', priorite: 1,
      objectif: "Engager l'exploration complète du sommeil et des rythmes.",
    }],
    justificationClaims: CLAIM_FICTIF,
    niveau: 'approfondissement',
  };
  const REGLE_SYNTH_MEMBRE_PSQI: OrientationRule = {
    id: 'SYNTH-MEMBRE-PSQI',
    statut: 'publiee',
    declencheurs: [DECLENCHEUR_ATTENTE_SOMMEIL],
    suggestions: [{
      questionnaireId: 'Q_SOM_01', priorite: 1,
      objectif: 'Mesurer la qualité du sommeil par le PSQI.',
    }],
    // `socle` DÉLIBÉRÉMENT, contre l'`approfondissement` du pack : c'est ce qui
    // rend observable le report du niveau le plus fondamental.
    justificationClaims: CLAIM_FICTIF,
    niveau: 'socle',
  };
  const REGLE_SYNTH_PACK_STRESS: OrientationRule = {
    id: 'SYNTH-PACK-STRESS',
    statut: 'publiee',
    declencheurs: [{ type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] }],
    suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1, objectif: 'Engager le volet stress.' }],
    justificationClaims: CLAIM_FICTIF,
    niveau: 'approfondissement',
  };
  const REGLE_SYNTH_MEMBRE_PSS: OrientationRule = {
    id: 'SYNTH-MEMBRE-PSS',
    statut: 'publiee',
    declencheurs: [{ type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] }],
    suggestions: [{ questionnaireId: 'Q_STR_02', priorite: 1, objectif: 'Mesurer le stress perçu.' }],
    justificationClaims: CLAIM_FICTIF,
    niveau: 'socle',
  };
  const REGLE_SYNTH_PACK_DIGESTIF: OrientationRule = {
    id: 'SYNTH-PACK-DIGESTIF',
    statut: 'publiee',
    declencheurs: [{ type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Digestif (SII, reflux, MICI…)'] }],
    suggestions: [{ packId: 'pack_digestif_intestin_cerveau', priorite: 1, objectif: "Engager l'axe digestif." }],
    justificationClaims: CLAIM_FICTIF,
    niveau: 'approfondissement',
  };
  const REGLE_SYNTH_MEMBRE_TFD: OrientationRule = {
    id: 'SYNTH-MEMBRE-TFD',
    statut: 'publiee',
    declencheurs: [{ type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Digestif (SII, reflux, MICI…)'] }],
    suggestions: [{ questionnaireId: 'Q_GAS_01', priorite: 1, objectif: 'Mesurer les troubles fonctionnels digestifs.' }],
    justificationClaims: CLAIM_FICTIF,
    niveau: 'socle',
  };

  // `compositionPacks` explicite à chaque appel, jamais par défaut : un défaut
  // ferait passer `undefined` — le cas « composition inconnue », celui qu'un des
  // bancs teste — pour un oubli d'argument, et le banc en question ne pourrait
  // pas s'écrire.
  function evaluerSynth(
    regles: OrientationRule[],
    drapeaux: DrapeauxAnamnese,
    compositionPacks: Partial<Record<PackId, string[]>> | undefined,
  ) {
    return evaluerOrientation({ reponses: [], idsQuestionnairesAssignes: [], regles, drapeaux, compositionPacks });
  }

  const ATTENTE_SOMMEIL: DrapeauxAnamnese = { ...anamneseVide, attentes: ['Améliorer le sommeil'] };

  it('ABSORPTION — un pack recommandé masque ses propres membres', () => {
    const recos = evaluerSynth([REGLE_SYNTH_PACK_SOMMEIL, REGLE_SYNTH_MEMBRE_PSQI], ATTENTE_SOMMEIL, COMPOSITION_PACKS);
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'pack', packId: 'pack_sommeil_chronobiologie' });
    // `Q_SOM_01` est un membre de ce pack : la règle membre le proposait en
    // ligne distincte, il ne s'affiche plus.
    expect(cibles).not.toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    // Le motif absorbé ne DISPARAÎT pas : il remonte sur le pack.
    const pack = recos.find(r => r.cible.type === 'pack');
    expect(pack?.motifs.map(m => m.regleId).sort()).toEqual(['SYNTH-MEMBRE-PSQI', 'SYNTH-PACK-SOMMEIL']);
    // Sans la composition, l'absorption ne peut pas jouer — on ne devine pas ce
    // qu'un pack contient.
    const sansComposition = evaluerSynth(
      [REGLE_SYNTH_PACK_SOMMEIL, REGLE_SYNTH_MEMBRE_PSQI], ATTENTE_SOMMEIL, undefined,
    );
    expect(sansComposition.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
  });

  // Un pack absorbe des cibles d'un AUTRE axe clinique — `PACK_SOMMEIL_CHRONO`
  // contient `Q_NEU_11` et `Q_INF_03`. Sans report du niveau, un patient sévère
  // voyait sa sortie tomber à des packs tous `approfondissement` et PLUS RIEN au
  // `socle`, alors que des règles `socle` avaient déclenché.
  it('ABSORPTION — le pack porte le niveau le plus fondamental de ce qu\'il absorbe', () => {
    const recos = evaluerSynth([REGLE_SYNTH_PACK_SOMMEIL, REGLE_SYNTH_MEMBRE_PSQI], ATTENTE_SOMMEIL, COMPOSITION_PACKS);
    const pack = recos.find(r => r.cible.type === 'pack' && r.cible.packId === 'pack_sommeil_chronobiologie');
    // Le pack est `approfondissement` au registre ; la règle membre est `socle`.
    // C'est le socle qui l'emporte.
    expect(pack?.niveau).toBe('socle');
    // Et le socle n'a pas disparu de la sortie : c'est tout l'enjeu.
    expect(recos.some(r => r.niveau === 'socle')).toBe(true);
  });

  // L'`objectif` est la seule phrase française qui dit POURQUOI, et elle part
  // aussi au modèle de synthèse. Elle est reportée PRÉFIXÉE par la cible : ainsi
  // préfixée, elle ne peut pas se lire comme une description du pack.
  it('ABSORPTION — les objectifs des membres remontent, préfixés par la cible', () => {
    const recos = evaluerSynth([REGLE_SYNTH_PACK_SOMMEIL, REGLE_SYNTH_MEMBRE_PSQI], ATTENTE_SOMMEIL, COMPOSITION_PACKS);
    const pack = recos.find(r => r.cible.type === 'pack' && r.cible.packId === 'pack_sommeil_chronobiologie');
    // L'objectif propre au pack est toujours là, sans préfixe.
    expect(pack?.objectifs.some(o => o.startsWith("Engager l'exploration complète du sommeil"))).toBe(true);
    // Celui de la cible absorbée est là aussi, et il dit de qui il parle.
    const reporte = pack?.objectifs.find(o => o.startsWith('via Q_SOM_01 : '));
    expect(reporte, "l'objectif de Q_SOM_01 doit remonter sur le pack").toBeDefined();
    expect(reporte).toContain('Mesurer la qualité du sommeil par le PSQI');
    // Aucun objectif reporté ne se présente comme une description du pack.
    const membres = COMPOSITION_PACKS.pack_sommeil_chronobiologie ?? [];
    for (const objectif of pack?.objectifs ?? []) {
      const vientDunMembre = membres.some(qid => objectif.startsWith(`via ${qid} : `));
      const propreAuPack = pack?.motifs.some(m => m.regleId === 'SYNTH-PACK-SOMMEIL') && !objectif.startsWith('via ');
      expect(vientDunMembre || propreAuPack).toBe(true);
    }
  });

  // L'invariant général, sur un patient qui allume les trois packs : aucune
  // recommandation de questionnaire ne doit être membre d'un pack recommandé.
  it('ABSORPTION — aucun pack recommandé ne coexiste avec un de ses membres', () => {
    const recos = evaluerSynth(
      [
        REGLE_SYNTH_PACK_SOMMEIL, REGLE_SYNTH_MEMBRE_PSQI,
        REGLE_SYNTH_PACK_STRESS, REGLE_SYNTH_MEMBRE_PSS,
        REGLE_SYNTH_PACK_DIGESTIF, REGLE_SYNTH_MEMBRE_TFD,
      ],
      {
        ...anamneseVide,
        attentes: ['Améliorer le sommeil'],
        facteursDeclenchants: ['Stress aigu / burn-out'],
        antecedentsDomaines: ['Digestif (SII, reflux, MICI…)'],
      },
      COMPOSITION_PACKS,
    );

    // Le banc ne prouverait rien sur un patient à qui on ne propose rien.
    expect(recos.length).toBeGreaterThan(0);
    const packsRecommandes = recos
      .filter(r => r.cible.type === 'pack')
      .map(r => (r.cible as { packId: keyof typeof COMPOSITION_PACKS }).packId);
    expect(packsRecommandes).toHaveLength(3);

    const membres = new Set<string>(packsRecommandes.flatMap(packId => COMPOSITION_PACKS[packId] ?? []));
    const doublons = recos
      .filter(r => r.cible.type === 'questionnaire')
      .map(r => (r.cible as { questionnaireId: string }).questionnaireId)
      .filter(qid => membres.has(qid));
    expect(doublons).toEqual([]);

    // PAS DE PLAFOND GLOBAL (décision explicite) : ce qui reste justifié reste
    // affiché. L'absorption retire la redondance, jamais la quantité.
    expect(recos.length).toBeGreaterThan(2);
  });
});

// Invariant relevé à la revue adversariale du LOT-06.
//
// Depuis ce lot, les motifs d'orientation entrent dans le prompt de la synthèse
// IA. Or `buildUserMessage` RETIRE délibérément les chiffres des passations
// inscrites au registre `passationsNonInterpretables` — mais le moteur
// d'orientation, lui, lit toutes les réponses sans ce filtre. Une règle
// déclenchée sur une telle passation réintroduirait dans le prompt, sous
// l'étiquette « recommandation déterministe signée », le score que l'autre bloc
// vient d'ôter — et sous une consigne qui déclare ce bloc prioritaire.
//
// La disjonction est vraie aujourd'hui par accident : la table V1 déclenche sur
// Q_GAS_01, Q_SOM_01 et Q_STR_02, le registre porte d'autres instruments. Rien
// ne la gardait. C'est ce test.
describe('disjonction avec les passations non interprétables', () => {
  it('aucun déclencheur ne porte sur une passation dont le résultat n’est pas une mesure', () => {
    const instrumentsDeclencheurs = new Set(
      ORIENTATION_RULES_V1.flatMap(regle =>
        regle.declencheurs
          .filter(declencheur => declencheur.type === 'zone' || declencheur.type === 'comparaison')
          .map(declencheur => (declencheur as { idQuestionnaire: string }).idQuestionnaire),
      ),
    );

    const collisions = [...instrumentsDeclencheurs].filter(id =>
      MOTIFS_PASSATION_NON_INTERPRETABLE.has(id),
    );

    expect(
      collisions,
      'une règle déclenche sur une passation non interprétable : son motif ferait entrer dans le prompt de synthèse le chiffre que buildUserMessage en retire',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-ALI-01 SUR L'INSTRUMENT RÉEL, DANS LES DEUX POSITIONS DU DRAPEAU.
//
// `Q_ALI_01` désigne DEUX instruments selon `WN_ALI_01_SIIN57` : la forme SIIN57
// (57 items, `seuils_points`, /90) quand il vaut `'true'`, la forme COURT14
// (14 items, `sum`, /42) sinon — et il est ÉTEINT par défaut, donc en CI. Le
// claim qui fonde `R2-ALI-01` (`WN-CL-0287-009`) parle de l'enquête « SiiN
// DÉTAILLÉE » : la règle ne doit mordre que sur la forme longue.
//
// Aucune fixture écrite à la main ici : les scores sont produits par le
// SCOREUR RÉEL (`calculateScore`) sur des réponses construites à partir des
// OPTIONS RÉELLES de la définition servie. Une fixture recopiée resterait verte
// le jour où une bande est réécrite — c'est-à-dire au seul moment où ce banc
// aurait quelque chose à dire.
//
// `QUESTIONNAIRE_CATALOGUE` résout le drapeau À L'IMPORT (`Q_ALI_01 =
// process.env.WN_ALI_01_SIIN57 === 'true' ? … : …`) : la variable ne peut donc
// pas être changée après coup, d'où `vi.stubEnv` + `vi.resetModules()` +
// `await import()` à chaque position. Même patron que
// `agendaAlimentaireDrapeau.guard.test.ts`. Le moteur, lui, reste importé
// statiquement : il ne lit aucun drapeau, il ne lit que des scores.
describe('R2-ALI-01 — sur l’instrument réel, dans les deux positions du drapeau', () => {
  type OptionReelle = { v: number; l: string };
  type QuestionReelle = { id: string; options?: OptionReelle[] };
  type FormeServie = { sections: Array<{ questions: QuestionReelle[] }> };
  type ScoreLu = {
    total: number | null;
    missing?: number;
    interpretation?: { label?: string; color?: string } | null;
  };

  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** La forme RÉELLEMENT servie sous une position du drapeau, et son scoreur. */
  async function formeServie(drapeau: string | undefined) {
    vi.resetModules();
    // `stubEnv(nom, undefined)` fait un `delete` : c'est la variable ABSENTE,
    // l'état réel du CI, de dev et de preview.
    vi.stubEnv('WN_ALI_01_SIIN57', drapeau as string);
    const questions = await import('@/lib/questions');
    const def = (questions.QUESTIONNAIRE_CATALOGUE as unknown as Record<string, FormeServie>).Q_ALI_01;
    const scorer = (reponses: Record<string, number>) =>
      questions.calculateScore('Q_ALI_01', reponses) as ScoreLu;
    return { def, scorer, items: def.sections.flatMap(s => s.questions) };
  }

  /**
   * Une passation COMPLÈTE, poussée vers le BAS par le scoreur réel : chaque
   * item reçoit celle de ses options qui minimise le total. Rien n'est écrit à
   * la main — ni valeur, ni seuil, ni libellé.
   */
  function passationLaPlusBasse(items: QuestionReelle[], scorer: (r: Record<string, number>) => ScoreLu) {
    const reponses: Record<string, number> = {};
    for (const item of items) reponses[item.id] = (item.options ?? [])[0].v;
    for (const item of items) {
      for (const option of item.options ?? []) {
        const essai = { ...reponses, [item.id]: option.v };
        if ((scorer(essai).total ?? 0) < (scorer(reponses).total ?? 0)) reponses[item.id] = option.v;
      }
    }
    return reponses;
  }

  /**
   * Puis remontée item par item jusqu'à franchir un plancher. Les items valent
   * 1 ou 2 points : le dépassement est d'au plus 2, très en deçà de la largeur
   * des bandes visées. Le banc ASSERTE la bande obtenue plutôt que de la
   * supposer.
   */
  function passationAuDessusDe(
    plancher: number,
    items: QuestionReelle[],
    scorer: (r: Record<string, number>) => ScoreLu,
  ) {
    const reponses = passationLaPlusBasse(items, scorer);
    for (const item of items) {
      if ((scorer(reponses).total ?? 0) >= plancher) break;
      for (const option of item.options ?? []) {
        const essai = { ...reponses, [item.id]: option.v };
        if ((scorer(essai).total ?? 0) > (scorer(reponses).total ?? 0)) reponses[item.id] = option.v;
      }
    }
    return reponses;
  }

  function evaluerSur(score: ScoreLu) {
    return evaluerOrientation({
      reponses: [{
        idQuestionnaire: 'Q_ALI_01',
        dateReponse: '2026-08-04T10:00:00.000Z',
        scores: score as unknown as Record<string, unknown>,
      }],
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux: anamneseVide,
    });
  }

  // RE-CIBLÉE le 2026-08-06 : la règle ne vise plus le pack digestif mais le
  // TFD et l'échelle de Bristol. Ce que ce banc épingle n'a pas changé — c'est
  // la SOLIDARITÉ de la règle avec la forme SIIN57 de `Q_ALI_01`.
  const TFD = { type: 'questionnaire', questionnaireId: 'Q_GAS_01' };
  const BRISTOL = { type: 'questionnaire', questionnaireId: 'Q_GAS_03' };

  it('DRAPEAU ALLUMÉ — une bande défavorable de la forme SIIN57 engage les instruments digestifs', async () => {
    const { scorer, items } = await formeServie('true');
    expect(items, 'la forme allumée doit être celle à 57 items').toHaveLength(57);

    // Bande la plus sévère : toutes les options les moins favorables.
    const severe = scorer(passationLaPlusBasse(items, scorer));
    expect(severe.missing, 'la passation doit être complète').toBe(0);
    expect(severe.interpretation?.label).toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(severe).map(r => r.cible)).toContainEqual(TFD);
    expect(evaluerSur(severe).map(r => r.cible)).toContainEqual(BRISTOL);

    // Bande défavorable intermédiaire (26-50), l'autre libellé cité par la règle.
    const intermediaire = scorer(passationAuDessusDe(26, items, scorer));
    expect(intermediaire.interpretation?.label)
      .toBe('Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé');
    expect(evaluerSur(intermediaire).map(r => r.cible)).toContainEqual(TFD);
    expect(evaluerSur(intermediaire).map(r => r.cible)).toContainEqual(BRISTOL);
  });

  it('DRAPEAU ALLUMÉ — la bande `info` (« plutôt équilibrée ») ne déclenche PAS', async () => {
    const { scorer, items } = await formeServie('true');
    const score = scorer(passationAuDessusDe(51, items, scorer));
    expect(score.interpretation?.label)
      .toBe('Alimentation plutôt équilibrée, mais insuffisamment protectrice');
    expect(score.interpretation?.color, 'la bande visée est bien `info`').toBe('info');
    // Elle est LAISSÉE DEHORS délibérément : « plutôt équilibrée » n'est pas
    // défavorable. Un déclencheur qui partirait de `info` ferait rougir ceci.
    expect(evaluerSur(score)).toEqual([]);
  });

  it('DRAPEAU ÉTEINT — un score bas de la forme COURT14 n’engage RIEN', async () => {
    const { scorer, items } = await formeServie(undefined);
    expect(items, 'drapeau éteint : la forme servie est celle à 14 items').toHaveLength(14);

    const score = scorer(passationLaPlusBasse(items, scorer));
    // La forme courte produit bien, elle aussi, une bande défavorable — et une
    // COULEUR identique à celle de la forme longue. C'est exactement ce qui
    // rendait un déclencheur `{type: 'couleur'}` aveugle au drapeau.
    expect(['warning', 'danger']).toContain(score.interpretation?.color);
    // Mais son libellé n'est pas celui de la forme SIIN57 : la règle ne mord pas.
    expect(score.interpretation?.label).not.toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(score)).toEqual([]);
  });

  it('DRAPEAU ÉTEINT — aucune position ne rend la règle muette par accident', async () => {
    // Contre-épreuve : le test précédent serait vert si la règle était morte
    // dans les DEUX positions (identifiant mal orthographié, statut suspendu…).
    // Celle-ci l'exclut en exigeant qu'elle vive dans l'autre.
    const { scorer, items } = await formeServie('true');
    const motifs = evaluerSur(scorer(passationLaPlusBasse(items, scorer)))
      .flatMap(r => r.motifs.map(m => m.regleId));
    expect(motifs).toContain('R2-ALI-01');
  });

  // Le score global d'une enquête abandonnée reste servi par `seuils_points`
  // SANS condition de complétude : trois items renseignés rendent quelques
  // points sur 90, donc la bande la plus sévère. C'est la garde de complétude
  // d'`extraireCible` qui l'arrête, et elle est exercée ici sur l'instrument
  // réel — pas sur un `missing` posé à la main.
  it('DRAPEAU ALLUMÉ — une enquête SIIN abandonnée n’engage rien', async () => {
    const { scorer, items } = await formeServie('true');
    const complete = passationLaPlusBasse(items, scorer);
    const troisItems = Object.fromEntries(
      Object.entries(complete).filter(([id]) => items.slice(0, 3).some(q => q.id === id)),
    );
    const score = scorer(troisItems);
    expect(score.missing, 'la passation doit être incomplète').toBeGreaterThan(0);
    expect(score.interpretation?.label, 'le moteur sert quand même sa bande la plus sévère')
      .toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(score)).toEqual([]);
  });
});
