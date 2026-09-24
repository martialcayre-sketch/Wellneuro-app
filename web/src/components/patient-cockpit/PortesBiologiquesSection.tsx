'use client';

import { useEffect, useRef, useState } from 'react';
import type { PortesBiologiquesApiResponse } from '@/app/api/praticien/assiettes-indiquees/portes-biologiques/route';
import type { DernierResultat } from '@/lib/clinical/portesBiologiquesService';

// CE QUE DISENT LES SOURCES, CE QUE MESURE LE DOSSIER — côte à côte, jamais
// comparés ([[D-245]], table signée [[D-246]]).
//
// L'ÉCRAN NE DIT RIEN QUE LA SOURCE NE DISE. Les claims sont cités ENTIERS ; le
// dernier résultat est affiché avec son unité, sa date et sa provenance ; et
// entre les deux, aucun mot de la machine : ni « élevé », ni « bas », ni
// « normal », ni « hors plage », aucune couleur, aucun tri par la valeur. Le
// rapprochement est le geste du praticien ([[D-157]]), qui porte le contexte que
// `DC-46` exige — inflammation, traitement, âge — et que cet écran ignore.
//
// `import type` SEULEMENT : le service importe Prisma et la table signée, qui
// ne doivent pas entrer au paquet du navigateur (`bundleClient.guard.test.ts`).

const PROVENANCE: Record<string, string> = {
  saisie_praticien: 'saisi au dossier',
  import_labo: 'importé du laboratoire',
};

/** La valeur telle que la base la porte, virgule décimale — aucun arrondi. */
function valeurLisible(dernier: DernierResultat): string {
  const valeur = dernier.valeur.replace('.', ',');
  return dernier.unite && dernier.unite !== 'ratio' ? `${valeur} ${dernier.unite}` : valeur;
}

function dateLisible(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

export function PortesBiologiquesSection({ idPatient }: { idPatient: string }) {
  // MÊME DISCIPLINE QUE LA CARTE QUI LA PORTE : chaque état est daté du dossier
  // qui l'a produit, et un jeton écarte une réponse en retard. Une valeur
  // biologique servie sous le mauvais dossier est la pire des erreurs possibles
  // ici.
  const [payload, setPayload] = useState<{ pour: string; corps: PortesBiologiquesApiResponse } | null>(null);
  const [erreur, setErreur] = useState<{ pour: string; message: string } | null>(null);
  const jeton = useRef(0);

  useEffect(() => {
    jeton.current += 1;
    const courant = jeton.current;
    setPayload(null);
    setErreur(null);
    (async () => {
      try {
        const reponse = await fetch(
          `/api/praticien/assiettes-indiquees/portes-biologiques?idPatient=${encodeURIComponent(idPatient)}`,
        );
        const corps = (await reponse.json()) as PortesBiologiquesApiResponse;
        if (jeton.current !== courant) return;
        if (!corps.ok) {
          setErreur({ pour: idPatient, message: corps.error });
          return;
        }
        // UNE RÉPONSE ILLISIBLE SE DIT, ELLE NE FAIT PAS TOMBER LA CARTE. Sans ce
        // contrôle, une réponse `actif` sans `portes` levait au rendu — et
        // emportait avec elle la carte des indications, puis le cockpit
        // (constaté par le banc de `ClinicalRuntimeSection`, dont le mock sert la
        // même réponse à toutes les URL).
        if (corps.actif === true && !Array.isArray(corps.portes)) {
          setErreur({ pour: idPatient, message: 'Réponse illisible de la biologie des assiettes.' });
          return;
        }
        setPayload({ pour: idPatient, corps });
      } catch {
        if (jeton.current === courant) {
          setErreur({ pour: idPatient, message: 'Lecture impossible de la biologie des assiettes.' });
        }
      }
    })();
  }, [idPatient]);

  const lecture = payload !== null && payload.pour === idPatient ? payload.corps : null;
  const messageErreur = erreur !== null && erreur.pour === idPatient ? erreur.message : null;

  // Fermée, ou pas encore arrivée : rien. Même motif que la carte — un titre
  // qui apparaît puis disparaît se lit comme un défaut.
  if (messageErreur === null && (lecture === null || !lecture.ok || lecture.actif === false)) return null;

  return (
    <div className="mt-5 border-t border-border pt-4" aria-labelledby="portes-biologiques-title">
      <h4 id="portes-biologiques-title" className="text-sm font-semibold text-foreground">
        Biologie : ce que disent les sources, ce que mesure le dossier
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Chaque source est citée telle quelle, à côté du dernier résultat saisi au dossier. Aucune
        comparaison n’est faite : le rapprochement vous revient.
      </p>

      {messageErreur && (
        <p role="alert" className="mt-3 text-sm text-status-danger">{messageErreur}</p>
      )}

      {lecture?.ok && lecture.actif === true && (
        <>
          {!lecture.corpusLu && (
            <p role="alert" className="mt-3 text-sm text-status-danger">
              Le corpus n’a pas pu être interrogé : aucune source n’est citée pour ce dossier.
            </p>
          )}
          {lecture.corpusLu && lecture.retireesFauteDeClaim > 0 && (
            <p role="alert" className="mt-3 text-sm text-status-warning">
              {lecture.retireesFauteDeClaim} assiette(s) ne sont pas affichées : une de leurs sources
              n’est plus valide au corpus.
            </p>
          )}
          {lecture.corpusLu && lecture.portes.length === 0 && lecture.retireesFauteDeClaim === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Aucune source biologique n’est en service.</p>
          )}

          <ul className="mt-3 grid gap-3">
            {lecture.portes.map(porte => (
              <li key={porte.ligneId} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{porte.libelle}</p>

                <p className="mt-2 text-xs font-medium text-foreground">Ce que disent les sources</p>
                <ul className="mt-1 grid gap-2">
                  {porte.claims.map(claim => (
                    <li key={`${claim.claimId}@${claim.versionClaim}`}>
                      <blockquote className="border-l-2 border-border pl-2 text-xs text-foreground">
                        {claim.texte}
                      </blockquote>
                      <p className="mt-0.5 pl-2 text-xs text-muted-foreground">{claim.claimId}</p>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs font-medium text-foreground">Ce que mesure le dossier</p>
                <ul className="mt-1 grid gap-1">
                  {porte.marqueurs.map(marqueur => (
                    <li key={marqueur.analyteCode} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{marqueur.libelle}</span>
                      {' : '}
                      {marqueur.dernier
                        ? `${valeurLisible(marqueur.dernier)} — prélevé le ${dateLisible(marqueur.dernier.preleveLe)}, ${PROVENANCE[marqueur.dernier.source] ?? marqueur.dernier.source}`
                        : 'aucun résultat au dossier'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-muted-foreground">
            Périmètre signé : {lecture.shaPerimetre.slice(0, 12)}…
          </p>
        </>
      )}
    </div>
  );
}
