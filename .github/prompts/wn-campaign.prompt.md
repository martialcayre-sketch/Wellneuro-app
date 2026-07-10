---
name: wn-campaign
description: Transformer un brainstorming en campagne WellNeuro découpée en lots
agent: WellNeuro Planner
argument-hint: "<brainstorming ou titre>"
---
Transforme `${input:brainstorming:Collez ou décrivez le brainstorming}` en campagne.

Produis : titre, objectif, contraintes, décisions, questions ouvertes, dépendances, un `BRIEF_COMPILED.md`, un `CAMPAIGN_DRAFT.md`, puis 3 à 8 lots atomiques avec périmètre, interdits, tests et done. Ne code pas.

Ce prompt prépare la stratégie de campagne ; il ne remplace pas le mode Plan pour la planification technique détaillée.
Terminer par une consigne explicite : passer en mode Plan avant toute modification de code.

Commande de référence :

`node scripts/wn-campaign.mjs create "<titre>" --source <dossier_md> --auto-final --activate`
