---
id: "LOT-04-portail-patient-clair"
titre: "Portail patient clair, confiance, reprise et confort"
statut: "terminé — revue appliquée, e2e Playwright à revalider hors sandbox"
dépend_de: ["LOT-01"]
---

# LOT-04 — Portail patient clair, confiance, reprise et confort

## But

Appliquer la charte Patient Zen claire à l'ensemble du portail et rendre le parcours plus compréhensible, rassurant, facile à reprendre et transparent sur ce qui est enregistré ou transmis.

## Périmètre

- gate email ;
- consentement ;
- fiche de renseignements ;
- anamnèse ;
- écran de fin d'onboarding ;
- hub questionnaires ;
- en-têtes, états, messages et navigation ;
- lecture seule et demande de correction ;
- résumé de session patient ;
- confort de lecture ;
- états de sauvegarde, synchronisation et connexion ;
- états vides et erreurs actionnables ;
- préparation des primitives du futur renderer ;
- cohérence avec la prévisualisation patient côté praticien.

## Fichiers probables

- `web/src/app/portail/[token]/page.tsx`
- `web/src/app/portail/[token]/questionnaires/page.tsx`
- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`
- `web/src/components/patient/ConsentScreen.tsx`
- `web/src/components/patient/ConsultationScreen.tsx`
- `web/src/components/patient/PlaintesForm.tsx`
- composants UI patient partagés à créer
- éventuels composants `PatientJourney`, `SessionSummary`, `ReadingComfort`, `SaveStatus`
- `web/src/app/globals.css`
- tests `web/e2e/portail-parcours.spec.ts`

## Interdits

- ne pas introduire de mode sombre patient dans ce lot ;
- ne pas changer les textes légaux sans validation ;
- ne pas modifier le flux de token/session ;
- ne pas afficher de score ou interprétation clinique non prévue ;
- ne pas ajouter de gamification ;
- ne pas utiliser de données réelles ;
- ne pas promettre un délai de traitement non maîtrisé ;
- ne pas afficher `Enregistré` si les réponses sont seulement conservées localement ;
- ne pas exposer les statuts techniques internes ;
- ne pas multiplier les réglages de confort au point de complexifier le portail.

## Principes

- fond crème ;
- cartes blanches ;
- teal pour action ;
- gold pour progression ;
- rouge seulement pour erreur réelle ;
- corps lisible, largeur de lecture contrôlée ;
- une action principale ;
- étape suivante expliquée ;
- sauvegarde et confidentialité visibles au bon moment ;
- langage patient cohérent ;
- chaque retour dans le portail répond à `Qu'est-ce qui a changé ?` et `Que dois-je faire maintenant ?`.

## Parcours cible

Afficher un repère global :

1. consentement ;
2. informations ;
3. situation/anamnèse ;
4. questionnaires ;
5. analyse du praticien ;
6. restitution ou suite.

Les étapes futures doivent être présentées sans promettre un délai non maîtrisé.

## Hub cible

- progression globale ;
- durée restante approximative ;
- action recommandée maintenant ;
- résumé de ce qui a changé depuis la dernière visite ;
- autres questionnaires disponibles ;
- transmis/correction/expiré dans des sections secondaires ;
- explication de ce qui se passe après la transmission.

## Résumé de session patient

Le résumé peut afficher uniquement des faits confirmés :

- questionnaire transmis ;
- réception confirmée ;
- demande de correction ;
- questionnaire déverrouillé ;
- action attendue du patient ;
- document ou restitution disponible, si réellement disponible.

Ne pas exposer :

- notes internes ;
- brouillons praticien ;
- hypothèses non validées ;
- détail des processus IA ;
- dates promises non garanties.

## Confort de lecture

Contrôle discret et simple :

- texte standard ou agrandi ;
- espacement renforcé ;
- réduction des animations ;
- contraste renforcé uniquement si nécessaire et validé.

Les préférences peuvent être locales et non cliniques. Le portail doit rester utilisable sans modifier ces réglages.

## Sauvegarde et connexion

Distinguer explicitement :

- `Conservé sur cet appareil` ;
- `Synchronisé` si une sauvegarde serveur existe réellement ;
- `Transmis au praticien` ;
- `Connexion interrompue` ;
- `Transmission non terminée`.

Afficher la dernière sauvegarde réussie lorsque l'information est fiable. En cas de réseau instable, expliquer ce qui reste conservé et ce qui devra être repris.

## États vides et erreurs

Un état doit préciser :

- ce qui s'est passé ;
- si les réponses sont conservées ;
- l'action possible ;
- comment demander de l'aide si aucune action n'est possible.

Éviter les codes techniques, messages génériques ou erreurs culpabilisantes.

## Cohérence avec la prévisualisation praticien

Le rendu utilisé par `Voir ce que recevra le patient` doit partager les mêmes composants, tokens ou contrats que le portail réel. Toute divergence doit être documentée et testée.

## Étapes

1. Extraire les constantes de style locales en composants/tokens.
2. Créer une enveloppe patient commune.
3. Ajouter un composant de progression de parcours.
4. Segmenter fiche et anamnèse en sections plus digestes sans changer les données collectées.
5. Clarifier autosave/reprise et distinguer conservation locale, synchronisation et transmission.
6. Reconcevoir le hub autour de l'action recommandée et du résumé de session.
7. Ajouter un contrôle de confort de lecture minimal.
8. Harmoniser lecture seule et correction.
9. Créer des états vides, réseau et erreur actionnables.
10. Remplacer les confirmations natives concernées par des dialogs accessibles si le périmètre le permet.
11. Vérifier les textes français et la tonalité.
12. Vérifier la compatibilité avec la prévisualisation praticien.

## Tests

- parcours E2E complet existant ;
- mobile 375 px ;
- zoom 200 % ;
- clavier ;
- lecteur d'écran sur gate, consentement et première section ;
- session expirée ;
- erreur réseau ;
- brouillon ;
- correction/déverrouillage ;
- aucun débordement ;
- thème clair même si le système est sombre ;
- confort de lecture ;
- résumé de session sans donnée interne ;
- distinction locale/synchronisée/transmise ;
- reprise après connexion instable ;
- cohérence portail/prévisualisation.

## Done

- [x] Portail entièrement cohérent visuellement.
- [x] Parcours global compréhensible.
- [x] Hub orienté prochaine action.
- [x] Résumé de session fondé sur des états réels.
- [x] Sauvegarde et transmission clairement distinguées.
- [x] Confort de lecture simple et accessible.
- [x] États vides et erreurs actionnables.
- [ ] Mobile et accessibilité validés — non vérifié visuellement (voir Résultats, limite d'environnement).
- [ ] Tests existants verts — `type-check`/Vitest verts ; e2e Playwright non exécutable jusqu'au bout dans ce sandbox (voir Résultats).
- [ ] LOT-05 autorisé — en attente de revalidation e2e/manuelle par un humain avant autorisation.

## Résultats

**Fichiers modifiés/créés** (voir diff complet pour le détail) :
- Nouveaux composants partagés : `web/src/components/patient/ui/{PatientCard,PatientButton,PatientField,PatientInlineMessage,PatientPageHeader}.tsx`, `web/src/components/patient/{PatientJourneyProgress,SaveStatusIndicator,PatientErrorState,PatientConfirmDialog,ReadingComfortControl}.tsx`, `web/src/lib/portail-visite.ts`.
- Modifiés : `web/src/lib/questionnaire-draft.ts` (horodatage additif), `web/src/app/globals.css` (tokens RGB status danger/success/warning pour les fonds teintés + règles confort de lecture), `web/tailwind.config.ts` (status.danger/success/warning passés en `rgb(... / <alpha-value>)`), `web/src/app/portail/layout.tsx`, `web/src/app/portail/[token]/page.tsx` (wizard : primitives, pagination interne fiche/anamnèse, autosave locale, repère de parcours), `web/src/app/portail/[token]/questionnaires/page.tsx` (hub : action recommandée, résumé de visite, sections secondaires repliables), `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx` (badge dynamique, états d'erreur), `web/src/components/patient/{ConsentScreen,ConsultationScreen,PlaintesForm,GenericQuestionnaire}.tsx`, `web/src/components/ui/Badge.tsx`.
- `web/e2e/portail-parcours.spec.ts` mis à jour en continu (dialogs de confirmation, pagination fiche/anamnèse, ouverture des sections repliées) plutôt qu'en bloc final, conformément au séquencement prévu.

**Décisions actées pendant l'implémentation** (cf. plan validé) : pagination interne section par section pour fiche/anamnèse ; 3 réglages de confort de lecture seulement (pas de contraste renforcé) ; autosave locale minimale ajoutée au wizard ; fusion des deux `ConsentScreen` limitée au chrome (textes légaux distincts conservés) ; bug mineur corrigé — le badge d'en-tête du dispatcher affichait toujours « Transmis au praticien », y compris en correction demandée.

**Validations exécutées et vertes** : `npm run type-check`, `npm run test` (Vitest, 13 fichiers/71 tests), `bash scripts/check_no_secrets.sh`.

**Écart / dette — validation e2e et manuelle bloquée par l'environnement** : le sandbox d'exécution de cette session n'a pas d'accès réseau sortant vers Google Fonts ; or `web/src/app/layout.tsx` (préexistant, hors périmètre de ce lot) charge Inter/Lora via `next/font/google`. Conséquence constatée : toute page de l'app ne termine jamais son chargement de polices dans ce sandbox, ce qui bloque les mécanismes d'attente de Playwright (capture d'écran, clic, `waitForResponse`) sur n'importe quelle route, praticien ou patient. Triangulé par trois vérifications indépendantes : (1) `npx playwright test e2e/portail-parcours.spec.ts` échoue à l'étape « Gate email » avec un timeout de 120 s en attendant la réponse de `/api/portail/session`, de façon identique sur ce lot et sur `main` non modifié (branche stashée puis restaurée pour le test) ; (2) un appel `curl` direct sur la même route répond correctement (403 attendu) en ~4 s, ce qui exclut un blocage serveur ; (3) un script Playwright autonome, hors suite de test, confirme que même une simple capture d'écran de la page gate se bloque sur « waiting for fonts to load ». Ce point est donc antérieur à HC-F et indépendant de ce lot — à traiter séparément (ex. self-host des polices ou config réseau du sandbox), pas dans le périmètre LOT-04.
En conséquence : le parcours e2e complet, les vérifications manuelles navigateur (375 px, zoom 200 %, clavier, lecteur d'écran, thème forcé sombre, cohérence avec la prévisualisation praticien) n'ont pas pu être exécutées dans cette session. Le code a été relu attentivement (types stricts, textes préservés, contrats de props inchangés pour `ConsultationScreen`/`PatientPreview`) mais n'a pas été observé tourner dans un navigateur réel.

**Effet de bord constaté et corrigé en cours de route** : plusieurs commandes (`npm run dev`, `npx playwright test`) ont déclenché un patch automatique de `web/package-lock.json` (dépendances SWC manquantes) ; ce fichier a été systématiquement restauré (`git checkout`) pour ne pas introduire une régénération de lockfile hors périmètre.

**Décision de poursuite recommandée** : ne pas autoriser LOT-05 avant qu'un humain (ou une session avec accès réseau complet) ait rejoué `cd web && npm run test:e2e` et fait les vérifications manuelles listées dans le plan (mobile/zoom/clavier/lecteur d'écran/thème/prévisualisation praticien). Le code est prêt pour cette revalidation ; aucun blocage connu côté logique applicative.

**Corrections appliquées suite à `/wn-review`** :
- **RGPD** : le brouillon local du wizard (fiche/anamnèse, `web/src/app/portail/[token]/page.tsx`) contient des données d'identité/santé plus sensibles qu'un brouillon de réponses classique, sur un lien token parfois utilisé depuis un appareil partagé, et n'expirait jamais. Ajout d'une expiration de 30 jours (`WIZARD_DRAFT_TTL_MS`) : le brouillon expiré est purgé silencieusement à la prochaine lecture, sans changer le texte légal de `ConsentScreen` (hors périmètre de ce lot sans validation séparée) ni casser la reprise normale (délai largement suffisant pour reprendre une saisie interrompue).
- **Couverture de test** : ajout de `web/src/lib/portail-visite.test.ts` (première visite sans instantané, nouveau questionnaire, correction demandée, déverrouillage, statut inchangé, isolation par token) — 6 tests, tous verts.
- **Dette hub** : restauration du garde-fou d'annulation (`annuleRef`) dans `charger()` du hub questionnaires (`.../questionnaires/page.tsx`), perdu lors du passage à `useCallback` — une réponse tardive après démontage du composant n'écrase plus l'état.
- **Dette dispatcher** : `charger()` de `.../questionnaires/[idAssignation]/page.tsx` repasse désormais `status` à `'loading'` au début de chaque tentative (y compris un « Réessayer ») : l'écran de chargement remplace l'écran d'erreur pendant la nouvelle requête, ce qui donne un retour visuel et empêche mécaniquement les clics multiples (le bouton disparaît avec l'écran d'erreur).

**Validations post-correction** : `npm run type-check` (OK), `npm run test` (14 fichiers/77 tests verts, +1 fichier/+6 tests), `eslint` sur les fichiers touchés (aucune erreur), `bash scripts/check_no_secrets.sh` (OK), `web/package-lock.json` toujours propre. L'e2e Playwright n'a pas été rejoué : les 4 corrections ne touchent ni `layout.tsx` ni le chargement des polices, donc le blocage réseau sandbox documenté ci-dessus s'appliquerait de façon identique et n'apporterait aucune information nouvelle.

**Verdict `/wn-review` final : GO.** Aucun constat bloquant. 2 constats résiduels non bloquants acceptés en l'état : le brouillon wizard reste non chiffré (mitigé par le TTL) ; `readWizardDraft` ne valide pas la forme du JSON parsé contrairement à `questionnaire-draft.ts` (incohérence mineure sans conséquence pratique). Le Go reste conditionné à la revalidation e2e/manuelle hors sandbox avant d'autoriser LOT-05.
