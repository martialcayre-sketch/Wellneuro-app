---
id: "2026-08-04-reprise-chantiers-en-suspens"
titre: "Reprise des chantiers en suspens — travail sauvé de worktrees orphelins"
statut: "close"
créée_le: "2026-08-04"
mise_à_jour: "2026-08-05"
lot_courant: "LOT-03"
---

# Reprise des chantiers en suspens

## Objectif

Décider, chantier par chantier, du sort de trois travaux qui ne vivaient que sur le
disque de worktrees orphelins : les **reprendre** jusqu'à la production, ou les **clore
explicitement**. Aucun troisième terme — un chantier qui reste « en suspens » ne coûte
rien à personne le jour où il est décidé, et coûte sa redécouverte tous les autres jours.

## Ce qui a motivé cette campagne

Un tri des worktrees le 2026-08-04 en a trouvé huit. Deux étaient verrouillés par une PR
ouverte (#556, #435). Trois ne portaient rien d'unique et ont été libérés. **Trois
portaient du travail réel que git ne suivait pas** — fichiers non committés, dont une
migration, et un HEAD détaché. Un `git worktree remove` les aurait emportés sans trace.

Ce travail est désormais **committé et poussé** : c'est ce qui le rend durable, et non ce
document. Ce document le rend *reprenable*.

## État constaté

| Chantier | Branche distante | Contenu | Lot |
|---|---|---|---|
| « Mon bilan » portail | `feat/portail-bilan` | 334 lignes, **une migration**, un défaut clinique fermé | LOT-01 |
| Transport des compositions C4 | `lot/handoff-skills-agents-copilot` | 526 lignes inédites, débloque 6 critères de recherche sur 8 | LOT-02 |
| Runbook HDS | `sauvegarde/runbook-scalingo-staging` | +85 lignes de faits opérationnels, échéance au 2026-10-21 | LOT-03 |

**Aucun des trois n'est validé ni revu.** Aucun T1/T2/T3 n'a été rejoué sur ces
périmètres depuis leur abandon, et les branches ont divergé de `main` — `feat/portail-bilan`
et `lot/handoff-skills-agents-copilot` datent de fin juillet, `main` a beaucoup bougé
depuis. Le premier geste de chaque lot est donc le même : **rebaser, puis mesurer l'écart
au dépôt réel avant de décider**.

## Ce que cette campagne n'est pas

Ce n'est pas un engagement à livrer les trois. Deux d'entre eux peuvent parfaitement être
clos sans code — c'est une issue légitime, à condition qu'elle soit **écrite**. Un
quatrième chantier a d'ailleurs été clos pendant le tri lui-même : les scripts `devlocal`
d'ingestion C4 étaient antérieurs au renommage `doseParPortion` → `doseParDjr` (#504), et
les garder aurait invité à réintroduire une grandeur clinique que le dépôt a écartée
délibérément.

## Ordre recommandé

**LOT-01 d'abord**, et pour une raison qui n'est pas l'ancienneté : il porte une migration
et un défaut clinique. Une note de praticien modifiable après envoi peut publier au
patient un texte qui ne lui a jamais été transmis — sur un dossier clôturé y compris. Tant
que la page « Mon bilan » n'existe pas en production, le défaut est inerte ; il cesse de
l'être au premier écran qui lit `notes_praticien` en direct.

**LOT-03 ensuite** s'il faut choisir : c'est le moins cher (document seul) et le plus
daté (dérogation G-TRUST-04 au 2026-10-21).

**LOT-02** est le plus lourd et le plus dépendant d'un arbitrage produit : le transport
des compositions n'a de valeur que si le rayon compléments est activé.

## Interdits

- Ne **pas** merger un de ces chantiers sans rebase préalable sur `main` ni passage du
  palier de sa classe — leur âge est exactement ce qui rend leur validation ancienne sans
  valeur.
- LOT-01 porte une migration : **T3 obligatoire**, revue adversariale `wn-reviewer` avant
  de passer la main, et vérification de la base après merge.
- Ne pas réintroduire `doseParPortion` : voir la note ci-dessus.
