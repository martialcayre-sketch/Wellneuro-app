### Le quatrième verbe était déjà en service — et personne ne pouvait le savoir

La demande de correction de l'objectif n'a **pas** de drapeau propre : c'est un
choix de `D-170`, et un bon — l'en doter aurait rendu possible un écran où le
bloc de réponse se ferme sur « c'est bien ça » sans que la porte de la demande
s'ouvre, c'est-à-dire un patient enfermé dans sa propre réponse.

**La conséquence n'avait pas été tirée.** Sans drapeau propre, il n'y a aucun
geste d'exploitation à poser : la fonctionnalité est entrée en service **au
déploiement de son code**, le 2026-09-11 à 23:08:29. Le handoff du chantier
annonçait pourtant « la mise en service côté patient reste à demander ». Une
mise en service qu'aucun geste ne marque est une mise en service que le dossier
ne date pas.

Le § B.3 de `docs/FEATURE_FLAGS.md` la date, et porte quatre preuves dont aucune
ne se déduit d'une autre : le déploiement qui sert **contient** les six lots ;
`demande_correction` est présent dans l'image qui tourne, dans la route **et**
dans l'écran ; une sonde non authentifiée rend **401 et non 503**, ce qui
distingue une porte ouverte d'une porte fermée ; la table existe et compte zéro
ligne. La ligne du drapeau, elle, nomme enfin les **quatre** gestes qu'il garde
au lieu de la seule ratification.

**Et le périmètre est mesuré, pas supposé** : deux dossiers portent une tête
d'objectif active, **un seul** a « c'est bien ça » pour dernier geste. Un patient
voit aujourd'hui le bloc fermé et le quatrième verbe. La branche « demande »
n'a donc toujours pas rencontré un dossier vécu — la limite écrite en `D-170`
tient, et cette mise en service ne la lève pas.
