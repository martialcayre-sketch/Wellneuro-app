# Audit UX WellNeuro — convergence vers Spirale 5.0

## Périmètre

Audit statique du dépôt `martialcayre-sketch/Wellneuro-app`, branche `main`, incluant le code actuel, la maquette Spirale, les campagnes UX, les audits précédents et le chantier visuel V1–V12 clôturé le **22 juillet 2026**. Je n’ai pas exécuté l’application ni observé de vrais utilisateurs : les constats portent donc sur l’architecture d’information, les parcours codés, les états, l’accessibilité et la cohérence avec la doctrine produit.

## Verdict général

**La convergence visuelle est presque atteinte. La convergence fonctionnelle est avancée. La convergence cognitive et longitudinale reste incomplète.**

WellNeuro possède maintenant deux univers cohérents :

- **Observatoire praticien** : environnement dense mais structuré, rail nocturne, cockpit borné, zone focale, instruments à la demande.
- **Jardin patient** : sable, forêt et cuivre, parcours apaisé, une action principale, langage non culpabilisant.

Le chantier visuel V12 couvre désormais le cockpit, l’accueil, le rail, les questionnaires, les documents, le copilote et les écrans patient. Les tailles, ombres, rayons et typographies ont été rapprochés de la maquette 5.0.

Mais le produit ne repose pas encore entièrement sur **une même Spirale traduite pour deux rôles**. Le praticien utilise principalement le **cycle clinique en sept phases** ; le patient suit surtout un **tunnel linéaire en six étapes**. La temporalité multi-épisodes existe côté praticien, mais elle reste séparée du cockpit et n’est pas encore le véritable squelette partagé de l’expérience.

### État de convergence

| Dimension | État | Conclusion |
|---|---:|---|
| Identité visuelle Observatoire/Jardin | Forte | Les deux univers sont reconnaissables, cohérents et reliés par le design system. |
| Architecture praticien | Forte | Le long scroll a été remplacé par un poste de pilotage structuré. |
| Architecture patient | Bonne | Le hub a été hiérarchisé autour d’une seule étape du moment. |
| Modèle mental partagé | Moyen | « Cycle clinique », « parcours », « équilibre » et « spirale alimentaire » coexistent sans hiérarchie conceptuelle suffisamment nette. |
| Longitudinalité / time-travel | Partielle | La trajectoire est navigable en lecture seule, mais ne recharge pas encore la fiche passée comme prévu dans la vision 5.0. |
| Preuve de non-régression visuelle | Insuffisante | Captures praticien disponibles, mais aucune baseline et aucune capture déterministe du portail patient. |

---

# 1. Audit de l’Observatoire praticien

## Les progrès structurants

La fiche patient est désormais organisée autour de cinq vues internes — poste de pilotage, besoins, alimentation, trajectoire et correspondance — et d’un cycle clinique en sept phases :

**Patient → Données fiables → Compréhension → Décision 21 jours → Actions → Suivi → Réévaluation.**

Le cockpit répond bien au principal défaut de l’ancienne interface :

- hauteur bornée ;
- bandeau trajectoire permanent ;
- navigation par phase plutôt que par défilement ;
- zone focale unique ;
- données denses repoussées dans des tiroirs ;
- statuts fondés sur l’état réel, avec un statut « indéterminé » lorsque l’application ne peut pas conclure honnêtement.

Les signaux critiques sont désormais persistants à l’échelle de la fiche. Une demande de correction patient ou un protocole bloqué reste visible même lorsque le praticien se trouve dans une autre vue, avec un accès direct à la phase concernée. C’est une bonne traduction de « pourquoi maintenant ».

Les instruments s’ouvrent au clic dans des panneaux latéraux plutôt que de s’empiler. Le clavier est correctement pris en charge pour les onglets et le rail de phases.

## Les limites actuelles

### 1. Le cockpit s’ouvre systématiquement sur « Décision 21 jours »

L’état initial est fixé à `decision`, indépendamment de la situation réelle du patient. Pourtant, le code sait déjà déterminer quelle phase est renseignée, en attente, à ouvrir ou indéterminée.

Cela peut produire une contradiction :

- le système identifie une correction patient en attente ;
- ou aucune donnée fiable n’est encore disponible ;
- mais la fiche s’ouvre néanmoins sur la décision.

**Recommandation :** déterminer la phase initiale à partir d’une règle explicite :

1. premier bloqueur de sécurité ;
2. première action exigible ;
3. première phase en attente ;
4. sinon dernière phase consultée par ce praticien.

Le cockpit deviendrait véritablement adaptatif à l’état du patient.

### 2. Quatre systèmes de navigation se superposent

Le praticien rencontre successivement :

1. le rail global ;
2. les cinq onglets de la fiche ;
3. les sept phases du cycle ;
4. l’index temporel de la Spirale.

Chaque système est justifiable isolément, mais leur relation n’est pas suffisamment explicitée. Le temps, le processus clinique et les instruments apparaissent comme des navigations concurrentes plutôt que comme des axes orthogonaux.

Le modèle cible devrait être clairement formulé ainsi :

- **la Spirale répond à “quand et dans quel épisode ?”** ;
- **le cycle répond à “où en est le travail clinique dans cet épisode ?”** ;
- **les instruments répondent à “sur quelles données s’appuie-t-on ?”**.

### 3. La Spirale est encore davantage un emblème qu’un système central

Dans le bandeau du cockpit, `SpiraleTrajectoire` est essentiellement un emblème accompagnant l’identité et la phase affichée. La vraie navigation temporelle se trouve dans l’onglet séparé « Trajectoire ».

Or la vision initiale disait que la Spirale devait être un **objet de navigation temporelle**, capable de recharger la fiche telle qu’elle existait à une date passée.

L’implémentation actuelle permet de sélectionner un repère et de mettre en avant le cycle correspondant, mais précise que le contenu affiché reste identique et qu’aucun filtrage temporel n’est effectué.

**Conclusion :** la Fiche-trajectoire est déjà un excellent index longitudinal, mais le **time-travel 5.0 n’est pas encore livré**.

### 4. Le rail expose la logique interne du programme

Le rail contient des marqueurs comme `C3`, `C4` et `différé`, ainsi que des écrans réservés « Agenda » et « Biologie ».

Ces codes sont utiles à la gouvernance du dépôt, mais pas au praticien. Ils introduisent :

- du vocabulaire de chantier ;
- une impression de fonctions partiellement disponibles ;
- un bruit permanent dans la navigation quotidienne.

**Recommandation :** retirer les codes de campagne de la production. Un écran différé ne devrait apparaître dans le rail que lorsqu’il offre déjà une action utile, ou être regroupé dans une seule rubrique « Prochainement » non dominante.

### 5. Les métriques sont actives, mais leurs destinations restent trop générales

Les quatre métriques sont maintenant cliquables, ce qui corrige la passivité de l’ancien accueil. Cependant, « Questionnaires en cours » renvoie simplement vers tous les patients et « Booklets envoyés » vers la synthèse, sans filtre correspondant exactement à la métrique.

Une métrique active devrait ouvrir **la population exacte qui compose sa valeur**, pas seulement la rubrique générale.

---

# 2. Audit du Jardin patient

## Les progrès structurants

Le portail d’accueil est désormais une machine d’états claire :

**vérification → information préalable → consentement → fiche → anamnèse → questionnaires.**

Les formulaires sont paginés par section, avec sauvegarde locale, retour en arrière et messages d’erreur explicites. Le brouillon est associé à l’identité patient plutôt qu’au token secret et expire après trente jours.

L’accueil questionnaires a été fortement amélioré. Une seule action est priorisée, puis viennent les propositions de reprise, les accès secondaires et les détails repliables.

Le composant « Mon parcours » accueille d’abord la personne qui revient après une interruption, avant de lui demander d’agir. Il n’utilise ni score, ni compte à rebours, ni mécanisme de culpabilisation.

Les corrections importantes de l’audit du 20 juillet ont également été intégrées :

- valeur numérique de l’indice masquée ;
- interactions des douze besoins accessibles au clavier et au tactile ;
- couverture décrite en texte ;
- boutons principaux portés à 48 px ;
- vocabulaire interne retiré des surfaces patient.

## Les limites actuelles

### 1. Le parcours patient reste linéaire, alors que la doctrine est cyclique

`PatientJourneyProgress` présente six étapes :

1. Consentement
2. Informations
3. Situation
4. Questionnaires
5. Analyse du praticien
6. Restitution

Mais le code précise que les étapes 5 et 6 ne deviennent jamais « en cours » ou « terminées », faute de signal serveur fiable. Elles restent donc indéfiniment à venir.

C’est aujourd’hui le principal défaut de convergence :

- le praticien voit réellement l’avancement clinique ;
- le patient voit une promesse statique qui ne se met pas à jour.

**Recommandation prioritaire :** publier un état patient minimal et non anxiogène dérivé du même épisode que le cockpit :

- « Vos éléments ont été transmis » ;
- « Votre praticien les prépare » ;
- « Votre restitution est disponible » ;
- « Votre prochaine étape est prête ».

Il ne s’agit pas d’exposer les scores ou les discordances, mais de synchroniser le statut du parcours.

### 2. La métaphore centrale a été fragmentée par le vocabulaire

Le composant global s’appelle volontairement « Mon parcours », parce que « Ma spirale alimentaire » utilise déjà le mot Spirale.

C’est cohérent localement mais problématique au niveau produit : **le sous-module alimentaire possède la marque la plus forte, tandis que la trajectoire globale abandonne la Spirale**.

Je recommande l’inverse :

- réserver **« Ma Spirale »** ou **« Ma trajectoire »** à l’ensemble du parcours longitudinal ;
- renommer le sous-module en **« Mon carnet alimentaire »**, **« Mon observation alimentaire »** ou **« Mon parcours alimentaire »**.

La Spirale doit rester le concept fédérateur de WellNeuro, pas le nom d’un instrument particulier.

### 3. « Mon équilibre » conserve une visualisation quantitative implicite

La valeur numérique est correctement masquée dans la jauge. Cependant :

- la frise utilise encore la hauteur des barres pour encoder les valeurs successives ;
- aucun libellé n’explique l’amplitude ;
- le texte peut annoncer « En baisse depuis votre dernier bilan » ;
- les « priorités » sont automatiquement choisies en triant les besoins par couverture croissante.

Cela crée trois difficultés :

1. le patient voit un score masqué mais toujours graphiquement représenté ;
2. « en baisse » entre en tension avec la doctrine « construction, jamais dégradation » ;
3. « Vos priorités » semble être une décision clinique, alors qu’elle est calculée automatiquement.

**Recommandation :**

- remplacer les barres par des repères temporels qualitatifs ;
- employer « Des repères ont évolué » plutôt que « En baisse » ;
- utiliser « Points à explorer avec votre praticien » tant qu’aucune validation explicite n’a eu lieu ;
- distinguer visuellement les recommandations validées du praticien des constats calculés.

### 4. L’action principale est encore partiellement dupliquée

La carte « Mon parcours » met en avant le questionnaire recommandé. Plus bas, la section « À compléter » réaffiche l’ensemble des questionnaires, y compris généralement celui déjà mis en avant.

La hiérarchie est meilleure qu’avant, mais la promesse « une étape à la fois » pourrait être encore renforcée :

- ne montrer que l’action recommandée ;
- placer la liste entière sous « Voir tous mes questionnaires » ;
- afficher directement le prochain questionnaire après transmission.

### 5. Deux surfaces patient continuent de coexister

Le portail `/portail/[token]` est la surface normative, tandis que `/patient/[idAssignation]` reste un flux de compatibilité. L’audit précédent constatait qu’aucun plan de décommissionnement explicite n’était porté par le programme.

Le chantier visuel a harmonisé le legacy, ce qui réduit la rupture esthétique, mais peut aussi prolonger involontairement sa durée de vie.

Cela produit un risque durable :

- deux URL ;
- deux parcours ;
- deux sources d’analytics ;
- deux ensembles de cas de support ;
- des améliorations qui doivent être vérifiées deux fois.

Un plan de migration explicite est nécessaire : critères d’éligibilité, redirection, période de coexistence et date de retrait.

---

# 3. Ce qui doit réellement converger

Observatoire et Jardin ne doivent surtout pas devenir la même interface. La convergence doit se faire au niveau de **l’événement clinique partagé**, avec deux traductions.

| État partagé | Observatoire praticien | Jardin patient |
|---|---|---|
| Épisode actif | Tour, date, jalons, version | « Votre parcours actuel » |
| Phase clinique | Données, compréhension, décision, actions… | « Ce qui se passe maintenant » |
| Action suivante | Décision due, données manquantes, bloqueurs | Une seule prochaine étape |
| État d’avancement | Complet, en attente, bloqué, indéterminé | Transmis, en préparation, disponible |
| Provenance | Instrument, date, version, niveau de preuve | Formulation simple : « d’après vos réponses du… » |
| Résultat | Valeurs, discordances, arbitrage | Explication validée et conseils diffusables |
| Historique | Time-travel complet | Récit de construction et reprises |

Le contrat commun pourrait contenir, conceptuellement :

- identifiant de l’épisode ;
- phase courante ;
- dernier jalon confirmé ;
- prochaine action ;
- état de disponibilité ;
- date de dernière évolution ;
- formulation praticien ;
- formulation patient ;
- visibilité patient autorisée ;
- provenance et version.

Ainsi, une décision du cockpit produirait immédiatement un état patient correspondant, sans exposer les données réservées au praticien.

---

# 4. Recommandations priorisées

## P0 — nécessaires avant de revendiquer une convergence Spirale 5.0 complète

### P0.1 — Créer un état de trajectoire partagé

Le même état d’épisode doit piloter :

- la phase focale du praticien ;
- les étapes Analyse et Restitution du patient ;
- le Fil du jour ;
- la reprise après interruption ;
- la prochaine action visible des deux côtés.

### P0.2 — Transformer l’index en véritable navigation temporelle

Le clic sur un tour ou un jalon doit ouvrir une **vue historique datée** de la fiche :

- lecture seule stricte ;
- bannière « Vous consultez l’état du… » ;
- retour au présent toujours visible ;
- possibilité éventuelle d’ajouter une note de relecture horodatée au présent, jamais de modifier le passé.

### P0.3 — Réserver le mot Spirale à la trajectoire globale

Renommer le module alimentaire et faire de la Spirale la métaphore commune :

- Observatoire : navigation entre les tours ;
- Jardin : croissance du parcours au fil des tours.

### P0.4 — Piloter automatiquement la zone focale

Le cockpit ne doit plus s’ouvrir toujours sur « Décision ». Il doit ouvrir le premier élément réellement exigible ou bloquant.

### P0.5 — Décider la fin du legacy patient

Créer un lot produit spécifique avec une date et des critères de sortie, plutôt que de laisser chaque campagne exclure le sujet de son périmètre.

## P1 — simplification et cohérence

### P1.1 — Réduire les navigations concurrentes

Conserver explicitement trois axes seulement :

- produit : Fil / Trajectoires / Instruments / Cabinet ;
- temps : épisodes et jalons ;
- cycle : sept phases.

Les onglets alimentation, besoins et correspondance peuvent devenir des instruments ou des sous-vues contextualisées de la trajectoire.

### P1.2 — Instituer une prévisualisation patient permanente

Le praticien dispose déjà d’un aperçu patient. Il devrait devenir une fonction structurante de chaque décision :

> « Voici exactement ce que le patient verra après validation. »

La convergence se vérifie alors au moment du travail, pas seulement dans la charte.

### P1.3 — Nettoyer le langage de production

Retirer `C3`, `C4`, `différé`, les identifiants de lots et tout vocabulaire de chantier des interfaces finales.

### P1.4 — Repenser la datavisualisation patient

Le Jardin devrait raconter :

- ce qui a été construit ;
- ce qui est en cours ;
- le prochain petit pas ;
- les changements validés par le praticien.

Il ne devrait pas représenter implicitement des scores dont les nombres ont simplement été masqués.

## P2 — qualité et validation

### P2.1 — Fermer les derniers résidus d’accessibilité

Quelques cibles demeurent sous le minimum annoncé :

- la variante `danger-text` de `PatientButton` n’a aucune hauteur minimale et sert notamment à supprimer une ligne ;
- le bouton de fermeture d’un tiroir praticien mesure 40 px ;
- plusieurs boutons « Retour » de Mon équilibre ne portent pas de `min-height`.

Par ailleurs, `PatientJourneyProgress` indique explicitement aux lecteurs d’écran l’étape actuelle, mais pas quelles étapes sont terminées.

### P2.2 — Construire une vraie non-régression visuelle des deux univers

Les tests actuels produisent des captures praticien pour comparaison humaine, mais :

- aucune baseline n’est versionnée ;
- aucune capture du portail patient n’est réalisée à cause de l’interférence avec le patient seedé partagé.

La solution n’est pas de renoncer à la preuve visuelle, mais d’isoler les données :

- patient et consultation uniques par worker ;
- environnement Linux de référence pour les baselines ;
- captures macOS conservées uniquement pour la revue ;
- snapshots DOM/accessibilité pour les éléments sensibles aux polices.

### P2.3 — Tester le modèle mental, pas seulement les composants

Les tests utilisateurs devraient vérifier trois questions :

- le praticien comprend-il immédiatement **pourquoi cette phase est ouverte** ?
- le patient sait-il **ce qui se passe et ce qu’il doit faire maintenant** ?
- les deux décrivent-ils le même parcours avec leurs propres mots ?

---

# Conclusion

WellNeuro a désormais une **très bonne fondation d’interface 5.0**. L’Observatoire n’est plus un tableau de bord empilé et le Jardin n’est plus une collection de formulaires concurrents. La distinction des deux rôles est pertinente et doit être conservée.

Le prochain enjeu n’est plus graphique. Il consiste à faire de la Spirale un **contrat de trajectoire vivant** :

- un même épisode ;
- un même état ;
- un même prochain événement ;
- deux niveaux de lecture ;
- deux langages ;
- aucune divergence sur ce qui se passe réellement.

Aujourd’hui, l’Observatoire et le Jardin se ressemblent suffisamment pour appartenir au même produit. Pour atteindre pleinement Spirale 5.0, ils doivent maintenant **regarder la même trajectoire, au même instant, chacun depuis son propre monde**.
