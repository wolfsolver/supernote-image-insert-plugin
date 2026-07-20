# Specifiche Gestione Dimensioni Schermo e Posizionamento Bottoni

## 1. Obiettivo
L'obiettivo di questa specifica è definire come gestire il posizionamento dinamico dei bottoni e degli elementi dell'interfaccia utente (UI) per adattarsi alle diverse risoluzioni e dimensioni degli schermi dei dispositivi Supernote supportati.

## 2. Risoluzioni e Dispositivi Supportati
L'interfaccia deve poter scalare e posizionare correttamente gli elementi per i seguenti formati schermo:
* **A5X / Nomad**: Risoluzione 1404 × 1872, 226 ppi
* **Manta**: Risoluzione 1920 × 2560, 300 ppi

## 3. Comportamento a Runtime
Poiché l'applicazione/plugin può essere eseguita su dispositivi diversi, le dimensioni dello schermo (o della pagina corrente) non devono essere inserite staticamente (hardcoded), ma devono essere rilevate a runtime al momento dell'inizializzazione della vista o del rendering dei bottoni.

### 3.1 Recupero delle Dimensioni
Rimuovere il vecchio codice che utilizza getDeviceType() dato che il domensionamento va letto via invocando le API fornite da `PluginFileAPI`. Di seguito il frammento di codice da utilizzare come standard per ottenere larghezza e altezza correnti:

```typescript
// Imposta un valore di fallback di default corrispondente alle dimensioni A5X/Nomad
let pageSize = { width: 1404, height: 1872 };

// Tenta di recuperare le dimensioni reali della pagina corrente
const sizeRes = await PluginFileAPI.getPageSize(filePath, pageNum) as any;

if (sizeRes?.success && sizeRes.result) {
    pageSize = sizeRes.result; // Aggiorna pageSize con le dimensioni corrette (es. 1920x2560 per Manta)
}
```

## 4. Linee Guida per il Posizionamento
- **Uso di Variabili Dinamiche:** Qualsiasi calcolo relativo al posizionamento assoluto (`top`, `left`, `right`, `bottom`) o alle dimensioni (larghezza, altezza) dei bottoni e delle modali deve fare riferimento all'oggetto `pageSize` così recuperato.
- **Evitare Misure Fisse in Pixel Assoluti:** Quando si posizionano i bottoni (es. in un angolo specifico), utilizzare percentuali o calcolare la posizione in relazione alla larghezza e altezza massime (`pageSize.width` e `pageSize.height`) anziché usare coordinate fisse valide solo per la risoluzione 1404×1872.
- **Rapporti di Aspetto e Densità (PPI):** Tenere in considerazione i diversi ppi (226 ppi vs 300 ppi) nella definizione della grandezza dei testi e della dimensione (padding/margin) dei bottoni per garantire che l'area toccabile (touch target) rimanga ergonomicamente valida su entrambi i dispositivi.
