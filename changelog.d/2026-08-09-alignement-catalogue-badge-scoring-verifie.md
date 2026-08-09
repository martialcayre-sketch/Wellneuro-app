### Le badge parle pour les 22 instruments que le registre certifiait en silence (D-038)

Le lot d'alignement décidé par `D-038` est exécuté. Les 18 instruments muets
reçoivent `certification:{source:'drive',status:'certifie'}` dans le catalogue
de code — chaque déclaration adossée au verdict certify du registre (tous datés
du 2026-07-30 au 2026-08-01, tous à 0 divergence critique), jamais copiée du
barreau. Les 4 « ambigu » (`Q_SOM_02`, `Q_GAS_01`, `Q_FIB_02`, `Q_URO_01`)
sont réexaminés un par un : leurs doutes dataient d'avant les verdicts du
2026-07-30 qui les soldent — pour Epworth, le commentaire du catalogue
documentait lui-même l'arbitrage praticien qui comble les trous de la source
tout en laissant le statut au doute. Les quatre passent à `certifie` ; le
cinquième « ambigu » du fichier (`Q_FIB_03`, `suspendu` au registre, 2
divergences critiques) reste intact.

**L'inventaire du garde tombe à 0 en position de production** (drapeau
`WN_ALI_01_SIIN57` allumé). Drapeau éteint il rend 1 : la variante courte de
`Q_ALI_01` reste muette **à raison** — le verdict du registre est mesuré
drapeau allumé, la forme 14 items n'a aucun verdict au dossier.

**Ce que l'alignement a entraîné, et qui était prévu par les gardes du LOT-04** :
le bloc seed du PSQI porte désormais la clé (le garde seed ↔ catalogue
l'exigeait dès que le catalogue déclare) et sa ligne E2E passe de « Historique »
à « Scoring vérifié (Drive) ». Le bloc MFI-20 reste nu : sa passation
(2026-06-15) est antérieure à la reconstruction du 2026-07-31 — une clé serait
fausse au dossier et inerte à l'écran. Le garde du seed porte désormais cette
exemption **dérivée** de `motifNonInterpretable` (le prédicat même de la
route), jamais une liste.

**Non-couverture nommée** : « Historique » n'est plus atteignable depuis le
seed (14 blocs certifiés, le 15e non interprétable). L'état existe en
production ; libellé et couleur restent gardés par les bancs unitaires, aucun
E2E ne le voit plus. Nommée dans l'en-tête du spec.

La matrice `docs/questionnaires-drive-mapping.md` (audit daté du 2026-07-06)
n'est pas éditée : ses « ambigu » décrivent l'état de la source à cette date,
antérieure aux verdicts du registre qui la supersèdent.

Attendus du banc de scoring alignés (4 fixtures `ambigu` → `certifie` ;
`Q_PED_03` et `Q_FIB_03` inchangés). Les fichiers CRLF touchés sont normalisés
en LF, le sens que `.gitattributes` déclare — relire avec
`git diff --ignore-cr-at-eol`.
