---
id: "LOT-04"
titre: "rappel-agenda-alimentaire"
statut: "sans objet — déjà livré, constaté le 2026-09-12"
dépend_de: "—"
---

# LOT-04 — Le rappel de l'agenda alimentaire : SANS OBJET

## Le cadrage se trompait, et voici sur quoi

Le tableau « état réel » du cadrage portait cette ligne :

> Rappel agenda alimentaire | **Rien** — un lien « Ouvrir Mon carnet
> alimentaire », sans état ni rappel

**C'est faux.** Vérifié dans le code le 2026-09-12, avant d'écrire une ligne :

- `web/src/lib/agenda-alimentaire/rappelPortail.ts` **existe**, jumeau déclaré de
  `agenda-sommeil/rappelPortail.ts` — même structure, même vocabulaire, mêmes
  interdits (aucun compte à rebours, aucune série, aucun pourcentage), et ses
  propres bancs.
- `lib/portail/hubQuestionnaires.ts` l'appelle : `candidatsAgendas()` construit
  ses candidats **depuis les deux agendas**, et `calculerActionRecommandee()`
  pose le `factuel` du gagnant en `appui` de l'étape du moment.
- Le hub lui passe réellement ses données : `setAgendasAli(data.agendasAlimentaires ?? [])`
  puis `calculerActionRecommandee(enriched, brouillons, agendas, agendasAli)`.
  Le paramètre n'est pas laissé à son défaut.

L'état `journee_a_noter` est `prioritaire: true` avec un CTA : l'agenda
alimentaire atteint donc bien l'étape du moment, avec sa phrase factuelle.

## Ce qui reste vrai, et qui n'est pas ce lot

L'état `a_transmettre` rend `cta: null` côté alimentaire, là où le sommeil
propose « Terminer et transmettre ». **La raison est écrite dans le code, et elle
est bonne** : `api/portail/agenda-sommeil/cloture` existe, son équivalent
alimentaire **non**. Recopier le CTA enverrait le patient, au 21ᵉ jour, vers une
frise sans le geste qu'on vient de lui promettre (`D-015`).

La clôture alimentaire est un chantier à part entière, hors de cette campagne.

## Leçon

Le cadrage a affirmé une absence sans l'avoir cherchée. C'est la même faute que
« sans drapeau propre = en service au déploiement » : **une absence se constate,
elle ne se suppose pas.** Le tableau « état réel » du cadrage a été corrigé.
