# Patch — Mode Lecture Praticien (aperçu questionnaire avant assignation)

## Analyse préalable

- `serveQuestionnaire(idQ)` **existe déjà** dans `Code.gs` (ligne 768) et appelle
  `getQuestionnaireForClient(idQ)` depuis `Questions.gs`. Aucune modification de `Code.gs`
  nécessaire : le patch ne touche que `index.html`.
- Bootstrap 5.3 est déjà chargé → on utilise une modale Bootstrap native (pas de CSS custom).
- Aucune fonction `escHtml` n'existe → à créer.
- `ALL_QUESTIONNAIRES` contient les métadonnées du Sheet (titre, catégorie, durée) mais pas les
  questions détaillées → `serveQuestionnaire` est appelé à la demande au clic sur Aperçu.

---

## Patch A — HTML : bouton Aperçu à côté du bouton Assigner

### Fichier : `index.html`

### Localiser (texte exact à la ligne 462) :

```html
            <button class="btn btn-teal" onclick="doAssign()">
              <i class="fas fa-paper-plane me-1"></i> Assigner
            </button>
            <span id="a-feedback" class="small"></span>
```

### Remplacer par :

```html
            <button class="btn btn-teal" onclick="doAssign()">
              <i class="fas fa-paper-plane me-1"></i> Assigner
            </button>
            <button class="btn btn-outline-secondary" onclick="ouvrirApercu()" title="Prévisualiser le questionnaire sélectionné">
              <i class="fas fa-eye me-1"></i> Aperçu
            </button>
            <span id="a-feedback" class="small"></span>
```

---

## Patch B — HTML : modale Bootstrap aperçu

### Fichier : `index.html`

### Localiser (dernière modale existante, après la ligne 635) :

```html
</div>

<!-- Scripts -->
```

### Insérer entre les deux (avant `<!-- Scripts -->`) :

```html
<!-- ══════ MODAL Aperçu questionnaire (mode lecture praticien) ══════ -->
<div class="modal fade" id="modalApercu" tabindex="-1" aria-labelledby="modalApercuLabel">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header" style="background:var(--primary);color:#fff">
        <h5 class="modal-title" id="modalApercuLabel">
          <i class="fas fa-eye me-2"></i>Aperçu — Mode lecture
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="apercu-body">
        <div class="text-center text-muted py-5">
          <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
          <p>Chargement du questionnaire…</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
      </div>
    </div>
  </div>
</div>

```

---

## Patch C — JavaScript : fonctions mode lecture

### Fichier : `index.html`

### Localiser (juste avant `</script>` final, dernière ligne de script) :

```javascript
}

</script>
</body>
</html>
```

### Insérer avant le `</script>` final :

```javascript
// ═══════════════════ MODE LECTURE PRATICIEN — APERÇU QUESTIONNAIRE ═══════════════════

function ouvrirApercu() {
  var idQ = document.getElementById('a-questionnaire').value;
  if (!idQ) {
    var fb = document.getElementById('a-feedback');
    fb.textContent = 'Sélectionnez d\'abord un questionnaire.';
    fb.className = 'small text-warning';
    setTimeout(function() { fb.textContent = ''; }, 3000);
    return;
  }

  // Ouvrir la modale avec spinner
  var body = document.getElementById('apercu-body');
  body.innerHTML =
    '<div class="text-center text-muted py-5">' +
    '<i class="fas fa-spinner fa-spin fa-2x mb-3"></i>' +
    '<p>Chargement du questionnaire…</p></div>';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalApercu')).show();

  // Appel serveur — réutilise serveQuestionnaire() existant dans Code.gs
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.error) {
        body.innerHTML =
          '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>' +
          escHtml(result.error) + '</div>';
        return;
      }
      body.innerHTML = buildApercuHtml(result.questionnaire);
    })
    .withFailureHandler(function(err) {
      body.innerHTML =
        '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>' +
        escHtml(err.message) + '</div>';
    })
    .serveQuestionnaire(idQ);
}

/**
 * Construit le HTML de prévisualisation d'un questionnaire JSON v2.
 * Gère : structure sections[] et structure plate questions[].
 * Mode lecture seule — aucune interaction patient.
 */
function buildApercuHtml(q) {
  if (!q) return '<div class="alert alert-warning">Questionnaire vide ou non trouvé.</div>';

  var html = '';

  // ── En-tête ──────────────────────────────────────────────────────────────
  html += '<h4 class="mb-1" style="color:var(--primary)">' + escHtml(q.titre || q.id) + '</h4>';

  html += '<div class="d-flex flex-wrap gap-2 mb-3">';
  if (q.id) {
    html += '<span class="badge bg-light text-dark border"><code>' + escHtml(q.id) + '</code></span>';
  }
  if (q.categorie) {
    html += '<span class="badge" style="background:var(--accent);color:#fff">' + escHtml(q.categorie) + '</span>';
  }
  if (q.duree) {
    html += '<span class="badge bg-light text-dark border"><i class="fas fa-clock me-1"></i>' + escHtml(q.duree) + '</span>';
  }
  if (q.practitionerOnly) {
    html += '<span class="badge bg-danger"><i class="fas fa-user-md me-1"></i>Praticien uniquement</span>';
  }
  html += '</div>';

  if (q.description) {
    html += '<div class="alert alert-light border mb-3 py-2">' +
      '<i class="fas fa-info-circle me-1 text-muted"></i>' + escHtml(q.description) + '</div>';
  }

  // ── Consigne générale ────────────────────────────────────────────────────
  if (q.consigne || q.instructions) {
    html += '<div class="alert alert-info py-2 mb-3">' +
      '<strong>Consigne&nbsp;:</strong> ' + escHtml(q.consigne || q.instructions) + '</div>';
  }

  // ── Comptage total des questions ─────────────────────────────────────────
  var totalQ = 0;
  var sections = [];
  if (q.sections && q.sections.length > 0) {
    sections = q.sections;
    sections.forEach(function(s) { totalQ += (s.questions || []).length; });
  } else if (q.questions && q.questions.length > 0) {
    // Structure plate → on l'encapsule dans une section virtuelle
    sections = [{ titre: null, questions: q.questions }];
    totalQ = q.questions.length;
  }

  html += '<p class="text-muted small mb-3"><i class="fas fa-list-ol me-1"></i>' +
    '<strong>' + totalQ + '</strong> question' + (totalQ > 1 ? 's' : '') +
    (sections.length > 1 ? ' · <strong>' + sections.length + '</strong> sections' : '') +
    '</p>';

  html += '<hr class="mb-3">';

  // ── Rendu des sections et questions ─────────────────────────────────────
  var qCounter = 0;
  sections.forEach(function(section, si) {
    if (section.titre) {
      html += '<div class="d-flex align-items-center gap-2 mb-2 mt-' + (si > 0 ? '4' : '2') + '">';
      html += '<span class="badge rounded-pill" style="background:var(--primary);font-size:.85em">' + (si + 1) + '</span>';
      html += '<h6 class="mb-0 fw-bold" style="color:var(--primary)">' + escHtml(section.titre) + '</h6>';
      html += '</div>';
      if (section.consigne) {
        html += '<p class="text-muted small fst-italic mb-2">' + escHtml(section.consigne) + '</p>';
      }
    }

    (section.questions || []).forEach(function(question, qi) {
      qCounter++;
      var label = question.label || question.text || ('Question ' + qCounter);
      var type = question.type || '';

      html += '<div class="card mb-2 border-0 shadow-sm">';
      html += '<div class="card-body py-2 px-3">';

      // Numéro + libellé
      html += '<div class="d-flex align-items-start gap-2">';
      html += '<span class="text-muted fw-bold small mt-1" style="min-width:22px">' + qCounter + '.</span>';
      html += '<div class="flex-grow-1">';
      html += '<p class="mb-1 fw-semibold">' + escHtml(label);
      if (question.required) {
        html += ' <span class="text-danger" title="Obligatoire">*</span>';
      }
      html += '</p>';

      // Options selon le type
      if ((type === 'radio' || type === 'select' || type === 'checkbox') &&
           question.options && question.options.length > 0) {
        html += '<div class="d-flex flex-wrap gap-2 mt-1">';
        question.options.forEach(function(opt) {
          var lbl = (typeof opt === 'object') ? (opt.label || opt.text || String(opt.value)) : String(opt);
          var val = (typeof opt === 'object' && opt.value !== undefined) ? opt.value : '';
          html += '<span class="badge bg-light text-dark border">';
          if (type === 'radio') html += '<i class="far fa-circle me-1 text-muted"></i>';
          if (type === 'checkbox') html += '<i class="far fa-square me-1 text-muted"></i>';
          html += escHtml(lbl);
          if (val !== '') html += ' <small class="text-muted">(' + escHtml(String(val)) + ')</small>';
          html += '</span>';
        });
        html += '</div>';
      } else if (type === 'scale' || type === 'slider') {
        var min = question.min !== undefined ? question.min : 0;
        var max = question.max !== undefined ? question.max : 10;
        html += '<div class="d-flex align-items-center gap-2 mt-1">';
        html += '<span class="badge bg-light text-dark border">' + min + '</span>';
        html += '<div class="flex-grow-1" style="height:6px;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:3px;opacity:.5"></div>';
        html += '<span class="badge bg-light text-dark border">' + max + '</span>';
        html += '</div>';
        if (question.labels && question.labels.length >= 2) {
          html += '<div class="d-flex justify-content-between mt-1">';
          html += '<small class="text-muted fst-italic">' + escHtml(question.labels[0]) + '</small>';
          html += '<small class="text-muted fst-italic">' + escHtml(question.labels[question.labels.length - 1]) + '</small>';
          html += '</div>';
        }
      } else if (type === 'boolean') {
        html += '<div class="d-flex gap-2 mt-1">';
        html += '<span class="badge bg-light text-dark border"><i class="fas fa-check text-success me-1"></i>Oui</span>';
        html += '<span class="badge bg-light text-dark border"><i class="fas fa-times text-danger me-1"></i>Non</span>';
        html += '</div>';
      } else if (type === 'number') {
        var mn = question.min !== undefined ? ' min=' + question.min : '';
        var mx = question.max !== undefined ? ' max=' + question.max : '';
        html += '<span class="badge bg-light text-dark border mt-1"><i class="fas fa-hashtag me-1 text-muted"></i>Numérique' + mn + mx + '</span>';
      } else if (type === 'text' || type === 'textarea') {
        html += '<span class="badge bg-light text-dark border mt-1"><i class="fas fa-keyboard me-1 text-muted"></i>Texte libre</span>';
      } else if (type === 'date') {
        html += '<span class="badge bg-light text-dark border mt-1"><i class="fas fa-calendar me-1 text-muted"></i>Date</span>';
      }

      html += '</div></div>'; // flex-grow-1 + d-flex
      html += '</div></div>'; // card-body + card
    });
  });

  // ── Scoring (résumé) ─────────────────────────────────────────────────────
  if (q.scoring) {
    html += '<hr class="mt-4 mb-3">';
    html += '<div class="p-3 rounded" style="background:#f0f6fb;border-left:4px solid var(--primary)">';
    html += '<strong><i class="fas fa-calculator me-2"></i>Scoring</strong>';
    if (q.scoring.type) {
      html += ' <span class="badge bg-light text-dark border ms-1">' + escHtml(String(q.scoring.type)) + '</span>';
    }
    if (q.scoring.seuils && q.scoring.seuils.length > 0) {
      html += '<div class="d-flex flex-wrap gap-2 mt-2">';
      q.scoring.seuils.forEach(function(s) {
        html += '<span class="badge bg-white border text-dark">';
        if (s.min !== undefined) html += '≥' + s.min + ' ';
        if (s.max !== undefined) html += '&lt;' + (s.max + 1) + ' ';
        html += '→ ' + escHtml(s.label || '') + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  return html;
}

/**
 * Échappe les caractères HTML pour affichage sécurisé (lecture seule).
 * Pas de données patients — sécurité défensive sur le contenu du catalogue.
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════ FIN MODE LECTURE PRATICIEN ═══════════════════
```

---

## Récapitulatif

### Fichiers modifiés
| Fichier | Modification |
|---|---|
| `index.html` | +1 bouton Aperçu (Patch A) · +1 modale Bootstrap (Patch B) · +3 fonctions JS (Patch C) |
| `Code.gs` | **Aucune** — `serveQuestionnaire()` est réutilisée telle quelle |
| `Questions.gs` | **Aucune** |

### Risques de régression
- **Nul** sur le scoring, les assignations, les packs, les données patients.
- `escHtml()` est une nouvelle fonction — aucun conflit possible (confirmé par grep).
- La modale utilise l'ID `modalApercu` — distinct de `modalPatient`, `modalPack`, `modalPackBuilder`.
- `serveQuestionnaire()` est en lecture seule côté serveur.

### Test manuel rapide
1. `clasp push` puis recharger l'app.
2. Se connecter en tant que **Praticien**.
3. Onglet **Assigner** → cliquer **Aperçu** sans rien sélectionner → message d'avertissement attendu.
4. Sélectionner `Q_STR_01` (Questionnaire de stress SIIN) → cliquer **Aperçu**.
5. Vérifier : modale s'ouvre, toutes les questions et options s'affichent, résumé scoring en bas.
6. Tester un questionnaire avec sections multiples (ex. `Q_STR_04` DASS-21).
7. Cliquer **Fermer** ou ✕ → modale se ferme, onglet Assigner intact.
8. Enchaîner directement : cliquer **Assigner** après avoir fermé l'aperçu → vérifier que l'assignation fonctionne normalement.

### Vérification sécurité
```bash
bash scripts/check_no_secrets.sh
```
✅ Aucun SHEET_ID en dur · Aucune clé API · Aucune donnée patient
