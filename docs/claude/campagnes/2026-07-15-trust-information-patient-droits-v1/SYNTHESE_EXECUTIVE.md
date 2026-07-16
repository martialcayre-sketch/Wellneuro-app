# Synthèse exécutive — Cadre relationnel patient Wellneuro

## Décision proposée

Wellneuro ne doit pas ajouter une simple notice PDF à cocher. La cible est un
**centre d’information patient versionné**, articulé avec un parcours court au
premier accès et des notices contextuelles au moment utile.

Le produit doit traiter l’information comme une fonction continue de la
relation, pas comme une formalité d’entrée.

## Pourquoi cette campagne est nécessaire

L’audit de la relation praticien–patient montre que le portail sait déjà :

- identifier un patient ;
- recueillir des données ;
- assigner des questionnaires ;
- recevoir des réponses ;
- gérer une correction ;
- générer et faire valider une synthèse ;
- envoyer un document.

Il ne possède pas encore nativement :

- une bibliothèque permanente des informations normatives ;
- un historique de versions présenté au patient ;
- des événements génériques de lecture, accord et retrait ;
- un tableau de bord des droits ;
- une transparence structurée sur l’IA ;
- une charte de relation numérique ;
- un parcours d’effet indésirable ;
- un parcours d’incident de confidentialité ;
- des badges systématiques de provenance ;
- une politique explicite de notification externe.

## Le risque à éviter

Une page unique « J’accepte tout » mélangerait :

- information ;
- exécution du service ;
- traitement des données ;
- autorisations facultatives ;
- partage avec un tiers ;
- utilisation de l’IA ;
- communications non essentielles.

Une telle page serait fragile sur les plans UX, éthique, juridique et
relationnel. Elle favoriserait le clic réflexe et ne prouverait pas la
compréhension.

## Architecture retenue

```text
Niveau 1 — Avant de commencer
  4 écrans, 2 minutes, informations essentielles

Niveau 2 — Information contextuelle
  la bonne information au moment de l’action

Niveau 3 — Centre permanent
  informations, choix, versions, droits et signalements
```

## Principe de séparation

| Objet | Action attendue |
|---|---|
| Information obligatoire | « J’ai pris connaissance » |
| Choix réellement facultatif | « J’autorise / Je n’autorise pas » |
| Partage ponctuel | Confirmation contextualisée |
| Retrait | Nouvel événement immuable |
| Mise à jour majeure | Nouvelle prise de connaissance |
| Correction éditoriale | Pas de blocage ni de nouvelle confirmation |

## Expérience patient cible

Le patient doit pouvoir répondre à tout moment à huit questions :

1. Où en suis-je dans mon accompagnement ?
2. Que fait Wellneuro avec mes réponses ?
3. Qui peut voir mes informations ?
4. L’IA intervient-elle ici ?
5. Ce résultat est-il déclaré, calculé, proposé ou validé ?
6. Que faire si mon état s’aggrave ?
7. Comment modifier mes choix ou exercer mes droits ?
8. Comment signaler un problème ou une mauvaise tolérance ?

## Expérience praticien cible

La fiche patient affiche une carte dédiée :

```text
Informations et droits
────────────────────────────────────────
Cadre actuel                         v1.0
Présenté le                          15/07/2026
Prise de connaissance               Oui
Partage médecin                     Non autorisé
Aidant                              Aucun
Demande d’accès                     Aucune
Signalement de confidentialité      Aucun
Effet indésirable                   Aucun
Action attendue                     —
```

## Décisions produit structurantes

- Version canonique en HTML ; PDF seulement comme export.
- Pas de choix précoché.
- Pas d’envoi de données sensibles dans l’objet ou le corps d’une notification.
- Pas de promesse de lecture continue des messages.
- Pas de décision clinique autonome produite par IA.
- Pas d’affichage d’un score sans contexte et provenance.
- Pas de suppression silencieuse d’une version ou d’un retrait.
- Pas de compensation juridique d’une faiblesse technique par un avertissement.
- Pas de finalité commerciale cachée.
- Pas de règles cliniques automatiques non sourcées.

## Ordre de mise en œuvre recommandé

### P0 — Socle de confiance

- audit réel ;
- clarification des rôles ;
- versionnement documentaire ;
- séparation lecture / autorisations ;
- centre permanent ;
- sécurité des notifications ;
- isolation et authentification minimales.

### P1 — Sécurité relationnelle

- charte numérique ;
- signaux préoccupants ;
- signalement d’effet indésirable ;
- incidents de confidentialité ;
- délégation aidant/représentant.

### P2 — Transparence avancée

- badges de provenance ;
- fiche d’usage IA ;
- historique détaillé ;
- export des choix ;
- versions audio, simplifiées et multilingues.

## Verdict

La campagne est **prioritaire avant tout usage réel à échelle**, mais elle ne
doit pas interrompre les campagnes cliniques existantes. Elle peut être
préparée en parallèle comme campagne transverse, avec un raccordement progressif
à HC-F, QX, C1, C2 et C3.

Le bon objectif n’est pas « faire accepter une notice ». Le bon objectif est :

> rendre la relation numérique compréhensible, contestable, sécurisée et
> traçable pendant toute la durée de l’accompagnement.
