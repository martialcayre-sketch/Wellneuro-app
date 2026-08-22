import { createHash } from 'crypto';

export const CORPUS_CLINIQUE_SYNTHESE_V1 = `## Référentiel clinique SIIN — Snapshot V1

### Cadre de prudence clinique

- Les questionnaires orientent l'entretien clinique mais ne posent pas de diagnostic.
- Toute interprétation doit rester formulée comme hypothèse à explorer et à confirmer par le praticien.
- Les données transmises peuvent être incomplètes; cette limite doit être explicitement signalée.
- Aucun dosage, ajout, arrêt, ni modification de traitement ne peut être proposé.

### Axes d'analyse

- Stress / axe HPA: repérer les signaux compatibles avec une charge allostatique élevée ou une récupération insuffisante.
- Sommeil: distinguer difficulté d'endormissement, réveils nocturnes, somnolence diurne et sommeil non réparateur.
- Neurotransmetteurs: utiliser DNSM comme indicateur d'orientation clinique, jamais comme preuve causale.
- Digestion / intestin-cerveau: considérer les troubles digestifs comme un facteur possible à confronter à l'anamnèse.
- Inflammation / immunité: intégrer les signaux d'hyperexcitabilité et de douleur diffuse comme points de vigilance.
- Energie / fatigue: rechercher un tableau multifactoriel (sommeil, stress, alimentation, charge mentale).
- Humeur / cognition: relier les éléments psychométriques au contexte de vie, sans conclusion ferme.

### Heuristiques de croisement

- Stress élevé + sommeil dégradé + fatigue: hypothèse d'une priorité clinique sur la récupération.
- Troubles digestifs + fatigue + humeur basse: hypothèse d'un axe intestin-cerveau à explorer.
- Somnolence diurne + suspicion apnée: point de vigilance et orientation médicale à prioriser.
- Hyperexcitabilité + crampes + migraines: signal compatible avec un terrain de vulnérabilité à investiguer.

### Règles de formulation

- Utiliser les formulations: "signal compatible", "hypothèse à explorer", "à confirmer en entretien".
- Eviter toute causalité affirmée sans confirmation clinique et, si pertinent, biologique.
- Distinguer strictement repérage, hypothèse et diagnostic.
`;

export type CorpusCliniqueMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  /**
   * SHA du périmètre effectivement relu à la signature — patron [[D-063]],
   * régime [[D-067]], étendu à cette table par [[D-084]]. LITTÉRAL FIGÉ,
   * jamais la constante calculée : une retouche de la prose change
   * `CORPUS_CLINIQUE_SHA256`, la concordance casse et le verrou d'activation
   * se ferme seul (`lib/anthropic.ts`). `null` tant que rien n'a été relu.
   */
  shaPerimetre: string | null;
};

/*
 * Signée le 2026-08-22 (D-082) : validation clinique du responsable, rendue
 * en session après relecture intégrale du corpus — contenu inchangé au
 * caractère près, seule la métadonnée bouge (DC-17 : ce fichier est du
 * clinique, pas du code).
 *
 * Provenance (arbitrage du 2026-08-22, question 3 de la revue — D-084) : la
 * relecture a porté sur CE texte lui-même, rédigé au dépôt le 2026-07-10 ;
 * aucun document source SIIN n'est épinglé. La signature du responsable vaut
 * provenance, et « SIIN » au titre désigne l'école méthodologique, pas un
 * document. Un document source, s'il est épinglé un jour, s'ajoutera par
 * nouvelle version — jamais par retouche.
 */
export const CORPUS_CLINIQUE_METADATA: CorpusCliniqueMetadata = {
  version: 'corpus-clinique-v1',
  validationExterne: true,
  dateValidation: '2026-08-22T00:00:00.000Z',
  // Posé le 2026-08-22 (D-084, question 4 de la revue) : la chaîne hex que
  // `CORPUS_CLINIQUE_SHA256` valait à la relecture de D-082, recalculée puis
  // recopiée telle quelle — JAMAIS la constante (déclarée après cet objet ;
  // la comparaison serait tautologique). Même jour que la signature : le
  // périmètre relu est celui-là.
  shaPerimetre: '19a554786075d608db033c7354b720f8b35ed6e1889ae5595979b75ce2f68fee',
};

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export const CORPUS_CLINIQUE_SHA256 = sha256(CORPUS_CLINIQUE_SYNTHESE_V1);
