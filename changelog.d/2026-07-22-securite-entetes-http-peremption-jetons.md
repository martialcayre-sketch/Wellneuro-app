### Sécurité — en-têtes HTTP durcis et péremption des jetons portail (2026-07-22)

Lot différé de l'audit de conformité 5.0.

- **Six en-têtes de réponse** posés sur toutes les routes : HSTS,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (le lien
  portail porte le jeton d'accès dans son chemin — sans cet en-tête, il fuit
  dans le `Referer` de toute ressource externe chargée par la page),
  `X-Frame-Options: DENY` et `Content-Security-Policy: frame-ancestors 'none'`
  en doublon volontaire (le second fait autorité sur les navigateurs récents,
  le premier couvre les anciens — sans eux le dashboard praticien est
  encadrable en iframe), et `Permissions-Policy` fermant caméra/micro/géoloc.
  `/portail` et `/patient`, dont l'URL porte le jeton, reçoivent en plus
  `X-Robots-Tag: noindex, nofollow, noarchive`.
- **Péremption des jetons d'accès portail** après 90 jours par défaut
  (`WN_PORTAIL_TOKEN_TTL_JOURS`, `0` pour désactiver explicitement). Un jeton
  sans date de création connue (émis avant que celle-ci soit posée
  systématiquement) ne périme jamais — le périmer déconnecterait des patients
  actifs sans qu'on puisse dater leur lien ; il reste soumis à la révocation
  manuelle.

Aucune migration : `accessTokenCreatedAt` existait déjà. Compatible avec la
bascule R4 des liens permanents (`WN_PORTAIL_LIEN_PERMANENT_FIN`), vérifiée
séparément et en premier dans `resolvePortailPatient`.
