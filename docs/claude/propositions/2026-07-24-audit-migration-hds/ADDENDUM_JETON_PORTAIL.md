# Addendum — hachage du jeton portail permanent : un arbitrage produit, pas un correctif

Date : 2026-07-24. Complète la section « Correctifs immédiats » de
`AUDIT_MIGRATION_HDS.md`, dont le point n° 3 (« hacher
`patients.access_token` ») s'avère, à l'instruction, **non mécanique**. Les
deux autres correctifs sont livrés (PR #335 pseudonymisation Anthropic,
PR #336 motif hors des e-mails).

## Pourquoi ce n'est pas un simple hachage

Le jeton permanent n'est pas seulement *vérifié* — il est **relu** pour
reconstruire l'URL du portail à chaque envoi :

- `lib/consultation/portal-access.ts` (`withActivePortalAccess`) relit
  `patients.access_token` et rebâtit `buildPortalUrl(accessToken)` à chaque
  création d'assignation ou renvoi de lien ;
- l'e-mail promet au patient un lien « **personnel et permanent** : vous
  pourrez y revenir à tout moment » (`lib/consultation/email.ts`).

Hacher la colonne rend cette relecture impossible : on ne reconstruit pas une
URL depuis une empreinte. Il n'existe donc pas de version « stockage haché,
comportement identique ».

## Les deux options réelles

1. **Rotation à chaque envoi.** On ne stocke que l'empreinte ; chaque envoi
   génère un jeton neuf et invalide le précédent. Conséquence produit : les
   liens déjà reçus meurent à chaque renvoi — la promesse « permanent »
   devient « le dernier lien reçu ». Migration de données requise (hacher
   l'existant), donc PR à migration + parcours patient touché → protocole
   complet (revue adversariale avant, vérification base après).
2. **Achever la bascule liens magiques (G4/G5).** L'infrastructure cible
   existe déjà et stocke **uniquement des empreintes HMAC-SHA256**
   (`lib/portail/lienMagique.ts`, table dédiée, usage unique, rejeu tracé).
   Le schéma la documente comme remplaçant « PROGRESSIVEMENT » le jeton
   permanent, dont la coexistence pendant la bascule est une exigence du
   registre (`REGISTRE_FRONTIERES.md`). Éteindre le jeton permanent est la
   vraie fin de ce chantier — et le correctif n° 3 en est un sous-produit
   gratuit.

## Recommandation

Ne pas hacher la colonne isolément. Traiter le correctif n° 3 comme le
**critère de sortie de la bascule G4/G5** : quand le chemin lien magique +
Google est le chemin nominal, révoquer les jetons permanents (la colonne
`access_token_revoked` existe déjà) puis supprimer la colonne. Décision à
inscrire au registre le moment venu ; d'ici là, l'exposition résiduelle est
un jeton par patient, en base uniquement, révocable unitairement.
