# Parcours patient et contenus — TRUST V1

## 1. Parcours de premier accès

### Précondition

La séquence intervient après la vérification minimale d’identité, mais avant le
recueil détaillé des données de santé.

Route cible indicative :

```text
/portail/[token]/bienvenue
```

La route exacte dépendra de l’unification du portail permanent.

## 2. Écran 1 — Bienvenue

### Titre

**Bienvenue dans votre espace Wellneuro**

### Texte proposé

Wellneuro est un espace sécurisé de préparation et de suivi de votre
accompagnement en neuronutrition.

Il vous permet de transmettre les informations utiles, de compléter vos
questionnaires, de consulter les documents validés par votre praticien et de
suivre les étapes de votre accompagnement.

### Points clés

- Vos réponses servent à préparer un accompagnement personnalisé.
- Vous pouvez retrouver ici les informations et documents qui vous concernent.
- Vous restez libre de poser des questions et de demander une correction.

### Actions

```text
[Continuer]
[Consulter les informations détaillées]
```

## 3. Écran 2 — Ce que Wellneuro fait et ne fait pas

### Titre

**Un outil d’accompagnement, pas un service d’urgence**

### Texte proposé

Wellneuro aide à organiser vos réponses, à mieux comprendre les facteurs qui
peuvent influencer votre quotidien et à préparer les échanges avec votre
praticien.

Les questionnaires, scores et profils sont des outils d’orientation. Ils ne
suffisent pas à établir une conclusion médicale et ne remplacent pas l’avis de
votre médecin.

### À retenir

- Ne modifiez pas un traitement prescrit sans l’accord du prescripteur.
- Signalez vos traitements, allergies, grossesse éventuelle et changements
  importants.
- Les réponses et messages ne sont pas surveillés en continu.
- En cas de symptôme aigu ou inquiétant, utilisez les services médicaux
  habituels ou les numéros d’urgence adaptés à votre situation.

### Action

```text
[Je comprends le cadre]
```

L’action enregistre une progression de parcours, pas un consentement juridique.

## 4. Écran 3 — Données, confidentialité et IA

### Titre

**Vos informations et leur utilisation**

### Texte proposé

Nous recueillons uniquement les informations nécessaires à votre
accompagnement et à son suivi.

Selon les fonctions utilisées, certaines tâches peuvent être préparées avec
une assistance d’intelligence artificielle. Une synthèse ou une recommandation
destinée au patient doit être relue et validée par le praticien avant
publication.

Vous pouvez consulter à tout moment les informations détaillées sur :

- les données utilisées ;
- les finalités ;
- les personnes et prestataires autorisés ;
- les durées de conservation ;
- l’usage éventuel de l’IA ;
- vos droits et vos choix.

### Actions

```text
[Continuer]
[Voir le détail sur mes données]
[Voir le détail sur l’IA]
```

## 5. Écran 4 — Sécurité et prochaine étape

### Titre

**Avant de commencer**

### Confirmations proposées

```text
□ Je comprends que Wellneuro ne remplace pas un service d’urgence.

□ Je comprends que les questionnaires et indicateurs ne constituent pas à eux
  seuls une conclusion médicale.

□ Je sais où retrouver les informations concernant mes données et mes choix.
```

### Bouton final

```text
[J’ai pris connaissance de ces informations]
```

Ne pas utiliser :

```text
[J’accepte tout]
```

## 6. Centre permanent

Entrée de navigation :

```text
Mon accompagnement
└── Informations, confidentialité et droits
```

Lien secondaire visible dans le pied de page patient :

```text
Confidentialité et droits
```

## 7. Carte « Mon accompagnement »

Contenus :

- objet du parcours ;
- étapes ;
- rôle du patient ;
- rôle du praticien ;
- rôle du médecin traitant ;
- limites ;
- document pédagogique « Méthode du bilan de neuronutrition ».

Le booklet de méthode peut être proposé en HTML illustré et en PDF
téléchargeable. Le PDF n’est pas l’unique version.

## 8. Carte « Limites et sécurité médicale »

### Texte court

Wellneuro est un outil d’accompagnement. Il ne remplace pas une consultation
médicale, les services d’urgence ou le suivi de vos traitements.

Vos réponses ne sont pas lues en continu. Une information transmise dans le
portail ne garantit pas une réponse immédiate.

### Bloc urgence France

Valeurs configurables par juridiction, avec défaut France :

- 15 — urgence médicale ;
- 112 — numéro d’urgence européen ;
- 114 — urgence par SMS/app pour les personnes sourdes, malentendantes,
  sourdaveugles ou aphasiques ;
- 3114 — prévention du suicide.

Le contenu doit être validé, localisable et mis à jour sans modifier le code
applicatif.

### Action

```text
[Afficher les numéros utiles]
```

Éviter un bandeau rouge permanent si aucun signal n’est actif.

## 9. Carte « Données personnelles et confidentialité »

Accordéons :

1. Qui est responsable ?
2. Quelles données sont recueillies ?
3. Pourquoi ?
4. Quelles données sont obligatoires ou facultatives ?
5. Qui peut y accéder ?
6. Quels prestataires interviennent ?
7. Où sont-elles hébergées ?
8. Combien de temps sont-elles conservées ?
9. Quels sont mes droits ?
10. Comment les exercer ?
11. Comment signaler un incident ?
12. Comment contacter le point de contact ?

Les valeurs concrètes viennent d’une configuration de gouvernance approuvée.
Aucune phrase générique ne doit remplacer une information inconnue.

## 10. Carte « Intelligence artificielle »

### Résumé

Certaines tâches peuvent être préparées avec une assistance d’intelligence
artificielle. L’outil peut aider à organiser ou reformuler des informations,
mais il ne publie pas seul une décision ou une recommandation destinée au
patient.

### Détail

- fonctions utilisant l’IA ;
- fournisseur ;
- données transmises ;
- mesures de minimisation ;
- localisation et transferts ;
- durée de conservation ;
- réutilisation éventuelle ;
- validation humaine ;
- trace et version ;
- voie de contestation/correction.

### Cas chatbot futur

Si le patient interagit directement avec un agent conversationnel, l’interface
doit signaler explicitement qu’il s’agit d’un système d’IA avant l’échange.

## 11. Carte « Mes choix et autorisations »

Exemple :

```text
Partage avec le médecin traitant       Non autorisé
Aidant ou représentant                 Aucun
Communications non essentielles        Désactivées
Réutilisation secondaire               Non proposée
```

Chaque ligne ouvre :

- la finalité ;
- les données concernées ;
- le destinataire ;
- la durée ;
- l’effet du refus ;
- l’historique ;
- l’action modifier/retirer.

## 12. Carte « Mes documents d’information »

Liste :

```text
Cadre de l’accompagnement      v1.0      Pris connaissance le 15/07/2026
Données et confidentialité     v1.2      Pris connaissance le 15/07/2026
Usage de l’IA                  v1.0      Présenté le 15/07/2026
Sécurité et urgence            v1.1      Version actuelle
```

Actions :

```text
[Lire]
[Télécharger]
[Voir les changements]
[Voir les versions précédentes]
```

## 13. Carte « Signaler un problème »

Choix structurés :

- Je ne reconnais pas une connexion ;
- Un document ne semble pas me concerner ;
- Une information est incorrecte ;
- Je souhaite exercer un droit ;
- Je souhaite retirer une autorisation ;
- Un produit me semble mal toléré ;
- Autre problème de confidentialité.

Ne pas ouvrir directement un chat clinique libre.

## 14. Notices contextuelles

### Avant transmission d’un questionnaire

> Vos réponses seront transmises à votre praticien lorsque vous choisirez
> « Transmettre ». Tant que vous restez en brouillon, l’état de sauvegarde doit
> être indiqué clairement.

### Avant partage au médecin

> Ce document sera partagé avec le destinataire indiqué. Vérifiez son identité
> et le contenu avant de confirmer.

### Avant une exploration non remboursée

> Cet examen peut ne pas être remboursé. Son intérêt, son coût et les
> alternatives doivent être discutés avant décision.

### Avant publication d’un contenu assisté par IA

> Ce contenu a été préparé avec une assistance IA et validé par votre
> praticien.

### Avant retrait d’une autorisation

> Le retrait s’applique aux utilisations futures. Les traitements déjà réalisés
> et les obligations de conservation peuvent rester soumis au cadre applicable.

La formulation exacte doit être validée juridiquement.

## 15. Charte de relation numérique

### Ce que le patient peut attendre

- un portail disponible ;
- des statuts compréhensibles ;
- une prochaine action explicite ;
- des documents validés ;
- la possibilité de corriger ;
- un accès aux informations et aux droits ;
- une réponse selon les modalités annoncées.

### Ce que le portail ne promet pas

- surveillance continue ;
- réponse immédiate ;
- urgence ;
- conseil médical autonome ;
- absence absolue de sous-traitants ;
- disponibilité technique sans interruption.

### Canaux

Le centre précise :

- question administrative ;
- question sur un document ;
- demande de correction ;
- incident de confidentialité ;
- urgence ;
- effet indésirable.

## 16. Accessibilité éditoriale

Prévoir :

- phrases courtes ;
- titres explicites ;
- accordéons ;
- résumé avant détail ;
- version audio ;
- version simplifiée ;
- zoom 200 % ;
- lecteur d’écran ;
- navigation clavier ;
- absence de sens porté par la couleur seule ;
- langue et date visibles ;
- aide d’un proche avec rôle déclaré.

## 17. Critères de compréhension à tester

Après le parcours, le patient doit pouvoir répondre sans aide à :

- Wellneuro est-il un service d’urgence ?
- Un score est-il une conclusion médicale ?
- L’IA peut-elle publier seule ?
- Où modifier un choix ?
- Comment signaler une erreur ?
- Qui contacter en cas de problème de confidentialité ?
- Où retrouver la version lue ?

Le test ne doit pas devenir un examen bloquant. Une réponse « Je souhaite une
explication » ouvre le détail.
