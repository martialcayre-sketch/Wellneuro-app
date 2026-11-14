### J2-base : la surface de relecture de `SAF-QUEST-02` est produite avant la demande de signature (H59, lot D-277, 2026-11-14)

C'est la PR 4 du lot de code de `D-515` §6.2, étape 1. La surface paraît
avant toute demande de signature (`D-195`). Elle ne touche ni code, ni
table, ni texte, et ne signe rien.

- **`docs/claude/campagnes/SURFACE_RELECTURE_SAF_QUEST_02_2026-11-14.md`**
  présente :
  - le mécanisme, en ses six codes ;
  - les effets d'un constat (`D-515` §5, amendé par `D-522`) ;
  - les trois textes neufs (la mention « écrit par le praticien » et les deux
    limitations) et les trois textes repris de `SAF-QUEST-01` ;
  - la lettre ;
  - le SHA du périmètre, `6c0d224f…`, calculé sur `main` @`eb454046`.
- **Ce que la signature ne couvre pas** : les libellés du praticien et le
  choix de la question désignée.
- **À lire avant de signer** :
  - la conséquence de l'option C, la carte disparaît et le courriel continue
    après une extinction (`D-522` §3) ;
  - le seul cas restant d'un message sans courriel, un retrait de la
    signature (`D-522` §5) ;
  - le texte « hors options » pour une option écartée hors int4 ;
  - la définition servie vivante face à la copie figée, dont le seul résidu
    passe par le déverrouillage d'une assignation après une modification de
    l'instrument ;
  - le résidu de bascule du drapeau ;
  - la passation `CAB_` sans assignation, un cas vide par construction
    (`DC-24`) ;
  - le sens du verrou.
- **Deux questions cliniques** vont au responsable, avec l'avis de Codex : le
  résidu du déverrouillage et le texte « hors options ».
- **Rien ne s'allume** : `WN_ENABLE_DECLARATION_SUICIDE_CAB` reste éteint, et
  `SAF-QUEST-02` reste non signée.
