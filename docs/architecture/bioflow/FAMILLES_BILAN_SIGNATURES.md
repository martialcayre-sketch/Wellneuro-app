# Familles du bilan — registre des signatures (aw, F34)

Les quinze fiches des familles du bilan sont signées par le responsable,
les 2026-10-28 et 2026-10-29 : treize familles ordinaires et deux blocs
d'exclusion. Ce registre en porte les codes, la date de signature et
l'empreinte SHA-256 de la version signée (D-382 §5), avec la forme
canonique qui permet de la recalculer : des identifiants et un mécanisme,
jamais un texte de fiche (D-251 §4, D-312 §2). Les textes restent hors
dépôt, dans le dossier privé du responsable. Le déroulé des signatures et
des réserves est au journal de F34 (`docs/claude/plan-journal/F34/`).

## Forme canonique

Validée par le responsable le 2026-10-29, avant le premier calcul :

1. Source : export Markdown (moteur md-v1) du dossier privé, à la révision
   signée de la fiche (colonne « Révision » : numéro de version du dossier
   privé ; F05 et F09, rectifiées avant signature, l'ont été à une révision
   ultérieure, et F11, E1 et E2, corrigées après une contre-revue adverse,
   ont été signées à nouveau à la révision 64 ; les révisions intermédiaires
   ne portent aucune signature en vigueur).
2. Découpe : de la ligne de titre de la fiche (`### <code> — …`) incluse
   jusqu'avant la ligne du titre suivant, de niveau `##` ou `###` ; pour E2,
   dernière fiche, ce titre est celui de la section qui suit les exclusions.
3. Normalisation : l'échappement `\_` de l'export est rendu `_` (seul
   échappement présent) ; Unicode NFC ; fins de ligne LF ; lignes internes,
   vides comprises, conservées telles quelles ; blancs finaux ramenés à un
   seul saut de ligne.
4. Empreinte : SHA-256 des octets UTF-8, en hexadécimal minuscule.

Chaque texte canonique est déposé à l'octet dans les fichiers du dossier
privé (`F01.txt` … `E2.txt`). La vérification consiste à recalculer
l'empreinte (`shasum -a 256 F01.txt`) ; aucun contrôle logiciel n'existe
avant que ces textes soient servis, et le lot ax l'ajoutera (D-382 §5).

## Registre

| Code | Panel | Règle | Signée le | Révision | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| F01 | `PANEL_HUMEUR_1` | BIO-HUM-01 | 2026-10-28 | 57 | `7076fac7176f3735d20d4a13d9e6c967792b902d7b727202daf8d4cf7b28a9fc` |
| F02 | `PANEL_ANXIETE_1` | BIO-ANX-01 | 2026-10-28 | 57 | `6f1cca3b93b374aa1f45ddc6826f19046dd636ca5a2faf05430acfadf251642b` |
| F03 | `PANEL_STRESS_1` | BIO-STR-01 | 2026-10-28 | 57 | `ec0641aac871484ba69575bf447bc5dc41352ad6b50a1a120f7504b12d532ef9` |
| F04 | `PANEL_SOMMEIL_1` | BIO-SOM-01 | 2026-10-28 | 57 | `51009f581fe0aa5376e6c407a8eac601bf31e354e6dc15a9546a580dc3e7c2d1` |
| F05 | `PANEL_MEMOIRE_1` | BIO-MEM-01 | 2026-10-29 | 58 | `1e79586b55ca6b5b9af2c8c1953135958ea2ef99c3573b31c6e52b6e6160e95b` |
| F06 | `PANEL_DIGESTIF_1` | BIO-DIG-01 | 2026-10-28 | 57 | `8ac567776da5e4ce8d29802d2ec1b644a22c41687d9aa19f564f98e2f4c57d5d` |
| F07 | `PANEL_FATIGUE_1` | BIO-FAT-01 | 2026-10-28 | 57 | `d31957638ab11813f1f33d9784f8d6721763fd35546e3e775031b81b5d906ec9` |
| F08 | `PANEL_NEURODEG_1` | BIO-NEU-01 | 2026-10-28 | 57 | `41e9e4935f788785364003dd525606b8220d874182b656f00e370e96b6d3e9da` |
| F09 | `PANEL_METABOLIQUE_1` | BIO-MET-01 | 2026-10-29 | 60 | `c18414435719857316af968f9c4a41f83f765cc23865562f3801674563148a27` |
| F10 | `PANEL_METABOLIQUE_OPT` | BIO-MET-02 | 2026-10-29 | 58 | `2eb7db93ecbe0b76e1f87956e50bbd3bc69f3f43752d8c3142c5f3ff5d1d209e` |
| F11 | `PANEL_SJSR` | BIO-SJS-01 | 2026-10-29 | 64 | `4673a8b92b8f4b545081667a3780cf21af9cfea7fd41b16656ba94577cc91a93` |
| F12 | `PANEL_POP_FEMME` | BIO-POP-01 | 2026-10-29 | 60 | `227ca4a513f152f6ff9363e1a68d3b504450209b3add1ebb910dce757e9ee8dd` |
| F13 | `PANEL_POP_AGEE` | BIO-POP-02 | 2026-10-29 | 60 | `87191cd94e308e6b3419f695124412c90c91005f892e274cdbb83f5f7118bb5a` |
| E1 | `PANEL_MG_PLASMATIQUE` | BIO-NIA-01 | 2026-10-29 | 64 | `38d013f283cd7ee12dcd787db19e4497ef5fadd89686b82bcbc4dc659159661c` |
| E2 | `PANEL_CORTISOL_ISOLE` | BIO-NIA-02 | 2026-10-29 | 64 | `b0f9ac313a6526928a5c114ad86448a8f9fdbee7cb416cdac58f7b5e51113578` |

## Ce que ce registre ne fait pas

- Il ne change aucune règle de `indicationsBiologieV1.ts`, ni son
  empreinte. La re-signature de la table est l'étape 3 de F34 : un lot
  propre, release-db retenue jusqu'à son approbation (D-382 §6, D-389 §5).
- Les annexes du dossier restent à relire à la re-signature : la réserve
  du panel fatigue, le conflit CS-BIO-01, les lacunes apoprotéine et IgA
  sécrétoires.
- Toute modification ultérieure du texte d'une fiche rompt son empreinte :
  elle appelle une nouvelle signature et une nouvelle ligne, jamais une
  retouche de ce registre.
