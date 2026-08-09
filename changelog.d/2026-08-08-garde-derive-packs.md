### Ajouté

- **Un pack ne peut plus être enregistré à moitié dans le registre relationnel.**
  Composer un pack avec un questionnaire que le registre ne connaît pas rendait
  jusqu'ici un pack sauvegardé et un miroir incomplet, sans un mot. La sauvegarde
  est désormais refusée (`409`, journalisé côté serveur), et le message **nomme
  les questionnaires en cause** — en distinguant ceux que l'écran permet de
  retirer de ceux dont la définition doit être recréée en base, parce que le
  catalogue affiché ne les porte pas. C'est le mécanisme qui avait produit la
  dérive du pack de base, celui qui part à chaque onboarding.
- **Un contrat de cohérence packs ↔ registre relationnel**
  (`web/prisma/checks/packs_registre_coherence_v1.sql`), joué en **préflight de
  production** avant chaque release de base : une release ne se déploie plus sur
  une base en dérive. Trois assertions — un questionnaire sans définition, deux
  descriptions du même pack qui divergent, un miroir sans pack. Son fichier
  négatif éprouve qu'elles mordent (la base du CI est vide : sans lui, le
  contrat y serait vert par vacuité).

### Modifié

- **Désactiver un pack ne resynchronise plus sa composition**, seulement son
  état. Le geste ne touche pas les questionnaires du pack : le coupler à la
  synchronisation rendait indésactivable — donc actif et assignable — le pack
  même que le nouveau garde dénonce.

- **Le seed de développement écrit désormais le miroir relationnel du pack de
  base.** Il ne le faisait pas, au motif que la lecture retombait sur la source
  legacy — vrai, mais l'écriture, elle, refuse maintenant un questionnaire sans
  définition : sans ce complément, l'écran des packs devenait inutilisable sur
  toute base fraîchement provisionnée.

### Corrigé

- **La date d'arbitrage de l'hébergement HDS n'était pas incohérente**, contrairement à
  ce que le cadrage annonçait : le 2026-07-21 est celui de l'instruction et de la
  dérogation, le 2026-07-22 celui de l'arbitrage. L'évènement est désormais nommé
  à côté de chaque date. L'échéance, **2026-10-21**, est inchangée partout.
