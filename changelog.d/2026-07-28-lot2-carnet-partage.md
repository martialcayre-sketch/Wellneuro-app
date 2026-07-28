### Ajouté

- **Le patient transmet son carnet alimentaire à son praticien** (lot 2, item 4
  du plan révisé du 2026-07-27). `POST /api/portail/ja/observations` était
  complet, authentifié et testé depuis JA5-02 : **aucun client ne l'appelait**.
  Le carnet était une application locale déguisée en carnet partagé — tout
  restait dans le `sessionStorage` du navigateur. Un bouton « Transmettre à mon
  praticien » envoie désormais l'instantané ; le brouillon local n'est pas
  effacé après l'envoi, et les transmissions successives se chaînent par
  `supersedesDraftId`. Le chaînage ne s'établit que sur les instantanés du
  patient : un instantané rédigé par le praticien n'est pas une version
  antérieure du sien.

  **Décision du responsable de traitement, 2026-07-28** : cette écriture est
  active dès le merge, **sans feature flag**. Elle place de la donnée
  alimentaire patient réelle sur l'implantation Vercel/Supabase **non-HDS**,
  avant l'e-signature du DPA Scalingo exigée par D-006, sous la dérogation
  courant jusqu'au 2026-10-21. Arbitrage rendu en connaissance de l'alternative
  (flag `'true'` fail-closed, convention §B de `docs/FEATURE_FLAGS.md`), qui
  aurait séparé le merge de l'activation.

  Portée clinique bornée par le code existant : un instantané patient est écrit
  en `status: 'draft'` avec `actor: 'patient'`, et `activateJaObservationSnapshot`
  refuse d'activer un instantané non praticien. La faisabilité servie au
  praticien (`buildPublishedJaFeasibility` → boussole) ne lit que les
  instantanés `practitioner_reviewed` : **une transmission patient n'atteint
  aucune dérivation clinique sans geste du praticien**.

### Corrigé

- **L'épisode du carnet alimentaire cesse d'être un gabarit** (lot 2, item 5).
  Les deux panneaux fabriquaient un épisode en dur : la même hypothèse de
  méthode et le même « Ajouter une source de protéines au petit-déjeuner »
  servis à tous les patients, avec des plans annonçant être « décidés en
  consultation » sans que rien ne les y relie. L'épisode est désormais dérivé du
  **protocole diffusé** — `purpose` pour l'hypothèse, action principale du
  protocole approuvé pour l'action, date de diffusion pour le début de fenêtre.
  Sans protocole diffusé, **il n'y a pas d'épisode** : le panneau patient le dit
  et laisse la saisie ouverte en local, le panneau praticien refuse d'activer
  une décision JA. C'est l'état de tous les patients aujourd'hui — le gabarit
  n'affichait une action que parce qu'il l'inventait.

- **Trois défauts d'identité et de fenêtre tombent avec lui.** La fenêtre était
  de **7 jours en dur**, recalculée à chaque montage du composant, alors que les
  jalons de décision valent `J7 | J14 | J21` : elle couvre désormais 21 jours à
  partir de la diffusion. L'`episodeId` patient était `ja_${idPatient}` — un
  seul épisode possible par patient, deux essais successifs indiscernables ; il
  porte maintenant la référence du cycle. Enfin, patient et praticien
  produisaient **deux identifiants différents pour le même épisode**
  (`ja_${id}` contre `ja_praticien_${id}`) : sans conséquence tant que personne
  n'écrivait, mais l'écriture patient est désormais branchée. Les deux surfaces
  partagent la même dérivation.

- `idealPlan` devient facultatif dans l'action d'un épisode JA. La vue patient
  du protocole exclut délibérément `idealPlan` et `rescuePlan` ; l'exiger était
  précisément ce qui obligeait le gabarit à en inventer un. Aucun consommateur
  ne le lisait hors de cette validation, et les payloads historiques restent
  lisibles — pas de bump du contrat de schéma.

- `GET /api/portail/protocole` expose deux champs patient-safe supplémentaires,
  `cycleRef` (préfixe opaque du hash d'ancrage) et `debutCycle` (date
  d'approbation), qui donnent au carnet son identité de cycle. `GET
  /api/praticien/ja/cycle` en est le miroir côté praticien, sous la garde
  d'appartenance habituelle : aucune donnée nouvelle n'est exposée, ni au
  patient ni au praticien.

### Réserves ouvertes

- **Le sort du cycle protocole → épisode n'est pas tranché** (lot 2, item 6).
  Instruit sans décision dans
  `docs/claude/propositions/2026-07-28-cycle-protocole-episode/`. À retenir : la
  chaîne n'est pas absente, elle est **complète et inutilisée**, et trois points
  morts l'expliquent — `POST /api/praticien/cockpit` ne persiste pas l'épisode
  confirmé et l'annonce lui-même, `POST /api/praticien/protocoles` n'a aucun
  appelant, `protocol_review_flags` n'a ni écriture ni relation.
- La transmission n'est pas idempotente : `saveJaObservationSnapshot` dérive son
  identifiant de l'instant de capture, si bien que deux envois du même contenu
  produisent deux lignes. Seule la désactivation du bouton pendant l'envoi
  protège du double clic.
- `PatientCard` n'accepte ni ne transmet `data-testid` : l'attribut posé sur la
  carte de décision praticien (`ja-patient-decision-active`) disparaît
  silencieusement du DOM. Hors périmètre de ce lot, mais un test s'appuyant sur
  cet identifiant échouerait sans raison apparente.
