# Validation finale — TRUST V1 (LOT-07)

> 2026-07-16. Verdict borné : ce qui a été validé l'est avec sa preuve ;
> ce qui ne l'a pas été est dit explicitement.

## Verdict

**GO production pour le périmètre V1** (défini par
`MATRICE_FRONTIERES_TRUST.md`), avec les dettes nommées de
`DETTE_TRUST.md`. Décisions du responsable (2026-07-16) : migration
additive confirmée ; textes v1 validés par relecture des PR ; patients
existants inclus (séquence une fois).

## Validations exécutées

| Domaine | Preuve |
|---|---|
| Type-check, lint, build production | vert sur chaque PR de lot (#78-#82) et en CI |
| Tests unitaires | 225 au total, dont 19 TRUST (hash verrouillés, immuabilité, lexique, orientation EI, projection append-only, routes idempotentes) |
| E2E Playwright (Postgres dédié CI) | parcours portail complet traversant « Avant de commencer », centre permanent (version visible, état de lecture, accordéon urgences), desktop + mobile |
| Migration SQL | appliquée par `migrate deploy` sur le Postgres CI à chaque run |
| Versionnement des contenus | hash canonique par version, verrouillé par test — modifier un texte sans créer de version casse la CI |
| Séparation lecture / autorisation | accusé ≠ choix (types, tables, UI distincts) ; rien de précoché ; retrait aussi simple que l'accord |
| Événements immuables | append-only vérifié par tests ; aucune route DELETE ; statuts praticien évolutifs seulement |
| Notifications génériques | notification signalement sans donnée sensible (par construction) ; inventaire des emails existants audité |
| Règle clinique v1 | déterministe, versionnée, testée, validée par relecture praticien des PR (G-TRUST-05) ; messages sans promesse de délai |
| Anti-secrets, lexique | `check_no_secrets` vert ; lexique interdit absent des contenus (test dédié) |
| Audit d'orchestration | vert à chaque lot (miroir synchronisé) |

## Validations NON exécutées (explicites)

- **Panel humain** (patient, patient âgé, personne anxieuse, difficulté de
  lecture, aidant, référent protection des données) — non réalisé ;
  le test de compréhension (§17 du parcours) reste à faire en conditions
  réelles. → dette D-TRUST-01.
- **Revue juridique / DPO externe** — non réalisée ; textes v1 validés par
  le responsable uniquement. → dette D-TRUST-02.
- **Audit de sécurité externe / G-TRUST-04** (hébergement, journalisation,
  tests d'intrusion) — non réalisé ; le contenu n'affirme rien au-delà de
  l'architecture réelle. → dette D-TRUST-03.
- **Version audio / version simplifiée** des contenus — non réalisées.
  → dette D-TRUST-04.
- **Lecteur d'écran réel et zoom 200 %** — structure accessible par
  construction (details/summary natifs, labels explicites, navigation
  clavier testée en e2e), mais pas de passe NVDA/VoiceOver dédiée.
  → dette D-TRUST-05.

## DoD de campagne — état

- [x] Premier accès court et compréhensible (4 écrans, < 2 min).
- [x] Information détaillée accessible depuis toutes les pages (pied de page).
- [x] Chaque version identifiable et historisée (registre + hash + carte historique).
- [x] Lecture, consentement et autorisations séparés.
- [x] Le patient peut revoir et modifier les choix facultatifs.
- [x] Le praticien voit l'état des informations et demandes (page + Fil).
- [x] Badges de provenance cohérents avec les états réels (booklet ; portail sans contenu IA à ce jour).
- [x] Contenus IA diffusés = validation humaine bloquante (garde-fous booklet préexistants, documentés).
- [x] Notifications sans donnée sensible.
- [x] Parcours d'urgence sans promesse de surveillance.
- [x] Signalement d'effet indésirable disponible et tracé.
- [ ] Mineurs/représentants/aidants : modèle de délégation **différé vers IDP** (contrat défini, non implémenté).
- [x] Tests accessibilité structurelle, sécurité d'accès, versionnement, frontière patient.
- [x] Verdict explicite émis (ci-dessus).
