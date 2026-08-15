import { describe, expect, it } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import {
  LIBELLE_EXTINCTION,
  STOP_RULES_ECARTEES_V1,
  STOP_RULES_METADATA,
  STOP_RULES_SHA256,
  STOP_RULES_V1,
} from './stopRulesV1';
import { ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';

// Verrou de la table des règles d'arrêt ([[D-053]]) — patron
// `orientationRulesV1.test.ts`. Ce banc n'atteint pas ce qu'une règle vaut
// cliniquement : il tient ce qu'aucune relecture ne peut retenir dans le temps
// — le statut de signature, la traçabilité des claims, l'existence réelle des
// bandes citées, et l'identité du contenu signé.

describe('stopRulesV1 — statut de signature', () => {
  // ÉCRIRE UNE TABLE ET LA SIGNER SONT DEUX GESTES DISTINCTS. Le second est un
  // acte praticien, et il n'a pas eu lieu. Ce banc épingle l'état, quel qu'il
  // soit : le jour de la signature, il rougit — et c'est exactement ce qu'on
  // lui demande, parce que ce jour-là le comportement de production change.
  // SIGNÉE le 2026-08-15 ([[D-061]]), conjointement à `contradictionsV1` —
  // l'ordre a un sens clinique ([[D-053]] §5). Sentinelle inversée plutôt que
  // supprimée : une dé-signature accidentelle reste attrapée.
  it('la table est signée, et sa signature est bien formée', () => {
    expect(STOP_RULES_METADATA.validationExterne).toBe(true);
    expect(STOP_RULES_METADATA.dateValidation).toBe('2026-08-15T00:00:00.000Z');
    const d = STOP_RULES_METADATA.dateValidation as string;
    expect(new Date(d).toISOString()).toBe(d);
  });

  it('la version est nommée et les claims sources ne sont pas vides', () => {
    expect(STOP_RULES_METADATA.version).toBe('stop-rules-nnpp2-v1');
    expect(STOP_RULES_METADATA.claimsSource.length).toBeGreaterThan(0);
  });
});

describe('stopRulesV1 — traçabilité des claims', () => {
  // ÉGALITÉ DANS LES DEUX SENS, comme pour la table d'orientation. Un
  // `claimsSource` plus large ferait garder par le contrat de fraîcheur un
  // claim qu'aucune règle n'utilise ; plus étroit, il laisserait une règle
  // s'appuyer sur un claim que rien ne contrôle — c'est ce second sens qui
  // compte, et c'est celui qu'une inclusion simple ne verrait pas.
  it('claimsSource est EXACTEMENT l’union des claims des règles', () => {
    const cle = (claim: { claimId: string; versionClaim: string }) => `${claim.claimId}@${claim.versionClaim}`;
    const desRegles = [...new Set(STOP_RULES_V1.flatMap(regle => regle.justificationClaims.map(cle)))].sort();
    const declares = [...new Set(STOP_RULES_METADATA.claimsSource.map(cle))].sort();

    // Anti-vacuité : deux ensembles vides seraient « égaux ».
    expect(desRegles.length).toBeGreaterThan(0);
    expect(declares).toEqual(desRegles);
  });

  it('aucune règle publiée n’est dépourvue de claim', () => {
    const publiees = STOP_RULES_V1.filter(regle => regle.statut === 'publiee');
    expect(publiees.length).toBeGreaterThan(0);
    for (const regle of publiees) {
      expect(regle.justificationClaims.length).toBeGreaterThan(0);
      expect(regle.declencheurs.length).toBeGreaterThan(0);
      expect(regle.reglesEteintes.length).toBeGreaterThan(0);
      expect(regle.motif.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('stopRulesV1 — ce que la table éteint existe vraiment', () => {
  // Une règle d'arrêt qui nommerait une règle d'orientation inexistante
  // n'éteindrait rien, en silence : le moteur ne trouve simplement aucun motif
  // portant cet identifiant, et la ligne reste allumée sans que rien ne le dise.
  // C'est le mode de panne le plus probable d'une table écrite à la main.
  it('chaque règle éteinte existe dans la table d’orientation', () => {
    const connues = new Set(ORIENTATION_RULES_V1.map(regle => regle.id));
    for (const arret of STOP_RULES_V1) {
      for (const regleId of arret.reglesEteintes) {
        expect(connues, `${arret.id} éteint une règle inconnue : ${regleId}`).toContain(regleId);
      }
    }
  });

  // L'EXTINCTION NE TRAVERSE PAS LES AXES ([[D-053]], arbitrage 3). Toutes les
  // règles éteintes par STOP-STR sont des règles de l'axe stress : c'est ce qui
  // distingue « le questionnaire spécifique a répondu à la question du
  // dépistage » de « un instrument en fait taire un autre », que DC-30 interdit.
  it('STOP-STR n’éteint que des règles de l’axe stress', () => {
    const stopStr = STOP_RULES_V1.find(regle => regle.id === 'STOP-STR');
    expect(stopStr).toBeDefined();
    for (const regleId of stopStr!.reglesEteintes) {
      expect(regleId).toMatch(/^R2?-STR-\d{2}$/);
    }
  });

  // LE CRITÈRE N'EST PAS L'AXE, C'EST CE QUI DÉCLENCHE — relevé en revue
  // adversariale du 2026-08-12.
  //
  // Une règle qui part d'un DÉPISTAGE (l'axe `ADAPTATION_STRESS` de `Q_MOD_01`,
  // un burn-out déclaré à l'anamnèse) demande une mesure spécifique : l'éteindre
  // quand cette mesure revient rassurante, c'est dire que la question a reçu sa
  // réponse. Une règle qui part de la MESURE d'un instrument spécifique du même
  // axe est d'un autre genre : l'éteindre sans lire cet instrument reviendrait à
  // faire taire un résultat défavorable parce que d'autres sont rassurants —
  // une discordance supprimée (`DC-30`), et un motif faux servi au praticien.
  //
  // Le banc pose donc la frontière au bon endroit : tout instrument SPÉCIFIQUE
  // de l'axe stress (`Q_STR_*`) qui déclenche une règle éteinte doit être lu par
  // la règle d'arrêt. `R-STR-01` et `R-STR-02` partent du PSS-10 : elles ne sont
  // pas éteintes, et ce banc rougirait si on les rajoutait.
  it('aucune règle éteinte n’est déclenchée par un instrument spécifique que la règle d’arrêt ne lit pas', () => {
    const parId = new Map(ORIENTATION_RULES_V1.map(regle => [regle.id, regle]));
    let verifiees = 0;
    for (const arret of STOP_RULES_V1) {
      const lus = new Set(
        arret.declencheurs
          .filter(declencheur => declencheur.type !== 'drapeau')
          .map(declencheur => (declencheur as { idQuestionnaire: string }).idQuestionnaire),
      );
      // La famille d'instruments spécifiques que cette règle d'arrêt prétend
      // avoir lue — dérivée de ses propres déclencheurs, jamais codée en dur.
      const familles = new Set([...lus].map(qid => qid.slice(0, 6)));
      for (const regleId of arret.reglesEteintes) {
        const regle = parId.get(regleId);
        if (!regle) continue;
        for (const declencheur of regle.declencheurs) {
          if (declencheur.type === 'drapeau') continue;
          const qid = declencheur.idQuestionnaire;
          if (!familles.has(qid.slice(0, 6))) continue;
          verifiees += 1;
          expect(
            lus,
            `${arret.id} éteint ${regleId}, déclenchée par la MESURE de ${qid} que la règle d'arrêt ne lit pas`,
          ).toContain(qid);
        }
      }
    }
    // ANTI-VACUITÉ, PAR LA PREUVE INVERSE. La boucle ci-dessus ne visite RIEN
    // aujourd'hui — les trois règles éteintes partent toutes d'un dépistage —,
    // et un banc qui s'arrêterait là serait vert sans rien tenir. On vérifie
    // donc que les règles qui, elles, partent d'un instrument spécifique non lu
    // existent bel et bien ET restent DEHORS. Les ajouter ferait rougir ce cas.
    expect(verifiees).toBe(0);
    const eteintes = new Set(STOP_RULES_V1.flatMap(arret => arret.reglesEteintes));
    const lusPartout = new Set(
      STOP_RULES_V1.flatMap(arret =>
        arret.declencheurs
          .filter(declencheur => declencheur.type !== 'drapeau')
          .map(declencheur => (declencheur as { idQuestionnaire: string }).idQuestionnaire),
      ),
    );
    const surMesureNonLue = ORIENTATION_RULES_V1.filter(regle =>
      regle.declencheurs.some(
        declencheur =>
          declencheur.type !== 'drapeau'
          && declencheur.idQuestionnaire.startsWith('Q_STR_')
          && !lusPartout.has(declencheur.idQuestionnaire),
      ),
    ).map(regle => regle.id);
    // Le cas réel : `R-STR-01` et `R-STR-02`, déclenchées par le PSS-10.
    expect(surMesureNonLue.length).toBeGreaterThan(0);
    for (const regleId of surMesureNonLue) {
      expect(eteintes, `${regleId} est déclenchée par une mesure non lue : elle ne peut pas être éteinte`).not.toContain(regleId);
    }
  });

  // Le HAD n'est éteint par aucune voie — le banc porte l'arbitrage plutôt que
  // le commentaire qui l'explique. Une règle NEU ajoutée un jour aux extinctions
  // le ferait rougir, ce qui est le but.
  it('aucune règle proposant le HAD n’est éteinte', () => {
    const proposentLeHad = new Set(
      ORIENTATION_RULES_V1.filter(regle =>
        regle.suggestions.some(suggestion => suggestion.questionnaireId === 'Q_NEU_11'),
      ).map(regle => regle.id),
    );
    // Anti-vacuité : si plus aucune règle ne proposait le HAD, ce banc serait
    // vert sans rien tenir.
    expect(proposentLeHad.size).toBeGreaterThan(0);
    for (const arret of STOP_RULES_V1) {
      for (const regleId of arret.reglesEteintes) {
        expect(proposentLeHad).not.toContain(regleId);
      }
    }
  });
});

describe('stopRulesV1 — les bandes citées sont celles que le catalogue publie', () => {
  type Bande = { label?: string };

  function labelsPublies(idQuestionnaire: string, sousScore?: string): string[] {
    const definition = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[idQuestionnaire];
    const interpretation = definition?.scoring?.interpretation;
    if (!Array.isArray(interpretation)) return [];
    // Deux formes coexistent au catalogue : une liste de bandes (score global)
    // et une liste d'axes portant chacun ses `ranges` (sous-scores).
    if (sousScore) {
      const axe = interpretation.find((entree: any) => entree?.subscale === sousScore);
      return Array.isArray(axe?.ranges) ? axe.ranges.map((bande: Bande) => bande.label ?? '') : [];
    }
    return interpretation.map((bande: Bande) => bande.label ?? '');
  }

  // LE MODE DE PANNE QUE CE BANC EXISTE POUR ATTRAPER. Une règle d'arrêt cite
  // ses bandes par LIBELLÉ — c'est ce qui lui évite d'écrire un seuil (`DC-19`).
  // Le prix de ce choix est qu'un libellé retouché dans `questions.ts` ferait
  // taire la règle sans casser quoi que ce soit : plus aucune extinction, aucune
  // erreur, aucun test rouge. Ici, il en fait un échec de CI.
  it('chaque libellé de bande cité existe dans questions.ts', () => {
    let citees = 0;
    for (const arret of STOP_RULES_V1) {
      for (const declencheur of arret.declencheurs) {
        if (declencheur.type !== 'zone') continue;
        if (declencheur.zone.type !== 'interpretation') continue;
        const publies = labelsPublies(declencheur.idQuestionnaire, declencheur.sousScore);
        expect(publies.length, `aucune bande publiée pour ${declencheur.idQuestionnaire}`).toBeGreaterThan(0);
        for (const label of declencheur.zone.labels) {
          citees += 1;
          expect(publies, `${arret.id} cite une bande inconnue de ${declencheur.idQuestionnaire} : ${label}`).toContain(label);
        }
      }
    }
    // Anti-vacuité : une table dont plus aucun déclencheur ne serait de ce type
    // rendrait la boucle muette.
    expect(citees).toBeGreaterThanOrEqual(4);
  });

  // UNE EXTINCTION NE S'ADOSSE QU'À UNE BANDE FAVORABLE. Une règle d'arrêt qui
  // citerait une bande `warning` ou `danger` éteindrait une exploration sur un
  // résultat défavorable : l'inverse exact de sa raison d'être, et le genre
  // d'erreur qu'une relecture laisse passer parce que le libellé, lui, a l'air
  // juste.
  it('les bandes citées sont toutes des bandes favorables', () => {
    function couleurDeLaBande(idQuestionnaire: string, sousScore: string | undefined, label: string): string | null {
      const definition = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[idQuestionnaire];
      const interpretation = definition?.scoring?.interpretation;
      if (!Array.isArray(interpretation)) return null;
      const bandes = sousScore
        ? (interpretation.find((entree: any) => entree?.subscale === sousScore)?.ranges ?? [])
        : interpretation;
      return bandes.find((bande: any) => bande?.label === label)?.color ?? null;
    }

    for (const arret of STOP_RULES_V1) {
      for (const declencheur of arret.declencheurs) {
        if (declencheur.type !== 'zone' || declencheur.zone.type !== 'interpretation') continue;
        for (const label of declencheur.zone.labels) {
          expect(
            couleurDeLaBande(declencheur.idQuestionnaire, declencheur.sousScore, label),
            `${arret.id} éteint sur une bande non favorable de ${declencheur.idQuestionnaire} : ${label}`,
          ).toBe('success');
        }
      }
    }
  });
});

describe('stopRulesV1 — règles écartées', () => {
  // Une règle écartée reste lisible avec son motif ([[D-042]], repris par
  // [[D-053]]) : ce banc empêche qu'elle se vide en une ligne de titre.
  it('chaque règle écartée porte un motif et une condition de retour', () => {
    expect(STOP_RULES_ECARTEES_V1.length).toBeGreaterThan(0);
    for (const ecartee of STOP_RULES_ECARTEES_V1) {
      expect(ecartee.motif.length).toBeGreaterThan(80);
      expect(ecartee.conditionDeRetour.length).toBeGreaterThan(40);
    }
  });

  it('une règle écartée n’est pas aussi une règle publiée', () => {
    const publiees = new Set(STOP_RULES_V1.map(regle => regle.id));
    for (const ecartee of STOP_RULES_ECARTEES_V1) {
      expect(publiees).not.toContain(ecartee.id);
    }
  });
});

describe('stopRulesV1 — verrou de contenu', () => {
  // ÉPINGLAGE PAR LITTÉRAL, et non par recalcul. La constante et son contenu
  // bougent ensemble : comparer l'une à l'autre ne garde rien. C'est ce
  // littéral-ci qui rougit quand une règle est retouchée, et la sortie de
  // secours est de RE-SIGNER — jamais de mettre le sha à jour en silence.
  const SHA_CONTENU_2026_08_12 = 'f9ccf688d6beae301df3cbea3279e863a09870cc6020656302ede86496d8fa01';

  it('le sha publié correspond au contenu de la table', () => {
    expect(STOP_RULES_SHA256).toBe(sha256(JSON.stringify(STOP_RULES_V1)));
  });

  it('le contenu de la table est exactement celui qui a été relu', () => {
    expect(STOP_RULES_V1.length).toBe(1);
    expect(STOP_RULES_SHA256).toBe(SHA_CONTENU_2026_08_12);
  });

  it('le libellé d’extinction est une phrase française stable', () => {
    expect(LIBELLE_EXTINCTION).toContain('Information suffisante');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STOP-STR DE BOUT EN BOUT — vrai moteur de scoring, vraie table, vraies règles
// d'orientation ([[D-055]], LOT-08).
//
// Les bancs du moteur (`orientationEngine.test.ts`) jouent des objets de score
// FORGÉS : ils prouvent le contrat de la garde, pas que la chaîne réelle le
// remplit. C'est précisément l'écart qui a laissé STOP-STR inerte un lot
// entier — et qui cachait un second verrou : la garde lisait les comptes à la
// racine quand le DASS-21 (`subscore`) ne les publie que par axe. Ici, chaque
// passation sort de `calculateScore` sur l'instrument de production, et la
// table évaluée est `STOP_RULES_V1` elle-même (injectée : elle reste NON
// signée, et ces bancs ne passent pas par le verrou du service).
// ─────────────────────────────────────────────────────────────────────────────

describe('STOP-STR de bout en bout — calculateScore réel, table réelle, configuration réelle du service', () => {
  // LA CONFIGURATION EST CELLE QUE LE SERVICE ÉMET, PAS UNE VARIANTE DE
  // CONFORT — revue wn-reviewer du 2026-08-13 (B3). `orientationService`
  // verrouille `reglesArret` et `exclureDejaRepondu` ENSEMBLE : une table
  // d'arrêt fournie implique l'exclusion, et `statut_validite` vaut `VALID`
  // par défaut de colonne. Une première rédaction de ce banc jouait la table
  // sans l'exclusion : ses deux lignes « éteintes » (PSS-10, Cungi — déjà
  // passés) n'existent jamais en production, l'exclusion les retire avant
  // qu'il y ait quoi que ce soit à éteindre.
  const ITEMS_STR_01 = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
    'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14',
    'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21',
  ];
  const ITEMS_DASS = Array.from({ length: 21 }, (_, i) => `Q${String(i + 1).padStart(3, '0')}`);
  const ITEMS_CUNGI = Array.from({ length: 11 }, (_, i) => `CU${i + 1}`);

  function reponsesAZero(ids: string[]): Record<string, number> {
    return Object.fromEntries(ids.map(id => [id, 0]));
  }

  let compteur = 0;
  function passation(idQuestionnaire: string, brutes: Record<string, number>): ReponseOrientation {
    compteur += 1;
    return {
      idQuestionnaire,
      dateReponse: '2026-08-13T10:00:00.000Z',
      idReponse: `r-${compteur}`,
      // Le défaut de colonne Prisma — c'est lui que le service transporte.
      statutValidite: 'VALID',
      scores: calculateScore(idQuestionnaire, brutes) as Record<string, unknown>,
    };
  }

  /**
   * Le dossier qui éteint RÉELLEMENT, sous la configuration du service :
   * `Q_MOD_01` avec un axe ADAPTATION_STRESS complet à 8 (bande la plus
   * sévère — allume `R2-STR-01` `<= 17` ET `R2-STR-03` `<= 8`), PAS de PSS-10
   * au dossier (sa cible reste donc proposable), et les trois instruments
   * rassurants de STOP-STR. Le DASS-21 et le Cungi, passés et exploitables,
   * sortent par l'exclusion `dejaRepondu` : les cibles restantes sont le
   * PSS-10 (`Q_STR_02`) et le BMS-10 (`Q_STR_05`) — des cibles NON passées,
   * précisément celles qu'une extinction concerne.
   */
  function dossierSansPss10(reponseStr01: ReponseOrientation) {
    return {
      reponses: [
        passation('Q_MOD_01', {
          ADAPTATION_STRESS_Q001: 2,
          ADAPTATION_STRESS_Q002: 1,
          ADAPTATION_STRESS_Q003: 1,
          ADAPTATION_STRESS_Q004: 2,
          ADAPTATION_STRESS_Q005: 2,
        }),
        // DASS-21 entièrement à 0 : axes S et A en « Normal ».
        passation('Q_STR_04', reponsesAZero(ITEMS_DASS)),
        // Cungi entièrement à 0 : « Niveau de stress très bas ».
        passation('Q_STR_03', reponsesAZero(ITEMS_CUNGI)),
        reponseStr01,
      ],
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      // Drapeau burn-out : la seconde jambe de `R2-STR-02`. Extrait comme en
      // production, depuis une anamnèse brute — pas un objet forgé à la main.
      drapeaux: extraireDrapeauxAnamnese({ facteurs_declenchants: ['Stress aigu / burn-out'] }),
      reglesArret: STOP_RULES_V1,
      // Le service ne fournit JAMAIS l'un sans l'autre.
      exclureDejaRepondu: true,
    };
  }

  function cible(reco: ReturnType<typeof evaluerOrientation>[number]): string {
    return reco.cible.type === 'questionnaire' ? reco.cible.questionnaireId : reco.cible.packId;
  }

  it('un Q_STR_01 complet et rassurant éteint le PSS-10 et le BMS-10 — cibles non passées, motifs et claims servis', () => {
    const recos = evaluerOrientation(dossierSansPss10(passation('Q_STR_01', reponsesAZero(ITEMS_STR_01))));
    const lignesEteintes = recos.filter(reco => reco.extinction);
    // Les deux cibles restantes après exclusion, toutes deux éteintes : le
    // PSS-10 (motifs R2-STR-01 + R2-STR-02) et le BMS-10 (motif R2-STR-03).
    expect(lignesEteintes.map(cible).sort()).toEqual(['Q_STR_02', 'Q_STR_05']);
    for (const ligne of lignesEteintes) {
      expect(ligne.extinction?.stopRuleId).toBe('STOP-STR');
      expect(ligne.extinction?.motif).toContain('conseils de vie antistress');
      expect(ligne.extinction?.claims.length).toBeGreaterThan(0);
      // Chaque condition affichée nomme un des quatre déclencheurs lus.
      expect(ligne.extinction?.conditions.length).toBe(4);
      // Une ligne éteinte n'est motivée QUE par des règles que STOP-STR nomme.
      for (const motif of ligne.motifs) {
        expect(['R2-STR-01', 'R2-STR-02', 'R2-STR-03']).toContain(motif.regleId);
      }
      // Et ces cibles ne sont PAS passées : ce sont elles qui alimentent la
      // liste `eteints` du garde de restitution.
      expect(ligne.dejaRepondu).toBe(false);
    }
  });

  it('avec un PSS-10 défavorable au dossier, RIEN ne s\'éteint — la discordance reste visible (DC-30)', () => {
    // LE CŒUR DE [[D-053]] arbitrage 2, sous configuration réelle. Le PSS-10
    // défavorable allume R-STR-01 et R-STR-02 — des règles de MESURE que
    // STOP-STR ne lit pas. Sa cible BMS-10 partage sa ligne avec R2-STR-03 :
    // le motif vivant la garde ALLUMÉE, la discordance se voit au lieu d'être
    // supprimée.
    const entree = dossierSansPss10(passation('Q_STR_01', reponsesAZero(ITEMS_STR_01)));
    entree.reponses.push(
      passation('Q_STR_02', { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5, P7: 5, P8: 5, P9: 5, P10: 5 }),
    );
    const recos = evaluerOrientation(entree);
    expect(recos.every(reco => !reco.extinction)).toBe(true);
    const bms = recos.find(reco => cible(reco) === 'Q_STR_05');
    expect(bms).toBeDefined();
    expect(bms?.motifs.map(motif => motif.regleId).sort()).toEqual(['R-STR-01', 'R2-STR-03']);
  });

  it('trois items sur vingt et un — rassurants — n’éteignent RIEN', () => {
    // Le scénario fondateur du lot : un item par groupe, au minimum. Avant la
    // publication des comptes, ce recueil décrochait la bande la plus favorable
    // et aurait éteint dès la table signée.
    const recos = evaluerOrientation(dossierSansPss10(passation('Q_STR_01', { A1: 0, B8: 0, C15: 0 })));
    expect(recos.length).toBeGreaterThan(0);
    expect(recos.every(reco => !reco.extinction)).toBe(true);
  });

  it('un DASS-21 amputé d’un item de l’axe S n’éteint rien — la garde lit l’axe visé', () => {
    // Le second verrou du lot, trouvé par CE banc : le DASS est un moteur
    // `subscore`, sans compte racine. Une garde qui ne lirait que la racine
    // refuserait TOUJOURS (le banc mordant ci-dessus serait inatteignable) ;
    // une garde qui ne lirait que le global raterait cet axe amputé. 20 items
    // sur 21 : l'axe S est incomplet, sa bande n'existe pas, rien ne s'éteint.
    const dassAmpute = reponsesAZero(ITEMS_DASS);
    delete (dassAmpute as Record<string, unknown>).Q001;
    const entree = dossierSansPss10(passation('Q_STR_01', reponsesAZero(ITEMS_STR_01)));
    entree.reponses = entree.reponses.map(reponse =>
      reponse.idQuestionnaire === 'Q_STR_04' ? passation('Q_STR_04', dassAmpute) : reponse,
    );
    const recos = evaluerOrientation(entree);
    expect(recos.every(reco => !reco.extinction)).toBe(true);
  });

  it('un Cungi seulement « bas » n’éteint rien — contre-épreuve sur la bande, pas la complétude', () => {
    // Total 11/55 : recueil COMPLET, bande « Niveau de stress bas » — voisine
    // de celle que la règle cite. Une garde qui n'exigerait que la complétude
    // laisserait passer ; c'est la ZONE qui doit fermer ici.
    const entree = dossierSansPss10(passation('Q_STR_01', reponsesAZero(ITEMS_STR_01)));
    entree.reponses = entree.reponses.map(reponse =>
      reponse.idQuestionnaire === 'Q_STR_03'
        ? passation('Q_STR_03', Object.fromEntries(ITEMS_CUNGI.map(id => [id, 1])))
        : reponse,
    );
    const recos = evaluerOrientation(entree);
    expect(recos.every(reco => !reco.extinction)).toBe(true);
  });
});
