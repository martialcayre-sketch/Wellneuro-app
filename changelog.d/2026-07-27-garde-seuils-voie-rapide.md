### La voie rapide ne signe plus une plage de référence (2026-07-27)

L'audit du 2026-07-27 avait montré qu'au moins 55 des 563 claims du notebook 08
éligibles à la signature par lot portaient une borne de décision — la grille
ferritine en cinq bandes, les trois seuils d'homocystéine, les bandes HAD et
DASS21. L'allowlist ne les arrêtait pas, et ce n'était pas un défaut
d'étiquetage : ni `typologie_lecture` ni `prescriptif` n'encode « ce claim porte
une borne ». Ce lot pose le critère manquant, sur le **contenu**.

**`public.rag_claim_porte_seuil` est la définition unique du motif** (migration
`20260727140000`). Cinq requêtes de `revue.ts` et le trigger d'insertion du
journal l'appellent — les six endroits où la voie rapide s'éprouve, l'`UPDATE`
qui écrit `VALIDE` compris. Une définition par site aurait divergé au premier
ajustement ; c'est d'ailleurs sur une énumération à quatre sites au lieu de six
que la rédaction de l'audit avait trébuché.

Un claim porteur d'une borne n'est ni rejeté ni caché : **seule la signature par
lot lui est fermée**, il part en revue individuelle.

**Chaque alternative du motif est mesurée, aucune n'est écrite au jugé.**
Rappel **55/55** sur la vérité de terrain de l'audit, précision **55/84** (65 %).
Quatre alternatives ont bougé après mesure, dans les deux sens :

- resserrées — `u?i? ?/ ?l` avait ses deux lettres optionnelles et matchait
  n'importe quel « /l » ; `en de..` attrapait « en dehors », « en demandant »,
  « en deux », soit 26 captures de plus que `en de(ssous|çà)` dont 23 que rien
  d'autre n'attrapait ; `cible` n'attrapait que « tissus cibles » et « gènes
  cibles » et sort du motif ;
- élargies — ` < | > ` exigeait des espaces des deux côtés et manquait la forme
  collée : `(^|[^p])[<>] ?=? ?[0-9]` récupère « >2 % de lipides » et « >70 %
  cacao » tout en écartant les p-values, qui sont 7 des 11 claims concernés. Et
  le `u` de la classe d'unités couvre le micro rendu en ASCII (« ug/L »), sortie
  courante d'une extraction PDF — zéro occurrence aujourd'hui, l'alternative est
  une assurance sans coût.

Le rappel a été revérifié à 55/55 après chaque changement.

**Coût praticien assumé et chiffré** : sur tout le corpus, 1511 claims éligibles
à la voie rapide deviennent 1254 — **257 (17 %) basculent en revue
individuelle**. Le garde sur-capture d'un tiers ; il ne laisse rien passer parmi
les claims porteurs d'un chiffre.

**Un banc épingle le motif** (`prisma/checks/rag_claim_garde_seuils_v1.sql`,
câblé en CI) : 37 cas, plus le contrôle que la fonction est bien `IMMUTABLE`.
Les textes réels du corpus ne suffisaient pas — presque tous matchent par deux
familles de motifs ou plus, si bien qu'une mutation famille par famille a montré
que les familles « vocabulaire » et « optimum », l'ancre de début de chaîne et
l'alternative espacée ` < | > ` n'étaient épinglées par **rien**. Sept sondes
construites, à une seule porte d'entrée chacune, comblent ce trou : retirer une
famille fait désormais tomber le banc. Sans lui, « rappel 55/55 » resterait une
mesure faite une fois en production et jamais rejouable. Le contrat du journal
reçoit un cas 7d symétrique côté trigger. Les deux bancs ont été **éprouvés par
mutation** : un garde neutralisé les fait tomber tous les deux.

Ce que le motif ne voit pas, et qu'il faut savoir : un claim sans aucun chiffre.
L'audit avait exclu 318 claims sur ce critère, par hypothèse explicite.

Aucune donnée touchée : ni statut, ni signature, ni claim. Les 27 claims déjà
signés par lot sans avoir été tirés, que le garde aurait écartés, restent
`VALIDE` — leur sort est une décision séparée.
