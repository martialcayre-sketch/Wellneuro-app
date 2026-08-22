### G-TRUST-04 : la checklist des sept exigences rattrape les faits — rien ne passe à ✅, tout est cité (2026-08-22)

Le tableau des exigences datait du 2026-07-21 et trois lignes racontaient un
état périmé. Mise à jour factuelle, sur preuves citées, en vue de la revue du
2026-10-21 — la levée par arbitrage (`D-078`) n'est pas touchée, et **aucune
exigence ne change de verdict** : une ❌, six partielles, comme avant.

- **Exigence 1 (hébergement)** : reste ❌, mais dit désormais que les données
  réelles résident sur Scalingo HDS depuis le 2026-08-22 03:24 CEST (PR #729)
  et que le service, lui, reste sur Vercel/Supabase — le ❌ tient jusqu'au
  cutover, sa preuve complète jusqu'au décommissionnement.
- **Exigences 2 et 4 (accès, sessions)** : la ligne « jeton permanent, pas de
  révocation » décrivait un état que **#397 a fermé** — cookie de session
  unique credential, coexistence terminée. Le partiel qui reste est nommé :
  colonnes dormantes (`DROP COLUMN` en PR 2) et révocation de remplacement
  absente. G5 (Google patient) est noté actif en production, constaté par le
  comportement.
- **Exigence 5 (journalisation)** : « preuve attendue au premier dossier
  ouvert » était une échéance déjà dépassée — des dossiers réels tournent
  (`D-075`, `D-077`) sans que la preuve existe. La ligne le dit maintenant,
  alignée sur le §14 du dossier RGPD.

Exigences 3, 6, 7 : inchangées — l'isolation, le conseil qualifié et le
pentest n'ont pas bougé, et la checklist ne prétend pas le contraire.
