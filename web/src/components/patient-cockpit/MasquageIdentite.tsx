'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as EvenementPointeur } from 'react';
import {
  echelleRendu,
  PAGES_MAX,
  pointDansPage,
  QUALITE_JPEG,
  TAILLE_MAX_PAGE_OCTETS,
  TOTAL_MAX_OCTETS,
  zoneEntre,
  type Zone,
} from '@/lib/biology-library/import/masquage';

// LE MASQUAGE DE L'IDENTITÉ AVANT LA LECTURE ([[D-284]] §5, lot (j)).
//
// Le praticien voit chaque page du compte rendu et y trace des rectangles sur
// l'identité du patient. Les zones sont BRÛLÉES dans les pixels (noir plein)
// avant l'envoi : l'image envoyée n'a ni calque ni zone détachable. Seules ces
// pages, réencodées par le serveur, partent ensuite au service de lecture.
//
// Un PDF se rend ici (pdf.js, chargé à la demande, travailleur servi par le
// même domaine) ; une photo se dessine telle quelle. Le grand côté d'une page
// est porté à `COTE_RENDU_PX` : c'est ce que le fournisseur lit de toute façon.

type Page = { source: HTMLCanvasElement; largeur: number; hauteur: number };
type ZonePlacee = { page: number; zone: Zone };
type Trace = { page: number; depart: { x: number; y: number }; courant: { x: number; y: number } };

const BOUTON = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const BOUTON_PRIMAIRE =
  'min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';

function canevas(largeur: number, hauteur: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  return c;
}

async function rendrePdf(octets: ArrayBuffer): Promise<Page[] | 'trop_de_pages'> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  // La TÂCHE porte `destroy()` : elle libère le document et son travailleur.
  const tache = pdfjs.getDocument({ data: new Uint8Array(octets) });
  try {
    const document_ = await tache.promise;
    if (document_.numPages > PAGES_MAX) return 'trop_de_pages';
    const pages: Page[] = [];
    for (let n = 1; n <= document_.numPages; n++) {
      const page = await document_.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: echelleRendu(base.width, base.height, true) });
      const source = canevas(Math.floor(viewport.width), Math.floor(viewport.height));
      await page.render({ canvas: source, viewport }).promise;
      pages.push({ source, largeur: source.width, hauteur: source.height });
    }
    return pages;
  } finally {
    await tache.destroy();
  }
}

async function rendreImage(octets: ArrayBuffer, typeMime: string): Promise<Page[]> {
  const image = await createImageBitmap(new Blob([octets], { type: typeMime }));
  const echelle = echelleRendu(image.width, image.height, false);
  const source = canevas(Math.round(image.width * echelle), Math.round(image.height * echelle));
  source.getContext('2d')?.drawImage(image, 0, 0, source.width, source.height);
  image.close();
  return [{ source, largeur: source.width, hauteur: source.height }];
}

/** La page et ses zones, noircies — ce qui s'affiche, et ce qui part. */
function dessiner(cible: HTMLCanvasElement, page: Page, zones: Zone[], apercu: Zone | null) {
  const ctx = cible.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(page.source, 0, 0);
  ctx.fillStyle = '#000';
  for (const z of zones) ctx.fillRect(z.x, z.y, z.largeur, z.hauteur);
  if (apercu) {
    ctx.globalAlpha = 0.6;
    ctx.fillRect(apercu.x, apercu.y, apercu.largeur, apercu.hauteur);
    ctx.globalAlpha = 1;
  }
}

function enJpeg(c: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', QUALITE_JPEG));
}

export function MasquageIdentite({
  urlDocument,
  typeMime,
  urlEnregistrement,
  idCompteRendu,
  onEnregistre,
  onAnnuler,
}: {
  urlDocument: string;
  typeMime: string;
  urlEnregistrement: string;
  idCompteRendu: string;
  onEnregistre: () => void | Promise<void>;
  onAnnuler?: () => void;
}) {
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [zones, setZones] = useState<ZonePlacee[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [aucuneIdentite, setAucuneIdentite] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const affichages = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const response = await fetch(urlDocument);
        if (!response.ok) throw new Error('document');
        const octets = await response.arrayBuffer();
        const rendues = typeMime === 'application/pdf' ? await rendrePdf(octets) : await rendreImage(octets, typeMime);
        if (annule) return;
        if (rendues === 'trop_de_pages') {
          setErreur(`Un compte rendu de plus de ${PAGES_MAX} pages ne peut pas être masqué ni lu.`);
          setEtat('erreur');
          return;
        }
        setPages(rendues);
        setEtat('pret');
      } catch {
        if (annule) return;
        setErreur('Le document n’a pas pu être affiché pour le masquage.');
        setEtat('erreur');
      }
    })();
    return () => {
      annule = true;
    };
  }, [urlDocument, typeMime]);

  const apercuDe = useCallback((t: Trace | null, n: number): Zone | null => {
    if (!t || t.page !== n) return null;
    return zoneEntre(t.depart, t.courant, pages[n]);
  }, [pages]);

  useEffect(() => {
    pages.forEach((page, n) => {
      const cible = affichages.current[n];
      if (cible) dessiner(cible, page, zones.filter(z => z.page === n).map(z => z.zone), apercuDe(trace, n));
    });
  }, [pages, zones, trace, apercuDe]);

  function point(e: EvenementPointeur<HTMLCanvasElement>, n: number) {
    const cadre = e.currentTarget.getBoundingClientRect();
    return pointDansPage({ x: e.clientX, y: e.clientY }, cadre, pages[n]);
  }

  function commencer(e: EvenementPointeur<HTMLCanvasElement>, n: number) {
    if (aucuneIdentite || envoi) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = point(e, n);
    setTrace({ page: n, depart: p, courant: p });
  }

  function suivre(e: EvenementPointeur<HTMLCanvasElement>, n: number) {
    if (!trace || trace.page !== n) return;
    setTrace({ ...trace, courant: point(e, n) });
  }

  function finir(e: EvenementPointeur<HTMLCanvasElement>, n: number) {
    if (!trace || trace.page !== n) return;
    const zone = zoneEntre(trace.depart, point(e, n), pages[n]);
    if (zone) setZones(prev => [...prev, { page: n, zone }]);
    setTrace(null);
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const form = new FormData();
      form.append('idCompteRendu', idCompteRendu);
      form.append('zones', String(zones.length));
      if (aucuneIdentite) form.append('aucuneIdentite', '1');
      let total = 0;
      for (const [n, page] of pages.entries()) {
        const sortie = canevas(page.largeur, page.hauteur);
        dessiner(sortie, page, zones.filter(z => z.page === n).map(z => z.zone), null);
        const jpeg = await enJpeg(sortie);
        if (!jpeg) throw new Error('jpeg');
        if (jpeg.size > TAILLE_MAX_PAGE_OCTETS) {
          setErreur(`La page ${n + 1} dépasse 3,75 Mo une fois masquée.`);
          return;
        }
        total += jpeg.size;
        form.append('page', jpeg, `page-${n + 1}.jpg`);
      }
      if (total > TOTAL_MAX_OCTETS) {
        setErreur('Les pages masquées dépassent 20 Mo au total.');
        return;
      }
      const response = await fetch(urlEnregistrement, { method: 'POST', body: form });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setErreur(payload?.error ?? 'Le masquage n’a pas pu être enregistré.');
        return;
      }
      await onEnregistre();
    } catch {
      setErreur('Le masquage n’a pas pu être enregistré.');
    } finally {
      setEnvoi(false);
    }
  }

  const peutEnregistrer = etat === 'pret' && !envoi && (aucuneIdentite ? zones.length === 0 : zones.length > 0);

  return (
    <section aria-label="Masquer l’identité du patient" className="mt-2 rounded-lg border border-border/60 p-3">
      <h5 className="text-sm font-medium text-foreground">Masquer l’identité du patient avant la lecture</h5>
      <p className="mt-1 text-xs text-muted-foreground">
        Tracez un rectangle sur chaque mention qui identifie le patient, sur chaque page : nom, prénom, date de
        naissance, adresse, téléphone, e-mail, numéros de dossier ou de sécurité sociale. Seules les pages ainsi
        masquées sont transmises au service de lecture (Anthropic), jamais le document d’origine.
      </p>

      {etat === 'chargement' && (
        <p role="status" className="mt-2 text-sm text-foreground">Préparation des pages…</p>
      )}
      {erreur && <p role="alert" className="mt-2 text-sm text-status-danger">{erreur}</p>}

      {etat === 'pret' && (
        <>
          <ol className="mt-3 space-y-3">
            {pages.map((page, n) => (
              <li key={n}>
                <p className="text-xs text-muted-foreground">
                  Page {n + 1} sur {pages.length}
                  {zones.some(z => z.page === n) && ` — ${zones.filter(z => z.page === n).length} zone(s) masquée(s)`}
                </p>
                <canvas
                  ref={el => {
                    affichages.current[n] = el;
                  }}
                  width={page.largeur}
                  height={page.hauteur}
                  aria-label={`Page ${n + 1} du compte rendu : tracez un rectangle sur chaque mention d’identité`}
                  onPointerDown={e => commencer(e, n)}
                  onPointerMove={e => suivre(e, n)}
                  onPointerUp={e => finir(e, n)}
                  onPointerCancel={() => setTrace(null)}
                  className={`mt-1 h-auto w-full rounded border border-border ${aucuneIdentite ? '' : 'cursor-crosshair'}`}
                  style={{ touchAction: aucuneIdentite ? 'auto' : 'none' }}
                />
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setZones(prev => prev.slice(0, -1))}
              disabled={envoi || zones.length === 0}
              className={BOUTON}
            >
              Annuler la dernière zone
            </button>
            <button type="button" onClick={() => setZones([])} disabled={envoi || zones.length === 0} className={BOUTON}>
              Tout effacer
            </button>
            <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={aucuneIdentite}
                onChange={e => setAucuneIdentite(e.target.checked)}
                disabled={envoi || zones.length > 0}
              />
              Aucune identité sur ce document
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {zones.length > 0
              ? `${zones.length} zone(s) masquée(s).`
              : aucuneIdentite
                ? 'Vous déclarez qu’aucune mention n’identifie le patient : les pages partiront telles quelles.'
                : 'La lecture reste bloquée tant qu’aucune zone n’est masquée, ou que vous n’avez pas coché « Aucune identité sur ce document ».'}
          </p>
          <span className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void enregistrer()} disabled={!peutEnregistrer} className={BOUTON_PRIMAIRE}>
              Enregistrer le masquage
            </button>
            {onAnnuler && (
              <button type="button" onClick={onAnnuler} disabled={envoi} className={BOUTON}>
                Annuler
              </button>
            )}
          </span>
        </>
      )}
    </section>
  );
}
