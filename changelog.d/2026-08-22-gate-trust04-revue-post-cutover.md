### G-TRUST-04 : la revue reprend après le cutover — plus aucune exigence à ❌, la preuve de journalisation est produite (2026-08-22)

La checklist du gate est remise à l'état réel, exigence par exigence, sur
constats datés :

- **Exigence 1 (hébergement)** passe ❌ → ⚠️ en franchissant le seuil que sa
  propre rédaction fixait (« ❌ jusqu'au cutover ») : service et données sont
  rendus par Scalingo `osc-fr1` `--hds-resource` depuis le 2026-08-22 ~04:05,
  schéma vérifié sur conteneur. Restent nommés : l'annexe HDS (pendante — le
  point accepté sciemment de `D-078` demeure) et le décommissionnement du
  2026-09-01 (`D-080`).
- **Exigence 5 (journalisation)** : la preuve fonctionnelle « toujours due »
  est **produite** — sonde lecture seule sur la production : 947 accès,
  14 dossiers distincts, 27 routes, dont **99 écritures depuis la bascule**
  (historique porté intact, journal vivant post-cutover). Répercuté au
  dossier RGPD (rubrique 10).
- **Exigence 3** : note structurelle — Scalingo n'expose aucune API de
  données managée, le vecteur visé par la posture A (`D-005`) n'existe plus.
- **Exigence 6** : dette nouvelle — `RUNBOOK.md` est périmé depuis le cutover
  (chapitres infra Vercel/Supabase), à réécrire pour Scalingo.
- Bilan : **sept partielles, zéro ❌, zéro ✅** — chaque chemin vers ✅ est
  nommé et daté. La revue de la dérogation reste au **2026-10-21**.
