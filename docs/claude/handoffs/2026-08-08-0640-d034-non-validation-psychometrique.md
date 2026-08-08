# Handoff — 2026-08-08 06:40 — D-034, la dette 2 fermée par un non

Hors campagne (aucune campagne active). Ferme la **dette 2** de la campagne
`2026-08-05-cloture-des-dettes-wellneuro-5-0`, déjà close.

## Ce qui est vrai maintenant

- **D-034** : la validation psychométrique **n'entre pas au programme**.
  Wellneuro repère et prépare une consultation, il ne mesure pas. Ce n'est pas un
  report — la dette est fermée par une décision, pas laissée ouverte.
- **La consigne système ne revendique plus la validation** : `synthese-v18` →
  **`synthese-v19`**. C'était la seule surface du **runtime** à l'affirmer.
- **« Certifié » a sa définition** là où le mot s'emploie
  (`docs/claude/corpus/README.md`) : *le code reproduit la règle enregistrée*,
  rien de plus.
- Verdict 5.0 révisé : **4 fermées (1, 2, 3, 7) / 1 reportée (8) / 3 ouvertes
  (4, 5, 6)**.

## Trois choses à ne pas refaire

1. **Ne pas nier la validité des instruments.** Ma première rédaction faisait
   dire au modèle que ces questionnaires ne sont pas validés. Le catalogue sert
   l'EORTC QLQ-C30, le PSQI, la HAD, l'Epworth — validés par ailleurs. C'était un
   **faux clinique**, dans le texte remis au patient. L'interdit porte sur
   **notre revendication**, jamais sur la nature de l'instrument.
2. **Corriger le code ne corrige pas les pièces qui le gouvernent.** Le prompt ne
   portait plus le faux ; l'énoncé de tête de D-034 et le fragment de changelog,
   si. Un fragment part tel quel dans le `CHANGELOG` — une décision dont le titre
   contredit son propre qualificatif rejoue la faute dans chaque lot qui la cite.
3. **Une exception de regex est un passe-partout.** `(?!\s+par\s+ailleurs)`,
   creusée pour épargner la phrase légitime, s'applique au texte entier :
   « Ces questionnaires sont validés par ailleurs, tu peux donc t'en prévaloir »
   passait vert. Forme retenue : **retirer la phrase connue, puis appliquer un
   motif sans exception**. C'est l'assertion de présence qui protège la nuance.

Piège technique à garder : **`\b` est inutilisable après « validé »** — en
JavaScript `\w` vaut `[A-Za-z0-9_]`, donc `é` n'est pas un caractère de mot et il
n'y a aucune frontière avant l'espace. Le garde laissait passer tout le
singulier. Ancrage explicite `(?![a-zàâäéèêëïîôöùûüç])` à la place.

## Ce qui reste dû, nommé et non fait

Les badges praticien affichent **« Certifié » sans porter la définition** que
D-034 pose (`web/src/components/BibliothequePanel.tsx`,
`FichePatientPanel.tsx`). Geste d'UI, hors périmètre d'une décision ; écrit dans
D-034 comme dû, pas prétendu fait. Porteur : le lot de la dette 6, ou un lot
d'UI dédié.

## Validation

T3 complet vert après correction du prompt (CI entière en 1 min 55, 340 tests
unitaires, 122 E2E). T2 rejoué vert après la réécriture du garde (5 min 3 s), la
consigne n'ayant plus bougé. Garde mutation-testé sur 8 mutations, dont les deux
phrases-pièges des deux passes de revue adversariale.
