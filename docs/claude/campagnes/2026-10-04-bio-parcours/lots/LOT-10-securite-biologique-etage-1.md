---
id: "LOT-10"
titre: "BP-10 — Sécurité biologique, étage 1"
statut: "à_faire"
dépend_de: "LOT-02, BIO-INGEST LOT-07"
---

# LOT-10 (BP-10) — Sécurité biologique, étage 1

## But

Fermer la dette présente du résultat préoccupant. Le marquage d'anomalie
imprimé par le laboratoire est restitué tel quel, et un acte de lecture
clinique tracé est exigé. Wellneuro ne lit aucune valeur.

## Résultat observable

Un import validé sans acte de lecture est signalé par une carte « geste »
destinée au praticien du dossier. Cette carte n'est pas acquittable par
simple lecture. Ce lot est la précondition de BIO-INGEST LOT-04.

## Périmètre

- Le marquage transcrit par BIO-INGEST LOT-07 est restitué tel quel.
- L'acte de lecture clinique est distinct de la validation d'import.
- La carte « geste » est un objet nouveau, distinct de `FilCardLecture`.
- Lettre et `medical_referral` passent par la chaîne D-218, D-257 et D-262.
- Levée et révocation se font en ajout seul ; la notification n'échoue
  jamais en silence.
- La surface dit qu'elle n'est pas un filet de sécurité.

## Hors périmètre

La cotation sur valeur (étage 2, étage assistant), toute lecture de valeur.

## Fichiers probables

- `web/prisma/migrations/` (migration seule, première PR)
- `web/src/lib/` (code consommateur, seconde PR)

## Interdits

- **Migration : confirmation distincte**, `release-db` approuvée, constat par
  conteneur, puis le code dans une seconde PR (`D-266` §11).
- Passe Codex obligatoire sur la migration.
- Registre RGPD et note patient mis à jour avant la table.
- Aucune lecture de valeur ; pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-02 (BP-02), BIO-INGEST LOT-07 ; `D-xxx` de sécurité biologique, qui
consigne aussi BP-10 → BIO-INGEST LOT-04.

## État des lieux du 2026-10-06 (avant la décision)

Lecture du dépôt, sans code. Les dépendances sont satisfaites : BP-02 est
terminé, et BIO-INGEST LOT-07 l'est aussi (procédé en production, désormais
`bio-extraction-v3`). Le contenu de BP-10 reste à décider : `D-266` ne le
détaille pas et dit seulement « précondition de LOT-04 ». Le cadrage v3
(`CADRAGE_BIO_PARCOURS_v3_2026-10-04.md`, lignes « Résultat préoccupant » et
« Constat biologique d'adressage ») en donne le contour.

**Ce qui existe.**
- Le Fil a onze types de cartes (`lib/fil/cartes.ts`). Une seule est
  acquittable par lecture : `geste_objectif` (`lectureCartes.ts`,
  `TYPES_ACQUITTABLES_PAR_LECTURE`). `biologie_arbitree` est déjà une carte
  non acquittable, avec deux sorties distinctes : un refus motivé
  (`FilCardRejection`) l'écarte, et une révision qui supplante la version
  arbitrée la **résout** (`arbitragesSansRevision`,
  `lib/fil/biologieArbitree.ts`). Ni l'une ni l'autre n'est un acquittement par
  lecture. Le Fil est « tiré à l'ouverture », sans canal sortant.
- Aucune carte, aucune route et aucune table ne couvre l'« import validé ».
  Après la validation (`import/decisions.ts`), les résultats ne se lisent que
  dans le cockpit (`EstimeMesurePanel`) : rien ne pousse le praticien. Aucun
  « acte de lecture » n'existe dans le code.
- La chaîne de la lettre (`D-218`, `D-257`, `D-262`) :
  `AdressageSignalAlerte` est en ajout seul, avec révocation motivée. Elle ne
  couvre que les constats d'anamnèse (`safety:anamnese:`). Un constat
  biologique demande donc de l'**étendre**, comme le dit le cadrage. `D-257`
  A7 (lettre consignée seule levée) reste intacte. La voie d'exception de
  `D-234` (route non gardée) est **maintenue par `D-265` §2-3**, avec la base
  déclarée le 2026-10-04 : ce n'est plus une qualification attendue.
- La notification de `lib/trust/notification.ts` échoue en silence (catch).
  C'est le patron que le cadrage désigne comme défaut.
- Le marquage imprimé (`marquage_lu`, `D-267`) vit sur la ligne lue et se
  restitue juxtaposé (`FaitsDuLaboratoire`), avec les silences de §5.

**Contradiction à trancher : le déclencheur.** Cette fiche dit « un import
validé sans acte de lecture est signalé », donc **tout** import validé. Le
cadrage dit « consomme le marquage transcrit » et prend l'exemple d'un
résultat marqué : ce serait **le marquage non nul**. Un déclencheur fondé sur
le marquage a trois angles morts :
- un marquage au-delà de sa borne reste `NULL` (§10) ;
- les lignes `bio-extraction-v1` restent `NULL` ;
- un marquage absent ne prouve pas l'absence d'anomalie (le qualitatif est
  écarté, `D-256` §3).

Wellneuro ne lit aucune valeur : il ne peut pas décider seul de ce qui est
« préoccupant ».

**Questions pour la décision de sécurité biologique** (aucun seuil, aucune
borne) :

1. **Déclencheur** : tout import validé, ou le marquage non nul ? Que
   deviennent les lignes v1 et les marquages non transcrits ?
2. **Acte de lecture** : qui le pose, et que signifie « tracé » ? Sa
   granularité : import, ligne ou dossier ? Avec quels motifs fermés ? Et
   qu'exige-t-il : bloquer un geste (diffusion, lettre) ou seulement signaler ?
3. **Objet de données** : étendre `AdressageSignalAlerte` ou créer une table
   distincte de `ArbitrageBiologique` (dont le contrat négatif refuse toute
   colonne valeur) ? Avec quelle clé, quelle unicité, quels états ?
4. **Carte** : un type neuf dans `TypeCarteFil`, ou le patron de
   `biologie_arbitree` (refus motivé) ? Qui est le « praticien du dossier » ?
   Que faire d'un dossier sans praticien ou en absence ?
5. **Notification « jamais silencieuse »** : par quel canal, puisque le Fil
   n'en a aucun de sortant ? Où un échec se voit-il ? Avec quelle relance ?
   Le vocabulaire est borné par `D-157` §3 : « déficit » et « carence » sont
   des mots de verdict.
6. **Lettre et `medical_referral`** pour un constat biologique : quel
   déclencheur ? Avec quel rôle de `D-257` A7 ? Et quelle place pour la voie
   d'exception de `D-234`, maintenue par `D-265` ?
7. **Levée et révocation** : motif obligatoire, effet sur la carte, nouvel
   épisode (patron `D-257` §4 et §6).
8. **Drapeau** (né avec le code ; éteint = comportement actuel), constat
   d'usage (`D-266` §12), banc « import validé sans lecture → signalé »,
   contrat SQL négatif.
9. **Consigner** « BP-10 précède BIO-INGEST LOT-04 » dans la décision : le
   cadrage le dit fragile tant qu'il n'est écrit que dans une fiche.

**Avant la table** : le registre RGPD (§2 ter, table des données de santé,
rubrique 8, effacement IDP2, RLS deny-all), puis une version TRUST si la note
patient change. La mention « ni service d'urgence, ni surveillance continue »
existe déjà dans `trust/contenus/registre.ts` ; aucune surface praticien ne dit
encore « pas un filet de sécurité ».

## Étapes

- [x] État des lieux et questions (2026-10-06, ci-dessus).
- [ ] Arbitrages du responsable sur les neuf questions.
- [ ] Rédiger la décision de sécurité biologique.
- [ ] Livrer la migration seule et la faire appliquer par `release-db`.
- [ ] Livrer le code consommateur derrière un drapeau né avec lui.

## Tests

T3 ; banc « import validé sans lecture → signalé » ; contrat SQL négatif.

## Critères de done

`release-db` constatée ; le banc mord ; la précondition de LOT-04 est
consignée.

## Résultats

À compléter à la clôture.
