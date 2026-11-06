### Portail : la page de l'agenda refuse tout script d'une autre origine (D-437, 2026-11-06)

File C, place 11 (H83), lot de garde après le constat. `camera=(self)` ouvre la caméra à tout
script exécuté dans la page, même venu d'une autre origine (constat PR-Agent sur #1878). La
route `/portail/<jeton>/questionnaires/<assignation>` porte donc désormais
`Content-Security-Policy: script-src 'self' 'unsafe-inline'; frame-ancestors 'none'` : le
navigateur refuse, à l'exécution, tout script d'une autre origine. `'unsafe-inline'` garde
l'amorçage en ligne de Next : un script injecté en ligne n'est pas couvert, faute de nonce.
`'unsafe-eval'` n'est ajouté qu'en développement. Sentry est empaqueté sur la même origine, et ses envois ne sont pas touchés.
Toute autre page garde `frame-ancestors 'none'` seul.

Deux bancs : l'E2E des en-têtes vérifie la valeur exacte et unique de la CSP, sur la route et
hors d'elle ; l'E2E de l'agenda vérifie sous Chromium que le document du hub n'ouvre pas la
caméra et que celui de l'agenda, atteint par le lien du hub, l'ouvre (nitpick CodeRabbit de
#1878), et qu'aucune violation de CSP n'apparaît pendant le parcours.
