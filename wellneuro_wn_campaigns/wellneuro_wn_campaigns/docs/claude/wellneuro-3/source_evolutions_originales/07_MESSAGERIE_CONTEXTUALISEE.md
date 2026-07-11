# 07 — Messagerie contextualisée

## Intention

Créer une messagerie praticien-patient structurée, rattachée aux objets cliniques du parcours :

- protocole ;
- complément ;
- alimentation ;
- biologie ;
- effet ressenti ;
- fiche conseil ;
- rendez-vous.

Ce n’est pas un chat libre médical. C’est un canal de suivi contextualisé.

## Pourquoi éviter le chat libre V1 ?

Un champ libre unique favorise :

- questions trop larges ;
- attentes de réponse médicale immédiate ;
- perte de contexte ;
- surcharge praticien ;
- risques réglementaires.

## Entrées patient guidées

```text
J’ai une question sur :
[Mon protocole]
[Un complément]
[Mon alimentation]
[Un effet ressenti]
[Ma biologie]
[Mon rendez-vous]
[Autre]
```

## Objet `message_context`

```text
message_context
- id
- patient_id
- context_type: protocole | complément | alimentation | biologie | fiche | administratif
- linked_object_id
- severity_label: normal | à surveiller | urgent_hors_app
- patient_message
- ai_draft_response
- practitioner_response
- status: reçu | brouillon_ia | validé | envoyé | archivé
```

## Réponse assistée

L’IA peut proposer une réponse au praticien.

Exemple :

```text
Message patient :
“Le magnésium me donne mal au ventre.”

Brouillon IA pour praticien :
“Merci pour votre retour. Ce type d’inconfort peut dépendre de la forme ou du moment de prise. Nous pouvons envisager de fractionner la prise ou de tester une forme plus douce. Je vous confirme l’ajustement après validation.”
```

Le praticien modifie et valide.

## Règles de sécurité

- Ne jamais répondre automatiquement au patient sur un sujet clinique.
- Prévoir message d’orientation si urgence.
- Ne pas laisser l’IA minimiser un symptôme.
- Ne pas donner de consigne médicale hors protocole validé.
- Conserver le contexte du message.

## UX praticien

```text
Messages à traiter

Jennifer Martin
Contexte : complément — magnésium
Signal : inconfort digestif
Priorité : à surveiller
Brouillon disponible
```

Actions :

```text
[Valider]
[Modifier]
[Demander précision]
[Créer ajustement protocole]
[Archiver]
```

## UX patient

```text
Votre message a été transmis.
Votre praticien reviendra vers vous.
Si vous présentez un symptôme urgent, contactez les services médicaux appropriés.
```

## Catégories

### Protocole

- incompréhension ;
- oubli ;
- difficulté pratique ;
- demande d’adaptation.

### Complément

- tolérance ;
- moment de prise ;
- oubli ;
- doute produit.

### Alimentation

- courses ;
- substitution ;
- restaurant ;
- écart.

### Biologie

- question sur document ;
- résultat reçu ;
- rendez-vous médecin.

### Effet ressenti

- amélioration ;
- gêne ;
- fatigue ;
- sommeil ;
- digestion.

## Innovations

### 1. Message transformable en tâche

```text
Le message devient :
- tâche praticien ;
- ajustement protocole ;
- note de suivi ;
- signal momentum.
```

### 2. Résumé de fil

À J21 :

```text
Messages principaux :
- inconfort magnésium J5 ;
- protocole ajusté J6 ;
- meilleure tolérance J10.
```

### 3. Templates praticien

Réponses validées réutilisables :

- oubli de prise ;
- effet digestif ;
- difficulté alimentaire ;
- encouragement ;
- check-in manquant.

### 4. Triage

```text
Normal :
question pratique.

À surveiller :
effet ressenti modéré.

Hors app :
symptôme nécessitant avis médical urgent.
```

## Critères d’acceptation

- Chaque message a un contexte.
- L’IA ne répond pas directement sans validation.
- Le praticien peut convertir un message en action.
- Le patient reçoit une confirmation claire.
- Les messages sensibles sont traités avec prudence.

## Prompt agent dev

```text
Conçois la messagerie contextualisée WellNeuro. Elle doit éviter le chat libre médical au profit de catégories guidées : protocole, complément, alimentation, biologie, effet ressenti, administratif. Chaque message est rattaché à un objet clinique. L’IA peut proposer un brouillon au praticien, jamais répondre seule au patient. Propose UX patient/praticien, objets conceptuels, triage, templates et critères d’acceptation.
```

## Questions ouvertes

- Messagerie asynchrone simple ou fil complet ?
- Faut-il pièces jointes dès V1 ?
- Quel niveau HDS nécessaire selon contenu ?
