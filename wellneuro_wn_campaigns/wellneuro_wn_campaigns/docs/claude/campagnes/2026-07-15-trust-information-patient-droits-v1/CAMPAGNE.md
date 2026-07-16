---
id: "2026-07-15-trust-information-patient-droits-v1"
titre: "TRUST — Information patient, consentements et sécurité relationnelle V1"
statut: "en cours"
créée_le: "2026-07-15"
mise_à_jour: "2026-07-15"
lot_courant: "LOT-05"
---

# TRUST — Information patient, consentements et sécurité relationnelle V1

> Campagne transversale issue du brainstorming du 2026-07-15 et de l’audit
> `docs/RELATION_PRATICIEN_PATIENT_SOURCE.md`.
>
> **Verdict de cadrage : GO pour la documentation et le prototypage ; NO-GO pour
> l’activation avec des données réelles tant que les gates juridique, sécurité,
> hébergement, authentification et gouvernance clinique ne sont pas levés.**

## 1. Intention

Transformer une simple « notice à accepter » en un **cadre relationnel patient
permanent, versionné, compréhensible et traçable**.

La campagne couvre trois niveaux d’information :

1. **Premier accès** : séquence courte « Avant de commencer » ;
2. **Information contextuelle** : au moment exact où une donnée, une synthèse,
   une fonction IA, un partage ou une action sensible intervient ;
3. **Centre permanent** : espace « Informations, confidentialité et droits »
   consultable depuis toutes les pages du portail.

Le patient ne doit pas seulement avoir « vu une notice ». Il doit pouvoir
comprendre :

- ce que Wellneuro fait et ne fait pas ;
- la place du praticien et du médecin traitant ;
- ce qui est surveillé ou non ;
- ce que deviennent ses données ;
- comment l’IA intervient ;
- quels contenus sont calculés, proposés, relus ou publiés ;
- comment exercer ses droits, modifier ses choix ou signaler un problème.

## 2. Problème produit

Le système actuel sait recueillir un consentement, des données anamnestiques et
des questionnaires. Il ne possède pas encore de centre permanent d’information
patient ni de modèle générique de documents normatifs versionnés.

Les risques d’une simple page PDF + case à cocher sont :

- lecture passive ou fictive ;
- confusion entre information, consentement et contrat ;
- mélange de finalités différentes ;
- impossibilité de prouver quelle version a été présentée ;
- document peu accessible sur mobile ;
- absence d’information contextuelle ;
- incapacité du patient à revoir ses choix ;
- tonalité défensive qui fragilise la relation ;
- illusion qu’un avertissement compense un défaut de sécurité ou de conception.

## 3. Résultat attendu

```text
Invitation
  ↓
Vérification d’identité
  ↓
Avant de commencer — 4 écrans courts
  ↓
Accusé de lecture du cadre
  ↓
Choix facultatifs séparés
  ↓
Onboarding et questionnaires
  ↓
Information contextuelle au bon moment
  ↓
Centre permanent + historique des versions
```

Côté praticien :

```text
Cadre présenté → version → lecture → choix → retraits → alertes →
demandes d’exercice des droits → incidents → historique
```

## 4. Frontière fondatrice

### TRUST possède

- les documents d’information normatifs et leurs versions ;
- les accusés de lecture ;
- les événements de consentement ou d’autorisation réellement facultatifs ;
- les écrans de premier accès ;
- le centre permanent d’information et de droits ;
- les notices contextuelles ;
- les badges de provenance et de validation côté patient ;
- les parcours structurés de signalement :
  - problème de confidentialité ;
  - effet indésirable suspecté ;
  - demande liée aux données ;
- les contrats d’escalade de sécurité relationnelle ;
- la visibilité praticien de l’état information/consentements/droits ;
- la politique de notification externe sans donnée sensible.

### TRUST consomme

- la charte et les primitives patient HC-F ;
- le portail permanent et les sessions patient existantes ;
- les surfaces QX pour les notices avant questionnaire ;
- C3 pour les documents personnalisés issus du dossier clinique ;
- C1/C2 pour les états « proposé / validé / publié » ;
- les contrats publics de provenance du moteur clinique ;
- l’infrastructure de notification existante ;
- la future campagne d’authentification inter-assignations.

### TRUST ne possède pas

- les règles de scoring ;
- les seuils cliniques ;
- les contenus de questionnaires ;
- la décision clinique ;
- le protocole de 21 jours ;
- le dossier médical ;
- une messagerie clinique ouverte ;
- une télésurveillance ;
- la qualification réglementaire du produit ;
- la base légale définitive de chaque traitement ;
- le choix du fournisseur d’IA ;
- une migration Prisma ou SQL sans confirmation distincte.

## 5. Décisions actées par le cadrage

1. Le terme produit privilégié est **« Informations, confidentialité et droits »**,
   pas « avertissement juridique ».
2. Le PDF est un export ; **la version canonique est HTML**, accessible et
   mobile.
3. « J’ai pris connaissance » est distinct de « J’autorise ».
4. Aucun choix facultatif n’est précoché.
5. Une action essentielle ne peut pas être conditionnée à une finalité
   réellement facultative.
6. Une modification éditoriale mineure ne redemande pas une confirmation ;
   un changement substantiel oui.
7. Les événements d’accord ou de retrait sont immuables.
8. L’IA ne prend aucune décision autonome diffusée au patient.
9. Un score, un radar ou une hypothèse n’est jamais présenté comme une certitude.
10. Wellneuro n’est pas un service d’urgence ni de surveillance continue.
11. Un message patient potentiellement préoccupant ne doit jamais promettre une
    réponse rapide si l’organisation ne peut pas la garantir.
12. Une notice ne compense jamais un défaut d’authentification, d’isolation des
    données, d’hébergement ou de contrôle d’accès.
13. Les notifications externes restent génériques ; les contenus sensibles sont
    consultés dans le portail.
14. Le patient peut signaler un effet indésirable suspecté sans que Wellneuro
    prétende établir un lien de causalité.
15. Toute formulation juridique ou réglementaire doit être validée avant mise en
    production.

## 6. Architecture de contenu

### Niveau 1 — Premier accès

Quatre écrans :

1. Bienvenue et finalité ;
2. Ce que Wellneuro fait et ne fait pas ;
3. Données, confidentialité et IA ;
4. Sécurité, urgence et prochaine étape.

### Niveau 2 — Notices contextuelles

Exemples :

- avant de transmettre un questionnaire ;
- avant de partager un document ;
- avant d’envoyer une synthèse au médecin ;
- avant d’utiliser une fonction IA visible ;
- avant une exploration non remboursée ;
- avant de signaler un effet indésirable ;
- avant de retirer une autorisation.

### Niveau 3 — Centre permanent

Cartes proposées :

- Mon accompagnement ;
- Limites et sécurité médicale ;
- Données personnelles et confidentialité ;
- Intelligence artificielle ;
- Mes choix et autorisations ;
- Mes documents d’information ;
- Historique des versions ;
- Signaler un problème.

## 7. Lots compilés

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit de l’état réel, frontières et gates | terminé | audit source + registre |
| LOT-01 | Modèle documentaire, versionnement et événements | terminé | LOT-00 |
| LOT-02 | Premier accès et centre permanent | terminé | LOT-01 + HC-F |
| LOT-03 | Consentements, droits et cycle de vie du compte | terminé (périmètre V1 — délégations et cycle de vie différés vers IDP) | LOT-01 + LOT-02 |
| LOT-04 | Sécurité clinique, alertes et nutrivigilance | terminé (règle v1 + signalement + file praticien) | LOT-02 |
| LOT-05 | Transparence IA, validation humaine et provenance | terminé | LOT-01 + C1/C3 |
| LOT-06 | Authentification, délégations, partage et notifications | à_faire | LOT-00 + auth existante |
| LOT-07 | Accessibilité, tests, validation externe et handoff | à_faire | LOT-01 à LOT-06 |

## 8. Gates obligatoires

### Gate G-TRUST-01 — État réel du dépôt

LOT-00 doit vérifier l’audit source contre le commit courant. Aucun constat
historique ne devient une vérité actuelle sans relecture.

### Gate G-TRUST-02 — Qualification des rôles

Identifier et documenter :

- responsable du traitement ;
- sous-traitants ;
- destinataires ;
- rôle du praticien ;
- rôle de l’éditeur ;
- rôle du fournisseur d’IA ;
- éventuel DPO ou point de contact.

### Gate G-TRUST-03 — Validation juridique

Valider notamment :

- bases légales ;
- information RGPD ;
- gestion des données de santé ;
- durées de conservation ;
- transferts ;
- mineurs et représentants ;
- exercice des droits ;
- articulation avec le secret professionnel.

### Gate G-TRUST-04 — Sécurité et hébergement

Pas de données réelles sans :

- architecture d’hébergement adaptée ;
- contrôle d’accès centralisé ;
- isolation multi-praticien ;
- gestion des sessions et révocations ;
- journalisation ;
- réponse aux incidents ;
- tests de sécurité documentés.

### Gate G-TRUST-05 — Gouvernance clinique

Toute règle de détection d’un signal préoccupant doit avoir :

- une source ;
- un propriétaire clinique ;
- une version ;
- un protocole d’escalade ;
- une consigne patient ;
- un test ;
- une revue périodique.

### Gate G-TRUST-06 — IA

Le fournisseur, les données transmises, les durées, les transferts, la
réutilisation éventuelle et les mécanismes de validation humaine doivent être
connus et reflétés exactement dans l’information patient.

## 9. Hors périmètre V1

- signature électronique qualifiée ;
- consentement à la recherche ;
- portail de recherche clinique ;
- chatbot clinique autonome ;
- télésurveillance 24/7 ;
- analyse automatique de texte libre à visée d’urgence ;
- intégration automatique avec les services d’urgence ;
- recommandations directes non validées ;
- passkeys si elles nécessitent une campagne auth dédiée ;
- migration de données historiques ;
- prise en charge multilingue complète au-delà du contrat d’internationalisation.

## 10. Definition of Done de campagne

- [ ] Le premier accès présente une information courte et compréhensible.
- [ ] L’information détaillée reste accessible depuis toutes les pages patient.
- [ ] Chaque version est identifiable et historisée.
- [ ] Lecture, consentement et autorisations sont séparés.
- [ ] Le patient peut revoir et modifier les choix facultatifs.
- [ ] Le praticien voit l’état des informations et demandes.
- [ ] Les badges de provenance sont cohérents avec les états réels.
- [ ] Les contenus IA diffusés exigent une validation humaine explicite.
- [ ] Les notifications ne révèlent aucune donnée sensible.
- [ ] Les parcours d’urgence ne promettent aucune surveillance inexistante.
- [ ] Le signalement d’effet indésirable est disponible et tracé.
- [ ] Les mineurs, représentants et aidants ont un modèle de délégation explicite.
- [ ] Les tests couvrent accessibilité, sécurité, versionnement et frontière patient.
- [ ] Un verdict GO / GO avec dettes / NO-GO est émis avant activation.
