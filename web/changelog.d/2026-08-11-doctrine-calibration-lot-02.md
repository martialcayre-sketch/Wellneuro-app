### Doctrine de calibration LOT-02 : descente claim par claim du Notebook 09 (préparation, sans D-xxx)

Après vérification du **contrat réel de `Q_ALI_09`** (horaires, structure
repas/hors-repas et quelques présences alimentaires — jamais de quantité, gramme,
kcal ni aliment détaillé), la **doctrine de calibration** du barème/indice
d'agenda est posée dans
`docs/claude/campagnes/2026-08-10-chaine-alimentaire/CALIBRATION_LOT-02.md` :
**6 domaines candidats A1–A6** (pas 5 axes figés), **trois sorties distinctes**
(profil observé / indice `/100` optionnel / carte des discordances de premier
rang), une **garde de contamination** interdisant que les seuils de donnée
(`MIN_JOURS_*`, fenêtre 18 h, jeûne 24 h) deviennent des bornes cliniques, et
`soirPlusCopieux` **drapeau longitudinal, jamais des points**.

La « seconde passe » est réalisée : les **160 claims validés** des 8 sources du
Notebook 09 (`WN-SRC-0053`, `0067`–`0073`) sont attribués **un par un** — axe
agenda / discordance / hors-agenda-SIIN57 / **interdit de projeter** (les règles
MEDAS/SIIN et les quantités que l'agenda n'observe pas). Chaque claim attribué
porte sa limite structurelle (« présence ou horaire, jamais une quantité »). Le
document livre aussi une **ébauche de config `sc.axes` sans bornes chiffrées**.

**Aucune décision `D-xxx`, aucun code, aucune borne.** C'est un artefact de
préparation : le chiffrage des bornes/poids et la bascule de `Q_ALI_09` restent
gatés par la porte des 21 jours (recueil réel arrêté au 1er jour). Réserves de
gouvernance nommées : usage `orientation` absent sur ces 8 sources (à décider
avec le futur `D-xxx`), claims porte-seuil en revue individuelle.
