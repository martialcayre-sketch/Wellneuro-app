### Ajouté

- **Un épisode T0 ne se confirme plus sur un dossier vide** (`D-052`). L'API
  vérifie trois **conditions dures**, recalculées depuis la base et jamais lues
  dans le corps de requête : premier rideau renseigné et cotable
  (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01`), anamnèse consignée avec un
  motif principal, synthèse validée par le praticien et postérieure à la
  dernière passation du rideau. Refus en **422**, message français nommant ce
  qui manque. Deux **conditions souples** (passation ambiguë du rideau,
  contradictions ouvertes) se contournent avec un motif obligatoire, tracé dans
  le payload d'épisode — auteur et horodatage posés par le serveur, puis
  recoupés contre la session aux deux points de persistance.
- Le panneau de confirmation affiche la checklist : conditions dures cochées ou
  bloquantes, avertissements avec case « je confirme malgré » et motif. Ce qui
  n'est pas requis pour un T0 (biologie, agendas, journal) est **nommé**, y
  compris `Q_SOM_09`, qui figure au pack de base mais court sur 21 nuits.

### Le fond du sujet : « VALID » ne prouvait rien

- La migration du LOT-00 a posé `statut_validite TEXT NOT NULL DEFAULT 'VALID'`,
  ce qui a estampillé `VALID` **toutes** les lignes existantes. Lecture de
  production du 2026-08-12 : **105 passations, toutes `VALID`, aucune autre
  valeur**, et la route d'invalidation rend 503 tant que
  `WN_ENABLE_VALIDITE_PASSATIONS` est éteint. Une condition dure « la passation
  est `VALID` » aurait donc été **tautologique** — un défaut de colonne
  présenté comme un jugement clinique, ce que `DC-24` interdit.
- La condition retenue ne s'y appuie pas : la passation doit exister, son statut
  ne doit pas être exclu du raisonnement (`statutExcluDuRaisonnement`,
  indépendant du drapeau, prévu pour **désigner** et non pour filtrer), et le
  recalcul doit rendre **une mesure** — un score coté (`scored`, `total`), et
  pas seulement un objet non-`null`. **C'est ce troisième terme, et lui seul,
  qui mord aujourd'hui.**
- **Ce terme a dû être écrit deux fois** : la première rédaction testait
  `!== null`, or `calculateScore` rend `{ scored: false, total: null }` sur une
  passation sans réponse lisible. Quatre passations **sans une seule réponse**
  satisfaisaient donc « rideau complet » — et le T0 est irrévocable. Trouvé en
  revue avant merge, refermé et tenu par deux bancs (passation vide ; réponses
  aux clés étrangères à la définition, le cas `Q_ALI_01` `AL*`/`SIIN*`).
- La condition **n'exige pas** que chaque item soit répondu : un instrument
  partiellement renseigné mais cotable passe. Le libellé affiché dit donc
  « renseigné et cotable », et non « complet ».
- Les deux conditions souples sont **muettes en production**, et c'est écrit
  plutôt que masqué : aucune passation ne peut porter `AMBIGUOUS` drapeau
  éteint, et le service de contradictions rend une liste vide tant que la table
  n'est pas signée. Elles sont câblées et tenues par des bancs pour que le
  chemin existe le jour de l'allumage.

### Trois autres défauts trouvés en revue avant merge

- **La trace de contournement était forgeable par le navigateur.** Les deux
  points de persistance ne vérifiaient que la présence d'un motif : l'auteur et
  l'horodatage arrivaient du client et étaient persistés tels quels. Ils sont
  désormais recoupés champ par champ contre la session, et un contournement
  visant une condition qui n'est pas en défaut est refusé.
- **La porte se désactivait en déclarant un autre jalon.** `milestone` vient du
  corps de requête ; déclarer `J21` sur l'identifiant du T0 ouvrait la porte, et
  l'écriture étant un `upsert(..., update: {})`, l'identifiant T0 du patient
  était squatté définitivement. Le jalon est maintenant dérivé du suffixe de
  `assessmentEpisodeId` quand il l'est.
- **La condition de synthèse lisait la dernière ligne, tous statuts confondus.**
  Régénérer une synthèse pour la relire bloquait le T0 avec « Aucune synthèse
  validée par le praticien » — faux. La lecture porte désormais le filtre de
  statut, partagé avec le module qui juge.

### Impact mesuré sur le parc, avant merge

- Au 2026-08-12, sur **19 patients** de production : **10** portent le rideau
  complet et une anamnèse validée avec motif, **8 satisfont les trois
  conditions dures** (les 2 autres échouent sur la fraîcheur de la synthèse).
  Une porte qui aurait tout fermé aurait été une régression, pas une garde — le
  chiffre est au dossier plutôt que découvert après merge.

### Écarté

- **La condition souple « suggestions d'orientation ni renseignées ni
  écartées »**, retirée du lot : « écartée » n'existe nulle part et la créer
  demanderait une persistance nouvelle, donc une migration. Livrée dégradée en
  « des suggestions restent non renseignées », elle aurait produit un
  avertissement non acquittable, affiché à chaque T0 — un avertissement qu'on ne
  peut pas éteindre est un avertissement qu'on apprend à ignorer.
- **Faire dériver le rideau du pack de base.** Le pack est éditable depuis l'UI
  et une divergence registre↔pack a déjà été journalisée le 2026-08-03 : une
  règle clinique se déplacerait alors par un geste administratif (`DC-26`).
- **Exiger la forme longue de `Q_ALI_01`.** Plus exigeant, mais le T0
  deviendrait inconfirmable partout où `WN_ALI_01_SIIN57` est éteint — soit
  partout aujourd'hui.

### Réserves nommées

- Le lot **ne rend pas le T0 corrigible** : l'identifiant d'épisode est
  déterministe et la persistance est un `upsert(..., update: {})`. Il durcit une
  porte à sens unique, et un T0 confirmé par contournement le reste.
- **Le parcours nominal n'a pas d'E2E** : peupler un patient de seed
  déplacerait l'orientation, les captures visuelles et le garde de
  certification, et les trois patients autorisés sont tous centraux. Le
  parcours E2E existant asserte désormais le **refus** ; le cas nominal est
  couvert par les bancs de route.

### Modifié

- `VERSION_OBJETS_CLINIQUES` : `objets-cliniques-v1` → `v2` (le payload
  d'épisode gagne `preconditionOverrides`). L'étiquette entre dans
  `snapshot.inputHash` → `decisionCard.inputHash` → `draft.inputHash` →
  `versionId`, et dans `assessment_episodes.contract_version`. Aucun hash
  persisté ne bouge pour deux raisons : `assessment_episodes` est **vide** en
  production, et une version de protocole déjà écrite est relue par
  `reconstructProtocolDraft`, qui recalcule son empreinte depuis le payload
  stocké. **Ce qui bougerait sur un fil déjà persisté** — nommé parce que ce
  serait invisible autrement : le premier enregistrement après déploiement
  compterait comme changement clinique sans changement clinique. Zéro fil
  concerné aujourd'hui. Aucune migration.
- `docs/FEATURE_FLAGS.md` documente enfin `WN_ENABLE_VALIDITE_PASSATIONS`,
  absent alors qu'il gâte quatre consommateurs cliniques.
