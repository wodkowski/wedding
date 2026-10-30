# Wesele Karoliny i Sławka

Strona statyczna do GitHub Pages. Dane pary, datę i adres skryptu Google zmieniamy w `config.js`.

## Najprostszy formularz

Formularz ma karty „Gość 1”, „Gość 2”… i jeden przycisk **Dodaj osobę**. Jedna wysyłka może zawierać kilka osób. Nie ma kodów, listy zaproszeń, powiązań osób, limitów gości ani porównywania nazwisk z listą i wykrywania duplikatów. Imię, nazwisko i obecność są wymagane dla każdego gościa. Menu i nocleg są wymagane przy potwierdzonej obecności. Alergie i uwagi pozostają opcjonalne. Pola obowiązkowe mają gwiazdkę.

Po kliknięciu „Wyślij wszystkie odpowiedzi” otwiera się podsumowanie danych wszystkich gości. „Wróć do edycji” lub Escape zamyka je bez zapisu i bez utraty danych. Dopiero „Zatwierdź i wyślij” wysyła dane do arkusza. Wysyłanie blokuje przyciski, aby nie wykonać dwóch żądań równocześnie.

**Każde wysłanie dopisuje nowe wiersze.** Dwa identyczne zgłoszenia to dwa wpisy. Również zmienione zgłoszenie jest nowym wpisem, a nie aktualizacją. Usunięcie osoby z otwartego formularza nie usuwa wcześniejszych odpowiedzi. Po błędzie sieci ponowienie może utworzyć kolejną kopię, jeśli wcześniejsze żądanie zostało już zapisane.

Po zapisie formularz pozostaje uzupełniony, a wypełnione pola są zielone. Zmiana dowolnego pola albo dodanie/usunięcie karty usuwa zieleń z całości. Potwierdzenia i błędy połączenia są pokazywane w popupie.

## Arkusz Google

W prywatnym arkuszu na osobnym koncie Google:

1. Otwórz **Rozszerzenia → Apps Script** i wklej aktualny `google-apps-script/Code.gs`.
2. Zapisz i uruchom **setup**. Utworzy zakładkę **Zgloszenia**. Poprzednie zakładki zostaną zachowane.
3. **Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż**. Zachowaj dotychczasowy adres `/exec`. Skrypt wykonuje się jako właściciel, a dostęp do aplikacji internetowej jest dla każdego.
4. Sprawdź `appsScriptUrl` w `config.js` i opublikuj zmiany strony na GitHub.
5. Wyślij próbnie kilka osób, potem powtórz wysyłkę i sprawdź nowe wiersze.

Kolumny zakładki **Zgloszenia**:

- Data wpisu (Europe/Warsaw), z godziną, minutą i sekundą.
- Imię, nazwisko, obecność, menu, nocleg, alergie i uwagi.
- ID zgłoszenia — wspólne dla wszystkich osób wysłanych razem. Każda kolejna wysyłka, również z tymi samymi nazwiskami, ma nowe ID. Filtrując po tej kolumnie, zobaczysz osoby z jednego formularza. Starsze wpisy pozostają bez ID; nie przypisujemy im grup wstecz.

Jedna osoba oznacza jeden wiersz. Wszystkie osoby z jednej wysyłki otrzymują ten sam moment wpisu. Skrypt nie odczytuje `Goscie`, `Zaproszenia` ani poprzednich odpowiedzi i niczego w nich nie zmienia. Nie dodaje ID zaproszenia ani powiązań rodzinnych. Dawne zakładki nie są migrowane do nowej listy.

Wpisywany tekst jest zabezpieczony przed wykonaniem jako formuła arkusza. Kontrola formatu żądania i potwierdzenie zapisu służą wyłącznie obsłudze technicznej, nie sprawdzaniu tożsamości gości. Blokada zapisu zapobiega nadpisaniu równoczesnych zgłoszeń.

Arkusz pozostaw prywatny. Adres `/exec` jest publiczny i pozwala teraz każdemu dopisywać zgłoszenia.

## Podgląd i testy

- `node preview.mjs` → http://127.0.0.1:4173.
- `node --test tests/*.test.mjs` → testy dopisywania, powtórzeń, wymaganych i opcjonalnych odpowiedzi, daty i zachowania historii.
- `node tests/mock-preview.mjs` → http://127.0.0.1:4180, lokalny test z arkuszem w pamięci. Nie wysyła nic do Google. Nie wdrażaj tego serwera jako backendu produkcyjnego.

GitHub Pages: gałąź `main`, folder `/(root)`. Zdjęcia i część treści są nadal przykładowe. Przed wysłaniem strony gościom uzupełnij datę, miejsca, kontakt i informację o wykorzystaniu danych.
