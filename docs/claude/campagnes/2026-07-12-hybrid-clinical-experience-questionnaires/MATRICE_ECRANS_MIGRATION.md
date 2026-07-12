# MATRICE_ECRANS_MIGRATION — LOT-00 HC-F

Classement des écrans réels par priorité de migration vers le shell premium
(LOT-02) et le portail clair (LOT-04). Priorité proposée, **à valider** (cf.
`ARBITRAGES_LOT_00.md`).

## Shell praticien

| Écran | État réel | Risque de régression | Priorité proposée |
|---|---|---|---|
| `NavBar.tsx` / `SidebarRail.tsx` / `MobileBottomNav.tsx` | Tokenisé, géométrie mesurée, icônes = abréviations + emojis | Faible (déjà bien structuré, remplacement d'icônes surtout) | **Vague 1** |
| `/dashboard` (accueil) | Moyenne complexité, `MetricsSection` + `PatientsATraiter` | Moyen (composants multiples) | **Vague 1** |
| `/dashboard/parametres` | Simple, deux `<dl>` | Faible | **Vague 1** (rapide, faible risque) |
| `/dashboard/patients` (`PatientsPanel`) | Non audité en détail (délégation) | À auditer avant chiffrage | Vague 2 |
| `/dashboard/patients/[idPatient]` (`FichePatientPanel`) | Substantiel (score, badges, cercles, momentum) — **base réelle de C1** | Élevé — C1 va construire dessus, éviter de migrer visuellement avant l'articulation C1/LOT-03 | **Différée après LOT-00 arbitrage C1** |
| `/dashboard/patients/[idPatient]/besoins` (`DetailBesoinsPanel`) | Non audité en détail | À auditer | Vague 2 |
| `/dashboard/synthese` (`SynthesePanel`) | **Non migré** — tokens Lot 0 en dur (`--primary`/`--accent`) | Élevé (contraste, tokens legacy) | **Vague 1** (dette connue à résorber) |

## Portail patient

| Écran | État réel | Priorité proposée |
|---|---|---|
| `portail/[token]/page.tsx` (gate/consentement/fiche/anamnèse/fin) | Monolithique, state machine locale, pas de sous-routes | **Vague 1** — périmètre LOT-04 explicite |
| `portail/[token]/questionnaires/page.tsx` (hub) | Fonctionnel, distinction brouillon/transmis déjà présente | **Vague 1** |
| `portail/[token]/questionnaires/[idAssignation]/page.tsx` | Dispatch saisie/lecture seule/Mon équilibre | **Vague 1** (hors rendu des questions elles-mêmes → QX) |
| `ConsultationScreen.tsx` | Lecture seule + demande de correction | Vague 1 |
| `MonEquilibreAccueil/Detail.tsx` | Score/synthèse côté patient, distinct du praticien | Vague 2 (dépend de la cohérence avec la prévisualisation) |

## Hors périmètre de migration HC-F

- Rendu des questions individuelles (`GenericQuestionnaire.tsx`,
  `QuestionField.tsx`, `PlaintesForm.tsx`) — moteur et randomisation → QX ;
  seule l'enveloppe visuelle générique reste HC-F.
- `FichePatientPanel.tsx` en tant que futur cockpit — restylage différé
  tant que C1 n'a pas fixé son contrat (cf. audit §5).
