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
import { PluginManager } from 'sn-plugin-lib';

// Configure 3 columns
const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
// Increased gap to better separate stylus touches
const gap = 8;
const itemSize = (screenWidth - (gap * (numColumns + 1))) / numColumns;

interface FilePickerProps {
  onSelect: (path: string) => void;
  onClose: () => void;
  initialDirectory?: string;
  showAllFolders?: boolean;
}

// List of allowed folders when showAllFolders is false
const ALLOWED_ROOT_FOLDERS = ["Document", "EXPORT", "MyStyle", "Note", "SCREENSHOT", "INBOX"];

export const FilePicker: React.FC<FilePickerProps> = ({
  onSelect,
  onClose,
  initialDirectory = RNFS.ExternalStorageDirectoryPath,
  showAllFolders = false
}) => {
  const [currentPath, setCurrentPath] = useState(initialDirectory);
  const [items, setItems] = useState<{ name: string, path: string, isDir: boolean }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadItems(currentPath);
  }, [currentPath]);

  const ensureReadPermission = async (): Promise<boolean> => {
    try {
      const permission = 'plugin.permission.FILE:READ';
      const status = await PluginManager.hasPermission(permission);
      if (status === 1 || status === 2) {
        return true;
      }
      const result = await PluginManager.requestPermission(
        permission,
        'Read permission is required to browse and select image files.'
      );
      return result === 1 || result === 2;
    } catch (err) {
      console.error('Error requesting read permission:', err);
      return false;
    }
  };

  const loadItems = async (path: string) => {
    try {
      setIsRefreshing(true);
      const hasPermission = await ensureReadPermission();
      if (!hasPermission) {
        console.error("Read permission not granted");
        setItems([]);
        return;
      }
      const result = await RNFS.readDir(path);
      if (!result || !Array.isArray(result)) {
        setItems([]);
        return;
      }
      const mappedItems = result
        .map(item => ({
          name: item.name,
          path: item.path,
          isDir: item.isDirectory(),
        }))
        .filter(item => {
          // 1. Hide files/folders starting with "."
          if (item.name.startsWith('.')) return false;

          if (item.isDir) {
            // 2. If in root directory and showAllFolders is false, filter folders
            if (!showAllFolders && path === initialDirectory) {
              return ALLOWED_ROOT_FOLDERS.includes(item.name);
            }
            return true;
          }

          // 3. Filter only supported images
          return /\.(jpg|jpeg|png|bmp)$/i.test(item.name);
        })
        .sort((a, b) => (b.isDir === a.isDir ? a.name.localeCompare(b.name) : b.isDir ? 1 : -1));

      setItems(mappedItems);
    } catch (err) {
      console.error("Error reading directory:", err);
    } finally {
      setIsRefreshing(false);
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
          {/* Larger icon and text for the back button */}
          <Text style={[styles.navBtn, currentPath === '/sdcard' && { color: '#ccc' }]}>
            ⬅ <Text style={{ fontSize: 14 }}>Back</Text>
          </Text>
        </Pressable>

        {/* Folder name enlarged and centered */}
        <View style={styles.titleWrapper}>
          <Text style={styles.pathTitle} numberOfLines={1}>
            {currentPath.split('/').pop() || 'Storage'}
          </Text>
        </View>

        <View style={styles.rightNav}>
          <Pressable
            onPress={() => loadItems(currentPath)}
            style={styles.refreshBtn}
            disabled={isRefreshing}
          >
            <Text style={[styles.navBtn, isRefreshing && { color: '#ccc' }]}>
              {isRefreshing ? '⏳' : '🔄'}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.navBtn}>✕</Text>
          </Pressable>
        </View>
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
    borderBottomWidth: 3, // More visible on E-Ink
    borderColor: '#000'
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navBtn: { fontSize: 22, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  rightNav: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn: { padding: 5, marginRight: 10 },
  closeBtn: { padding: 5 },
  pathTitle: {
    fontSize: 20, // Set to 20px for maximum readability
    color: '#000',
    fontWeight: 'bold', // Bold font
    textTransform: 'uppercase', // Helps distinguish folder names
  },
  listContent: { padding: gap / 2 },
  gridItem: {
    width: itemSize,
    margin: gap / 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000', // Sharp black border for contrast
    borderRadius: 4,
    overflow: 'hidden'
  },
  thumbnailContainer: {
    width: '100%',
    height: itemSize - 20, // Leave space for text below
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
    minHeight: 40, // Min height to accommodate 2 lines of text
    justifyContent: 'center'
  },
  itemText: {
    fontSize: 14, // Increased for readability
    color: '#000',
    textAlign: 'center',
    fontWeight: '600'
  },
});