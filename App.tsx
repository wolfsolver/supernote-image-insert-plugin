import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  useColorScheme, 
  Pressable, 
  Text, 
  StatusBar 
} from 'react-native';
import { FilePicker } from './components/FilePicker'; 
import { PluginManager, PluginNoteAPI } from 'sn-plugin-lib';

function App(): React.JSX.Element {
  // Rimosso useColorScheme se ti dava problemi, altrimenti forziamo 'light'
  const isDarkMode = false; 

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  const handleImageSelected = (path: string) => {
    if (PluginNoteAPI) {
      PluginNoteAPI.insertImage(path);
      // Chiudiamo il plugin dopo l'inserimento per tornare alla nota
      handleClose();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Visualizziamo subito il FilePicker senza condizioni */}
      <FilePicker 
        onSelect={handleImageSelected} 
        onClose={handleClose} 
        initialDirectory="/sdcard"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 999, // Assicura che sia sopra la lista
    padding: 10,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default App;