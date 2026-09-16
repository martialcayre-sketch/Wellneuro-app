### Protocole 21 jours — une action peut désormais attendre un bilan (2026-09-15)

La boucle **arbitrage biologique → révision de protocole** était livrée, testée à
trois étages — domaine, route, parcours E2E — et **indéclenchable** : le panneau
d'arbitrage n'apparaît que si une version active porte une action en attente de
biologie, et **aucune surface n'en posait**.

Le dépôt se contredisait sur qui devait la poser. Le constructeur rendait le statut
en lecture seule au nom de `D-056` — « jamais saisi à la main » ; l'en-tête du
parcours E2E affirmait l'inverse — « c'est le praticien qui la pose ». `D-130` disait
« le geste d'écran reste dû », et la file d'attente posait deux chemins **sans les
départager**. Aucune décision ne tranchait : `D-190` le fait.

**Le praticien suspend, il n'active pas.** Le seul statut qu'il pose à la main est
« en attente du bilan biologique », avec ce qu'on attend. Les actions qu'il ne
suspend pas restent actives. La crainte de `D-056` était qu'une intention naisse
*active* sans règle derrière : ce geste ne fait que **retenir**, jamais libérer — et
l'arbitrage 5 de `D-056` disait déjà qu'une intention conditionnelle n'est pas une
recommandation. Les trois autres statuts non actifs restent la **sortie** d'un
arbitrage, jamais une saisie.

**Le contrat est demandé, jamais déduit.** Une soumission qui porte une suspension
demande explicitement le contrat V4 ; sans suspension, elle reste en V1 — faire
basculer des protocoles que rien n'oblige à changer de contrat serait gratuit, et V4
exige alors un statut sur **chaque** action.

**Un défaut de sortie corrigé dans le même geste.** La révision après arbitrage
appelait l'enregistrement **sans version** : la soumission retombait en V1, et la
route répondait `409 version_contrat_incompatible`. La boucle n'était donc pas
seulement sans amorce — **son geste de sortie était incompatible avec le contrat
qu'il révise**.

Le panneau d'arbitrage, seul composant du cockpit sans banc de composant parce qu'il
était inatteignable, en reçoit un.

Voir [[D-190]].
