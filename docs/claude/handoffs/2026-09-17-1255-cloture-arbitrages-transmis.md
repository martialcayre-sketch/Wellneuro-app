# Handoff — 2026-09-17 — Clôture : six arbitrages rendus, un périmètre transmis à une session parallèle

Séance courte et sans code. Le responsable a demandé qu'on lui **pose les questions
pour finir de trancher** la campagne « ouverture du rayon Correspondance », close la
veille à sept lots. Sept questions posées en deux tours, **six tranchées, une rendue à
une autre session**. Puis : « on laisse tout ceci à l'autre session, on clôture ici ».

## Branche et état Git

`main-local`, arbre propre au départ. **Aucun code.** Quatre fichiers de
documentation, aucun fichier TRUST, aucune décision neuve au registre.

## Ce qui a été tranché, et par qui

Le responsable, en session, sur des questions à options. Rien n'est déduit.

1. **La promesse patient — « le refus bloque, sans exception ».** Les huit versions
   publiées de `donnees_confidentialite` promettent « aucun partage avec un tiers …
   sans un choix explicite de votre part » et le logiciel ne tient pas la phrase.
   Trois voies étaient offertes : le logiciel vient à la promesse, la promesse vient
   au logiciel, ou rien. **C'est le logiciel qui vient à la promesse.** La voie
   « corriger le texte à la baisse » est écartée pour la **seconde fois** — elle
   l'avait déjà été en revue du LOT-05b, avec la ligne que le responsable avait
   formulée lui-même : *on corrige un fait faux sur l'état du produit, on ne dégrade
   pas une promesse faite au patient*.
2. **Le silence du patient bloque aussi.** `statutPartageMedecinTraitant` rend `null`
   quand le patient n'est jamais allé au centre TRUST ; ce `null` vaut **fermé**,
   lecture littérale de « sans un choix explicite ». **Avec sa contrepartie, qui fait
   partie de l'arbitrage** : l'écran praticien doit dire « consentement jamais
   exprimé » et donner le chemin pour le recueillir. Le blocage est une porte, pas un
   mur. **Dimensionnement à surveiller** : presque aucun patient n'a visité le centre
   TRUST — une garde fail-closed ferme donc beaucoup.
3. **La traçabilité de la formulation des finalités — versionner, sans champ
   nouveau.** « Mes choix » reçoit son propre document TRUST versionné. L'**empreinte
   du texte dans l'événement** est écartée en connaissance de son coût : elle
   demandait une colonne sur `trust_choice_events`, donc une migration et une
   release-db.
4. **L'unique ligne du fil était un essai.** Réserve dure du LOT-06 levée — non par
   une requête, par une déclaration : la consignation du 2026-09-15 à 23 h 11 est un
   essai du responsable. Donc le courrier de biologie **n'a jamais servi en
   consultation**, et le chiffre réel des deux écrivains est **zéro usage clinique**.
5. **Le geste de transcription ne convient pas au praticien** — et deux frictions
   sont nommées, deux seulement : le **nom du médecin à ressaisir** quand le dossier
   porte déjà `medecinTraitantNom` et `medecinTraitantCoordonnees`, et **le mauvais
   endroit** (un onglet de fiche à aller chercher après coup, au lieu d'une porte au
   moment de l'acte). **Écartées explicitement** : raccourcir la saisie, et remplacer
   la transcription par des générateurs. Le geste reste.
6. **Le périmètre TRUST passe à une session parallèle**, en entier.

## Ce qui N'A PAS été tranché, et qui commande une phrase publiée

**Le destinataire.** Le courrier de biologie va au **médecin traitant** — la finalité
exacte du consentement. La lettre d'adressage est un **renvoi sur signal d'alerte**,
potentiellement vers un autre médecin : lui opposer un refus qui ne porte que sur le
médecin traitant sur-appliquerait le consentement, sur les dossiers précisément où la
décision est déjà suspendue. La synthèse proposée — bloquer le premier, laisser passer
le second, et ne nommer que **cette** exception dans la version publiée — n'a pas été
retenue ni rejetée : elle a été **transmise**. Elle commande la phrase même de
l'exception publiée à des patients, donc elle se pose **avant** d'écrire.

## Collision de sessions, et ce qui a été évité

Une session parallèle avait reçu du responsable un périmètre **identique** sur ses
quatre premiers points, et partait écrire l'**inverse** : une `donnees_confidentialite`
v9 nommant une exception, une `consentement_suivi` v3, la réécriture de `effetRefus`,
et une colonne dédiée sur `trust_choice_events` avec release-db du jour. Elle a
demandé avant d'écrire une ligne, et a été prévenue à temps. Deux échanges lui ont
transmis les six arbitrages, la question ouverte, et deux rappels fermes : **pas de
colonne**, et **[[D-219]] §3 s'amende, ne se contourne pas** — son motif ne vise que
la **consignation**, qui ne doit pas se fermer sous peine de rendre le dossier aveugle
sur un partage qui a eu lieu quand même.

## Une quasi-avarie de production, constatée et sans suite

Deux builds Scalingo ont couru en parallèle ce matin. `0891bea8` (D-217, **neuf commits
en arrière**, poussé par une autre session) démarre à 06:02:32 pour 5 m 04 ; la tête
réelle `3f28eab3` démarre à 06:03:30 pour 5 m 03. **Le retardataire a fini le premier,
la tête a fini en dernier** — et c'est l'ordre de fin qui décide. Le risque n'était pas
théorique : `0891bea8` est **antérieur** à `6e19f494` ([[D-218]]), donc s'il avait
gagné, **la route d'adressage disparaissait de la production pendant que
`WN_ADRESSAGE_COURRIER` restait posé** — un drapeau devant du code absent, qui n'ouvre
rien et ne se voit pas. Constaté par **sonde**, pas par horodatage : `POST
/api/praticien/adressage/courrier` avec un corps illisible rend **400**, donc la route
existe et le drapeau est ouvert. Aucun redéploiement n'a été fait : il aurait été un
no-op au mieux.

## Fichiers modifiés

- `docs/claude/campagnes/MESURE_RAYON_CORRESPONDANCE_2026-09-17.md` — la réserve dure
  devient un constat tranché, et gagne la consigne pour la prochaine mesure :
  **marquer les essais, ou accepter de ne pas savoir**.
- `changelog.d/2026-09-17-mesure-lue.md` — même levée, dans l'entrée de journal.
- `docs/claude/campagnes/FILE_ATTENTE.md` — les deux entrées TRUST portent leur
  arbitrage et l'adresse de son exécution ; une entrée neuve pour la refonte du geste
  de transcription, avec ses deux frictions et ses deux voies écartées.
- `docs/claude/handoffs/2026-09-17-1255-cloture-arbitrages-transmis.md` — ce fichier.

## Ce qui reste ouvert

- **La question du destinataire**, à poser par la session qui exécute.
- **Les restes techniques de la campagne**, inchangés : migration `supersedes_*`,
  journalisation de `/recentes`, banc de la pastille du `SidebarRail`, garde de
  navigation mobile, et **aucun E2E ne couvre le geste d'adressage** — il lui faut son
  propre dossier de fixture.
- **`safetySignalsV1` reste absente de `SOURCES_DE_SAVOIR`**, donc invisible à
  l'audit de consommation.
- **La mesure de la lettre d'adressage** : zéro appel, et c'est attendu — le drapeau
  n'est posé que depuis ce matin. Le premier chiffre utile se lira après un délai
  d'usage.
