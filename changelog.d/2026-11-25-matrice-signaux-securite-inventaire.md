### Matrice de consommation : la table des signaux de sécurité est recensée (2026-11-25)

La table des signaux de sécurité d'anamnèse (`web/src/lib/clinical/safetySignalsV1.ts`,
signée par D-099) était la seule table clinique signée absente de
`SOURCES_DE_SAVOIR` (`scripts/wn-matrice-consommation.mjs`) : la matrice ne
pouvait ni montrer ses appelants ni sa garde. Elle y est déclarée
(`signaux-securite-anamnese`), avec pour garde son verrou de signature
(`tableSignauxSecuriteSignee`, verrou de donnée `validationExterne`, aucun
drapeau). Elle ressort consommée (route du courrier d'adressage, plus dix
surfaces indirectes) : aucun arbitrage n'est requis dans
`consommation_decisions.json`. `docs/claude/MATRICE_CONSOMMATION.md`
régénérée (26 sources, 0 dormante) ; un cas ajouté au banc
`scripts/wn-matrice-consommation.test.mjs`. Déclaration d'inventaire seule :
aucune règle, aucun seuil, aucun fichier clinique modifié.
