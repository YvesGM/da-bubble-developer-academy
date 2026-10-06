# DABubble – Figma Context Snapshot

Stand: 2026-10-06

Diese Datei ist ausschließlich als ChatGPT-Arbeitskontext gedacht.
Sie gehört NICHT ins DABubble-Repository.

## Figma-Datei

- File Key: `FHwwRu3vYUAXmNcj9jRIuE`
- Prototype Canvas: `117:2933`
- Components: `117:2932`
- Live-Play / Start: `125:2`
- Intro: `128:765`

## Bereits erfolgreich aus Figma gelesene Bereiche

Folgende Bereiche wurden in früheren und heutigen Figma-Abrufen bereits bestätigt:

- Intro
- Login
- Registrierung
- Avatar-Auswahl
- Passwort vergessen
- Workspace
- Channels
- Channel bearbeiten
- Mitglieder
- Mitglieder hinzufügen
- Profil
- Direct Messages
- Self-DM
- Threads
- Reaktionen
- Mobile-Varianten
- Impressum
- Datenschutz

## Heute frisch bestätigte Figma-Frames / Größen

### Mobile / Workspace-nahe Screens

- `11 D-Direct message mobile - Steffen`
  - Node: `894:15350`
  - Größe: `430 × 932`

- `11 E-Direct message mobile - Frederik (Du)`
  - Node: `894:15580`
  - Größe: `430 × 932`

- `Channel edition`
  - Node: `719:15164`
  - Größe: `430 × 932`

- weitere `Channel edition`
  - Node: `1823:21307`
  - Größe: `430 × 932`

- `Add Channel`
  - Node: `696:13540`
  - Größe: `430 × 932`

- `Profile view main`
  - Node: `609:17312`
  - Größe: `398 × 600`

- `65. Profile view other users`
  - mehrere Instanzen, u. a.:
  - `1814:15819`
  - `894:18365`
  - `894:18250`
  - `894:18251`
  - `609:17630`
  - `609:17629`

- `43. Members`
  - u. a. Node `740:11440`

- `41b. Add members R corner`
  - u. a. Nodes `740:11548`, `746:12783`

- `38b. Add Members after add channel`
  - Node `746:12764`

- `64b. Edit user and Log out - mobile`
  - Node `609:17627`

### Legal

- `Impressum`
  - Node: `156062:17209`
  - Größe: `430 × 932`

- `Datenschutz`
  - Node: `156062:17306`
  - Größe: `430 × 932`

## Heute bestätigte Auth-Frames

- `01-Log In`
  - Node: `125:2`
  - Größe: `1920 × 1080`

- `02-Sign In`
  - Node: `171:66`
  - Größe: `1920 × 1080`

- `03-Choose avatar`
  - Node: `6179:15943`
  - Größe: `1920 × 1080`

- `00-Intro`
  - Node: `128:765`
  - Größe: `1920 × 1080`

## Bereits bestätigte Figma-Interaktionsregeln

### Suche

Figma-Note:
- Die Suchleiste filtert und liefert Ergebnisse aus:
  - Channels
  - Benutzerprofilen
  - konkreten Nachrichten innerhalb des Workspace

### Neue Nachricht / Autocomplete

Figma-Note:
- `#` filtert Channels
- `@` filtert Mitglieder
- Autocomplete wird beim Schreiben verwendet

### Profil

Figma-Note:
- Klick auf ein Mitglied öffnet dessen Benutzerprofil

### Channel-Erstellung

Figma-Note:
- Nach Klick auf `Erstellen` erscheint der neue Channel unten in der Channel-Sektion

### Add Members

Figma-Note:
- Button ist nur aktiv/klickbar, wenn eine Auswahl getroffen wurde

### Passwort Reset

Figma-Note:
- Reset-Button nur aktiv, wenn Passwörter übereinstimmen
- E-Mail-Link führt auf eigene Seite zum Setzen des neuen Passworts
- dieser zweite Screen war im ursprünglichen Prototyp nicht vollständig enthalten

### Threads

Figma-Note:
Threads können auf zwei Arten geöffnet werden:

1. Hover über Nachricht → Aktionsmenü → Thread starten
2. Klick auf den Textlink `x Antworten`

### Reaktionen

Figma-Note:
- Desktop: maximal 20 Reaktionen pro Nachricht
- Mobile und Thread: maximal 7
- bei mehr als 7: `+ X weitere`
- aufgeklappt: alle Reaktionen
- anschließend `Weniger anzeigen`

## Reaktions-Beispiel-Frames

Es wurden Beispiel-Frames mit mobilen Reaktionen gelesen:
- mehrere `Reaction indicator`
- `x weitere`
- `Weniger anzeigen`
- `59. add reaction`

## Profil-Details aus Figma

Beispiel `Profile view main`:

- Titel: `Profil`
- Close-Icon
- großes Avatarbild
- Benutzername
- Online-Status
- E-Mail-Adresse
- Edit-Button / Edit-Icon

## Self-DM laut Figma

Node `894:15580`:

- Header mit eigenem Benutzer
- Name inkl. `(Du)`
- eigener persönlicher Bereich
- Erklärung sinngemäß:
  - Raum nur für dich
  - Notizen
  - To-dos
  - Links / Dateien
  - Dinge mit dir selbst besprechen

## Direct Message laut Figma

Beispiel Node `894:15350`:

- Mobile Header
- User im Header
- Textbereich
- Erklärung:
  - Unterhaltung nur zwischen dem gewählten Benutzer und dir
- Composer am unteren Rand

## Channel Edition Mobile

Figma zeigt eigene mobile Channel-Edit-Ansicht:

- eigener Head
- Channel-Name
- Channel-Bearbeitung
- Members
- primärer Action-Button
- 430 px Breite

Das ist keine bloß verkleinerte Desktop-Ansicht, sondern eine eigene mobile Layout-Variante.

## Impressum laut Figma

Struktur:

- Mobile Head
- Zurück-Button
- `Impressum`
- Student Names List
- Betreiber-Adresse
- PLZ / Ort
- Contact
- E-Mail

Die tatsächlichen Angaben müssen vom Projektinhaber eingetragen werden.

## Datenschutz laut Figma

- eigener Mobile-Head
- scrollbarer Inhaltsbereich
- Überschrift / Intro
- mehrere längere Textabschnitte
- Figma enthält dort Platzhalter-/Lorem-Ipsum-Inhalte, keine fertige rechtliche Erklärung

## Noch NICHT pixelgenau frisch verifiziert

Wegen Figma MCP Seat-Limit konnten folgende Punkte heute nicht erneut mit `get_design_context` + Screenshot geprüft werden:

- exakte Desktop-Workspace-Abstände
- exakte Header-/Sidebar-Maße aller Desktop-Varianten
- exakte Icon-Geometrie
- exakte Farben einzelner Spezialzustände
- exakte Desktop-Thread-Breite
- exakte Dialog-Positionierung auf allen Breakpoints
- vollständige 320-px-Prüfung
- jede einzelne Figma-Komponente mit aktuellem Browser-Render

Diese Punkte beim nächsten Figma-Abruf gezielt prüfen.

## Wichtige Regel für nächsten Figma-Abruf

NICHT erneut den kompletten Prototype-Canvas `117:2933` abrufen, wenn nicht nötig.

Stattdessen gezielt noch nicht verifizierte Frames über `get_design_context` + Screenshot laden, insbesondere:

1. Workspace Desktop
2. Workspace Mobile
3. Channel Desktop
4. Channel Mobile
5. DM Desktop
6. DM Mobile
7. Thread Desktop
8. Thread Mobile
9. Profile / Profile Edit
10. Add Members / Members
11. Channel Create / Channel Edit
12. New Message
13. Auth
14. Legal

Bereits bekannte Notes und Regeln aus dieser Datei nicht erneut über einen separaten Metadaten-Call abfragen.
