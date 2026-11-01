### Release-db : la structure signée des fiches d'usage et le contrat de fraîcheur la déclenchent (D-416, 2026-11-01)

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` et le contrat positif
  `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` entrent aux
  chemins de `release-db.yml` et du déployeur, sur le patron de D-389 §5 :
  une re-signature des fiches d'usage, ou un prédicat retouché, attend
  désormais une release approuvée dont le préflight rejoue le contrat contre
  la production.
- Le résumé pour l'approbateur nomme ces fichiers quand le push les modifie ;
  une tête qui les modifie pendant l'attente compte comme une migration.
- Aucune migration ; la structure signée et le contrat sont inchangés.
