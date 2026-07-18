# Programme WellNeuro 5.0 — « la Spirale » (disposition)

> Créé le 2026-07-15. Ce programme **succède à la file restante** de
> `PROGRAMME_WELLNEURO_3_0.md` (dont les campagnes cadrées C2A/C2B/C3/C4/C5/JA
> sont **réintégrées ici, jamais dupliquées** — leurs dossiers de campagne
> existants restent la référence de cadrage). Les frontières et décisions
> sont au `../REGISTRE_FRONTIERES.md` (A5-R1 pour la DA, **A6** pour la
> disposition) ; les arbitrages détaillés des questions ouvertes sont dans
> `../propositions/2026-07-15-wellneuro-5-0-spirale/ARBITRAGES_QUESTIONS_OUVERTES.md`.

## Ce que la 5.0 change (et ne change pas)

La 4.0 organise chaque écran autour de l'étape en cours ; la 5.0 l'organise
autour de **ce que les tours précédents ont appris**. Trois couches :
le **Fil du jour** (l'axe du temps — l'accueil praticien), la
**Fiche-trajectoire** (l'axe du patient — la Spirale comme index temporel
navigable), les **Instruments** (bibliothèques et questionnaires, hérités,
inchangés). La Spirale est un objet de **navigation, jamais un graphe**.

Le cycle clinique 3.x (Patient → Données fiables → Compréhension → Décision
21 jours → Actions → Suivi → Réévaluation) reste la colonne vertébrale ;
la 5.0 est sa couche d'interface et de mémoire.

## Garde-fous transverses (hérités et confirmés)

- Jamais d'envoi automatique : la chaîne Relu → Validé pour diffusion →
  Envoyé reste la loi. Chaque automatisme du Fil affiche son « pourquoi
  maintenant » et reste refusable.
- Pas de gamification patient, pas de score de risque chiffré, pas de
  pronostic nominatif, pas de chatbot patient médicalisant.
- Toute proposition du copilote cite instrument, date, version de scoring.
- Écoute ambiante : **gate réglementaire bloquant** (CNIL/RGPD) avant tout
  développement.
- Vocabulaire réglementaire inchangé (« recommandation », « protocole »,
  jamais « prescription », « ordonnance », « diagnostic »).

## Séquence

Convention d'exécution inchangée : une campagne = une branche d'intégration ;
lots en branches dérivées ; PR de lot → branche de campagne ; PR finale →
`main`. Statuts machine : `.wn/state.json`.

| # | Campagne | Dossier | Front | Contenu | Gate / dépendance |
|---|---|---|---|---|---|
| 1 | **SP-FIL** — Fil du jour v1 | `2026-07-15-fil-du-jour-v1` | praticien | Le Fil devient l'accueil `/dashboard` (cartes « pourquoi maintenant » sur données existantes, métriques en carte), rail regroupé | aucune (données existantes, sans migration) |
| 2 | **SP-RUN** — Cockpit vivant | `2026-07-15-cockpit-vivant` | praticien | Runtime C1 et cockpit branchés en lecture seule, avec confirmation T0 explicite et décision prudente | **terminé le 2026-07-17** (validation ergonomique et CI E2E réussies) |
| 3 | **C2A** — Épisodes & persistance | `2026-07-11-suivi-j7-j14-j21-et-persistance` | deux | Persistance `AssessmentEpisode`/`ProtocolDraft`/check-ins J7-J14-J21 + `RelectureNote` (décision A6-1) | **gate migration Prisma** (confirmation explicite) ; C1 ✓ |
| 4 | **C2B** — Trajectoire & Spirale | idem (volet B) | praticien | Fiche-trajectoire : la Spirale comme index temporel des épisodes, comparateur multi-épisodes (même instrument, même version), momentum explicable | C2A |
| 5 | **SP-TT** — Time-travel | à cadrer | praticien | Fiche rechargée à une date passée (snapshots immuables) + **note de relecture** horodatée au présent | C2A + C2B |
| 6 | **SP-COP** — Copilote pré-vol & minute d'après | à cadrer | praticien | Pré-vol T-10 min (changements, discordances sourcées, questions suggérées) + clôture (décision/protocole/document pré-remplis, trois relectures) — **sans écoute ambiante** | SP-RUN + C2A ; C3 pour les documents |
| 7 | **C3** — Correspondance | `2026-07-11-fiches-conseils-contextuelles-v1` | praticien | Documents contextuels multi-destinataires, recadrés en **fil de correspondance** (réponse du médecin traitant dans le fil) — sans pièces jointes biologiques (= sans HDS) | C1 ✓ |
| 8 | **IDP** — Identité patient durable | à cadrer (= R8/E3 roadmap produit) | patient | Magic link e-mail + passkeys (WebAuthn). Fondation de la Phase B (la Spirale au sens propre exige des tours multiples) | — |
| 9 | **SP-SPI** — Ma spirale & reprise | à cadrer | patient | Accueil patient trajectoire (« Ma spirale »), reprise en douceur (« voici où vous vous étiez arrêté »), **pack de réévaluation pré-composé proposé** — jamais auto-assigné | IDP + C2A |
| 10 | **JA** — Ma spirale alimentaire | `2026-07-13-journal-alimentaire-21j-v1` | patient | Recadrée 5.0 (A7, adaptée par contrepoint) : trois régimes — bilan de calibrage / essai d'action / silence ; marqueurs adossés aux aliments moyens Ciqual ; boucle assiettes C5B ↔ essais ; validation terrain avant domaine — météo agrégée déportée en SP-MET | audit JA-00 + terrain JA-0T ; persistance : C2A |
| 11 | **SP-MET** — Météo d'adhésion | à cadrer | praticien | Signal 3 états (régulière/fragile/interrompue), cause observable citée, **jamais affichée côté patient** | C2A + JA |
| 12 | **SP-CAB** — Cabinet apprenant | à cadrer | praticien | Repère médiane de momentum, `n=` toujours affiché, masqué sous **n ≥ 5** épisodes clos (constante ajustable) | épisodes clos en nombre suffisant |
| 13 | **SP-AMB** — Écoute ambiante | à cadrer | praticien | Consentement **double niveau** (document signé au dossier + activation visible par séance), notes structurées en brouillon, non-conservation de l'audio | **cadre CNIL/RGPD instruit et validé avant tout développement** |

### Phase C (HDS) — hors programme immédiat

Réconciliation estimé ↔ mesuré, biologie réelle (E8), pièces jointes de
correspondance : conditionnées à l'hébergement HDS (D6). Instruites quand la
décision HDS sera prise.

### Campagnes data parallèles

C4 (compléments clean label) et C5 (boussole alimentaire) restent des
campagnes data-first intercalables selon disponibilité ; elles alimentent le
protocole et le copilote sans dépendre de la disposition.

Depuis A7-12 (2026-07-16), **C5A est le candidat naturel de prochaine
campagne data**. Le cadrage 5.0 du 2026-07-18 compile huit lots : LOT-00 est
terminé, LOT-01 attend une validation clinique humaine et LOT-02 sépare les
gates migration et import. Le référentiel complet des constituants Ciqual
validés fonde le profil intrinsèque ; les 12 vedettes forment seulement un
manifeste et un sous-ensemble des marqueurs JA. C5 reste inactive et son
activation demeure un choix explicite.

### Campagne transverse TRUST

**TRUST — Information patient, consentements et sécurité relationnelle V1**
(`2026-07-15-trust-information-patient-droits-v1`, cadrée le 2026-07-15,
8 lots) est transverse au programme : elle cadre l'information patient à
trois niveaux (premier accès, information contextuelle, centre permanent des
droits), la transparence IA et la sécurité relationnelle. Elle **nourrit
directement IDP** (LOT-06 auth/partages/notifications), **SP-AMB** (le
consentement double niveau A6-3 s'inscrira dans son modèle documentaire
versionné) et **C3** (contenus multi-destinataires). Verdict de cadrage
inchangé : GO documentation/prototypage, **NO-GO activation avec données
réelles tant que ses gates (juridique, sécurité, hébergement,
authentification, gouvernance clinique) ne sont pas levés** ; elle ne devient
jamais automatiquement la campagne active.

## Phasage (rappel du brainstorm, confirmé)

```text
Phase A (sans prérequis nouveau)      → SP-FIL, SP-RUN
Gate migration                        → C2A
Phase A' (sur épisodes persistés)     → C2B, SP-TT, SP-COP, C3, SP-MET, SP-CAB
Phase B (identité patient durable)    → IDP, puis SP-SPI ; JA côté patient
Transverse réglementaire              → cadre écoute ambiante (bloque SP-AMB seul)
Phase C (HDS)                         → réconciliation, biologie réelle, PJ
```

## Correspondance avec la roadmap produit (série E)

| Roadmap produit | Programme 5.0 |
|---|---|
| E3 (auth patient R8) | IDP |
| E4 (dashboard patient) | SP-SPI (+ JA) |
| E5 (workflow RDV R6) | hors programme — l'agenda reste un module futur du Fil |
| E6 (protocole builder R4) | alimenté par C4/C5, consommé par SP-COP |
| E8 (biologie réelle R5) | Phase C (HDS) |
