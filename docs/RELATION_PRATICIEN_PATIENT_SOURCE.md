---
title: "Wellneuro — Relation praticien–patient et interaction entre les deux front-ends"
document_role: "Source fonctionnelle et architecturale transversale"
status: "Audit initial — constats historiques à revalider au LOT-00 de chaque campagne concernée"
version: "1.1"
audit_date: "2026-07-13"
last_editorial_update: "2026-07-15"
repository: "martialcayre-sketch/Wellneuro-app"
audited_commit: "d7febb690ba4c77e89fb9c6a489084db01d3ff1b"
language: "fr"
---

# Wellneuro — Source de la relation praticien–patient

## 0. Statut et usage

Ce document relie les parcours, responsabilités, objets de données, états
métier et frontières d’exposition des front-ends praticien et patient.

Il décrit un audit réalisé au commit indiqué dans le frontmatter. Il ne doit pas
être utilisé comme vérité sur le code courant sans revalidation. Toute campagne
qui consomme un constat de ce document commence par un LOT-00 confrontant le
constat à l’état réel du dépôt.

Ce document ne constitue ni :

- un audit juridique ;
- un test d’intrusion ;
- une qualification réglementaire ;
- une validation d’hébergement ;
- une procédure clinique ;
- une autorisation d’utiliser des données patient réelles.

Le code et le schéma du commit courant décrivent l’état implémenté. Le
`REGISTRE_FRONTIERES.md` reste la source normative des frontières du programme.

## 1. Vision relationnelle

Wellneuro doit être considéré comme un seul système d’accompagnement à deux
projections :

- **front praticien** : lecture dense, explicable, décisionnelle et traçable ;
- **front patient** : lecture calme, guidée, contextualisée et strictement
  filtrée.

Les deux interfaces ne doivent pas échanger directement. Elles consomment et
mettent à jour des objets communs, avec des DTO et contrôles d’accès propres à
chaque rôle.

```text
Patient → relation d’accompagnement → épisode → données déclarées →
questionnaires → synthèse → décision validée → protocole publié →
suivi → réévaluation → documents
```

## 2. Socle observé lors de l’audit initial

Le dépôt permettait déjà, selon le périmètre audité :

- la création d’un patient ;
- l’ouverture d’une consultation ;
- l’accès à un portail patient ;
- le recueil d’informations et de questionnaires ;
- la sauvegarde puis la transmission ;
- le verrouillage et une boucle de correction ;
- le calcul de vues d’équilibre ;
- la préparation d’une synthèse assistée par IA ;
- la relecture et validation humaine ;
- la préparation et l’envoi d’un document patient.

Le parcours E2E historique couvrait notamment :

```text
création → accès patient → onboarding → assignation → brouillon →
transmission → verrouillage → demande de correction → arbitrage praticien →
resoumission
```

Ces capacités doivent être recontrôlées sur le code courant.

## 3. Constats structurants de l’audit initial

### 3.1 Une seule relation métier

Les deux front-ends reposent sur une base et des objets communs. La
synchronisation dépend des états des consultations, assignations, réponses,
synthèses et documents.

Cette architecture est saine si :

- la propriété des ressources est contrôlée systématiquement ;
- les projections patient sont construites explicitement ;
- les états sont versionnés et auditables ;
- les mutations sensibles sont idempotentes et transactionnelles.

### 3.2 Collecte et correction déjà avancées

La boucle de collecte, transmission, verrouillage et correction était l’un des
segments les plus matures.

La suite doit préserver :

- la distinction brouillon / transmis ;
- la visibilité du statut de sauvegarde ;
- l’auteur et la date des actions ;
- l’absence de modification silencieuse après validation.

### 3.3 Isolation multi-praticien à considérer comme un gate

Le champ propriétaire existait historiquement, mais son application n’était pas
uniforme dans toutes les routes. Tout passage à plusieurs praticiens impose :

- contrôle de propriété centralisé ;
- tests praticien A / praticien B ;
- réponse neutre aux accès indirects non autorisés ;
- journal d’accès ;
- modèle organisationnel explicite.

Aucune notice patient ne compense une isolation insuffisante.

### 3.4 Portail permanent comme entrée cible

L’audit relevait une coexistence entre le portail permanent et un flux
historique par assignation. La cible relationnelle reste :

- un seul compte ou espace patient ;
- une authentification et une révocation cohérentes ;
- un historique de documents et d’actions ;
- des liens d’invitation temporaires, non des accès permanents non maîtrisés.

### 3.5 Le milieu de la relation reste le principal chantier

La collecte initiale était plus mature que la continuité après synthèse. Les
objets suivants appartiennent aux campagnes C1/C2/C3 :

- décision structurée ;
- protocole 21 jours ;
- trois actions maximum ;
- publication patient ;
- check-ins J7/J14/J21 ;
- ajustements ;
- documents persistants ;
- timeline relationnelle.

## 4. Frontière patient-safe

La projection patient doit être un contrat, pas un filtrage visuel tardif.

Le patient peut voir :

- ses données déclarées ;
- les états de transmission ;
- les contenus publiés ;
- les indicateurs expliqués ;
- les documents validés ;
- ses choix et droits ;
- les événements relationnels utiles.

Le patient ne doit pas recevoir :

- notes internes ;
- prompt système ;
- brouillons praticien ;
- seuils internes non publiés ;
- chaîne de raisonnement ;
- données d’un autre patient ;
- commentaires privés ;
- propositions moteur non validées.

## 5. États relationnels à distinguer

### Questionnaires

```text
assigned → opened → draft_local_or_synced → submitted → locked →
change_requested → unlocked → resubmitted
```

### Synthèse et décision

```text
draft → reviewed → validated → published → superseded
```

### Protocole

```text
draft → reviewed → validated_for_publication → published → active →
completed_or_revised
```

### Documents normatifs TRUST

```text
draft → reviewed → approved → published → superseded → archived
```

Les mots affichés au patient doivent rester simples et ne jamais sur-promettre
l’état réel.

## 6. Événements relationnels publics

Exemples de timeline praticien :

- questionnaire assigné ;
- réponse transmise ;
- correction demandée ;
- synthèse à valider ;
- protocole publié ;
- point d’étape reçu ;
- document non délivré ;
- demande liée aux droits ;
- effet indésirable signalé.

Exemples de timeline patient :

- questionnaire disponible ;
- réponses transmises ;
- correction autorisée ;
- document publié ;
- rendez-vous de suivi ouvert ;
- choix modifié ;
- nouvelle information importante.

Les événements techniques, notes internes et règles de scoring restent exclus.

## 7. Expérience praticien cible

La fiche patient priorise la prochaine décision utile :

1. épisode actif ;
2. action à décider ;
3. données manquantes et vigilances ;
4. signal principal ;
5. vues explicables ;
6. décision ;
7. protocole ;
8. prévisualisation patient ;
9. historique repliable.

Une file spécifique regroupe :

- synthèses à relire ;
- décisions à confirmer ;
- protocoles à publier ;
- corrections à arbitrer ;
- signaux de sécurité ;
- demandes de droits ;
- incidents et erreurs de livraison.

## 8. Expérience patient cible

Navigation cible :

```text
Accueil
Mon protocole
Mes questionnaires
Mon équilibre
Mes suivis
Mes documents
Informations, confidentialité et droits
```

Principes :

- prochaine action explicite ;
- statut compréhensible ;
- pas de jargon brut ;
- pas de score isolé ;
- provenance visible ;
- correction possible ;
- absence de changement silencieux ;
- distinction locale / synchronisée / transmise / validée / publiée ;
- notifications externes génériques.

## 9. Nouvelle responsabilité TRUST

La campagne
`2026-07-15-trust-information-patient-droits-v1` possède le cadre normatif de
la relation :

- premier accès « Avant de commencer » ;
- centre permanent d’information ;
- versionnement des notices ;
- accusés de lecture ;
- choix et retraits ;
- transparence IA ;
- provenance patient ;
- charte de disponibilité ;
- signalements d’effet indésirable et de confidentialité ;
- demandes liées aux droits ;
- politique de notifications ;
- délégations et représentants.

TRUST ne possède ni scoring, ni décision clinique, ni protocole, ni contenus de
questionnaires.

## 10. Roadmap relationnelle recommandée

### Phase A — Sécuriser le socle

- isolation par praticien/organisation ;
- contrôle d’accès centralisé ;
- portail permanent unifié ;
- sessions et révocations ;
- transactions et idempotence ;
- journalisation ;
- hébergement adapté avant données réelles.

### Phase B — Décider et publier

- C1 : snapshot, décision, protocole brouillon, validation ;
- C3 : documents multi-destinataires ;
- TRUST : information, provenance, droits, publication normative.

### Phase C — Fermer la boucle patient

- protocole consultable ;
- documents persistants ;
- centre d’information ;
- notifications génériques ;
- historique patient-safe.

### Phase D — Suivre et ajuster

- C2 : J7/J14/J21 ;
- résumé J21 ;
- ajustement validé ;
- nouvelle phase.

## 11. Tests transversaux obligatoires

- patient A ne voit pas B ;
- praticien A ne voit pas B ;
- projection patient sans données internes ;
- double clic et retry sans doublon ;
- révocation effective ;
- session expirée ;
- route legacy ;
- notification échouée ;
- document supersédé ;
- contenu IA non validé invisible ;
- parcours complet sur patients fictifs uniquement ;
- clavier, lecteur d’écran, zoom 200 %, mobile.

## 12. Invariants

- aucune donnée patient réelle dans les fixtures ou la documentation ;
- validation humaine avant diffusion d’un contenu généré ;
- aucune migration sans confirmation distincte ;
- aucun secret dans le dépôt ;
- HDS ou cadre d’hébergement adapté avant données de santé réelles ;
- vocabulaire conforme au registre ;
- chaque règle clinique a une source, une version, un propriétaire et un test ;
- chaque document publié est immuable et versionné.

## 13. Décisions transversales proposées

| ID | Décision | Statut |
|---|---|---|
| RP-01 | Le portail permanent devient l’entrée de référence | à confirmer sur l’état courant |
| RP-02 | La relation est structurée par un épisode d’accompagnement | cible |
| RP-03 | Toute ressource est filtrée par relation autorisée | bloquant |
| RP-04 | Toute mutation critique est idempotente et transactionnelle | bloquant |
| RP-05 | Toute donnée patient possède une projection dédiée | invariant |
| RP-06 | Décisions, protocoles et documents sont versionnés et validés | invariant |
| RP-07 | Les documents restent disponibles dans le portail | cible |
| RP-08 | J7/J14/J21 restent distincts des jalons de mesure | acté au registre |
| RP-09 | Le legacy est mesuré puis décommissionné | à planifier |
| RP-10 | Les communications ont un journal de livraison | cible |
| RP-11 | La révocation ne peut pas être annulée par un simple renvoi | cible |
| RP-12 | L’information reflète l’architecture et les sous-traitants réels | bloquant |
| RP-13 | TRUST devient la campagne transverse des informations et droits | proposé dans la branche TRUST |

## 14. Maintenance

Toute mise à jour indique :

```yaml
status: current | superseded | historical
valid_from_commit: "sha"
last_verified_commit: "sha"
owner: "campaign-or-domain"
```

Ce document doit rester une carte transversale et ne pas absorber :

- les règles de scoring ;
- le contenu complet des questionnaires ;
- les posologies ;
- le catalogue de produits ;
- les secrets ;
- les données patient réelles.
