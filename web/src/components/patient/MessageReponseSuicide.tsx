import { MESSAGE_REPONSE_SUICIDE } from '@/lib/securite/urgenceSuicide';

// Message sur réponse positive ([[D-277]] §1). Texte signé par le responsable
// le 2026-10-10. `role="alert"` : il apparaît au moment où le patient choisit
// sa réponse, et un lecteur d'écran doit l'annoncer sans qu'il ait à le
// chercher. L'encart permanent ([[D-275]] §1) reste affiché à côté.

const lien = 'font-semibold underline underline-offset-2';

export function MessageReponseSuicide({ className = '' }: { className?: string }) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-status-danger/60 bg-status-danger/10 px-3 py-2 text-sm text-foreground ${className}`}
    >
      <p className="font-semibold">{MESSAGE_REPONSE_SUICIDE.titre}</p>
      <p className="mt-1">
        Vous pouvez en parler dès maintenant, gratuitement, 24 h sur 24 : appelez le{' '}
        <a href="tel:3114" className={lien}>3114</a>.
      </p>
      <p className="mt-1">
        Si vous pensez passer à l’acte ou si vous êtes en danger, appelez le{' '}
        <a href="tel:15" className={lien}>15</a> ou le <a href="tel:112" className={lien}>112</a>.
      </p>
      <p className="mt-1">{MESSAGE_REPONSE_SUICIDE.praticien}</p>
    </div>
  );
}
