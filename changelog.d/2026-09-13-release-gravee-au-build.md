### La release est gravée dans l'image au lieu d'afficher « build local » en production (2026-09-13)

**Constat.** `releaseSha()` retombait sur `'local'` **en production** : l'en-tête
de l'espace praticien affichait « build local », et Sentry taguait toutes les
erreurs sur une release nommée `local`. Impossible de dire quelle version avait
produit un défaut — constaté le jour où une capture de production montrait une
mise en page qu'on croyait déjà déployée.

**Ce qui change.** `web/scripts/build.sh` exporte `NEXT_PUBLIC_APP_VERSION`
depuis `SOURCE_VERSION`, la variable que Scalingo pose pour la durée du build et
qui vaut le commit réellement déployé. Next inline les variables
`NEXT_PUBLIC_*` à la compilation : le SHA part donc dans l'image, et ce nom est
déjà le dernier repli des deux chaînes existantes — `releaseSha()` (serveur) et
`clientReleaseSha()` (navigateur). Une ligne renseigne les deux, sans toucher à
`deploymentEnv.ts`.

**Écarté : poser `WN_RELEASE_SHA` à la main sur Scalingo.** Une variable figée
serait juste une fois, puis **mentirait à chaque déploiement suivant** — un SHA
périmé est pire que `'local'`, qui au moins n'affirme rien. Elle aurait aussi
demandé un redémarrage ; la voie retenue n'en demande aucun.

**Hors Scalingo** — CI, build local — `SOURCE_VERSION` est absente : rien n'est
exporté et le repli `'local'` reste en place. Jamais de variable vide, qui
court-circuiterait `??` et afficherait « build » suivi de rien. Le build imprime
lequel des deux cas s'est produit, pour que le journal de déploiement le dise
au lieu qu'on le suppose.
