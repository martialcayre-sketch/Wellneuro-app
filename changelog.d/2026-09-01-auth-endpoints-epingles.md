### Le login praticien cesse de redemander à Google où est Google (2026-09-01)

Les endpoints OIDC de Google (autorisation, jeton, userinfo, JWKS, issuer)
sont épinglés dans la configuration du provider et la découverte `wellKnown`
est désactivée : l'appel de découverte disparaît des deux jambes du flux
(URL d'autorisation, puis callback — dont le pire cas passe de trois à deux
appels, ~16 s sous la fenêtre de 30 s du routeur). Valeurs relevées sur le
document well-known en direct le 2026-09-01 (15:53 UTC). Le paramètre `hd`
préfiltre en plus l'écran Google de choix de compte sur le domaine Workspace
autorisé — indication d'interface seulement, la décision d'accès reste
entière dans `profilPraticienAutorise`. La revue adversariale `wn-reviewer`
(GO avec réserves) a dicté trois pins supplémentaires dans le test de
garde : la sémantique de fusion elle-même (le module `utils/merge` installé
doit copier les clés `undefined`, sinon la découverte reviendrait en
silence à un bump de next-auth), `idToken: true` (le profil doit rester un
JWT vérifié), et le singleton `ALLOWED_DOMAINS` (pour que `hd` et la
décision serveur ne divergent jamais) — en plus des endpoints, de
`checks: ["pkce", "state"]` (déjà le défaut du factory, rien à activer) et
de `hd`. Réserve documentée, hors de ce lot : `/login` ignore le paramètre
`error` et rend toute panne d'authentification muette — suivi à ouvrir.
