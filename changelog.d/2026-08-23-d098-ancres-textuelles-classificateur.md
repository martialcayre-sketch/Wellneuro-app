### Doctrine — trois dettes du LOT-09 tranchées sur mesure (`D-098`, LOT-10 créé)

- **Les dix orphelines ne se rouvrent pas** : `D-096` les a laissées dettes
  nommées et le LOT-08 les porte déjà, liste et recomptage compris. Aucune
  décision due — elles s'exécutent, elles ne se re-décident pas.
- **L'ancre d'une citation devient textuelle**, parce que le contrôle évident
  ne marche pas. Mesure du 2026-08-23 : **247 citations** `fichier:ligne` dans
  `docs/claude/doctrine/` et `docs/DECISIONS.md` ; le contrôle « fichier existe
  + ligne dans les bornes » rend 0 introuvable et 2 hors bornes — et **les huit
  citations faussées par le LOT-09 étaient toutes dans les bornes**. Il garde
  contre la suppression d'un fichier, jamais contre la dérive, seul défaut
  réellement observé.
- Sur les **12 citations à verbatim accolé** (les seules vérifiables sans
  ambiguïté) : 8 justes, 2 faux positifs de l'instrument, **2 réellement
  mortes** — `drapeauxAnamnese.ts` cite « Difficultés à avaler », absent du
  fichier entier ; `orientationEngine.ts:769` cite `Q_GAS_01`, présent aux
  lignes 283, 479 et 966.
- **Le correctif est un changement d'ancre, pas un banc de plus** : verbatim
  exact ou nom de symbole, le numéro de ligne devenant une commodité. Le
  contrôle « le texte cité existe dans le fichier cité » ne fait **aucune
  arithmétique de ligne** — décidable, sans faux positif, immunisé à la dérive.
  **Les 247 ne sont pas réécrites** : convention au neuf et au touché,
  l'existant grandfathered et le disant.
- **Le classificateur E2E perd un prédicat** : `wn-diagnostic-e2e.mjs` exigeait
  journal réseau vide **et** `page.goto` dans `error-context.md`. Au LOT-09,
  Playwright n'y avait écrit que le timeout de *teardown* — le script s'est tu
  sur le cas exact qu'il existe pour nommer. `page.goto` cède à `timeout` ; le
  journal vide reste le fait discriminant. Aucun `retries`, aucun rouge
  blanchi : le harnais sort toujours en `1`.
- **Un seul lot, le LOT-10** : les deux correctifs partagent leur origine (la
  livraison du LOT-09), leur classe (outillage, aucune règle clinique) et leur
  palier. Libre de toute dépendance.
- **Correction de portée** : le blocage WebKit `D-049` est **intermittent, pas
  structurel** — le T3 du LOT-09 est passé intégralement, WebKit compris, sur
  un diff plus large que celui qui avait rougi une heure plus tôt. Un rouge
  portant cette signature se rejoue une fois avant conclusion.
