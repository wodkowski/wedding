# Kody 8-znakowe

Kody mają osiem liter i cyfr bez mylących 0, 1, I, O. Wielkość liter nie ma znaczenia. Generator sprawdza unikalność. Skrypt odrzuca kody 32-znakowe, nawet jeśli pozostały w arkuszu.

1. Wklej aktualny `Code.gs` do projektu Apps Script i zapisz.
2. Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż. Zachowaj to samo wdrożenie i URL `/exec`.
3. Aby wymienić istniejący kod, usuń tylko odpowiedni wiersz w zakładce `Zaproszenia` i uruchom `generateInvitationCodes`. Nie usuwaj gości ani ich ID. Nowe zaproszenia automatycznie otrzymają krótkie kody.
4. Przekaż nowy kod zainteresowanym prywatnie i sprawdź zapis z formularza. Wymieniony stary kod przestaje działać.

Krótsze kody są łatwiejsze do przepisania i do zgadnięcia niż wcześniejsze. Są losowe (40 bitów), ale nadal nie stanowią ochrony przed przeciążeniem publicznego endpointu.
