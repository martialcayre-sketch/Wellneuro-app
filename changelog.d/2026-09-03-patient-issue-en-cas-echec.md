### Le patient n'est plus laissé sans issue quand quelque chose échoue (2026-09-03)

Deux trous, une même finalité — donner une suite à quelqu'un que le service
vient de laisser en plan.

**La redemande de lien répondait « envoyé » même quand l'envoi avait échoué.**
C'est délibéré et cela ne change pas : la route renvoie la même phrase que
l'adresse corresponde ou non à un espace patient, sinon le canal deviendrait un
oracle d'énumération, et son `catch` répond donc « envoyé » jusque sur une
panne SMTP ou base. Mais aucun recours n'était indiqué : la personne attendait
indéfiniment un e-mail qui n'arriverait jamais. Le message dit désormais quoi
faire si rien n'arrive — courriers indésirables, puis praticien — dans les
mêmes termes pour tout le monde, ce qui couvre le spam, l'adresse inconnue et
la panne sans permettre de les distinguer. Deux bancs le figent : le recours
est présent, et il ne nomme aucune des trois causes.

**Une page du portail qui échouait tombait sur `global-error.tsx`**, du HTML
système hors charte qui remplace la page entière. `app/portail/error.tsx`
reprend la main dans le layout du portail et dit les quatre choses utiles : ce
n'est pas de votre faute, ce que vous avez transmis est conservé, réessayez,
et votre praticien reste le recours. Il ne nomme aucun sous-traitant ni
composant — cela n'aiderait pas un patient et renseignerait qui sonde le
service ; la transparence sur les sous-traitants a son lieu, le document de
confidentialité du registre TRUST. Un banc garde cet invariant, un autre
vérifie que le message de l'exception n'atteint jamais l'écran.

**Et la porte la plus empruntée des deux : le 404.** La revue adversariale a
relevé que fermer « erreur » en laissant « page absente » n'avait pas de sens —
le segment appelle `notFound()` en cinq endroits, un drapeau éteint suffit à
déclencher, et tous atterrissaient sur la page par défaut de Next, en anglais,
hors charte, sans recours. `app/portail/not-found.tsx` la remplace, au même
niveau de discrétion que l'écran de lien indisponible : il ne dit pas si
l'adresse a existé.

Trois autres corrections viennent de cette revue. Le bouton « Réessayer »
rafraîchit d'abord le rendu serveur : `reset()` seul rejoue le payload en
échec, et le bouton paraissait ne rien faire — l'impasse même que l'écran doit
supprimer. L'écran d'échec est annoncé (`role="alert"`) et prend le focus,
sans quoi un lecteur d'écran ne signale pas le remplacement du contenu. Et la
référence technique passe en contraste plein : c'est la chaîne qu'on relève au
téléphone.

**Portée à ne pas surestimer**, écrite dans le fichier : ce filet ne joue que
si l'application répond. Si l'hébergeur est indisponible, c'est son routeur qui
sert la page et rien de tout ceci ne s'exécute — d'où la page d'état hébergée
ailleurs, qui reste à faire. Deux autres limites sont désormais dites plutôt
que supposées : `digest` n'est posé que par le rendu serveur, donc la ligne
« Référence » n'apparaît pas sur une erreur du navigateur, et aucune trace n'en
subsiste faute de rapporteur d'erreurs câblé au build ; et sur panne SMTP, le
praticien vers qui le message renvoie reçoit lui aussi un faux succès — le lien
qu'il vient d'émettre existe pourtant et pourrait lui être montré. Ces deux
chantiers sont hors de ce lot.
