### Banc de l'envoi d'un instrument du cabinet : le cas 10 attend le refus que #2130 a introduit (H59, 2026-11-15)

Depuis #2130 (réponse `20261114-1217-a`), drapeau allumé, l'édition des seules métadonnées d'un instrument n'écrit que si `updated_at` n'a pas bougé depuis sa lecture. Le cas 10 du banc `web/scripts/banc-envoi-cabinet-deux-sessions.test.ts` (« titre sur une lecture périmée ») attendait encore 200. Il passait par hasard, quand la pose de la fixture et l'écriture du tiers tombaient dans la même milliseconde (`timestamp(3)`). Sinon, il rendait 409 et rougissait `main` (eace5bab) ainsi que #2139 et #2141.

- **Attendu** : 409 `conflit_statut`. Rien n'est écrit, ni la V1 lue, ni le titre. La thèse du cas tient : la V2 publiée « non » reste.
- **Déterminisme** : la pose est reculée d'une seconde, si bien que la lecture précède sûrement l'écriture du tiers. Rejoué 10 fois sur une base locale, le banc est 10 fois vert.
- Aucun changement de la route ni du produit.
