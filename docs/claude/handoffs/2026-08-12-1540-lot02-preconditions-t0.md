# LOT-02 — les préconditions de confirmation T0, et les quatre bloquants de la revue

- **Branche** : `lot-02-preconditions-t0`, vivante, non mergée. Partie de
  `8c0d4218`, `origin/main` contenu.
- **Campagne** : chaîne T0 opérationnelle — LOT-02. LOT-01 clos le même jour.
- **Décision** : `D-052`, écrite avant la première ligne de code (`DC-17`).

## Ce que le lot livre

La confirmation d'un épisode T0 est un point de décision outillé. Trois
conditions **dures** recalculées depuis la base par les trois routes
(`cockpit`, `protocoles`, `protocoles/versions`), refus en **422** ; deux
conditions **souples** contournables avec motif obligatoire, tracé dans le
payload d'épisode. Checklist à l'écran, ce qui n'est pas requis étant nommé.
Aucune migration.

## Les deux hypothèses de la spec que le dépôt a démenties

- **`VALID` ne prouve rien.** La migration du LOT-00 a estampillé `VALID`
  toutes les lignes par défaut de colonne : 105 passations en production,
  aucune autre valeur, et la route d'invalidation rend 503 drapeau éteint.
  Exiger `VALID` aurait été tautologique (`DC-24`).
- **« Suggestion d'orientation écartée » n'existe pas** et exigerait une
  migration : condition souple retirée du lot, sans lot d'accueil.

## Les quatre bloquants de la revue — tous réels, tous refermés

1. **`scores !== null` n'est pas « est une mesure ».** `calculateScore` rend
   `{ scored: false, total: null, raisonNonScore }` sur une passation sans
   réponse lisible. **Quatre passations vides satisfaisaient « rideau
   complet »**, et le T0 est irrévocable. Le prédicat lit désormais
   `scored`/`total`. Deux bancs : passation vide, et clés étrangères à la
   définition (le cas `Q_ALI_01` `AL*`/`SIIN*` de `D-051`).
2. **La trace de contournement était forgeable par le navigateur** : seule la
   présence d'un motif était vérifiée, l'auteur et l'horodatage arrivaient du
   client et étaient persistés tels quels. Ils sont recoupés champ par champ
   contre la session — **vérifiés, pas réécrits** : réécrire ferait diverger
   l'épisode de celui qui a été haché dans `snapshot.inputHash`.
3. **La porte se désactivait en déclarant un autre jalon.** `milestone` vient
   du corps de requête ; déclarer `J21` sur l'identifiant du T0 l'ouvrait, et
   l'`upsert(..., update: {})` squattait définitivement l'identifiant T0. Le
   jalon est dérivé du suffixe de `assessmentEpisodeId` quand il l'est.
4. **La synthèse était lue sans filtre de statut.** Régénérer une synthèse pour
   la relire bloquait le T0 avec « Aucune synthèse validée par le praticien » —
   faux. Le filtre est partagé avec le module qui juge.

## La leçon exécutable, à ne pas repayer

Sur ce dépôt, **`calculateScore` ne rend jamais `null` sur le catalogue** : ses
chemins d'échec passent par `{error}` ou par la garde de passation vide, qui
rend un objet. Tout prédicat d'exploitabilité écrit ici doit lire `scored` et
`total`, jamais la seule non-nullité. `hasExploitableRawAnswers`
(`clinicalSnapshot.ts`) porte la variante stricte, item par item.

## Impact mesuré sur le parc, avant merge

19 patients de production : **10** portent le rideau complet et une anamnèse
validée avec motif, **8 satisfont les trois conditions dures** (les 2 autres
échouent sur la fraîcheur de la synthèse). La mesure porte sur la présence des
passations, pas sur leur cotabilité — elle majore donc légèrement.

## Tests

T1 vert. T3 complet joué avant les corrections : Vitest 394 fichiers /
4 510 tests verts, `court14` vert dans les deux positions du drapeau
`Q_ALI_01`, contrats SQL et certification scoring verts ; E2E 135 verts et
**1 rouge**, `visual.spec.ts:159` (portail, iPhone 13) — `page.goto` expiré
sans qu'aucune requête HTTP ne parte, blocage navigateur `D-049`, étranger au
diff. T3 de contrôle rejoué après les corrections. Le CI fait autorité sur le
segment E2E.

## Ce qui reste ouvert

- **Le T0 reste irrévocable** : identifiant déterministe et
  `upsert(..., update: {})`. Le lot durcit une porte à sens unique ; un T0
  confirmé par contournement le reste. La correction ou ré-ouverture n'a pas de
  lot d'accueil.
- **Le parcours nominal n'a pas d'E2E** : peupler un patient de seed
  déplacerait `orientation-file-envoi`, `fiche-detail-reponses`, la capture
  pixel `visual.spec:93` et `seedCertification.guard`, et les trois patients
  autorisés sont tous centraux. `mode-consultation.spec.ts` asserte désormais
  le **refus** ; le nominal est couvert par les bancs de route.
- **Les deux conditions souples sont muettes en production** (drapeaux éteints)
  : câblées et tenues par bancs pour le jour de l'allumage.
- **`POST /api/praticien/protocoles` n'a aucun appelant applicatif** — le seul
  point de persistance vivant est `/versions`.
- **Vigilances de synthèse du LOT-01** (étape 5) : renvoyées, sans lot
  d'accueil.
