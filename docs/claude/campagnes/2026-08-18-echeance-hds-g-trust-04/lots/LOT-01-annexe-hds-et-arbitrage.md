---
id: "LOT-01"
statut: "en cours — l'arbitrage est rendu (D-078) ; reste l'annexe à signer et archiver"
---

# LOT-01 — Annexe HDS obtenue et signée ; arbitrage migrer/reconduire posé

## But

À la fin de ce lot, deux choses auront changé dans le dépôt et hors de lui :
l'**annexe HDS de Scalingo est signée et archivée avec le DPA** (ou son
impossibilité est écrite et datée), et ~~le **responsable de traitement a
tranché au registre** entre migrer et reconduire la dérogation~~ — **rendu par
anticipation le 2026-08-19 (`D-078`) : migrer, sans attendre l'annexe.** Le
lot reste ouvert sur le premier objet seul.

Ce lot porte **deux objets distincts**. Les confondre est l'erreur à éviter :
l'un est une démarche matérielle qui n'attend aucun arbitrage, l'autre est un
arbitrage qui n'appartient pas à l'assistant.

## Objet 1 — l'annexe HDS : une démarche, pas une décision

`D-047` (2026-08-11) a établi la forme réelle de l'accord de sous-traitance, sur
réponse écrite du fournisseur : **le DPA et une annexe HDS distincte, à signer
séparément** — « l'acceptation des conditions générales seule ne suffit pas » à
activer l'option HDS.

Ce que cela invalide : `D-037` avait posé qu'il n'y avait **rien à signer**, les
pièces vivant dans les documents généraux acceptés à la souscription. C'était
une déduction, explicitement marquée « sous réserve de confirmation du
fournisseur », et la confirmation l'a démentie.

**Cette démarche ne dépend pas de l'arbitrage de l'objet 2.** Reconduire la
dérogation ne la rend pas inutile : elle est la condition (a) de `D-006`, et
~~tant qu'elle n'est pas levée, la migration reste impossible quand elle sera
décidée~~ — **plus depuis `D-078` §4** (l'ordre est suspendu, la migration
est engagée sans l'annexe). Ce qui rend la démarche toujours aussi due : le
**décommissionnement** en dépend (seul geste irréversible), la signature est
la sortie « par le haut » de la revue du 2026-10-21, et chaque jour sans elle
allonge la fenêtre de moindre couverture (`D-078` §3).

Étapes, toutes à la main du responsable :

1. Demander l'annexe HDS à Scalingo — le ticket du 2026-08-09 est le canal
   ouvert, sinon `support@scalingo.com`. **Texte prêt** :
   `sources/demande-annexe-hds-scalingo.md`. **Engagée selon `D-078`**
   (demande du 2026-08-12, relance du 2026-08-19) — la référence du canal
   reste à consigner, cf. critères de done.
2. Signer l'annexe.
3. Archiver **le DPA et l'annexe signée** hors dépôt, et consigner l'archivage
   au dossier RGPD (rubrique 6 et ligne correspondante du tableau §14) — la
   pièce elle-même n'entre pas au dépôt.

## Objet 2 — l'arbitrage : migrer, ou reconduire

> **RENDU PAR ANTICIPATION le 2026-08-19 (`D-078`)** — le responsable de
> traitement a tranché en session : **migrer, sans attendre l'annexe**, motif
> invoqué « le gate bloque trop le développement ». Il a tranché informé du
> point de moindre couverture (fenêtre bascule→signature, `D-078` §3).
> L'exposé ci-dessous est conservé comme pièce : c'est l'état qui se
> présentait au moment de la décision.

**La question, telle qu'elle se posait au responsable de traitement, et sans
réponse suggérée :**

> Au 2026-10-21, la phase de test avec des personnes réelles cesse d'être
> couverte. Faut-il **exécuter la migration Scalingo** (déjà décidée par
> `D-006`, jamais exécutée), ou **reconduire explicitement la dérogation** avec
> un nouveau terme ?

Éléments à mettre sous ses yeux — tous sourcés, aucun n'oriente :

- **(b) est levée** : le périmètre HDS de `osc-fr1` est confirmé par écrit,
  certificat LNE n° 38436-2, activités 5 et 6 incluses (`D-047`).
- **(a) est ouverte** : sans l'annexe signée, migrer des données réelles
  créerait un intervalle couvert **ni** par la dérogation (qui vise Vercel)
  **ni** par un contrat HDS signé (`D-006`, ordre imposé).
- **Le staging est validé au boot, pas en recette** : les trois items
  fonctionnels de `CHECKLIST_FINALISATION.md` §A ne sont pas cochés, aucun
  rapport de recette n'existe, et les secrets comme les drapeaux produit ne sont
  pas posés. Migrer demande donc un travail de recette qui n'a pas commencé.
- **Aucune des sept exigences du gate n'est ✅** — une ❌, six partielles, et
  « c'est un ET, pas un OU ». Migrer lève l'exigence 1 ; **cela ne lève pas le
  gate**.
- **Reconduire est un geste prévu**, pas un contournement : la décision du
  2026-07-21 pose elle-même « soit l'hébergement a été déplacé, soit la décision
  est reconduite explicitement, datée et signée ici ». Elle rappelle aussi ce
  qu'elle est — « un écart assumé, borné et daté, pas une mise en conformité ».
- **Ce que la date emporte** : au 2026-10-21 sans reconduction, la règle du
  dépôt reprend (patients fictifs seuls) et la majorité des trous du tableau §14
  arrivent à échéance ensemble.

## Périmètre

- `sources/demande-annexe-hds-scalingo.md` — pièce du lot, déjà écrite.
- `docs/DOSSIER_RGPD.md` — rubrique 6 et tableau §14, **après** réception de
  l'annexe : consigner l'archivage. Rien avant.
- `docs/DECISIONS.md` — le `D-xxx` du responsable, **écrit sous sa dictée ou
  validé par lui**, jamais rédigé d'initiative.

## Interdits

- **Trancher l'arbitrage, l'orienter, ou présenter une option comme
  recommandée.** Le brief de campagne le pose : les décisions des lots 1 et 4
  appartiennent au responsable de traitement.
- **Faire transiter une pièce contractuelle ou un secret par l'assistant.**
- **Écrire au dossier RGPD que l'accord est archivé avant de l'avoir été** —
  « une souscription inférée n'est pas une preuve produite » (`D-037`, sur
  l'erreur exacte qu'il a lui-même commise).
- Toucher au gate : c'est le LOT-04.

## Dépendances

Aucune interne. Externe : la réponse de Scalingo à la demande d'annexe.

## Tests

Aucun test automatisé : ce lot ne produit pas de code. La vérification est
documentaire — T1 (`npm run check`) et `bash scripts/check_no_secrets.sh` sur le
dépôt entier, vu la nature du dossier.

## Critères de done

- [ ] La demande d'annexe HDS est **partie**, avec sa date — **affirmée par
      `D-078`** (demandée le 2026-08-12, relancée le 2026-08-19 ; la
      checklist du gate reprend le même acte, même jour — ce n'est pas une
      seconde preuve). **Trace indépendante à produire pour cocher** : le
      canal et la référence (numéro de ticket ou courriel), consignés ici ou
      au dossier RGPD.
- [ ] L'annexe est **reçue**, **signée**, et **archivée avec le DPA** hors
      dépôt — ou l'obstacle rencontré est écrit et daté.
- [ ] L'archivage est consigné au dossier RGPD (rubrique 6 + tableau §14), avec
      la date de signature.
- [x] ~~Un `D-xxx` du responsable de traitement, daté, tranche **migrer** ou
      **reconduire**~~ — **`D-078` (2026-08-19) : migrer, sans attendre
      l'annexe.** Pas de nouveau terme : la revue reste au **2026-10-21**
      (`D-078` §5).
- [ ] Le fragment `changelog.d/` est écrit.
