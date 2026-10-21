# E67 — Passe réelle d'accessibilité : parcours et grille de constat

> Geste humain de la file D (arbitrage du responsable du 2026-10-21, H64).
> Il solde ensemble D-TRUST-05, D-C5-01 et `DETTE_UX_RESIDUELLE.md:49` :
> lecteur d'écran réel, zoom 200 %, appareil mobile physique. Les bancs
> automatiques (Vitest, Playwright) ne remplacent pas cette passe.

## Matériel

| Poste | Appareil | Lecteur d'écran | Navigateur |
|---|---|---|---|
| A — mobile | iPhone physique (ou Android) | VoiceOver (ou TalkBack) | Safari (ou Chrome) |
| B — ordinateur | Mac, ou PC Windows | VoiceOver (Mac) ou NVDA (Windows) | Safari / Firefox |
| C — vision basse | l'ordinateur du poste B, puis le téléphone du poste A | aucun | ordinateur : zoom du navigateur à 200 % ; téléphone : taille du texte au plus grand (Réglages › Accessibilité) |

## Avant de commencer

- **Un dossier de test**, désigné par son identifiant, jamais par un nom ;
  connexion par son lien magique.
- **Ne rien envoyer** qui deviendrait une donnée du dossier : remplir les
  champs pour les entendre, sans valider de questionnaire, sans déposer
  « Ce qui compte » ni de document. Le dépôt et l'envoi se jouent jusqu'au
  message d'erreur de champ vide, pas au-delà.
- Noter l'heure de début : une session portail dure 30 jours, la passe n'est
  pas pressée.

## Parcours (portail patient, postes A puis B, puis C)

1. Connexion par lien magique (`/portail/connexion`, `/portail/lien/[jeton]`, `/portail/lien/indisponible`).
2. Accueil du dossier (`/portail/[jeton]`) et **pied de page d'urgence**.
3. Centre d'information (`informations`) — D-TRUST-05.
4. Conditions et séquence d'accord (`conditions`) — D-TRUST-05.
5. Liste des questionnaires (`questionnaires`), puis un questionnaire ouvert
   (`questionnaires/[id]`) : navigation entre pages, une erreur de champ
   obligatoire, la reprise d'un brouillon.
6. « Ce qui compte » (`ce-qui-compte`) : compteur de caractères, message
   « Brouillon restauré sur cet appareil. » après un rechargement.
7. Documents (`documents`), Mes échanges (`echanges`), Suivi (`suivi`).
8. Alimentation et boussole (`alimentation`, `alimentation/boussole/…`) —
   le « Jardin » de D-C5-01.

Côté praticien (poste B seulement) : l’Observatoire de la boussole au cockpit
d'un dossier de test (D-C5-01).

## Grille — une ligne par écran et par poste

Pour chaque critère : **OK**, **Défaut** (bloquant / gênant / mineur), ou
**Sans objet**, avec une note courte quand ce n'est pas OK.

| # | Critère | Ce qu'on vérifie |
|---|---|---|
| 1 | Titre | le titre de la page est annoncé à l'arrivée |
| 2 | Ordre | la lecture suit l'ordre visuel ; rien d'important n'est sauté |
| 3 | Noms | chaque bouton, lien et champ annonce ce qu'il fait (pas « bouton » seul) |
| 4 | États | coché, développé, désactivé, obligatoire, en erreur : annoncés |
| 5 | Messages | erreur, succès, « brouillon restauré » : annoncés sans chercher |
| 6 | Navigation | gestes (A) ou clavier (B) : tout est atteignable, aucun piège, focus visible |
| 7 | Zoom | 200 % ou texte au plus grand (C) : rien de coupé, pas de défilement horizontal |
| 8 | Lisibilité | contraste suffisant en plein jour ; rien ne repose sur la seule couleur |
| 9 | Cibles | sur mobile, chaque cible se touche sans toucher sa voisine |

Modèle de relevé :

| Écran | Poste | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Centre d'information | A | | | | | | | | | | |

## Après la passe

Transmettre la grille remplie à l'assistant. Chaque défaut « bloquant » ou
« gênant » devient une ligne de la file A ; un défaut « mineur » est routé au
plan. La passe est **faite** quand les trois postes ont parcouru les huit
étapes et que le poste B a parcouru l'Observatoire praticien ; D-TRUST-05,
D-C5-01 et `DETTE_UX_RESIDUELLE.md:49` se soldent alors au registre de leurs
campagnes.
