# Audit BioFlow — WellNeuro

> **Snapshot historique du 2026-10-04 : ne pas l'utiliser comme état courant
> sans vérifier `main`.** Ce document est une photographie datée, versée
> le 2026-10-05 et complétée le même jour par le §3.4 (NABM et
> remboursement), avant tout usage. Il ne constitue ni une campagne, ni un backlog,
> ni une autorisation de modifier le schéma (§16). Ce qui a changé depuis :
>
> - la borne totale d'extraction est corrigée (BIO-INGEST LOT-08, #1315 et
>   #1316) ;
> - BP-01 est terminé (#1314) ;
> - BIO-INGEST LOT-03 est clos (#1318) ;
> - la recommandation du §6.1 est retenue ; elle passe par la décision
>   préalable à BIO-INGEST LOT-07.
>
> L'ordre arbitré et les gates se lisent dans
> [`BIOFLOW_ROADMAP.md`](BIOFLOW_ROADMAP.md), les lots dans les deux
> campagnes.

**Date de référence : 4 octobre 2026**
**Statut : document stratégique et architectural de référence**
**Nature : audit, non backlog exécutable**

---

## 1. Objet

Cet audit évalue l'opportunité de transformer progressivement le moteur
biologique existant de WellNeuro en une brique identifiable sous le nom
**BioFlow**, potentiellement exploitable à terme comme produit, API ou service
autonome.

Il ne recommande pas de créer un nouveau moteur biologique parallèle.

La conclusion centrale est la suivante :

> **BioFlow doit être construit à partir des briques existantes BIO-INGEST,
> biology-library et BIO-PARCOURS, sans duplication du modèle de données ni
> réécriture prématurée.**

WellNeuro reste le premier consommateur de BioFlow.

---

## 2. Terminologie retenue

### BioFlow

BioFlow désigne l'ensemble fonctionnel et architectural permettant de :

1. recevoir une donnée biologique ;
2. extraire les mesures ;
3. identifier les analytes ;
4. préserver la provenance ;
5. soumettre les résultats à validation ;
6. stocker les résultats biologiques ;
7. suivre leur évolution ;
8. les intégrer dans un parcours clinique ;
9. éventuellement proposer ultérieurement des fonctions d'assistance.

BioFlow n'est pas aujourd'hui une nouvelle application.

### BIO-INGEST

BIO-INGEST constitue la chaîne d'entrée et de fiabilisation :

```text
document / saisie / photo
        ↓
extraction
        ↓
staging
        ↓
résolution analyte
        ↓
validation
        ↓
résultat biologique
```

Sa finalité est :

> produire une donnée biologique structurée, traçable et suffisamment fiable
> pour être utilisée par WellNeuro.

### BIO-PARCOURS

BIO-PARCOURS exploite la donnée validée :

```text
résultat biologique
        ↓
longitudinalité
        ↓
contexte
        ↓
constat
        ↓
exploration
        ↓
décision praticien
        ↓
suivi / réévaluation
```

Sa finalité est différente de BIO-INGEST :

> transformer la donnée biologique validée en information clinique
> longitudinale utilisable par le praticien.

### BioFlow Platform

**Non ouverte au 4 octobre 2026.**

Elle désignera éventuellement la phase d'externalisation :

- API publique ;
- multi-tenant ;
- API keys / OAuth ;
- quotas ;
- facturation ;
- SDK ;
- webhooks ;
- connecteurs laboratoires ;
- documentation développeurs.

Cette phase ne doit pas être lancée avant stabilisation du cœur.

---

## 3. État observé du moteur biologique

### 3.1 BIO-INGEST

Le dépôt contient déjà une chaîne fonctionnelle de dépôt, extraction, staging,
décision, écriture et purge.

L'écriture vers les résultats biologiques est contrôlée et la validation reste
un point central.

La logique existante respecte plusieurs principes importants :

- validation humaine ;
- absence de conversion automatique implicite ;
- staging avant résultat définitif ;
- contrôle de l'unité ;
- provenance partielle ;
- mécanismes de retrait et purge ;
- fonctionnement sous feature flag.

BIO-INGEST est donc déjà une fondation réelle et non un prototype à
reconstruire.

### 3.2 biology-library

WellNeuro possède déjà un catalogue biologique structuré comprenant
notamment :

- analytes ;
- unités ;
- synonymes/résolution ;
- référentiels ;
- structures utilisées par les importeurs.

Le catalogue distingue déjà notamment :

- référentiel laboratoire ;
- référentiel fonctionnel.

Cette séparation doit être conservée.

Le catalogue n'est toutefois pas encore une terminologie médicale générale :

- pas de LOINC généralisé ;
- pas de spécimen structuré ;
- pas de méthode structurée ;
- versionnement encore incomplet selon les objets.

Il ne faut pas tenter de résoudre ces points immédiatement si BIO-INGEST n'est
pas d'abord fiabilisé.

### 3.3 BIO-PARCOURS

Au moment de l'audit initial, BIO-PARCOURS était beaucoup moins avancé dans le
code que BIO-INGEST.

Le développement devait débuter par :

- gardes ;
- accès contrôlés ;
- longitudinalité factuelle ;
- contexte ;
- constat ;
- suivi.

Les fonctions d'assistance clinique ne doivent intervenir qu'après
qualification fonctionnelle et réglementaire.

### 3.4 NABM, cotation et remboursement : un actif à préserver

Le premier versement de cet audit sous-estimait ce sous-système. Il est
pourtant mûr, et c'est un actif propre à BioFlow en France.

**Import NABM versionné.** La nomenclature est importée depuis le Serveur
Multi-Terminologies de l'ANS (FHIR `$expand`).

- La provenance est `nabm_smt_ans`.
- Chaque import porte le millésime de la source.
- Un snapshot canonique est conservé, avec son empreinte SHA-256 recalculée
  par la base.
- Des contrôles de couverture et un plancher de volumétrie refusent un
  import incomplet.

Champs repris pour chaque acte :

- coefficient B ;
- entente préalable ;
- indication médicale ;
- nombre maximal par facturation ;
- RMO ;
- remboursement total ;
- acte réservé ;
- incompatibilités ;
- règles applicables ;
- statut actif ou inactif.

Code : `web/prisma/nabmImport.ts`.

**Remboursement dérivé, jamais stocké.** Il n'existe pas de colonne
`remboursable`. Le statut se calcule dans un seul fichier,
`web/src/lib/biology-library/remboursable.ts`. La règle : il faut une
correspondance analyte ↔ acte **signée**, vers un acte **actif** du
millésime **courant**.

Le calcul rend l'un de quatre états, jamais un booléen :

| État | Sens |
|---|---|
| `non_evalue` | Aucune correspondance signée. Ce n'est pas « non remboursé ». |
| `hors_nomenclature` | Aucune correspondance signée ne se résout sur un acte actif du millésime courant. |
| `remboursable` | Au moins un acte cote l'analyte seul ou au choix. |
| `remboursable_si_groupe` | L'analyte n'est coté qu'au sein d'un groupe imposé. |

Trois conditions s'affichent à côté de l'état, sans jamais le modifier :

- `entente_prealable` ;
- `acte_reserve` ;
- `remboursement_partiel`.

**Correspondance analyte ↔ NABM.** Elle vit dans la relation
`biology_analyte_nabm` : un code d'acte, une nature (`isole`, `groupe_et`,
`groupe_ou`) et une vérification humaine (`verifie_par`, `verifie_le`). Une
ligne non signée n'est qu'une proposition de rapprochement. La nature évite
de déclarer remboursable seul un analyte qui ne l'est qu'en groupe.

**Limite : le régime, pas le montant.** WellNeuro détermine le **régime**
NABM d'un analyte, pas le montant remboursé en euros. La source ne porte
qu'un coefficient, et la valeur de la lettre-clé relève d'un arrêté.
L'interface n'affiche jamais d'euros. Annoncer « coûte X €, remboursé Y € »
exigerait une source tarifaire officielle, versionnée par date, avec ses
règles de prise en charge. C'est hors champ.

#### Quatre principes d'architecture

1. `remboursable.ts` reste la **seule source de dérivation** du
   remboursement. Aucune colonne booléenne `remboursable`.
2. L'import NABM de l'ANS, versionné et appuyé sur un snapshot à empreinte,
   reste le **référentiel français des actes**.
3. La correspondance analyte ↔ NABM n'est **jamais automatisée sans
   contrôle**. Un algorithme peut proposer ; la correspondance de référence
   reste validée par un humain.
4. LOINC et NABM seront, le moment venu, **deux correspondances
   complémentaires, jamais concurrentes** : LOINC ne remplace pas NABM.

| Référentiel | Fonction |
|---|---|
| LOINC | Identifier sémantiquement une observation biologique ; faciliter l'interopérabilité. |
| NABM | Nomenclature française des actes ; conditions de cotation et de remboursement. |
| Catalogue WellNeuro | Objet clinique interne : l'analyte. |
| Correspondances | Relier ces mondes, avec validation et versionnement. |

#### Socle terminologique de BioFlow

```text
BioFlow Terminology Layer
├── analytes WellNeuro
├── synonymes / resolver
├── NABM versionnée
├── remboursement dérivé
├── correspondances analyte ↔ NABM signées
└── LOINC versionné [futur]
```

Un analyte se représente ainsi, sur le plan conceptuel :

```text
analyte
├── WellNeuro : code du catalogue
├── LOINC     : code(s) selon matrice et méthode [futur]
└── NABM      : acte(s) français correspondant(s)
                ├── coefficient B
                ├── conditions
                └── statut de remboursement dérivé
```

---

## 4. Architecture cible

La cible recommandée n'est pas un microservice immédiat.

Elle est :

```text
                 WELLNEURO
                     │
                     ▼
               BioFlow Core
                     │
        ┌────────────┼────────────┐
        │            │            │
   terminology     ingest      parcours
   (NABM, §3.4)      │            │
        └────────────┼────────────┘
                     │
                PostgreSQL
```

À terme :

```text
WellNeuro ───────┐
                 │
BioFlow API ─────┼──→ BioFlow Core
                 │
Autres clients ──┘
```

BioFlow Core doit d'abord être un **bounded context logique dans le monorepo
existant**.

Il ne justifie pas encore :

- nouveau repository ;
- nouveau backend ;
- nouveau langage ;
- duplication du schéma ;
- microservices.

---

## 5. Principe fondamental : séparer les niveaux de vérité

BioFlow doit préserver au minimum quatre niveaux distincts.

### 5.1 Mesure observée

Exemple :

```text
Ferritine = 43 µg/L
```

### 5.2 Faits imprimés sur le compte rendu

Exemple :

```text
Intervalle imprimé : 15–150
Flag imprimé : aucun
```

Ces informations appartiennent au document source.

Elles ne constituent pas automatiquement un référentiel universel.

### 5.3 Référentiel laboratoire/catalogue

Référentiel structuré et versionné éventuellement associé :

```text
BiologyReferenceRange
```

### 5.4 Référentiel fonctionnel WellNeuro

Référentiel distinct, associé à :

- population ;
- contexte ;
- source ;
- niveau de preuve ;
- version.

```text
BiologyFunctionalRange
```

#### Invariant

```text
fait imprimé
≠
référentiel laboratoire
≠
référentiel fonctionnel
≠
interprétation clinique
```

Cette séparation est structurante.

---

## 6. Principales lacunes identifiées

### 6.1 Provenance des faits imprimés

L'état initial de BIO-INGEST conserve déjà notamment :

- valeur lue ;
- unité lue ;
- date ;
- heure ;
- page ;
- libellé ;
- laboratoire au niveau import.

En revanche, l'audit a identifié l'absence structurée de :

- intervalle de référence imprimé ;
- indicateur H/L/+/- ou équivalent.

Ces faits peuvent disparaître lorsque le document source est purgé.

#### Recommandation

Conserver sur la donnée de staging :

```text
reference_interval_raw
flag_raw
```

nullable et strictement factuels.

Ne pas dériver immédiatement :

```text
reference_min
reference_max
```

à partir du texte.

Exemples légitimes de faits bruts :

```text
15 - 150
< 5
> 30
Négatif
Positif
H
L
+
++
```

Le parsing structuré pourra constituer une étape ultérieure, explicitement
dérivée.

---

## 7. Robustesse de l'extraction asynchrone

L'audit a identifié que l'extraction longue reposait sur un traitement exécuté
dans le processus web via `after()`.

Le dépôt ne possédait pas encore :

- worker dédié ;
- queue durable ;
- lease ;
- heartbeat ;
- mécanisme complet de reprise.

Cette architecture était acceptable pour valider le workflow, mais
insuffisante comme cible BioFlow.

L'audit a également identifié que la borne SDK supposée ne garantissait pas
initialement une limite de durée sur l'intégralité du flux.

Cette lacune devait être corrigée avant d'introduire le worker.

### Cible ultérieure

```text
upload
   ↓
BioJob QUEUED
   ↓
worker
   ↓
extraction
   ↓
staging
   ↓
validation
```

Le premier mécanisme recommandé est volontairement simple :

**PostgreSQL peut suffire comme file durable initiale.**

Fonctions nécessaires :

- tentative ;
- lease ;
- heartbeat ;
- reprise ;
- backoff ;
- idempotence ;
- états terminaux ;
- gestion des jobs abandonnés.

Ne pas introduire Redis, RabbitMQ ou Kafka sans besoin démontré.

---

## 8. Qualité de l'extraction

Un moteur médical ne doit pas être jugé uniquement par un taux global
d'accuracy.

BioFlow doit disposer d'un **gold dataset reproductible**.

Exemples de sources représentatives :

- Biogroup ;
- Synlab ;
- Barbier ;
- autres laboratoires ;
- PDF natifs ;
- scans ;
- photos ;
- documents complexes.

Chaque document de test doit posséder une vérité terrain.

Mesures recommandées :

- recall des lignes ;
- valeur correcte ;
- unité correcte ;
- date correcte ;
- laboratoire correct ;
- intervalle imprimé correct ;
- analyte correctement résolu ;
- ligne manquée ;
- ligne inventée ;
- ambiguïté correctement envoyée en validation.

### Métrique prioritaire

> **Silent Corruption Rate**

Une valeur incorrecte présentée comme fiable est plus grave qu'une valeur
explicitement marquée comme incertaine.

L'objectif prioritaire est donc :

```text
silent corruption → aussi proche de zéro que possible
```

---

## 9. Observabilité

BioFlow doit mesurer son fonctionnement sans envoyer de données de santé dans
les logs.

À instrumenter :

- provider ;
- modèle ;
- version du procédé ;
- nombre de pages ;
- nombre de candidats ;
- temps de traitement ;
- tokens entrée ;
- tokens sortie ;
- coût estimé ;
- retry ;
- failureCode ;
- taux de non-résolution ;
- temps en file.

Ne jamais placer dans Sentry ou les tags techniques :

- nom du patient ;
- valeur biologique ;
- contenu du compte rendu ;
- diagnostic ;
- texte médical identifiable.

---

## 10. BIO-PARCOURS : ordre fonctionnel

L'ordre recommandé est :

- **A — Mesure factuelle** : valeur, unité, date, provenance.
- **B — Longitudinalité** : analyte → série temporelle.
- **C — Contexte** : informations explicitement disponibles.
- **D — Constat** : constat du praticien.
- **E — Référentiels** : présentation séparée des faits du laboratoire, du
  référentiel biologique et du référentiel fonctionnel.
- **F — Exploration** : présence/absence d'examens et options pré-validées.
- **G — Décision** : décision humaine.
- **H — Assistant** : seulement après qualification.

L'assistant doit **proposer** et non **décider**.

Le praticien doit toujours pouvoir :

- accepter ;
- modifier ;
- ignorer.

---

## 11. Gate réglementaire

La qualification réglementaire ne doit pas être repoussée à la toute fin du
projet.

Les fonctions doivent être évaluées progressivement.

Exemple :

| Fonction | Nature |
|---|---|
| extraire une valeur | factuelle |
| structurer une mesure | factuelle |
| tracer une série | factuelle |
| afficher l'intervalle imprimé | factuelle |
| afficher un référentiel | à encadrer |
| signaler une donnée absente | à qualifier |
| proposer une exploration | potentiellement décisionnel |
| suggérer un diagnostic | fortement décisionnel |
| recommander un traitement | fortement décisionnel |

La qualification exacte vis-à-vis du MDR/IVDR et des logiciels dispositifs
médicaux doit être validée par une compétence réglementaire adaptée.

L'architecture doit cependant permettre cette séparation dès maintenant.

---

## 12. Données de santé et IA

Le chemin technique doit être documenté précisément :

```text
document patient
   ↓
WellNeuro / infrastructure HDS
   ↓
provider IA
```

À documenter :

- données envoyées ;
- données identifiantes ;
- modèle ;
- provider ;
- localisation ;
- sous-traitants ;
- rétention ;
- DPA ;
- SCC ;
- éventuelle politique ZDR ;
- mesures de minimisation.

Une pseudo-anonymisation fragile par expressions régulières ne doit pas être
présentée comme une véritable anonymisation.

---

## 13. Ce qu'il ne faut pas construire maintenant

Tant que le cœur n'est pas suffisamment stabilisé, ne pas lancer
spontanément :

- nouveau moteur BioFlow ;
- duplication des modèles biologiques ;
- microservice Python/FastAPI ;
- Redis ;
- Kafka ;
- RabbitMQ ;
- API publique complète ;
- multi-tenant global ;
- OAuth B2B ;
- Stripe ;
- portail développeurs ;
- SDK ;
- FHIR complet ;
- EHDS complet ;
- assistant diagnostique ;
- assistant thérapeutique.

---

## 14. Roadmap recommandée

### Phase P0 — Fiabilité WellNeuro

Priorité absolue :

1. fiabilité de la durée d'extraction ;
2. provenance laboratoire complète ;
3. stabilisation BIO-INGEST ;
4. longitudinalité factuelle ;
5. validation humaine ;
6. tests reproductibles.

### Phase P1 — Industrialisation du cœur

Après P0 :

1. jobs durables ;
2. worker ;
3. reprise/idempotence ;
4. gold dataset ;
5. observabilité ;
6. métriques qualité ;
7. coût réel par document.

### Phase P2 — Préparation à l'externalisation

Seulement après stabilisation :

- frontières de domaine ;
- organisation/tenant ;
- isolation ;
- API credentials ;
- API versionnée ;
- idempotency keys ;
- rate limiting ;
- terminologies versionnées ;
- LOINC si besoin démontré, en complément de la NABM et jamais à sa place
  (§3.4) ;
- webhooks.

### Phase P3 — SaaS/API pilote

- API publique ;
- OpenAPI ;
- sandbox ;
- onboarding ;
- usage ledger ;
- facturation ;
- premier client externe ;
- premier connecteur laboratoire pilote.

### Phase P4 — Scale

- OAuth/SSO ;
- SDK ;
- SLA ;
- pentest ;
- interopérabilité élargie ;
- FHIR/CI-SIS/EHDS selon besoins réels ;
- plusieurs partenaires laboratoire.

---

## 15. Organisation du développement

BIO-INGEST et BIO-PARCOURS ne doivent pas être fusionnées.

Elles doivent avancer comme deux tracks coordonnées.

```text
BIOFLOW
│
├── Track A : BIO-INGEST
│
├── Track B : BIO-PARCOURS
│
└── Cross-track gates
```

Principe :

> une campagne produit la donnée fiable ; l'autre l'exploite.

Le parallélisme est autorisé lorsqu'il n'existe pas de conflit structurel.

Règle recommandée :

> maximum une PR structurelle active par track.

Ne pas faire travailler simultanément plusieurs agents sur le même modèle
Prisma ou le même contrat biologique.

---

## 16. Gouvernance de l'audit

Ce document est une photographie datée.

Il ne constitue pas :

- une campagne ;
- une liste de lots ;
- un second backlog ;
- une instruction automatique pour Claude ;
- une autorisation de modifier le schéma.

Le dépôt réel reste la source de vérité.

Chaque recommandation retenue doit être transformée en l'un des objets
existants :

- **Décision durable** → registre `D-xxx`
- **Implémentation** → BIO-INGEST ou BIO-PARCOURS
- **Point conformité** → documentation RGPD/TRUST/réglementaire appropriée
- **Externalisation future** → future campagne BIOFLOW PLATFORM

Ne pas créer de registre de décisions parallèle.

---

## 17. Principaux risques

1. **Corruption silencieuse.** Une mauvaise mesure considérée comme vraie
   pourrait contaminer tout le raisonnement en aval.
2. **Perte de provenance.** La purge du document ne doit pas supprimer les
   faits structurés nécessaires à l'audit ultérieur.
3. **Complexité prématurée.** Microservices, multi-tenant ou API trop tôt
   ralentiraient la consolidation du cœur.
4. **Frontière réglementaire.** L'évolution d'un outil factuel vers un outil
   décisionnel change fortement le profil réglementaire.
5. **Données de santé chez les fournisseurs IA.** Les responsabilités et
   garanties contractuelles doivent être documentées précisément.

---

## 18. Avantages compétitifs potentiels

1. **Pipeline intégré** : document → donnée → validation → longitudinalité →
   parcours.
2. **Expertise métier** : le produit est conçu autour de situations
   biologiques réellement rencontrées en pratique.
3. **Provenance** : BioFlow peut distinguer clairement source, référentiel et
   interprétation.
4. **Longitudinalité** : la valeur principale n'est pas la lecture d'un PDF
   mais l'évolution biologique dans le temps.
5. **Boucle clinique** : BIO-PARCOURS permet potentiellement de relier
   biologique, symptômes, questionnaires, alimentation, intervention et suivi.

6. **Régime NABM** : au-delà de « ferritine = 43 », WellNeuro sait rattacher
   l'analyse à ses actes français et à son régime de remboursement dérivé,
   sans confondre régime et montant (§3.4).

Ce niveau d'intégration peut devenir plus défendable qu'un simple OCR
médical.

---

## 19. Conclusion

### Recommandation : GO SOUS CONDITIONS

Le développement de BioFlow est pertinent à condition de respecter l'ordre
suivant :

```text
FIABILITÉ
    ↓
PROVENANCE
    ↓
QUALITÉ MESURÉE
    ↓
LONGITUDINALITÉ
    ↓
ROBUSTESSE ASYNCHRONE
    ↓
QUALIFICATION RÉGLEMENTAIRE
    ↓
EXTERNALISATION
```

La priorité n'est pas de transformer immédiatement BioFlow en SaaS.

La priorité est de rendre le moteur biologique de WellNeuro suffisamment
robuste pour que son extraction future devienne une opération d'architecture,
et non une réécriture.

---

## 20. Décision architecturale générale

BioFlow doit être considéré comme :

> **le moteur biologique de WellNeuro, conçu dès maintenant pour pouvoir être
> extrait ultérieurement, mais non extrait prématurément.**

BIO-INGEST reste responsable de l'entrée et de la fiabilité de la donnée.

BIO-PARCOURS reste responsable de son exploitation clinique et longitudinale.

La future BIOFLOW PLATFORM sera responsable de son exposition à des
consommateurs externes.

Ces frontières doivent rester explicites.
