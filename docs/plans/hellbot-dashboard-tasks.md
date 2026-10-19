# Hellbot Dashboard — redosled implementacije

Ovaj dokument razbija [arhitektonski plan](hellbot-dashboard.md) na zasebne implementacione taskove. Svaki task treba završiti i pregledati pre prelaska na sledeći.

Osnovne odluke:

- SQLite je izvor istine; bot koristi validiran RAM snapshot.
- Konfiguracija je odvojena za dev i prod profil.
- AI ključevi su zajednički za bot servise unutar jedne instalacije; local dev i VPS prod imaju odvojene baze i ključeve.
- Nema revision countera, periodičnog pollinga ni query-ja pri svakoj komandi.
- Activity zapisi nastaju zajedno sa izmenama od početka; stranica za njihov pregled dolazi kasnije.
- Upravljanje AI system promptovima je odloženo. Promptovi za sada ostaju u kodu i ne ulaze u import konfiguracije ni dashboard.

## 1. SQLite osnova i tabele

**Status:** implementirano. Detalji pokretanja i granice ovog taska su u [database setup](../database.md).

- Dodati SQLite driver, konekciju i migration runner.
- Podesiti putanju baze van repozitorijuma, foreign keys, WAL i busy timeout.
- Napraviti `profiles`, `profile_configs`, `secrets` i `config_history`.
- Inicijalizovati dev/prod profile bez prepisivanja postojećih podataka.
- Definisati jedan kontrolisan korak za migracije pri pokretanju.

**Rezultat:** imamo trajnu bazu i ponovljivo kreiranje šeme. Bot još koristi postojeći config.

## 2. Šema konfiguracije i početni podaci

**Status:** implementirano. Šema, potrošači i eksplicitan import opisani su u [configuration inventory](../config-inventory.md).

- Popisati postojeća podešavanja i mesta gde se koriste.
- Definisati Zod šemu i defaults za `config_json`.
- Razdvojiti profile settings, zajedničke AI ključeve i startup environment vrednosti.
- Napraviti eksplicitan početni import postojećih vrednosti.

**Rezultat:** znamo tačno šta selimo u bazu; novi startup ne prepisuje sačuvana podešavanja vrednostima iz env-a.

## 3. Čitanje i menjanje konfiguracije sa activity zapisima

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Dodati servis za čitanje konfiguracije po profilu.
- Implementirati promenu samo poslatih polja.
- U transakciji učitati trenutne podatke, spojiti izmene, validirati i sačuvati.
- U istoj transakciji upisati `config_history`.
- Sačuvati snapshot, promenjene putanje i identitet administratora.

**Rezultat:** svaka konfiguraciona izmena od početka ima activity zapis. Nema čuvanja izmene bez istorije.

## 4. Zajednički AI ključevi

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Implementirati enkripciju i dekripciju pomoću environment ključa.
- Dodavanje, zamena i brisanje više ključeva po provideru.
- Za dashboard vraćati samo bezbedne metapodatke.
- Beležiti operacije u activity log bez vrednosti ključeva.
- Povezati format ključeva sa postojećom rotacijom u botu.

**Rezultat:** storage za AI ključeve spreman je unutar svake instalacije.

## 5. Bot čita konfiguraciju iz baze

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Izvesti aktivni dev/prod profil isključivo iz `NODE_ENV`; ne dozvoliti prebacivanje profila kroz dashboard.
- Napraviti `ConfigService` sa validiranim RAM snapshotom.
- Učitati konfiguraciju i zajedničke ključeve pre pokretanja zavisnih servisa.
- Postepeno prebaciti postojeće potrošače na `ConfigService`.
- Ukloniti module-level kopije vrednosti koje treba menjati live.

**Rezultat:** bot radi sa konfiguracijom iz baze, bez query-ja pri svakoj komandi. U ovom koraku izmene se učitavaju pri startupu.

## 6. Live primena preko IPC-a

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Dodati lokalnu komunikaciju između dashboard procesa i aktivnog bot procesa.
- Posle promene konfiguracije obavestiti samo lokalnog aktivnog bota.
- Posle promene ključa obavestiti samo lokalnog aktivnog bota.
- Validirati i atomarno zameniti snapshot.
- Osvežiti pogođene AI klijente i druge potrošače.
- Vratiti potvrdu primene ili grešku; podržati ponovno slanje obaveštenja.

**Rezultat:** razlikujemo „sačuvano” od „primenjeno”, bez pollinga i restarta procesa.

## 7. Express API i validacija zahteva

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Dashboard se otvara direktno, bez login-a ili sesija; API sluša na loopback adresi.
- Napraviti rute za profile, konfiguraciju i upravljanje ključevima.
- Dodati validaciju zahteva i bezbedne odgovore na greške.
- Povezati čuvanje sa IPC potvrdom.
- Za activity log koristiti konfigurisani owner ID; zahteve iz browsera proveravati kroz dozvoljeni Origin i dashboard header.

**Rezultat:** backend može bezbedno da podrži dashboard.

## 8. Dashboard osnova i prva podešavanja

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Iskoristiti postojeći React/Vite/Mantine scaffold.
- Dodati layout koji prikazuje `NODE_ENV` okruženje bez dev/prod selector-a.
- Povezati UI sa API-jem.
- Implementirati prefix i embed boju kao prve jednostavne forme.
- Prikazati loading, greške, nesnimljene izmene i rezultat primene.

**Rezultat:** prvi kompletan tok **UI → baza → bot → potvrda u UI-ju**.

## 9. AI settings stranice

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Izbor providera i odgovarajućeg modela za aktivno okruženje.
- Upravljanje API ključevima koji se dele između servisa te instalacije.
- Jasna oznaka da promena ključeva utiče na aktivnog bota.
- Provera ključa kroz backend bez izlaganja tajne.
- Prikaz rezultata osvežavanja aktivnog procesa.
- Dodati pregled registrovanih AI tools-a sa nazivom, opisom i pojedinačnim toggle-om, odvojeno za dev/prod.
- Proširiti Zod šemu i konfiguraciju poljem `ai.tools`; prihvatati samo poznate tools iz registra. Početne vrednosti čuvaju trenutno ponašanje i ograničenja pristupa.
- Isključene tools izostaviti iz svakog zahteva modelu, uključujući follow-up zahteve, i proveriti trenutno stanje neposredno pre izvršavanja svakog tool poziva.
- Blokirati naredne pozive isključenog tool-a i u već započetom razgovoru. Operacije koje su već počele ne otkazujemo niti poništavamo toggle-om.
- Zadržati postojeće permission i contextual access provere; uključen tool ne daje dodatna prava.
- Promene tools-a primenjivati live kroz IPC i beležiti u Activity log.

**Rezultat:** AI podešavanja i dostupnost pojedinačnih tools-a menjaju se za okruženje na kom dashboard radi.

## 10. Ostala Hellbot podešavanja i feature switches

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Dodavati samo podešavanja potvrđena inventarom iz taska 2.
- Definisati ponašanje svake funkcije pri uključivanju i isključivanju.
- Povezati kontrole sa komandama, listenerima i poslovima.
- Dodati per-profile server, channel, category i role ID podešavanja za Hellbot integracije, uz role-request routing, migraciju postojećih vrednosti i live osvežavanje potrošača. Staff notification role je samo mention cilj, bez starog staff permission/sync sistema.

**Rezultat:** svako izloženo podešavanje stvarno utiče na ponašanje bota.

## 11. Activity log stranica

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Pregled konfiguracionih izmena i operacija nad ključevima.
- Filteri po vremenu i akciji, uključujući promene zajedničkih ključeva na toj instalaciji.
- Prikaz promenjenih polja i dostupnih prethodnih/novih vrednosti.
- Za ključeve prikazati samo akciju i bezbedne metapodatke.

**Rezultat:** vidiš šta si menjao i kada u aktivnom okruženju. Zapisi se već prikupljaju od taskova 3 i 4.

## 12. Errors i application logs

**Status:** implementirano u kodu; source review i frontend build završeni. Live Discord/provider i browser provera nije rađena. Videti [dashboard operation](../dashboard.md).

- Standardizovati strukturisane logove i redakciju tajni.
- Dodati profil i koristan kontekst.
- Podesiti ograničenje prostora i rotaciju.
- Dodati API i UI sa filterima.
- Jasno razdvojiti lokalne logove od Bugsnag događaja.

**Rezultat:** pregled rada i grešaka aktivnog bota kroz dashboard.

## 13. VPS deployment i privatni pristup

- Podesiti bot i dashboard PM2 procese na VPS-u sa `NODE_ENV=production`.
- Podesiti trajnu lokaciju baze i encryption ključ.
- Završiti Tailscale pristup i pravila pristupa.
- Dokumentovati pokretanje, migracije i oporavak.

**Rezultat:** dashboard je spreman za korišćenje na VPS-u.

## Način rada

Taskovi 1–12 implementirani su lokalno. Task 13 (VPS deployment i Tailscale) ostaje za zaseban zahtev. Promene nisu automatski commitovane ili pushovane.
