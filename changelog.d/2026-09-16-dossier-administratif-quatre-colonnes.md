### Le dossier patient gagne son adresse, son NIR et son médecin traitant (2026-09-16)

Quatre colonnes nullables sur `patients`, et rien d'autre : **migration seule**
(`D-087`), aucun code consommateur. Le geste qui les remplira arrive au lot
suivant, après application constatée en production.

**LE SEUL MÉDECIN DU SCHÉMA ÉTAIT UN TEXTE LIBRE PAR LETTRE.**
`correspondances_medecin.medecin_libelle` est saisi à chaque courrier : deux
lettres au même dossier pouvaient nommer deux médecins sans que rien ne les
distingue. Les deux colonnes neuves portent le médecin **traitant**, propriété
du dossier — l'autre reste ce qu'elle est.

**LA BASE GARDE LA FORME DU NIR, PAS SA CLÉ, ET C'EST ÉCRIT DES DEUX CÔTÉS.**
Quinze caractères, avec `2A`/`2B` pour la Corse — seul endroit où un NIR porte
une lettre, et l'oublier ferait refuser un assuré par la base avec un message
intraduisible à l'écran. La clé de contrôle (`97 − n mod 97`) se vérifie côté
application, où le refus est explicite plutôt que rendu comme une violation de
contrainte. **Le contrat SQL porte un cas POSITIF qui l'éprouve** : un NIR de
forme juste mais de clé fausse passe en base. Si ce cas rougit un jour, c'est
qu'un calcul de clé aura été ajouté en SQL — et le commentaire qui dit
l'inverse sera devenu faux.

**LE CONTRAT A RATTRAPÉ SA PROPRE FIXTURE.** Première écriture : `2A` placé au
8ᵉ rang du NIR au lieu du 6ᵉ. Le contrat a rougi, et il avait raison — c'était
la constante qui se trompait, pas la contrainte. Un contrat qui ne teste que
des cas qu'on a choisis pour passer ne teste rien.

**LA COLONNE NIR N'EST PAS UNIQUE, et ce n'est pas un oubli** : deux dossiers
créés par erreur pour la même personne doivent pouvoir coexister le temps qu'on
les réconcilie. Un index unique transformerait cette faute de saisie en `23505`
opaque au milieu d'un formulaire.

**AUCUN CHIFFREMENT AU REPOS** — arbitrage du responsable. Le dépôt n'en porte
aucun ; en introduire un pour un seul champ créerait une gestion de clés sans
précédent, rendrait le NIR non recherchable, et le perdrait avec la clé. Ce qui
protège ces colonnes est ce qui protège déjà le dossier : base HDS, RLS
deny-all, garde d'appartenance, journal des accès praticien.

**LA RUBRIQUE 5 DU DOSSIER RGPD EST MISE À JOUR, ET RIEN NE L'Y OBLIGEAIT.** Le
banc qui la tient au schéma ne compare que des **noms de tables** : quatre
colonnes de plus ne l'auraient pas fait rougir. Les trois catégories nouvelles y
sont déclarées — et la **qualification juridique du NIR y est écrite comme DUE
au responsable de traitement**, que le dossier refuse explicitement de poser
dans le code.
