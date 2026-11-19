### Refonte Lien, PRA-6f : le statut d'une phase en attente passe en encre dans le rail des phases de la fiche (2026-11-18)

Lot du constat à l'écran de PRA-6 (`pra6-constat.md`, §3.6, axe
`color-contrast`). Dans le rail des phases de la fiche, le statut de la phase
due (« à traiter », « en attente du patient »…) restait en gris atténué
(`text-muted-foreground`) sur le fond argile `bg-accent/10`, posé sur la sauge
du rail (`bg-muted`) : 4,51:1 au repos (limite, relevé par axe), 4,35:1 au
survol (`bg-accent/[.14]`). Il passe en encre (`text-foreground`, jeton
existant) : 8,93:1 au repos, 8,61:1 au survol.

Les autres états gardent le gris atténué, au-dessus du seuil : 4,92:1 sur la
sauge (phase faite ou à venir, survol compris : le survol ne change que la
couleur du libellé), 5,84:1 sur la carte de la phase affichée (`bg-surface`).
Le thème praticien n'a pas de mode sombre. Ni taille, ni graisse, ni texte, ni
décor ; ni route, ni garde, ni drapeau, ni schéma.

Écarté : `text-accent-ink` (4,96:1 au repos, 4,79:1 au survol), qui passe aussi
mais de peu.

Banc : `FichePatientPanel.test.tsx` vérifie la classe du statut de la phase
due et le gris atténué des autres (rouge sur le mutant). Captures de référence
de la fiche régénérées par `visual-baselines`.
