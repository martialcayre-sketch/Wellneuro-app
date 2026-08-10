---
id: "LOT-01"
statut: "à faire"
---

# LOT-01 — Discordance rythme déclaré vs observé

## Objet

L'objet clinique visé en remplacement du branchement direct agenda → besoin 3
(`alimentaire.ts:651-658`) : confronter `RYTHME_CHRONO` (déclaré, `Q_ALI_01`
forme 57 items) au rythme observé (agrégats d'agenda clôturés au LOT-00), et
restituer la concordance/discordance — au praticien d'abord.

## Contraintes

- `null` (jamais 0) sous la forme courte, où `MAX_RYTHME_CHRONO = 0` —
  prouvé dans les deux positions de `WN_ALI_01_SIIN57`.
- **Décision clinique préalable (D-xxx)** : définition de la discordance et
  forme de sa restitution — rien ne se code avant.
- Pas de double mesure du besoin 3 (le piège documenté
  `RYTHME_ALIMENTAIRE`/10 vs `RYTHME_CHRONO`/7).

## Dépend de

LOT-00 (l'observé n'existe au dossier qu'après clôture). La version chiffrée
attendra le LOT-02.
