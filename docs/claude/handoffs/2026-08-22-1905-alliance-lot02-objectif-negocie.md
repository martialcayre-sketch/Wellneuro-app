# 2026-08-22 19:05 — Alliance 6.0-A LOT-02 : l'objectif négocié, une négociation qui laisse une trace

## Ce qui a changé

- **Un objectif négocié se pose au dossier** : l'énoncé du patient, la
  reformulation du praticien, la priorité retenue, et ce qui est assumé
  « non traité pour l'instant », daté et motivé. Surface au rail du cockpit,
  phase « Compréhension » — ce bloc vit **hors du runtime clinique**
  (`FichePatientPanel.tsx`), donc le panneau reste visible sans épisode
  confirmé. C'est mesuré, pas supposé : la plainte dominante et le contexte
  patient ne sortent que du POST de confirmation d'épisode.
- **Append-only par référence, et la forme le dit** : la route ne porte ni
  `PATCH` ni `DELETE`, il n'existe pas de verbe pour écraser. Réviser crée une
  ligne qui référence la précédente. Quand plusieurs têtes de chaîne
  coexistent — la protection « lecture puis 409 » n'est pas étanche à une
  course — **elles sont toutes affichées**, jamais départagées en silence.
- **L'énoncé du patient est recopié côté serveur** depuis la ligne supplantée,
  après vérification qu'elle appartient au même dossier ; jamais repris du
  corps de la requête. `enonce_patient` étant NOT NULL non vide sur chaque
  ligne, laisser l'appelant le réécrire permettrait de faire dire au patient,
  révision après révision, autre chose que ce qu'il a dit.
- **Le matériau d'anamnèse s'affiche à côté de la saisie**, jamais dedans —
  trois champs (`motif_principal`, `objectif_prioritaire`, `attentes`), trois
  absences distinctes, trois libellés distincts (`DC-24`). La plainte Q_MOD_03
  n'est pas reprise : la recalculer aurait été toucher au moteur.
- **La ratification est lue, jamais écrite.** `sens` est un geste du patient ;
  une route praticien écrivante fabriquerait un acte que le patient n'a pas
  posé. Une ratification absente s'affiche « pas encore proposé au patient »,
  jamais « non ratifié » — ce dernier porterait un jugement.
- **Aucune migration, aucune colonne, aucun drapeau.** Les tables datent du
  LOT-01 ; l'absence de drapeau est un arbitrage commenté (surface praticien).

## Ce qui a été prouvé, et comment

Onze gardes structurelles sur les deux lots du jour, **chacune vue rouge par
une mutation réelle** puis remise au vert. Pour ce lot : clés exposées
épinglées au type-check, aucune propriété de mesure ordonnée, la priorité qui
ne s'ordonne pas (trois libellés suggérant fortement un ordre rendent l'ordre
de `creeLe`), la date d'écriture jamais transmise, aucun `update`/`delete` hors
l'effacement RGPD nommé, aucun moteur clinique importé.

**Vérifié en production avant d'écrire une ligne** : les tables de l'alliance
appartiennent au rôle applicatif `wellneuro_3449` lui-même et
`relforcerowsecurity = f` — le propriétaire contourne la RLS deny-all. Sans
cette lecture par conteneur, T2 et T3 seraient restés verts sur une production
incapable d'insérer.

## Ce que la revue a trouvé, et que je n'aurais pas vu

- **Un 500 atteignable sans session.** `null`, `42`, `"texte"`, `[]` sont du
  JSON valide : le `catch` du parse ne les voyait pas, et la déstructuration du
  corps levait **avant** la garde d'authentification.
- **Deux gardes plus étroites que leur intitulé.** `clinical-engine` ne couvre
  pas `clinical/` : un import d'`orientationService` passait vert. Et le
  balayage ignorait le panneau — or c'est au **rendu** qu'un tri de `priorite`
  serait le plus naturel à introduire, G3 n'assertionnant que
  `objectifsCourants`, que l'UI n'est pas obligée d'employer.
- **La ratification n'était tenue que par un mock** : l'invariant « lue, jamais
  écrite » est devenu structurel.
- **Une troncature au clavier** (`maxLength`) contredisait le « par refus,
  jamais troncature » de la route. Remplacée par un compteur visible.
- **Reformuler perdait la priorité en silence** : les champs praticien de la
  version révisée sont désormais repris.

## Ce qui reste ouvert

- **Aucune cadence** sur les routes praticien, comme partout dans le dépôt :
  sur une table append-only qu'aucune purge ne raccourcit, un POST répété
  allonge une chaîne indéfiniment.
- **Le journal d'accès grossit d'une ligne par passage sur l'onglet
  « Compréhension »** — le panneau est démonté puis remonté à chaque bascule.
- **Deux têtes de chaîne restent atteignables** en cas de course. Parti pris
  assumé : rendues visibles, jamais écartées. Un verrou en base serait une
  décision distincte.
- **Un dossier désactivé reçoit le message « clôturé »**, qui décrit un autre
  état — hérité de `patient/cycleDeVie`, partagé par les autres routes.
- La surface est **visible dès le déploiement** pour tout compte praticien du
  domaine ; aucun repli autre qu'un revert.

## Piège du jour, à ne pas redécouvrir

**Le hook de fraîcheur juge le répertoire courant de la session, pas le
worktree du fichier édité.** Une écriture dans un worktree à jour est refusée
si le répertoire courant est resté sur une copie principale en retard — et le
message affiche le `HEAD` de cette copie, ce qui égare. Se placer dans le
worktree du lot avant d'écrire.

Corollaire : `commande > log 2>&1; echo "code=$?"` fait rapporter au harnais le
code de l'`echo`, toujours `0`. **Un T2 rouge s'est présenté comme vert.** Lire
le verdict dans le log, jamais un code de retour ainsi construit.
