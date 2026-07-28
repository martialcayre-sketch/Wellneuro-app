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

- **Les instantanés du carnet cessent de se faire passer pour des versions de
  protocole.** Ils vivent dans `protocol_drafts` ; les lectures praticien non
  bornées par un `decisionCardId` les prenaient donc pour des versions. La
  clôture de consultation (`copilote/cloture`) retient le brouillon le plus
  récent comme fil courant : une transmission patient — désormais déclenchable à
  volonté depuis le portail — faisait apparaître au praticien son protocole
  comme **non relu** et sa diffusion comme **caduque**. Trouvé par la revue
  adversariale, prouvé par test exécuté. Un fragment `where` partagé
  (`EXCLURE_INSTANTANES_JA`) est appliqué à `copilote/cloture`,
  `praticien/protocoles`, `copilote/prevol` et `patient/protocole`, avec les
  tests de non-régression correspondants.

- **Le serveur décide seul du cycle auquel une transmission se rattache.**
  `POST /api/portail/ja/observations` confronte l'`episodeId` reçu au protocole
  effectivement diffusé (`resolveProtocoleDiffuse`) et rend un `409` explicite
  sinon. Sans cela, la cohérence vérifiée par le domaine restait **interne au
  corps reçu** : un onglet resté ouvert au travers d'une nouvelle diffusion
  transmettait un instantané parfaitement cohérent avec lui-même, et rattaché
  au cycle périmé.

- **Une trace ne peut plus partir sous un épisode qui n'est pas le sien.** Le
  brouillon local est conservé d'un cycle à l'autre, et l'épisode est résolu de
  façon asynchrone : une trace d'un cycle précédent, ou saisie avant que le
  cycle soit connu, aurait été persistée sous le cycle courant puis rejetée en
  silence à la lecture — `buildPublishedJaFeasibility` lève et
  `getLatestPublishedJaFeasibility` avale l'exception, si bien que la
  faisabilité JA aurait **disparu de la boussole praticien sans message**. Trois
  gardes : la saisie — traces, plans et solutions — n'ouvre qu'une fois le cycle
  résolu, l'envoi ne porte que les éléments du cycle courant, et
  `saveJaObservationSnapshot` refuse l'instantané incohérent. Quand tout le
  brouillon relève d'une période antérieure, la transmission est refusée avec un
  message plutôt que rendue comme un succès à contenu vide.

- **Le volume écrit est borné** (200 éléments par liste). Le lot branche le
  premier client d'une route d'écriture jusqu'ici dormante : sans borne, du JSON
  de navigateur patient entrait sans limite dans `protocol_drafts.payload`, sur
  une implantation non-HDS.

- **Le praticien lit ce que le patient transmet.** Le panneau praticien affiche
  les transmissions reçues (date et comptes, sans interprétation). Sans ce
  lecteur, « Transmettre à mon praticien » promettait un partage sans
  destinataire — de la donnée de santé écrite avant d'avoir un usage. Le filtre
  d'acteur est posé **en base** : appliqué après coup sur une fenêtre de dix
  lignes tous acteurs confondus — chaque activation praticien en écrivant deux —
  le panneau aurait affirmé « aucune transmission du patient » alors qu'il en
  existait.

- **`GET /api/praticien/protocoles` ne renvoie plus les instantanés du carnet.**
  Changement de contrat d'API sans consommateur connu, conséquence de
  l'exclusion ci-dessus.

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
- **`cycleRef` identifie le contenu du protocole, pas la diffusion.** Il dérive
  de `protocolDraftInputHash` : une ré-approbation de la **même** version rendrait
  le même `episodeId` avec une fenêtre différente, confondant deux cycles. Faire
  entrer `approvedAt` dans la dérivation reste à trancher.
- **La transmission ne se ferme pas à `finDeCycle`.** La route portail calcule
  cet état (J21 + 3 j) ; ni le panneau ni la garde de cycle ne s'en servent —
  tant que le protocole reste diffusé, une trace datée d'aujourd'hui part sous
  une fenêtre passée.
- `supersedesDraftId` est contrôlé par le client et seul son **format** est
  vérifié : `supersedes_draft_id` ne porte aucune clé étrangère. Deux appareils
  produisent en outre une fourche, sans règle de résolution.
- La tête de chaîne relue du `sessionStorage` peut être périmée hors ligne, la
  liste serveur ne l'écrasant qu'en cas de succès.
- Un retour arrière vers le déploiement précédent rendrait illisibles les
  épisodes écrits sans `idealPlan` (`nonEmpty` y est inconditionnel). Les lignes,
  elles, subsisteraient.
- Les transmissions affichées au praticien ne portent pas leur cycle :
  « 3 trace(s) » d'un essai antérieur se lit sous le panneau du cycle courant.
- `PatientCard` n'accepte ni ne transmet `data-testid` : l'attribut posé sur la
  carte de décision praticien (`ja-patient-decision-active`) disparaît
  silencieusement du DOM. Hors périmètre de ce lot, mais un test s'appuyant sur
  cet identifiant échouerait sans raison apparente.
