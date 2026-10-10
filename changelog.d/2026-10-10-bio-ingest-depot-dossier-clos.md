### BIO-INGEST : un dossier clos pendant l'envoi du patient ne reçoit plus le document (2026-10-10)

- **Contre-revue adverse de campagne, C2** (`REVUE_CODEX_ADVERSE_2026-10-10.md`) :
  la route du portail jugeait le dossier ouvert avant le téléversement du
  corps, et le dépôt ne rejugeait sous son verrou que les plafonds. Une
  clôture du suivi survenue pendant l'envoi n'empêchait pas l'insertion.
- `deposerTransmission` relit désormais `actif` et `suivi_cloture_le`
  `FOR SHARE` sous le verrou du dépôt, sur le patron de la diffusion des
  fiches : une clôture concurrente attend le commit. Un dossier clos,
  désactivé ou introuvable est refusé avec la raison et le message du contrôle
  d'en-tête (409 `dossier_cloture`), et rien n'est écrit.
- Bancs : quatre cas neufs, rouges quand on retire la relecture (mutation
  jouée).
- **Effacement d'un dossier** (revue Copilot de la PR) : `effacerDossier`
  verrouille désormais la ligne du patient `FOR UPDATE` avant toute
  suppression. L'ordre « enfants puis patient » de l'effacement ne croise
  plus l'ordre « patient puis enfant » des écrivains qui verrouillent le
  dossier en partage (dépôt du patient, diffusion des fiches). Il n'y a plus
  d'interblocage possible, et l'effacement n'échoue plus sur une ligne
  insérée après le passage de sa table : l'écrivain attend la fin de
  l'effacement, puis ne trouve plus le dossier. Le banc rougit si l'on retire
  le verrou.
