### La lettre d'adressage existe : le blocage a enfin une sortie (2026-09-16)

Un signal d'alerte de rang `adressage` **inhibe** la chaîne clinique — plus de
priorité proposée, aucun protocole diffusable — et le texte de conduite signé dit
« avis médical à évaluer en priorité, avant toute proposition ». C'est la seule
raison *cliniquement obligatoire* d'écrire à un médecin dans tout le produit, et
elle n'avait **aucun chemin** : aucune surface n'offrait le geste, rien ne
consignait qu'il avait eu lieu. Six dossiers sur vingt-cinq sont concernés
(production, 2026-08-23). Le praticien lisait « décision suspendue » et écrivait au
médecin hors de l'outil, sans trace au dossier.

**Le geste est à l'endroit du blocage.** Le panneau se monte dans le bloc « Ce qui
suspend la décision », sous les constats — et non trois écrans plus loin dans
l'onglet Correspondance. On lit ce qui bloque, et la sortie est là.

**Rien n'est recalculé, tout est recopié.** Le générateur ne cote aucun signal,
n'en invente aucun, ne lit aucun score. La route relit les signaux par
`signauxDeclares`, la fonction pure que le runtime clinique utilise déjà : deux
lectures différentes feraient diverger la lettre du blocage qu'elle porte. Les
libellés déclarés et le texte de conduite du rang sont recopiés depuis la table
signée, au caractère près.

**Le filtrage suit le producteur de constats, au cas près** — rang `adressage`
retenu, `vigilance` écarté, et **libellé inconnu de la cotation retenu, avec une
marque `(†)` et une phrase qui le dit**. Un signal dont on ne sait pas le rang est
un silence sur le rang, jamais une permission (`DC-13`, `DC-24`).

**Cotation non signée ⇒ aucune lettre**, refus explicite en 409 : verrou fermé, le
moteur ne produit aucun constat, et une lettre qui annoncerait un adressage n'aurait
rien derrière elle. Ce verrou est l'inverse des autres tables du dépôt — il retire
une inhibition au lieu d'éteindre un moteur —, et la route le respecte au lieu de
le contourner.

**La lettre dit sa provenance** : les signaux sont *déclarés par le patient*, ne
proviennent d'aucune passation, n'ont fait l'objet d'aucun examen, et ne constituent
ni un diagnostic ni une hypothèse. Sans cette phrase, une déclaration passerait pour
une mesure — sur un papier qui part chez un médecin.

**Son ancrage est le patron `D-073`, et c'est lui qui exigeait `D-215`** : SHA
vivant de la table de sécurité, littéral de version estampillé puis enregistré dans
la table des ancrages connus. Sans cette ligne, chaque lettre lirait « référence
inconnue » dans le fil — et, sous le verdict en dur d'avant, « ancrage périmé ».

**Un drapeau neuf et éteint**, `WN_ADRESSAGE_COURRIER`, là où le fil médecin n'en a
aucun : le fil consigne un geste déjà fait, cette route **produit** un document qui
nomme des signaux d'alerte et part vers un tiers. Son GET de disponibilité ne nomme
aucun dossier, et ne part que là où le geste pourrait s'afficher — deux bancs du
cockpit l'ont exigé, dont celui qui promet que la fixture ergonomique ne contacte
aucun serveur.

**Ce que le lot ne fait pas : lever l'abstention.** Une lettre consignée *trace*
l'adressage, elle ne le vaut pas — l'écran le dit au praticien avant qu'il clique.

**La revue a trouvé neuf choses, et trois comptaient vraiment.** Une réponse de
route qui revenait après un changement de dossier y déposait la lettre du patient
précédent — nom dans l'en-tête imprimable, signaux déclarés dans le texte ; le
dossier courant est désormais lu au retour de la requête. Le rendu médecin portait
un titre et un cadre en dur, si bien que cette lettre s'imprimait sous « éléments à
discuter » alors qu'elle ne transmet aucune exploration — le cadre suit maintenant
le modèle. Et le geste était offert sur un dossier qui ne porte que des constats
d'effet indésirable, où la route répond 409 : l'éligibilité se lit sur la SOURCE du
constat, par un préfixe que le producteur compose et que l'écran lit, dans un seul
module feuille.

Vérifié par mutation : retirer l'entrée `safety-signals-nnpp2-v1` de la table des
ancrages fait lire `reference_inconnue` là où le banc du fil attend `concordante` ;
remplacer `signauxDeclares` par une liste vide fait rougir le banc qui épingle les
signaux servis au générateur.
