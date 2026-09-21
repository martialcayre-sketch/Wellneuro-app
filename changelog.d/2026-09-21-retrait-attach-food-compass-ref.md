### `attachFoodCompassRef` est retirée — ce n'était pas du code mort, c'était la copie faible d'un invariant (2026-09-21)

**L'arbitrage a été demandé par l'usage, pas par le calendrier.** Le drapeau des
assiettes indiquées a servi son premier dossier réel ce matin — cinq lectures
journalisées sur deux dossiers — et le praticien a formulé le manque depuis
l'écran : les assiettes s'affichent, on ne peut ni les sélectionner ni les
valider. C'est conforme au lot qui les a posées, qui s'interdisait tout geste.
Mais le manque a désormais une **date de demande**, et plus seulement une date
d'écriture.

**Le dernier verrou devant ce geste était B1**, le sort d'`attachFoodCompassRef`.
Il est tranché : retirée.

**Et la prémisse de l'arbitrage était inexacte.** Le cadrage la disait « morte de
bout en bout » : c'est vrai de la FONCTION — aucun appelant hors son propre banc
— et **faux du champ qu'elle posait**. `foodCompassRef` est vivant, écrit au
geste praticien par le constructeur de protocole et lu par la voie patient. La
retirer « parce que la référence d'aliment serait obsolète » aurait enterré une
fonctionnalité en service. La correction est écrite avant la suppression, pas
après.

**La vraie raison est meilleure que celle qu'on lui prêtait.** La route des
versions de protocole exige un protocole source actif, refuse si C5 est éteinte,
contrôle la référence contre le brouillon actif — puis **la RE-DÉRIVE** depuis
les données officielles et compare son empreinte. Elle ne valide pas ce qu'on lui
soumet : elle le recalcule. La fonction retirée, elle, validait une référence
soumise. Un fail-closed dupliqué est un fail-closed qu'on oublie de corriger dans
l'une de ses deux copies — et celle-ci était déjà la plus faible.

**Le banc le plus fourni couvrait le chemin mort.** Un cas entier était consacré
aux gardes de la fonction retirée, quand le constructeur vivant est éprouvé
ailleurs. Les assertions qui visaient ses gardes propres sont parties avec elle ;
celles qui s'en servaient comme FIXTURE ont gardé leur objet — les gardes sur un
brouillon persisté, la relecture, la caducité d'une approbation. Le brouillon est
désormais fabriqué par une fixture locale **qui ne garde rien, et qui le dit**.

Rien n'est touché du champ, de la voie patient, d'une table signée ou d'un seuil.
Aucune migration, aucun drapeau. Ce retrait ne rend pas l'assiette
sélectionnable : il débloque le lot qui le fera.
