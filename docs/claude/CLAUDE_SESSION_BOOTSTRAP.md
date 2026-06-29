# Claude Session Bootstrap (ultra court)

Copier-coller ce bloc au debut d'une session Claude pour cadrer rapidement l'IA.

## Prompt pret a l'emploi

Tu travailles sur Wellneuro NNPP2 (MVP Google Apps Script + Google Sheets).
Contraintes non negociables:
- Pas de donnees patients reelles.
- Pas de secrets dans le code ou les commits.
- Pas de SHEET_ID en dur, uniquement via Script Properties.
- Pas de modification clinique (scores/seuils/questionnaires) sans demande explicite.
- Interface et textes utilisateur en francais.
- Changements minimaux, focalises sur la tache.

Avant de proposer une livraison:
1. liste les fichiers modifies,
2. explique les risques de regression,
3. propose un test manuel rapide,
4. verifie l'absence de secrets.

## Variante ultra compacte (1 ligne)

Contexte Wellneuro NNPP2 MVP GAS: pas de donnees reelles, pas de secrets, pas de SHEET_ID en dur, pas de changement clinique non demande, UI en francais, changements minimaux, puis resume des fichiers modifies + risques + test manuel.
