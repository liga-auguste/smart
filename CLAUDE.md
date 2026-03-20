# Smart Shit — Projekt-Brief für Claude Code

## Was das ist

Eine minimalistische persönliche Wissenssammlung. Kein Lern-Tool, kein Review-System — eine Datenbank für Gedanken, Zitate, Links, Fakten und Notizen. Die Kernphilosophie: **bewusste Zurückhaltung**. Alles, was nicht unbedingt notwendig ist, wird weggelassen.

---

## Stack

- **Backend**: Django
- **Datenbank**: SQLite (dev), PostgreSQL (prod)
- **AI**: Claude API (Sonnet) für Kartenanalyse
- **Frontend**: Custom CSS (kein Framework), Mobile-first
- **Zielform**: PWA mit Share Target
- **Schriften**: DM Serif Display + DM Mono (Google Fonts)

---

## Datenmodell

### Abstrakte Basis

```python
class UserOwnedModel(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    erstellt_am = models.DateTimeField(auto_now_add=True)
    geaendert_am = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

### Karte

```python
class Karte(UserOwnedModel):
    TYP_CHOICES = [
        ('notiz', 'Notiz'),
        ('zitat', 'Zitat'),
        ('buch', 'Buch'),
        ('link', 'Link'),
        ('fakt', 'Fakt'),
    ]

    inhalt = models.TextField()
    typ = models.CharField(max_length=20, choices=TYP_CHOICES, default='notiz')
    quelle = models.CharField(max_length=500, blank=True)  # auto-extrahiert, read-only nach Save
    meta = models.JSONField(default=dict, blank=True)      # typ-spezifische Metadaten
    bereiche = models.ManyToManyField('Bereich', blank=True)

    # typ und quelle sind nach dem ersten Speichern read-only
```

### Bereich

```python
class Bereich(UserOwnedModel):
    name = models.CharField(max_length=100)
    # Im UI vorerst unsichtbar — Infrastruktur ist da, aber nicht exponiert
```

---

## Kartentypen & Quellenextraktion

| Typ | Ironiches Label | Quellen-Extraktion |
|-----|-----------------|---------------------|
| `notiz` | — | keine |
| `zitat` | `jemand kluges hat gesagt` | Text nach Em-Dash (`—`) |
| `buch` | `papier mit wörtern` | Autor nach Em-Dash |
| `link` | `internet-fund` | Domain aus URL |
| `fakt` | `unnötiges wissen` | keine |

**Extraktionslogik:**
- Em-Dash am Ende → Text danach = Quelle, wird aus `inhalt` entfernt
- URL im Text → Domain extrahieren, URL bleibt in `inhalt`
- Läuft client-side (Live-Preview) UND server-side (finale Autorität beim Speichern)

---

## AI-Integration

- **Trigger**: 500ms Debounce nach letztem Tastendruck im Compose-Feld
- **Aufgabe**: Typ erkennen + Metadaten extrahieren
- **Regel**: Füllt **nur leere Felder** — überschreibt nie manuelle Eingaben
- **Endpunkt**: `POST /api/analyse/` → gibt `{typ, quelle, meta}` zurück
- **Modell**: Claude Sonnet (claude-sonnet-4-20250514)

---

## UI-Konzept

### Themes

| Name | Beschreibung |
|------|-------------|
| `tageslicht` | Hell, warme Off-Whites |
| `nacht` | Dunkel, fast schwarz — **Default** |
| `farbe` | Anpassbar, fünf Farbfelder |

### Compose-Modus

- Einziges Eingabefeld: `inhalt` (Textarea, nimmt alles)
- Kein separates Quellen-Feld — Extraktion ist automatisch und still
- Live-Typ-Erkennung aktualisiert das ironische Label während des Tippens
- Nach dem Speichern: `"gespeichert. wow."` — erscheint kurz, faded weg, dann Stille

### Onboarding / Empty State

- Keine Erklärung, kein Tutorial
- Nur ein blinkender Cursor
- Das ist die Einladung

### Kartenanzeige

- Kein Autor, keine Quelle sichtbar im Card-View
- Ironiches Label einmal pro Karte, sparsam
- Chronologische Timeline als Hauptansicht (noch nicht implementiert)

---

## Was noch nicht implementiert ist

Diese Features sind geplant, aber noch ausstehend:

- [ ] Volltextsuche
- [ ] Chronologische Timeline-Ansicht
- [ ] Zufällige Karte anzeigen
- [ ] PWA-Manifest + Share Target
- [ ] `bereiche` im UI sichtbar machen
- [ ] Karten bearbeiten (nur wenn wirklich gebraucht)

---

## Designprinzipien (nicht verhandelbar)

1. **Ironie maximal einmal pro Interaktion** — sonst wird's nervig
2. **AI füllt Lücken, überschreibt nicht** — manuelle Eingabe hat immer Vorrang
3. **Kein Feature ohne echten Bedarf** — default ist: weglassen
4. **`typ` und `quelle` sind nach dem Speichern read-only** — Editing nur wenn wirklich gebraucht
5. **Keine Metadaten im UI** — `bereiche` existiert im Modell, ist aber unsichtbar

---

## Projektstruktur (Vorschlag)

```
smartshit/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── karten/
│   ├── models.py        # Karte, Bereich, UserOwnedModel
│   ├── views.py
│   ├── urls.py
│   ├── forms.py
│   ├── analyse.py       # Claude API Integration
│   └── templates/
│       └── karten/
│           ├── base.html
│           ├── compose.html
│           ├── liste.html
│           └── detail.html
├── static/
│   ├── css/
│   │   ├── base.css
│   │   └── themes.css
│   └── js/
│       ├── compose.js   # Live-Typ-Erkennung + Debounce
│       └── theme.js
└── requirements.txt
```

---

## Startpunkt für Claude Code

Beginne mit:

1. Django-Projekt aufsetzen (`django-admin startproject config .`)
2. App `karten` anlegen
3. `UserOwnedModel` + `Karte` + `Bereich` in `models.py` implementieren
4. Basic Views: Compose, Liste
5. CSS-Grundgerüst mit Theme-Variablen (Nacht als Default)
6. Dann: Claude API Analyse-Endpunkt
