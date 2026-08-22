### Campagnes — le Socle de restitution sûre s'ouvre en primaire, cadré sur mesures

- La campagne `2026-08-21-socle-restitution-sure` (le gate des campagnes 6.0)
  passe d'init-only à ouverte : CAMPAGNE.md et trois lots écrits le
  2026-08-22, sur un état réel **re-mesuré** (workflow de vérification, cinq
  constats du brief confrontés au dépôt, citations `fichier:ligne`).
- **Le cadrage corrige le brief sur cinq points** : le booklet et le courrier
  médecin ont déjà leurs gardes (`termeAnxiogene` confirmable,
  `assertRenduMedecinNonPrescriptif` au chokepoint de rendu) — les dettes
  réelles sont la garde de synthèse **journalisante et à point unique** et le
  bilan portail servi **sans re-vérification** ; deux tables signées omises
  (`contradictionsV1`, `indicationsBiologieV1`) et une troisième signée
  pendant l'ouverture même (`corpusSyntheseV1`, `D-082`) quand
  `questions.ts`/`equilibre/constants` ne sont pas signées ; la correction
  d'en-tête d'`orientationRulesV1` n'a jamais été actée par `D-042` et
  touchera un sha épinglé (geste clinique sous `D-xxx`) ; le patron trust n'a
  ni deux dates ni chaîne de hash ; huit gabarits patient dont cinq inline,
  la contrainte « aucune donnée de santé » tenue par le seul banc de relance.
- Lots : LOT-01 couverture des chemins sortants (bancs de débranchement +
  re-vérification du bilan portail, aucun verdict changé sans décision) ;
  LOT-02 hook « demande » sur les huit fichiers cliniques + en-tête ;
  LOT-03 registre de gabarits (`DC-26`), écarts déclarés, contenus intacts.
- File d'attente et état resynchronisés (`activate` + `sync`, `next_action`
  tracé). Purge au passage de 21 doublons « fichier 2.md » identiques à leur
  original (artefacts de duplication locale, zéro divergent).
