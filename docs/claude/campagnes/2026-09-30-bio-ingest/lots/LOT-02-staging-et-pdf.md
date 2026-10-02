---
id: "LOT-02"
titre: "Staging d'import, extraction PDF, écran de validation"
statut: "à_faire"
dépend_de: "LOT-01, amendement RGPD/TRUST"
---

# LOT-02 — Staging d'import, extraction PDF, écran de validation

## But

Un compte rendu PDF produit des lignes candidates, relues puis validées par le praticien avant de devenir des résultats (A2, A4, A5).

## Résultat observable

Un PDF déposé produit un lot d'import et ses lignes candidates (analyte proposé, valeur, unité source, page, statut de mapping). La validation crée les `resultats_biologiques`. Rien n'est créé sans elle.

## Périmètre

**Deux PR.** (1) **Migration seule — confirmation obligatoire** : tables de lot d'import et de lignes candidates, document source en base (A2), référence du staging **vers** le résultat (A5), contrat SQL négatif, RLS ; release-db approuvée puis constat par conteneur. (2) Code consommateur : upload praticien, extraction par IA vision, écran de validation (extension du LOT-01).

## Hors périmètre

Photo, portail patient, laboratoire. Aucune colonne sur `resultats_biologiques`, `source` inchangée.

## Fichiers probables

- `web/prisma/schema.prisma`, `web/prisma/migrations/`, `web/prisma/checks/`
- `web/src/lib/biology-library/`
- `docs/DOSSIER_RGPD.md`, document patient TRUST (`D-251`)

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-01, amendement RGPD/TRUST

## Étapes

- [x] **Préalable, geste distinct** : amender le registre RGPD et le document patient TRUST pour l'envoi de comptes rendus au sous-traitant IA — fait le 2026-10-01 (amendement de `D-256`) : `usage_ia` v4, `donnees_confidentialite` v11, `DOSSIER_RGPD.md` §2 ter.
- [x] Mode Plan du modèle de staging — approuvé le 2026-10-01. Arbitrages : types PDF + JPEG/PNG/WebP dès la migration (LOT-03 sans migration), 10 Mo au plus, resolver libellé → analyte en module TS signé (PR 2, aucune table).
- [x] PR migration seule, puis release-db, puis constat — #1280 mergée (`0f388a9b`), `release-db` approuvé (run 36974556114), constat par conteneur le 2026-10-02 (migration appliquée en une tentative, RLS active sans policy, 6 fonctions, 9 déclencheurs). La migration nomme ses tables à la rubrique 5 du dossier RGPD, sur la ligne « comptes rendus biologiques déposés » déjà posée.
- [ ] **Consignes laissées à la PR 2 par la revue de la migration** (`wn-reviewer`, arbitrages du 2026-10-01) :
  - une extraction s'écrit dans UNE transaction interactive : import en cours, puis ses lignes, puis la terminaison. Jamais d'écriture imbriquée Prisma, qui terminerait l'import avant ses lignes. Un test le vérifie ;
  - la validation crée le résultat (`source = saisie_praticien`) puis décide la ligne, dans la même transaction. La base refuse un résultat saisi avant la fin de l'extraction. Un `P2002` (`doublon_mesure`) se rend tel quel, sans repli sur le résultat existant — la base ne ferme pas le cas d'une saisie manuelle intercalée entre la fin de l'extraction et la validation : un test de route le prouve (saisie intercalée, puis `P2002` rendu, ligne restée proposée) ;
  - `saisi_le` du résultat est comparé à `termine_le`, posé par la base en UTC explicite : il doit rester écrit par Prisma (UTC — constaté le 2026-10-02 sur une session Europe/Paris), jamais forcé par le code à une heure locale. Un test de route crée le résultat par Prisma SANS `saisiLe` puis valide la ligne (revue Copilot de #1280) ;
  - les écarts `non_quantitative` et `unite_divergente` sont pré-marqués par l'écran et **confirmés par le praticien**, jamais posés par le système ;
  - `analyte_propose` est posé par le resolver signé seul, `ambigu` compris ; le modèle ne le remplit jamais ;
  - **retrait d'un dépôt erroné** (mauvais dossier), tant qu'aucune ligne n'est validée : second auteur admis par `staging.guard.test.ts`. La purge du document après validation attend l'arbitrage de la rubrique 8 et demandera une migration ;
  - une image de plus de ~5 Mo dépasse la limite du fournisseur, alors que la base admet 10 Mo : contrôle ou réduction avant l'envoi.
- [ ] PR code consommateur — découpée le 2026-10-02 en **2a (serveur)** et **2b (écran)**. Arbitrages : resolver = catalogue + synonymes, livré non signé ; valeur et date corrigeables à la validation (une ligne lue non quantitative reste refusée) ; modèle `claude-sonnet-5-5`. **2a mergée** (#1281, `aa95f5a8`, aucune migration, drapeau éteint) ; **2b (écran)** : panneau d'import sous la saisie du bilan, derrière `bioIngestEnabled`. **Ce que la v4 promet, le staging le tient** : la date du prélèvement est relevée, et chaque extraction enregistre le modèle et la version du procédé (« enregistrés à chaque fois »). Les deux ont un test. **Le compte rendu part ENTIER** : la v4 et la v11 le déclarent, aucun masquage n'est promis ni à écrire (arbitrage du 2026-10-01).
- [ ] **Arbitrages du 2026-10-02 (questions ouvertes par la revue de la PR 2a)** :
  - `u` vaut `µ` en préfixe de mol, g ou L — **fait en 2a** ;
  - libellés génériques du catalogue (« Cuivre », « Glutathion », « Zonuline ») retirés du resolver — **fait en 2a** ;
  - seules les lignes de l'extraction **courante** (la plus récente non échouée) se décident — **fait en 2a** ;
  - retrait d'un dépôt erroné **permis sur un dossier clos** — **fait en 2a** (documenté) ;
  - **PR 2b** : sans heure lue (minuit à Paris), l'heure est **exigée** à la validation, et l'écran signale toute mesure du même analyte déjà au dossier le même jour — **fait en 2b** (le champ heure reste vide à minuit pile, rien ne part sans lui) ;
  - **PR 2b** : délai du routeur Scalingo et durée d'une extraction réelle de plusieurs pages **mesurés, puis décidés** (relecture de l'import par l'écran si le risque est réel). **Fait établi par la revue Copilot de #1281** : la fenêtre du routeur est de **30 s** (`web/src/lib/auth.ts:63-65`), contre un pire cas d'environ 240 s (120 s × 2 tentatives) ; un compte rendu court répond en ~4 s. Une coupure laisse l'extraction aboutir côté serveur, et une relance rend `extraction_en_cours`. Piste si la mesure le confirme : `after()` de Next et réponse 202, l'écran relisant l'import. **Mesuré le 2026-10-02** : un compte rendu fabriqué de 3 pages (75 lignes, intervalles et antériorités) prend **36 s** (deux essais, 36,3 s et 35,3 s) — au-delà des 30 s. **Décidé et fait en 2b** : la route rend 202 après l'ouverture de l'import, la suite tourne dans `after()`, l'écran relit le compte rendu toutes les 3 s jusqu'à l'issue. Extrapolation à surveiller : 200 lignes ≈ 95 s, sous le délai d'appel de 120 s ;
  - **conservation (rubrique 8)** : **purge du PDF après décision** de toutes les lignes de l'extraction courante ; empreinte et trace conservées. Demande une **migration** (`contenu` nullable, déclencheur de figement à revoir) et son `release-db`, plus une **nouvelle version du document patient** (la v11 dit « conservé dans votre dossier »). À tenir **avant la pose du drapeau**, ou à déclarer tel quel.
- [ ] **Laissé par la revue `wn-reviewer` de la PR 2b** (GO, six P2 corrigés : heure de Paris quel que soit le fuseau du poste, réponse périmée ignorée, péremption jugée par le serveur, relecture qui survit à un échec, terminaison gardée par `statut = en_cours`, accessibilité) :
  - **avant la pose du drapeau**, constater sur Scalingo (`next start`) qu'une suite `after()` de ~36 s aboutit en `extrait` — le test de route remplace `after` par un double, rien d'autre ne l'atteste ;
  - **à arbitrer** : l'heure exigée ne l'est que par l'écran ; le serveur accepte un minuit de Paris renvoyé tel quel.
- [ ] **Arbitrages du 2026-10-02 après le merge de la 2b (#1283, `7d36e4ed`)** — dans cet ordre de sessions :
  1. **PR de code (sans migration)** :
     - **l'heure est exigée aussi par le serveur** : une validation est refusée si son horodatage est encore minuit de Paris alors que la ligne a été lue sans heure ;
     - **délai d'appel porté à 180 s, sans réessai** (pire cas 180 s, sous la péremption de 5 min ; un échec se relance à la main).
  2. **Purge du PDF, AVANT la pose du drapeau** :
     - purge dès que toutes les lignes de l'extraction courante sont décidées, **et au plus tard 30 jours après le dépôt** ; les lignes non décidées restent, sans le document ; empreinte et trace conservées ;
     - migration seule, puis `release-db` humain, puis constat ;
     - **document patient v12** (`donnees_confidentialite`) rédigé par Claude dans la PR de la migration, relu et validé par le responsable avant le merge.
  3. **Resolver** : Claude prépare la relecture de la table, le responsable la valide ou la corrige, puis **signe par une D-xxx**, avec l'enrôlement dans `shaPerimetreLitteral.guard`. Pas de pose « tout-`inconnu` ».
  4. **Constat de `after()` en production**, une fois le drapeau posé (après 2 et 3) :
     - le responsable dépose un PDF fabriqué (identité de fixture) dans un **dossier de test réel**, sans rien valider ;
     - constat par conteneur, par identifiant, du passage à `extrait` ;
     - puis retrait du dépôt, sans résidu.
- [x] Création du drapeau : sa ligne dans `docs/FEATURE_FLAGS.md` porte les conditions de pose du §2 ter — `WN_BIO_INGEST_ENABLED`, créé éteint le 2026-10-02 (PR 2a).
- [ ] **Pose du drapeau, seulement après** : la v4 et la v11 déployées et constatées ; la **demande de DPA Anthropic envoyée**, sa date établie au fil (`docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`) — **tenue le 2026-10-01 à 17:34 UTC** ; §2 ter du dossier RGPD validé par le responsable le 2026-10-01 ; la v4 et la v11 relues contre le comportement livré.

## Tests

Enregistrement du modèle et de la version du procédé à chaque extraction ; assertion NOMINATIVE des tables du staging en rubrique 5 (`rubrique5.modeles.test.ts` ne voit que les filles de `Patient`) ; contrat SQL négatif du staging ; tests de route de la validation (aucune écriture sans geste) ; import du même document deux fois ; unité divergente refusée ; ligne qualitative refusée ; aucune donnée de santé dans les logs ; effacement patient (IDP2) étendu au staging.

## Critères de done

Migration appliquée et constatée ; extraction active seulement après l'amendement ; T3 vert.

## Résultats

À compléter à la clôture.
