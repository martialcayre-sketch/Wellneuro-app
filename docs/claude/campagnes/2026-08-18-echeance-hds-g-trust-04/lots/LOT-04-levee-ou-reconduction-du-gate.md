---
id: "LOT-04"
statut: "à faire"
---

# LOT-04 — G-TRUST-04 change d'état, avec sa preuve

## But

Le gate porte un état neuf — **levé** ou **reconduit** — écrit là où il se
décide, daté, signé, et les porteurs machine du dépôt le reflètent au lieu de
répéter une prémisse périmée.

## Où le gate vit réellement

Le brief de campagne visait `.wn/state.json` **et**
`docs/claude/REGISTRE_FRONTIERES.md`. **C'est inexact pour le second** : le gate
n'y figure pas, ce fichier ne fait que **renvoyer** vers sa source. Les porteurs
réels, par ordre d'autorité :

| Porteur | Rôle |
|---|---|
| `campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md` | **Source.** C'est là que la décision du responsable du 2026-07-21 est consignée, et là qu'une reconduction doit être « datée et signée ici ». Les sept exigences y sont tenues une par une. |
| `docs/DECISIONS.md` | Le `D-xxx` du responsable. |
| `.wn/state.json` (`blocking_issues`) | Vue machine. Se met à jour **après** la source, jamais à sa place. |
| `docs/claude/REGISTRE_FRONTIERES.md` | Ne porte qu'un **renvoi** — à corriger seulement s'il devient faux. |

## Les deux issues, et ce que chacune exige

**Reconduction.** La décision du 2026-07-21 pose sa propre forme : « soit
l'hébergement a été déplacé, soit la décision est reconduite explicitement,
datée et signée ici ». Une reconduction porte donc un **nouveau terme**, et ne
change pas la nature de l'objet — un écart assumé, borné et daté, pas une mise
en conformité. Les six exigences partielles et l'exigence ❌ restent ce
qu'elles sont.

**Levée.** Elle ne découle **pas** de la migration. Le gate est un ET sur sept
exigences : migrer lève la première, les six autres restent partielles. Une
levée exige donc que chacune soit portée à ✅ sur preuve — ce que ce lot
constate, sans jamais l'arbitrer.

## Périmètre

- La checklist du gate — l'état neuf, daté et signé.
- `.wn/state.json`, `blocking_issues` — après la source.
- `docs/claude/REGISTRE_FRONTIERES.md` — seulement si son renvoi devient faux.
- Fragment `changelog.d/`.

## Interdits

- **Cocher une exigence sans preuve relue.** La checklist ouvre elle-même sur
  « ce document ne lève rien » — il ne prend son sens que si chaque ✅ est gagné.
- **Lever le gate par arbitrage partiel** : « c'est un ET, pas un OU ».
- **Écrire l'état machine avant la source.** `.wn/state.json` est partagé entre
  sessions : édition ciblée, jamais réécriture.
- Rédiger le `D-xxx` du responsable d'initiative.

## Dépendances

LOT-01 (l'arbitrage), et LOT-02 si l'arbitrage est « migrer ».

## Tests

Documentaire : T1 + anti-secrets. `node scripts/wn-etat-reel.mjs` rapporte
l'état réel du dépôt — il ne répare rien, et c'est ce qu'on lui demande ici.

## Critères de done

- [ ] La checklist du gate porte l'état neuf, **daté et signé** par le
      responsable, avec le nouveau terme si c'est une reconduction.
- [ ] Chaque exigence passée à ✅ l'est sur une preuve relue, citée.
- [ ] `.wn/state.json` ne déclare plus G-TRUST-04 bloquant sur une prémisse
      périmée ; s'il reste bloquant, c'est sur l'état réel.
- [ ] Le renvoi de `REGISTRE_FRONTIERES.md` est encore vrai, ou corrigé.
- [ ] Fragment `changelog.d/` écrit.
