'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PortesBiologiquesApiResponse } from '@/app/api/praticien/assiettes-indiquees/portes-biologiques/route';
import type { DernierResultat } from '@/lib/clinical/portesBiologiquesService';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';

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

/** « autre » ne se dit que si une assiette est affichée à côté. */
function phraseSansResultat(nombre: number, aCote: boolean): string {
  const autre = aCote ? (nombre === 1 ? 'autre ' : 'autres ') : '';
  return nombre === 1
    ? `1 ${autre}assiette n’est pas affichée : aucun de ses marqueurs n’a de résultat au dossier.`
    : `${nombre} ${autre}assiettes ne sont pas affichées : aucun de leurs marqueurs n’a de résultat au dossier.`;
}

export function PortesBiologiquesSection({ idPatient }: { idPatient: string }) {
  // Mode consultation de la fiche ([[D-354]] §2) : la valeur biologique se
  // masque ; la date de prélèvement et la provenance restent.
  const chiffresMasques = useChiffresMasques();
  // MÊME DISCIPLINE QUE LA CARTE QUI LA PORTE : chaque état est daté du dossier
  // qui l'a produit, et un jeton écarte une réponse en retard. Une valeur
  // biologique servie sous le mauvais dossier est la pire des erreurs possibles
  // ici.
  const [payload, setPayload] = useState<{ pour: string; corps: PortesBiologiquesApiResponse } | null>(null);
  const [erreur, setErreur] = useState<{ pour: string; message: string } | null>(null);
  const jeton = useRef(0);

  // Rend `true` quand la lecture a abouti ET que le corpus a été interrogé :
  // c'est ce qui décide où va le focus après « Réessayer ».
  const lire = useCallback(async (): Promise<boolean> => {
    jeton.current += 1;
    const courant = jeton.current;
    try {
      const reponse = await fetch(
        `/api/praticien/assiettes-indiquees/portes-biologiques?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const corps = (await reponse.json()) as PortesBiologiquesApiResponse;
      if (jeton.current !== courant) return false;
      if (!corps.ok) {
        setErreur({ pour: idPatient, message: corps.error });
        return false;
      }
      // UNE RÉPONSE ILLISIBLE SE DIT, ELLE NE FAIT PAS TOMBER LA CARTE. Sans ce
      // contrôle, une réponse `actif` sans `portes` levait au rendu — et
      // emportait avec elle la carte des indications, puis le cockpit
      // (constaté par le banc de `ClinicalRuntimeSection`, dont le mock sert la
      // même réponse à toutes les URL).
      if (corps.actif === true && !Array.isArray(corps.portes)) {
        setErreur({ pour: idPatient, message: 'Réponse illisible de la biologie des assiettes.' });
        return false;
      }
      setErreur(null);
      setPayload({ pour: idPatient, corps });
      return corps.actif !== true || corps.corpusLu;
    } catch {
      if (jeton.current === courant) {
        setErreur({ pour: idPatient, message: 'Lecture impossible de la biologie des assiettes.' });
      }
      return false;
    }
  }, [idPatient]);

  useEffect(() => {
    setPayload(null);
    setErreur(null);
    void lire();
  }, [lire]);

  // « Réessayer » (T-17, emplacement neuf de PRA-3b) relit la seule lecture
  // des portes, sans effacer ce qui est affiché ; désactivé pendant la
  // relecture. Le focus suit, une fois la relecture rendue : le titre si elle
  // aboutit, le bouton sinon.
  const titreRef = useRef<HTMLHeadingElement>(null);
  const reessayerRef = useRef<HTMLButtonElement>(null);
  const [relecture, setRelecture] = useState(false);
  const [focusApres, setFocusApres] = useState<'titre' | 'reessayer' | null>(null);
  useEffect(() => {
    if (focusApres === null || relecture) return;
    if (focusApres === 'titre') titreRef.current?.focus();
    else reessayerRef.current?.focus();
    setFocusApres(null);
  }, [focusApres, relecture, payload, erreur]);
  const relire = async () => {
    setRelecture(true);
    let lue = false;
    try {
      lue = await lire();
    } finally {
      setRelecture(false);
      setFocusApres(lue ? 'titre' : 'reessayer');
    }
  };

  const lecture = payload !== null && payload.pour === idPatient ? payload.corps : null;
  const messageErreur = erreur !== null && erreur.pour === idPatient ? erreur.message : null;

  // SEULE UNE ASSIETTE EXPLOITABLE PARAÎT (amendement du 2026-09-30 à
  // [[D-247]]) : au moins un de ses marqueurs porte un résultat au dossier.
  // Sans résultat, la section recopiait cinq assiettes de citations suivies de
  // « aucun résultat au dossier » — du bruit sur tout dossier sans biologie.
  // Le filtre lit la PRÉSENCE d'un résultat, jamais sa valeur : rien n'est
  // comparé, ni trié par le résultat ([[D-245]] §1).
  const portes = lecture?.ok && lecture.actif === true ? lecture.portes : [];
  const exploitables = portes.filter(porte => porte.marqueurs.some(marqueur => marqueur.dernier !== null));
  const sansResultat = portes.length - exploitables.length;
  const anomalie = lecture?.ok === true && lecture.actif === true
    && (!lecture.corpusLu || lecture.retireesFauteDeClaim > 0);

  // Fermée, pas encore arrivée, ou rien d'exploitable sans anomalie à dire :
  // rien. Même motif que la carte — un titre qui apparaît puis disparaît se lit
  // comme un défaut.
  if (messageErreur === null && (lecture === null || !lecture.ok || lecture.actif === false)) return null;
  if (messageErreur === null && exploitables.length === 0 && !anomalie) return null;

  // Un seul « Réessayer », sous l'échec qu'il reprend : la lecture, sinon
  // l'interrogation du corpus.
  const boutonReessayer = (
    <button
      ref={reessayerRef}
      type="button"
      onClick={() => void relire()}
      disabled={relecture}
      className="mt-2 min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
    >
      Réessayer
    </button>
  );

  return (
    // `<section>` ET NON `<div>` : `aria-labelledby` sur un élément sans rôle ne
    // nomme rien pour un lecteur d'écran — la région n'existait pas.
    <section className="mt-5 border-t border-border pt-4" aria-labelledby="portes-biologiques-title">
      <h4
        id="portes-biologiques-title"
        ref={titreRef}
        tabIndex={-1}
        className="rounded text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Biologie : ce que disent les sources, ce que mesure le dossier
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Chaque source est citée telle quelle, à côté du dernier résultat saisi au dossier. Aucune
        comparaison n’est faite : le rapprochement vous revient.
      </p>

      {messageErreur && (
        <p role="alert" className="mt-3 text-sm text-status-danger">{messageErreur}</p>
      )}
      {messageErreur && boutonReessayer}

      {lecture?.ok && lecture.actif === true && (
        <>
          {!lecture.corpusLu && (
            <p role="alert" className="mt-3 text-sm text-status-danger">
              Le corpus n’a pas pu être interrogé : aucune source n’est citée pour ce dossier.
            </p>
          )}
          {!lecture.corpusLu && !messageErreur && boutonReessayer}
          {lecture.corpusLu && lecture.retireesFauteDeClaim > 0 && (
            <p role="alert" className="mt-3 text-sm text-status-warning">
              {lecture.retireesFauteDeClaim === 1
                ? '1 assiette n’est pas affichée : une de ses sources ne satisfait pas les critères de validité du corpus.'
                : `${lecture.retireesFauteDeClaim} assiettes ne sont pas affichées : une de leurs sources ne satisfait pas les critères de validité du corpus.`}
            </p>
          )}
          <ul className="mt-3 grid gap-3">
            {exploitables.map(porte => (
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
                      {marqueur.dernier && chiffresMasques ? (
                        <>
                          <ValeurMasquee /> — prélevé le {dateLisible(marqueur.dernier.preleveLe)},{' '}
                          {PROVENANCE[marqueur.dernier.source] ?? marqueur.dernier.source}
                        </>
                      ) : marqueur.dernier
                        ? `${valeurLisible(marqueur.dernier)} — prélevé le ${dateLisible(marqueur.dernier.preleveLe)}, ${PROVENANCE[marqueur.dernier.source] ?? marqueur.dernier.source}`
                        : 'aucun résultat au dossier'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {/* COMPTÉES, JAMAIS TUES — y compris quand seule une anomalie tient
              la section ouverte : « autre » ne se dit que s'il y en a une
              d'affichée. */}
          {sansResultat > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {phraseSansResultat(sansResultat, exploitables.length > 0)}
            </p>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Périmètre signé : {lecture.shaPerimetre.slice(0, 12)}…
          </p>
        </>
      )}
    </section>
  );
}
