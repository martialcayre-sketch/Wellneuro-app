# Handoff — 2026-09-12 — Le bloc se ferme, et le patient garde une porte (D-170)

## Branche et état Git

Six PR fusionnées : **#1021** (table `demandes_correction_objectif` — migration
seule), **#1022** (la dérivation `demandesEnAttente`), **#1023** (route du
portail : le quatrième verbe et le verrou), **#1024** (écran patient : le bloc
qui se ferme), **#1025** (cockpit : la réponse en tête de carte), **#1026**
(bandeau de fiche et rail).

**Une PR ouverte** : la doctrine (`D-170`, fragment de changelog, SESSION_LOG,
ce handoff).

`main` **local** reste détenu par le worktree `courrier-corps-null`, verrouillé
par une session Claude vivante. `gh pr merge --delete-branch` affiche donc une
erreur de checkout après chaque fusion — **cosmétique** : le merge passe et la
branche distante est supprimée. Rien n'a été forcé.

## Migration

`20260911200000_alliance_demande_correction_objectif_v1`, partie **seule**
(`D-087`), `release-db` approuvée (run 34644930583, SHA `492e55b2`) et
**CONSTATÉE PAR CONTENEUR** : appliquée en une tentative sans échec, cinq
colonnes exactes avec `texte` NULLABLE, trois CHECK, FK `suppr=r` vers
`patients`, RLS active sans policy, zéro ligne.

## Ce qui a décidé le chantier

Une **mesure**, pas une intuition. PAT006 portait, le 2026-09-11 à 18:14, **deux
ratifications identiques sur le même objectif, à dix secondes d'écart** (lu par
`scalingo run -d`, par identifiant). Un patient qui a répondu « c'est bien ça »,
n'a rien vu changer d'assez net, et a recommencé.

Et une impression corrigée : « je ne retrouve nulle part dans l'espace praticien
la validation de l'objectif ». Elle y était — en suffixe de « Enregistré le … »,
en 12 px, sous le bloc d'anamnèse.

## Les quatre arbitrages du responsable

1. **Fermer le bloc entièrement** (plutôt que refuser le geste identique).
2. **Après « c'est bien ça » seulement** — contester et « le dire autrement »
   gardent leur bloc ouvert.
3. **Un quatrième verbe**, avec un texte **facultatif**.
4. **Une reformulation le referme** — aucun geste explicite de classement.

## Ce qui tient, et pourquoi

- **La clôture est DÉRIVÉE.** Aucune colonne `statut`/`close_le`/`traitee_par` :
  une demande attend tant que l'objectif visé est une **tête active**. Un statut
  se coche sans rien faire ; une reformulation ne se simule pas. Le contrat
  négatif garde cette absence par liste blanche de colonnes.
- **Le verrou serveur ne refuse aucune parole neuve** — seulement `ratifie`
  quand le dernier geste est déjà `ratifie`. `etatRatification` lit les deux
  tables : ratifier après un amendement reste possible.
- **Aucun décompte, nulle part.** Deux gardes anti-agrégat interdisent
  `demandesCorrection.length`, et une mutation le prouve.

## L'homonyme, et c'est une DETTE

`Assignation.correction_commentaire` s'appelle aussi « demande de correction »,
mais vise les **réponses de questionnaire** et se règle par un **déblocage**, en
phase Patient. La nouvelle vise le **texte de l'objectif** et se règle par une
**reformulation**, en phase Compréhension. Le suffixe `_objectif` doit rester
dans tous les libellés praticien et dans le nom de table. **Ce n'est pas une
solution** : le jour où l'un des deux objets se renomme, la dette se referme.

## Trouvé en chemin

- **`etat-phase` n'avait AUCUN banc** — la route qui nourrit le feu du rail.
  Révélé par une mutation survivante. Neuf bancs l'ouvrent.
- **`nettoyerDossierDeuxVoix` ignorait la table neuve.** Le patient de fixture
  est partagé entre les deux projets Playwright, l'objectif non : la demande du
  run Chromium s'ajoutait à celle de WebKit.
- **Le mock du journal d'accès était incomplet** (`deleteMany`) : la trace
  `G-TRUST-04` tombait dans son propre `catch`.

## Preuve

**49 mutations jouées, 49 mutants tués.** Quatre survivants départagés : deux
bancs faibles, un banc absent, une mutation qui ne s'appliquait pas.

Un banc E2E **réécrit et non supprimé** — « CHANGER D'AVIS AJOUTE UNE LIGNE »
cliquait un chemin que l'écran n'offre plus. Il couvre désormais davantage : la
disparition des trois verbes dans un vrai navigateur, la demande sans texte qui
vaut `null` et non `''` en base, et le verrou opposé à un onglet périmé.

T1 vert à chaque lot. T2/T3 verts, hors `D-049` (WebKit iPhone 13 sur macOS,
« AUCUNE requête de page émise » — le même test passe en 112 ms sur Chromium).

## Ce qui reste ouvert

1. **La branche « demande » est inéprouvable contre des données réelles** : la
   table est née vide. Les bancs la couvrent contre une base jetable, pas contre
   un dossier vécu.
2. **Rien ne relance le praticien** dont une demande reste sans suite. Le rail la
   signale, aucune échéance ne la porte — poser un délai aurait demandé un seuil
   que personne n'a arbitré.
3. **La mise en service côté patient reste à demander.** Le code se livre ; son
   activation ne se décide pas ici.
4. Hors chantier : la lettre de DPA à Anthropic et les trois trous du §7 RGPD.
