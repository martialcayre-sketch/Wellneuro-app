import { afterEach, describe, expect, it, vi } from 'vitest';

// `preconditionsT0` tire `orientationService`, dont le module instancie un
// client Prisma AU CHARGEMENT et jette sans `DATABASE_URL`. Ce banc ne touche
// aucune base : on neutralise l'effet de bord plutôt que de renoncer à lire le
// rideau T0 depuis sa source (même geste que `preconditionsT0.test.ts`).
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { sha256 } from './corpusSyntheseV1';
import {
  CANAL_PLAINTE,
  PRIORITY_RULES_ECARTEES_V1,
  PRIORITY_RULES_METADATA,
  ABSTENTION_PROCEDURE_V1,
  PRIORITY_RULES_SHA256,
  PRIORITY_RULES_V1,
  evaluerPriorites,
  reglesPrioritesValidees,
  tablePrioritesSignee,
  type MotifAbstention,
} from './priorityRulesV1';
import { evaluerAbstention } from '@/lib/clinical-engine/chaineC1';
import type { ReponseOrientation } from './orientationEngine';
import { RIDEAU_T0 } from '@/lib/clinical-engine/preconditionsT0';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

// Verrou de la table des règles de priorité ([[D-054]]) — patron
// `stopRulesV1.test.ts`. Ce banc n'atteint pas ce qu'une règle vaut
// cliniquement : il tient ce qu'aucune relecture ne peut retenir dans le temps —
// le statut de signature, la traçabilité des claims, l'existence réelle des
// domaines et des bandes cités, et l'identité du contenu signé.

const DATE_SIGNATURE_SIMULEE = '2026-08-12T00:00:00.000Z';

/** Rend la table signée le temps d'un cas, et la remet dans son état livré. */
function simulerSignature(): void {
  PRIORITY_RULES_METADATA.validationExterne = true;
  PRIORITY_RULES_METADATA.dateValidation = DATE_SIGNATURE_SIMULEE;
}

afterEach(() => {
  PRIORITY_RULES_METADATA.validationExterne = false;
  PRIORITY_RULES_METADATA.dateValidation = null;
});

describe('priorityRulesV1 — statut de signature', () => {
  // ÉCRIRE UNE TABLE ET LA SIGNER SONT DEUX GESTES DISTINCTS. Le second est un
  // acte praticien, et il n'a pas eu lieu. Ce banc épingle l'état, quel qu'il
  // soit : le jour de la signature, il rougit — et c'est exactement ce qu'on lui
  // demande, parce que ce jour-là le comportement de production change.
  // SIGNÉE le 2026-08-15 ([[D-061]]). La sentinelle n'est pas supprimée, elle
  // est INVERSÉE : elle attrape désormais une dé-signature accidentelle et une
  // date malformée, ce que le verrou exige en forme ISO canonique.
  it('la table est signée, et sa signature est bien formée', () => {
    expect(PRIORITY_RULES_METADATA.validationExterne).toBe(true);
    expect(PRIORITY_RULES_METADATA.dateValidation).toBe('2026-08-15T00:00:00.000Z');
    const d = PRIORITY_RULES_METADATA.dateValidation as string;
    expect(new Date(d).toISOString()).toBe(d);
    expect(tablePrioritesSignee()).toBe(true);
  });

  it('la version est nommée et les claims sources ne sont pas vides', () => {
    expect(PRIORITY_RULES_METADATA.version).toBe('priority-rules-nnpp2-v1');
    expect(PRIORITY_RULES_METADATA.claimsSource.length).toBeGreaterThan(0);
  });

  // LE VERROU EST AUTO-PORTANT : les trois termes, et pas seulement le booléen.
  // Un `validationExterne` seul serait un drapeau qu'un flip isolé suffirait à
  // ouvrir — c'est la propriété que `tableSignee()` et `tableArretSignee()`
  // tiennent déjà, éprouvée ici sur les DEUX positions.
  it('le verrou exige les trois termes, jamais le seul booléen', () => {
    PRIORITY_RULES_METADATA.validationExterne = true;
    expect(tablePrioritesSignee()).toBe(false);
    PRIORITY_RULES_METADATA.dateValidation = DATE_SIGNATURE_SIMULEE;
    expect(tablePrioritesSignee()).toBe(true);
  });

  // UNE DATE MAL FORMÉE FERME LE VERROU au lieu de l'ouvrir : cette chaîne
  // devient telle quelle le `validatedAt` que `buildClinicalReview` valide en
  // ISO canonique — sans ce terme, la table s'ouvrait puis la consommation
  // jetait (revue PR #671). Fail-closed : silence, jamais un 500.
  it('une dateValidation non ISO canonique laisse le verrou fermé', () => {
    PRIORITY_RULES_METADATA.validationExterne = true;
    for (const malFormee of ['2026-08-12', '2026-08-12T00:00:00Z', 'demain']) {
      PRIORITY_RULES_METADATA.dateValidation = malFormee;
      expect(tablePrioritesSignee()).toBe(false);
      expect(reglesPrioritesValidees()).toEqual([]);
    }
  });
});

describe('priorityRulesV1 — traçabilité des claims', () => {
  const cle = (claim: { claimId: string; versionClaim: string }) => `${claim.claimId}@${claim.versionClaim}`;

  // ÉGALITÉ DANS LES DEUX SENS, comme pour les tables d'orientation et d'arrêt.
  // Un `claimsSource` plus large ferait garder par le contrat de fraîcheur un
  // claim qu'aucune règle n'utilise ; plus étroit, il laisserait une règle
  // s'appuyer sur un claim que rien ne contrôle — c'est ce second sens qui
  // compte, et c'est celui qu'une inclusion simple ne verrait pas.
  it('claimsSource est EXACTEMENT l’union des claims des règles', () => {
    const desRegles = [...new Set(PRIORITY_RULES_V1.flatMap(regle => regle.justificationClaims.map(cle)))].sort();
    const declares = [...new Set(PRIORITY_RULES_METADATA.claimsSource.map(cle))].sort();

    // Anti-vacuité : deux ensembles vides seraient « égaux ».
    expect(desRegles.length).toBeGreaterThan(0);
    expect(declares).toEqual(desRegles);
  });

  // « AUCUN CANDIDAT SANS CLAIM » est l'interdit explicite du lot. Une règle
  // publiée dépourvue de claim produirait un candidat orphelin ; le producteur
  // l'écarte, et ce banc refuse qu'elle existe.
  it('aucune règle publiée n’est dépourvue de claim, de déclencheur ou de motif', () => {
    const publiees = PRIORITY_RULES_V1.filter(regle => regle.statut === 'publiee');
    expect(publiees.length).toBeGreaterThan(1);
    for (const regle of publiees) {
      expect(regle.justificationClaims.length, `${regle.id} sans claim`).toBeGreaterThan(0);
      expect(regle.declencheurs.length, `${regle.id} sans déclencheur`).toBeGreaterThan(0);
      expect(regle.libelle.trim().length).toBeGreaterThan(0);
      expect(regle.motif.trim().length).toBeGreaterThan(40);
      expect(regle.needIds.length, `${regle.id} sans besoin visé`).toBeGreaterThan(0);
      for (const needId of regle.needIds) {
        expect(needId).toBeGreaterThanOrEqual(1);
        expect(needId).toBeLessThanOrEqual(12);
      }
    }
  });

  it('les identifiants et les priorités intrinsèques sont uniques', () => {
    const ids = PRIORITY_RULES_V1.map(regle => regle.id);
    expect(new Set(ids).size).toBe(ids.length);
    const priorites = PRIORITY_RULES_V1.map(regle => regle.priorite);
    expect(new Set(priorites).size).toBe(priorites.length);
  });
});

describe('priorityRulesV1 — ce que les règles lisent existe vraiment', () => {
  const definitionPlaintes = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[CANAL_PLAINTE];

  // Le canal de plainte doit être au RIDEAU T0 : une table qui se déclencherait
  // sur un instrument non exigé à la confirmation ne produirait de candidats que
  // par hasard, et son abstention `required` deviendrait le cas ordinaire.
  it('le canal de plainte est un instrument du rideau T0', () => {
    expect([...RIDEAU_T0]).toContain(CANAL_PLAINTE);
  });

  // LE MODE DE PANNE QUE CE BANC EXISTE POUR ATTRAPER. Les règles citent un
  // sous-score par son identifiant (`digestion`). Un identifiant retouché dans
  // `questions.ts` ferait taire la règle sans casser quoi que ce soit : plus
  // aucun candidat, aucune erreur, aucun test rouge.
  it('chaque domaine cité existe dans le catalogue', () => {
    const domaines = new Set<string>(
      (definitionPlaintes?.scoring?.domains ?? []).map((domaine: { id: string }) => domaine.id),
    );
    expect(domaines.size).toBe(7);
    let cites = 0;
    for (const regle of PRIORITY_RULES_V1) {
      for (const declencheur of regle.declencheurs) {
        if (declencheur.type === 'drapeau') continue;
        expect(declencheur.idQuestionnaire).toBe(CANAL_PLAINTE);
        expect(declencheur.sousScore, `${regle.id} ne cite aucun domaine`).toBeDefined();
        cites += 1;
        expect(domaines, `${regle.id} cite un domaine inconnu : ${declencheur.sousScore}`)
          .toContain(declencheur.sousScore);
      }
      if (regle.domainePlainte !== null) {
        expect(domaines, `${regle.id} se classe sur un domaine inconnu`).toContain(regle.domainePlainte);
      }
    }
    expect(cites).toBeGreaterThanOrEqual(2);
  });

  // AUCUN SEUIL NEUF N'ENTRE DANS LE DÉPÔT ([[D-054]], arbitrage 8). La valeur 7
  // n'est pas choisie ici : c'est la borne basse de la bande « Intensité
  // élevée » que `questions.ts` publie, et c'est déjà celle que la table
  // d'orientation SIGNÉE cite sur ce même instrument. Une recalibration de la
  // grille fait rougir ce cas — et c'est ce qu'on lui demande : elle rouvrirait
  // un arbitrage clinique.
  it('la valeur comparée est la borne publiée des deux bandes hautes', () => {
    const bandes = definitionPlaintes?.scoring?.interpretation as { min: number; max: number; label: string }[];
    expect(Array.isArray(bandes)).toBe(true);
    const hautes = bandes.filter(bande => bande.min >= 7).map(bande => bande.label);
    expect(hautes).toEqual(['Intensité élevée', 'Intensité très élevée']);
    // La valeur immédiatement inférieure appartient à une bande que les règles
    // ne visent PAS : sans ce second terme, un `>= 6` passerait le premier.
    expect(bandes.find(bande => bande.min <= 6 && bande.max >= 6)?.label).toBe('Intensité modérée');

    for (const regle of PRIORITY_RULES_V1) {
      for (const declencheur of regle.declencheurs) {
        if (declencheur.type !== 'comparaison') continue;
        expect(declencheur.operateur).toBe('>=');
        expect(declencheur.valeur, `${regle.id} ne cite pas la borne publiée`).toBe(7);
      }
    }
  });
});

describe('priorityRulesV1 — règles écartées', () => {
  // Une règle écartée reste lisible avec son motif ([[D-042]], repris par
  // [[D-053]] puis [[D-054]]) : ce banc empêche qu'elle se vide en une ligne de
  // titre. `Q_MOD_03` porte sept domaines et la V1 n'en couvre que deux :
  // l'écart doit se voir.
  it('chaque règle écartée porte un motif et une condition de retour', () => {
    expect(PRIORITY_RULES_ECARTEES_V1.length).toBeGreaterThanOrEqual(4);
    for (const ecartee of PRIORITY_RULES_ECARTEES_V1) {
      expect(ecartee.motif.length, `${ecartee.id} sans motif étayé`).toBeGreaterThan(80);
      expect(ecartee.conditionDeRetour.length).toBeGreaterThan(40);
    }
  });

  it('une règle écartée n’est pas aussi une règle publiée', () => {
    const publiees = new Set(PRIORITY_RULES_V1.map(regle => regle.id));
    for (const ecartee of PRIORITY_RULES_ECARTEES_V1) {
      expect(publiees).not.toContain(ecartee.id);
    }
  });
});

describe('priorityRulesV1 — verrou fail-closed', () => {
  function plaintes(valeurs: Record<string, number>): Map<string, ReponseOrientation> {
    return new Map([[CANAL_PLAINTE, {
      idQuestionnaire: CANAL_PLAINTE,
      dateReponse: '2026-01-01T00:00:00.000Z',
      scores: {
        type: 'plaintes_actuelles',
        total: 26,
        subScores: Object.entries(valeurs).map(([id, total]) => ({ id, label: id, total, max: 10 })),
      },
    }]]);
  }

  const DOSSIER_QUI_DECLENCHE = plaintes({
    fatigue: 2, douleurs: 2, digestion: 8, surpoids: 9, sommeil: 2, moral: 2, mobilite: 1,
  });

  // LE CAS QUI COMPTE POUR LA PRODUCTION : table non signée ⇒ RIEN, même sur un
  // dossier qui déclencherait tout. C'est ce qui rend le merge invisible.
  it('table non signée ⇒ aucune règle validée, aucun déclenchement', () => {
    expect(reglesPrioritesValidees()).toEqual([]);
    expect(evaluerPriorites(DOSSIER_QUI_DECLENCHE)).toEqual([]);
  });

  it('table signée ⇒ les deux règles se déclenchent et portent leurs conditions', () => {
    simulerSignature();
    const declenchees = evaluerPriorites(DOSSIER_QUI_DECLENCHE);
    expect(declenchees.map(d => d.regle.id).sort()).toEqual(['PRIO-DIG-01', 'PRIO-PON-01']);
    for (const declenchee of declenchees) {
      expect(declenchee.conditions.length).toBe(declenchee.regle.declencheurs.length);
      expect(declenchee.conditions[0]).toContain(CANAL_PLAINTE);
    }
  });

  // UN OBJET DE SCORE N'EST PAS UNE MESURE — le piège du dépôt. Un domaine sans
  // réponse rend `total: null` : la règle ne se déclenche pas, et surtout elle ne
  // lit pas cette absence comme une plainte faible (`DC-24`).
  it('un domaine sans réponse ne déclenche rien, et n’est pas lu comme un zéro', () => {
    simulerSignature();
    const partiel = new Map([[CANAL_PLAINTE, {
      idQuestionnaire: CANAL_PLAINTE,
      dateReponse: '2026-01-01T00:00:00.000Z',
      scores: {
        type: 'plaintes_actuelles',
        total: null,
        subScores: [
          { id: 'digestion', label: 'Digestion', total: null, max: 10 },
          { id: 'surpoids', label: 'Surpoids', total: 9, max: 10 },
        ],
      },
    }]]);
    expect(evaluerPriorites(partiel).map(d => d.regle.id)).toEqual(['PRIO-PON-01']);
  });

  // Une plainte MODÉRÉE ne déclenche pas : c'est tout le sens de la borne.
  it('une plainte en bande modérée ne déclenche aucune règle', () => {
    simulerSignature();
    expect(evaluerPriorites(plaintes({ digestion: 6, surpoids: 6 }))).toEqual([]);
  });

  it('table signée ⇒ les règles validées portent la table, sa version et son sha', () => {
    simulerSignature();
    const validees = reglesPrioritesValidees();
    expect(validees.map(regle => regle.ruleId).sort()).toEqual(['PRIO-DIG-01', 'PRIO-PON-01']);
    for (const regle of validees) {
      expect(regle.lifecycle).toBe('clinically_validated');
      expect(regle.version).toBe(PRIORITY_RULES_METADATA.version);
      expect(regle.validation.validatorRole).toBe('practitioner');
      // Date ISO CANONIQUE : `buildClinicalReview` la refuse autrement, et la
      // revue entière échouerait le jour de la signature.
      expect(new Date(regle.validation.validatedAt).toISOString()).toBe(regle.validation.validatedAt);
      expect(regle.validation.sourceReference).toContain(PRIORITY_RULES_METADATA.version);
      expect(regle.validation.sourceReference).toContain(PRIORITY_RULES_SHA256);
      expect(regle.validation.sourceReference).toContain(regle.ruleId);
    }
  });

  // TOUTES LES RÈGLES PUBLIÉES, ET NON LES SEULES DÉCLENCHÉES : `rules` décrit
  // le référentiel sous lequel la revue a été produite. C'est aussi ce qui permet
  // à l'abstention de citer une règle validée sur un dossier où rien ne se
  // déclenche.
  it('les règles validées ne dépendent pas du dossier', () => {
    simulerSignature();
    expect(reglesPrioritesValidees().length).toBe(
      PRIORITY_RULES_V1.filter(regle => regle.statut === 'publiee').length,
    );
  });
});

describe('priorityRulesV1 — verrou de contenu', () => {
  // ÉPINGLAGE PAR LITTÉRAL, et non par recalcul. La constante et son contenu
  // bougent ensemble : comparer l'une à l'autre ne garde rien. C'est ce
  // littéral-ci qui rougit quand une règle est retouchée, et la sortie de secours
  // est de RE-SIGNER, jamais de mettre le sha à jour en silence.
  // LE PÉRIMÈTRE A GRANDI le 2026-08-16 ([[D-062]]) : la procédure d'abstention
  // y est entrée, et le sha a donc changé. L'ancienne valeur
  // (`4b51c649…7448042`) couvrait `PRIORITY_RULES_V1` seule.
  //
  // METTRE CE LITTÉRAL À JOUR NE VAUT PAS SIGNATURE. Le commentaire d'origine
  // le dit et il reste vrai : la sortie de secours est de RE-SIGNER. La
  // métadonnée porte encore `dateValidation: '2026-08-15T00:00:00.000Z'`, posée
  // sur l'ANCIEN périmètre — la re-signature est due, et [[D-062]] la nomme
  // comme dette ouverte.
  const SHA_CONTENU_2026_08_16 = 'cfd9b876e594d3298b35890e8c4827af15d88143fe03c594ff89c93ffd511ab4';

  it('le sha publié correspond au contenu signé — règles ET procédure d’abstention', () => {
    expect(PRIORITY_RULES_SHA256).toBe(
      sha256(JSON.stringify({ regles: PRIORITY_RULES_V1, abstention: ABSTENTION_PROCEDURE_V1 })),
    );
  });

  it('le contenu de la table est exactement celui qui a été relu', () => {
    expect(PRIORITY_RULES_V1.length).toBe(2);
    expect(PRIORITY_RULES_SHA256).toBe(SHA_CONTENU_2026_08_16);
  });

  // CE QUE [[D-062]] FERME : le verdict d'abstention est désormais DÉCRIT par
  // des données signées. Sans ce banc, rien ne dirait que les textes servis au
  // praticien viennent de la table et non de littéraux du moteur.
  it('la procédure d’abstention est couverte par le sha, motifs et textes compris', () => {
    const avant = PRIORITY_RULES_SHA256;
    const mute = {
      regles: PRIORITY_RULES_V1,
      abstention: { ...ABSTENTION_PROCEDURE_V1, cadre: 'texte retouché' },
    };
    expect(sha256(JSON.stringify(mute))).not.toBe(avant);
  });

  // AUCUN MOTIF SANS DOCTRINE : la provenance est doctrinale et non
  // bibliographique, mais elle n'est jamais absente (`DC-26`).
  it('chaque motif d’abstention cite au moins une règle de la constitution', () => {
    for (const motif of [...ABSTENTION_PROCEDURE_V1.motifsRequired, ABSTENTION_PROCEDURE_V1.notRequired]) {
      expect(motif.doctrine.length).toBeGreaterThan(0);
      expect(motif.limitation.length).toBeGreaterThan(0);
    }
  });
});

// LE MOTEUR LIT CETTE TABLE PAR IDENTITÉ, PLUS PAR POSITION (finding M1 de la
// revue du 2026-08-16). `chaineC1.ts` déstructurait `motifsRequired` dans
// l'ordre du tableau : permuter les deux motifs servait le texte SÉCURITÉ sur la
// branche canal et réciproquement, et un motif inséré en tête était ignoré en
// silence. Ces cas tiennent le contrat des deux côtés — les `id` que la table
// porte, et le motif que le moteur sert.
//
// LA BRANCHE SÉCURITÉ EST INATTEIGNABLE EN PRODUCTION, et c'est dit plutôt que
// supposé : `construireChaineC1` pose `safetyFindings: 0` en dur, aucun
// producteur de constat déterministe n'existant. `evaluerAbstention` est donc
// appelée directement — sans quoi la sélection du motif sécurité ne serait
// éprouvée par rien.
describe('procédure d’abstention — le moteur lie les motifs par identité', () => {
  /**
   * La table permutée ou amputée le temps d'un cas, TOUJOURS restaurée.
   *
   * `as const` garde l'immuabilité au type, pas au runtime : le cast est
   * l'outil du banc, jamais celui du moteur. Sans restauration, le verrou de
   * contenu ci-dessus rougirait — le sha porte sur cette table.
   */
  function surTableMutee(mutation: (motifs: MotifAbstention[]) => void, cas: () => void): void {
    const motifs = ABSTENTION_PROCEDURE_V1.motifsRequired as unknown as MotifAbstention[];
    const original = [...motifs];
    try {
      mutation(motifs);
      cas();
    } finally {
      motifs.splice(0, motifs.length, ...original);
    }
  }

  it('motifsRequired porte exactement les deux id que le moteur cite', () => {
    expect(ABSTENTION_PROCEDURE_V1.motifsRequired.map(motif => motif.id))
      .toEqual(['ABST-SEC-01', 'ABST-CAN-01']);
  });

  it('le motif SÉCURITÉ est servi même table permutée', () => {
    surTableMutee(motifs => motifs.reverse(), () => {
      // Anti-vacuité : sans cet écart, le cas passerait sur la table d'origine.
      expect(ABSTENTION_PROCEDURE_V1.motifsRequired[0].id).toBe('ABST-CAN-01');
      const verdict = evaluerAbstention({
        ruleIds: ['PRIO-DIG-01'],
        safetyFindings: 1,
        canalMesure: true,
      });
      expect(verdict?.status).toBe('required');
      expect(verdict?.limitations.join(' ')).toContain('constat de sécurité');
      expect(verdict?.limitations.join(' ')).not.toContain(CANAL_PLAINTE);
    });
  });

  // ERREUR DE CONSTRUCTION, PAS CAS CLINIQUE : un motif retiré de la table
  // signée sans que le moteur suive ne doit jamais servir une limitation vide
  // sous un verdict d'abstention.
  it('un motif que la table ne porte plus fait jeter, jamais servir un texte vide', () => {
    surTableMutee(motifs => { motifs.splice(0, 1); }, () => {
      expect(() => evaluerAbstention({
        ruleIds: ['PRIO-DIG-01'],
        safetyFindings: 0,
        canalMesure: true,
      })).toThrow('ABST-SEC-01');
    });
  });
});
