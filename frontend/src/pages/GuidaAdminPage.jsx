/* eslint-disable react/no-unescaped-entities, react/jsx-key */
import React from "react";
import GuidaLayout, { Section, Sub, Para, Bullets, Numbered, Quote, Tbl } from "../components/GuidaLayout";

export default function GuidaAdminPage() {
  return (
    <GuidaLayout
      eyebrow="Guida — admin"
      title="Guida per l'admin"
      lede="Tu sei la voce di chi cura la voce della città."
    >
      <Para>
        L'admin è chi tiene Aura in ordine: rivede i contributi dei curatori,
        aggiunge o modifica i punti di interesse, regola la copertina della
        città, e — se serve — clona Aura su un nuovo territorio. Questa guida
        copre tutto ciò che un admin può fare. È più lunga delle altre due,
        ma puoi tornare a cercare la sezione che ti serve quando ti serve.
      </Para>

      <Section n="1">Accedi</Section>
      <Para>
        Apri Aura nel browser e tocca <strong>"Accedi"</strong> in alto a destra.
        Inserisci la tua email e password di admin. Una volta dentro, vedrai
        apparire una voce in più nel menu superiore: <strong>"Admin"</strong>.
        Toccala per arrivare al pannello di amministrazione.
      </Para>
      <Quote>
        ⚠️ <strong>Sicurezza.</strong> Non condividere mai email + password
        di admin via email o WhatsApp. Se hai bisogno di delegare l'accesso
        a una persona di fiducia, chiedi all'amministratore principale di
        creare per lei un secondo account admin (c'è lo slot "co-admin" nel
        sistema — ogni co-admin ha la sua login separata).
      </Quote>

      <Section n="2">La dashboard admin</Section>
      <Para>Il pannello admin ha quattro aree principali:</Para>
      <Tbl
        headers={["Area", "A cosa serve"]}
        rows={[
          [<>📍 <strong>Punti di interesse (POI)</strong></>, "Aggiungi, modifica, cancella i luoghi della città."],
          [<>🏛️ <strong>Area (configurazione città)</strong></>, "Modifica brand, palette, mappa, e i 5 punti di riferimento sulla landing page."],
          [<>✋ <strong>Moderazione contributi</strong></>, "Rivedi le storie, curiosità, foto inviate dai contributori."],
          [<>📊 <strong>Statistiche regali</strong> (opzionale)</>, "Vedi quanti percorsi sono stati donati e quante volte aperti."],
        ]}
      />

      <Section n="3">Gestire i punti di interesse (POI)</Section>
      <Para>
        I POI sono i luoghi che sussurrano. Ogni città Aura ne ha tra 15 e 30 —
        abbastanza da far sentire la città viva, pochi abbastanza da non
        sovraccaricare il visitatore.
      </Para>

      <Sub>Aggiungere un POI</Sub>
      <Numbered items={[
        <>Vai su <strong>Admin → POI</strong> → tocca <strong>"Nuovo POI"</strong>.</>,
        <>Compila i campi:</>,
      ]} />
      <Tbl
        headers={["Campo", "Cosa metterci"]}
        rows={[
          [<strong>Nome</strong>, "Il nome del luogo, come una persona del posto lo chiamerebbe."],
          [<strong>Categoria</strong>, "Una etichetta breve: \"Chiesa nascosta\", \"Caffè storico\", \"Belvedere\"."],
          [<strong>Indirizzo</strong>, "Indirizzo postale o descrizione (es. \"Vicolo dietro Piazza Umberto\")."],
          [<strong>Mappa</strong>, "Trascina lo spillo sulla mappa per posizionare il luogo, oppure scrivi le coordinate manualmente."],
          [<strong>Raggio di attivazione</strong>, "In metri (default 60). Più piccolo = più preciso. Per un negozio dentro un palazzo 30 m vanno bene; per una piazza 80 m."],
          [<strong>Orari</strong>, "Es. \"Mar–Dom 9–13, 16–19\". Lascia vuoto se non rilevante."],
          [<strong>URL immagine</strong>, "Link diretto a un'immagine .jpg/.png/.webp."],
          [<strong>Descrizione breve</strong>, "Una frase che riassume il luogo."],
          [<strong>Descrizione lunga</strong>, "200–400 caratteri di racconto. Scritto in voce del luogo."],
          [<strong>Curiosità</strong>, "Una riga sorprendente (facoltativo)."],
          [<strong>Tag di interesse</strong>, "Tocca le etichette che descrivono il luogo: arte, storia, cibo, ecc."],
          [<strong>Frase di apertura</strong>, "La prima frase che il visitatore sente quando il luogo lo \"chiama\" (≤ 80 m). Una per lingua."],
          [<strong>Fatti canonici</strong>, "Una riga per fatto. Sono la verità autorevole del luogo — l'AI userà questi prima di qualsiasi memoria della comunità. Usali per fissare date, fondatori, eventi chiave."],
        ]}
      />
      <Para>
        Tocca <strong>"Crea POI"</strong>. Il nuovo POI è subito attivo: il
        prossimo visitatore che passa vicino sentirà il suo sussurro.
      </Para>

      <Sub>Modificare un POI esistente</Sub>
      <Para>
        Dalla lista POI, tocca <strong>"Modifica"</strong> accanto al luogo.
        Cambi quello che vuoi, tocchi <strong>"Salva modifiche"</strong>. Le
        modifiche sono live in tempo reale — non serve riavviare nulla.
      </Para>

      <Sub>Caricare una foto su un POI</Sub>
      <Bullets items={[
        <><strong>Da URL:</strong> incolla un link diretto a un'immagine già online (Wikimedia Commons, sito ufficiale, ecc.).</>,
        <><strong>Upload:</strong> dal pannello di modifica POI, tocca il pulsante di upload, scegli un file dal tuo computer (JPEG/PNG/WebP, max 5 MB). Aura salva la foto sui suoi server e l'attacca al POI.</>,
      ]} />

      <Sub>Cancellare un POI</Sub>
      <Para>
        Tocca <strong>"Elimina"</strong> sul POI nella lista admin.
        ⚠️ L'azione è definitiva — non c'è cestino. Se cancelli per errore,
        dovrai ricrearlo da zero.
      </Para>

      <Section n="4">Configurare la città (l'"Area")</Section>
      <Para>
        L'<strong>Area</strong> è il "vestito" della tua città Aura: brand,
        palette di colori, mappa, e i 5 punti di riferimento che appaiono come
        schede-fotografia sulla landing page.
      </Para>
      <Para>Vai su <strong>Admin → Area</strong> (oppure <code>/admin/area</code>).</Para>

      <Sub>Cosa puoi modificare</Sub>
      <Tbl
        headers={["Sezione", "Esempio"]}
        rows={[
          [<strong>Brand</strong>, "\"Aura di Vico Equense\" / \"Aura di Brera\". Una versione per lingua."],
          [<strong>Area</strong>, "Il nome del quartiere o cittadina: \"Vico Equense\", \"Brera\"."],
          [<strong>Città</strong>, "La città madre, se diversa: per Brera è \"Milano\"."],
          [<strong>Tagline</strong>, "Una frase breve sotto il nome: \"la città a picco sul mare\". Una per lingua."],
          [<strong>Centro mappa</strong>, "Latitudine e longitudine del centro del quartiere."],
          [<strong>Palette</strong>, "I colori CSS del sito (terracotta, sfondo, testo, ecc.)."],
          [<strong>Landmarks (5 punti di riferimento)</strong>, "I cinque luoghi famosi che orientano il visitatore appena arriva sulla landing page."],
        ]}
      />

      <Sub>Salvare, esportare, importare</Sub>
      <Bullets items={[
        <><strong>Salva:</strong> ogni modifica nel pannello viene salvata automaticamente.</>,
        <><strong>Esporta:</strong> scarica la configurazione completa (compresi i POI) come un file JSON. Tienilo come backup, o usalo per duplicare la città altrove.</>,
        <><strong>Importa:</strong> carica un file JSON di una città già configurata. Sostituisce la configurazione attuale (i POI vanno gestiti separatamente).</>,
        <><strong>Ripristina default:</strong> cancella tutti gli override e torna alla configurazione di base inclusa nel codice (area.config.json).</>,
      ]} />

      <Section n="5">Moderare i contributi dei curatori</Section>
      <Para>
        Quando un contributore invia un racconto, una curiosità, una domanda
        di dialogo o una foto, finisce nella tua coda di moderazione. Vai su
        <strong> Admin → Moderazione</strong>. Vedrai quattro schede:
      </Para>
      <Tbl
        headers={["Scheda", "Contenuto"]}
        rows={[
          [<strong>In attesa</strong>, "Contributi appena ricevuti, da rivedere."],
          [<strong>Approvati</strong>, "Già live — visibili ai visitatori."],
          [<strong>Rifiutati</strong>, "Decisi a non includere."],
          [<strong>Bloccati dal filtro</strong>, "Il filtro automatico di sicurezza ha rilevato qualcosa di sospetto. Rivedi sempre questi prima di decidere."],
        ]}
      />

      <Sub>Per ogni contributo "in attesa"</Sub>
      <Numbered items={[
        <><strong>Leggi</strong> il contenuto. Apri il POI relativo per contestualizzare se serve.</>,
        <>Decidi:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Approva</strong> ✅ → il contributo va live, il contributore riceve un'email di conferma.</li>
            <li><strong>Rifiuta</strong> ❌ → il contributo non viene mai pubblicato.</li>
          </ul>
        </>,
        <>(Opzionale) Aggiungi una <strong>nota al contributore</strong>: una riga di spiegazione, suggerimenti, ringraziamento. La nota viene inviata per email insieme alla decisione.</>,
      ]} />

      <Sub>Come decidere</Sub>
      <Bullets items={[
        <><strong>Approva senza esitazione</strong> se: è scritto in voce, rispetta il luogo, aggiunge qualcosa che Wikipedia non avrebbe.</>,
        <><strong>Approva con una piccola nota</strong> se: è buono ma servirebbe una parola in più, o un dettaglio confermato.</>,
        <><strong>Rifiuta gentilmente</strong> se: copia palese, fattualmente sbagliato, fuori contesto, promozionale. Spiega sempre perché.</>,
        <><strong>Rifiuta fermamente</strong> se: contenuto offensivo, attacca persone, promuove ideologie violente. Nessuna nota — solo rifiuto.</>,
      ]} />

      <Section n="6">Clonare Aura su un nuovo territorio</Section>
      <Para>
        Aura è progettata come un <strong>template multi-città</strong>.
        Cambiare città non significa ricostruire il sito — significa
        sostituire la configurazione.
      </Para>

      <Sub>Il modo manuale (controllo totale)</Sub>
      <Numbered items={[
        <>Esporta la configurazione di una città esistente (es. Vico).</>,
        <>Apri il file JSON con un editor di testo.</>,
        <>Sostituisci: <code>slug</code>, <code>brand</code>, <code>area</code>, <code>city</code>, <code>tagline</code>, <code>map.center</code>, <code>palette</code>, <code>landmarks[]</code>, <code>pois[]</code>, e <code>narrator.intro.it/en</code> (il monologo di apertura della nuova città — circa 300 parole, in prima persona).</>,
        <>Importa il file JSON nel nuovo deploy.</>,
      ]} />

      <Sub>Il modo AI-assistito (più veloce, da curare)</Sub>
      <Para>
        Vai su <strong>Admin → Area → "Clona su una nuova città"</strong>. Inserisci:
      </Para>
      <Bullets items={[
        <><strong>Nome della città</strong> o quartiere (es. "Trastevere").</>,
        <><strong>Paese</strong> (facoltativo).</>,
        <><strong>Vibe</strong> (facoltativo — una frase che descrive lo spirito del luogo).</>,
      ]} />
      <Para>
        Aura genera una <strong>bozza</strong> di configurazione usando un'AI.
        <strong> Importante:</strong> è una bozza, non una verità. Devi sempre:
      </Para>
      <Numbered items={[
        <>Verificare le coordinate (l'AI può sbagliare i punti precisi).</>,
        <>Verificare i fatti storici (date, nomi, eventi).</>,
        <>Rivedere la voce della città (è il tuo stile, non quello dell'AI).</>,
        <>Aggiungere le foto reali.</>,
      ]} />
      <Para>
        Quando sei soddisfatto, <strong>scarica</strong> la bozza o <strong>salva</strong> direttamente come nuova configurazione.
      </Para>

      <Section n="7">Manutenzione quotidiana</Section>
      <Para>Cose da controllare ogni settimana:</Para>
      <Bullets items={[
        <><strong>Coda di moderazione:</strong> non lasciare contributi in attesa più di 7 giorni.</>,
        <><strong>Statistiche regali:</strong> vedi quali percorsi vengono donati di più — è un segnale di quali POI funzionano meglio.</>,
        <><strong>POI senza foto:</strong> dalla lista POI, attacca foto man mano (o invita i contributori a inviarne).</>,
        <><strong>POI con descrizioni brevi:</strong> meno di 150 caratteri = troppo scarno. Espandi quando hai un attimo.</>,
      ]} />

      <Section n="8">Risolvere problemi comuni</Section>
      <Tbl
        headers={["Sintomo", "Causa probabile", "Cosa fare"]}
        rows={[
          ["Un visitatore non sente vibrazioni", "È su iPhone (Apple non supporta Web Vibration).", "Non si può risolvere lato app."],
          ["Un POI non appare sulla mappa", "Coordinate sbagliate o latitude/longitude vuoti.", "Apri il POI in admin e correggi."],
          ["Un'immagine non si carica", "URL bloccato da CORS, o il sito sorgente è offline.", "Riupload diretto su Aura (max 5 MB)."],
          ["Il dialogo AI non funziona", "Manca la chiave API LLM nel server.", "Contatta l'amministratore tecnico — serve EMERGENT_LLM_KEY o ANTHROPIC_API_KEY."],
          ["Email di moderazione non arrivano", "Manca la chiave Resend.", "Le email finiscono nei log del server. Le decisioni di moderazione funzionano comunque."],
          ["Un contributore non può inviare", "Si è registrato come visitatore, non come contributore.", "Promuovilo dal pannello admin, oppure chiedigli di crearsi un nuovo account con la spunta giusta."],
        ]}
      />

      <Section n="9">Cose che non dovresti fare</Section>
      <Bullets items={[
        <>❌ <strong>Non cancellare POI in massa.</strong> Se un POI non ti piace, modifica la sua descrizione. Cancellarlo elimina anche tutti i contributi attaccati ad esso.</>,
        <>❌ <strong>Non cambiare il slug di una città</strong> dopo il lancio. Tutti i link condivisi (regali, contributi, ecc.) si rompono.</>,
        <>❌ <strong>Non dare il ruolo admin</strong> a chiunque te lo chieda. Il contributore può fare moltissimo senza essere admin.</>,
        <>❌ <strong>Non modificare l'area.config.json</strong> direttamente nel server senza fare backup prima. Usa sempre il pannello admin (che salva override sopra il file, lasciandolo intatto).</>,
      ]} />

      <Section n="10">Dove chiedere aiuto</Section>
      <Bullets items={[
        <><strong>Problemi tecnici</strong> (il sito non risponde, errori, lentezza): contatta l'amministratore tecnico del deploy.</>,
        <><strong>Problemi di contenuto</strong> (un contributore litigioso, un POI controverso): consultati con il referente accademico o con il team del progetto Aura. <em>Non sei solo.</em></>,
        <><strong>Idee di miglioramento:</strong> tienile in una lista. Quando saranno cinque o sei, proponile insieme al curatore del progetto.</>,
      ]} />

      <Para>
        <em>Tu sei la voce di chi cura la voce della città. Grazie per il tuo lavoro paziente.</em>
      </Para>
    </GuidaLayout>
  );
}
