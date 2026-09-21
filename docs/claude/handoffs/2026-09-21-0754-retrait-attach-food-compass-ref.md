# Handoff — 2026-09-21 — B1 tranché, `attachFoodCompassRef` retirée (D-239)

## 1. Branche et état Git

`wn-lot01-retrait-attach-food-ref-2026-09-21`, partie de `origin/main` à
`de290fd7`. Aucune migration, aucun `schema.prisma`, aucun drapeau.

## 2. Objectif de la session

Trancher **B1** — le dernier arbitrage devant LOT-01, donc devant LOT-02, donc
devant le geste qui manque à la carte des assiettes indiquées.

## 3. Ce que le lot livre

Le retrait d'`attachFoodCompassRef` du module de production, la bascule de ses
deux usages de SETUP vers une fixture locale explicitement non gardienne, le
retrait des seules assertions qui visaient ses gardes propres, et la
consignation de l'arbitrage — registre, fragment, cadrage.

## 4. LE FAIT QUI COMMANDE LE LOT

**L'arbitrage a été demandé par l'usage, pas par le calendrier.** Le drapeau
`WN_ASSIETTES_INDIQUEES`, posé le 2026-09-20 à 08:11 UTC, a été **CONSTATÉ le
2026-09-21** : le journal d'accès porte `/api/praticien/assiettes-indiquees`,
**cinq lectures sur deux dossiers**, dernière à 05:38:12 UTC. Au premier usage,
le responsable a formulé le manque depuis l'écran — ni sélection, ni validation.
Conforme à [[D-237]] §7, qui s'interdit tout geste ; mais le manque a désormais
une **date de demande**.

## 5. Décisions prises

[[D-239]]. Le point qui commande : **la prémisse du cadrage était inexacte et
l'arbitrage survit à sa correction**. `attachFoodCompassRef` était morte ; le
champ qu'elle posait ne l'est pas. Ce qui la rend supprimable n'est donc pas
l'abandon de la référence d'aliment — elle est en service sur la voie patient —
mais le fait que la route des versions **re-dérive** la référence au lieu de la
valider. La fonction retirée était la **copie faible d'un invariant tenu deux
fois**.

## 6. Fichiers

**SIX EN TOUT — DEUX NEUFS, QUATRE MODIFIÉS**, énumérés depuis l'index avant le
commit, puis comptés. (Procédé retenu après quatre comptes faux dans la lignée
précédente : énumérer d'abord, compter ensuite, relire l'index et non sa
mémoire.)

**DEUX NEUFS** — `changelog.d/2026-09-21-retrait-attach-food-compass-ref.md` ·
ce handoff.

**QUATRE MODIFIÉS** — `web/src/lib/food-compass/protocol.ts` (la fonction sort,
son import de type orphelin aussi) · `web/src/lib/food-compass/foodCompass.test.ts`
(fixture locale, assertions de la fonction retirée excisées, deux imports
ajoutés) · `docs/DECISIONS.md` · `docs/claude/campagnes/CADRAGE_BOUSSOLE_ASSIETTE_2026-09-16.md`
(B1 rejoint B2 parmi les tranchés, avec la correction de prémisse).

## 7. Validations exécutées

- **T1 vert**, `T1-EXIT=0` lu dans le fichier redirigé.
- **T3 complet vert**, `T3-EXIT=0` lu dans le fichier — 587 fichiers, 24, build,
  205 E2E.
- **Vérifié AVANT de supprimer, et c'est ce qui a changé la décision** : quatre
  lectures sur pièce — les appelants de la fonction (aucun hors banc), les
  écrivains du champ (`ProtocolMiniBuilder`), ses lecteurs (voie patient), et
  les gardes de la route des versions. Sans la troisième, le lot enterrait une
  fonctionnalité en service.
- **Aucune mutation n'est rapportée, et c'est volontaire** : ce lot RETIRE du
  code sans consommateur ; il n'introduit aucun invariant neuf à éprouver. Les
  35 cas de `food-compass` restent verts, et ceux qui comptent — gardes de
  `reconstructProtocolDraft`, relecture, caducité d'approbation — ont gardé leur
  objet avec une fixture à la place de la fonction.

## 8. Ce que le lot a trouvé au passage

**LE BANC LE PLUS FOURNI COUVRAIT LE CHEMIN MORT.** `foodCompass.test.ts`
consacrait un cas entier aux gardes d'une fonction sans appelant, pendant que le
constructeur VIVANT (`buildFoodCompassProtocolV2FromSource`, appelé en
`versions/route.ts:472`) est éprouvé plus discrètement, par
`patientReference.test.ts`. Un banc volumineux n'est pas une preuve de
couverture : il peut être le monument d'un chemin que personne n'emprunte.

## 9. Problèmes ouverts

- **LOT-02 est débloqué mais non ouvert** : l'assiette n'est toujours pas
  sélectionnable. C'est le geste demandé depuis l'écran ce matin.
- **B3 et B4 restent ouverts** — familles d'équivalence (donc le secours d'une
  assiette), et atteignabilité de la Boussole patient.
- **Le motif affiché porte des identifiants bruts** (« `Q_INF_03 (DA) : score
  11 >= 10` »). Un libellé clinique en français serait un champ neuf **dans le
  périmètre haché**, donc une re-signature : hors de portée d'un lot courant,
  nommé ici pour ne pas être redécouvert.
- **Le défaut de `mentionne()`** dans la matrice de consommation (rapprochement
  par sous-chaîne) reste ouvert depuis [[D-238]].

## 10. Prochaine action exacte

1. PR avec `--body-file`, CI par `node scripts/wn-attendre-ci.mjs <N>` en un seul
   appel bloquant — et relire l'exit dans le fichier : il a rendu `2` puis `4`
   sur le lot précédent, jamais lus dans la notification.
2. **Demander la relecture Copilot** après le push : elle ne se relance pas
   seule. Lire aux TROIS emplacements.
3. Merge `--squash` **avec `--subject`**, après vérification que `D-239` est
   toujours libre — deux PR de documentation sont ouvertes (#1205, #1206).

## 11. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Base de production en lecture seule par conteneur ; écriture par migration
  relue puis release-db approuvée. **Ce lot n'écrit rien.**
- Aucun contenu clinique du corpus au dépôt.
- **Aucun seuil, aucune règle, aucune table signée touchés.**
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
