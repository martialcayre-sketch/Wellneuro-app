# Handoff — 2026-08-07 08:05 — LOT-03 clos, retrait des packs fait

Campagne `2026-08-06-packs-personnalises`. LOT-03 livré (#604) **et geste
production exécuté**. Lot actif désormais **LOT-04** (clôture de campagne).

## Ce qui est fait

Le retrait est **réel**, pas seulement outillé : six désactivations par l'UI
praticien le 2026-08-07 entre 05:59:10 et 05:59:32, après déploiement du garde.
Trois lectures de contrôle après le geste :

- **exactement 1 pack actif** sur 8 — « Base de consultation », `par_defaut`,
  6 qids, `updated_at` inchangé (il n'a pas été touché) ;
- **`pack-reevaluation` : aucun patient concerné** — 15 consultations sur le pack
  de base, 10 sans pack, **zéro** sur un pack désactivé. Le repli `parDefaut` n'a
  jamais à jouer ;
- **`questionnaire_packs` a suivi** — mêmes 7 lignes à `actif: false`, mêmes
  horodatages : `syncPackToRegistry` a propagé dans la transaction.

Le risque clinique que [[D-030]] laissait ouvert est donc **nul, mesuré après le
geste**.

## Pour qui reprend au LOT-04

Le LOT-04 est la clôture de campagne (E2E, changelog, vérification prod, reprise
des dettes). Son « Hors périmètre » exclut **tout nouveau développement** — un
manque découvert là devient un lot nommé. C'est ce qui a fait sortir la garde
générale de [[D-031]] du LOT-04 : elle attend un lot qui n'est pas ouvert.

**Cinq dettes datées** attendent d'y être reprises ou renvoyées :

1. **Aucune réactivation de pack depuis l'UI.** Toute la barre d'actions est sous
   `p.actif` : un pack désactivé par erreur n'est pas rallumable. Ce n'était pas
   grave tant que rien n'était désactivé ; sept packs le sont maintenant.
   `PacksPanel.test.tsx` l'épingle explicitement.
2. **`questionnaire_packs.actif` n'est relu par personne**, et le retrait vient de
   peupler sa condition de déclenchement (7 lignes sur 8 à `false`). Le jour où un
   lecteur bascule sur le registre comme source primaire sans reprendre le filtre,
   il résoudra la composition de sept packs retirés.
3. **`prisma/seed.ts` ne répare pas un pack de base cassé** — `upsert` avec
   `update: {}` : no-op silencieux qui affiche pourtant « Pack par défaut créé ».
4. **`schema.prisma:155-156`** cite encore le pack en capitales, la casse même qui
   avait tué le repli par nom. Non corrigé : ce fichier ne se touche pas sans
   demande explicite.
5. **Suture `suggestedPackSelection`** laissée inerte après le retrait du bloc
   « Packs suggérés ».

## Une question clinique ouverte, pour le praticien

`R2-SOM-05` propose Horne **sans** la porte `RYTHME_BIOLOGIQUE` de `R2-SOM-03`.
Les deux objectifs rédigés suggèrent un choix délibéré — deux versants suffisants
vers le même instrument, ce que [[D-031]] admet explicitement comme légitime. Mais
si c'est un angle mort, c'est un défaut dans ce que le LOT-02 a mis en production.
Ni le code ni le dépôt ne peuvent trancher : c'est une décision clinique.

## Deux pièges de méthode, payés dans ce lot

- **Ne pas restaurer un fichier du lot par `git checkout --`** pendant une
  vérification par mutation : le travail n'est pas committé, `checkout` restaure
  HEAD et rend la mutation permanente. Restaurer par édition inverse, vérifiée au
  checksum.
- **Le scratchpad est partagé entre agents parallèles** : deux y ont écrit une
  sauvegarde du même nom, et la restauration a écrasé un fichier avec le contenu
  d'un autre.

Et une leçon de fond : **trois tests de ce lot n'étaient pas falsifiables à leur
première écriture**, dont celui censé couvrir le défaut principal — il envoyait un
payload que l'écran n'émet jamais. Ici, écrire le test ne prouvait rien ; il
fallait muter et regarder rougir. Onze mutations ont été jouées.
