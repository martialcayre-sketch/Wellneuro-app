## 2026-09-03 — feat(ui) : la primitive de superposition s'ouvre sans déclencheur, et son thème ne se devine plus

Étape 1 du lot Primitive de l'audit (2026-09-02) : rendre `PanneauSuperpose`
adoptable par les onze sites qui recâblent Radix Dialog à la main.

**Le déclencheur devient facultatif.** Un panneau piloté par son parent
(`open`/`onOpenChange`) n'a pas de bouton à lui : il vit dans une ligne de liste
ou un menu d'actions. Sans cette faculté, les dialogues de confirmation ne
pouvaient pas adopter la primitive — Radix rendait un `Trigger` vide qu'aucun
geste n'atteignait. Le patron était déjà dupliqué dans `TiroirBibliotheque`.

**Le thème passe de `string` à `'praticien' | 'patient'`, sous garde.** La
valeur par défaut reste `praticien` — neuf appelants sur dix vivent dans le
cockpit —, mais ce défaut est aussi le piège : une surface patient qui adopte la
primitive sans passer `theme="patient"` se repeint aux couleurs du cabinet, et
rien ne le signale. Ni `tsc`, ni un banc de rendu n'assertionnent des couleurs.
`PanneauSuperpose.guard.test.ts` balaie `components/patient`,
`components/patient-companion` et `app/portail` et refuse un montage qui ne se
nomme pas. La garde est prouvée rouge sur des sources synthétiques avant d'être
appliquée à l'arbre : aucune surface patient n'a encore migré, et une garde qui
ne balaie que du vide est décorative.

Ce n'est pas une crainte théorique : c'est la faute symétrique de celle corrigée
le jour même sur `DossierConfirmDialog` et `AnnulationAssignationDialog`, où
l'écran d'effacement définitif d'un dossier s'affichait aux couleurs du patient.

**`PatientPreview` migre en premier** — c'est lui qui avait servi de patron à la
primitive, il en devient un appelant. Trente lignes d'overlay, de correctif
`data-theme` et de bouton de fermeture disparaissent. Son thème reste
`praticien` à dessein : le dialogue s'ouvre dans le cockpit et son cadre
appartient au praticien qui le consulte ; seul le corps rendu est celui du
portail.

**La largeur de tiroir devient un choix nommé** — `focale` (440 px, la zone
focale du cockpit), `standard` (`max-w-xl`), `large` (`max-w-2xl`) — au lieu
d'un booléen à deux valeurs. Le relevé a tranché l'écart que l'audit signalait :
les QUATRE tiroirs de formulaire du dépôt — Bibliothèque, Patients, rayon
biologie, rayon compléments — ont choisi `max-w-xl` chacun de leur côté, et la
primitive ne le proposait pas. L'unanimité de l'existant fait loi : c'est la
primitive qui s'aligne, pas quatre panneaux qui se déplacent. Un lot de
convergence retire de la duplication, il ne redessine pas des écrans au passage.

Les huit migrations restantes (tiroirs de la Bibliothèque et des Patients, les
deux dialogues de confirmation, les deux rayons) suivent dans un diff séparé, et
se feront désormais **à apparence constante**.
