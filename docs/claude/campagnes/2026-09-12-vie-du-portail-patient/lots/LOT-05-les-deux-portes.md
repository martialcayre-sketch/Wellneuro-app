---
id: "LOT-05"
titre: "les-deux-portes"
statut: "livré puis RETIRÉ le 2026-09-12 — arbitrage du responsable"
dépend_de: "—"
---

# LOT-05 — Les deux écrans qui n'avaient pas de porte

## But

`/portail/<token>/ce-qui-compte` et `/portail/<token>/comprehension` **existent**
et ne sont atteignables que de biais :

- « Ce qui compte » — **depuis le dossier à deux voix uniquement**, lui-même
  derrière un lien de la nav « Autres espaces ». Un patient qui n'ouvre pas son
  dossier ne sait pas que l'écran existe.
- « Ce que j'ai compris » — **depuis « Mon accompagnement », replié**, ou depuis
  le dossier à deux voix. Un texte que le praticien écrit POUR le patient, et
  qu'il faut deux gestes et un dépliage pour trouver, est un texte qui n'arrive
  pas.

## Résultat observable

Deux liens de plus dans la nav « Autres espaces » du hub, à côté de leur aîné
`LienDossierDeuxVoix` : « Dire ce qui compte pour moi » et « Lire ce que mon
praticien a compris ».

## Comment la visibilité se décide

Par **sonde**, patron de `LienDossierDeuxVoix` : le hub est un composant CLIENT
et les drapeaux ne sont pas `NEXT_PUBLIC_*`. Les deux routes ont déjà ce qu'il
faut — le `GET` de `ce-qui-compte` **est** un interrupteur, et `comprehension`
porte `?interrupteur=1`. Aucune route n'a été modifiée, **aucun texte clinique
n'est transporté pour être jeté**, et aucun événement « un texte a été SERVI »
n'est émis pour une page que personne n'a ouverte.

**FAIL-CLOSED** : sans un « oui » franc, pas de lien. Un lien vers un écran qui
rendra `notFound()` est pire que pas de lien — le patient clique et tombe.

## Écart assumé

**Ni l'une ni l'autre porte ne dit s'il y a quelque chose derrière.** Le savoir
demanderait de lire le contenu, donc de le servir. Les pages, elles, savent dire
« votre praticien n'a pas encore partagé » et « le dépôt est clos pour ce
cycle » : une porte qui s'explique vaut mieux qu'une porte qui s'efface
(`DC-24`).

## Preuves

**T1 vert. T2 verte. Huit mutations jouées, huit mutants tués** — dont les trois
qui comptent : le lien affiché sans sonde, la sonde qui ignore `ouvert`, et
l'échec réseau qui ouvrirait la porte.

## RETIRÉ LE JOUR MÊME — et le lot avait tort

Arbitrage du responsable, sur copie d'écran, quelques heures après la mise en
service : **« avoir ajouté *dire ce qui compte pour moi* et *ce que le praticien
a compris* est inutile puisque cela est déjà dans *mon dossier à deux voix* ; il
faut retirer ces boutons. »**

Le lot avait vu juste sur le fait — aucun lien direct depuis l'accueil — et faux
sur le remède. Les deux écrans vivent **dans** le dossier à deux voix, qu'un lien
de cette même nav ouvre déjà. Deux boutons de plus ne donnaient pas un accès :
ils ajoutaient du bruit à une navigation qui en portait cinq.

**CE QUI MANQUE VRAIMENT N'EST PAS UNE PORTE, C'EST UNE INVITATION.** « Jamais le
patient n'a d'invitation à le saisir », dit le responsable de « ce qui compte
pour moi ». Une invitation est une **tâche** — elle paraît quand elle est due et
s'en va quand elle est faite. Elle appartient au fil du jour, pas à une
navigation permanente. C'est ce que livre le chantier qui suit.
