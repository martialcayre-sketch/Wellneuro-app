# Synthèse UX — Front patient, packs et questionnaires

> Rédigé le 2026-07-08.  
> Objectif : cadrer les incohérences constatées dans le parcours patient lors de la création de compte, de l’assignation d’un pack de questionnaires et du remplissage des questionnaires.  
> Périmètre : analyse produit/UX + recommandations de développement. Aucune migration Prisma, aucune modification de code, aucun changement de logique clinique dans ce document.

---

## 1. Contexte projet

Wellneuro dispose de deux portes d’entrée patient qui coexistent actuellement :

- `/portail/[token]` : nouvel espace patient permanent, révocable, protégé par token + confirmation email ;
- `/patient/[idAssignation]` : ancien flux centré sur une assignation de questionnaire unique.

Le portail patient va dans la bonne direction produit : il permet un onboarding structuré avec consentement, fiche signalétique, anamnèse, puis assignation automatique d’un pack de base.

Le problème est qu’après cet onboarding, le patient retombe encore dans l’ancien tunnel `/patient/[idAssignation]`, qui reste conçu comme un accès ponctuel à un seul questionnaire. Cela crée une friction importante dès qu’un pack contient plusieurs questionnaires.

---

## 2. Incohérences constatées

### 2.1 Saisie répétée de l’identifiant email

Constat :

- le patient saisit son email pour accéder à la page patient ;
- puis, lorsqu’il ouvre un autre questionnaire du pack, il doit ressaisir le même email ;
- cette répétition donne l’impression d’une succession de formulaires isolés au lieu d’un espace patient fluide.

Cause probable :

- chaque carte « Ouvrir » renvoie vers une nouvelle URL `/patient/[idAssignation]` ;
- cette page redémarre son état interne depuis `gate`, donc redemande l’email.

Décision UX recommandée :

- l’email est saisi une seule fois par session patient ;
- il est conservé côté front pendant la session, idéalement en mémoire et/ou `sessionStorage` ;
- les appels API suivants réutilisent cet email sans le réafficher au patient ;
- l’email ne doit pas être exposé en clair dans l’URL.

---

### 2.2 Impossibilité de choisir librement par quel questionnaire commencer

Constat :

- un panneau « Questionnaires en attente » existe ;
- mais le patient est encore dirigé vers le questionnaire porté par le premier lien ;
- le choix libre n’est pas vécu comme une vraie étape de navigation.

Décision UX recommandée :

- après validation du portail ou vérification email, afficher une vraie page d’accueil « Mes questionnaires » ;
- chaque questionnaire du pack doit être présenté sous forme de carte cliquable ;
- le patient choisit librement par lequel commencer ;
- l’application peut suggérer un ordre, mais ne doit pas l’imposer.

Libellés recommandés :

- « Mes questionnaires » ;
- « À compléter » ;
- « Brouillon » ;
- « Transmis au praticien » ;
- « Correction demandée » ;
- « Déverrouillé par le praticien ».

---

### 2.3 Consentement affiché avant chaque questionnaire

Constat :

- le consentement peut réapparaître avant la saisie de chaque questionnaire ;
- cela alourdit fortement l’expérience patient ;
- le comportement est incohérent avec une logique de pack ou de consultation.

Position recommandée :

Le consentement ne doit pas être recueilli avant chaque questionnaire d’un même pack lorsque la finalité, la nature des données collectées et la version du texte de consentement sont identiques.

Règle produit proposée :

> Le consentement est recueilli une fois pour une nouvelle consultation ou une nouvelle assignation groupée. Il reste valable pour les questionnaires associés à cette consultation ou à ce pack, tant que la finalité, les données collectées et la version du consentement ne changent pas.

Cas où le consentement doit être redemandé :

- nouvelle consultation avec nouvelle finalité ;
- ajout d’un pack très différent ou plus sensible ;
- modification du texte de consentement ;
- consentement retiré par le patient ;
- changement substantiel du traitement des données.

Cas où le consentement ne doit pas être redemandé :

- plusieurs questionnaires appartenant au même pack ;
- questionnaire ajouté dans le cadre du même suivi et de la même finalité ;
- reprise d’un questionnaire non terminé ;
- correction d’un questionnaire déjà soumis, si elle reste dans le même cadre de suivi.

Message court recommandé lors d’un nouveau questionnaire couvert par un consentement déjà donné :

> Ce questionnaire entre dans le cadre de votre suivi Wellneuro déjà accepté. Vous pouvez demander la modification ou la suppression de vos données auprès de votre praticien.

---

### 2.4 Vue détaillée et remplissage du questionnaire

Constat :

- le remplissage est intégré dans la page patient existante ;
- le patient n’a pas une perception claire d’une page autonome par questionnaire ;
- le retour vers la liste des questionnaires n’est pas structurant.

Décision UX recommandée :

Chaque questionnaire doit s’ouvrir sur une page indépendante après clic sur sa carte.

Routes recommandées :

```txt
/portail/[token]
/portail/[token]/questionnaires
/portail/[token]/questionnaires/[idAssignation]
```

Rôle des routes :

- `/portail/[token]` : espace patient permanent, accès, onboarding, état global ;
- `/portail/[token]/questionnaires` : hub des questionnaires assignés ;
- `/portail/[token]/questionnaires/[idAssignation]` : saisie ou consultation d’un questionnaire précis.

L’ancien flux `/patient/[idAssignation]` peut être conservé en compatibilité pour les anciens liens, mais il ne doit plus être le flux cible principal.

---

## 3. Fonctionnalités attendues par questionnaire

### 3.1 Bouton « Sauvegarder le brouillon »

Objectif :

- permettre au patient d’interrompre la saisie ;
- éviter la perte de réponses ;
- diminuer l’anxiété face aux questionnaires longs.

Version minimale sans migration :

- sauvegarde locale via `sessionStorage` ou `localStorage` ;
- restauration automatique à la réouverture du questionnaire sur le même appareil ;
- message clair indiquant que le brouillon n’est pas encore transmis au praticien.

Libellé recommandé :

> Sauvegarder le brouillon

Message de confirmation :

> Brouillon enregistré sur cet appareil. Il ne sera transmis au praticien qu’après validation.

Limite à afficher clairement :

> Ce brouillon est conservé uniquement sur cet appareil.

Version robuste ultérieure :

- table serveur dédiée aux brouillons ;
- sauvegarde multi-appareil ;
- horodatage ;
- purge automatique après soumission ;
- statut `brouillon` visible côté praticien si souhaité.

Cette version robuste nécessitera une migration Prisma et donc une confirmation explicite avant exécution.

---

### 3.2 Bouton « Réinitialiser »

Objectif :

- permettre au patient d’effacer ses réponses non transmises ;
- éviter qu’un brouillon erroné soit repris par erreur.

Règle :

- le reset ne doit agir que sur les réponses non soumises ;
- il ne doit jamais supprimer une réponse déjà transmise au praticien ;
- pour une réponse verrouillée, le patient doit passer par une demande de correction.

Libellé recommandé :

> Réinitialiser ce questionnaire

Message de confirmation :

> Cette action effacera les réponses non transmises de ce questionnaire. Elle ne supprimera aucune réponse déjà envoyée à votre praticien.

---

### 3.3 Bouton « Transmettre au praticien »

Objectif :

- rendre la différence claire entre sauvegarde locale et soumission officielle ;
- éviter l’envoi accidentel d’un questionnaire incomplet.

Libellé recommandé :

> Transmettre au praticien

Message avant soumission :

> Après transmission, vos réponses seront verrouillées. Vous pourrez les consulter et demander une correction si nécessaire.

Après soumission :

> Vos réponses ont bien été transmises à votre praticien.

---

### 3.4 Bouton « Demander une correction »

Objectif :

- permettre au patient de signaler une erreur après soumission ;
- garder le contrôle praticien sur le déverrouillage ;
- éviter la modification directe de réponses déjà exploitées.

Règle :

- disponible uniquement pour un questionnaire déjà soumis/verrouillé ;
- une demande en attente désactive le bouton ;
- le praticien valide ou refuse manuellement le déverrouillage ;
- aucune notification automatique obligatoire dans le MVP.

Amélioration recommandée :

Ajouter un champ facultatif :

> Précisez ce que vous souhaitez corriger.

Statuts visibles côté patient :

- « Correction demandée » ;
- « En attente de validation par votre praticien » ;
- « Questionnaire déverrouillé ».

---

## 4. Architecture UX cible

### 4.1 Principe général

Le patient ne doit plus percevoir Wellneuro comme une suite de liens isolés, mais comme un espace unique.

Structure recommandée :

```txt
Espace patient
├── Accueil
├── Consentement / fiche / anamnèse si nécessaire
├── Mes questionnaires
│   ├── À compléter
│   ├── Brouillons
│   ├── Transmis
│   └── Corrections demandées
└── Mon équilibre
```

---

### 4.2 Écran « Mes questionnaires »

Contenu recommandé :

- titre : « Mes questionnaires » ;
- phrase d’aide : « Vous pouvez les compléter dans l’ordre qui vous convient. Votre praticien recevra uniquement les questionnaires transmis. » ;
- compteur : « X à compléter » ;
- progression globale du pack ;
- cartes questionnaires.

Informations par carte :

- titre du questionnaire ;
- statut ;
- date limite si présente ;
- durée estimée si disponible ;
- badge « recommandé en premier » si utile ;
- bouton principal : « Commencer », « Reprendre », « Consulter », « Corriger » selon l’état.

Exemple de statuts :

```txt
À compléter
Brouillon enregistré
Transmis au praticien
Correction demandée
Déverrouillé par le praticien
Expiré
```

---

### 4.3 Page de saisie d’un questionnaire

Structure recommandée :

1. En-tête compact : retour vers « Mes questionnaires », titre, statut ;
2. Note éventuelle du praticien ;
3. Barre de progression ;
4. Sections du questionnaire ;
5. Actions persistantes en bas de page ou en fin de formulaire :
   - « Sauvegarder le brouillon » ;
   - « Réinitialiser » ;
   - « Transmettre au praticien ».

Pour mobile :

- boutons suffisamment larges ;
- éviter les actions côte à côte trop serrées ;
- confirmation claire avant reset et transmission ;
- ne jamais signaler un statut uniquement par la couleur.

---

## 5. Design UX Wellneuro à respecter

Rappels de charte :

- thème patient clair ;
- identité deep teal + champagne gold ;
- style clinique premium, scientifique mais accessible ;
- mobile first ;
- textes d’interface en français ;
- cartes arrondies, hiérarchie visuelle douce ;
- pas de surcharge technique côté patient ;
- accessibilité : statut toujours lisible en texte, pas uniquement par couleur.

Les libellés doivent rester rassurants :

- « Transmettre au praticien » est préférable à « Envoyer mes réponses » ;
- « Brouillon » est préférable à « sauvegarde temporaire » ;
- « Correction demandée » est préférable à « modification_demandee » ;
- « Mes questionnaires » est préférable à « assignations ».

---

## 6. Lots de développement recommandés

### Lot P1 — Correction immédiate du parcours existant

Objectif : supprimer les principales frictions sans migration.

Actions :

- conserver l’email vérifié pendant la session front ;
- éviter la ressaisie d’email lors de l’ouverture d’un autre questionnaire ;
- transformer le panneau actuel en vraie étape de choix ;
- ne pas lancer automatiquement le premier questionnaire si plusieurs sont en attente ;
- masquer le consentement si l’assignation est déjà couverte par un consentement de consultation ou de pack ;
- conserver `/patient/[idAssignation]` en compatibilité.

Priorité : très haute.

---

### Lot P2 — Hub patient « Mes questionnaires »

Objectif : créer la navigation cible côté portail.

Actions :

- créer `/portail/[token]/questionnaires` ;
- afficher toutes les assignations du patient ;
- grouper par statut ;
- permettre le choix libre du questionnaire ;
- rediriger la fin d’onboarding vers ce hub plutôt que vers `/patient/[premiereAssignation]`.

Priorité : haute.

---

### Lot P3 — Page autonome par questionnaire

Objectif : isoler chaque formulaire dans une page dédiée.

Actions :

- créer `/portail/[token]/questionnaires/[idAssignation]` ;
- réutiliser les renderers existants `PlaintesForm` et `GenericQuestionnaire` en les factorisant si nécessaire ;
- ajouter retour vers le hub ;
- afficher le statut et les actions adaptées ;
- garder `/patient/[idAssignation]` comme ancien flux.

Priorité : haute.

---

### Lot P4 — Brouillon local + reset

Objectif : sécuriser la saisie sans toucher au schéma.

Actions :

- sauvegarde locale par clé `wellneuro:draft:{idAssignation}` ;
- bouton « Sauvegarder le brouillon » ;
- restauration automatique ;
- bouton « Réinitialiser ce questionnaire » ;
- suppression du brouillon local après transmission réussie.

Priorité : moyenne à haute.

---

### Lot P5 — Demande de correction enrichie

Objectif : améliorer la boucle patient → praticien.

Actions :

- ajouter un commentaire facultatif à la demande de correction ;
- afficher le statut de la demande dans le hub ;
- désactiver le bouton si une demande est déjà en attente ;
- côté praticien, afficher la demande dans la fiche patient détaillée.

Attention : stocker le commentaire nécessitera probablement une évolution du modèle ou une table dédiée. À confirmer avant migration.

Priorité : moyenne.

---

### Lot P6 — Consentement groupé robuste

Objectif : représenter proprement le consentement au niveau consultation / pack / lot d’assignation.

Hypothèse de modèle futur :

- `idLotAssignation` ou `idConsentementScope` ;
- `idPack` ;
- `consentementVersion` ;
- `consentementHorodatage` ;
- `finaliteConsentement` ;
- lien vers les assignations couvertes.

Ce lot implique une migration Prisma. Il ne doit pas être lancé sans confirmation explicite.

Priorité : moyenne, mais important pour robustesse RGPD.

---

## 7. Règles de non-régression

Le futur développement doit garantir :

- un seul email gate par session patient ;
- aucun email dans l’URL ;
- un consentement non répété inutilement ;
- choix libre du questionnaire ;
- possibilité de revenir à la liste ;
- aucun reset de réponse déjà transmise ;
- bouton de correction disponible uniquement après soumission ;
- textes UI 100 % français ;
- compatibilité mobile ;
- conservation de l’ancien flux `/patient/[idAssignation]` tant que tous les liens existants n’ont pas été migrés.

---

## 8. Décision produit synthétique

Décision recommandée :

> Faire de `/portail/[token]` le véritable espace patient permanent et reléguer `/patient/[idAssignation]` au rôle de compatibilité historique.

Structure cible :

```txt
/portail/[token]
/portail/[token]/questionnaires
/portail/[token]/questionnaires/[idAssignation]
```

Le patient doit pouvoir :

1. s’identifier une seule fois ;
2. donner son consentement uniquement lorsque cela est réellement nécessaire ;
3. voir tous ses questionnaires ;
4. choisir librement l’ordre de remplissage ;
5. sauvegarder un brouillon ;
6. réinitialiser un questionnaire non transmis ;
7. transmettre au praticien ;
8. consulter ses réponses verrouillées ;
9. demander une correction si besoin.

---

## 9. Prochaine action prioritaire

Lancer un premier lot court :

> **P1 — Correction immédiate du parcours existant : email conservé en session, choix libre réel, fin de la ressaisie d’email entre questionnaires.**

Ce lot apporte un gain UX immédiat sans migration, sans refonte clinique et sans toucher au scoring.
