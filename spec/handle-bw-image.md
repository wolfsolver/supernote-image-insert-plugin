# Specifica: Gestione Immagini in Bianco e Nero / Colori

## Obiettivo
Consentire all'utente, durante l'inserimento di un'immagine, di scegliere se mantenere i colori originali o convertirla in bianco e nero.

## Requisiti UI / UX
* **Box UI:** il box deve essere posizionato sopra al box relativo al crop dell'immagine. I due box devono condividere l'asse orizzontale.
  * **Pulsante di Conversione:** Nella videata di crop deve esserci un tasto che permette di decidere rapidamente se mantenere l'immagine a colori o convertirla in bianco e nero.
  * **Slider Saturazione:** Deve esserci uno slider per poter decidere in modo preciso il livello di saturazione dell'immagine.
  * **Design per Schermo e-ink (Alto Contrasto):** Considerando che il target è uno schermo e-ink, tutti gli elementi dell'interfaccia (inclusi pulsanti e lo slider) devono essere realizzati ad alto contrasto, utilizzando **esclusivamente bianco, nero e tonalità di grigio**, evitando qualsiasi colore.

Andrà ovviamente ridimensionata l'area di anteprima immagine di conseguenza (quindi riducendo il 70% ad un valore ragionevole)

## Comportamento Atteso
* **Anteprima in Tempo Reale:** Modificando lo slider della saturazione, deve essere possibile vedere il risultato direttamente nella videata di crop. Di fatto, le modifiche visive devono riflettersi immediatamente su `selectedImage`, permettendo all'utente di avere un feedback immediato prima di confermare il ritaglio o l'inserimento.

# riferimenti github
* adjust BW process for colored image https://github.com/wolfsolver/supernote-image-insert-plugin/issues/12 