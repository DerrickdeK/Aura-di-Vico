/* eslint-disable react/no-unescaped-entities */
import React from "react";
import GuidaLayout, { Section, Sub, Para, Bullets, Numbered, Tbl } from "../components/GuidaLayout";

export default function GuidaVisitatorePage() {
  return (
    <GuidaLayout
      eyebrow="Guida — visitatore"
      title="Guida per il visitatore"
      lede="Una città che ti sussurra prima di farsi guardare."
    >
      <Para>
        Benvenuto in Aura. Questa guida ti accompagna in pochi minuti dentro
        un'esperienza di cammino lento, in cui i luoghi nascosti — un cortile,
        una targa, un albero — ti sussurrano la loro storia quando ci passi
        abbastanza vicino.
      </Para>

      <Section n="1">Apri Aura</Section>
      <Para>
        Apri il link che ti è stato condiviso. Funziona dal browser del tuo
        telefono — non serve scaricare nessuna app. Al primo ingresso, la
        città stessa ti accoglie con una breve voce: una pagina che racconta
        in prima persona chi è. Puoi:
      </Para>
      <Bullets items={[
        <><strong>Leggerla</strong> con calma,</>,
        <>Chiuderla con la <strong>X</strong> in alto a destra e proseguire,</>,
        <>O tornarci ogni volta che vuoi.</>,
      ]} />
      <Para>
        In alto a destra trovi il <strong>selettore di lingua</strong> (it / en).
        Cambia istantaneamente tutta l'interfaccia.
      </Para>

      <Section n="2">Le due modalità di cammino</Section>
      <Sub>🌿 Cammino reale (sul posto)</Sub>
      <Para>
        Tocca <strong>"Inizia ad ascoltare"</strong>. Il telefono ti chiederà
        il permesso di usare la posizione GPS. Concedilo: Aura ha bisogno di
        sapere dove sei per farti sussurrare le cose giuste al momento giusto.
        La tua posizione non viene mai condivisa con altri — serve solo a far
        parlare la città <em>a te</em>.
      </Para>
      <Para>Tre soglie ti guideranno:</Para>
      <Tbl
        headers={["Soglia", "Distanza", "Cosa accade"]}
        rows={[
          [<>🟢 <strong>Percepito</strong></>, "≤ 200 m", "Una vibrazione lieve, un suono delicato, una frase enigmatica. Ma ancora nessun nome."],
          [<>🟡 <strong>Chiamato</strong></>, "≤ 80 m", "Il luogo rivela il suo nome e il suo primo sussurro. Avvicinati, se ti chiama davvero."],
          [<>🔴 <strong>Trovato</strong></>, "≤ 25 m", "Sei arrivato. La storia si svela tutta — la sua memoria, una curiosità, un'immagine. Il sussurro resta tuo."],
        ]}
      />

      <Sub>🗺️ Cammino virtuale (da casa o dall'aula)</Sub>
      <Para>
        Tocca <strong>"Cammina virtualmente"</strong>. Si apre la mappa.
        Trascina lo spillo (o tocca un punto della mappa) per teletrasportarti.
        È perfetto per scoprire la città in anticipo, per progettare un
        percorso, o per i giorni in cui non puoi uscire. Le stesse tre soglie
        funzionano anche virtualmente — la città si comporta come se ci stessi
        davvero camminando attorno.
      </Para>

      <Section n="3">Parla con un luogo</Section>
      <Para>
        Quando un luogo si rivela ("Trovato"), tocca la sua scheda. Si apre un
        riquadro con il suo nome e la sua fotografia, una storia breve e una
        lunga, una curiosità (se c'è), e un <strong>dialogo AI</strong> — puoi
        fare domande al luogo, e lui ti risponderà con la sua voce, basandosi
        sui fatti che gli abbiamo insegnato.
      </Para>
      <Para>Esempi di domande che funzionano bene:</Para>
      <Bullets items={[
        <>"In che anno sei stato costruito?"</>,
        <>"Chi ti ha abitato?"</>,
        <>"Raccontami una storia che pochi conoscono."</>,
        <>"Cosa vedevi cent'anni fa da qui?"</>,
      ]} />
      <Para>Il luogo <strong>non inventa</strong>: se non sa qualcosa, te lo dice.</Para>

      <Section n="4">Salva i tuoi sussurri</Section>
      <Para>
        Se vuoi conservare ciò che hai scoperto, registrati con il pulsante
        <strong> "Accedi"</strong> (in alto a destra) → <strong>"Crea un
        account"</strong>. Bastano trenta secondi. Puoi restare anonimo. Una
        volta dentro, troverai:
      </Para>
      <Bullets items={[
        <><strong>Sussurri raccolti</strong> — la lista dei luoghi che ti hanno chiamato,</>,
        <><strong>Profilo</strong> — lingua, temi che ti interessano, ritmo del cammino, con chi sei (da solo / con amici / in carrozzina),</>,
        <>E la possibilità di <strong>donare un cammino</strong> (vedi sotto).</>,
      ]} />

      <Section n="5">Trasforma un cammino in dono</Section>
      <Para>
        Hai trovato dei luoghi che vorresti mostrare a qualcuno? Aura ti
        permette di <strong>regalare un percorso</strong>.
      </Para>
      <Numbered items={[
        <>Accedi al tuo account.</>,
        <>Apri <strong>"Trasformalo in un dono"</strong> dalla pagina principale.</>,
        <>Scegli da <strong>3 a 8 luoghi</strong> che vuoi includere.</>,
        <>Scrivi una <strong>dedica</strong> per il destinatario (massimo 1200 caratteri).</>,
        <>Aura genera un link unico, con un'anteprima visiva pronta per essere condivisa su WhatsApp, email, o social.</>,
      ]} />
      <Para>
        Il destinatario apre il link, vede la tua dedica, e cammina i luoghi
        che hai scelto per lui.
      </Para>

      <Section n="6">Cosa fare se qualcosa non funziona</Section>
      <Tbl
        headers={["Problema", "Cosa provare"]}
        rows={[
          ["La posizione non si aggiorna", "Controlla che il GPS sia attivo e che il browser abbia il permesso. Su iPhone: Impostazioni → Safari → Posizione."],
          ["Non sento le vibrazioni", "Su iPhone le vibrazioni Web non sono ancora supportate dal sistema operativo — è una limitazione di Apple, non di Aura. Su Android funziona normalmente."],
          ["La voce del dialogo è muta", "Controlla il volume del telefono e che il browser non sia in modalità silenzioso."],
          ["La mappa non si carica", "Verifica la connessione internet e ricarica la pagina."],
          ["Non riesco a contribuire", "Solo gli utenti registrati come contributori (studenti o curatori) possono inviare contributi. Crea un nuovo account scegliendo l'opzione \"Diventa contributore\"."],
        ]}
      />

      <Section n="7">Consigli per camminare con Aura</Section>
      <Bullets items={[
        <><strong>Cammina lento.</strong> Aura è pensato per chi ha tempo. Tre passi al minuto sono più che sufficienti per sentirsi chiamare.</>,
        <><strong>Tieni il telefono in tasca.</strong> Non serve guardarlo continuamente — la città ti chiamerà quando avrà qualcosa da dirti.</>,
        <><strong>Lascia che la città scelga.</strong> Non cercare i luoghi sulla mappa. Lascia che siano loro a sceglierti, come è giusto.</>,
        <><strong>Parla con i luoghi.</strong> Non sono pagine di Wikipedia — sono voci. Trattali come tali.</>,
        <><strong>Torna più volte.</strong> Una città parla diversamente di mattina, di pomeriggio, di sera. E ogni volta dice qualcosa di diverso.</>,
      ]} />

      <Para>
        <em>Buon cammino. La città ti aspetta.</em>
      </Para>
    </GuidaLayout>
  );
}
