### Procédure de violation de données : exercée sur table, RUNBOOK de révocation corrigé (2026-07-22)

Exercice sur table de `docs/PROCEDURE_VIOLATION_DONNEES.md` (exigence 6 de
G-TRUST-04, campagne durcissement PR-6) : scénario fictif — lien portail du
patient fictif Michel Dogné transféré à un tiers — déroulé §2→§8, fiche
remplie, trois constats (EX-1 à EX-3) consignés dans
`docs/claude/campagnes/2026-07-22-g-trust-04-durcissement-et-reliquats/EXERCICE_SUR_TABLE_VIOLATION_2026-07-22.md`.
Verdict : exécutable en 72 h par une seule personne. Constat EX-1 corrigé
dans la même PR : le RUNBOOK « Révocation accès patient » référençait un
champ inexistant (`portailToken`) et ignorait la route
`DELETE /api/praticien/token` qui ferme jeton, sessions et liens en vol en
une transaction. La confirmation juridique de la procédure reste due
(D-TRUST-02).
