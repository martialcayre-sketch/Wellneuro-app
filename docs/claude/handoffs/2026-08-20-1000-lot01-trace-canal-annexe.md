# 2026-08-20 10:00 — LOT-01 : la demande d'annexe HDS a enfin sa trace

## Ce qui a changé

- **`docs/DOSSIER_RGPD.md` rubrique 6** — bloc neuf « Canal et trace de la
  demande d'annexe (vérifié le 2026-08-20) » : fil de courriel unique avec le
  support du fournisseur, objet « Périmètre HDS de la région `osc-fr1` et
  pièces contractuelles — compte wellneuro », ouvert le 2026-08-09 09:42 UTC.
  **Le fournisseur n'émet aucun numéro de ticket** — la référence est l'objet
  du fil et ses dates, et le dossier le dit plutôt que de laisser croire à un
  identifiant.
- **Les deux dates de `D-078` sont confirmées, pas corrigées** : demande le
  2026-08-12 02:55 UTC (annexe + procédure de signature ; copie horodatée du
  DPA en point 2), relance le 2026-08-19 09:37 UTC (annexe bloquante ;
  interlocuteur direct demandé si la délivrance ne relève pas du support).
  **Sans réponse au 2026-08-20** — le dernier message du fil est la relance.
- **TROU 1 de la rubrique 6 dépoussiéré** : la nuance de `D-037` (« pas de
  signature à obtenir ») était encore là, non biffée, alors que `D-047` l'a
  démentie le 2026-08-11 ; et « question de forme non posée à ce ticket »
  alors qu'elle l'a été deux fois depuis. Biffées et reprises, rien effacé.
- **§14** — la ligne DPA porte le renvoi à la trace. **Aucune échéance
  déplacée, aucune autre ligne touchée.**
- LOT-01 : premier critère de done coché, les trois autres ouverts.

## À savoir pour la suite

- **La demande est pendante depuis huit jours** et la relance depuis un jour.
  Le fil nomme lui-même deux voies de secours si le support n'émet rien :
  `support@scalingo.com` et l'équipe InfoSec citée le 2026-08-11. **Geste du
  responsable, hors périmètre du lot** — l'assistant n'écrit pas au
  fournisseur.
- **Ce que l'annexe tient en otage** : le décommissionnement de
  Vercel/Supabase (seul geste irréversible du LOT-02) et la sortie « par le
  haut » de la revue du 2026-10-21. La bascule elle-même, non — `D-078` l'a
  détachée.
- **Le fil porte une question sans réponse qui intéresse le LOT-02** :
  l'annexe, une fois signée, couvre-t-elle **rétroactivement** les ressources
  déjà provisionnées (`wellneuro-staging` et son add-on, créés en `osc-fr1`
  avec `--hds-resource`), ou faut-il les recréer ? Si la réponse est « les
  recréer », l'ordre des gestes du runbook change.
- **Rien d'autre du LOT-01 n'est faisable au dépôt** : les trois critères
  restants attendent une pièce qui n'existe pas encore.

## Vérifié

- T1 vert (322 tests). **Sans portée sur ce diff** : quatre fichiers `.md`,
  aucun code — le conteneur exigeait d'abord `npm ci` puis
  `npx prisma generate`, ses rouges initiaux ne venaient pas du diff.
- Anti-secrets vert. Aucun nom ni adresse de tiers ajouté, aucun identifiant
  de boîte aux lettres versé au dépôt.
- Revue `/code-review` : quatre constats, tous refermés — dont un vrai
  (la reprise du DPA au 2026-08-19 était affirmée sans que le bloc de trace
  la porte : c'est le bloc qui était incomplet, il l'est moins).
