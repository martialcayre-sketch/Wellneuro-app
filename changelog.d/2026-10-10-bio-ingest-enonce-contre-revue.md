### BIO-INGEST : les deux énoncés de la contre-revue adverse versés au dépôt (2026-10-10)

- **`docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_2026-10-10.md`** :
  21 affirmations absolues à réfuter sur les lots 00 à 11 (hors LOT-05,
  transféré) : rien n'entre dans `resultats_biologiques` sans geste humain ni
  altéré (trois écrivains), le document lu sur geste puis purgé, le portail
  patient, les données et le droit.
- **`PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md`**, même dossier :
  18 invariants dont le contre-relecteur choisit la mutation, joués dans un
  worktree jetable, contrats SQL et bancs sur base réelle compris. Trois
  lignes sont signalées d'avance comme probablement sans banc qui morde :
  journaux hors `import/`, effacement du dossier, garde de la route des
  décisions.
- Versés **avant** d'être joués, et **avant** le lot de clôture. Les deux
  passes sont lancées à la main par le responsable, dans n'importe quel
  ordre.
- **`REVUE_CODEX_ADVERSE_2026-10-10.md`**, même dossier : la passe sur lecture,
  jouée le même jour (NO-GO, trois réfutations, aucun P0), et la vérification
  de chaque trouvaille dans l'arbre. C2 est confirmée : un dossier clos pendant
  l'envoi du patient reçoit le document. Elle **reste à corriger**, par une PR
  séparée (#1385). B2 est affaiblie : la colonne reste `en_cours`, mais tous
  les lecteurs traitent l'import périmé comme interrompu, et sa trouvaille P1
  est écartée. C3 résiste à l'expérience : Node ne lit jamais plus que le
  `Content-Length` annoncé.
