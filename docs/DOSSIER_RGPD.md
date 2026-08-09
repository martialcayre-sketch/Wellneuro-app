# Dossier RGPD de l'expérimentation Wellneuro

> Écrit le 2026-08-07 pour l'item 7 de « Ce qu'il resterait à faire » de
> `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`.
>
> **Alerte, pas avis juridique.** Ce document est rédigé par l'assistant, dont la
> connaissance a une date de coupure et qui n'est pas juriste. Il doit être
> **confirmé par un conseil qualifié** avant d'être opposé à qui que ce soit —
> la revue juridique externe est une dette nommée
> (`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/DETTE_TRUST.md`,
> gate G-TRUST-03).
>
> **Ce document recense, il ne qualifie pas.** Chaque rubrique porte soit une
> **source** dans le dépôt, soit la mention **TROU** — parce que la valeur ne se
> déduit d'aucun fichier et qu'une valeur plausible serait pire que son absence.
> Le tableau de la section 14 récapitule les trous, leur porteur et leur
> échéance.

**Ce dossier ne lève rien.** Le gate G-TRUST-04 reste non levé ; il est couvert
par une dérogation datée du 2026-07-21, bornée au **2026-10-21**.

> **Deux dates, deux évènements — ne pas les confondre ni les « aligner ».** Le
> **2026-07-21** est celui de l'instruction de l'hébergement (Supabase et Vercel
> absents de l'annuaire ANS) et de la dérogation ci-dessus. Le **2026-07-22** est
> celui de l'**arbitrage** qui en a tiré la conséquence — rester sur
> l'hébergement actuel, borner la phase de test, n'instruire aucune migration
> HDS (`docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md`,
> point 8). L'échéance, elle, est la même partout : **2026-10-21**.

---

## 1. Responsable du traitement

**Source.** Le praticien Wellneuro, contact `martialcayre@wellneuro.fr` —
qualification G-TRUST-02, décision du 2026-07-16
(`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/GATES_GO_NO_GO.md`).
Le même contact est affiché au patient (`web/src/lib/trust/gouvernance.ts`) et
repris comme point d'entrée de la procédure d'incident
(`docs/PROCEDURE_VIOLATION_DONNEES.md` §Rôles).

**TROU.** L'identité juridique exacte du responsable — personne physique ou
morale, dénomination, SIRET, adresse postale — n'apparaît nulle part dans le
dépôt. Un dossier RGPD opposable la porte.

> ⚠ **Contradiction relevée, non tranchée ici.** G-TRUST-02 et
> `PROCEDURE_VIOLATION_DONNEES.md` écrivent « **pas de DPO désigné** : le point
> de contact est le responsable lui-même ». `docs/DECISIONS.md` D-005 écrit
> « **confirmé par le DPO le 2026-07-27** ». Les deux ne peuvent pas être vrais
> en même temps. Trancher relève du responsable, pas de ce document ; la
> réponse conditionne la rubrique 9 (qui reçoit les demandes de droits) et la
> valeur de D-005 comme pièce d'audit.

## 2. Finalité du traitement

**Source.** `web/src/lib/trust/contenus/registre.ts`, section « Pourquoi ? » du
document `DONNEES_CONFIDENTIALITE_V1` : préparer et suivre l'accompagnement en
neuronutrition — comprendre la situation, préparer les consultations, suivre
l'évolution, remettre des documents validés par le praticien.

Le même document écrit, et c'est une limite de finalité opposable :
« cet accompagnement relève du bien-être et du suivi ; **il n'établit pas de
diagnostic médical** ». Les résultats biologiques réels restent hors produit
(gate `WN_CB_RESULTS_ENABLED`, Phase C).

## 3. Base légale

**TROU intégral.** Aucune base légale n'est qualifiée dans le dépôt, et ce
document n'en qualifie pas.

Ce qui existe, et qui n'en tient pas lieu :

- des **consentements recueillis** en phase de test
  (`CHECKLIST_ACTIVATION_G_TRUST_04.md` §« Le consentement recueilli », et le
  document `CONSENTEMENT_SUIVI_V1` du registre trust) ;
- une **décision du responsable** invoquant ces consentements et l'information
  RGPD déjà délivrée pour autoriser des données réelles (`docs/DECISIONS.md`
  D-006, 2026-07-28).

Un consentement recueilli n'est pas la même chose qu'une base légale
qualifiée, et la qualification d'un traitement de données de santé ne se déduit
pas d'un fichier. **Ne pas écrire ici d'article du RGPD** — ni 6.1.a, ni 9.2.h,
ni aucun autre — tant qu'un conseil qualifié ne l'a pas posé. La checklist du
gate porte déjà, sur un sujet voisin, la démonstration de ce qu'une intuition
juridique non vérifiée coûte (§ consentement ≠ HDS).

## 4. Catégories de personnes concernées

**Source.** Patients du cabinet, et le praticien lui-même (données de connexion
et journal d'accès). Relevé **daté du 2026-07-21**
(`CHECKLIST_ACTIVATION_G_TRUST_04.md`) : **17 patients, dont 3 graines
fictives**, et **13 accès portail ouverts**.

Ce chiffre est un relevé, pas un effectif courant : il n'est pas régénéré par
ce document.

**TROU.** Le traitement de données de **mineurs** n'est ni exclu ni encadré
(point resté « à valider » dans
`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/SOURCES_ET_VALIDATIONS.md`).

## 5. Catégories de données

**Source.** `web/prisma/schema.prisma`, 67 modèles au 2026-08-07. La
qualification « données de santé, art. 9, catégorie particulière » n'est pas
tirée du schéma — qui ne la porte pas — mais reprise de
`docs/PROCEDURE_VIOLATION_DONNEES.md`, où elle est déjà écrite. Les données
personnelles se répartissent ainsi :

| Catégorie | Modèles | Nature |
|---|---|---|
| Identité et contact | `Patient` (email, prénom, nom, date de naissance, téléphone) | Données ordinaires |
| **Santé (art. 9)** | `Consultation`, `QuestionnaireReponse`, `SyntheseIA`, `AssessmentEpisode`, `ProtocolDraft`, `ProtocolCheckin`, `AgendaSommeilNuit`, `AgendaAlimentaireJour`, `CorrespondanceMedecin`, `CorrespondancePatient`, `BookletEnvoi`, `RelectureNote`, `TrustAdverseEffectReport` | **Catégorie particulière** |
| Preuves de transparence | `TrustAcknowledgement`, `TrustChoiceEvent`, `TrustRightsRequest`, `TrustPrivacyIncident` | Traces d'information, de choix et de demandes |
| Authentification et accès | `Patient.accessToken`, `PortailMagicLink`, `PortailConnexionGoogle`, `PortailDemandeTentative` | Jetons, traces de connexion, anti-abus |
| Journalisation | `JournalAccesDossier` (`id_patient`, `praticien_email`, route, méthode, horodatage) | Piste d'audit des accès praticien |
| Résidu d'effacement | `DossierEfface` (année de naissance, initiales, date) | Preuve d'effacement, volontairement non ré-identifiante |

**Hors périmètre personnel**, et à ne pas confondre : les référentiels
(`Biology*`, `Supplement*`, `Ciqual*`, catalogues de questionnaires) ne portent
aucune donnée personnelle.

## 6. Destinataires et sous-traitants

**Source.** `web/src/lib/trust/gouvernance.ts` — liste **montrée au patient**,
et identique à celle de G-TRUST-02 :

| Sous-traitant | Rôle |
|---|---|
| Vercel | hébergement de l'application |
| Supabase | hébergement de la base de données |
| Anthropic | assistance d'IA pour la préparation des synthèses |
| Fournisseur d'envoi d'e-mails | acheminement des e-mails |
| Google | connexion du praticien **uniquement** — jamais des patients |

Aucun autre destinataire : « votre praticien, dans le cadre de votre
accompagnement ; personne d'autre n'y accède au sein de Wellneuro », et aucun
partage à un tiers (médecin traitant compris) sans choix explicite du patient
(`registre.ts`).

**TROUS.**

1. **Aucun DPA n'est signé**, avec aucun de ces sous-traitants
   (`CHECKLIST_ACTIVATION_G_TRUST_04.md` item 7 ;
   `docs/claude/propositions/2026-07-24-audit-migration-hds/CHECKLIST_FINALISATION.md:67`).
2. Le **fournisseur SMTP réel n'est pas identifié** — ni son nom, ni sa
   localisation (`CHECKLIST_FINALISATION.md:68`).
3. **Sentry est un sous-traitant de fait non déclaré au patient.**
   `@sentry/nextjs` est une dépendance de `web/package.json`, sa résidence UE
   n'est pas vérifiée et son volet client reste « à trancher »
   (`CHECKLIST_FINALISATION.md:42, 68`) — mais il **n'apparaît pas** dans la
   liste ci-dessus, qui est celle affichée aux personnes. Écart à trancher :
   soit il ne traite aucune donnée personnelle et cela s'écrit, soit la liste
   patient est incomplète et se corrige.
4. **Scalingo** est décidé (D-006, 2026-07-28) mais **pas en service** : il
   n'entre dans cette liste qu'au basculement, et la décision subordonne
   explicitement toute donnée réelle à la signature préalable de son DPA.

## 7. Transferts hors Union européenne

**Source.**

- **Supabase** — projet `Wellneuro-app`, région `eu-central-1` (Francfort),
  lecture du 2026-08-07 via l'outil de lecture Supabase. Dans l'UE.
- **Vercel** — région `fra1` (`web/vercel.json`). Dans l'UE. Vercel Inc. reste
  une société de droit américain, ce qui est une question distincte de la
  localisation d'exécution.
- **Anthropic** — transfert qualifié **hors UE** par
  `docs/claude/propositions/2026-07-24-audit-migration-hds/AUDIT_MIGRATION_HDS.md:94`
  (« DPA art. 28, transfert hors UE, TIA »). C'est le transfert principal, et il
  porte des données de santé au titre des synthèses. **Réserve** : le même audit
  demande, sans y avoir répondu, de vérifier « l'existence contractuelle d'une
  inférence UE » et la rétention d'inférence (`:251-253`, le prompt caching
  étant activé). La localisation réelle de l'inférence n'est donc **pas
  établie** — ni dans un sens ni dans l'autre.
- **Google** — connexion du praticien seul.

**TROU.** Le **mécanisme de transfert invoqué** (clauses contractuelles types,
annexe d'un DPA, décision d'adéquation) n'est écrit nulle part, pour aucun de
ces flux. Ne rien affirmer avant vérification contractuelle.

## 8. Durées de conservation

**Source — une seule durée est réellement écrite et arbitrée :**

- **Journal d'accès aux dossiers** : **12 mois glissants**, purge opportuniste
  à l'écriture, plus effacement avec le dossier — règle GD-2, alignée sur un
  arbitrage du responsable du 2026-07-22
  (`docs/claude/campagnes/2026-07-22-g-trust-04-durcissement-et-reliquats/CAMPAGNE.md`).
- **Traces d'identité Google** : 12 mois
  (`docs/claude/propositions/2026-07-25-audit-identites-google/AUDIT_IDENTITES_GOOGLE.md`).
- **Effacement sur demande** : le dossier et ses tables filles sont effacés, et
  `DossierEfface` conserve une preuve non ré-identifiante (année de naissance,
  initiales, date).
- **Append-only assumé** : `TrustAcknowledgement` et `TrustChoiceEvent` sont des
  preuves d'information et de choix ; elles ne sont pas réécrites.

**TROU pour tout le reste** — et le produit le dit déjà publiquement, dans ces
termes exacts (`gouvernance.ts`, repris dans `registre.ts`) :

> « La politique détaillée de durées de conservation est **en cours de
> formalisation**. Vos données sont conservées le temps de votre
> accompagnement ; vous pouvez à tout moment demander des précisions ou
> l'exercice de vos droits. »

Cet aveu est honnête ; il n'est pas une politique. Aucune durée n'est fixée pour
les données de santé elles-mêmes (consultations, réponses, synthèses,
correspondances). Porteur : responsable, avec conseil qualifié. Échéance
proposée : **2026-10-21**, date de revue de la dérogation.

## 9. Droits des personnes et modalités d'exercice

**Source.** `registre.ts`, section « Exercer mes droits » : accès,
rectification, effacement, limitation, opposition, retrait d'une autorisation.
Deux canaux — la carte « Signaler un problème » de l'espace patient (choix
« Je souhaite exercer un droit », enregistré en `TrustRightsRequest`) et
l'adresse `martialcayre@wellneuro.fr`. Un canal d'incident de confidentialité
distinct existe (`TrustPrivacyIncident`).

Le texte patient précise déjà que « certains droits dépendent du cadre
applicable au traitement concerné » — formulation prudente, cohérente avec le
trou de la rubrique 3.

**TROUS.** Le **délai de réponse** annoncé, la **procédure de vérification
d'identité** du demandeur, et le **circuit interne de traitement** d'une demande
reçue ne sont écrits nulle part. Une demande arrivant aujourd'hui serait traitée
sans procédure écrite.

## 10. Mesures de sécurité

**Source.** Le tableau des sept exigences de
`CHECKLIST_ACTIVATION_G_TRUST_04.md` fait foi. En synthèse :

- **Cloisonnement** — RLS `deny-all` sur 71 tables `public` (migration
  `20260707123710_enable_rls_security`) **plus** gardes applicatifs
  (`web/src/lib/praticien/appartenance.ts`, portail résolu par cookie signé).
  Posture retenue et motivée en `docs/DECISIONS.md` D-005 — sous réserve de la
  contradiction DPO signalée en rubrique 1.
- **Accès patient** — lien magique haché, expirant en 24 h, à usage unique
  (G4, activé en production le 2026-07-21) ; coupe-circuit de session
  `sessionsInvalidesAvant`.
- **Piste d'audit** — `journal_acces_dossiers`, écriture branchée sur les
  22 routes GET « dossier nommé ». **Limites écrites** : pas d'écran de
  consultation (lecture par requête SQL), POST exclus, liste vide non
  journalisée.
- **Procédure de violation** — `docs/PROCEDURE_VIOLATION_DONNEES.md`, écrite
  **et exercée sur table** le 2026-07-22 (fiche 2026-EX1, scénario fictif).
- **Hygiène du dépôt** — `docs/securite_rgpd.md`, garde anti-secrets
  (`scripts/check_no_secrets.sh`).

**TROUS.** Aucun **pentest** ni **revue de sécurité externe** (exigence 7 du
gate, restée entière). Le **registre physique des violations** n'existe pas
(EX-3). La preuve **fonctionnelle en production** de la piste d'audit reste à
faire au premier dossier réellement ouvert.

## 11. Information des participants

**Source.** Le document `DONNEES_CONFIDENTIALITE_V1`, publié le **2026-07-16**,
versionné et haché (`registre.ts`, hash `b4a5551b…`). Les acquittements sont
tracés (`TrustAcknowledgement`), les choix aussi (`TrustChoiceEvent`).

**TROU majeur.** L'information délivrée aux personnes **sur l'écart
d'hébergement** — le fait que les données sont hébergées hors d'un hébergeur
certifié HDS pendant la phase de test — n'est **consignée nulle part** : ni sa
date, ni sa forme, ni son contenu, ni la modalité de retrait. C'est pourtant la
première recommandation de la décision du responsable du 2026-07-21
(« Tracer l'information délivrée »), et elle porte la moitié de l'argumentaire
qui autorise la phase de test. C'est le trou le plus coûteux de ce dossier.

## 12. Hébergement — écart assumé et daté

**Source.** Ni Supabase ni Vercel ne figurent à l'annuaire ANS des hébergeurs
certifiés HDS — établi le 2026-07-21, sur 404 hébergeurs recensés. Le
responsable du traitement a néanmoins autorisé une phase de test avec des
personnes réelles, **décision datée du 2026-07-21**, **bornée au 2026-10-21**,
« sans reconduction écrite, la règle du dépôt reprend »
(`CHECKLIST_ACTIVATION_G_TRUST_04.md`, relayée par
`docs/claude/REGISTRE_FRONTIERES.md` §1).

Une migration vers **Scalingo** (certifié HDS) est décidée (D-006, 2026-07-28)
et non exécutée. Elle est subordonnée, dans l'ordre : DPA Scalingo e-signé,
puis confirmation du périmètre HDS de la région cible, puis seulement données
réelles.

**Ce n'est pas une conformité. C'est un écart assumé, compté et daté.**

## 13. Analyse d'impact (AIPD)

**TROU.** Aucune AIPD n'existe. Elle est listée comme réserve à lever dans
D-006 et dans `CHECKLIST_FINALISATION.md:67`. Un traitement de données de santé
à grande échelle ou systématique en requiert une ; savoir si l'expérimentation
actuelle franchit ce seuil est une question de conseil qualifié, pas de dépôt.
**Elle n'est pas rédigée ici**, et ce document ne doit pas être confondu avec
elle.

## 14. Récapitulatif des trous

| # | Rubrique | Ce qui manque | Porteur | Échéance | Où la réponse se consignera |
|---|---|---|---|---|---|
| 1 | Responsable | Identité juridique exacte | Responsable | 2026-10-21 | ici, rubrique 1 |
| 1 | Responsable | Contradiction DPO (G-TRUST-02 vs D-005) | Responsable | 2026-10-21 | `docs/DECISIONS.md` |
| 3 | Base légale | Qualification, non rédigée à ce jour | Conseil qualifié | 2026-10-21 | ici, rubrique 3 |
| 4 | Personnes | Cas des mineurs | Responsable | 2026-10-21 | `SOURCES_ET_VALIDATIONS.md` |
| 6 | Sous-traitants | Aucun DPA signé | Responsable | avant bascule Scalingo | `CHECKLIST_FINALISATION.md` §F |
| 6 | Sous-traitants | Fournisseur SMTP réel non identifié | Responsable | 2026-10-21 | ici, rubrique 6 |
| 6 | Sous-traitants | Sentry non déclaré au patient | Responsable | 2026-10-21 | `gouvernance.ts` ou ici |
| 7 | Transferts | Mécanisme invoqué (CCT/DPA) | Conseil qualifié | 2026-10-21 | ici, rubrique 7 |
| 8 | Conservation | Durées des données de santé | Responsable + conseil | 2026-10-21 | ici, rubrique 8 puis `gouvernance.ts` |
| 9 | Droits | Délai, vérification d'identité, circuit interne | Responsable | 2026-10-21 | ici, rubrique 9 |
| 10 | Sécurité | Pentest / revue externe | Prestataire à engager | 2026-10-21 | checklist du gate, exigence 7 |
| 10 | Sécurité | Registre physique des violations (EX-3) | Responsable | 2026-10-21 | `PROCEDURE_VIOLATION_DONNEES.md` |
| 10 | Sécurité | Preuve fonctionnelle de la piste d'audit | Responsable | premier dossier ouvert | checklist du gate, item 4 |
| 11 | Information | Information sur l'écart HDS non consignée | Responsable | **au plus tôt** | ici, rubrique 11 |
| 13 | AIPD | Absente | Conseil qualifié | 2026-10-21 | document dédié |

L'échéance par défaut est le **2026-10-21**, date de revue de la dérogation :
au-delà, sans reconduction écrite, la règle du dépôt reprend et la phase de test
avec des personnes réelles n'est plus couverte.

---

## Ce que ce dossier ne fait pas

- Il **ne lève pas** le gate G-TRUST-04.
- Il **ne qualifie pas** de base légale et **ne cite aucun article** du RGPD à
  l'appui d'une conformité.
- Il **ne remplace pas** l'AIPD.
- Il **n'invente aucune durée de conservation** : celles qui manquent sont
  marquées comme manquantes.
- Il **ne tranche pas** la contradiction sur le DPO ; il l'expose.

Voir aussi : `docs/PROCEDURE_VIOLATION_DONNEES.md` (violations),
`docs/securite_rgpd.md` (hygiène du dépôt),
`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`
(gate et exigences).
