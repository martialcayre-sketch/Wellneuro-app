# 06 — Compagnon patient

## Intention

Créer une expérience patient simple, rassurante et actionnable.

Le patient ne doit pas voir toute la complexité clinique. Il doit comprendre :

1. où il en est ;
2. quoi faire aujourd’hui ;
3. pourquoi cela compte ;
4. comment signaler un problème ;
5. quand le praticien ajustera.

## Écran d’accueil patient

```text
Bonjour Sophie

Mon équilibre
68 / 100
+7 depuis le début

Priorité actuelle :
sommeil et énergie du matin

Aujourd’hui :
1. Action du matin
2. Action alimentaire
3. Action du soir
4. Check-in 15 secondes
```

## Principes UX

- Une action principale par écran.
- Pas de jargon.
- Pas de rouge alarme.
- Pas de score isolé.
- Toujours un message rassurant.
- Toujours un chemin pour poser une question.
- Priorité mobile.

## Objets conceptuels

```text
patient_home_state
- patient_id
- current_balance_score
- delta_since_last
- current_priority_label
- today_actions[]
- unread_practitioner_message
- checkin_due
```

```text
daily_action
- id
- care_plan_id
- title_patient
- explanation_short
- timing
- action_type
- completion_status
```

## Check-in 15 secondes

Questions possibles :

```text
Comment était votre énergie aujourd’hui ?
Comment était votre sommeil ?
Comment était votre stress ?
Avez-vous suivi votre protocole ?
Souhaitez-vous signaler quelque chose ?
```

## Réponses

Utiliser des échelles simples :

```text
Très difficile
Difficile
Correct
Bon
Très bon
```

ou :

```text
0 / 1 / 2 / 3 / 4
```

mais toujours avec libellés.

## Parcours patient

```text
T0 :
questionnaires + première synthèse.

J1-J21 :
protocole + check-ins courts.

J21 :
bilan de progression.

J22-J42 :
phase 2 ou ajustement.

J90 :
bilan longitudinal.
```

## Fiches visibles patient

Le patient peut recevoir :

- fiche aliment ;
- fiche complément ;
- fiche routine ;
- fiche biologie ;
- fiche écart utile ;
- fiche sommeil ;
- fiche stress ;
- fiche digestion.

## Microcopy

### À privilégier

```text
On cherche la régularité, pas la perfection.
Votre objectif cette semaine est simple.
Ce retour aide votre praticien à ajuster.
Un oubli n’annule pas votre progression.
```

### À éviter

```text
Vous avez échoué.
Votre score est mauvais.
Vous êtes carencé.
Vous devez absolument.
```

## Notifications

Notifications possibles :

- check-in du soir ;
- rappel protocole ;
- message praticien ;
- jalon J21 ;
- fiche du jour.

Règles :

- pas de notification anxiogène ;
- pas plus d’une ou deux par jour ;
- désactivation possible ;
- personnalisation horaire.

## UX mobile

```text
Bottom navigation :
Accueil
Protocole
Fiches
Messages
Profil
```

## Innovations

### 1. Mode “jour difficile”

Si le patient indique une mauvaise journée :

```text
Aujourd’hui, on simplifie.
Votre action minimale :
boire, respirer, garder une routine simple.
```

### 2. Mode “je n’ai pas suivi”

Réponse :

```text
Merci pour votre retour. On reprend simplement demain.
```

### 3. Mode “victoire”

```text
Vous avez rempli 5 check-ins cette semaine.
C’est cette régularité qui permet d’ajuster finement.
```

## Critères d’acceptation

- Le patient sait quoi faire en moins de 10 secondes.
- Le protocole est compréhensible sans lire un PDF.
- Le check-in prend moins de 15 secondes.
- Le patient peut signaler un effet ou une question.
- Aucun écran ne culpabilise.

## Prompt agent dev

```text
Conçois le dashboard patient WellNeuro comme un compagnon quotidien. Il doit afficher Mon équilibre, une priorité actuelle, les actions du jour, un check-in 15 secondes, les fiches utiles et un accès messagerie. UX mobile-first, langage rassurant, aucun jargon clinique, aucune culpabilisation. Prévois états vide/en cours/J21, objets conceptuels et critères d’acceptation.
```

## Questions ouvertes

- Faut-il une app PWA ou rester web responsive ?
- Combien de notifications maximum ?
- Le patient peut-il modifier ses actions ou seulement les cocher ?
