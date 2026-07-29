### Certification des instruments — montée jusqu'à `scoring_verifie`

- **10 instruments montent à `scoring_verifie`**, cinquième barreau sur huit, et 49
  autres sortent du premier. Au matin du 2026-07-29, aucun des 64 n'avait dépassé le
  deuxième (60 `repere`, 4 `source_obtenue`). Aucun n'atteint `publie` : le libellé
  « Validé pour l'usage WellNeuro » n'est accordé à personne.
- **55 instruments rattachés à leurs sources** — les liens qui n'existaient qu'en texte
  libre dans le champ `comment` du registre des sources sont devenus des `sourceIds`
  contrôlés par le CI. 62 entrées sur 64 ont désormais une source au dossier. C'est ce
  rattachement, et non la déclaration de droits, qui a débloqué les 10.
- **La déclaration de droits du 2026-07-29 ne dégage aucun instrument de plus.** Elle
  porte sur les supports de cours du SIIN ; les 13 instruments du référentiel SIIN
  avaient déjà été tranchés le 2026-07-25 ; et aucun des 43 restants n'en relève — ce
  sont des échelles tierces que ces supports reproduisent. La déclaration est
  enregistrée dans chacune de ces entrées, avec la réserve qui dit qu'elle ne les
  dégage pas. **Huit passent à `licence_requise`**, le registre nommant déjà un ayant
  droit qui exige une licence (GL Assessment, MHS, PAR, QualityMetric, EORTC,
  M. W. Johns).
- **Sept entrées redescendent à `a_verifier`** : elles portaient `permission_obtenue`
  alors que leur propre `droits.detail` constate qu'« aucune autorisation n'a été
  sollicitée ni obtenue ». BDI-13 montait à `scoring_verifie` sur cette étiquette. Les
  mentions de droits antérieures sont toutes préservées.
- **Contenu servi établi sur pièce**, par six lecteurs puis six réfuteurs chargés de
  casser leurs verdicts — 11 propositions sur 54 corrigées. 11 instruments ont des
  droits assez dégagés pour que leur contenu soit verrouillé, et **aucun n'est
  `verbatim`** : aucun ne reproduit une forme publiée à l'identique.
- **`Q_SOM_07` et `Q_FIB_03` passent à `suspendu`.** Ils sont `actif: false` en
  production et gravissaient pourtant l'échelle — l'état terminal prévu pour cela
  n'était utilisé nulle part.
- **Le verdict du banc est inscrit au registre** (`verdictScoring`, 62 entrées sur 64) :
  21 instruments portent au moins une divergence critique, 41 n'en portent aucune. Le
  critère de `scoring_verifie` ne vivait jusqu'ici que dans un fichier hors dépôt, sur
  une seule machine — ni rejouable, ni relisible en revue.
- **Le vérificateur du CI garde désormais la cohérence de l'échelle.** Il contrôlait que
  `statutCertification` est une valeur *connue* — il aurait accepté `publie` sur une
  entrée restée `a_verifier`. Chaque barreau exige maintenant ses pièces : une source
  dès `source_obtenue` (sauf contenu `cree_localement`, qui n'en a pas par
  construction), des droits dégagés et datés dès `droits_verifies`, un contenu hors
  `a_auditer` dès `contenu_verrouille`, un verdict de banc à zéro divergence critique
  dès `scoring_verifie`, une preuve psychométrique dès `psychometrie_revue`. Un
  instrument `actif: false` au catalogue doit être `suspendu` ou `remplace` — **et
  l'inverse** : un état terminal sur un instrument actif est refusé, pour qu'une
  réactivation reprenne l'échelle à `repere`. `licence_requise` et `restreint` sont des
  verdicts vérifiés mais **négatifs** : ils ne dégagent rien. Dix-sept tests neufs,
  vingt-trois mutations rouges sur le test exactement visé.
- **`Q_ALI_01` : le banc de certification mesurait la forme que l'application ne sert
  plus.** Son empreinte avait été capturée drapeau `WN_ALI_01_SIIN57` éteint — 14 items
  sur 42 — alors que la production sert la forme SIIN 57 items sur 90 depuis le
  2026-07-28. Recomparé drapeau allumé, la divergence « nombre d'items » disparaît.
  `npm run check` vérifie déjà aux deux positions du drapeau ; le banc, non.

Aucun barème, aucun seuil, aucune valeur servie n'a été modifié ; aucune passation
rescorée. Dossier d'arbitrage :
`docs/claude/propositions/2026-07-29-certification-montee/`.
