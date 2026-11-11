# Journal de session — Wellneuro NNPP2

> **Archivage** : les entrées du 2026-07-04 au 2026-07-10 sont compactées dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-10_compact.md`, celles du 2026-07-11 au 2026-07-14 dans `docs/archive/sessions/SESSION_LOG_2026-07-11_to_2026-07-14_compact.md`, celles du 2026-07-14 au 2026-07-22 dans `docs/archive/sessions/SESSION_LOG_2026-07-14_to_2026-07-22_compact.md`, et celles du 2026-07-22 au 2026-10-20 dans `docs/archive/sessions/SESSION_LOG_2026-07-22_to_2026-10-20_compact.md`. Le journal actif ne conserve que les entrées récentes utiles à la reprise.

## 2026-10-21 — Restes d'ACT-4 : quatre arbitrages, texte du refus du compte rendu

**Fait.** Quatre arbitrages du responsable : (1) refus du plafond du compte rendu biologique rendu exact, « attendent déjà d’être traités » (D-269, précision ; le plafond compte aussi les documents reçus) — livré ici ; (2) l'encart d'urgence quitte l'écran de dépôt, remplacé par une aide permanente du portail (lien « Urgence » sur toutes les pages), textes à valider avant la PR qui amendera D-293 §3 ; (3) une photo de test à déposer par le responsable sur un dossier de test, pour constater le réencodage ; (4) le PDF de test à retirer par le responsable, retrait à constater par conteneur.

**Écarté.** Pour l'alerte : confirmation après dépôt, ligne discrète, lien repliable.

**Prochaine action.** Textes de l'aide permanente, puis PR (retrait de l'encart du dépôt et aide permanente ensemble).

**Ouvert.** Aide permanente du portail (D-293 §3 à amender).

## 2026-10-21 — File A, restes : arbitrages et banc de validation de consultation (t23)

**Fait.** Quatre lignes recalées sur main (t23 en partie soldée par D-107 ; t06 : session de 30 jours, pas 12 h) et arbitrées (PR de doc #1617). Premier lot : banc `consultationPorteuse.ecritures.guard.test.ts`, seule `api/portail/valider` pose `'validee'` et `dateValidation`.

**Écarté.** Contrainte en base (migration) ; épingler les voisins de CS-MAG-01 (claims de conduite) ; brouillon serveur.

**Prochaine action.** Brouillon local de « Ce qui compte » (t06), puis banc des seuils du catalogue, surface des libellés de t30, grille E67.

**Ouvert.** Aucun.
## 2026-10-21 — Numéros d'urgence au pied du portail ; l'encart quitte le dépôt

**Fait.** #1613 mergée (refus du plafond du compte rendu exact). Textes de l'aide permanente validés tels quels : numéros cliquables au pied de toutes les pages du portail, phrase du pied « qui ne les lit pas en temps réel », phrase du délai gardée en texte simple sous le bouton de dépôt. D-293 §3 amendé ; l'encart quitte l'écran de dépôt dans la même PR.

**Écarté.** Lien vers une page dédiée ; texte long de D-275 au pied de page ; pied de page inchangé.

**Prochaine action.** CI (bases visuelles du portail à régénérer), CodeRabbit, merge, déploiement constaté ; constats du retrait du PDF et de la photo de test.

**Ouvert.** Gestes du responsable sur le dossier de test (retrait du PDF, photo).

## 2026-10-21 — t06 : brouillon local de « Ce qui compte »

**Fait.** #1617 (plan) et #1618 (banc de validation de consultation) mergées. t06 : brouillon localStorage de « Ce qui compte », nommé par l'`idPatient` du cookie signé, effacé après dépôt confirmé, conservé sur erreur ; famille inscrite à `FAMILLES_DONNEES_PATIENT` (purge à la déconnexion), garde de l'inventaire étendue au module.

**Écarté.** Brouillon serveur (arbitrage) ; ajouter `connect`/`delete` imbriqués au banc de #1618 (ne posent pas le statut).

**Prochaine action.** Banc des seuils du catalogue (instantané + D-xxx), puis surface des libellés de t30, grille E67.

**Ouvert.** Aucun.

## 2026-10-21 — t23 : les seuils du catalogue sous instantané

**Fait.** #1619 (t06) mergée. Banc `seuilsCatalogue.guard.test.ts` : empreintes des 65 blocs `scoring` et du moteur (tout `questions.ts` hors du littéral du catalogue), historique par étape, toute retouche exige une D-xxx postérieure à D-335 ; pose figée. Deux contre-revues `wn-reviewer` (NO-GO puis GO), correctifs appliqués.

**Écarté.** Verrou par empreinte (couperait le scoring) ; littéraux seuls du moteur (une comparaison changée échapperait).

**Prochaine action.** Surface de relecture des libellés de t30 (conteneur + synonymes), grille E67.

**Ouvert.** Options de réponse (`sections`) et modules importés hors empreinte, déclarés.
## 2026-10-21 — File D : arbitrages de la séance versés au plan

**Fait.** Plan (D/11, D/48, D/34, D/36, D/49 au §6, e05, D/26, D/43, D/40, lettre l, Momentum vers o, D/1, D/2, D/6 faits) ; lots inscrits au §8 (D/42, D/22, D/23, D/41, D/5) et F76 en file A ; constat OpenAI du registre RGPD passé en historique (D-299) ; commentaire de `vocabulaire.ts` (régime A) ; ligne `nir` retirée de la ligne de base du rayon Patients, reprise lue par conteneur en agrégats.

**Écarté.** Rien.

**Prochaine action.** CodeRabbit, merge ; puis lots inscrits, chacun dans sa session.

**Ouvert.** k04 : aucun dossier en `@wellneuro.fr` en production ; dossier d'essai à désigner par le responsable.

## 2026-10-21 — BP-13 : migration des données physiologiques et des traitements

**Fait.** #1614 (D-335) mergée. PR 1 de BP-13 : migration seule `donnees_physiologiques_traitements_v1` (deux tables en ajout seul, une tête par critère et par fil sous verrou, deux mains, clé de traitement des pièces de constat), contrat négatif, banc à deux sessions (huit courses), effacement nommé. Revue `wn-reviewer` : « fin après le début » corrigée sur arbitrage (fin de période).

**Écarté.** Garder la comparaison stricte des dates ; retirer la règle de la base ; base locale jetable (refusée, T3 seul).

**Prochaine action.** CI, CodeRabbit, merge, release-db par le responsable, constat par conteneur ; puis PR 2 du code sous `WN_PHYSIO_TRAITEMENTS`.

**Ouvert.** Aucun.
## 2026-10-21 — t30 : résolveur des libellés, six des sept fiches de D-323 §6

**Fait.** 22 libellés ajoutés au résolveur (T4L, T3L, bicarbonates, protides totaux, bilirubine totale, PAL) ; résolveur re-signé par le responsable (D-336 : 167 entrées, 85 analytes, `shaPerimetre` recalculé, date reportée à `FEATURE_FLAGS.md`) ; plan : t30 soldée, ligne neuve pour les autres libellés inconnus vus en production.

**Écarté.** Bilirubine conjuguée, directe et libre (même unité que la totale) ; ionogramme complet (panel sans unité).

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; puis la PR de doc E67.

**Ouvert.** Autres libellés inconnus de production : lot séparé.

## 2026-10-21 — E67 : parcours et grille de la passe d'accessibilité

**Fait.** `docs/PASSE_ACCESSIBILITE_E67.md` : quatre postes (mobile et lecteur d'écran, ordinateur et lecteur d'écran, zoom 200 % sur l'ordinateur, texte agrandi sur le téléphone), huit étapes du portail plus l'Observatoire praticien, neuf critères ; plan H64 pointé vers la grille. Écrans vérifiés dans le code.

**Écarté.** Rien.

**Prochaine action.** Le responsable joue la passe (file D) et transmet la grille ; chaque défaut bloquant ou gênant devient une ligne de la file A.

**Ouvert.** D-TRUST-05 et D-C5-01 restent ouvertes jusqu'à la passe.

## 2026-10-21 — t35 : sans occasion, seules les issues d'empêchement (D-337)

**Fait.** Arbitrage D/42 transcrit en D-337 ; `issuesProposees` et refus dans `createTrialTrace` ; panneau patient (choix effacé sans substitution, message si rien n'est choisi) et harnais `/dev/validation-ja` alignés ; deux tests du harnais qui encodaient l'ancien comportement réécrits ; plan : D/42 soldée.

**Écarté.** Relire ou corriger les traces déjà enregistrées (hors décision, §4).

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; t35 → « fait ».

**Ouvert.** t34 (barème de charge, m13) reste en file A.

## 2026-10-21 — ACT-5 : texte des mineurs (2B) servi, J2-conf tenu (D-341)

**Fait.** Relevé de J2-conf : non fait (r jamais consignée, at non faite, lot sans objet écrit) ; quatre arbitrages du responsable transcrits en D-341 (r reconnue sur le registre existant, at hors périmètre, lot fondu, 2B seul). `lib/patient/texteMineurs.ts` (texte 2B mot pour mot) servi par `EcranCircuitMineur` ; banc : texte comparé à la source G-11, titres de 2A absents du code servi, écran rendu sous une seule condition « mineur ». Plan H28, F45, H78, H79 ; page de suivi a05 et q17 corrigées (J3-mineurs suit ACT-5).

**Écarté.** Texte 2A (au titulaire) : avec J3-mineurs. Drapeau : aucun (l'écran existait, seul son texte change).

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; lecture consignée du texte servi ; place 5 → fait.

**Ouvert.** at et as (F45) ; les 15–17 ans (avocat, D-284) ; circuit des droits des mineurs (D-283 §5).
## 2026-10-21 — t34 : le barème de charge ignore les actions vides (D-339)

**Fait.** Arbitrage m13 transcrit en D-339 (amende D-273 §5) ; `estActionVide` filtre la mesure ; banc « actions vierges supprimées » (rouge sans le correctif) ; cas de composition mis à jour ; F76 soldée au plan. T3 vert ; contre-revue `wn-reviewer` GO.

**Écarté.** Ignorer toute action non typée (aurait défait D-273 §5) ; garde d’exhaustivité des champs.

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; puis t37 (arbitré : vide au retour, « Sans objet » retiré sous « Oui »).

**Ouvert.** Aucun.

## 2026-10-21 — t37 : « C’était faisable ? » n’est plus rempli à la place du patient (D-340)

**Fait.** Deux arbitrages du responsable transcrits en D-340 : vide au retour sur « Oui » avec refus relié au champ, « Sans objet » retiré sous « Oui » ; refus aussi dans `createTrialTrace` ; tests du panneau (retour Non → Oui, instantané transmis) et du domaine ; ligne D-JA-03 du plan complétée.

**Écarté.** « Oui » au retour (statut favorable par défaut, DC-24) ; vide aussi à l’ouverture (un choix de plus à chaque trace).

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; t37 → « fait ».

**Ouvert.** Traces déjà transmises non relues (D-340 §4).

## 2026-10-22 — D/5 : refus Supabase de settings.json retirés

**Fait.** Connecteur absent (d05, constaté le 2026-10-21) : les neuf refus `mcp__claude_ai_Supabase__*` retirés de `.claude/settings.json` ; phrase de `CLAUDE.md` et `.claude/rules/db-prisma.md` mises à jour.

**Écarté.** Retirer aussi la garde `execute_sql` (filet gratuit si le connecteur revenait) ; toucher au plan dans cette PR.

**Prochaine action.** CI, CodeRabbit, merge ; ligne d05 de la page D ; puis PR D/41.

**Ouvert.** Aucun.

## 2026-10-22 — D/41 : couverture du crochet d'écriture, vestige retiré

**Fait.** D/5 mergée (#1634). D/41 : `stopRulesLibelles.ts` et `questionnaires/alimentaire.ts` sous « demande » clinique, `chaineC1Fixture` libre ; `WN_ALLOW_RISKY_COMMAND` retiré du garde Bash avec un banc qui le prouve ; doc alignée. Banc des crochets 273/273.

**Écarté.** Couvrir aussi les écritures par Bash (suivi nommé du Socle, autre lot).

**Prochaine action.** CI, CodeRabbit, merge ; ligne d41 de la page D.

**Ouvert.** Lignes D/5 et D/41 du plan à marquer faites au prochain relevé.

## 2026-10-21 — BP-13 : le code des données physiologiques et des traitements, drapeau éteint (D-335)

**Fait.** Release-db 39654198602 approuvée par le responsable, sentinelle liée au run, production sur la tête de `main`, constat par conteneur (migration appliquée, deux tables vides, RLS, `id_traitement`). PR 2 : routes du portail et du cockpit, fiche de renseignements (sexe, cycles, traitements en lignes), page « Ma fiche de renseignements », tiroir du cockpit avec discordance, vigilance sur les traitements en vigueur, pièce de constat « traitement » et « à relire » ; P2 de la migration tenus ; banc des lecteurs. Fiche LOT-13 close.

**Écarté.** `signature` de `biology-library` (frontière D-306) : `classeEtCode`, même garantie. Un bouton « modifier » au portail : aucun libellé validé.

**Prochaine action.** CI, CodeRabbit, merge ; puis BP-15 (LOT-15), puis le brouillon de la lettre cm (F52).

**Ouvert.** Allumage : décision de la garde de population, v20 publiée, test d'intégration sur vraie base, borne de 500 caractères de la vigilance, export du dossier, courrier au médecin, procédure d'extinction ; titre « Ma fiche de renseignements » à valider. Revue CodeRabbit : six commentaires corrigés, un écarté (le message d'un geste refusé s'affichait déjà).

## 2026-10-22 — t38 : contrat du lien besoin → leviers (H84, D-338 §1)

**Fait.** Module pur `web/src/lib/besoins/lienLeviers.ts` : leviers en liste fermée, trois modes (clé signée, déduit d'un amont signé, sans objet avec motif), `controlerLien` ; banc qui lit sans les toucher les `needIds` existants. Quatre arbitrages du responsable (hors clinique, trois modes, motif libre, mesure hors contrat). Constat t18 : #1635 n'a levé que le préalable.

**Écarté.** Lot clinique sous `lib/clinical/` ; liste fermée de motifs vide ; état de mesure dans le contrat.

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; t38 → « fait ».

**Ouvert.** t18 reste entière (crochet d'écriture aveugle à Bash).

## 2026-10-22 — Restes de F45 et des mineurs (D-342)

**Fait.** Sept arbitrages écrits : at remplacée par la date du dossier affichée au masquage ; as close (place 6 sans activation) ; repère du mineur en attente dans la liste des patients ; refus au vouvoiement laissé à J3-mineurs ; droits d'un parent à la main jusqu'à J3-mineurs ; validation des 15–17 ans par un avocat, préalable de J3-mineurs ; bancs sur fixtures pour F45.

**Écarté.** Lecture de la date par l'IA (lèverait le masquage, D-284 §5) ; date modifiable par le patient (un mineur lèverait sa pause) ; renumérotation des places 7 à 11.

**Prochaine action.** Lot du repère en liste, puis lot de la date au masquage.

**Ouvert.** 15–17 ans (avocat, avant J3-mineurs).

## 2026-10-22 — Repère du mineur dans la liste des patients (D-342 §2)

**Fait.** `PatientRow` porte « Mineur, accord parental attendu » sur un dossier en suivi dont la date dit un mineur ; règle du portail (`en_suivi`, `statutAge`) ; banc de neuf cas.

**Écarté.** Alerte au fil du jour (non demandée) ; migration ou drapeau (repère déduit de la date).

**Prochaine action.** Merge et déploiement constaté, puis PR de la date au masquage (D-342 §3).

**Ouvert.** `DeclarationsPatient.test.tsx` instable sous charge (une fois).

## 2026-10-22 — Date du dossier à l'écran de masquage (D-342 §3, at remplacée)

**Fait.** L'écran de masquage affiche la date de naissance du dossier (JJ/MM/AAAA) à comparer au compte rendu, ou invite à la saisir ; servie par la route du compte rendu, jamais envoyée au service de lecture.

**Écarté.** Lecture de la date par l'IA (lèverait le masquage) ; bouton de correction sur l'écran (la fiche administrative existe).

**Prochaine action.** Merge et déploiement constaté ; q10 de la page de suivi.

**Ouvert.** F45 : rubrique 4 (15–17 ans, avant J3-mineurs).

## 2026-10-22 — BP-15 : décision D-343 et migration des décisions de parcours

**Fait.** D-343 écrite depuis les arbitrages du 2026-10-20 ; précisions de l'assistant et paragraphe RGPD retenus tels quels ; #1642 mergée. Migration seule `decisions_parcours_v1` : une table en ajout seul ancrée sur une version, trois familles, motifs fermés sans efficacité ; contrat (quinze promesses, versions intouchées) et banc (sept courses) verts en local ; relecture `wn-reviewer` sans P0 ni P1, quatre P2 corrigés, trois routés à la PR 2.

**Écarté.** Une règle de séquence (début avant interruption) : des déclarations, une lacune se dit ; la date future refusée en base (route, comme BP-13).

**Prochaine action.** CI, CodeRabbit, merge ; release-db approuvée et déclenchée par le responsable ; constat par conteneur ; puis le code sous `WN_DECISIONS_PARCOURS`.

**Ouvert.** Brouillon de la lettre cm (F52) après le code.
## 2026-10-22 — t18 : crochet d'écriture sur Bash

**Fait.** `protect-wellneuro-files.mjs` armé sur Bash : redirections, `tee`, `sed -i`, `cp`/`mv`, `truncate`, `dd`, `git checkout -- f`/`restore` reçoivent le verdict d'Edit/Write ; un interpréteur citant un fichier protégé demande. Banc dédié, doc alignée.

**Écarté.** Refus systématique d'une écriture Bash (bloquerait le geste autorisé) ; demande sur tout interpréteur (bruit) ; couvrir `rm` (`rm -rf web/.next` refusé).

**Prochaine action.** PR, CI, CodeRabbit, merge, déploiement constaté, t18 → fait.

**Ouvert.** Scripts opaques et chemins par variable : silence documenté.

## 2026-10-22 — Mineurs : rubrique 4 provisoire, avocat consulté (D-344)

**Fait.** Avis préparatoire (Codex) confronté au dépôt : trois erreurs de fait corrigées. Rubrique 4 réécrite en version provisoire ; « un seul titulaire suffit » et « aucun secret opposable » suspendus ; étape 7 à trois demandeurs ; second avis intégré comme hypothèses soumises à l'avocat, non comme règles (architecture hybride, proportionnalité des seuils, transition dès 15 ans) ; note à l'avocat (six questions et faits du contrat).

**Écarté.** Corriger 2B tout de suite (aucun mineur servi ; un seul changement après l'avis).

**Prochaine action.** Envoi de la note par le responsable ; report des réponses dans la rubrique 4.

**Ouvert.** Âge plancher, transition à 18 ans, notice adaptée, AIPD avant le premier mineur.

## 2026-10-22 — t39 : besoins visés de la priorité libre, migration (D-338 §3)

**Fait.** Migration seule `c1_selection_priorite_besoins_vises_v1` : colonne `besoins_vises` (1 à 12, une dimension indicée à 1, strictement croissante, `{}` pour l'absence, lignes `libre:` seules) ; contrat étendu, chaque refus sous son propre CHECK, mutations rougies en local ; T3 vert ; `wn-reviewer` GO, trois P2 corrigés, un routé à la PR.

**Écarté.** Proposer les seuls besoins à questionnaire (arbitrage : les douze, effet nul affiché) ; NULL pour l'absence (deux représentations, deux empreintes).

**Prochaine action.** CI, CodeRabbit, merge ; release-db approuvée par le responsable ; constat par conteneur ; puis le code consommateur.

**Ouvert.** Fenêtre d'écriture d'une sélection entre déploiement et release-db.
## 2026-10-22 — BP-15 : code des décisions de parcours (D-343)

**Fait.** Release-db de #1644 constatée par conteneur. Route du cockpit, tiroir « Décisions de parcours » sous `WN_DECISIONS_PARCOURS` éteint ; libellés retenus par le responsable ; première diffusion affichée à côté des débuts réels (§9). Bancs : jour 0 et quatre empreintes, lecteurs, demande, fils, route (38 tests).

**Écarté.** `signature(err)` dans les journaux : vit dans la bibliothèque biologique, hors frontière D-306 — `classeEtCode`, précédent BP-13, jamais `err.message`.

**Prochaine action.** PR, CI, CodeRabbit, merge ; puis brouillon de la lettre cm (F52), hors dépôt.

**Ouvert.** Allumage : test d'intégration de la route sur une vraie base ; information patient relue avant BP-21a.
## 2026-10-22 — Instruments : textes faux (F9b, N1)

**Fait.** Infobulle d'un besoin sans source rendue exacte (« Aucune réponse de questionnaire exploitable pour ce besoin »), sans motif. « Vérifiez le terminal Next.js. » remplacé par un message praticien et « Réessayer » sur le détail des besoins et la fiche ; texte seul dans `messagesDossier.ts`, qui déborde sur quatre surfaces hors instruments.

**Écarté.** Bouton dans les quatre surfaces partagées (hors lot) ; tout motif (lot 4, après M-2).

**Prochaine action.** PR, CI, CodeRabbit, merge.

**Ouvert.** Rien pour le lot.
## 2026-10-22 — Banc DeclarationsPatient : rappel attendu (BP-13)

**Fait.** Les trois assertions sur `onLectureEchouee` qui suivaient `findByRole('alert')` passent sous `waitFor` : le rappel part d'un effet passif, après le rendu de l'alerte, et l'assertion pouvait le devancer sous charge (rouge CI de main sur db9018ee, T2 local une fois).

**Écarté.** Toucher le composant (le comportement est juste) ; T2 (test seul).

**Prochaine action.** CI, CodeRabbit, merge.

**Ouvert.** Rubrique 4 des mineurs : avis de l'avocat (D-344).
## 2026-10-23 — t39 : besoins visés de la priorité libre, code (D-338 §3)

**Fait.** Release-db 39920257712 approuvée : sentinelle, `migrate status` à jour, colonne et trois CHECK constatés par conteneur. Code : douze cases au formulaire (mention des besoins sans questionnaire), route (422 `besoins_invalides`), carte (clé absente si vide), lecture Prisma, re-passation par canal distinct des `needIds`.

**Écarté.** Mêler les besoins saisis aux `needIds` signés (revue de #1652) ; les montrer au portail ou aux assiettes (D-338 §3).

**Prochaine action.** T3, wn-reviewer, PR, CI, CodeRabbit, merge ; t39 « fait » au suivi.

**Ouvert.** t40 s'ouvre après le constat de t39.

## 2026-10-23 — BP-13 : clôture relue sous le verrou

**Fait.** `verrouillerDossier` (écriture BP-13) relit la clôture du suivi après le `FOR KEY SHARE` ; les routes praticien et portail rendent le refus nommé `dossier_cloture` avec le message du dossier clos. Même trou que la revue CodeRabbit de #1650 a trouvé sur BP-15, routé au responsable, arbitré « petite PR maintenant » le 2026-10-23. Deux tests de course.

**Écarté.** `FOR SHARE` sur le patient (bloquerait la clôture pendant l'écriture : changement d'ordre des verrous hors lot).

**Prochaine action.** CI, CodeRabbit, merge.

**Ouvert.** Allumage BP-13 : conditions de FEATURE_FLAGS.md inchangées.
## 2026-10-23 — BP-15 : libellés du retrait et de la révision

**Fait.** Les deux P2 de la relecture de #1650, routés au responsable, arbitrés le 2026-10-23 : « Retirer (posée par erreur) » devient « Retirer » (il sert aussi au refus levé, D-343 §5), avec une confirmation en ligne avant l'envoi ; « Corriger la révision » devient « Changer la révision » (§6). Test de composant : « Annuler » n'envoie rien, « Confirmer » envoie le retrait.

**Écarté.** Deux boutons distincts (même geste en base, motif non conservé) ; `window.confirm` (dialogue bloquant).

**Prochaine action.** CI, CodeRabbit, merge ; puis brouillon de la lettre cm en session neuve.

**Ouvert.** Allumage BP-15 : test d'intégration sur vraie base, information du patient avant BP-21a.

## 2026-10-23 — File D : gabarits servis tous datés, quatre v2 sans donnée de santé (D/39)

**Fait.** Arbitrages du praticien du 2026-10-23, gabarit par gabarit, sur le texte servi : quatre validés tels quels (`lien_magique`, `relance_agenda_sommeil`, `envoi_bilan`, `relance_questionnaire`) ; `objectif_propose` v2 daté du 2026-09-10 (commentaire faux corrigé) ; quatre v2 rédigées par l'assistant, relues et validées : invitations et accusé sans titre, sans liste, sans note. Routes et bancs alignés. Les 14 gabarits servis sont datés.

**Écarté.** Garder la note dans l'e-mail (écart déclaré restant) ; un drapeau (le texte change au déploiement, comme chaque version de gabarit).

**Prochaine action.** CI, CodeRabbit, merge.

**Ouvert.** Note par défaut « Pack <nom> » ou « Envoi groupé — bibliothèque » affichée comme note du praticien dans l'espace : non tranché, hors lot, routé en D/52 ; les v2 du pack et de la sélection n'y renvoient pas.
## 2026-10-23 — M-2 : signature de la doctrine du cockpit

**Fait.** D-333 et D-334 signées telles quelles par le responsable (niveau médian de D-334 §4 compris) ; porte 6 levée au plan ; F59 et H32 mises à jour ; lots de l'audit des instruments (Q1 à Q12) inscrits à F59 avec leurs préalables. Constat : la stabilité métabolique est affichée au cockpit sans mention, donc hors D-333 §3 dès le merge.

**Écarté.** Masquer la jauge (s'écarte de la tolérance « à côté de sa valeur ») ; tout fondre dans un seul J1-cockpit (cockpit hors doctrine plus longtemps).

**Prochaine action.** CI, CodeRabbit, merge ; puis J1-cockpit-a en premier lot de code.

**Ouvert.** Porte 4 (poids égal) ; y (comptes du cabinet), geste du responsable.

## 2026-10-23 — t40 : constat sur un besoin sans score, migration (D-347)

**Fait.** Liste des motifs absente de D-338 et D-331 : cinq arbitrages du responsable, D-347 mergée (#1661). Paragraphe RGPD validé. Migration `constats_besoin_praticien_v1` au patron de D-331 : besoins 2, 6, 7, 11, quatre verdicts, neuf motifs, pièces facultatives ; contrat, banc, effacement nommé. T3 vert ; wn-reviewer GO avec réserves, corrigées.

**Écarté.** Transposer la liste de D-331 (elle parle d'hypothèses et de prélèvements) ; base ouverte aux douze besoins.

**Prochaine action.** CI, CodeRabbit, merge, release-db par le responsable, constat par conteneur ; puis PR 2 sous `WN_CONSTAT_BESOIN`.

**Ouvert.** Emplacement de l'écran (PR 2), hors des panneaux de J1-cockpit-a.
## 2026-10-23 — J3-12h : cadrage mergé, lot 1 de D-345

**Fait.** #1651 mergée : quatre commentaires CodeRabbit corrigés (« personne enceinte », retrait de l'accord, G0 fermée, lecture de Q4 dans le temps). Lot 1 : nature « ciblé / multivitaminé » au contrat V4, table des cinq déclencheurs signée par le responsable le 2026-10-23 (provenance en codes, S-MG-1 et S-MG-2 en P6 v0.4 §2 lus au dossier privé), garde pure. Revue `wn-reviewer` : GO, P1-2 corrigé (dernier mot du praticien).

**Écarté.** Exiger la nature à l'écriture (fermerait tout complément avant l'écran) ; refuser les champs à la route (aucun lecteur avant le lot 3).

**Prochaine action.** PR, CI, CodeRabbit, merge ; puis lot 2, migration de la trace de remise.

**Ouvert.** Lot 3 : déclarations toujours datées (un « oui » non daté ne se lève pas), têtes de fil passées à la garde.
## 2026-10-23 — J1-cockpit-a : nature des trois objets, tolérance de la stabilité

**Fait.** Stabilité métabolique, réserve d'adaptation et clarté portent « Repère de suivi, pas un score clinique » au cockpit ; la stabilité affiche « Non motivé, décision due » et ses sources nommées (présente, manquante ; moyenne à poids égal sur deux). Route : présence par source en booléens. Garde de nature étendu aux trois objets, rouge sous mutation.

**Écarté.** « Couverture de recueil » pour B9 et B10 (laisse lire un taux de réponses) ; chiffres par source dans l'API (exigeraient provenance et nature) ; garde séparé hors `lib/equilibre` (copie divergente).

**Prochaine action.** CI, CodeRabbit, merge ; page de la file A (r3_07 en cours) ; puis J1-cockpit-b.

**Ouvert.** Porte 4 (poids égal) ; incohérence de nom des besoins 9 et 10 (jauge « repère de suivi », tableau « couverture ») jusqu'aux lots Q2 à Q4.

## 2026-10-23 — File D : la note par défaut ne s'affiche plus comme celle du praticien (D/52)

**Fait.** Arbitrage du responsable : note vide et filtre. Les trois écrivains (pack du praticien, pack de base du portail, sélection) enregistrent null ; `api/patient/questionnaire` retire les deux anciens libellés à la lecture, donc les assignations déjà ouvertes cessent de les afficher. Lecture de production en agrégats (one-off-6824) : aucune vraie note en base. Bancs aux trois écrivains, à la route et au filtre.

**Écarté.** Écrivains seuls (les assignations ouvertes gardaient le libellé) ; nettoyage en base (migration et release-db) ; libellé distinct à l'écran (le nom du pack restait affiché).

**Prochaine action.** CI, CodeRabbit, merge ; puis b16 (vérifier au plan, F25, s'il relève de la file D) et b25 (texte des durées, à relire).

**Ouvert.** Une vraie note commençant par « Pack » serait masquée : risque accepté.
## 2026-10-23 — t40 : constat sur un besoin sans score, code consommateur (D-347)

**Fait.** Migration #1664 appliquée : release-db 40021347640, sentinelle liée au run, constat par conteneur. PR 2 : route `api/praticien/besoins/constats`, lecture, écriture sous les verrous du trigger, bloc sous le tableau de l'onglet « Besoins » (arbitrage du responsable), garde des lecteurs jumelle, sous `WN_CONSTAT_BESOIN` éteint. Biologie lue par l'entrée publiée (D-306). T3 vert ; wn-reviewer GO avec réserves, corrigées.

**Écarté.** Tiroir de la phase « Données », onglet Biologie (confusion avec D-331) ; relever le plafond des dérogations BioFlow.

**Prochaine action.** CI, CodeRabbit, merge, observation du déploiement ; t40 « fait » au suivi.

**Ouvert.** Test d'intégration sur vraie base avant l'allumage.
## 2026-10-23 — J1-cockpit-b : provenance datée, garde de frontière, Q9 et Q10

**Fait.** Quatre arbitrages du responsable (options recommandées). Repli « Source » sous les cinq cartes du cockpit : questionnaires lus, date de la passation retenue, version du calcul ; sans provenance, « Source non enregistrée » au lieu du chiffre. Q9 : mention du plafond sous l'indice (booléen seul). Q10 : valeur de trajectoire et écart du momentum retirés de `lecturePatient`. Garde `frontierePortail` en trois volets, rouge sous huit mutations. wn-reviewer : GO avec réserves ; P1 (trois répertoires patient hors garde) corrigé.

**Écarté.** Provenance du tableau des couvertures (r3_08 le refait) ; dates recalculées dans la route (copie de la déduplication) ; version empruntée pour la stabilité (« Formule non versionnée »).

**Prochaine action.** CI, CodeRabbit, merge ; r3_07 « fait » à la page de la file A.

**Ouvert.** Règle 2 (formule `nom-vN`) ; contrat à liste fermée limité à `api/patient/equilibre`.
## 2026-10-23 — bd : encart « quand ralentir ou demander avis », livré éteint (D-349)

**Fait.** Texte du responsable accepté (variante A d'un brouillon externe ; phrase du choix dans le formulaire retirée sur revue adverse) ; servi au caractère près à l'accueil du protocole sous `WN_PORTAIL_ENCART_CONDUITE`, éteint ; D-349, registre des drapeaux, plan H71.

**Écarté.** Phrase « choisissez l’élément ou « Je ne sais pas » » : sur l'ancien formulaire (mineur, sans date), « Je ne sais pas » laisse le signalement hors du programme (D-281). Lien vers « Signaler un problème » : non demandé, limite écrite au §5.

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; drapeau sur accord du responsable, puis constat (D-349 §4) ; page de la file C.

**Ouvert.** Aperçu du protocole au cockpit sans l'encart ; gêne liée à un geste de vie routée par le libellé « produit ».
## 2026-10-24 — t41 : la re-passation ciblée atteignable au jalon dû

**Fait.** Au jalon de mesure, la route cockpit joint à `proposal_required` la cible de re-passation (`needIds`, `besoinsVises`), tirée du rejeu de la carte de l'ancre courante (`lireSelectionPriorite`, repli `construireChaineC1Tolerante`). Une dérivation pure est partagée avec l'écran (`besoinsDeRepassation`), et le rejeu est factorisé. Aucune migration, rien de clinique. wn-reviewer : GO avec réserves, P2-1 corrigée, P1 documentée et figée par un banc.

**Écarté.** Relire l'épisode de l'ancre sans repasser par sa proposition : la cible divergerait de l'écran de l'ancre.

**Prochaine action.** CI, CodeRabbit, merge, observation du déploiement ; t41 « fait » au suivi de la file A.

**Ouvert.** Rejeu des ancres `T1+` cassé par une passation postérieure (D-118, antérieur au lot), à router par le responsable ; Q1 (cible du J42 après la confirmation du J21).

## 2026-10-24 — F52 : la cible `axe` fermée sur les dix codes de D-348

**Fait.** Cinquante fondateurs de D-348 §3 relus en production (lecture seule) : tous conformes, 0 lien. Migration seule `20261024100000_biology_axes_liste_fermee_v1` (CHECK `cible_axe`), contrat négatif `biology_axes_v1_negatif.sql` au CI : liste exacte, dix codes acceptés, axe inconnu et lien sans claim refusés pour le bon motif.

**Écarté.** Une clé étrangère du claim vers le corpus : hors demande, le claim est versionné et la forme du lien suffit à F52.

**Prochaine action.** Passe Codex, CodeRabbit, merge, release-db approuvée, constat par conteneur (contrainte, 0 lien) ; puis F79.

**Ouvert.** Panel → axe (D-348 §7) ; trois claims à l'atelier ; WN-SRC-0236.
## 2026-10-24 — r3_08 : cercles du cockpit, motif du non mesuré (Q2 à Q4)

**Fait.** Libellés des motifs et points de forme validés par le responsable avant le code. Cercles propres au cockpit (Bn, anneaux nommés, anneau creux pour le non mesuré, ordre fixe, liste en texte, intensité au-dessus d'un plancher). Motif dépliable sous le tiret, tiroir et onglet, issu du chemin de la valeur (`evaluerCouvertureSource`). Dettes de J1-cockpit soldées : provenance du tableau et du chip, mention « même valeur » sur B9 et B10. wn-reviewer : GO avec réserves, P1 et P2 corrigés.

**Écarté.** Version stockée sur l'ancre pour le chip (le calcul tourne sur le moteur courant) ; motif inventé pour un groupe sans poids (figé par un banc).

**Prochaine action.** CI, CodeRabbit, merge ; r3_08 « fait » sur la page de la file A.

**Ouvert.** Q1 (ordre, r3_09) : les cercles suivent B1 à B12, le tableau du tiroir garde le tri « creux d'abord » jusqu'à r3_09.

## 2026-10-24 — File D : outil du constat avant T0 (H07, b16)

**Fait.** D/52 mergée (#1667), après la release-db de F52 approuvée par le responsable. H07 relève de la file D (geste, constat de rang 0) : script de conteneur en lecture seule (`constatAvantT0.ts`) qui évalue les préconditions T0 par le chemin des routes ; module pur de masquage D-298 (partitions masquées ensemble, comptes par condition masqués avec elles, quartiles d'ancienneté). Essai sur la base locale : refus hors lecture seule, chemin complet sans écriture.

**Écarté.** Recopier les préconditions en SQL (deux calculs divergeraient) ; tranches d'ancienneté (un délai inventé avant la D-xxx).

**Prochaine action.** CI, CodeRabbit, merge ; constat en conteneur après déploiement, versé au plan en agrégats ; puis b25 (v20, texte validé le 2026-10-24).

**Ouvert.** D-xxx du délai avant T0, de la main du responsable, après le compte.
## 2026-10-24 — bd : encart ouvert et constaté (D-349 §4)

**Fait.** #1669 mergée et déployée ; drapeau `WN_PORTAIL_ENCART_CONDUITE` posé à 07 h 17 UTC sur accord du responsable ; constat sur un dossier de test (encart lu en ligne, détail replié, texte conforme ; diffusion relue par conteneur). Porte 18 levée.

**Prochaine action.** Ouverture suivante de la file C dès qu'elle est prête (ak attend le brainstorming « Questionnaires de jalon », puis son texte).

**Ouvert.** Limites de D-349 §5 (pas de lien vers le formulaire, libellé « produit », aperçu cockpit).

## 2026-10-24 — Outillage : sondage en boucle autorisé

**Fait.** Sur autorisation du responsable (toutes sessions), bloc SONDAGE retiré de `block-risky-commands.mjs` ; bancs inversés (387 verts) ; CLAUDE.md et règle des PR alignés ; mémoire posée.

**Écarté.** Passer la boucle en « demande » plutôt que la libérer : l'autorisation est définitive.

**Prochaine action.** CI, CodeRabbit, merge.

**Ouvert.** Le garde d'isolation des worktrees (harness) refuse encore les boucles en ligne complexes : passer par un script.

## 2026-10-24 — File D : « Vos données personnelles » v20 et conditions v3 (b25)

**Fait.** H07 : outil mergé (#1676). b25 : la phrase de la v12 (« valeurs relevées et décisions » conservées) corrigée en v20 sur texte validé par le responsable ; les conditions étant ouvertes, D-292 §5 impose des conditions v3 (partie 3 = v20) et l'e-mail `conditions_utilisation@3`, tous deux validés en session. Bancs du registre et des gabarits mis à jour, textes figés mot pour mot. Dossier RGPD et plan (F44) mis à jour.

**Écarté.** Différer b25 jusqu'au texte des durées (m17) : la v19 restait inexacte.

**Prochaine action.** CI, CodeRabbit, merge ; envoi de l'e-mail des conditions v3 par le responsable s'il le décide ; constat H07 en conteneur dès le déploiement de #1676.

**Ouvert.** Constat de la première purge après le 2026-11-02.
## 2026-10-24 — t42 : un T1 confirmé ne redevient plus « à confirmer »

**Fait.** Le responsable a tranché par une question à options : corriger tout de suite le P1 relevé sur #1670. Une ancre `T1+` déjà posée se date désormais sur le `targetAt` de sa ligne (`ancrePoseeDe`, `proposeRuntimeEpisode`), et non plus sur la dernière réponse. Cela vaut au GET, au POST et pour la cible de re-passation. `T0` et l'ouverture d'un cycle neuf sont inchangés. Sans migration ; l'arbitrage est transcrit en D-350 (demande de CodeRabbit). wn-reviewer : GO avec réserves, et les quatre P2 sur les bancs sont corrigées. Constats par conteneur : effectif inférieur à cinq dossiers, répartition masquée (D-298 §3).

**Écarté.** Modifier `lireAncresPersistees`, que lisent aussi portail, objectifs et check-ins ; dater `T0` sur sa ligne.

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; t42 « fait » au suivi, réserve de t41 levée.

**Ouvert.** Rien dans le périmètre.

## 2026-10-24 — J3-12h lot 2 : liste du courrier complément et trace de sa remise (migration seule, D-345)

**Fait.** Migration `20261024110000_courriers_complement_remises_v1` : deux tables en ajout seul. `courriers_complement_listes` retient la liste du courrier à sa consignation. `courriers_complement_remises` exige l'égalité de trois listes (insérée, recalculée depuis le protocole V4, consignée), un courrier sortant ancré `complement-cible-%` et le texte recopié. S'y ajoutent l'espèce de lecture `courrier_complement`, l'effacement nommé, la garde de dépôt et la ligne RGPD (validée). Le contrat négatif est vert, onze mutations le font rougir ; T1, T2 et T3 sont verts.

**Écarté.** Une colonne sur `correspondances_medecin` (panne de la table pendant la fenêtre de release-db) ; renvoyer le lien courrier ↔ liste au lot 3 (il aurait demandé une seconde migration).

**Prochaine action.** PR, CI, CodeRabbit, merge, release-db sur la tête de main, constat par conteneur ; puis le lot 3.

**Ouvert.** Obligations du lot 3 reçues de la revue (handoff du lot).
## 2026-10-24 — F79, premier temps : dix-sept liens analyte-axe signés (D-351)

**Fait.** Production relue en lecture seule (one-off-9987, 1677) : 0 lien, 8 CHECK, cible `axe` fermée, 92 analytes, 1 064 claims certifiés qui citent un analyte, presque aucun niveau de preuve écrit. Brouillon au Claude Doc privé ; douze arbitrages (huit sur la recommandation, quatre contre) ; liste de dix-sept liens signée. D-351 en forme opaque, fiches F52 (constat) et F79 mises à jour.

**Écarté.** Niveau C uniforme (inventé) ; script en conteneur (D-087) ; claims de stade.

**Prochaine action.** CI, CodeRabbit, merge ; puis la migration de données de D-351 §5 dans sa propre PR.

**Ouvert.** Correspondance panel → axe (F53) ; claims à relire (D-348 §6) ; WN-SRC-0236.
## 2026-10-24 — File D : constat D/53, renvoi de collecte D/38, b12

**Fait.** #1677 est déployé. D/53, en lecture seule : `WN_G4_LIEN_MAGIQUE` a été retirée le 21 octobre par k10 (le formulaire de nouveau lien a disparu avec elle) puis reposée le 24 ; `WN_BIO_CONSTAT` est livrée éteinte, conforme ; `WN_AGENDA_RELANCE` n'a jamais été reposée sur Scalingo depuis la bascule, et c'est un écart réel. D/38 : le renvoi du texte de collecte nomme désormais la partie des conditions d'utilisation, sur texte validé par le responsable (arbitrage 8 de G-11). b12 était déjà en D.1 depuis le 15 octobre.

**Écarté.** Garder le renvoi au texte autonome. Une PR pour b12 n'avait rien à changer.

**Prochaine action.** CI, CodeRabbit, merge ; d38 « fait » sur la page D.

**Ouvert.** La décision sur `WN_AGENDA_RELANCE`, avant les relectures k01 du 2026-10-29.

## 2026-10-24 — r3_11 : compte des besoins mesurés et « Compléter la mesure » (Q6, Q8)

**Fait.** D-352 rédigée puis arbitrée par quatre questions à options (toutes à la recommandation) : compte `mentionBesoinsMesures` en tête de l'onglet, en tête du tiroir et sur son bouton (la ligne d'accès de F2 n'existe pas, Q2 ayant gardé les cercles) ; « Compléter la mesure » dans le motif déplié, sous la seule ligne `aucune_passation`, onglet et tiroir, cercles exclus. Filtre `questionnairesProposables` et bouton `AjoutFileEnvoi` partagés avec la Trajectoire, rendu identique.

**Écarté.** Compte en tête des cercles ; geste dans un second repli ; recompte côté écran.

**Prochaine action.** CI, CodeRabbit, merge ; r3_11 « fait » sur la page de la file A.

**Ouvert.** Aucun besoin mesuré : le compte dit « Calculé sur 0 besoin mesuré sur 12 », alors que la jauge de l'indice masque sa base.
## 2026-10-24 — ak : la phrase d'appui sous chaque questionnaire renvoyé (D-353)

**Fait.** Relevé des places 8 à 11 et de la porte 28 depuis 0ac2a236 : rien n'a bougé. À la demande du responsable, l'assistant a rédigé trois variantes de la phrase ; le responsable a retenu la variante A sans retouche. D-353 consigne Q1 à Q4 et les six arbitrages du 2026-10-23 (H80). Le lot est sans migration et le drapeau `WN_PORTAIL_APPUI_RENVOI` est livré éteint. wn-reviewer a rendu NO-GO sur deux P1, traités : la lecture isolée du rendez-vous J21 et le numéro, partagé avec #1680, mergée avant (ak devient D-353, après D-352 de #1684). Les agendas sont exclus. T3 vert.

**Écarté.** Fixer une période dans la phrase (« aujourd'hui »), qui contredirait la période de rappel d'un instrument ; rappeler les premières réponses (biais de souvenir).

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; activation sur accord, puis constat D-353 §5.

**Ouvert.** Rien dans le périmètre.

## 2026-10-24 — r3_11 (suite) : libellé quand aucun besoin n'est mesuré

**Fait.** Le responsable trouvait « Calculé sur 0 besoin mesuré sur 12 » peu explicite : il a choisi « Non calculé : aucun besoin mesuré » (question à options). `mentionBesoinsMesures` le rend à zéro (D-352 §4), donc sur le bouton, le tiroir et l'onglet ; la jauge de l'indice est inchangée.

**Écarté.** « Aucun besoin mesuré sur 12 » (recommandé) ; « Aucun besoin mesuré (0 sur 12) ».

**Prochaine action.** CI, bases visuelles, CodeRabbit, merge.

**Ouvert.** Rien dans le périmètre.

## 2026-10-24 — t43 : le mode consultation, écran partagé sans chiffre (D-354)

**Fait.** D-354 écrite à partir des huit arbitrages du jour : la fiche pose un contexte `ChiffresMasques`, et pourcentages des 12 besoins, indice et repères, momentum, scores, interprétations, plainte « x/10 » et valeurs biologiques cèdent la place à « masqué en mode consultation » ; seuls le cockpit et les 12 besoins restent. Bancs E2E à valeurs sentinelles, unitaires de la fiche et des cercles. Revue medium : deux corrigés, six écartés avec motif.

**Écarté.** Démonter les onglets gardés montés (perte du brouillon) ; une étiquette qualitative à la place des valeurs (aucun seuil signé).

**Prochaine action.** CI, CodeRabbit, merge, observation du déploiement ; t43 « fait » sur la page de la file A.

**Ouvert.** Interprétations et motifs du moteur masqués, agendas et physio laissés visibles : à confirmer par le responsable.

## 2026-10-24 — r3_13 : « Points à explorer » acté au portail (D-355)

**Fait.** Relecture de LOT-05, de sa maquette, de la campagne SP-CONV et de #294 : aucun motif clinique écrit du tri, seul le libellé avait changé. Le responsable a choisi d'acter (questions à options) avec le motif « matière de dialogue » : D-355 nomme une troisième famille d'exceptions à D-333 §1 et §2 r4, bornée (trois besoins mesurés au plus, sans chiffre, sans mot ni couleur qui juge). Écran inchangé ; commentaire et banc unitaire.

**Écarté.** Le retrait (règle du 2026-10-22 par défaut) : le responsable a fourni le motif.

**Prochaine action.** CI, CodeRabbit, merge ; r3_13 « fait » sur la page de la file A.

**Ouvert.** Rien dans le périmètre.

## 2026-10-24 — t36 : libellés réels restés « inconnu », résolveur re-signé (D-356)

**Fait.** Constat par conteneur (agrégats : 53 « inconnu », 92 résolues). Huit libellés rattachés sur arbitrage du responsable, puis la signature : « PROTEINE C REACTIVE (CRP) » à la CRP ultrasensible, le VGM, les plaquettes (EDTA), le DFG, l'HbA1c courante, l'indice oméga 3, le rapport AA/EPA, l'indice d'anisocytose. Unités : « mL/min » admis pour le DFG, une unité absente pour un ratio. 175 entrées.

**Écarté.** Les antériorités (fausse date) ; « CRP (Protéine C Réactive) » déplacé (D-263 gardée) ; migration des lignes déjà lues.

**Prochaine action.** CI, CodeRabbit, merge, observation ; t36 « fait » au suivi.

**Ouvert.** Fiches TP/INR/Quick et acides gras : deux lots au plan.

## 2026-10-24 — J3-12h lot 3 : courrier complément, remise au clic et refus (D-358)

**Fait.** Le générateur du courrier (texte validé), le courrier et sa liste dans une seule transaction, la garde du clic parmi les refus d'avant l'embranchement, la remise par `createMany` (tout refus autre que « déjà remis » annule le clic) et la case « ciblé » du constructeur. Tout est sous `WN_COURRIER_COMPLEMENT`, éteint, sans migration. Banc Postgres : parité de la liste avec le trigger, « les deux ou rien », remise de bout en bout. Revue `wn-reviewer` : GO sous conditions ; P1 corrigés.

**Écarté.** L'égalité stricte et l'union des remises, pour la couverture ; le portail dans ce lot.

**Revue Codex.** Deux P1 corrigés : l'âge relu sous verrou à la consignation ; le libellé du destinataire réservé à la grossesse (arbitrage du responsable).

**Prochaine action.** CI et CodeRabbit sur la tête, puis le merge ; ensuite le lot 4 (portail).

**Ouvert.** Le nombre d'anamnèses envoyées sans date en production, à lire par conteneur : un « oui » non daté rend le courrier perpétuel.

## 2026-10-24 — J3-12g : l'agenda du sommeil entre au snapshot (D-359)

**Fait.** Préalables levés : inventaire « rubrique → lecteurs » (27 rubriques, dix lues par l'indice, le snapshot jugeant la présence de toutes) et compte par conteneur (13 agendas clôturés ; répartition masquée, moins de cinq dossiers). Le responsable a tranché par questions à options : deux lots (J3-12g puis r3_10), tout agenda clôturé est complet, réapprobation après déploiement, inventaire au dossier de proposition. Prédicat `agendaSommeilCloture`, version gardée, bancs.

**Écarté.** L'agenda à indice seul, les rubriques lues par l'indice (un agenda court resterait dit « incomplet ») ; un changement de version (éteindrait les 4 approbations) ; D-357 et D-358, pris entre-temps par #1695 et #1691 (renuméroté en D-359).

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; réapprobation des approbations concernées, constat par conteneur ; puis r3_10.

**Ouvert.** Rien dans le périmètre.

## 2026-10-25 — r3_10 : l'écart avec la décision, nommé sous la valeur (Q5)

**Fait.** Inventaire : l'écart restant (snapshot sur la passation entière, routes sur les items lus) ne va que des routes vers la décision. Il ne touche donc jamais un non mesuré et se dit sous la valeur. Le responsable a validé, par questions à options : la forme du motif, l'onglet et le tiroir, les sources tirées du mapping (HAD comprise), le motif « recueil incomplet » précisé « sur les items lus ». Le prédicat du snapshot est réutilisé, pas copié.

**Écarté.** Les cercles ; une liste fermée de trois sources ; une nouvelle D-xxx (Q5 tranchée, M-2 signée).

**Prochaine action.** CI, CodeRabbit, merge, observation du déploiement ; constat par conteneur après la réapprobation des diffusions de D-359.

**Ouvert.** Rien dans le périmètre : par conteneur, 71 dernières passations des quatre sources, aucune incomplète ; l'écart est démontré, sans occurrence en production.

## 2026-10-25 — ap : « Ma bibliothèque », le contenant livré éteint (D-360)

**Fait.** Relevé de la file C (rien de neuf sur les places 7 à 11 ni sur la porte 28 depuis bb3df30d). Le responsable a accepté, par questions à options, trois titres à la première personne et le libellé du lien. Il a tranché que la bibliothèque servie remplace le lien des fiches, et que le mineur garde le sien. Lot livré : page, route sans document, lien, drapeau éteint, carte de fiche extraite. `wn-reviewer` a rendu GO.

**Écarté.** « votre » dans les titres (deux voix sur une page) ; deux liens vers les mêmes fiches ; toute proposition de texte pour les places 8 et 11 (contenu clinique, ou arbitrages de la lettre an).

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; puis une PR de doc pour la place 9 (texte accepté, départ au premier jour noté du carnet).

**Ouvert.** La fenêtre de service de la place 9 ; le retour depuis une fiche, qui mène à la page des fiches.
## 2026-10-24 — F79 : migration des dix-sept liens analyte-axe (D-351 §4-§6)

**Fait.** Production relue avant d'écrire, conforme à D-351. Migration `20261024160000_biology_liens_axe_signes_v1` : `niveau_preuve` nullable ; trigger contre le double lien nutriment/axe ; dix-sept liens en un seul bloc, tout ou rien. Contrat de la liste exacte, contrat négatif, et banc de rejeu sur des claims de fixture, au CI et en T3. Deux arbitrages consignés en D-351 §6 : corpus vide = aucun lien ; trigger. T3 vert.

**Écarté.** Exiger 17 liens sur toute base (le CI serait rouge) ; constater le double lien sans le refuser ; brancher le contrat en préflight de `release-db` (hors lot).

**Prochaine action.** CI, CodeRabbit, Codex, merge ; release-db après celle de #1679 ; constat par conteneur, versé dans une PR de suivi.

**Ouvert.** Code consommateur (« non gradé ») ; F53 ; claims à relire en atelier.

## 2026-10-24 — t44 : fiches TP et INR au catalogue, migration (D-361)

**Fait.** Constat par conteneur (agrégats) : TP en %, INR sans unité, temps de Quick patient et témoin en s, tous « inconnu ». Le responsable a tranché sur questions à options : deux fiches, `BIO_TP` (%) et `BIO_INR` (« ratio »), `saisie_praticien`, sans plage ni NABM signé ; candidats 0126, 0127, 1128 proposés. Migration de données seule.

**Écarté.** Le temps de Quick en secondes (dépend du réactif, sans son témoin) et « s » au vocabulaire ; un panel ; l'INR en NULL ; les synonymes.

**Prochaine action.** CI, CodeRabbit, merge, release-db, constat ; puis le second lot (libellés au résolveur, re-signature).

**Ouvert.** cinq PR ont revendiqué D-357 le même soir ; D-357 à D-360 pris par d’autres PR, renuméroté D-361 au merge.

## 2026-10-25 — r3_14 : les instruments des 12 besoins sous banc d'accessibilité (Q12)

**Fait.** Inventaire : J3-12b réorganise l'onglet, mais un banc qui vise le panneau par son id et le tiroir par son rôle lui survit. Le responsable a tranché par questions à options : banc maintenant, correctif sans texte s'il y a violation, aucune règle désactivée, portée bornée aux instruments. Banc axe (WCAG 2.1 A et AA) posé sur l'onglet et sur le tiroir : zéro violation dès le premier passage. Parcours E67 : étape 9 « Mon équilibre », et l'onglet et le tiroir au poste B.

**Écarté.** Attendre J3-12b ; la page entière comme portée ; F9a (caption, radar, graduations), qui suit J3-12b.

**Prochaine action.** CI, CodeRabbit, merge après la release-db de t44 (#1692), observation du déploiement.

**Ouvert.** La passe humaine E67 (file D) ; les défauts qu'axe ne classe pas en violation restent à F9a.

## 2026-10-25 — J3-12h lot 4 : le courrier complément au portail, éteint (D-362)

**Fait.** Écran « Courrier à remettre à votre médecin » (toutes les remises, impression `?remise=`), espèce de lecture `courrier_complement` (fil du jour, accusé, Mes échanges, Documents remis), annonce neutre au clic, préparation liée à la tête de fil relue, banc de fraîcheur. Prod (conteneur) : 28 consultations validées, 0 sans date. Condition 1 sur 4 levée ; drapeau éteint.

**Écarté.** La dernière remise seule (perd le courrier d’une version qui retire un complément) ; « au prochain rendez-vous ».

**Prochaine action.** CI, CodeRabbit, passe Codex P0, merge, constat du déploiement.

**Ouvert.** P2-1 routé au plan (libellé « Fiches remises ») ; conditions 2 à 4.

## 2026-10-25 — t44, second lot : TP et INR au résolveur (D-363)

**Fait.** Migration de #1692 constatée, préalable de D-361 §6 rempli. « Taux de prothrombine » → `BIO_TP` et « INR » → `BIO_INR` sont au résolveur, sans synonyme ; le temps de Quick reste « inconnu ». La re-signature (177 entrées, SHA `b4007b9c…`) a été posée sur l'instruction du responsable et remplace celle de D-356. Un banc vérifie qu'un INR sans unité est résolu.

**Écarté.** Les synonymes (« TP » nu, « Temps de prothrombine ») ; D-364 réservé d'avance (le contrôle refuse un trou) ; D-362 pris de force sur #1701.

**Prochaine action.** #1701 mergée, main fusionné : T3, CI, CodeRabbit, merge, déploiement.

**Ouvert.** Le numéro, qui dépend de l'ordre des merges ; le constat des prochains imports de TP et d'INR.

## 2026-10-25 — F79, troisième temps : axes sur la fiche analyte, liste en préflight (D-351 §4, P2-1)

**Fait.** P2-1 soldé : `biology_liens_axe_v1.sql` en préflight de release-db, avant `migrate deploy`. La fiche analyte de la Bibliothèque porte « Axes biologiques » : axe, sens, claim et niveau, « non gradé » quand le niveau est nul (union discriminée, tri sans le niveau). Libellés validés par le responsable. T3 vert.

**Écarté.** Les paires au contrat de fraîcheur (quatrième copie de la liste) ; l'affichage au dossier du patient (règle d'interprétation non décidée, F53) ; le lecteur sans écran.

**Prochaine action.** CI, CodeRabbit, passe Codex (P0), merge, constat de la fiche après déploiement.

**Ouvert.** Le signal d'un claim rejeté n'arrive qu'à la release-db suivante ; les liens nutriment sans écran.

## 2026-10-24 — File D : lettres bg, h, bf (D-364 à D-366)

**Fait.** Inventaire des lettres en attente, en lecture seule. Trois lettres de rang 0 écrites sur arbitrages du responsable : bg (export vers un outil d'IA externe déclaré, version pseudonymisée seule, réserve « sans accord de sous-traitance » écrite), h (Boussole retirée du portail, exception nommée à D-276 §1), bf (cadre des indicateurs hebdomadaires). Lignes périmées du registre et de D.3 remises à jour.

**Écarté.** Arrêt ou suspension du flux bg ; registre des violations ; suppression du code C5 ; liste des indicateurs bf avant le cadre.

**Prochaine action.** CI, CodeRabbit, merge, page D ; puis ad + bc et ba.

**Ouvert.** Lot de code de bg sans rang ; J1-alim à ouvrir.

## 2026-10-25 — File D : lettres ad, bc, ba (D-367 à D-369)

**Fait.** #1693 mergée (bg, h, bf sous D-364 à D-366, après trois renumérotations et cinq passes CodeRabbit) ; page D remise à jour. Second lot écrit : ad (un cycle, `phases` fermé, « programme » défini), bc (ajout par version datée approuvée, seul un pivot relance), ba (« Validé par votre praticien le … »).

**Écarté.** Message de départ dans ba ; NIR dans le texte patient de bg (plus recueilli depuis D-284 §2).

**Prochaine action.** CI, CodeRabbit, merge, page D ; puis cb, (a) et (e) de D-283, aw, az.

**Ouvert.** Lot de code de ba (rang 1) ; #1704 doit renuméroter.

## 2026-10-25 — Restes de l'audit des instruments : D-354 confirmée, r3_09 et F9a détachés

**Fait.** D-354 : « Confirmé le 2026-10-25 », le compte des besoins mesurés et « Compléter la mesure » restent en mode consultation. Plan : r3_09 (Q1) et F9a détachés de J3-12b, à faire sur l'onglet actuel (F59, H15, H64) ; r3_12 (Q7) reste avec J2-mom (H30). Documentation seule.

**Écarté.** Masquer le compte ou le bouton (D-354 §2 tel qu'écrit) ; attendre J3-12b, car w n'a pas de date ; une phrase de résumé du radar.

**Prochaine action.** Lot r3_09, puis F9a (textes relus avant le code).

**Ouvert.** La légende de la table, la phrase d'état du radar et le `role="status"` du chargement, à relire au lot F9a.

## 2026-10-26 — r3_09 : ordre fixe des 12 besoins, provenance de l'onglet (Q1)

**Fait.** Tiroir et onglet en ordre fixe B1 à B12, une ligne par strate (Corps, Ancrage, Esprit), clé « Bn · libellé ». Tri « creux d'abord » retiré de la route d'équilibre (D-333 §2 r4). L'onglet sert et ouvre la provenance de chaque valeur. Le radar ne trace pas une valeur sans provenance (« source non enregistrée ») et ouvre ses sources d'un seul geste. Textes validés avant le code.

**Écarté.** Nouvelle D-xxx (Q1 et D-333 suffisent) ; drapeau ; composant de ligne partagé entre les deux tableaux (J3-12b réorganise l'onglet).

**Prochaine action.** CI, bases visuelles si refusées, CodeRabbit, merge ; pages file A et Instruments.

**Ouvert.** r3_15 (F9a), r3_12 (attend o).
## 2026-10-26 — Quatre files en parallèle : six décisions (D-370 à D-375)

**Fait.** Arbitrages des 25 et 26 octobre au registre : D-370 numéro réservé à la rédaction ; D-371 mises à jour du plan en fragments ; D-372 clôture par le handoff seul ; D-373 intégrateur unique en essai, libération dès le merge ; D-374 release-db par phases, déployeur retenu tant qu'une migration attend (question D-248 n° 2 rouverte) ; D-375 crochet de fraîcheur, journal puis tolérance. Plan : H23, §5, §10. Documentation seule.

**Écarté.** Gel intégral permanent ; états « livré » hors du plan ; registre en fragments ; check requis de plus ; file de merge.

**Prochaine action.** Banc puis correctif du déployeur (D-374 §1) ; en parallèle, D-373 §1 et journal du crochet (D-375 §1).

**Ouvert.** #1704 (D-370) et #1709 (D-370 à D-372) prennent les mêmes numéros : la dernière à merger renumérote.

## 2026-10-25 — t45 : fiches des acides gras au catalogue, migration (D-376)

**Fait.** Constat par conteneur (agrégats ; effectif : 1 dossier, répartition masquée (moins de cinq dossiers), D-298 §3) : libellés de 20 acides en %, l'indice oméga 3 et trois rapports sans unité, tous « inconnu » ; aucun acte V105. Le responsable a tranché par questions à options : 22 fiches (20 acides sous leur nom courant, LA/DGLA et oméga 6/oméga 3 en « ratio »), `saisie_praticien`, sans plage ni acte ; AA/EPA et LA/DGLA préparés par leurs opérandes au second lot (remarque CodeRabbit, D-087). Migration de données seule.

**Écarté.** La notation lipidique au libellé ; un panel dans ce lot (clinique : lot et décision à part) ; une composition d'oméga 6/oméga 3 (familles non imprimées).

**Prochaine action.** CI, CodeRabbit, merge, release-db, constat ; puis le second lot (compositions des deux rapports, libellés imprimés et noms usuels, re-signature).

**Ouvert.** La source des panels ; la liste des noms usuels.

## 2026-10-26 — Déployeur : la tête retenue jusqu'à l'application attestée (D-374 §1)

**Fait.** `retenue()` part du dernier commit de la ligne touchant un chemin de release-db et lit les runs créés depuis lui ; quatre états lus aux étapes du run, la fin rouge volontaire comptée « appliquée » (vérifié sur un run réel). Revue `wn-reviewer` : un run en exécution sur un ancêtre ayant déjà lu la tête est attendu (vingt minutes, délai du job 70 min). Banc : 67 cas, huit mutations attrapées. D-248 amendée, fiche H85.

**Écarté.** Journaux du run plutôt que ses étapes ; fenêtre aux cent derniers runs ; porteur limité aux migrations.

**Prochaine action.** CI, CodeRabbit, merge hors run release-db en vol, déploiement constaté ; puis D-373 §1 et D-375 §1.

**Ouvert.** Gel intégral jusqu'à la sonde (D-374 §4) ; retenue clinique étendue aux descendants, à confirmer.

## 2026-10-26 — File C : ba, « Validé par votre praticien le … » (D-369, H35)

**Fait.** Place 7 (ak) : la fenêtre du constat D-353 §5 n'est pas ouverte (du 1er au 7 novembre) ; relu par conteneur que le renvoi existe toujours sur le dossier de test (une assignation ouverte depuis le jour 0, agendas exclus, sans réponse depuis). Les activations restent tenues par la porte 18 jusqu'à ce constat. Lot de code de ba, hors file C : la route du protocole servi sert la date de l'approbation de diffusion de la version servie, la page la dit en tête, en toutes lettres, au jour civil de Paris ; sans drapeau ni migration.

**Écarté.** Un drapeau (D-369 n'en pose pas) ; l'emplacement dans le sous-titre (le but du protocole y reste).

**Prochaine action.** CI, CodeRabbit sur la tête, sonde release-db (gel de D-374 §5), merge, déploiement constaté, puis constat par lecture sur la page servie d'un dossier de test ; place 7 dans sa fenêtre.

**Ouvert.** D-369 §2 « aucun chiffre » lu comme « aucun score » : la date, imposée par §1, en porte.
## 2026-10-26 — File D : lettre cb, textes (a) et (e) de D-283 (D-377 à D-379)

**Fait.** #1707 mergée (ad, bc, ba). Troisième lot écrit sur arbitrages : cb (écran de fin du sommeil, « Merci d'avoir noté vos nuits », critère des illustrations), (a) (durées de conservation en lettres, archive dite avec sa réserve), (e) (phrase au médecin dans chaque lettre).

**Écarté.** Merci de chaque nuit dans cb ; jeu d'illustrations dans cb ; durées sans chiffre ; information à la première lettre seule (mémoire par médecin, migration).

**Prochaine action.** CI, CodeRabbit, merge, page D ; puis aw et texte d'az.

**Ouvert.** Lots de code de cb, (a) avec bg, (e) ; jeu d'illustrations.

## 2026-10-26 — r3_15 (F9a, H64) : radar des 12 besoins décoratif

**Fait.** Radar de l'onglet masqué au lecteur d'écran et hors tabulation (couche d'accessibilité de recharts coupée) ; graduations sans nombre, anneaux gardés. Table : légende sr-only, tiret lu « non mesuré » ; repli « Source — ensemble des valeurs du tableau » ; `role="status"` au chargement. Textes validés avant le code.

**Écarté.** Phrase d'état au-dessus du radar ; légende visible ; D-xxx (H64 et arbitrages du 2026-10-25 suffisent).

**Prochaine action.** CodeRabbit, merge, déploiement ; pages file A et Instruments (v12).

**Ouvert.** r3_12 (attend o) ; passe humaine E67 (file D).

## 2026-10-26 — File D : lettre az (D-380), fin de séance

**Fait.** #1709 mergée (cb, (a), (e)). Question 9 de la pièce du bilan hiérarchisé posée et tranchée (deux parties séparées) ; az écrite : notice « Pour préparer votre bilan », consignes sourcées seules.

**Écarté.** Consignes de tube et de transport sans claim ; toute famille proposée pour aw.

**Prochaine action.** CI, CodeRabbit, merge, page D ; séance close.

**Ouvert.** aw (familles de la main du responsable) ; lots de code des lettres de la séance.

## 2026-10-25 — J3-12h lot 4 : revue Codex reçue après le merge (D-362)

**Fait.** Codex BLOQUER sur #1701, mergée sans attendre la passe. P1-1 : accusé `courrier_complement` en 404 avant la session, drapeau fermé. P1-2 : fil relu et règle de version rejouée sous le verrou du patient ; la clé étrangère `protocol_drafts → patients` fait attendre toute version neuve (banc 55P03). Contre-épreuves rouges.

**Écarté.** P1-3 (retirer l’ingrédient du courrier) : texte validé par D-358 §1, l’ingrédient n’est ni population ni situation.

**Prochaine action.** T1, T3, PR, CodeRabbit, passe Codex de correction AVANT le merge.

**Ouvert.** P1-3 sur arbitrage seulement ; dettes de #1701.

## 2026-10-26 — t45, second lot : les acides gras au résolveur (D-381)

**Fait.** Migration de #1704 appliquée (release-db 40309999072) et constatée par conteneur. Vingt-deux libellés imprimés et trois sigles (EPA, DHA, DGLA) au résolveur ; re-signature sur l'instruction du responsable (205 entrées, SHA `8ede2a9e…`). AA/EPA et LA/DGLA préparés par leurs opérandes. Dette des bancs agenda inscrite au plan (#1712).

**Écarté.** « AA », « ALA », « acide linolénique » nu, noms sans suffixe, variantes des rapports.

**Prochaine action.** CI, CodeRabbit, merge, constat du déploiement.

**Ouvert.** L'entrée d'acides gras en panel ; le constat du prochain profil importé.

## 2026-10-26 — File D : lettre aw, cadre des familles (D-382)

**Fait.** Dossier de propositions sur les familles (Codex, hors dépôt) vérifié contre main : inventaire des quinze panels et des quinze règles exact ; trois décisions dites absentes, à tort (commit antérieur). Six arbitrages : famille = bloc hérité du panel, libellés gardés, deux blocs d'exclusion, exploration exigée et prudence seulement sourcée, empreinte au registre avec contrôle à ax, niveaux hors d'aw (lettre cr). Lettre validée telle quelle.

**Écarté.** Familles par axes (attendrait F53) ; regroupements de panels (packs sous un autre nom, D-296 §3) ; constat lexical du document patient (phrase « ni une ordonnance » voulue et testée).

**Prochaine action.** Dossier privé des quinze fiches, claims relus par conteneur.

**Ouvert.** Signatures des fiches ; re-signature de la table ; lettre cr.

## 2026-10-26 — J3-12h : courrier complément sans nom d'ingrédient (D-383)

**Fait.** #1708 mergée (d356e83a) après la passe Codex ACCEPTER et deux corrections CodeRabbit : corps de l'accusé borné à 64 Kio, lu en flux. P1-3 livré sur demande du responsable : chaque ligne du courrier est l'intitulé seul, doublons fusionnés ; D-383 amende D-358 §1.

**Prochaine action.** PR, CodeRabbit, passe Codex P0 AVANT le merge.

**Ouvert.** Dettes de #1701 ; drapeau éteint, conditions 2 à 4.

## 2026-10-26 — File D : lettres bb et y (D-384, D-385)

**Fait.** aw reprise par la session file B. bb : trois plans lus dans le détail du protocole, intitulés « Selon votre journée : », « Si tout va bien », « Au quotidien », « Si c'est plus dur » (validés mot pour mot) ; secours derrière « Jour difficile ? » ; plans idéal et secours sous la garde, versions antérieures en plan minimal seul. y : deux tableaux (prochaine étape, état du protocole), effectif affiché, masqué sous cinq, dossiers de test comptés. Renumérotées après D-383 (J3-12h).

**Écarté.** Intitulés en couleurs ; trois plans à l'accueil ; marque « dossier de test » (migration).

**Prochaine action.** Lots de code : file C pour bb, J3-cabinet (file A) pour y.

**Ouvert.** Comment le lot de bb reconnaît une version sous garde étendue.

## 2026-10-26 — File C : ba constatée sur la page servie (D-369, H35)

**Fait.** #1714 déployée. La mention s'est d'abord dérobée : la carte du dossier de test avait dérivé après J3-12g, page « pas consultable » (motif `carte_derivee` aux logs). Réapprobation par le responsable, puis lecture en ligne : « Validé par votre praticien le 26 octobre 2026 », en tête du bloc du protocole, date de la réapprobation relue en conteneur. H35 faite.

**Écarté.** Sortir le bloc du protocole du repli « Mon accompagnement » : mise en page hors de D-369, non demandée.

**Prochaine action.** Place 7 (ak) dans sa fenêtre, du 2026-11-01 au 2026-11-07.

**Ouvert.** Un second dossier de test attend sa réapprobation (D-359 §3).

## 2026-10-26 — Lot (e) de D-283 : l'information du médecin dans chaque lettre (D-377)

**Fait.** La phrase de D-377 entre dans les trois lettres au médecin (adressage, biologie, compléments), avant la formule de politesse, depuis une constante unique qui lit l'adresse des droits. Aussi : t45 trouvé déjà livré par sa session (#1716), page des instruments des 12 besoins close (v13), ligne t33 de la page file A remise à jour.

**Écarté.** La phrase juste avant la signature, après la politesse ; la constante dans `signature.ts`, atteint côté client.

**Prochaine action.** T3, CI, CodeRabbit, merge, release-db approuvée (chemin clinique), déploiement observé.

**Ouvert.** Code de (a) (D-378), lié à bg.
## 2026-10-26 — File C : bb, lot 1 — garde étendue aux plans idéal et de secours (D-386)

**Fait.** Question ouverte de D-384 tranchée par le responsable : la marque d'une version « sous garde étendue » est sa date de création, postérieure à la mise en service constatée de la garde (D-386). Lot 1 : la route d'enregistrement d'une version lit aussi les plans idéal et de secours (refus confirmable, jeton lié au texte) ; carte des gardes à jour ; trois cas de banc.

**Écarté.** Garde rejouée à la lecture (servirait les versions antérieures, contraire à D-384 §5) ; marque dans le contenu (champ de contrat) ; confirmation persistée (migration).

**Prochaine action.** Merge, déploiement constaté, instant relevé ; puis lot 2 sous drapeau éteint.

**Ouvert.** Nom du drapeau et forme du détail, au lot 2.

## 2026-10-26 — File D, lots de code : cb, écran de fin de l'agenda du sommeil (D-379, H39)

**Fait.** ba trouvée déjà livrée et constatée (#1714, #1722). Lot cb : l'écran de fin de l'agenda du sommeil dit « Merci d’avoir noté vos nuits 🌙 » et la phrase de D-379 §1, mot pour mot, le même pour tous, sans chiffre ; banc posé.

**Écarté.** (e) et bb dans cette séance : d'autres sessions les portent (arbitrage du responsable) ; toute illustration (cc).

**Prochaine action.** CI, CodeRabbit, merge ; puis bg + (a) (D-364 §4, D-378).

**Ouvert.** Constat par lecture sur un agenda transmis ; jeu d'illustrations de cc.

## 2026-10-27 — File A : t45, le profil érythrocytaire composé de ses vingt acides (D-387)

**Fait.** Reste « panels » de t45 tranché : aucun acide n'entre seul dans un panel ; le profil `BIO_AG_ERYTHROCYTAIRES` (quatre panels) est préparé comme un regroupement de ses vingt acides, passé en « regroupement » dans la liste NABM. Source : le compte rendu du laboratoire, qui les imprime sous « membrane Érythrocytaire » (D-376 §1 corrigé). V105 relue : aucun acte.

**Écarté.** Acides ajoutés aux panels (change les indications) ; type `groupe` (cotation fausse) ; rapports dans la composition ; une fiche d'un autre laboratoire (seize acides, non rattachée).

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; puis au praticien : vingt constats, composition, contrôle des rendus.

**Ouvert.** Constat au prochain profil importé.

## 2026-10-27 — File A : H86, consigne de libération et journal du crochet (D-373 §1, D-375 §1)

**Fait.** Consigne de D-373 §1 dans `CLAUDE.md` (§ Début de session, § PR, CI, merge). Journal des verdicts du crochet de fraîcheur : une ligne par verdict, sans contenu ni chemin, dans `.claude/logs/` de la copie principale ; écrit après le verdict, appels Git bornés à 2 s ; huit cas de banc. Revue `wn-reviewer` : ordre verdict-journal et worktrees imbriqués corrigés.

**Écarté.** Journal dans le dossier temporaire du marqueur (purgé) ; chemin de la cible dans la ligne ; entrée `.gitignore` dédiée (`*.log` couvre).

**Prochaine action.** CI, CodeRabbit, merge ; semaine de journal datée du merge ; PR de doc : mesure de référence, part release-db d'abord (débloque H88).

**Ouvert.** Sort du journal après H92 ; consigne à reprendre à l'ouverture de l'essai de l'intégrateur et à H88.
## 2026-10-27 — J3-12h : deux dettes de texte de #1701 (D-388)

**Fait.** P2-1 : le cockpit annonçait « Fiches remises » après un clic qui ne remettait qu'une lettre ou un courrier ; les cinq textes de `TEXTE_ANNONCE` disent « Documents remis ». Lettre d'adressage : « Remettez-le-lui », citation du cadrage corrigée avec une note datée. Textes validés par le responsable, épinglés au caractère près.

**Écarté.** Un texte par cas (fiche, un document, deux documents) : plus de logique pour un gain faible, puisque l'aperçu liste déjà les fiches.

**Prochaine action.** PR, CodeRabbit, passe Codex P0 AVANT le merge.

**Ouvert.** Drapeau éteint, conditions 2 à 4 ; (3) et (4) avant (2).

## 2026-10-27 — File D, lots de code : bg, « Vos données personnelles » v21 (D-364)

**Fait.** La v21 porte mot pour mot le texte ChatGPT de D-364 §4, placé dans « Qui peut accéder à vos données ? ». Accusé exigé. Les durées de D-378 sont retenues : sur la revue, le texte dit au présent une archive non en service et contredit la v20 sur les comptes rendus. Conditions v4 et e-mail @4, qui remplace la @3, jamais partie. Rubrique 6 : un second tableau, celui du destinataire hors application. Constat de J1-alim : 0 protocole diffusé sur 5 ne porte une Boussole.

**Écarté.** ChatGPT dans la liste des prestataires (ce n'en est pas un) ; deux e-mails (v3 puis v4).

**Prochaine action.** CI, CodeRabbit, merge ; puis J1-alim.

**Ouvert.** L'e-mail v4, geste du responsable ; la base légale du flux ChatGPT ; le texte amendé de D-378, puis la v22.

## 2026-10-27 — F34 : contre-revue Codex intégrée, exclusions amendées (D-389)

**Fait.** Dossier aw corrigé sur six constats Codex (rev 26) : reformulation retirée, précisions de libellé nommées, R6/R7 bornées. Second dossier Codex sur les deux exclusions, revérifié dans l'arbre : le motif est servi aussi dans la proposition de bilan (et la colonne « objectif » dit « verbatim ») ; la retenue release-db ne couvre pas la table signée ; l'empreinte ne porte que règles et grilles. Quatre arbitrages du responsable : lecture signée, seconde phrase d'E1 gardée, migration de correction, retenue étendue au fichier de la table. D-389 écrite.

**Écarté.** Statu quo (attribution fausse maintenue) ; claim mot pour mot à la place du motif (deux règles changées, banc rouge, F53 le refera) ; deux textes à l'écran ; retenue manuelle.

**Prochaine action.** CI, CodeRabbit, merge de D-389 ; doc aw mis à jour (E1, E2, R6, R7) ; puis lot retenue, lot écran, migration.

**Ouvert.** R1 à R5 ; signatures des quinze fiches (étape 2) ; re-signature (étape 3).
## 2026-10-27 — File D, lots de code : J1-alim, la Boussole quitte le portail (D-365, H16)

**Fait.** Constat préalable par conteneur, en agrégats : 0 protocole diffusé sur 5 ne porte une Boussole. Démontage côté portail : route patient, page de l'aliment, composants, montage dans l'accueil et la page alimentation ; la route du protocole ne sert plus aucune lecture. Contrats, code praticien, `lib/food-compass` et `WN_C5_ENABLED` en place.

**Écarté.** Supprimer les modules `lib/food-compass` devenus orphelins côté patient (hors D-365).

**Prochaine action.** CI, CodeRabbit, merge ; constat du retrait, puis D-C5-01 à 04 soldées.

**Ouvert.** Sort des modules orphelins, avec la suppression du code C5.

## 2026-10-27 — File D, lots de code : J3-cabinet planifié (D-385, H58)

**Fait.** Plan d'architecte : le moteur des statuts de phase sort dans un module pur partagé par la fiche et la page ; lectures groupées ; rejeu par dossier ; banc de parité ; trois PR sans migration. Quatre arbitrages du responsable : dossiers désactivés comptés ; « indéterminé » = échec ou phase nulle avec inconnu ; même effectif pour les deux tableaux ; l'écart des plus de 40 envois documenté.

**Écarté.** Un E2E de parité, illisible à trois fixtures, puisque la répartition y est masquée ; une extraction serveur sous `lib/clinical/`, qui déclencherait la release-db.

**Prochaine action.** Session dédiée : PR 1, l'extraction côté fiche.

**Ouvert.** Le texte d'attente de la page ; le constat du retrait de J1-alim, puis D-C5-01 à 04.

## 2026-10-27 — File D : retrait de la Boussole constaté, D-C5-01 à 04 soldées (D-365 §4)

**Fait.** J1-alim est en production par cf76ed14. La route patient de la Boussole et la page de l'aliment rendent 404, et leurs témoins répondent. D-C5-01 à 04 sont soldées sans objet au plan (H16, §8). La dette de la colonne « Patient » de la matrice est posée au §8.

**Écarté.** Mettre à jour `DETTE_C5.md` : le plan fait foi depuis le 2026-10-14.

**Prochaine action.** PR 1 de J3-cabinet, dans une session dédiée.

**Ouvert.** Les modules `lib/food-compass` orphelins côté patient ; D-C5-05.

## 2026-10-27 — File A : t45, rapport oméga 6 / oméga 3 et indice oméga 3 calculés de leurs acides (D-390)

**Fait.** Le rapport oméga 6 / oméga 3 sort des « opérandes absents » : calcul de ses sept acides, d’après les titres de section du compte rendu (arithmétique vérifiée au centième, valeurs non versées). L’indice oméga 3 devient le calcul de l’EPA et du DHA (claim SIIN WN-CL-0045-008), passé en « valeur calculée » dans la liste NABM. Sens du rapport fondé par les claims des voies de l’inflammation.

**Écarté.** Toute plage ou seuil (claims de seuil, référence du laboratoire) ; les sept et quatre acides d’un autre laboratoire.

**Prochaine action.** CI, CodeRabbit, merge, déploiement ; puis au praticien : constats des acides, compositions, contrôle des rendus.

**Ouvert.** Écart du seuil AA/EPA du corpus contre la référence imprimée.
## 2026-10-27 — File C : bb, lot 2 — les trois plans au portail, sous drapeau éteint (D-384, D-386)

**Fait.** Le détail du protocole lit les trois plans des actions fermes hors pause (« Selon votre journée : », « Si tout va bien », « Au quotidien », « Si c’est plus dur ») ; « Jour difficile ? » propose le plan de secours. Drapeau `WN_PORTAIL_TROIS_PLANS`, neuf et éteint ; marque = colonne `created_at` strictement après 2026-10-27T00:00:00Z ; servis hors de la vue signée. Nom, instant et forme écrits dans D-386 (lot 2). L'orientation vers le médecin (D-257) en est exclue, sur arbitrage du responsable.

**Écarté.** Les plans dans la vue signée (contrat inchangé) ; un chapeau unique pour toutes les actions (une action sans plans le contredirait).

**Prochaine action.** CI, CodeRabbit, merge, déploiement constaté ; activation en file C, porte 18.

**Ouvert.** Miroir praticien et version imprimable lisent encore le plan minimal seul.

## 2026-11-04 — Artefacts de suivi : files A à D et audits remis à jour

**Fait.** Les quatre pages de suivi des files (A, B = BioFlow, C, D) ont reçu les PR mergées du 1er au 4 novembre : statuts, dettes du §8, fiches H85 à H93 en file A, questions de la liste commune closes à leur merge. Audits republiés : drapeaux (suites, nouveaux drapeaux), e-mails patient (lots Q3 ter à quinquies, Q2 close), 12 besoins (§11, décisions D-402 à D-438), parcours réel (suite de QB, D-440). L'audit d58 était déjà à jour.

**Écarté.** Modifier le dépôt : tout vit hors dépôt, dans les bases et pages claude.ai.

**Prochaine action.** Reprendre ces pages après chaque série de merges.

**Ouvert.** D-403 §6 contre le §10.2 de l'audit des 12 besoins (recueil partiel du besoin 1) : à vérifier dans le code. Suivi automatique des pages non activable.
