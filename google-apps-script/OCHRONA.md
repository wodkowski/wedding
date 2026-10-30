# Kopie zapasowe i tryb ochronny

Nie dodajemy Turnstile ani kodów. Imiona i nazwiska nadal nie są porównywane z listą; duplikaty są dozwolone. Ochrona sprawdza wyłącznie tempo wysyłania poprawnie wypełnionych formularzy, globalnie dla strony. Nie rozpoznaje tożsamości ani adresów IP.

## Uruchomienie na koncie Google

1. Otwórz projekt Apps Script przypisany do właściwego prywatnego arkusza na osobnym koncie Google.
2. Wklej całą aktualną zawartość `Code.gs` i zapisz.
3. Wybierz funkcję **installProtection** i uruchom ją ręcznie. Funkcja uruchamia także `setup` — nie trzeba robić tego osobno.
4. Zatwierdź dodatkowe uprawnienia do Dysku Google (tworzenie kopii) i harmonogramu Apps Script. Wykonuj to tylko na swoim projekcie i dedykowanym koncie.
5. Powstaną zakładki **Do sprawdzenia** i **Ochrona**, folder **Wesele — kopie arkusza**, pierwsza pełna kopia oraz dzienny wyzwalacz `dailyBackup`.
6. Wybierz Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż. Zachowaj ten sam adres `/exec`.
7. Odśwież arkusz. Pojawi się menu **Ochrona formularza**. Sprawdź link do pierwszej kopii w zakładce Ochrona i wyzwalacz dailyBackup w edytorze Apps Script (ikona zegara).

Samo wklejenie kodu nie włącza harmonogramu kopii. Funkcję instalacyjną musi uruchomić właściciel. Ponowne uruchomienie zachowuje folder i nie dodaje drugiego wyzwalacza dla tego samego użytkownika. Używaj do instalacji jednego, dedykowanego konta. Automat działa w Google także po zamknięciu strony i tego czatu.

## Kopie arkusza

- Pierwsza kopia powstaje przy instalacji, kolejne raz dziennie, zwykle między **03:00 a 04:00 Europe/Warsaw**. Google nie gwarantuje dokładnej minuty.
- Kopia jest osobnym plikiem Arkuszy Google, nie eksportem `.xlsx`. Zawiera cały arkusz wraz ze wszystkimi zakładkami, w tym kolejką do sprawdzenia. Nazwa zawiera datę i godzinę.
- W menu **Zrób kopię teraz** możesz zrobić dodatkową kopię ręcznie.
- Folder kopii utworzony na Twoim koncie pozostaw prywatny. Nie są publikowane żadne nowe linki na stronie ani w repozytorium.
- Nie usuwamy automatycznie starszych kopii. Zajmują miejsce na Dysku; sprawdzaj je okresowo.
- Zakładka **Ochrona** pokazuje datę i link ostatniej udanej kopii oraz ostatni błąd. Błąd kopii nie zatrzymuje formularza. Wyjątek jest też widoczny w wykonaniach Apps Script.
- Aby odzyskać dane, otwórz wybraną kopię, sprawdź datę i skopiuj potrzebne wiersze do roboczego arkusza. Nie zastępuj bez sprawdzenia nowszych, poprawnych zgłoszeń. Kopia nie przełącza automatycznie działającego formularza na inny plik.

## Wykrywanie wzrostu ruchu

Domyślne parametry znajdują się w stałej `PROTECTION` na początku `Code.gs`:

- więcej niż **20 formularzy w ostatnich 5 minutach**, lub
- więcej niż **100 osób zgłoszonych w ostatnich 5 minutach**.

Dokładnie 20 formularzy lub 100 osób jeszcze nie przekracza progu. Zgłoszenie przekraczające próg trafia w całości do **Do sprawdzenia**, wraz ze wspólnym ID zgłoszenia, datą, powodem i statusem **Oczekuje**. Kolejne też trafiają do tej zakładki przez co najmniej **30 minut**. Kolejna wykryta seria przedłuża ten okres. Po spokojniejszym okresie nowe zgłoszenia wracają automatycznie do `Zgloszenia`.

Nic nie jest automatycznie kasowane. Gość dostaje normalne potwierdzenie, bo jego dane zostały zapisane w kolejce. Liczenie dużych zgłoszeń nie dzieli ich na osoby w różnych zakładkach. Powtórzone nazwiska same w sobie nie są podejrzane.

Pierwsze zgłoszenia przed osiągnięciem progu pozostają na głównej liście; nie przenosimy ich automatycznie. Stan w panelu jest stanem z ostatniego zapisu, kopii lub ręcznego odświeżenia — użyj **Odśwież stan ochrony**, jeśli arkusz długo był bez ruchu. Nie ma automatycznych wiadomości e-mail o kolejce; trzeba sprawdzać arkusz.

## Sprawdzanie odpowiedzi i ręczne sterowanie

Menu **Ochrona formularza**:

- **Odśwież stan ochrony** — pokazuje aktualny stan i ostatnią kopię.
- **Zatwierdź wybrane zgłoszenia** — w `Do sprawdzenia` zaznacz wiersz lub wiersze poprawnych osób. Przeniesione zostaną całe formularze o tych ID, także pozostali goście z grupy. Wiersze pozostają w kolejce ze statusem **Zatwierdzone**, aby zachować historię. Ponowne zatwierdzenie tej samej grupy nie kopiuje jej ponownie. Nie jest to usuwanie zwykłych duplikatów: osobne wysyłki nadal mają osobne ID i mogą zostać zatwierdzone niezależnie.
- **Włącz ręczną weryfikację** — wszystkie nowe zgłoszenia trafiają do kolejki aż do ręcznego wznowienia. Nie blokuje gościom wysyłania formularza.
- **Wznów normalny zapis** — wyłącza tryb ręczny, czyści licznik serii i okres ochronny. Kolejna podejrzana seria może włączyć ochronę ponownie. Nie zatwierdza i nie usuwa istniejącej kolejki.
- **Zrób kopię teraz** — dodatkowy snapshot.

Możesz też uruchamiać te funkcje z edytora Apps Script: `refreshProtectionStatus`, `approveSelectedSubmissions`, `enableReviewMode`, `resumeNormalSubmissions`, `createBackupNow`. Zatwierdzanie wymaga zaznaczenia wierszy w zakładce Do sprawdzenia. Nie zmieniaj ręcznie ID zgłoszeń ani kolumn technicznych.

## Ograniczenia

To ochrona głównej listy i kopie bezpieczeństwa, nie pełna blokada botów. Bot może nadal zapełniać zakładkę Do sprawdzenia lub zużywać limity Apps Script/Dysku. Także prawdziwa nagła seria od gości może trafić do sprawdzenia. Nie da się zagwarantować zachowania dostępności publicznego `/exec` przy dużym ataku. Po przekroczeniu limitów Google również kopie mogą się nie wykonać; ostatnia udana kopia pozostaje dostępna.

Źródła: https://developers.google.com/apps-script/reference/drive/file, https://developers.google.com/apps-script/reference/script/clock-trigger-builder, https://developers.google.com/apps-script/guides/services/quotas.

## Testy lokalne

`node --test tests/*.test.mjs` sprawdza progi, ruch w oknie czasu, automatyczny powrót, tryb ręczny, zatwierdzanie grup, harmonogram bez duplikacji i awarie kopii. Atrapy API Google nie zastępują sprawdzenia uprawnień i pierwszej rzeczywistej kopii na Twoim koncie.
