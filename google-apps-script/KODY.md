# Kody 8-znakowe

> Instrukcja archiwalna. Aktualna wersja działa bez kodów; zobacz `BEZ-KODOW.md`. Poniższe opisy weryfikacji kodów nie dotyczą bieżącego formularza.

## Indywidualne linki

Po uruchomieniu `generateInvitationCodes` kolumna D zakładki `Zaproszenia` zawiera prywatny link, np. `https://wodkowski.github.io/wedding/#zaproszenie=K7PM4R9A`. Funkcja uzupełnia linki również dla istniejących krótkich kodów i zachowuje kody oraz ID. Nieaktywne lub niepoprawne kody nie otrzymują linku. Jeśli zmienisz domenę strony, zaktualizuj adres bazowy w `Code.gs` i ponownie uruchom generator.

Wyślij właściwy link prywatnie osobom z danego zaproszenia lub użyj go do przygotowania QR. Kod zostaje automatycznie wpisany w widoczne, rozwinięte pole. Ręczne wpisanie i poprawienie kodu pozostaje dostępne. Nie jest to potwierdzenie ważności zaproszenia — skrypt sprawdza je dopiero przy zapisie.

Kod jest we fragmencie po `#`, który nie jest wysyłany do serwera GitHub Pages. Pozostaje widoczny w pasku adresu i dla skryptów strony; nie publikuj linków. Aplikacja trzyma kod w pamięci otwartej strony, bez localStorage. Po przejściu do sekcji i odświeżeniu ponownie otwórz pełny link z zaproszenia. Dostęp do odpowiedzi nadal wymaga zgodnego imienia i nazwiska.

Zmianę strony trzeba opublikować w GitHub Pages. Aby generować linki w arkuszu, skopiuj aktualny `Code.gs` do Apps Script i uruchom `generateInvitationCodes`. Endpoint zapisujący odpowiedzi nie wymaga zmiany dla samego automatycznego uzupełniania kodu; jeśli nadal działa starsza walidacja, zaktualizuj też wdrożenie zgodnie z instrukcją poniżej.

Kody mają osiem liter i cyfr bez mylących 0, 1, I, O. Wielkość liter nie ma znaczenia. Generator sprawdza unikalność. Skrypt odrzuca kody 32-znakowe, nawet jeśli pozostały w arkuszu.

1. Wklej aktualny `Code.gs` do projektu Apps Script i zapisz.
2. Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż. Zachowaj to samo wdrożenie i URL `/exec`.
3. Aby wymienić istniejący kod, usuń tylko odpowiedni wiersz w zakładce `Zaproszenia` i uruchom `generateInvitationCodes`. Nie usuwaj gości ani ich ID. Nowe zaproszenia automatycznie otrzymają krótkie kody.
4. Przekaż nowy kod zainteresowanym prywatnie i sprawdź zapis z formularza. Wymieniony stary kod przestaje działać.

Krótsze kody są łatwiejsze do przepisania i do zgadnięcia niż wcześniejsze. Są losowe (40 bitów), ale nadal nie stanowią ochrony przed przeciążeniem publicznego endpointu.
