### La chaîne de génération d'une synthèse quitte sa route (2026-09-12)

Rien ne change pour personne — c'est le but. Tout ce qui construit une synthèse
(la matière lue, la consigne assemblée, l'appel au modèle, la persistance) vivait
dans `app/api/praticien/synthese/route.ts`, et y était **inatteignable depuis
ailleurs** : Next.js refuse au build tout export de valeur depuis un fichier
`route.ts` — vérifié, build rouge à l'appui.

Conséquence : une génération déclenchée par autre chose que le clic du praticien
— la fermeture d'un rideau de questionnaires, par exemple — n'avait d'autre choix
que de **recopier la chaîne**. Deux chaînes de génération dans le même dépôt
finissent toujours par diverger sur ce qu'elles transmettent au modèle.

**Le déménagement est fidèle au caractère près** : aucune règle touchée, aucun
texte de consigne réécrit, aucun ordre changé. Le seul changement de forme est le
refus — la route rendait un 422 sur un dossier sans passation exploitable, le
module rend un refus typé et laisse la route le traduire.

**Les six bancs qui lisaient le TEXTE SOURCE de la route lisent désormais le
module** — mêmes phrases, même code, mêmes assertions. Ce qu'ils gardent n'a pas
bougé d'une virgule : les 206 bancs de la synthèse restent verts sans qu'aucune
attente ait été réécrite.

Ce qui reste dans la route : la session, l'appartenance, les codes HTTP et les
deux transports. Ce module ne connaît ni l'un ni l'autre.
