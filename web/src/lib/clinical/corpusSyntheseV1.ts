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
};

export const CORPUS_CLINIQUE_METADATA: CorpusCliniqueMetadata = {
  version: 'corpus-clinique-v1',
  validationExterne: false,
  dateValidation: null,
};

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export const CORPUS_CLINIQUE_SHA256 = sha256(CORPUS_CLINIQUE_SYNTHESE_V1);
