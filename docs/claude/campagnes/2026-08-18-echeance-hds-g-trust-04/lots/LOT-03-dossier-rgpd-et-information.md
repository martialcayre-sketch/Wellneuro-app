---
id: "LOT-03"
statut: "à faire — peut avancer en parallèle du LOT-01"
---

# LOT-03 — Dossier RGPD à l'état réel, et information des personnes rattrapée

## But

Le tableau §14 de `docs/DOSSIER_RGPD.md` — **qui fait foi** — ne porte plus de
ligne dont l'échéance est passée sans mention, et l'information des personnes
sur l'écart HDS est **consignée**, sa réalisation datée.

## Pourquoi ce lot n'attend pas le LOT-01

Son échéance n'est pas le 2026-10-21. L'information des personnes porte, au
tableau §14, l'échéance « **au plus tôt** » — elle est donc **déjà échue**, et
le reste depuis la Vague 2. C'est un rattrapage, pas une préparation.

Le reste du dossier est également indépendant de l'arbitrage : qu'on migre ou
qu'on reconduise, les trous restent les mêmes trous.

## Objet 1 — l'information des personnes sur l'écart HDS

La décision du responsable du 2026-07-21 invoque, parmi ses motifs,
l'**information des participants** — « qui savent que l'hébergement n'est pas
certifié HDS ». Cette information est invoquée comme un fait ; le tableau §14
la porte comme un **trou**, non consigné. Le lot ferme l'écart entre les deux :
soit l'information a été donnée et il faut l'écrire, avec sa forme et sa date,
soit elle ne l'a pas été et elle est à donner.

## Objet 2 — le dossier à l'état réel

Passer le tableau §14 ligne à ligne et, pour chacune, faire l'un des trois :
consigner la réponse si elle existe déjà ailleurs, marquer la ligne fermée avec
sa preuve, ou porter l'échéance et le porteur à jour. Les lignes qui relèvent
d'un **conseil qualifié** (qualification de la base légale, mécanisme de
transfert, AIPD) ne se rédigent pas ici — le lot les identifie comme telles et
n'écrit rien à leur place.

Deux lignes sont déjà à jour et **ne se retouchent pas** : le périmètre HDS de
`osc-fr1` (fermé le 2026-08-11) et la forme de l'accord de sous-traitance
(connue depuis la même réponse, signature et archivage renvoyés au LOT-01).

**Entré au périmètre par `D-078` (2026-08-19)** : deux passages du dossier
sont antérieurs à la décision et disent désormais faux — §6 « la signature et
l'archivage de l'annexe HDS restent à faire **avant toute donnée réelle** »
et la ligne §14 dont l'échéance est « **avant bascule Scalingo** ». L'ordre
« (a) d'abord » étant écarté (application suspendue, `D-078` §4), ces
passages se réconcilient ici — en citant `D-078`, jamais en effaçant ce
qu'ils disaient.

## Périmètre

- `docs/DOSSIER_RGPD.md` — rubriques concernées et tableau §14.
- `docs/claude/propositions/2026-07-24-audit-migration-hds/CHECKLIST_FINALISATION.md`
  §F, si son état diverge du dossier.
- Le support d'information patient, si l'objet 1 conclut qu'elle est à donner.

## Interdits

- **Ne pas rédiger ce qui relève d'un conseil qualifié** (AIPD, qualification
  de la base légale, mécanisme de transfert). Le dossier le dit déjà de l'AIPD :
  « elle n'est pas rédigée ici, et ce document ne doit pas être confondu avec
  elle ».
- **Aucun compteur de trous écrit à la main** : ajouter une ligne au tableau a
  déjà périmé trois compteurs le 2026-08-09.
- **Aucune identité réelle** — ni au dépôt, ni dans un exemple, ni dans un
  message de commit.
- Ne pas toucher au gate : c'est le LOT-04.

## Dépendances

Aucune. Le LOT-01 lui **transmet** la consignation de l'archivage de l'annexe,
il ne le bloque pas.

## Tests

Documentaire : T1 + `bash scripts/check_no_secrets.sh` sur le dépôt entier.

## Critères de done

- [ ] Chaque ligne du tableau §14 est soit fermée avec sa preuve, soit portée à
      jour (porteur, échéance), soit explicitement renvoyée à un conseil
      qualifié.
- [ ] L'information des personnes sur l'écart HDS est **consignée**, avec sa
      forme et sa date — ou son émission est datée si elle restait à faire.
- [ ] Aucune ligne du dossier ne contredit `D-047`.
- [ ] Fragment `changelog.d/` écrit.
