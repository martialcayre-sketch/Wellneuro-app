# Handoff — 2026-09-15 — LOT-06 : le barème de charge, et sa première échelle ratifiée

Dernier lot de la campagne « 5. Actions — le protocole assisté ». **Les huit lots sont
livrés.**

## Le constat, et le troisième fait a changé la question

La charge thérapeutique était **obligatoire et hachée** — le LOT-02 avait fermé le
silence, et `normalizeLoad` exige déjà une justification quand le niveau vaut
`excessive`. Elle **ne part jamais au patient** : le contrat l'exclut nommément. Et
**personne ne la relisait** : le seul écran qui l'affichait recevait
`protocolDraft={fixture ? protocolDraft : null}` — donc `null` en usage normal — et
sortait par un retour anticipé. Le praticien déclarait une charge qu'il ne revoyait
jamais.

## Les six arbitrages du 2026-09-15

1. **Quatre termes mesurés**, tous dérivés du protocole.
2. **Le barème propose, le praticien déclare** — aucun refus sur un écart.
3. **La charge de la version active redevient lisible**, dans le même lot.
4. **Une échelle sur un seul terme**, sans trou ni recouvrement.
5. **Hors barème : le silence.**
6. **Un niveau « excessif » se lit en avertissement**, sans ouvrir d'avance le champ
   de justification.

## L'échelle ratifiée, et ce que sa signature atteste

Trois bandes sur `nombreActionsFermes` : `0–1` léger, `2` modéré, `3` chargé.

**Ces bornes n'ont AUCUNE source clinique, et la table le dit d'elle-même** — un banc
textuel l'exige. Rien au dépôt ne traite de la charge thérapeutique et aucun claim ne
les porte : c'est une **convention d'organisation**, proposée parmi trois échelles,
relue en entier, puis **ratifiée**. C'est la ratification qui fait la provenance. D'où
l'absence de `claimsSource`, là où `INDICATIONS_BIOLOGIE_V1` en porte vingt-neuf.

**La signature est recopiée, jamais posée par l'outil** : le garde interdit le
câblage, pas la recopie d'une attestation donnée — et la surface de relecture a été
produite AVANT la demande.

**`excessive` n'est atteignable par aucune ligne**, et c'est l'arbitrage : un comptage
ne peut pas savoir qu'un protocole de deux actions est excessif pour quelqu'un qui
traverse un déménagement.

## Quatre choses trouvées en chemin

1. **La table signée ne peut pas être lue par l'écran** — elle importe `crypto`, et la
   suggestion doit s'afficher PENDANT la composition. Partie pure séparée ; le verrou
   reste au serveur en un point unique, et l'écran ne reçoit que des lignes vouchées.
2. **Une garde du dépôt a mordu** : toute table signée doit figurer à
   `docs/FEATURE_FLAGS.md`.
3. **Un banc ne prouvait rien** : il exerçait le verrou sur la table réelle, alors
   vide. Constaté **par mutation** — neutraliser la garde ne faisait rougir personne.
4. **`suggererCharge` serveur n'avait aucun appelant.** Retiré.

## Vérifications

T1 vert. T2 : **9 326 bancs unitaires verts, 198 E2E verts, aucun rouge** — pas même
la signature `D-049`. Vingt bancs neufs sur le barème, neuf sur l'écran. Deux
mutations vues ROUGES avant de déclarer vert, restaurées depuis une copie.

## Ce qui reste, et ce n'est pas un lot

**La mesure d'usage.** Sur dossiers réels, par identifiant, au conteneur (`D-125`).
Refusée par le classifieur de sécurité de la session — et le refus porte sur la
**forme** de la commande, pas son contenu : un simple `count(*)` sans champ nominatif
a été bloqué de la même façon. Non contournée.

Voir [[D-195]].
