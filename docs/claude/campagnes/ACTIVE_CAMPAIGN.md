# Campagnes actives

## Activité primaire

**Campagne** : 2026-08-18-echeance-hds-g-trust-04
**Titre** : Échéance HDS — lever ou reconduire G-TRUST-04 avant le 2026-10-21
**Statut** : active
**Lot actif** : LOT-01

## Activités parallèles

### 2026-08-04-agenda-alimentaire

**Titre** : Agenda alimentaire 21 jours (Q_ALI_09)
**Statut** : DÉBLOQUÉE le 2026-08-07 — le prérequis d'allumage du runbook (RUNBOOK-allumage-drapeau.md:44-53, « aucun pack ne référence Q_ALI_09 », attendu 0 ligne) est de nouveau SATISFAIT depuis 15:46 : le LOT-00 de 2026-08-07-dettes-packs-residuelles a retiré Q_ALI_09 du pack de base (packs.updated_at = 2026-08-07 15:46:34.011 ; la requête rendait 1 ligne depuis le 2026-08-06 18:02, elle en rend 0). Le drapeau WN_AGENDA_ALI est ALLUMÉ en production depuis le 2026-08-05 et le pilote tourne sur le dossier de contrôle PAT006 (RUNBOOK-allumage-drapeau.md:227-231). MAIS LOT-06 (barème et indice) NE S'OUVRE PAS POUR AUTANT : la campagne pose elle-même la porte — CAMPAGNE.md:123 et :151, « pas avant un recueil suffisant pour calibrer (clôture des 21 jours) ». LE RECUEIL EST ARRÊTÉ AU PREMIER JOUR : lecture du 2026-08-07, 2 journées seulement, TOUTES DEUX DATÉES DU 2026-08-05, sur 1 SEULE assignation. Rien n'a été noté depuis. C'est le point à porter — la campagne n'est plus bloquée par un prérequis technique, elle est en attente de données que personne ne saisit.
**Lot actif** : aucun

**Statut global** : active
**Mise à jour** : 2026-08-19

> La source de vérité machine est `.wn/state.json`. Cette vue est générée ; elle ne doit pas être modifiée manuellement.
