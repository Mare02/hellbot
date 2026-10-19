# Hellbot Dashboard — redosled implementacije

Ovaj dokument razbija [arhitektonski plan](hellbot-dashboard.md) na zasebne implementacione taskove. Svaki task treba završiti i pregledati pre prelaska na sledeći.

Osnovne odluke:

- SQLite je izvor istine; bot koristi validiran RAM snapshot.
- Konfiguracija je odvojena za dev i prod profil.
- AI ključevi su zajednički za oba profila.
- Nema revision countera, periodičnog pollinga ni query-ja pri svakoj komandi.
- Activity zapisi nastaju zajedno sa izmenama od početka; stranica za njihov pregled dolazi kasnije.

## 1. SQLite osnova i tabele

- Dodati SQLite driver, konekciju i migration runner.
- Podesiti putanju baze van repozitorijuma, foreign keys, WAL i busy timeout.
- Napraviti `profiles`, `profile_configs`, `secrets` i `config_history`.
- Inicijalizovati dev/prod profile bez prepisivanja postojećih podataka.
- Definisati jedan kontrolisan korak za migracije pri pokretanju.

**Rezultat:** imamo trajnu bazu i ponovljivo kreiranje šeme. Bot još koristi postojeći config.

## 2. Šema konfiguracije i početni podaci

- Popisati postojeća podešavanja, promptove i mesta gde se koriste.
- Definisati Zod šemu i defaults za `config_json`.
- Razdvojiti profile settings, zajedničke AI ključeve i startup environment vrednosti.
- Napraviti eksplicitan početni import postojećih vrednosti.

**Rezultat:** znamo tačno šta selimo u bazu; novi startup ne prepisuje sačuvana podešavanja vrednostima iz env-a.

## 3. Čitanje i menjanje konfiguracije sa activity zapisima

- Dodati servis za čitanje konfiguracije po profilu.
- Implementirati promenu samo poslatih polja.
- U transakciji učitati trenutne podatke, spojiti izmene, validirati i sačuvati.
- U istoj transakciji upisati `config_history`.
- Sačuvati snapshot, promenjene putanje i identitet administratora.

**Rezultat:** svaka konfiguraciona izmena od početka ima activity zapis. Nema čuvanja izmene bez istorije.

## 4. Zajednički AI ključevi

- Implementirati enkripciju i dekripciju pomoću environment ključa.
- Dodavanje, zamena i brisanje više ključeva po provideru.
- Za dashboard vraćati samo bezbedne metapodatke.
- Beležiti operacije u activity log bez vrednosti ključeva.
- Povezati format ključeva sa postojećom rotacijom u botu.

**Rezultat:** storage za AI ključeve spreman je za oba profila.

## 5. Bot čita konfiguraciju iz baze

- Uvesti eksplicitan izbor dev/prod profila pri pokretanju.
- Napraviti `ConfigService` sa validiranim RAM snapshotom.
- Učitati konfiguraciju i zajedničke ključeve pre pokretanja zavisnih servisa.
- Postepeno prebaciti postojeće potrošače na `ConfigService`.
- Ukloniti module-level kopije vrednosti koje treba menjati live.

**Rezultat:** bot radi sa konfiguracijom iz baze, bez query-ja pri svakoj komandi. U ovom koraku izmene se učitavaju pri startupu.

## 6. Live primena preko IPC-a

- Dodati lokalnu komunikaciju između dashboard procesa i botova.
- Posle promene profila obavestiti odgovarajućeg bota.
- Posle promene zajedničkog ključa obavestiti oba bota.
- Validirati i atomarno zameniti snapshot.
- Osvežiti pogođene AI klijente i druge potrošače.
- Vratiti potvrdu primene ili grešku; podržati ponovno slanje obaveštenja.

**Rezultat:** razlikujemo „sačuvano” od „primenjeno”, bez pollinga i restarta procesa.

## 7. Express API i zaštita pristupa

- Dodati autorizaciju pre konfiguracionih ruta.
- Napraviti rute za profile, konfiguraciju i upravljanje ključevima.
- Dodati validaciju zahteva i bezbedne odgovore na greške.
- Povezati čuvanje sa IPC potvrdom.
- Identitet za activity log uzimati iz autorizovanog zahteva.

**Rezultat:** backend može bezbedno da podrži dashboard.

## 8. Dashboard osnova i prva podešavanja

- Iskoristiti postojeći React/Vite/Mantine scaffold.
- Dodati layout i dev/prod selector.
- Povezati UI sa API-jem.
- Implementirati prefix i embed boju kao prve jednostavne forme.
- Prikazati loading, greške, nesnimljene izmene i rezultat primene.

**Rezultat:** prvi kompletan tok **UI → baza → bot → potvrda u UI-ju**.

## 9. AI settings stranice

- Izbor providera i odgovarajućeg modela po profilu.
- Upravljanje zajedničkim API ključevima.
- Jasna oznaka da promena ključeva utiče na oba bota.
- Provera ključa kroz backend bez izlaganja tajne.
- Prikaz rezultata osvežavanja oba procesa.

**Rezultat:** AI podešavanja mogu da se menjaju kroz dashboard.

## 10. System prompts

- Pregled i uređivanje promptova po profilu.
- Validacija obaveznih placeholdera.
- Preview sa primerom podataka.
- Pregled ranijih vrednosti iz `config_history`.
- Vraćanje prethodnog prompta kao nove, evidentirane izmene.

**Rezultat:** upravljanje promptovima koristi postojeću istoriju, bez dodatnog sistema verzionisanja.

## 11. Ostala Hellbot podešavanja i feature switches

- Dodavati samo podešavanja potvrđena inventarom iz taska 2.
- Definisati ponašanje svake funkcije pri uključivanju i isključivanju.
- Povezati kontrole sa komandama, listenerima i poslovima.
- Dodati role-request routing ako taj workflow ostaje.

**Rezultat:** svako izloženo podešavanje stvarno utiče na ponašanje bota.

## 12. Activity log stranica

- Pregled konfiguracionih izmena i operacija nad ključevima.
- Filteri po profilu, vremenu i akciji, uključujući zajedničke izmene.
- Prikaz promenjenih polja i dostupnih prethodnih/novih vrednosti.
- Za ključeve prikazati samo akciju i bezbedne metapodatke.

**Rezultat:** vidiš šta si menjao, kada i za koji profil. Zapisi se već prikupljaju od taskova 3 i 4.

## 13. Errors i application logs

- Standardizovati strukturisane logove i redakciju tajni.
- Dodati profil i koristan kontekst.
- Podesiti ograničenje prostora i rotaciju.
- Dodati API i UI sa filterima.
- Jasno razdvojiti lokalne logove od Bugsnag događaja.

**Rezultat:** pregled rada i grešaka oba bota kroz dashboard.

## 14. VPS deployment i privatni pristup

- Podesiti tri PM2 procesa i njihove environment vrednosti.
- Podesiti trajnu lokaciju baze i encryption ključ.
- Završiti Tailscale pristup i pravila pristupa.
- Dokumentovati pokretanje, migracije i oporavak.

**Rezultat:** dashboard je spreman za korišćenje na VPS-u.

## Način rada

Krenuti samo sa taskom 1. Taskovi 2–6 završavaju konfiguracionu osnovu pre pravljenja formi. Svaki task držati kao zasebnu, preglednu implementacionu celinu.
