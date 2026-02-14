import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import RNFS from 'react-native-fs';

// Configuriamo 3 colonne
const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
// Aumentiamo il margine per separare meglio i tocchi della stilo
const gap = 8;
const itemSize = (screenWidth - (gap * (numColumns + 1))) / numColumns;

interface FilePickerProps {
  onSelect: (path: string) => void;
  onClose: () => void;
  initialDirectory?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({ 
  onSelect, 
  onClose, 
  initialDirectory = '/sdcard' 
}) => {
  const [currentPath, setCurrentPath] = useState(initialDirectory);
  const [items, setItems] = useState<{name: string, path: string, isDir: boolean}[]>([]);

  useEffect(() => {
    loadItems(currentPath);
  }, [currentPath]);

  const loadItems = async (path: string) => {
    try {
      const result = await RNFS.readDir(path);
      const mappedItems = result
        .map(item => ({
          name: item.name,
          path: item.path,
          isDir: item.isDirectory(),
        }))
        .filter(item => !item.name.startsWith('.') && (item.isDir || /\.(jpg|jpeg|png|bmp)$/i.test(item.name)))
        .sort((a, b) => (b.isDir === a.isDir ? a.name.localeCompare(b.name) : b.isDir ? 1 : -1));

      setItems(mappedItems);
    } catch (err) {
      console.error("Errore lettura directory:", err);
    }
  };

  const renderGridItem = ({ item }: { item: any }) => (
    <Pressable 
      style={styles.gridItem} 
      onPress={() => item.isDir ? setCurrentPath(item.path) : onSelect(item.path)}
    >
      <View style={styles.thumbnailContainer}>
        {item.isDir ? (
          <View style={styles.folderContainer}>
            <Text style={styles.folderIcon}>📁</Text>
          </View>
        ) : (
          <Image 
            source={{ uri: `file://${item.path}` }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.itemText} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
             const parent = currentPath.substring(0, currentPath.lastIndexOf('/'));
             setCurrentPath(parent || '/sdcard');
          }} 
          disabled={currentPath === '/sdcard'}
          style={styles.backBtn}
        >
          {/* Icona e testo più grandi per il tasto indietro */}
          <Text style={[styles.navBtn, currentPath === '/sdcard' && {color: '#ccc'}]}>
            ⬅ <Text style={{fontSize: 14}}>Indietro</Text>
          </Text>
        </Pressable>

        {/* Nome cartella ingrandito e centrato */}
        <View style={styles.titleWrapper}>
          <Text style={styles.pathTitle} numberOfLines={1}>
            {currentPath.split('/').pop() || 'Memoria'}
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.navBtn}>✕</Text>
        </Pressable>
      </View>
	  
      <FlatList
        data={items}
        key={`grid-${numColumns}`} 
        keyExtractor={(item) => item.path}
        renderItem={renderGridItem}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
	paddingVertical: 12,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15, 
    alignItems: 'center', 
    borderBottomWidth: 3, // Più visibile su E-Ink
    borderColor: '#000' 
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },  
  navBtn: { fontSize: 22, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  closeBtn: { padding: 5 },
  pathTitle: { 
    fontSize: 20, // Portato a 20px per massima leggibilità
    color: '#000', 
    fontWeight: 'bold', // Grassetto deciso
    textTransform: 'uppercase', // Aiuta a distinguere i nomi delle cartelle
  },
  listContent: { padding: gap / 2 },
  gridItem: {
    width: itemSize,
    margin: gap / 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000', // Bordo nero netto per contrasto
    borderRadius: 4,
    overflow: 'hidden'
  },
  thumbnailContainer: {
    width: '100%',
    height: itemSize - 20, // Lasciamo spazio per il testo sotto
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  folderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: { width: '100%', height: '100%' },
  folderIcon: { fontSize: 40 },
  textContainer: {
    padding: 4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#000',
    minHeight: 40, // Altezza minima per contenere 2 righe di testo
    justifyContent: 'center'
  },
  itemText: { 
    fontSize: 14, // Aumentato per leggibilità
    color: '#000', 
    textAlign: 'center',
    fontWeight: '600'
  },
});