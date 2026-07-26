### Durcissement HDS — décision de journalisation de l'agenda (A4) et tests d'autorisation (A5) (2026-07-26)

Deux lots de la checklist de finalisation HDS (`docs/claude/propositions/2026-07-24-audit-migration-hds/`), sans effet fonctionnel.

- **A4 (exig. 5, journal des accès aux dossiers)** — le `GET` agenda `rendez-vous`
  est **délibérément non journalisé** : c'est une liste opérationnelle (comme
  `patients`, `fil`, `metrics`), pas la lecture d'un dossier de santé nommé — il
  lit des enregistrements de planification et des noms, jamais réponses/synthèse/
  consultations, et le `motif` est une note d'agenda du praticien. Décision
  documentée dans la route, et **surface d'exposition verrouillée par un test**
  (si un champ clinique y apparaissait, le test échouerait). Révocable par le
  responsable du traitement.
- **A5 (exig. 7, tests de sécurité)** — 13 routes praticien authentifiées qui
  n'avaient **aucun** test reçoivent un test d'autorisation « sans session →
  401 » (dont `metrics`, `patients-pg`, `trust`, qui portent de la donnée
  patient ; et les routes corpus/catalogue). Combler ce trou est l'objet du lot.
