# Formularz bez kodów zaproszeń

## Osoba towarzysząca

Główny gość może zgłosić maksymalnie jedną osobę towarzyszącą. Tylko główny gość musi występować w `Goscie`. Formularz zbiera imię i nazwisko osoby towarzyszącej, jej menu, nocleg i opcjonalne alergie. Przy nieobecności głównego gościa ta opcja jest ukryta i nie jest zapisywana.

W `OdpowiedziV2` kolumny L–Q są automatycznie dodawane podczas pierwszego nowego zapisu: osoba towarzysząca (Tak/Nie), imię, nazwisko, menu, nocleg, alergie. Dane obu osób zapisują się w jednym wierszu. Ponowne wysłanie zastępuje także dane towarzyszące; wybranie „Nie” lub odmowa obecności usuwa poprzednie dane towarzyszące z tego wiersza. Nie trzeba ponownie uruchamiać `setup`.

Po wklejeniu nowego `Code.gs` zaktualizuj wersję istniejącego wdrożenia i opublikuj zmiany strony. Formularz i skrypt muszą używać tej wersji, aby potwierdzenie obejmowało również osobę towarzyszącą.

Aktualna wersja dopasowuje imię i nazwisko do całej zakładki `Goscie`. Wielkość liter i nadmiarowe odstępy nie mają znaczenia. Brak dopasowania albo więcej niż jedna osoba o tych samych danych powoduje odmowę zapisu.

1. Wklej aktualny `Code.gs` do Apps Script i zapisz.
2. Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż. Zachowaj dotychczasowy URL `/exec`.
3. Opublikuj pliki strony w GitHub Pages.
4. Uzupełniaj imiona i nazwiska w kolumnach B i C zakładki `Goscie`. Kolumna A może nadal zawierać ID zaproszenia; kolumnę D pozostaw dla ID gościa. Brakujące ID skrypt nada przy pierwszym zapisie. Nie zmieniaj już nadanych ID.
5. Sprawdź poprawny zapis, aktualizację odpowiedzi, odmowę dla osoby spoza listy i dla niejednoznacznych danych.

Zakładka `Zaproszenia`, kody i ich status aktywności nie są teraz sprawdzane. Dawne funkcje generowania pozostawiono na potrzeby ewentualnego powrotu do kodów; nie trzeba ich uruchamiać. Stare indywidualne linki nadal otwierają stronę, ale fragment z kodem jest ignorowany.

Każdy, kto zna imię i nazwisko z listy, może zapisać lub zmienić odpowiedź tej osoby. Lista gości nie jest zwracana przez endpoint, ale samo dopasowanie nazwiska nie potwierdza tożsamości. Arkusz pozostaw prywatny.
