# Guida per l'admin — Aura

> *Tu sei la voce di chi cura la voce della città.*

L'admin è chi tiene Aura in ordine: rivede i contributi dei curatori,
aggiunge o modifica i punti di interesse, regola la copertina della
città, e — se serve — clona Aura su un nuovo territorio.

Questa guida copre tutto ciò che un admin può fare. È più lunga delle
altre due, ma puoi tornare a cercare la sezione che ti serve quando ti
serve.

---

## 1. Accedi

Apri Aura nel browser e tocca **"Accedi"** in alto a destra. Inserisci
la tua email e password di admin.

Una volta dentro, vedrai apparire una voce in più nel menu superiore:
**"Admin"**. Toccala per arrivare al pannello di amministrazione.

> ⚠️ **Sicurezza.** Non condividere mai email + password di admin via
> email o WhatsApp. Se hai bisogno di delegare l'accesso a una persona
> di fiducia, chiedi all'amministratore principale di creare per lei
> un **secondo account admin** (c'è lo slot "co-admin" nel sistema —
> ogni co-admin ha la sua login separata).

---

## 2. La dashboard admin

Il pannello admin ha **quattro aree principali**:

| Area | A cosa serve |
|---|---|
| 📍 **Punti di interesse (POI)** | Aggiungi, modifica, cancella i luoghi della città. |
| 🏛️ **Area (configurazione città)** | Modifica brand, palette, mappa, e i 5 punti di riferimento sulla landing page. |
| ✋ **Moderazione contributi** | Rivedi le storie, curiosità, foto inviate dai contributori. |
| 📊 **Statistiche regali** *(opzionale)* | Vedi quanti percorsi sono stati donati e quante volte aperti. |

---

## 3. Gestire i punti di interesse (POI)

I POI sono i luoghi che sussurrano. Ogni città Aura ne ha tra 15 e 30 —
abbastanza da far sentire la città viva, pochi abbastanza da non
sovraccaricare il visitatore.

### Aggiungere un POI

1. Vai su **Admin → POI** → tocca **"Nuovo POI"**.
2. Compila i campi:

   | Campo | Cosa metterci |
   |---|---|
   | **Nome** | Il nome del luogo, come una persona del posto lo chiamerebbe. |
   | **Categoria** | Una etichetta breve: "Chiesa nascosta", "Caffè storico", "Belvedere". |
   | **Indirizzo** | Indirizzo postale o descrizione (es. "Vicolo dietro Piazza Umberto"). |
   | **Mappa** | Trascina lo spillo sulla mappa per posizionare il luogo, oppure scrivi le coordinate manualmente. |
   | **Raggio di attivazione** | In metri (default 60). Più piccolo = più preciso. Per un negozio dentro un palazzo 30 m vanno bene; per una piazza 80 m. |
   | **Orari** | Es. "Mar–Dom 9–13, 16–19". Lascia vuoto se non rilevante. |
   | **URL immagine** | Link diretto a un'immagine `.jpg`/`.png`/`.webp`. |
   | **Descrizione breve** | Una frase che riassume il luogo. |
   | **Descrizione lunga** | 200–400 caratteri di racconto. Scritto in *voce* del luogo. |
   | **Curiosità** | Una riga sorprendente (facoltativo). |
   | **Tag di interesse** | Tocca le etichette che descrivono il luogo: arte, storia, cibo, ecc. |
   | **Frase di apertura** | La prima frase che il visitatore sente quando il luogo lo "chiama" (≤ 80 m). Una per lingua. |
   | **Fatti canonici** | Una riga per fatto. **Sono la verità autorevole** del luogo — l'AI userà questi prima di qualsiasi memoria della comunità. Usali per fissare date, fondatori, eventi chiave. |

3. Tocca **"Crea POI"**.

Il nuovo POI è subito attivo: il prossimo visitatore che passa vicino
sentirà il suo sussurro.

### Modificare un POI esistente

Dalla lista POI, tocca **"Modifica"** accanto al luogo. Cambi quello
che vuoi, tocchi **"Salva modifiche"**. Le modifiche sono live in
tempo reale — non serve riavviare nulla.

### Caricare una foto su un POI

Due strade:

- **Da URL**: incolla un link diretto a un'immagine già online
  (Wikimedia Commons, sito ufficiale, ecc.).
- **Upload**: dal pannello di modifica POI, tocca il pulsante di
  upload, scegli un file dal tuo computer (JPEG/PNG/WebP, max 5 MB).
  Aura salva la foto sui suoi server e l'attacca al POI.

### Cancellare un POI

Tocca **"Elimina"** sul POI nella lista admin. ⚠️ L'azione è
definitiva — non c'è cestino. Se cancelli per errore, dovrai
ricrearlo da zero.

---

## 4. Configurare la città (l'"Area")

L'**Area** è il "vestito" della tua città Aura: brand, palette di
colori, mappa, e i 5 punti di riferimento che appaiono come
schede-fotografia sulla landing page.

Vai su **Admin → Area** (o `/admin/area`).

### Cosa puoi modificare

| Sezione | Esempio |
|---|---|
| **Brand** | "Aura di Vico Equense" / "Aura di Brera". Una versione per lingua. |
| **Area** | Il nome del quartiere o cittadina: "Vico Equense", "Brera". |
| **Città** | La città madre, se diversa: per Brera è "Milano". |
| **Tagline** | Una frase breve sotto il nome: "la città a picco sul mare". Una per lingua. |
| **Centro mappa** | Latitudine e longitudine del centro del quartiere. |
| **Palette** | I colori CSS del sito (terracotta, sfondo, testo, ecc.). |
| **Landmarks (5 punti di riferimento)** | I cinque luoghi famosi che orientano il visitatore appena arriva sulla landing page. Ogni landmark ha nome, descrizione, immagine, e una *frase canonica* (la cosa autorevole che dice di sé). |

### Salvare, esportare, importare

- **Salva**: ogni modifica nel pannello viene salvata automaticamente.
- **Esporta**: scarica la configurazione completa (compresi i POI)
  come un file JSON. Tienilo come backup, o usalo per duplicare la
  città altrove.
- **Importa**: carica un file JSON di una città già configurata.
  Sostituisce la configurazione attuale (i POI vanno gestiti
  separatamente).
- **Ripristina default**: cancella tutti gli override e torna alla
  configurazione di base inclusa nel codice (`area.config.json`).

---

## 5. Moderare i contributi dei curatori

Quando un contributore (vedi la *Guida del contributore*) invia un
racconto, una curiosità, una domanda di dialogo o una foto, finisce
nella tua **coda di moderazione**.

Vai su **Admin → Moderazione**. Vedrai quattro schede:

| Scheda | Contenuto |
|---|---|
| **In attesa** | Contributi appena ricevuti, da rivedere. |
| **Approvati** | Già live — visibili ai visitatori. |
| **Rifiutati** | Decisi a non includere. |
| **Bloccati dal filtro** | Il filtro automatico di sicurezza ha rilevato qualcosa di sospetto. Rivedi sempre questi prima di decidere. |

### Per ogni contributo "in attesa"

1. **Leggi** il contenuto. Apri il POI relativo per contestualizzare
   se serve.
2. Decidi:
   - **Approva** ✅ → il contributo va live, il contributore riceve
     un'email di conferma.
   - **Rifiuta** ❌ → il contributo non viene mai pubblicato.
3. (Opzionale) Aggiungi una **nota al contributore**: una riga di
   spiegazione, suggerimenti, ringraziamento. La nota viene inviata
   per email insieme alla decisione.

### Cancellare definitivamente

Per i contributi più problematici (offensivi, palesemente sbagliati),
tocca **"elimina definitivamente"**. L'azione è irreversibile.

### Come decidere

- **Approva senza esitazione** un contributo se: è scritto in voce,
  rispetta il luogo, aggiunge qualcosa che Wikipedia non avrebbe.
- **Approva con una piccola nota** se: è buono ma servirebbe una
  parola in più, o un dettaglio confermato. (Tu puoi correggerlo, ma
  meglio educare il contributore.)
- **Rifiuta gentilmente** se: copia palese, fattualmente sbagliato,
  fuori contesto, promozionale. Spiega sempre perché.
- **Rifiuta fermamente** se: contenuto offensivo, attacca persone,
  promuove ideologie violente. Nessuna nota — solo rifiuto.

---

## 6. Clonare Aura su un nuovo territorio

Aura è progettata come un **template multi-città**. Cambiare città
non significa ricostruire il sito — significa **sostituire la
configurazione**.

### Il modo manuale (controllo totale)

1. Esporta la configurazione di una città esistente (es. Vico).
2. Apri il file JSON con un editor di testo.
3. Sostituisci:
   - `slug` con il nuovo nome URL-safe (es. `trastevere`),
   - `brand`, `area`, `city`, `tagline` (bilingue),
   - `map.center.lat` e `map.center.lng` (coordinate del nuovo centro),
   - `palette` (i colori, se vuoi cambiarli),
   - `landmarks[]` (i 5 nuovi punti di riferimento),
   - `pois[]` (i 15–30 nuovi luoghi nascosti),
   - `narrator.intro.it` e `narrator.intro.en` (il monologo di apertura
     della nuova città — circa 300 parole, in prima persona).
4. Importa il file JSON nel nuovo deploy.

### Il modo AI-assistito (più veloce, da curare)

Vai su **Admin → Area → "Clona su una nuova città"**. Inserisci:

- **Nome della città** o quartiere (es. *"Trastevere"*),
- **Paese** (facoltativo),
- **Vibe** (facoltativo — una frase che descrive lo spirito del luogo,
  es. *"il quartiere bohémien di Roma sulla riva destra del Tevere"*).

Aura genera una **bozza** di configurazione usando un'AI: brand
suggerito, palette ispirata al luogo, landmark candidati, POI iniziali.

**Importante:** è una *bozza*, non una verità. Devi sempre:

1. Verificare le coordinate (l'AI può sbagliare i punti precisi).
2. Verificare i fatti storici (date, nomi, eventi).
3. Rivedere la voce della città (è il tuo stile, non quello dell'AI).
4. Aggiungere le foto reali.

Quando sei soddisfatto, **scarica** la bozza o **salva** direttamente
come nuova configurazione.

---

## 7. Manutenzione quotidiana

Cose da controllare ogni settimana:

- **Coda di moderazione**: non lasciare contributi in attesa più di 7
  giorni. I contributori perdono interesse se non ricevono feedback.
- **Statistiche regali**: vedi quali percorsi vengono donati di più —
  è un segnale di quali POI funzionano meglio.
- **POI senza foto**: dalla lista POI, ordina per "URL immagine vuoto"
  e attacca foto man mano (o invita i contributori a inviarne).
- **POI con descrizioni brevi**: meno di 150 caratteri = troppo
  scarno. Espandi quando hai un attimo.

---

## 8. Risolvere problemi comuni

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| Un visitatore non sente vibrazioni | È su iPhone (Apple non supporta Web Vibration). | Non si può risolvere lato app — è limite Apple. |
| Un POI non appare sulla mappa | Coordinate sbagliate o `latitude`/`longitude` vuoti. | Apri il POI in admin e correggi. |
| Un'immagine non si carica | URL bloccato da CORS, o il sito sorgente è offline. | Riupload diretto su Aura (max 5 MB). |
| Il dialogo AI non funziona | Manca la chiave API LLM nel server. | Contatta l'amministratore tecnico — serve l'EMERGENT_LLM_KEY o ANTHROPIC_API_KEY. |
| Email di moderazione non arrivano | Manca la chiave Resend. | Le email finiscono nei log del server. Le decisioni di moderazione funzionano comunque — solo le notifiche al contributore sono silenziose. |
| Un contributore non può inviare | Si è registrato come visitatore, non come contributore. | Dal pannello admin → utenti, promuovi il suo ruolo (oppure chiedigli di crearsi un nuovo account con la spunta giusta). |

---

## 9. Cose che **non** dovresti fare

- ❌ **Non cancellare POI in massa.** Se un POI non ti piace,
  modifica la sua descrizione. Cancellarlo elimina anche tutti i
  contributi attaccati ad esso, e i visitatori che lo avevano
  scoperto vedranno un buco nella loro lista.
- ❌ **Non cambiare il `slug` di una città** dopo il lancio. Tutti i
  link condivisi (regali, contributi, ecc.) si rompono.
- ❌ **Non dare il ruolo admin** a chiunque te lo chieda. Il
  contributore può fare moltissimo senza essere admin.
- ❌ **Non modificare l'`area.config.json`** direttamente nel server
  senza fare backup prima. Usa sempre il pannello admin (che salva
  override sopra il file, lasciandolo intatto).

---

## 10. Dove chiedere aiuto

- **Problemi tecnici** (il sito non risponde, errori, lentezza):
  contatta l'amministratore tecnico del deploy (chi gestisce il
  server e le chiavi).
- **Problemi di contenuto** (un contributore litigioso, un POI
  controverso): consultati con il referente accademico o con il team
  del progetto Aura. *Non sei solo.*
- **Idee di miglioramento**: tienile in una lista. Quando saranno
  cinque o sei, proponile insieme al curatore del progetto.

---

*Tu sei la voce di chi cura la voce della città.
Grazie per il tuo lavoro paziente.*

---

**Aura** — un progetto di Derrick de Kerckhove, dedicato all'Italia.
