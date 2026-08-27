### La source signée se vérifie au serveur, et l'exception à `G7-1` est bornée (`D-115`)

La contre-revue adverse du 2026-08-27 a **réfuté** l'affirmation `N2.2` — « le
moteur cite et n'invente jamais » — sur un contre-exemple exécuté.

**Le défaut.** La route de proposition acceptait du **navigateur** le couple
`{regle, texte, shaPerimetre}` et le persistait comme `regle_signee` après
n'avoir vérifié qu'une **forme** : 64 caractères hexadécimaux, un identifiant
plausible. Une règle inventée, syntaxiquement valide, était servie au praticien
puis au patient comme **citée d'une table signée que le registre ne contient
pas**.

**Ce n'était pas un oubli** : la route le disait, faute de pouvoir importer
`lib/clinical/` sous `G7-1`. Mais une garde qui documente le trou qu'elle laisse
reste un trou — la contre-revue a traversé par là.

**Le correctif.** `G7-1` s'amende dans **un seul sens** : un adaptateur serveur
(`sourceSigneeVerifiee.ts`) lit le registre des règles de priorité. La route
**confronte** le périmètre reçu à celui du serveur et **recopie** le texte des
règles depuis le registre.

**L'exception est bornée, et les bornes rougissent** (`G7-1 bis`, quatre
bancs) : le module pur n'importe toujours rien ; la route n'atteint le registre
que par l'adaptateur ; l'adaptateur ne lit que le registre — ni moteur, ni
scoring, ni instruments, ni équilibre ; il ne fabrique aucun texte, il recopie
ou rend `null`. Sans ces bornes, l'amendement se lirait « `G7-1` sauf quand
c'est pratique ».

**Les fail-closed sont durcis, jamais assouplis.** Registre non signé ⇒ 503.
Périmètre reçu différent de celui du serveur ⇒ 409, « rechargez la fiche »,
plutôt qu'une substitution silencieuse. SHA **absent** ⇒ refus, comme avant :
y substituer le SHA du serveur aurait signé à la place du cockpit.

**Ce qui change à l'écran, et pourquoi ce n'est pas une régression.** Le
registre ne publie aujourd'hui que **deux** règles ; les quatre autres sont
écartées. Un candidat que le registre ne publie pas n'est **plus** cité — il
l'était, sous une signature qu'il n'avait pas. La surface propose donc au plus
deux propositions. C'est la mesure réelle de ce qui est signé : l'élargir
demande de **publier des règles**, pas d'assouplir la vérification (`D-093`).

**Aucune modification clinique** au sens de `DC-17`/`DC-18` : aucun seuil, dose
ni borne n'est touché. Aucune règle n'est ajoutée, retirée ni modifiée — c'est
leur **vérification** qui change.
