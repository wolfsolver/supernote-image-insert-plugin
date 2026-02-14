import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
} from 'react-native';
import RNFS from 'react-native-fs';

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
        // Filtriamo: mostriamo cartelle OPPURE immagini
        .filter(item => {
          // 1. Escludi file/cartelle che iniziano con il punto
          const isHidden = item.name.startsWith('.');
          
          // 2. Deve essere una cartella OPPURE un'immagine supportata
          const isSupportedImage = /\.(jpg|jpeg|png|bmp)$/i.test(item.name);
          
          return !isHidden && (item.isDir || isSupportedImage);
        })
        // Ordiniamo: prima le cartelle, poi i file
        .sort((a, b) => (b.isDir === a.isDir ? a.name.localeCompare(b.name) : b.isDir ? 1 : -1));

      setItems(mappedItems);
    } catch (err) {
      console.error("Errore lettura directory:", err);
    }
  };

  const goBack = () => {
    if (currentPath === '/sdcard' || currentPath === '/') return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    setCurrentPath(parentPath || '/');
  };

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.header}>
        <View style={styles.pathInfo}>
           <Pressable onPress={goBack} disabled={currentPath === '/sdcard'} style={styles.backButton}>
              <Text style={{fontSize: 18, color: currentPath === '/sdcard' ? '#ccc' : '#000'}}>⬅️</Text>
           </Pressable>
           <Text style={styles.title} numberOfLines={1}>{currentPath}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.fileItem} 
            onPress={() => item.isDir ? setCurrentPath(item.path) : onSelect(item.path)}
          >
            <Text style={styles.fileName}>
              {item.isDir ? `📁 ${item.name}` : `📄 ${item.name}`}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Cartella vuota.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: { flex: 1, backgroundColor: '#fff', width: '100%' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 15, 
    borderBottomWidth: 1,
    borderBottomColor: '#000' 
  },
  pathInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backButton: { marginRight: 15, padding: 5 },
  title: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  closeIcon: { fontSize: 22, marginLeft: 10 },
  fileItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#eee' },
  fileName: { fontSize: 18, color: '#000' }, // Font più grande per E-Ink
  emptyText: { textAlign: 'center', marginTop: 20 }
});