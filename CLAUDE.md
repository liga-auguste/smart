# Smart — Projekt-Brief für Claude Code

## Was das ist

Eine minimalistische persönliche Wissenssammlung. Kein Lern-Tool, kein Review-System — eine Datenbank für Gedanken, Zitate, Links, Fakten und Notizen. Die Kernphilosophie: **bewusste Zurückhaltung**. Alles, was nicht unbedingt notwendig ist, wird weggelassen.

---

## Stack

- **Backend**: Django, App heißt `cards`
- **Datenbank**: SQLite (dev), PostgreSQL (prod)
- **Frontend**: Custom CSS (kein Framework), Mobile-first
- **AI**: keine
- **Schriften**: DM Serif Display + DM Mono (lokal eingebunden, keine Google Fonts)
- **PWA**: manifest.json vorhanden, Share Target implementiert
- **Kein AI** — keine Claude API Integration, bewusste Entscheidung

---

## Datenmodell (Ist-Zustand)

```python
class UserOwnedModel(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Card(UserOwnedModel):
    content = models.TextField()
    order = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ['order', '-created_at']
```

### Geplant: Stapel

Karten sollen einem oder mehreren Stapeln zugeordnet werden können — zur thematischen Gruppierung und Filterung (z.B. „bücher", „arbeit", „ideen"). Noch nicht im Modell, noch kein UI.

---

## Projektstruktur

```
smart/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── cards/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── templatetags/
│   └── templates/cards/
│       ├── base.html
│       ├── compose.html
│       └── list.html
└── static/
    ├── css/
    │   ├── base.css
    │   └── themes.css
    ├── js/
    │   ├── cards.js
    │   ├── compose.js
    │   └── theme.js
    ├── icons/
    └── manifest.json
```

---

## UI-Konzept

### Themes

| Name | Beschreibung |
|------|-------------|
| `tageslicht` | Hell, warme Off-Whites |
| `nacht` | Dunkel, fast schwarz — **Default** |
| `farbe` | Anpassbar, fünf Farbfelder |

### Compose

- Zwei Felder: `headline` + `body` (textarea)
- Nach dem Speichern: `"gespeichert. wow."` — erscheint kurz, faded weg

### Kartenansichten

- **Single View** (`/cards/`): eine Karte pro Bildschirm, horizontal scrollbar, letzter Stand wird im localStorage gespeichert
- **Listen-Ansicht** (`/cards/?alle`): alle Karten untereinander, mit Sort- und Delete-Modus

### Navigation (Listen-Ansicht)

- Logo: togglet zwischen Single View und Listen-Ansicht
- `neu`: öffnet Compose
- Suchicon: öffnet Suchleiste
- `⋯`: Dropdown-Menü mit „sortieren" und „löschen"
- `raus`: Logout

---

## Was implementiert ist

- [x] Volltextsuche (inkl. Single-View-Support, iOS-Fixes, blur-basiertes Submit)
- [x] Karten bearbeiten (Doppeltipp öffnet Inline-Editor, Speichern via API)
- [x] Karten sortieren (Sort-Modus via ⋯-Menü, Drag & Drop mit Handle, `reorder`-API)
- [x] Karten löschen (Delete-Modus via ⋯-Menü, × Button, animiertes Entfernen)
- [x] Mobile UX (pointer capture, touch-action, iOS-Zoom-Fix auf 1rem, `pointerdown` statt `click`)
- [x] PWA-Manifest (manifest.json mit Icons, standalone display)
- [x] Share Target (`share_target` in manifest.json, compose view liest `title`, `text`, `url` aus GET)

---

## Was noch fehlt

- [ ] Chronologische Timeline-Ansicht
- [ ] Zufällige Karte anzeigen
- [ ] Stapel implementieren — Modell, Zuordnung im Compose, Filterung in der Liste

---

## Designprinzipien (nicht verhandelbar)

1. **Ironie maximal einmal pro Interaktion** — sonst wird's nervig
2. **Kein Feature ohne echten Bedarf** — default ist: weglassen
3. **Keine Google Fonts** — Schriften lokal einbinden, absolute Pfade in base.css
