### Le praticien voit ce que son patient lira, avant de le lui diffuser (2026-09-16)

La première des cinq dettes laissées ouvertes par `D-200` se referme, et elle en
portait deux.

**Une SECONDE description de la vue patient vivait dans le cockpit.**
`ProtocolConsultationPanel` recomposait à la main, depuis `ProtocolDraft`, ce que
le patient lit — sans passer par le contrat, et en ignorant `interventionStatus` :
une intervention suspendue s'y affichait comme un conseil ferme. La liste des
conditions de validation y était recopiée elle aussi, et elle ne comptait pas les
actions : un protocole sans action déverrouillait un aperçu vide, un protocole à
quatre actions en montrait quatre.

**Et cet aperçu était le seul du cockpit, inerte en production.** `protocolDraft`
était forcé à `null` hors fixture : sur un dossier réel, le praticien validait
pour diffusion sans avoir jamais vu une ligne de ce que son patient allait lire.

Le contenu patient est désormais projeté par un module unique
(`contenuPatientProtocole.ts`), que `buildPatientProtocolView` enveloppe et signe
pour la diffusion, et que l'aperçu appelle nu. **La séparation est contenu /
attestation, pas une seconde description** : les deux sortent du même code, et un
banc les compare champ pour champ. Aucune approbation n'est fabriquée pour
afficher un aperçu — un aperçu n'atteste rien.

Le miroir de diffusion sert maintenant cet aperçu, **pris sur la version active**
— celle que le bouton validerait — et non sur celle déjà approuvée : `servieAuPatient`
dit ce qui est servi aujourd'hui, l'aperçu dit ce qui le sera après le geste. Un
refus porte son motif : carte non rejouable, contenu illisible, ou refus du
contrat, avec sa phrase. Un aperçu vide aurait appris au praticien qu'il n'a rien
à montrer, jamais qu'il a quelque chose à lever.

`limitations` reste rendu par aucun écran — dette 4 de `D-200`, toujours ouverte,
et nommée dans le banc qui l'écarte plutôt que masquée par lui.
