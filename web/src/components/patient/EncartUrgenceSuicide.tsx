import { ENCART_URGENCE } from '@/lib/securite/urgenceSuicide';

// Encart d'urgence ([[D-275]]) : affiché sans condition sur les écrans qui
// posent une question sur le suicide. Le texte a été relu et validé par le
// responsable le 2026-10-09 (phrase du 114 précisée le même jour, sur revue) ; les libellés des numéros viennent de
// `ENCART_URGENCE`, eux-mêmes repris de la page d'information publiée.

const lien = 'font-semibold underline underline-offset-2 text-foreground';

export function EncartUrgenceSuicide({ className = '' }: { className?: string }) {
  const [prevention, samu, europeen, sms] = ENCART_URGENCE.numeros;
  return (
    <aside
      role="note"
      aria-label={ENCART_URGENCE.titre}
      className={`rounded-lg border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-sm text-foreground ${className}`}
    >
      <p className="font-semibold">{ENCART_URGENCE.titre}</p>
      <p className="mt-1">
        Si vous avez des idées suicidaires, appelez le{' '}
        <a href={`tel:${prevention.numero}`} className={lien}>{prevention.numero}</a>, {prevention.libelle}.
        En cas de danger immédiat, appelez le{' '}
        <a href={`tel:${samu.numero}`} className={lien}>{samu.numero}</a> ({samu.libelle}) ou le{' '}
        <a href={`tel:${europeen.numero}`} className={lien}>{europeen.numero}</a> ({europeen.libelle}).
        Si vous ne pouvez pas parler ou entendre, même temporairement&nbsp;: le{' '}
        <span className="font-semibold">{sms.numero}</span>, par SMS ou application.
      </p>
      <p className="mt-1">{ENCART_URGENCE.delai}</p>
    </aside>
  );
}
