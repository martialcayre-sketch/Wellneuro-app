# Gouvernance questionnaires et scoring

Date de création : 2026-07-06.

Ce document fixe les règles applicables à toute modification de questionnaire, d'option, de conditionnel, de moteur de scoring, de seuil ou d'interprétation clinique.

## Source de vérité

- La source fonctionnelle Wellneuro par défaut est le dossier Google Drive `QUESTIONNAIRES MD`.
- Une version officielle externe ne remplace pas le MD Drive sans validation clinique explicite.
- Une incohérence présente dans un MD Drive doit être documentée comme ambiguïté ; elle ne doit pas être corrigée silencieusement.
- Les fichiers `00_index_*` et les doublons Drive ne créent pas automatiquement de questionnaire applicatif.

## Règle de changement clinique

Toute modification clinique doit mettre à jour les trois traces suivantes dans la même passe :

1. `CHANGELOG.md` : nature clinique du changement et impact potentiel.
2. `docs/questionnaires-drive-mapping.md` : statut items/options/conditionnels/scoring/interprétation/tests.
3. `scripts/check_questionnaire_certification.js` : fixture si le statut `Tests` passe à `certifié`.

Une modification clinique est notamment :

- ajout, suppression, renommage ou réordonnancement d'item ;
- changement d'option, valeur numérique ou conditionnel ;
- changement de seuil, moteur de scoring ou interprétation ;
- changement de source de vérité ou de statut de certification.

## Statuts de certification

- `certifié` : vérifié contre le MD Drive et couvert par fixture automatisée quand le scoring est concerné.
- `mappé` : source MD identifiée mais audit détaillé ou fixture à poursuivre.
- `ambigu` : source Drive conservée mais incohérente ou incomplète.
- `historique` : conservé pour compatibilité sans source Drive certifiée.
- `doublon` : source ou questionnaire fonctionnellement doublonné, sans création automatique.
- `absent Drive` : aucun MD équivalent identifié.

## Ce que la certification ne dit pas

`scoring_verifie` atteste que le calcul correspond à la forme publiée de l'instrument, et rien de plus. Ce n'est pas un jugement sur l'instrument.

La validité psychométrique des instruments servis n'a jamais été évaluée. Au 2026-08-04, `cosmin` vaut `inconnu` sur les 65 entrées du registre.

`measurement_evidence.json` est la seule pièce qui pourrait la porter. Au 2026-08-04 il contient 3 lignes, toutes sur `Q_PED_01`, aucune ne portant d'appréciation COSMIN.

La complétude bibliographique est un troisième axe, distinct des deux précédents — et `statutBibliographique` s'y lit avec la même prudence. Au 2026-09-14, sur les 65 entrées : 43 portent `reference_identifiee`, 12 `referentiel_interne_siin`, 10 `a_completer`, chacune de ces dix avec un constat de recherche écrit dans `motifBibliographique`. Deux de ces dix ne fermeront jamais — `Q_SOM_09` et `Q_ALI_09` sont des instruments créés par WellNeuro, sans publication d'origine à retrouver. Le compteur de `check_questionnaire_certification.js` imprime ce sous-compte à part, dérivé de `versionServie.statutContenu`.

Mais `reference_identifiee` n'exige qu'**un** champ d'identification non vide — un nom d'auteur suffit. **37 entrées seulement** (`Q_CAN_01`, `Q_CAN_02`, `Q_FIB_01`, `Q_FIB_02`, `Q_GAS_02`, `Q_GAS_03`, `Q_GEO_01`, `Q_GEO_02`, `Q_GEO_03`, `Q_GEO_04`, `Q_GEO_05`, `Q_GEO_06`, `Q_INF_04`, `Q_NEU_01`, `Q_NEU_02`, `Q_NEU_04`, `Q_NEU_05`, `Q_NEU_07`, `Q_NEU_09`, `Q_NEU_11`, `Q_PED_01`, `Q_PNE_01`, `Q_SOM_01`, `Q_SOM_02`, `Q_SOM_03`, `Q_SOM_04`, `Q_SOM_05`, `Q_SOM_06`, `Q_SOM_07`, `Q_STR_02`, `Q_STR_04`, `Q_STR_05`, `Q_STR_06`, `Q_STR_08`, `Q_TAB_02`, `Q_TAB_05`, `Q_URO_01`) portent un identifiant vérifiable, DOI ou PMID, dans `references`. L'étiquette dit que la référence est désignable ; elle ne dit pas qu'elle a été retrouvée.

Elles étaient **deux** jusqu'au 2026-09-14, et les dix qui s'ajoutent ne sont pas un lot arbitraire : ce sont les instruments dont les grilles d'interprétation venaient d'entrer dans un périmètre de signature ([[D-182]]) et d'être relues à ce titre. Vérifier la bibliographie de ce qu'on vient de signer est le seul ordre qui se défende. Les identifiants ont été relevés par interrogation directe de PubMed, article par article, puis validés par le praticien — `verifiePar` porte la méthode, pas une étiquette.

Deux d'entre elles méritent d'être lues avant d'être crues. `Q_SOM_06` portait DÉJÀ ce PMID, sous une notice « non contre-vérifiée par le praticien » : la recherche l'a retrouvé indépendamment, ce qui la corrobore au lieu de l'écraser. Et `Q_STR_02` est le cas que ce document existe pour décrire — le PMID désigne le PSS à 14 items de 1983, tandis que la forme SERVIE est le PSS-10 de Cohen & Williamson (1988), chapitre d'ouvrage non indexé et sans DOI. **Aucun identifiant ne désigne la forme servie** ; celui-là désigne sa source directe, et `references.verifiePar` le dit en toutes lettres plutôt que de laisser l'identifiant faire croire le contraire.

**Elles sont passées de douze à trente-sept le 2026-09-16, et le motif du lot compte autant que le nombre.** Trente et une entrées déclaraient `reference_identifiee` — donc « une référence est identifiée » — sans porter le moindre identifiant vérifiable : la contradiction était dans le registre, pas dans les instruments. La passe a interrogé Crossref puis PubMed, et chaque DOI retenu a été **recroisé indépendamment sur PubMed** par son identifiant d'article. Ce recroisement n'était pas une formalité : il a écarté un DOI de même revue et de même année que celui attendu pour le HIT-6, mais dont le premier auteur était Bjorner et non Kosinski — l'article de calibration du HIT, et non celui qui développe le HIT-6. La seule lecture du titre ne l'aurait pas vu.

**Trois entrées ressortent de cette passe sans identifiant, et c'est un résultat, pas un échec** — il est écrit dans leur `verifiePar`. `Q_NEU_08` (ECAB) n'est indexée nulle part. `Q_NEU_10` (IAT) l'est moins encore qu'il n'y paraît : l'article de Young de 1998 que les bases proposent existe bien, mais il présente un questionnaire diagnostique à 8 items, pas l'IAT à 20 items ni ses bandes — l'attacher aurait fabriqué une provenance juste d'apparence. Et `Q_PED_03` (Conners 3) tranche la question par la négative : c'est un test édité commercialement, sans article de développement. **Il n'existe aucune publication à laquelle sa version servie pourrait être déclarée conforme** ; la conformité, pour cet instrument, ne s'établit que contre le manuel de l'éditeur, sous licence.

**Ce que ces trente-sept identifiants n'établissent pas** doit se lire avec la même netteté, et chaque `verifiePar` le porte : un identifiant rend une revendication de conformité **vérifiable** — elle désigne désormais un document que quiconque peut ouvrir — il ne la **vérifie** pas. Aucun texte intégral n'a été lu, et aucun barème servi n'a été confronté à sa publication. C'est la doctrine que `Q_GEO_06` portait déjà seule, et qui vaut maintenant pour vingt-cinq entrées de plus. Ces identifiants ont été relevés par recherche outillée et **ne sont pas contre-vérifiés par le praticien**, à la différence des douze du 2026-09-14 : `verifiePar` le dit dans chaque entrée plutôt que de laisser la date faire croire le contraire.

`Q_ALI_03` en est le contre-exemple utile : la publication d'origine a bien été retrouvée le 2026-08-04 (Monnier L. et al., 2001), et elle n'est délibérément **pas** portée en `references`. La publication décrit une enquête en 8 questions ; le questionnaire servi en compte 23, avec trois écarts à la source, et le code le déclare débaptisé. Attacher l'identifiant reviendrait à faire certifier par un PMID une forme qu'il ne certifie pas. Le lien est documentaire — il vit dans `motifBibliographique`, et l'entrée reste `a_completer`.

## Sortie de scoring

Les nouveaux moteurs doivent retourner une forme compatible avec `ScoreResultBase` :

- `total` et `maxTotal` quand un score principal existe ;
- `subScores` quand le résultat est multidimensionnel ;
- `missing`, `missingIds` et `notApplicable` quand utile ;
- `note` pour toute ambiguïté source ou règle clinique non automatisée ;
- `certification` pour les scores certifiés ou ambigus Drive.

Les questionnaires normatifs sans tables validées ne doivent pas automatiser de T-score ou percentile. Ils peuvent retourner une somme brute documentée.

## Contrôles obligatoires

Avant de considérer une passe clinique terminée :

```bash
cd web && npm run type-check
cd web && npm run scoring-check
bash scripts/check_no_secrets.sh
```

`npm run scoring-check` doit rester strict : couverture de la matrice, statuts autorisés, types de scoring connus, absence de `NaN`/`Infinity`, fixtures des questionnaires certifiés.

Si `check_no_secrets.sh` échoue sur un fichier local ignoré, signaler le fichier sans affaiblir le script et sans exposer le secret dans les journaux ou commits. Le script s'y tient de lui-même depuis le 2026-07-27 : il ne rend que `fichier:ligne`, jamais la ligne trouvée.

Distinguer les deux échecs : **1** signifie « un secret a été détecté », **2** signifie « je n'ai pas pu vérifier » (index illisible, `git` en panne) — et appelle un diagnostic d'outillage, pas la recherche d'un secret. Seul le mode `--staged` peut rendre 2.
