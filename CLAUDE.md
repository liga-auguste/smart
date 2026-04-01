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

class Stapel(UserOwnedModel):
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    class Meta:
        unique_together = [('user', 'name')]
        ordering = ['order', 'name']

class Card(UserOwnedModel):
    content = models.TextField()
    order = models.PositiveIntegerField(default=0)
    stapel = models.CharField(max_length=100, blank=True, default='')
    class Meta:
        ordering = ['order', '-created_at']
```

### Stapel

- `Stapel` ist ein eigenes Modell (für Reihenfolge und eindeutige Namen pro User)
- `stapel` auf `Card` ist ein `CharField` — lose Kopplung, kein FK
- Ein Stapel pro Karte, optional (leer = kein Stapel)
- Umbenennen/Löschen via API aktualisiert alle betroffenen Karten und das Stapel-Modell

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
│       ├── list.html
│       ├── stapel.html
│       ├── login.html
│       └── logged_out.html
└── static/
    ├── css/
    │   ├── base.css
    │   └── themes.css
    ├── js/
    │   ├── cards.js
    │   ├── compose.js
    │   ├── onboarding.js
    │   ├── stapel.js
    │   └── theme.js
    ├── icons/
    └── manifest.json
```

---

## UI-Konzept

### Themes

10 Themes: `nacht` (Default), `tageslicht`, `farbe`, `nebel`, `sand`, `wald`, `rost`, `grau`, `bunt`, `karpaten`

| Key          | Anzeigename            |
|--------------|------------------------|
| `nacht`      | ich bin normal.        |
| `tageslicht` | für die anderen.       |
| `farbe`      | kreativitätskrise.     |
| `nebel`      | berliner herbst.       |
| `sand`       | fernweh.               |
| `wald`       | waldbaden.             |
| `rost`       | industrieromantik.     |
| `grau`       | jahresgespräch.        |
| `bunt`       | bunt wie mein leben.   |
| `karpaten`   | karpatenromantik.      |

### Compose

- Zwei Felder: `headline` + `body` (textarea)
- Nach dem Speichern: `"gespeichert. wow."` — erscheint kurz, faded weg
- Body-Textarea: `min-height: 14rem` (Mobile), `20rem` (Desktop)

### Kartenansichten

- **Single View** (`/cards/`): eine Karte pro Bildschirm, horizontal scrollbar, letzter Stand wird im localStorage gespeichert
- **Listen-Ansicht** (`/cards/?alle`): alle Karten untereinander, mit Sort- und Delete-Modus

### Navigation

- In `base.html` definiert, für alle Views einheitlich
- Logo: togglet zwischen Single View und Listen-Ansicht
- `neu`: öffnet Compose
- `◑`: Theme-Toggle (immer sichtbar)
- `⋯`: Dropdown-Menü — Inhalt via `{% block nav_menu_items %}` pro Template erweiterbar
  - Listen-Ansicht: suchen, sortieren (nur bei `?alle`), löschen (nur bei `?alle`), über, raus
- `über`: öffnet Onboarding erneut

### Onboarding

- 3-Slide-Overlay, erscheint beim ersten Login (`localStorage: onboarding_seen_<userId>`, user-spezifisch)
- Slide 1: App-Manifesto; Slide 2: Logo + Caption; Slide 3: Theme-Karussell
- Slide 3: Auto-Cycle durch alle 10 Themes (2,2s Intervall), „weiter →" erscheint nach vollem Durchlauf
- Navigation: Links-Tippen = zurück, Rechts-Tippen = vor; auf Slide 3 = Theme vor/zurück
- Swipe rechts auf Slide 3 verlässt das Karussell zurück zu Slide 2
- Manuelles Tippen auf `◑` stoppt Auto-Cycle und zeigt „weiter →" sofort
- Erneut aufrufbar via „über" im ⋯-Menü

---

## Was implementiert ist

- [x] Volltextsuche (inkl. Single-View-Support, iOS-Fixes, blur-basiertes Submit)
- [x] Karten bearbeiten (Doppeltipp öffnet Inline-Editor, Speichern via API)
- [x] Karten sortieren (Sort-Modus via ⋯-Menü, Drag & Drop mit Handle, `reorder`-API)
- [x] Karten löschen (Delete-Modus via ⋯-Menü, × Button, animiertes Entfernen)
- [x] Mobile UX (pointer capture, touch-action, iOS-Zoom-Fix auf 1rem, `pointerdown` statt `click`)
- [x] PWA-Manifest (manifest.json mit Icons, standalone display)
- [x] Share Target (`share_target` in manifest.json, compose view liest `title`, `text`, `url` aus GET)
- [x] Onboarding (3-Slide-Overlay, Theme-Karussell, direktionales Tippen, re-aufrufbar via „über")
- [x] Nav-Refactor (⋯-Menü in base.html, `nav_menu_items`-Block, ◑ immer sichtbar)
- [x] Root-URL `/` leitet zu `/cards/` weiter (kein versehentliches Landen auf Compose)
- [x] Stapel — eigenes Modell + `CharField` auf `Card`, Zuordnung in Compose (Chips, Autocomplete, Hidden Input), Inline-Editor auf Karten, Sort-Modus gruppiert nach Stapel mit Drag zwischen Gruppen, Stapel-View (`/stapel/`) mit Umbenennen + Löschen (Confirm), Stapel-Chip in Nav (Einzelansicht, filtert auf Tap, × zum Zurücksetzen)
- [x] Zufällige Karte (`/cards/?zufaellig=1`) — zufällige Reihenfolge via `order('?')`, im ⋯-Menü erreichbar
- [x] README — Live-Link, Stack, Screenshot, Philosophie
- [x] Tests — Login required, Karte erstellen/löschen, Listen-Isolation zwischen Usern

---

## Was noch fehlt

— aktuell nichts offen.

---

## Designprinzipien (nicht verhandelbar)

1. **Ironie maximal einmal pro Interaktion** — sonst wird's nervig
2. **Kein Feature ohne echten Bedarf** — default ist: weglassen
3. **Keine Google Fonts** — Schriften lokal einbinden, absolute Pfade in base.css
