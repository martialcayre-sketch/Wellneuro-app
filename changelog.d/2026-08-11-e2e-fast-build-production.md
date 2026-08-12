### Corrigé

- **Le palier de test rapide (`--fast`) joue désormais les E2E contre le build
  de production, comme la séquence complète et comme le CI.** Il restait sur
  `next dev` au motif qu'il « ne construit pas de build » — un raisonnement
  circulaire que la mesure renverse : sur la même suite, le même jour,
  `build + start` prend **2 min 06** là où `next dev` prend **12 min 54**, la
  compilation à la demande étant refaite page par page. L'option « rapide »
  était cinq fois plus lente que le chemin qu'elle contournait.
- **Elle était surtout instable, et d'une façon qui trompe.** Trois exécutions
  le 2026-08-11 ont produit trois échecs, sur trois tests **différents**
  (`visual.spec.ts` lignes 103, 115 et 123), chaque fois celui qui suivait
  immédiatement le recyclage mémoire du serveur de développement — et chacun de
  ces trois tests passait dans les runs où il n'était pas la victime. Le défaut
  était invisible en CI et en séquence complète, qui jouent toutes deux le
  build : un `--fast` rouge se lisait donc comme une régression du code, et le
  vrai signal se noyait dans ce bruit. La leçon avait déjà été consignée deux
  fois au journal de session sans jamais devenir exécutable ; elle l'est ici.

### Modifié

- **`--fast` ne saute plus le build** : une erreur de build y arrête désormais
  la séquence, comme elle arrête le CI. Ce qu'il saute encore — anti-secrets,
  audit de campagnes, certification scoring, lint — est inchangé.
- Le tableau de validation de `CLAUDE.md` annonçait **« T2 ~1 min 20 »**. La
  mesure réelle était de quatorze minutes. Les deux paliers portent maintenant
  leur durée observée : ~3 min pour T2, ~4 min pour T3.
- `web/e2e/README.md` portait la justification devenue caduque ; elle est
  remplacée par la mesure qui l'a renversée.

**Vérification** : séquence rapide verte en **3 min 37 s**, **136 E2E passés,
zéro échec**, et aucune ligne de recyclage mémoire dans tout le journal.
