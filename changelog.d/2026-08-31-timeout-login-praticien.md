### Le login praticien tolère huit secondes de lenteur au lieu de trois et demie (2026-08-31)

Incident du 2026-08-31 au soir : trois `SIGNIN_OAUTH_ERROR` consécutifs —
« outgoing request timed out after 3500ms » — ont fermé le login praticien
pendant un épisode de dégradation des dynos de production. Le budget de
3 500 ms était le défaut implicite d'openid-client : `authOptions` ne posait
aucun `httpOptions`.

Le provider Google porte désormais `httpOptions: { timeout: 8_000 }`, épinglé
par une assertion dans `auth.roles.guard.test.ts` pour qu'un revert ne puisse
pas repasser inaperçu. La valeur est un budget d'inactivité socket **par
appel** (pas une échéance de bout en bout) ; le callback en enchaîne jusqu'à
trois (découverte OIDC, échange de jeton, JWKS), soit ~24 s au pire —
délibérément sous la fenêtre de 30 s du routeur Scalingo, au-delà de laquelle
un 504 opaque remplacerait la redirection `/login?error` journalisée.

Arbitrage assumé, nommé en revue adversariale : sous réseau dégradé, une
tentative de login occupe un worker jusqu'à ~24 s au lieu d'échouer sec à
3,5 s — sur une route non authentifiée, c'est un échange disponibilité contre
occupation, acceptable pour un cabinet mono-praticien et compensé par le
redimensionnement mémoire des conteneurs mené en parallèle.

Écarté : 10 s (le pire cas à ~30 s percutait exactement la fenêtre du
routeur) ; élargir le budget de l'autre chemin d'entrée Google (son timer de
10 s n'a pas fauté — son déclenchement a été retardé par la cause racine) ;
le passage du provider en endpoints Google statiques, qui supprimerait la
découverte OIDC et réduirait le pire cas à ~16 s — lot séparé, à décider.
