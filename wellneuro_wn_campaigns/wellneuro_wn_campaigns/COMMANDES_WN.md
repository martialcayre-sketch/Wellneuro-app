# Commandes `/wn` de reproduction

Ces commandes recréent les canevas dans le dépôt. Les fichiers fournis dans ce paquet sont déjà enrichis et doivent servir de référence finale.

## C0 — Alignement documentaire et état réel du dépôt

```text
/wn creer "Alignement documentaire et état réel du dépôt" --source docs/claude/wellneuro-3 --slug alignement-documentaire-etat-reel --lots 4 --auto-final --activate
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Alignement documentaire et état réel du dépôt" --source docs/claude/wellneuro-3 --slug alignement-documentaire-etat-reel --lots 4 --auto-final --activate
```

## C1 — Décision clinique 21 jours V1 — cockpit et protocole minimal

```text
/wn creer "Décision clinique 21 jours V1" --source docs/claude/wellneuro-3 --slug decision-clinique-21j-v1 --lots 8 --auto-final
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Décision clinique 21 jours V1 — cockpit et protocole minimal" --source docs/claude/wellneuro-3 --slug decision-clinique-21j-v1 --lots 8 --auto-final
```

## C2 — Persistance du protocole et suivi J7/J14/J21

```text
/wn creer "Persistance protocole et suivi J7 J14 J21" --source docs/claude/wellneuro-3 --slug suivi-j7-j14-j21-et-persistance --lots 7 --auto-final
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Persistance du protocole et suivi J7/J14/J21" --source docs/claude/wellneuro-3 --slug suivi-j7-j14-j21-et-persistance --lots 7 --auto-final
```

## C3 — Fiches conseils contextuelles V1

```text
/wn creer "Fiches conseils contextuelles V1" --source docs/claude/wellneuro-3 --slug fiches-conseils-contextuelles-v1 --lots 5 --auto-final
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Fiches conseils contextuelles V1" --source docs/claude/wellneuro-3 --slug fiches-conseils-contextuelles-v1 --lots 5 --auto-final
```

## C4 — Bibliothèque compléments clean label V1

```text
/wn creer "Bibliothèque compléments clean label V1" --source docs/claude/wellneuro-3 --slug complements-clean-label-v1 --lots 6 --auto-final
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Bibliothèque compléments clean label V1" --source docs/claude/wellneuro-3 --slug complements-clean-label-v1 --lots 6 --auto-final
```

## C5 — Boussole alimentaire — vertical slice V1

```text
/wn creer "Boussole alimentaire vertical slice V1" --source docs/claude/wellneuro-3 --slug boussole-alimentaire-slice-v1 --lots 7 --auto-final
```

Équivalent script :

```bash
node scripts/wn-campaign.mjs create "Boussole alimentaire — vertical slice V1" --source docs/claude/wellneuro-3 --slug boussole-alimentaire-slice-v1 --lots 7 --auto-final
```

## Pilotage

```text
/wn status
/wn next
```
