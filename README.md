# Wesele Karoliny i Sławka

Strona statyczna do GitHub Pages. Dane pary, datę i adres skryptu Google zmieniamy w `config.js`.

## Najprostszy formularz

Formularz ma karty „Gość 1”, „Gość 2”… i jeden przycisk **Dodaj osobę**. Jedna wysyłka może zawierać maksymalnie dwie osoby — można dodać jednego dodatkowego gościa. Nie ma kodów, listy zaproszeń, powiązań osób, przypisywania do zaproszeń ani porównywania nazwisk z listą i wykrywania duplikatów. Imię, nazwisko i obecność są wymagane dla każdego gościa. Menu i nocleg są wymagane przy potwierdzonej obecności. Dla każdego gościa trzeba podać przynajmniej jedną formę kontaktu: e-mail lub telefon. Można podać oba; jeśli są wpisane, oba muszą mieć poprawny format. Numer telefonu powinien zawierać 7–15 cyfr (może zawierać +, spacje i nawiasy). Alergie i uwagi pozostają opcjonalne. Pola obowiązkowe mają gwiazdkę.

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

Wybór obecności, menu i noclegu odbywa się przez widoczne przyciski radiowe. Każdy gość ma niezależne grupy odpowiedzi. Menu i nocleg są ukryte i niewymagane przy nieobecności. Kontakt pozostaje wymagany również przy nieobecności.

Kolumny zakładki **Zgloszenia**:

- Data wpisu (Europe/Warsaw), z godziną, minutą i sekundą.
- Imię, nazwisko, obecność, menu, nocleg, alergie i uwagi.
- E-mail i telefon w kolumnach J–K; co najmniej jedno z tych pól jest obowiązkowe dla każdego gościa.
- ID zgłoszenia — wspólne dla wszystkich osób wysłanych razem. Każda kolejna wysyłka, również z tymi samymi nazwiskami, ma nowe ID. Filtrując po tej kolumnie, zobaczysz osoby z jednego formularza. Starsze wpisy pozostają bez ID; nie przypisujemy im grup wstecz.

Jedna osoba oznacza jeden wiersz. Wszystkie osoby z jednej wysyłki otrzymują ten sam moment wpisu. Skrypt nie odczytuje `Goscie`, `Zaproszenia` ani poprzednich odpowiedzi i niczego w nich nie zmienia. Nie dodaje ID zaproszenia ani powiązań rodzinnych. Dawne zakładki nie są migrowane do nowej listy.

Wpisywany tekst jest zabezpieczony przed wykonaniem jako formuła arkusza. Kontrola formatu żądania i potwierdzenie zapisu służą wyłącznie obsłudze technicznej, nie sprawdzaniu tożsamości gości. Blokada zapisu zapobiega nadpisaniu równoczesnych zgłoszeń.

Arkusz pozostaw prywatny. Adres `/exec` jest publiczny i pozwala teraz każdemu dopisywać zgłoszenia.

## Kopie i ochrona przed spamem

Aktualny `Code.gs` obsługuje codzienne kopie pełnego arkusza oraz przekierowanie nagłego wzrostu zgłoszeń do zakładki „Do sprawdzenia”. Instrukcja: [OCHRONA.md](google-apps-script/OCHRONA.md). Po wklejeniu kodu uruchom `installProtection` i zaktualizuj wdrożenie. Funkcja tworzy pierwszą kopię i harmonogram w Google. Same testy lokalne ani commit nie uruchamiają kopii na koncie.

Do 20 formularzy i do 100 osób w 5 minut zgłoszenia trafiają normalnie do głównej listy. Po przekroczeniu któregoś progu kolejne są zachowywane do ręcznej weryfikacji przez co najmniej 30 minut. Goście nadal dostają potwierdzenie przyjęcia, duplikaty są dozwolone. Panel „Ochrona” i menu w arkuszu pozwalają sprawdzać stan, zatwierdzać grupy oraz robić kopie ręcznie.

## Podgląd i testy

- `node preview.mjs` → http://127.0.0.1:4173.
- `node --test tests/*.test.mjs` → testy dopisywania, powtórzeń, wymaganych i opcjonalnych odpowiedzi, daty i zachowania historii.
- `node tests/mock-preview.mjs` → http://127.0.0.1:4180, lokalny test z arkuszem w pamięci. Nie wysyła nic do Google. Nie wdrażaj tego serwera jako backendu produkcyjnego.

GitHub Pages: gałąź `main`, folder `/(root)`. Zdjęcia i część treści są nadal przykładowe. Przed wysłaniem strony gościom uzupełnij datę, miejsca, kontakt i informację o wykorzystaniu danych.

## Aktualizacja pól kontaktowych

Wklej nowy Code.gs, uruchom setup i zaktualizuj istniejące wdrożenie Apps Script, a następnie opublikuj stronę. Nowy frontend i skrypt używają wersji protokołu 7, aby starszy skrypt nie potwierdził zapisu bez kontaktu. ID zgłoszenia pozostaje w kolumnie I. W Do sprawdzenia dotychczasowy powód i status zostaną automatycznie przesunięte do M–N, z zachowaniem historii. Stare wpisy będą miały puste pola kontaktowe. Harmonogram kopii pozostaje bez zmian; nie trzeba ponownie uruchamiać installProtection.

## Nocleg i wybór pokoju

Maksymalnie dwóch gości na formularzu. Menu klasyczne i nocleg Tak są wybrane domyślnie. Nocleg ma opcje Tak/Nie, a rezygnacja wymaga potwierdzenia w popupie. Escape i Zostaję na noc anulują rezygnację.

Pod noclegiem Tak u każdego gościa pojawiają się dwie opcje radiowe: wspólny pokój z drugą osobą lub własny pokój. Zmiana rodzaju pokoju u jednej osoby automatycznie ustawia ten sam wariant u drugiej. Po dodaniu drugiego gościa, jeśli oboje nocują, domyślny jest wspólny pokój.

Wspólny pokój wymaga obecności i noclegu obu osób. Jeśli nocuje tylko jedna, ma własny pokój; opcja wspólnego jest wyszarzona z wyjaśnieniem. U osoby bez noclegu wybór pokoju jest ukryty. Anulowanie popupu rezygnacji nie zmienia wcześniejszego rodzaju pokoju.

Kolumna L w Zgloszenia to Rodzaj pokoju: Wspólny z Gościem 1/2, Własny pokój lub puste pole, jeśli osoba nie nocuje. Obie osoby mają spójne odpowiedzi także w podsumowaniu. Starsze wartości kolumny pozostają w historii bez przeliczania. W Do sprawdzenia powód i status pozostają w M–N.

Wklej aktualny Code.gs, uruchom setup (uaktualni nagłówki), zaktualizuj istniejące wdrożenie i opublikuj stronę. Nowa wersja protokołu 7 wymaga równoczesnej aktualizacji frontendu i skryptu Google. Serwer sprawdza limit dwóch osób i zgodność wspólnego pokoju.