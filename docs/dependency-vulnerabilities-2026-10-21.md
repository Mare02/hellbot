# Hellbot — otvorena upozorenja o ranjivostima zavisnosti

Datum provere: **2026-10-21 16:52:34 CEST**. Pregledani commit: `f0d641ffa2457b4ad3e290fd7216cf1ad74f1a4e`.
Repo i live VPS bili su na istom commitu. Status stavki: **otvoreno; ovaj dokument ne menja zavisnosti**.

## 1. Rezultat i objašnjenje brojeva

| Izvor | Šta se broji | High | Moderate / Medium | Low | Critical | Ukupno |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| GitHub Dependabot, oba lockfile-a | Otvoreni alerti po advisory-ju i manifestu | 27 | 27 | 9 | 0 | 63 |
| GitHub, deduplikovano po GHSA ID-u | Različiti advisory-ji | 17 | 16 | 5 | 0 | 38 |
| Live `pnpm audit --json` | Advisory-ji za `pnpm-lock.yaml` | 17 | 16 | 5 | 0 | 38 |
| `npm audit --json` | Pogođeni paketi i paketi koji zavise od njih | 5 | 4 | 0 | 0 | 9 |

GitHub-ovih 63 alerta pokriva **38 advisory-ja u pnpm lockfile-u i 25 u npm lockfile-u**. Više alerta zato opisuje isti problem u dva manifesta. npm-ovih 9 nije broj svih CVE/GHSA problema: npm grupiše nalaze po paketima, uključujući roditeljske pakete pogođene tranzitivnim zavisnostima. Njegovih 25 direktnih advisory-ja je podskup istih 38.

Provereni su i `npm audit --omit=dev --json` i live `pnpm audit --prod --json`; u ovom snapshot-u daju iste brojeve kao kompletne provere. `nodemon` je trenutno u `dependencies`, pa se njegov razvojni watcher i tranzitivni paketi računaju kao produkcijske zavisnosti. To ne dokazuje da su aktivni u PM2 produkcijskom procesu.

**Potvrđeno:** ranjive verzije su zaključane i navedene live verzije su proverene čitanjem instaliranih paketa. **Nije potvrđeno:** da se svaki advisory može iskoristiti kroz Hellbot komandu, dashboard ili Discord poruku. Nisu izvršavani exploit-i, opterećivanje servera ili testovi nad tuđim podacima. Ovo je inventar upozorenja zavisnosti i procena njihovog konteksta, a ne kompletan bezbednosni audit aplikacije.

## 2. Verzije i putevi zavisnosti

CI i VPS koriste **pnpm 12.6.0**, Node na VPS-u je **24.21.0**. Autoritativan za trenutni deploy je `pnpm-lock.yaml`. `package-lock.json` zaključava drugačije tranzitivne verzije.

| Paket / roditelj | Live pnpm verzija | npm lockfile verzija | Put u projektu / live stablu |
| --- | --- | --- | --- |
| `@discordjs/rest` → `undici` | `2.4.2` → `6.19.8` | Ista stara direktna grana; postoje i `undici 6.29.0` kopije | Direktni REST import u slash registraciji |
| `ws` | `8.18.0` | `8.22.0` | `discord.js` → `@discordjs/ws` → `ws` |
| `lodash` | `4.17.21` | `4.18.1` | `discord.js` → `@discordjs/builders` → `@sapphire/shapeshift` → `lodash` |
| `nodemon` | `3.1.9` | `3.1.14` | Root `dependencies`; koriste ga lokalni razvojni scriptovi |
| `braces` | `3.0.3` | `3.0.3` | `nodemon` → `chokidar 3.6.0` → `braces` |
| `minimatch` | `3.1.2` | `10.2.5` | `nodemon` → `minimatch` |
| `brace-expansion` | `1.1.11` | `5.0.7` | `nodemon` → `minimatch` → `brace-expansion` |
| `picomatch` | `2.3.1` | `2.3.2`; build alati imaju i `4.0.7` | `nodemon` → `chokidar` → `anymatch` / `readdirp` → `picomatch` |
| `uuid` | `8.3.2` | `8.3.2` | `node-cron 3.0.3` → `uuid` |
| `moment` | `2.30.1` | `2.30.1` | Direktna zavisnost bez pronađenog importa u aplikaciji |

Zato raniji pregled sa 9 npm stavki nije bio kompletan prikaz live pnpm stabla: live ima i stare `ws`, `lodash`, `minimatch` i `picomatch` verzije. Samo osvežavanje npm lockfile-a ne popravlja pnpm deploy.

## 3. Problemi po grupama i preporučene popravke

### 3.1. Undici / direktni @discordjs/rest — prioritet P1

Postoji **17 advisory-ja**: rušenje ili iscrpljivanje resursa, HTTP/CRLF i cookie obrada, WebSocket validacija i slabija slučajnost. Stara verzija `6.19.8` dolazi iz direktno pinovanog `@discordjs/rest 2.4.2`.

Aplikacija koristi taj REST import u [slash registraciji](../src/commands/slashCommands/updateslashcommands.js). Deo advisory-ja odnosi se na opcione WebSocket, cookie i retry funkcije; nije dokazano da ih taj Hellbot poziv koristi. Saobraćaj ide ka Discord API-ju, pa ovo samo po sebi nije dokaz da obična Discord poruka može srušiti bot.

Predlog: uskladiti direktni `@discordjs/rest` sa već korišćenim `2.6.3`, ili koristiti postojeći `REST` export iz `discord.js` i ukloniti duplu direktnu zavisnost. U zaključanom stablu obezbediti `undici >=6.28.1` za ove advisory-je; `6.29.0` već postoji u drugim granama. Proveriti registraciju slash komandi i deploy notifikaciju. Ovo se odnosi na npm paket `undici`; Node-ov ugrađeni `fetch` ima zaseban životni ciklus zakrpa.

### 3.2. ws — prioritet P1

Live `ws 8.18.0` ima **2 advisory-ja**, za otkrivanje neinicijalizovane memorije i iscrpljivanje memorije fragmentima. Paket se koristi u stvarnoj Discord Gateway vezi preko `@discordjs/ws`; npm lockfile ga već zaključava na `8.22.0`.

Predlog: osvežiti pnpm tranzitivnu rezoluciju na kompatibilan `ws >=8.21.0` (npr. `8.22.0`). Proveriti Discord povezivanje i reconnect. Relevantan parser radi u produkciji, ali nisu potvrđeni svi uslovi pojedinačnih advisory-ja niti mogućnost direktnog pristupa napadača Gateway vezi. [Izvor: ws memory disclosure](https://github.com/advisories/GHSA-58qx-3vcg-4xpx).

### 3.3. Lodash — prioritet P1 za zakrpu, iskorišćenost nije potvrđena

Live `lodash 4.17.21` ima **3 advisory-ja**: code injection u `_.template` i prototype pollution u `_.unset` / `_.omit`. Dolazi iz Discord builder validatora. Nije pronađen direktni Hellbot poziv ovih ranjivih funkcija; samo prisustvo `lodash` ne potvrđuje izvršavanje proizvoljnog koda.

Predlog: osvežiti kompatibilnu 4.x tranzitivnu rezoluciju na **4.18.1 ili noviju proverenu zakrpu**, koja je već u npm lockfile-u. GitHub za dva alerta navodi prvu zakrpu `4.18.0`, dok registry audit konzervativnije navodi `>=4.18.1`; cilj je stroža verzija. Proveriti generisanje komandi, embedova i validaciju builder podataka. [Izvor: template advisory](https://github.com/advisories/GHSA-r5fr-rjxr-66jc).

### 3.4. Nodemon / braces — prioritet P2, razvojni alat

`braces 3.0.3` ima **1 high advisory**: duboko ugnježdeni glob obrasci mogu iscrpeti stack. Prijavljena zakrpljena verzija trenutno ne postoji. `nodemon` i `chokidar` dobijaju izvedena upozorenja preko tog paketa.

PM2 pokreće `src/main.js` i `src/dashboard/server.js`, a ne nodemon. Nije pronađen put od Discord poruke do nodemon glob parsera. Međutim, nodemon je u produkcijskoj grupi paketa, a deploy trenutno instalira i razvojne zavisnosti radi Vite build-a.

Predlog: premestiti nodemon u `devDependencies` radi tačne klasifikacije; time se **ne zakrpljuje** ranjivost. Za potpuno uklanjanje razmotriti Node 24 `--watch`, ili podržanu watcher zamenu / upstream zakrpu. Ne primenjivati naslepo npm-ov predlog downgrade-a na `nodemon 1.14.10`. [Izvor: braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

### 3.5. Minimatch — prioritet P2

Live `3.1.2` ima **3 high ReDoS advisory-ja**: posebno oblikovani glob obrasci izazivaju prekomeran CPU rad. Put je kroz nodemon; nije pronađeno prosleđivanje Discord sadržaja tom alatu.

Predlog: osvežiti kompatibilnu 3.x granu najmanje na **3.1.4**, ili ukloniti celu nodemon granu odgovarajućom zamenom. npm lockfile koristi drugu major granu (`10.2.5`); ne nametati major tranzitivni override bez provere roditeljskog paketa.

### 3.6. Brace-expansion — prioritet P2

Live `1.1.11` ima **8 advisory-ja** za ReDoS, beskonačnu / preveliku ekspanziju, CPU, memoriju i stack exhaustion. npm koristi `5.0.7`, koji ima **5 istih GHSA problema**, ali drugačije pogođene opsege i zakrpe.

Predlog: za pnpm 1.x granu koristiti **>=1.1.21** da se pokriju svi trenutno prijavljeni problemi; za npm 5.x granu **>=5.0.12**. Prve zakrpe pojedinačnih advisory-ja nisu dovoljne za celu grupu. Rizik je ovde vezan za razvojni watcher i obradu obrazaca.

### 3.7. Picomatch — prioritet P2

Live `2.3.1` ima **2 advisory-ja**: pogrešno glob podudaranje zbog method injection-a i ReDoS kroz extglob kvantifikatore. Paket dolazi kroz nodemon/chokidar; npm već ima zakrpljenu `2.3.2` kopiju ove grane.

Predlog: kompatibilna tranzitivna nadogradnja na **>=2.3.2**, uz proveru lokalnog watch ponašanja.

### 3.8. Moment — prioritet P2

`moment 2.30.1` ima **1 moderate advisory**, path traversal pri posebno oblikovanom locale argumentu. Pretraga izvornog koda nije pronašla import Moment-a niti prosleđivanje korisničkog locale argumenta.

Predlog: ukloniti neupotrebljenu direktnu zavisnost nakon potvrde da nema dodatnog potrošača; ako ostaje, nadograditi na **>=2.31.0**.

### 3.9. UUID / node-cron — prioritet P3 za proveru kompatibilnosti

`uuid 8.3.2` ima **1 moderate advisory** za v3/v5/v6 funkcije kada se prosleđuje izlazni buffer. `node-cron 3.0.3` koristi `uuid.v4()` za nazive taskova, a aplikacioni ID-jevi koriste Node `crypto.randomUUID()`. U pregledanom putu nije pronađen okidač opisanog problema. [Izvor: uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

Predlog: planirati podržanu nadogradnju node-cron-a i njegovih zavisnosti. npm predlaže `node-cron 4.6.0`, što je major promena. Posebno proveriti start/stop, rasporede, runtime reload i [korišćenje `task.options.name` / `cron.getTasks()`](../src/kernel.js). Ne nametati `uuid` major override bez provere kompatibilnosti. Advisory navodi zakrpu **>=11.1.1**.

## 4. Kompletan inventar 38 advisory-ja

Severity je oznaka advisory baze, a prioritet rada u Hellbot kontekstu je objašnjen iznad. Opseg je za live pnpm granu; npm-specifični opsezi i zakrpe su u tabeli svih GitHub alerta ispod. Naslovi su originalni radi pouzdanog povezivanja sa bazom.

| Paket | GHSA / CVE | Severity | Problem | Pogođena live verzija | Pogođeni pnpm opseg | Zakrpljeno po pnpm auditu | Prisutan u npm auditu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| brace-expansion | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) / CVE-2026-13149 | high | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups | 1.1.11 | <1.1.16 | >=1.1.16 | Ne |
| brace-expansion | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) / CVE-2026-102276 | high | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion | 1.1.11 | <1.1.19 | >=1.1.19 | Da |
| brace-expansion | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) / CVE-2026-14257 | high | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash | 1.1.11 | <1.1.17 | >=1.1.17 | Da |
| brace-expansion | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) / CVE-2026-102278 | high | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion | 1.1.11 | <1.1.20 | >=1.1.20 | Da |
| brace-expansion | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) / CVE-2026-69152 | high | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation | 1.1.11 | <1.1.18 | >=1.1.18 | Da |
| brace-expansion | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) / CVE-2026-33750 | moderate | brace-expansion: Zero-step sequence causes process hang and memory exhaustion | 1.1.11 | <1.1.13 | >=1.1.13 | Ne |
| brace-expansion | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) / CVE-2026-102277 | moderate | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service | 1.1.11 | <1.1.21 | >=1.1.21 | Da |
| brace-expansion | [GHSA-v6h2-p8h4-qcjw](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) / CVE-2025-5889 | low | brace-expansion Regular Expression Denial of Service vulnerability | 1.1.11 | >=1.0.0 <=1.1.11 | >=1.1.12 | Ne |
| braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) / CVE-2026-93687 | high | braces vulnerable to stack-exhaustion denial of service through deeply nested patterns | 3.0.3 | <=3.0.3 | Nema prijavljene zakrpe | Da |
| lodash | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) / CVE-2026-4800 | high | lodash vulnerable to Code Injection via `_.template` imports key names | 4.17.21 | >=4.0.0 <=4.17.23 | >=4.18.1 | Ne |
| lodash | [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) / CVE-2026-2950 | moderate | lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` | 4.17.21 | <=4.17.23 | >=4.18.1 | Ne |
| lodash | [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) / CVE-2025-13465 | moderate | Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions | 4.17.21 | >=4.0.0 <=4.17.22 | >=4.17.23 | Ne |
| minimatch | [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) / CVE-2026-27904 | high | minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions | 3.1.2 | <3.1.4 | >=3.1.4 | Ne |
| minimatch | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) / CVE-2026-26996 | high | minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern | 3.1.2 | <3.1.3 | >=3.1.3 | Ne |
| minimatch | [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) / CVE-2026-27903 | high | minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments | 3.1.2 | <3.1.3 | >=3.1.3 | Ne |
| moment | [GHSA-4p3w-j4w9-5jqw](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw) / CVE-2026-17495 | moderate | moment vulnerable to Path Traversal via crafted non-string locale name | 2.30.1 | >=2.29.2 <2.31.0 | >=2.31.0 | Da |
| picomatch | [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) / CVE-2026-33671 | high | Picomatch has a ReDoS vulnerability via extglob quantifiers | 2.3.1 | <2.3.2 | >=2.3.2 | Ne |
| picomatch | [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p) / CVE-2026-33672 | moderate | Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching | 2.3.1 | <2.3.2 | >=2.3.2 | Ne |
| undici | [GHSA-f269-vfmq-vjvj](https://github.com/advisories/GHSA-f269-vfmq-vjvj) / CVE-2026-1528 | high | Undici: Malicious WebSocket 64-bit length overflows parser and crashes the client | 6.19.8 | >=6.0.0 <6.24.0 | >=6.24.0 | Da |
| undici | [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) / CVE-2026-19534 | high | undici vulnerable to Denial of Service via unrequested WebSocket subprotocol | 6.19.8 | >=6.7.0 <6.28.1 | >=6.28.1 | Da |
| undici | [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) / CVE-2026-2229 | high | Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation | 6.19.8 | <6.24.0 | >=6.24.0 | Da |
| undici | [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) / CVE-2026-1526 | high | Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression | 6.19.8 | <6.24.0 | >=6.24.0 | Da |
| undici | [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) / CVE-2026-12151 | high | undici WebSocket client vulnerable to denial of service via fragment count bypass | 6.19.8 | <6.27.0 | >=6.27.0 | Da |
| undici | [GHSA-2mjp-6q6p-2qxm](https://github.com/advisories/GHSA-2mjp-6q6p-2qxm) / CVE-2026-1525 | moderate | Undici has an HTTP Request/Response Smuggling issue | 6.19.8 | <6.24.0 | >=6.24.0 | Da |
| undici | [GHSA-4992-7rv2-5pvq](https://github.com/advisories/GHSA-4992-7rv2-5pvq) / CVE-2026-1527 | moderate | Undici has CRLF Injection in undici via `upgrade` option | 6.19.8 | <6.24.0 | >=6.24.0 | Da |
| undici | [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) / CVE-2026-16728 | moderate | undici vulnerable to downstream response desynchronization via retry interceptor | 6.19.8 | <6.28.0 | >=6.28.0 | Da |
| undici | [GHSA-c76h-2ccp-4975](https://github.com/advisories/GHSA-c76h-2ccp-4975) / CVE-2025-22150 | moderate | Use of Insufficiently Random Values in undici | 6.19.8 | >=6.0.0 <6.21.1 | >=6.21.1 | Da |
| undici | [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9) / CVE-2026-22036 | moderate | Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion | 6.19.8 | <6.23.0 | >=6.23.0 | Da |
| undici | [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) / CVE-2026-15157 | moderate | undici vulnerable to CRLF Injection via blob-like body 'type' property | 6.19.8 | <6.28.0 | >=6.28.0 | Da |
| undici | [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) / CVE-2026-9679 | moderate | undici vulnerable to HTTP header injection via Set-Cookie percent-decoding | 6.19.8 | <6.27.0 | >=6.27.0 | Da |
| undici | [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) / CVE-2026-16729 | moderate | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields | 6.19.8 | <6.28.0 | >=6.28.0 | Da |
| undici | [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) / CVE-2026-6733 | low | undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse | 6.19.8 | <6.27.0 | >=6.27.0 | Da |
| undici | [GHSA-cxrh-j4jr-qwg3](https://github.com/advisories/GHSA-cxrh-j4jr-qwg3) / CVE-2025-47279 | low | undici Denial of Service attack via bad certificate data | 6.19.8 | >=6.0.0 <6.21.2 | >=6.21.2 | Da |
| undici | [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) / CVE-2026-11525 | low | undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching | 6.19.8 | <6.27.0 | >=6.27.0 | Da |
| undici | [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) / CVE-2026-18540 | low | undici vulnerable to downstream response splitting via retry interceptor | 6.19.8 | <6.28.1 | >=6.28.1 | Da |
| uuid | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) / CVE-2026-41907 | moderate | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided | 8.3.2 | <11.1.1 | >=11.1.1 | Da |
| ws | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) / CVE-2026-48779 | high | ws: Memory exhaustion DoS from tiny fragments and data chunks | 8.18.0 | >=8.0.0 <8.21.0 | >=8.21.0 | Ne |
| ws | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) / CVE-2026-45736 | moderate | ws: Uninitialized memory disclosure | 8.18.0 | >=8.0.0 <8.20.1 | >=8.20.1 | Ne |

## 5. Svih 63 otvorena GitHub alerta

Ova tabela čuva svaki otvoreni alert, uključujući duplikate problema između manifesta. GitHub koristi oznaku `medium`, dok npm/pnpm prikazuju `moderate`. Svi preuzeti alerti imaju GitHub scope `runtime`; objašnjenje stvarne upotrebe razvojnih alata je u odeljku 3.

| Alert | Manifest | Paket | GHSA | Severity | Pogođeni opseg | Prva zakrpa prema GitHub-u |
| --- | --- | --- | --- | --- | --- | --- |
| [5](https://github.com/Mare02/hellbot/security/dependabot/5) | pnpm-lock.yaml | undici | GHSA-c76h-2ccp-4975 | medium | >= 6.0.0, < 6.21.1 | 6.21.1 |
| [7](https://github.com/Mare02/hellbot/security/dependabot/7) | pnpm-lock.yaml | undici | GHSA-cxrh-j4jr-qwg3 | low | >= 6.0.0, < 6.21.2 | 6.21.2 |
| [9](https://github.com/Mare02/hellbot/security/dependabot/9) | pnpm-lock.yaml | brace-expansion | GHSA-v6h2-p8h4-qcjw | low | >= 1.0.0, <= 1.1.11 | 1.1.12 |
| [12](https://github.com/Mare02/hellbot/security/dependabot/12) | package-lock.json | undici | GHSA-g9mf-h72j-4rw9 | medium | < 6.23.0 | 6.23.0 |
| [13](https://github.com/Mare02/hellbot/security/dependabot/13) | pnpm-lock.yaml | undici | GHSA-g9mf-h72j-4rw9 | medium | < 6.23.0 | 6.23.0 |
| [15](https://github.com/Mare02/hellbot/security/dependabot/15) | pnpm-lock.yaml | lodash | GHSA-xxjr-mmjv-4gpg | medium | >= 4.0.0, <= 4.17.22 | 4.17.23 |
| [17](https://github.com/Mare02/hellbot/security/dependabot/17) | pnpm-lock.yaml | minimatch | GHSA-3ppc-4f35-3m26 | high | < 3.1.3 | 3.1.3 |
| [18](https://github.com/Mare02/hellbot/security/dependabot/18) | pnpm-lock.yaml | minimatch | GHSA-23c5-xmqv-rm74 | high | < 3.1.4 | 3.1.4 |
| [19](https://github.com/Mare02/hellbot/security/dependabot/19) | pnpm-lock.yaml | minimatch | GHSA-7r86-cg39-jmmj | high | < 3.1.3 | 3.1.3 |
| [20](https://github.com/Mare02/hellbot/security/dependabot/20) | pnpm-lock.yaml | undici | GHSA-f269-vfmq-vjvj | high | >= 6.0.0, < 6.24.0 | 6.24.0 |
| [21](https://github.com/Mare02/hellbot/security/dependabot/21) | package-lock.json | undici | GHSA-2mjp-6q6p-2qxm | medium | < 6.24.0 | 6.24.0 |
| [22](https://github.com/Mare02/hellbot/security/dependabot/22) | package-lock.json | undici | GHSA-v9p9-hfj2-hcw8 | high | < 6.24.0 | 6.24.0 |
| [23](https://github.com/Mare02/hellbot/security/dependabot/23) | package-lock.json | undici | GHSA-4992-7rv2-5pvq | medium | < 6.24.0 | 6.24.0 |
| [24](https://github.com/Mare02/hellbot/security/dependabot/24) | package-lock.json | undici | GHSA-vrm6-8vpv-qv8q | high | < 6.24.0 | 6.24.0 |
| [25](https://github.com/Mare02/hellbot/security/dependabot/25) | pnpm-lock.yaml | undici | GHSA-2mjp-6q6p-2qxm | medium | < 6.24.0 | 6.24.0 |
| [26](https://github.com/Mare02/hellbot/security/dependabot/26) | pnpm-lock.yaml | undici | GHSA-vrm6-8vpv-qv8q | high | < 6.24.0 | 6.24.0 |
| [27](https://github.com/Mare02/hellbot/security/dependabot/27) | pnpm-lock.yaml | undici | GHSA-4992-7rv2-5pvq | medium | < 6.24.0 | 6.24.0 |
| [28](https://github.com/Mare02/hellbot/security/dependabot/28) | pnpm-lock.yaml | undici | GHSA-v9p9-hfj2-hcw8 | high | < 6.24.0 | 6.24.0 |
| [29](https://github.com/Mare02/hellbot/security/dependabot/29) | pnpm-lock.yaml | picomatch | GHSA-c2c7-rcm5-vvqj | high | < 2.3.2 | 2.3.2 |
| [30](https://github.com/Mare02/hellbot/security/dependabot/30) | pnpm-lock.yaml | picomatch | GHSA-3v7f-55p6-f55p | medium | < 2.3.2 | 2.3.2 |
| [32](https://github.com/Mare02/hellbot/security/dependabot/32) | pnpm-lock.yaml | lodash | GHSA-f23m-r3pf-42rh | medium | <= 4.17.23 | 4.18.0 |
| [34](https://github.com/Mare02/hellbot/security/dependabot/34) | pnpm-lock.yaml | lodash | GHSA-r5fr-rjxr-66jc | high | >= 4.0.0, <= 4.17.23 | 4.18.0 |
| [38](https://github.com/Mare02/hellbot/security/dependabot/38) | package-lock.json | uuid | GHSA-w5hq-g745-h8pq | medium | < 11.1.1 | 11.1.1 |
| [39](https://github.com/Mare02/hellbot/security/dependabot/39) | pnpm-lock.yaml | uuid | GHSA-w5hq-g745-h8pq | medium | < 11.1.1 | 11.1.1 |
| [40](https://github.com/Mare02/hellbot/security/dependabot/40) | pnpm-lock.yaml | ws | GHSA-58qx-3vcg-4xpx | medium | >= 8.0.0, < 8.20.1 | 8.20.1 |
| [44](https://github.com/Mare02/hellbot/security/dependabot/44) | pnpm-lock.yaml | ws | GHSA-96hv-2xvq-fx4p | high | >= 8.0.0, < 8.21.0 | 8.21.0 |
| [45](https://github.com/Mare02/hellbot/security/dependabot/45) | package-lock.json | undici | GHSA-vxpw-j846-p89q | high | < 6.27.0 | 6.27.0 |
| [46](https://github.com/Mare02/hellbot/security/dependabot/46) | package-lock.json | undici | GHSA-35p6-xmwp-9g52 | low | < 6.27.0 | 6.27.0 |
| [47](https://github.com/Mare02/hellbot/security/dependabot/47) | package-lock.json | undici | GHSA-p88m-4jfj-68fv | medium | < 6.27.0 | 6.27.0 |
| [48](https://github.com/Mare02/hellbot/security/dependabot/48) | package-lock.json | undici | GHSA-g8m3-5g58-fq7m | low | < 6.27.0 | 6.27.0 |
| [49](https://github.com/Mare02/hellbot/security/dependabot/49) | pnpm-lock.yaml | undici | GHSA-vxpw-j846-p89q | high | < 6.27.0 | 6.27.0 |
| [50](https://github.com/Mare02/hellbot/security/dependabot/50) | pnpm-lock.yaml | undici | GHSA-35p6-xmwp-9g52 | low | < 6.27.0 | 6.27.0 |
| [51](https://github.com/Mare02/hellbot/security/dependabot/51) | pnpm-lock.yaml | undici | GHSA-p88m-4jfj-68fv | medium | < 6.27.0 | 6.27.0 |
| [52](https://github.com/Mare02/hellbot/security/dependabot/52) | pnpm-lock.yaml | undici | GHSA-g8m3-5g58-fq7m | low | < 6.27.0 | 6.27.0 |
| [53](https://github.com/Mare02/hellbot/security/dependabot/53) | pnpm-lock.yaml | brace-expansion | GHSA-f886-m6hf-6m8v | medium | < 1.1.13 | 1.1.13 |
| [54](https://github.com/Mare02/hellbot/security/dependabot/54) | pnpm-lock.yaml | brace-expansion | GHSA-3jxr-9vmj-r5cp | high | < 1.1.16 | 1.1.16 |
| [56](https://github.com/Mare02/hellbot/security/dependabot/56) | package-lock.json | brace-expansion | GHSA-mh99-v99m-4gvg | high | >= 4.0.0, < 5.0.8 | 5.0.8 |
| [57](https://github.com/Mare02/hellbot/security/dependabot/57) | package-lock.json | undici | GHSA-8xcm-r25x-g524 | medium | < 6.28.0 | 6.28.0 |
| [58](https://github.com/Mare02/hellbot/security/dependabot/58) | package-lock.json | undici | GHSA-v3r7-h72x-cjcm | medium | < 6.28.0 | 6.28.0 |
| [59](https://github.com/Mare02/hellbot/security/dependabot/59) | package-lock.json | undici | GHSA-m8rv-5g2x-5cg5 | medium | < 6.28.0 | 6.28.0 |
| [60](https://github.com/Mare02/hellbot/security/dependabot/60) | package-lock.json | brace-expansion | GHSA-rgw5-rvv9-x895 | high | >= 4.0.0, < 5.0.9 | 5.0.9 |
| [61](https://github.com/Mare02/hellbot/security/dependabot/61) | pnpm-lock.yaml | undici | GHSA-8xcm-r25x-g524 | medium | < 6.28.0 | 6.28.0 |
| [62](https://github.com/Mare02/hellbot/security/dependabot/62) | pnpm-lock.yaml | undici | GHSA-m8rv-5g2x-5cg5 | medium | < 6.28.0 | 6.28.0 |
| [63](https://github.com/Mare02/hellbot/security/dependabot/63) | pnpm-lock.yaml | undici | GHSA-v3r7-h72x-cjcm | medium | < 6.28.0 | 6.28.0 |
| [64](https://github.com/Mare02/hellbot/security/dependabot/64) | pnpm-lock.yaml | brace-expansion | GHSA-mh99-v99m-4gvg | high | < 1.1.17 | 1.1.17 |
| [65](https://github.com/Mare02/hellbot/security/dependabot/65) | pnpm-lock.yaml | brace-expansion | GHSA-rgw5-rvv9-x895 | high | < 1.1.18 | 1.1.18 |
| [66](https://github.com/Mare02/hellbot/security/dependabot/66) | pnpm-lock.yaml | undici | GHSA-rfgv-xxqx-mfg5 | high | >= 6.7.0, < 6.28.1 | 6.28.1 |
| [67](https://github.com/Mare02/hellbot/security/dependabot/67) | package-lock.json | undici | GHSA-r53p-7pc4-xj5r | low | < 6.28.1 | 6.28.1 |
| [68](https://github.com/Mare02/hellbot/security/dependabot/68) | package-lock.json | undici | GHSA-c76h-2ccp-4975 | medium | >= 6.0.0, < 6.21.1 | 6.21.1 |
| [69](https://github.com/Mare02/hellbot/security/dependabot/69) | package-lock.json | undici | GHSA-cxrh-j4jr-qwg3 | low | >= 6.0.0, < 6.21.2 | 6.21.2 |
| [70](https://github.com/Mare02/hellbot/security/dependabot/70) | package-lock.json | undici | GHSA-f269-vfmq-vjvj | high | >= 6.0.0, < 6.24.0 | 6.24.0 |
| [71](https://github.com/Mare02/hellbot/security/dependabot/71) | package-lock.json | undici | GHSA-rfgv-xxqx-mfg5 | high | >= 6.7.0, < 6.28.1 | 6.28.1 |
| [72](https://github.com/Mare02/hellbot/security/dependabot/72) | package-lock.json | brace-expansion | GHSA-6j4f-fj2g-mc7p | high | >= 4.0.0, < 5.0.10 | 5.0.10 |
| [73](https://github.com/Mare02/hellbot/security/dependabot/73) | package-lock.json | brace-expansion | GHSA-qhr7-859c-m2p7 | high | >= 4.0.0, < 5.0.11 | 5.0.11 |
| [74](https://github.com/Mare02/hellbot/security/dependabot/74) | package-lock.json | brace-expansion | GHSA-q2hr-2g5m-vwhr | medium | >= 4.0.0, < 5.0.12 | 5.0.12 |
| [75](https://github.com/Mare02/hellbot/security/dependabot/75) | package-lock.json | moment | GHSA-4p3w-j4w9-5jqw | medium | >= 2.29.2, < 2.31.0 | 2.31.0 |
| [76](https://github.com/Mare02/hellbot/security/dependabot/76) | pnpm-lock.yaml | undici | GHSA-r53p-7pc4-xj5r | low | < 6.28.1 | 6.28.1 |
| [77](https://github.com/Mare02/hellbot/security/dependabot/77) | pnpm-lock.yaml | brace-expansion | GHSA-6j4f-fj2g-mc7p | high | < 1.1.19 | 1.1.19 |
| [78](https://github.com/Mare02/hellbot/security/dependabot/78) | pnpm-lock.yaml | brace-expansion | GHSA-qhr7-859c-m2p7 | high | < 1.1.20 | 1.1.20 |
| [79](https://github.com/Mare02/hellbot/security/dependabot/79) | pnpm-lock.yaml | brace-expansion | GHSA-q2hr-2g5m-vwhr | medium | < 1.1.21 | 1.1.21 |
| [80](https://github.com/Mare02/hellbot/security/dependabot/80) | pnpm-lock.yaml | moment | GHSA-4p3w-j4w9-5jqw | medium | >= 2.29.2, < 2.31.0 | 2.31.0 |
| [81](https://github.com/Mare02/hellbot/security/dependabot/81) | package-lock.json | braces | GHSA-vfj7-8cjw-p6xm | high | <= 3.0.3 | Nema prijavljene zakrpe |
| [82](https://github.com/Mare02/hellbot/security/dependabot/82) | pnpm-lock.yaml | braces | GHSA-vfj7-8cjw-p6xm | high | <= 3.0.3 | Nema prijavljene zakrpe |

## 6. Npm grupisanje — svih 9 prijavljenih paketa

Ovo objašnjava raniji rezultat „5 high, 4 moderate“. Roditeljski paket nije dodatni nezavisan CVE.

| Paket | Npm severity | Direktan advisory ili preneta ranjivost |
| --- | --- | --- |
| `@discordjs/rest` | moderate | undici |
| `brace-expansion` | high | brace-expansion |
| `braces` | high | braces |
| `chokidar` | high | braces |
| `moment` | moderate | moment |
| `node-cron` | moderate | uuid |
| `nodemon` | high | chokidar |
| `undici` | high | undici |
| `uuid` | moderate | uuid |

## 7. Redosled sanacije i uslovi zatvaranja

1. Uskladiti REST/undici granu i osvežiti pnpm `ws` / `lodash` rezolucije kompatibilnim verzijama. Proveriti Gateway povezivanje, registraciju komandi, Discord builder-e i deploy notifikaciju.
2. Urediti razvojne zavisnosti i watcher granu. Patch minimatch/picomatch/brace-expansion gde je kompatibilno; za braces problem rešiti roditeljski alat ili sačekati podržanu zakrpu.
3. Ukloniti neupotrebljeni Moment ili ga zakrpiti; zasebno planirati node-cron major migraciju.
4. Odlučiti o jednom autoritativnom package manager-u. Dok se oba lockfile-a čuvaju, održavati i proveravati oba. Promena samo `package-lock.json` ne menja trenutni CI/VPS pnpm deploy.
5. Ponoviti oba audita, proveriti stvarno instalirano live stablo i sačekati osvežavanje Dependabot alerta. Zatvarati advisory tek kada ranjiva verzija više nije instalirana ili kada je zasebno dokumentovana i odobrena procena izuzetka. Trenutno nisu primenjeni audit ignore-i ili dismiss-i.

## 8. Izvori, reprodukcija inventara i ograničenja

Podaci: npm registry audit odgovori, live pnpm audit i GitHub Dependabot API za ovaj repo. Svaki GHSA red vodi direktno na advisory, a svaki GitHub alert na odgovarajuću stavku u repozitorijumu. Verzije kritičnih puteva potvrđene su read-only rezolucijom instaliranih paketa na VPS-u. Korisnički zahtevi nisu slati botu i nije simuliran napad.

Komande za ponavljanje inventara (iz odgovarajućeg checkout-a; audit se završava nenultim kodom dok postoje nalazi):

```sh
npm audit --json
npm audit --omit=dev --json
pnpm audit --json
pnpm audit --prod --json
gh api --paginate --slurp 'repos/Mare02/hellbot/dependabot/alerts?state=open&per_page=100'
```

`npm audit` ovde opisuje npm zaključano stablo; `pnpm audit` na VPS-u opisuje lockfile koji je korišćen za njegov frozen install. Audit bez `--prod` uključuje i build/razvojne pakete. Opseg ovog dokumenta ne uključuje PM2-ove globalne zavisnosti, sistemske pakete ili Node-ove ugrađene biblioteke. Snapshot može zastareti novim advisory-jima ili promenom zavisnosti.

SHA-256 pregledanih lockfile-a:

- `package-lock.json`: `9a6f62ec4d4a0c1ad9459cb30ef453211372a243d5003b8a8378a9560276bb47`
- `pnpm-lock.yaml`: `42074024b8d38c2f2afb1018e395fab4d8dcf1405bcf6b63629b53882a391a5f`
