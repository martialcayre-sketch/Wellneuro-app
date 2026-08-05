### Le drapeau de l'agenda alimentaire s'allume en Production, et la Preview est exclue (2026-08-05)

`D-022` posait que `WN_AGENDA_ALI` s'allumerait « sur Development et Preview, et
sur elles seules ». `D-024` retourne la restriction : c'est la **Preview** qui est
désormais exclue, et la Production qui porte le drapeau.

La Preview est fermée par deux verrous indépendants — `ssoProtection:
all_except_custom_domains` place les URLs `*.vercel.app` derrière le SSO Vercel,
et le callback OAuth envoyé par l'application pointe sur `app.wellneuro.fr`,
quand l'URL d'une preview change à chaque déploiement. Le Development, lui, est
bien atteignable : les E2E y déroulent le parcours complet, drapeau forcé, sans
passer par Google. Mais un serveur local éphémère ne porte pas trois semaines de
recueil. Le précédent maison tranchait déjà dans ce sens pour le lien magique :
« Production seule — jamais Preview, qui lit la base de production ».

Le motif du report, lui, est éteint : `D-022` différait l'allumage parce que
`Q_ALI_09` deviendrait assignable « sans qu'aucun écran ne le consomme », et
`LOT-04` a livré cet écran.

#### Ce que l'allumage expose, et ce qu'il n'expose pas

Aucune lecture clinique — `scoring.type = 'journal'` ne lit rien et rend
`scored: false` ; ni barème, ni indice, ni seuil, qui sont l'objet de `LOT-05`.
Rien ne s'auto-assigne **aujourd'hui**, mais la phrase porte une date :
`assignPackToPatient` part de l'onboarding portail, donc sans clic praticien, et
n'écarte que `IDS_SUSPENDUS`. Un `Q_ALI_09` entré dans un pack serait assigné
automatiquement. Aucun des 8 packs ne le référence au 2026-08-05 ; c'est un
prérequis à revérifier, pas un acquis — et rien ne valide les `qids` d'un pack
contre `IDS_SUSPENDUS`. La vérification a fait tomber un constat de bordure : la
graine déclare quatre identifiants pour le pack par défaut sous le commentaire
« reflète le pack `parDefaut` réel », quand la production en porte cinq. Consigné,
non corrigé.

L'extinction referme toutes les surfaces, vérifiées une à une : GET et POST de la
route agenda, hub, bibliothèque, route d'assignation, `patient/submit`. Aucun
cron ne s'exécute. Les journées déjà notées restent en base, le modèle étant
append-only.

#### Le recueil pilote ne peut pas se faire sur un patient de graine

Le motif qui vaut pour les trois : leur adresse `@fictif.wellneuro.fr` n'existe
pas, quand le lien d'entrée au portail part par e-mail et que l'interface ne
l'affiche pas — un essai sur une fixture ne testerait jamais la moitié de la
chaîne que le patient voit en premier. S'y ajoutent la mutation par les E2E et,
au 2026-08-05, un `actif = false` sur deux des trois qui suffirait à faire
refuser l'assignation. Ce dernier état est daté : les E2E le retournent sans le
restaurer.

La règle appliquée est celle déjà payée par le gate G4 le 2026-07-21 : « la
précaution qui compte n'est pas "un patient fictif", c'est **aucune boîte d'un
tiers** ». Le dossier de contrôle porte une adresse relevant du praticien.

Marche à suivre, prérequis vérifiables et retour arrière :
`docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md`.

#### Ce qui reste ouvert

L'interface ne dira pas « pilote » : faute de `sections` et de bloc
`certification`, la bibliothèque affichera « 0 question — Statut inconnu », ce
qui se lit comme un instrument défaillant. Aucun écran praticien ne lit les
journées : la calibration de `LOT-05` passera par `execute_sql` et rien d'autre.
Et la donnée qu'elle aura à calibrer sera recueillie sous les six manques du
handoff `LOT-04`, puisqu'ils ne peuvent se corriger qu'avant un recueil dont
l'absence est justement ce qui bloque.
