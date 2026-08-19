### Le gate HDS est levé par arbitrage — écart assumé, pas mise en conformité

- **`D-078` (2026-08-19, décision du responsable de traitement)** : le gate
  **G-TRUST-04 est levé**, les fonctionnalités qu'il retenait deviennent
  activables (étage 2 du rayon biologie, messagerie D5), et la **migration
  totale vers Scalingo est engagée sans attendre la signature de l'annexe
  HDS**. Motif invoqué : le gate bloque trop le développement.
- **L'état des sept exigences est inchangé** — une ❌, six partielles, aucune
  ✅. Le gate est levé *malgré* cet état, pas à cause d'un changement de cet
  état. La checklist d'activation continue de faire foi, et porte désormais les
  deux faits côte à côte.
- **Le point accepté sciemment, écrit au registre** : Scalingo déclare le
  2026-08-11 que l'annexe HDS « doit être signée séparément pour activer
  l'option HDS ; l'acceptation des conditions générales seule ne suffit pas ».
  Entre la bascule et cette signature, les données réelles ne sont couvertes ni
  par la dérogation — qui vise l'implantation Vercel — ni par une option HDS
  active.
- **Ce que la levée n'emporte pas** : l'annexe reste à signer et à archiver dès
  réception (demandée le 2026-08-12, relancée le 2026-08-19) ; l'information
  des personnes sur l'écart d'hébergement, dont l'échéance est « au plus tôt »,
  reste échue et devient plus exigeante ; les autres trous du tableau §14 sont
  inchangés.
- **La date de revue ne bouge pas — 2026-10-21.** Un écart sans terme cesse
  d'être un écart borné.
- **Le décommissionnement de Vercel/Supabase reste subordonné à la signature** :
  c'est le seul geste de la bascule qui ne se replie pas. Le filet de rollback
  court de `D-006` tient tant qu'ils sont gardés chauds.
- Trois porteurs alignés sur ce nouvel état : `.wn/state.json`
  (`blocking_issues`), `CHECKLIST_ACTIVATION_G_TRUST_04.md` (section datée, qui
  prime sur son en-tête de 2026-07-20), `REGISTRE_FRONTIERES.md` (l'invariant
  HDS, dont l'écart est élargi et non refermé).
