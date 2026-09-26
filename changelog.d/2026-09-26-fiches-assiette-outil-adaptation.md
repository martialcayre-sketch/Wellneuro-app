### Fiche d'assiette : l'outil d'adaptation hors ligne (2026-09-26)

- **Lot 5 de `D-251`.** `tools/corpus/fiches/` adapte pour le patient la Fiche
  MY d'une assiette, puis la dépose comme **brouillon** par la route du lot 4.
- **Rédaction.** Sonnet rédige sous une consigne versionnée
  (`fiche-assiette-v1`, avec l'empreinte de ses fichiers épinglée par un banc).
- **Contre-lecture.** GPT contre-lit chaque élément ; un désaccord l'exclut sans
  repêchage. Une précaution refusée fait échouer la fiche entière : une réserve
  ne part jamais tronquée ni absente.
- **Contrôles.** Le vrai contrat du lot 4 et les vrais contrôles du lot 2 sont
  rejoués avant tout envoi, importés de `web/src` et non recopiés. Le hook
  d'alias des outils du corpus résout désormais les imports relatifs sans
  extension d'un fichier `.ts`.
- **Entrées vérifiées.** L'empreinte du PDF est recalculée contre le manifeste,
  les pages extraites doivent correspondre aux marqueurs, et chaque claim local
  doit redonner son empreinte.
- **Dépôt.** Il exige une cible écrite en toutes lettres, jamais lue dans
  l'environnement.
- **Contre-lecture, compléments.** Chaque élément est relu dans son contexte :
  un bloc sous le titre de sa section. Une section amputée est relue entière.
  Une contre-lecture incomplète (panne, réponse coupée) fait échouer la fiche au
  lieu de l'amputer.
- **Contrôles du lot 2, corrigés** d'après les premiers essais réels et la
  revue adverse :
  - le balisage Markdown de l'extraction est retiré avant de comparer un
    verbatim et de lire les nombres ;
  - un verbatim se cherche dans une seule ligne ou cellule, et ne peut plus
    joindre deux cellules ;
  - un nom à chiffre (« oméga-3 », « B12 ») n'est plus lu comme une quantité,
    mais doit exister dans une source ; « oméga 3 », « omega-3 » et
    « oméga‑3 » sont un seul nom ;
  - le texte patient ne peut plus porter de balisage ni de marqueur ;
  - « diagnostiqué », « posologie » et « dosage » rejoignent le lexique
    proscrit.
- **La CI** traite les consignes comme du code : une PR qui ne touche qu'elles
  fait tourner le banc d'empreinte.
- **Aucun texte de fiche au dépôt ni au terminal** : les sorties restent sous
  `~/.wellneuro/corpus/fiches/`. Les journaux des SDK sont coupés, et aucune
  erreur n'est imprimée par son message.
