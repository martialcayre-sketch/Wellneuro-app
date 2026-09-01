### La version Node de production cesse de flotter — `engines.node` épinglé (2026-09-01)

Le buildpack Scalingo affichait « No Node.js version specified, resolving
current LTS version » et installait Node 24.19.0, pendant que le CI et les
postes de développement tournent sur Node 22 : la production suivait la LTS
du moment, et aurait sauté silencieusement de version majeure au prochain
changement de LTS. `web/package.json` porte désormais
`engines.node: "22.x || 24.x"` — la production reste exactement sur ce
qu'elle exécute aujourd'hui (le buildpack résout la plus haute version
compatible, donc 24.x), les postes en 22 restent conformes sans
avertissement `EBADENGINE`, et la dérive vers une future LTS est stoppée.
L'écart résiduel dev/CI (22) ↔ production (24) est connu et volontairement
non tranché ici : l'aligner est un arbitrage séparé, pas un épinglage.
