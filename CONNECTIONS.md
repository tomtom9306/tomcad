# Parametric Point Connections - Funkcjonalność Połączeń

## Przegląd

System parametrycznych połączeń punktów umożliwia łączenie elementów konstrukcji stalowej w sposób inteligentny i hierarchiczny. Połączenia mogą być jednostronne, dwustronne lub ograniczone, co zapewnia intuicyjne zachowanie podczas projektowania.

## Typy Połączeń

### 1. Połączenia Jednostronne (One-Way)
Jeden element podąża za drugim, ale nie na odwrót.

**Przykłady:**
- **Element → Grid**: Belka przytwierdzona do przecięcia siatki
- **Element → Powierzchnia**: Koniec belki przytwierdzony do powierzchni słupa
- **Element → Krawędź**: Punkt przytwierdzony do krawędzi elementu
- **Mały Element → Duży Element**: Ściąg przytwierdzony do belki głównej

**Zachowanie:**
- Przesunięcie celu (grid, powierzchnia) → element podąża
- Przesunięcie elementu → cel pozostaje nieruchomy

### 2. Połączenia Dwustronne (Two-Way)
Oba elementy wpływają wzajemnie na swoje pozycje.

**Przykłady:**
- **Belka ↔ Belka**: Spawane połączenie momentowe
- **Element ↔ Grupa**: Elementy w ramach jednej konstrukcji
- **Połączenie Sztywne**: Pełne przeniesienie momentów i sił

**Zachowanie:**
- Przesunięcie jednego elementu → drugi element podąża
- Zachowana jest wzajemna relacja geometryczna

### 3. Połączenia Ograniczone (Constrained)
Element może się ruszać, ale tylko w określonych kierunkach.

**Typy ograniczeń:**
- **Surface Constrained**: Ruch tylko po powierzchni
- **Edge Constrained**: Ruch tylko wzdłuż krawędzi
- **Axis Constrained**: Ruch tylko wzdłuż osi

**Zachowanie:**
- Element może się ruszać tylko w dozwolonych kierunkach
- Powierzchnia/krawędź pozostaje nieruchoma

## Hierarchia Elementów

System używa hierarchii priorytetów do automatycznego określania kierunkowości połączeń:

```
1000 - Grid (siatka)           - Najstabilniejszy
 900 - Foundation (fundamenty)
 800 - Column (słupy)
 700 - Main Beam (belki główne)
 600 - Secondary Beam (belki wtórne)
 500 - Brace (ściągi)
 400 - Connection (połączenia)
 300 - Detail (detale)         - Najmniej stabilny
```

### Reguły Automatyczne
- **Różnica priorytetów > 100**: Połączenie jednostronne
- **Różnica priorytetów ≤ 100**: Połączenie dwustronne
- **Element o wyższym priorytecie**: Staje się celem (leader)
- **Element o niższym priorytecie**: Podąża za celem (follower)

## Typy Połączeń Konstrukcyjnych

### Moment Connection (Połączenie Momentowe)
- **Typ**: Dwustronne, sztywne
- **Zachowanie**: Pełne przeniesienie momentów i sił
- **Wizualizacja**: Ciągła linia z symbolem spawania
- **Użycie**: Belka główna do słupa, rygel do słupa

### Pinned Connection (Połączenie Przegubowe)
- **Typ**: Dwustronne, elastyczne
- **Zachowanie**: Przeniesienie sił, rotacja swobodna
- **Wizualizacja**: Przerywana linia z symbolem śruby
- **Użycie**: Ściągi, elementy kratownicy

### Surface Attachment (Przytwierdzenie do Powierzchni)
- **Typ**: Jednostronne, ograniczone do powierzchni
- **Zachowanie**: Ruch po płaszczyźnie, powierzchnia nieruchoma
- **Wizualizacja**: Punktowana linia z symbolem płaszczyzny
- **Użycie**: Belka do powierzchni słupa, płatew do rygla

### Edge Attachment (Przytwierdzenie do Krawędzi)
- **Typ**: Jednostronne, ograniczone do krawędzi
- **Zachowanie**: Ruch wzdłuż krawędzi
- **Wizualizacja**: Linia z symbolem krawędzi
- **Użycie**: Podłużne elementy, płatwy dachowe

### Grid Attachment (Przytwierdzenie do Siatki)
- **Typ**: Jednostronne, punktowe
- **Zachowanie**: Element podąża za przecięciem siatki
- **Wizualizacja**: Linia z symbolem siatki
- **Użycie**: Słupy, belki główne układu

## Struktura Danych

### Definicja Połączenia
```javascript
{
  id: "conn-001",
  type: "moment_connection",
  directionality: "two_way",
  
  source: {
    elementId: "beam-01",
    point: "end",
    role: "peer"
  },
  
  target: {
    elementId: "beam-02",
    point: "start", 
    role: "peer"
  },
  
  constraint: {
    type: "rigid",
    freedoms: [],
    sharedTransform: true
  },
  
  metadata: {
    created: "2025-01-15T10:30:00Z",
    createdBy: "user",
    lastModified: "2025-01-15T10:30:00Z"
  }
}
```

### Rozszerzenie Modelu Elementu
```javascript
{
  id: "beam-01",
  kind: "beam",
  start: [0, 0, 0],
  end: [0, 0, 3000],
  
  // Nowe: Połączenia parametryczne
  connections: {
    start: {
      type: "elementConnection",
      targetElementId: "column-01",
      targetPoint: "top",
      connectionType: "moment",
      connectionId: "conn-001"
    },
    end: {
      type: "gridIntersection",
      xLabel: "2", yLabel: "A", zLabel: "0"
    }
  },
  
  // Nowe: Dostępne punkty połączeń
  connectionPoints: [
    { id: "start", type: "moment", position: [0, 0, 0] },
    { id: "end", type: "moment", position: [0, 0, 3000] },
    { id: "mid", type: "pinned", position: [0, 0, 1500] },
    { id: "quarter", type: "pinned", position: [0, 0, 750] }
  ]
}
```

## Interfejs Użytkownika

### Panel Połączeń
- **Lista Połączeń**: Wszystkie aktywne połączenia z opisami
- **Ikony Typów**: Wizualne rozróżnienie typów połączeń
- **Akcje**: Edytuj, usuń, zmień typ połączenia
- **Filtrowanie**: Według typu, elementu, statusu

### Przyciski Akcji
- **🔗 Utwórz Połączenie**: Tryb tworzenia nowego połączenia
- **✏️ Edytuj Połączenie**: Modyfikacja istniejącego połączenia
- **🗑️ Usuń Połączenie**: Bezpieczne usuwanie z sprawdzeniem zależności
- **🔄 Zmień Typ**: Konwersja między typami połączeń

### Tryb Snap z Połączeniami
- **Toggle**: Włącz/wyłącz tryb tworzenia połączeń
- **Podgląd**: Wizualne wskazówki podczas przeciągania
- **Sugestie**: Automatyczne propozycje połączeń
- **Walidacja**: Sprawdzanie poprawności przed utworzeniem

## Wizualizacja 3D

### Symbole Połączeń
- **Moment**: 🔗 Pełny krąg z krzyżykiem
- **Pinned**: ⚪ Pusty krąg
- **Surface**: ▢ Kwadrat z normalną
- **Edge**: ▬ Linia z punktem
- **Grid**: ⊞ Siatka z punktem

### Kolory Połączeń
- **Aktywne**: Zielony - połączenie działa poprawnie
- **Wybrane**: Niebieski - połączenie jest wybrane
- **Błędne**: Czerwony - konflikt lub błąd
- **Dezaktywowane**: Szary - połączenie wyłączone

### Linie Połączeń
- **Ciągłe**: Sztywne połączenia momentowe
- **Przerywane**: Połączenia przegubowe
- **Punktowane**: Połączenia ograniczone
- **Faliste**: Połączenia elastyczne

## Workflow Użytkownika

### 1. Tworzenie Połączenia
1. **Włącz tryb połączeń** w SnapManager
2. **Przeciągnij element** w pobliże punktu docelowego
3. **System wykryje** możliwe połączenia i podświetli je
4. **Upuść element** gdy punkt snap jest aktywny
5. **Wybierz typ połączenia** z menu kontekstowego
6. **Połączenie zostanie utworzone** i dodane do listy

### 2. Edycja Połączenia
1. **Kliknij symbol połączenia** w widoku 3D
2. **Wybierz "Edytuj"** z menu kontekstowego
3. **Zmień parametry** w panelu właściwości
4. **Zatwierdź zmiany** lub anuluj

### 3. Usuwanie Połączenia
1. **Wybierz połączenie** z listy lub kliknij symbol
2. **Kliknij "Usuń"** lub naciśnij Delete
3. **Potwierdź usunięcie** w oknie dialogowym
4. **System sprawdzi zależności** i ostrzeże o konsekwencjach

## Zaawansowane Funkcje

### Automatyczne Wykrywanie
- **Analiza Geometrii**: System analizuje kształt i pozycję elementów
- **Sugerowane Połączenia**: Propozycje optymalnych typów połączeń
- **Poziom Pewności**: Ocena prawdopodobieństwa poprawności
- **Uczenie Się**: System zapamiętuje preferencje użytkownika

### Szablony Konstrukcji
- **Goal Post**: Bramka z połączeniami momentowymi
- **Truss Segment**: Segment kratownicy z połączeniami przegubowymi
- **Frame**: Rama z mieszanymi typami połączeń
- **Custom**: Możliwość tworzenia własnych szablonów

### Walidacja Połączeń
- **Konflikty Geometryczne**: Sprawdzanie kolizji i przecięć
- **Statyczna Analiza**: Podstawowa weryfikacja statyczna
- **Ostrzeżenia**: Informacje o potencjalnych problemach
- **Sugestie Poprawek**: Automatyczne propozycje rozwiązań

## Implementacja Techniczna

### Klasy Główne
- **ConnectionManager**: Zarządzanie wszystkimi połączeniami
- **ConnectionHierarchy**: System priorytetów i hierarchii
- **ConnectionUpdateManager**: Propagacja zmian
- **ConnectionVisualizer**: Wizualizacja w 3D
- **ConnectionUI**: Interfejs użytkownika

### Integracja z Istniejącym Systemem
- **SnapManager**: Rozszerzenie o wykrywanie punktów połączeń
- **ElementManager**: Dodanie obsługi połączeń do elementów
- **EventBus**: Komunikacja między komponentami
- **DataModel**: Rozszerzenie struktury danych

### Wydajność
- **Lazy Loading**: Połączenia ładowane na żądanie
- **Caching**: Buforowanie wyników obliczeń
- **Batch Updates**: Grupowanie aktualizacji
- **Selective Rebuild**: Przemalowywanie tylko zmienionych elementów

## Korzyści

### Dla Użytkownika
- **Szybkie Rysowanie**: Automatyczne połączenia podczas rysowania
- **Intuicyjne Zachowanie**: Naturalne reakcje na przeciąganie
- **Mniej Błędów**: Automatyczna walidacja i sugestie
- **Łatwe Modyfikacje**: Zmiany propagowane automatycznie

### Dla Projektanta
- **Parametryczne Modele**: Łatwe modyfikacje projektu
- **Spójność Geometryczna**: Automatyczne utrzymanie relacji
- **Szybkie Prototypowanie**: Różne warianty konstrukcji
- **Profesjonalne Rezultaty**: Poprawne połączenia konstrukcyjne

### Dla Aplikacji
- **Extensible Architecture**: Łatwe dodawanie nowych typów
- **Maintainable Code**: Czysta separacja odpowiedzialności
- **Performance**: Optymalizacja dla dużych modeli
- **Scalability**: Wsparcie dla złożonych konstrukcji

## Przyszłe Rozszerzenia

### Planowane Funkcje
- **Analiza Statyczna**: Sprawdzanie nośności połączeń
- **Automatyczne Detailing**: Generowanie detali połączeń
- **Export do CAD**: Eksport z pełnymi informacjami o połączeniach
- **Biblioteka Połączeń**: Standardowe rozwiązania konstrukcyjne

### Możliwe Ulepszenia
- **AI Suggestions**: Sztuczna inteligencja dla optymalnych połączeń
- **Parametric Families**: Rodziny parametrycznych połączeń
- **Animation**: Animacje tworzenia i modyfikacji
- **Collaboration**: Współpraca zespołowa nad połączeniami