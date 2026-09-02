### Le nom `jwks_endpoint` se verrouille — la « standardisation » qui cassait le login ne peut plus repasser (2026-09-02)

Pendant la revue de la PR #827, une revue automatique a renommé
`jwks_endpoint` en `jwks_uri` (« nom OIDC standard ») en ajustant aussi
l'assertion du test de configuration : `jwks_uri` est bien le nom standard de
la métadonnée, mais l'option next-auth v4 s'appelle `jwks_endpoint` — le
renommage privait l'Issuer de son JWKS et cassait la validation de l'id_token
au premier login réel. `tsc` l'a arrêté (propriété inconnue d'`OAuthConfig`),
le commit a été reverté. Ce lot pose le verrou qui manquait : un test qui
épingle le CONTRAT CONSOMMATEUR dans la source installée
(`core/lib/oauth/client.js` doit contenir `jwks_uri: provider.jwks_endpoint`)
— insensible à un renommage simultané de la configuration et de son
assertion — plus un commentaire anti-rechute sur la ligne elle-même.
