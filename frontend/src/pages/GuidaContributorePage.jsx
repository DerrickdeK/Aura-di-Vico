/* eslint-disable react/no-unescaped-entities */
import React from "react";
import GuidaLayout, { Section, Sub, Para, Bullets, Numbered, Quote, Tbl } from "../components/GuidaLayout";

export default function GuidaContributorePage() {
  return (
    <GuidaLayout
      eyebrow="Guida — contributore"
      title="Guida per il contributore"
      lede="Le voci di residenti, studenti e visitatori si intrecciano in un'unica memoria viva di questo quartiere."
    >
      <Para>
        Un <strong>contributore</strong> è chi aiuta una città a trovare le
        sue molte voci. Aggiunge racconti, curiosità, domande di dialogo e
        fotografie ai luoghi che Aura sussurra. Ogni contributo viene rivisto
        da un admin prima di essere pubblicato — non per censurare, ma per
        garantire che ciò che la città dice resti vero, rispettoso, e ben scritto.
      </Para>
      <Para>
        Questa guida è pensata per <strong>studenti, curatori e cittadini</strong> che
        hanno qualcosa da raccontare di un luogo.
      </Para>

      <Section n="1">Diventa contributore</Section>
      <Para>
        Apri Aura nel tuo browser. In alto a destra, tocca <strong>"Accedi"</strong>.
        Nella pagina di registrazione:
      </Para>
      <Numbered items={[
        <>Inserisci il tuo <strong>nome</strong> (apparirà come autore dei tuoi contributi).</>,
        <>Inserisci la tua <strong>email</strong> e una <strong>password</strong> (almeno 6 caratteri).</>,
        <><strong>Spunta la casella "Vorrei contribuire"</strong> — è la riga sotto i campi email/password. Senza questa spunta, il tuo account sarà un account da visitatore normale, e non potrai inviare contributi.</>,
        <>Tocca <strong>"Diventa contributore"</strong>.</>,
      ]} />
      <Para>
        Sei dentro. Da ora in poi, il menu in alto ti mostrerà <strong>"Contribuisci"</strong> —
        il quartier generale del contributore.
      </Para>

      <Section n="2">Tipi di contributo</Section>
      <Para>Aura accetta quattro tipi di contributo. Scegli quello giusto per ciò che vuoi raccontare:</Para>

      <Sub>📖 Racconto (narrative)</Sub>
      <Para>Una storia breve, un aneddoto, un ricordo locale legato a un luogo.</Para>
      <Quote>
        Massimo 4000 caratteri. Esempio: «Quando ero bambina, mia nonna mi
        portava ogni domenica in questa pasticceria. Il banco era di marmo,
        e i biscotti agli anici erano sempre i primi a finire.»
      </Quote>
      <Para>
        I racconti sono il cuore di Aura. Non hanno bisogno di essere
        storicamente esatti — hanno bisogno di essere <strong>veri</strong> nel
        senso umano del termine.
      </Para>

      <Sub>💡 Curiosità (fun_fact)</Sub>
      <Para>Una sola riga sorprendente che fa sorridere il visitatore.</Para>
      <Quote>
        Esempio: «In questa chiesa si è sposato il pizzaiolo più famoso di
        Vico Equense, ma solo dopo aver promesso alla suocera di non mai più
        aprire la pizzeria di domenica mattina.»
      </Quote>
      <Para>
        Le curiosità vengono mostrate in un riquadro distinto. Una per
        contributo. Devono incuriosire, non istruire.
      </Para>

      <Sub>💬 Domanda di dialogo (dialogue_prompt)</Sub>
      <Para>
        Una domanda che un visitatore potrebbe fare al luogo. Sarà usata per
        arricchire i dialoghi AI futuri.
      </Para>
      <Quote>
        Esempio: «Cosa vedevi dal tuo campanile durante l'eruzione del 1944?»
      </Quote>
      <Para>
        Pensa a domande che un luogo — <em>non un libro</em> — può rispondere:
        su ciò che ha visto, sentito, perso, custodito.
      </Para>

      <Sub>📷 Fotografia (photo_url)</Sub>
      <Para>
        Una foto del luogo. Carica un file JPEG/PNG/WebP (massimo 5 MB) con
        il pulsante di upload, oppure incolla un URL diretto a un'immagine
        pubblica (per esempio da Wikimedia Commons).
      </Para>
      <Quote>
        <strong>Importante:</strong> assicurati di avere il diritto di usare
        la fotografia. Foto tue, foto di pubblico dominio, foto con licenza
        Creative Commons sono tutte bene. Foto rubate da altri siti non lo sono.
      </Quote>

      <Section n="3">Come si invia un contributo</Section>
      <Numbered items={[
        <>Tocca <strong>"Contribuisci"</strong> nel menu in alto.</>,
        <>Scegli il <strong>punto di interesse</strong> dalla lista — sono tutti i luoghi che Aura conosce per questa città.</>,
        <>Scegli il <strong>tipo di contributo</strong> (vedi sopra).</>,
        <>(Opzionale) Aggiungi un <strong>titolo</strong> per il tuo contributo.</>,
        <>Scrivi il <strong>contenuto</strong> nel grande riquadro.</>,
        <>Tocca <strong>"Invia contributo"</strong>.</>,
      ]} />
      <Para>
        Vedrai un messaggio di conferma: <em>"Inviato — un admin lo rivedrà a
        breve. Grazie!"</em>
      </Para>

      <Section n="4">Cosa succede dopo l'invio</Section>
      <Para>Il tuo contributo passa attraverso tre stati possibili:</Para>
      <Tbl
        headers={["Stato", "Significato"]}
        rows={[
          [<>⏳ <strong>In attesa di revisione</strong></>, "È nella coda dell'admin. Di solito viene rivisto entro 48 ore."],
          [<>✅ <strong>Pubblicato</strong></>, "È live — i visitatori lo vedono nei dettagli del luogo, e l'AI lo usa per arricchire i dialoghi."],
          [<>❌ <strong>Non usato</strong></>, "L'admin ha deciso di non includerlo (di solito con una nota che ti spiega perché)."],
          [<>🚫 <strong>Bloccato dal filtro</strong></>, "Il filtro automatico di sicurezza ha rilevato qualcosa di sospetto. Non significa che hai sbagliato — leggi la nota e, se serve, riprova."],
        ]}
      />
      <Para>
        Riceverai un'<strong>email</strong> quando lo stato del tuo contributo cambia,
        con eventuale nota dell'admin.
      </Para>

      <Section n="5">Vedi i tuoi contributi</Section>
      <Para>
        Nella stessa pagina <strong>"Contribuisci"</strong>, in fondo, trovi
        <em> "I tuoi contributi"</em>: una lista di tutto ciò che hai inviato,
        con lo stato di ogni elemento.
      </Para>
      <Para>
        Se un contributo è ancora "In attesa", puoi <strong>ritirarlo</strong>
        (la parola "ritira" accanto al contributo). Una volta pubblicato, non
        puoi più cancellarlo — ma puoi sempre chiedere all'admin di farlo per te.
      </Para>

      <Section n="6">Come scrivere bene per Aura</Section>
      <Para>Aura non è un'enciclopedia. È una città che parla. Quattro principi:</Para>

      <Sub>🎭 Scrivi in voce, non in voce passiva</Sub>
      <Bullets items={[
        <>❌ <em>"Il castello fu costruito nel 1284 da Carlo II d'Angiò."</em></>,
        <>✅ <em>"Mi ha costruito Carlo II d'Angiò nel 1284, perché voleva tenere d'occhio il mare. Da allora le mie pietre conoscono il vento."</em></>,
      ]} />

      <Sub>📏 Sii breve</Sub>
      <Para>
        Una buona storia per Aura sta in 3–10 righe. Se hai bisogno di più,
        forse stai scrivendo un saggio — bellissimo, ma per un altro luogo.
      </Para>

      <Sub>🌅 Cerca il dettaglio, non la sintesi</Sub>
      <Bullets items={[
        <>❌ <em>"Era un quartiere popolare con molte botteghe."</em></>,
        <>✅ <em>"Il fornaio chiudeva alle undici, ma se bussavi piano alla porta laterale dopo le dieci, ti dava ancora un cornetto caldo."</em></>,
      ]} />

      <Sub>🤝 Rispetta chi ascolta</Sub>
      <Para>
        I visitatori sono ospiti. Niente politica violenta, niente attacchi
        personali, niente contenuti che umilierebbero qualcuno. Se hai dubbi,
        chiediti: <em>"Lo direi così a un bambino curioso?"</em> Se sì, scrivilo.
      </Para>

      <Section n="7">Cosa non fare</Section>
      <Bullets items={[
        <>❌ <strong>Non copiare da Wikipedia</strong> o da altri siti. Scrivilo a parole tue, anche se l'informazione viene da lì.</>,
        <>❌ <strong>Non inventare fatti storici.</strong> Date, nomi, eventi: se non sei sicuro, scrivi "si racconta che…" o ometti.</>,
        <>❌ <strong>Non promuovere attività commerciali</strong> specifiche ("vai dal mio amico Gianni"). Aura non è un'agenzia pubblicitaria.</>,
        <>❌ <strong>Non inserire informazioni personali di altre persone vive</strong> senza il loro permesso.</>,
      ]} />

      <Section n="8">Hai bisogno di aiuto?</Section>
      <Para>
        Se qualcosa non funziona, o hai un dubbio su un contributo che vuoi
        inviare, scrivi a un admin — lo trovi nel piè di pagina del sito,
        oppure chiedi al tuo curatore di riferimento. Gli admin sono lì
        proprio per questo.
      </Para>

      <Para>
        <em>Le voci di chi cammina diventano la memoria di chi camminerà.
        Grazie del tuo contributo.</em>
      </Para>
    </GuidaLayout>
  );
}
