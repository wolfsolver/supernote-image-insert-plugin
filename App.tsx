import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  Image,
  PanResponder,
} from 'react-native';
import { FilePicker } from './components/FilePicker';
import { PluginManager, PluginNoteAPI, PluginCommAPI, PluginFileAPI } from 'sn-plugin-lib';
import ImageEditor from '@react-native-community/image-editor';
import { Saturate } from 'react-native-color-matrix-image-filters';
import ViewShot from 'react-native-view-shot';

const DEFAULT_WIDTH = 1404;
const DEFAULT_HEIGHT = 1872;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 80;
const CONTROLS_HEIGHT = 240; // Leggermente aumentato per i tasti manuali

function App(): React.JSX.Element {
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const [saturation, setSaturation] = useState<number>(1);
  const viewShotRef = useRef<any>(null);

  // --- LOGICA RIDUZIONE AREA (60% dello spazio disponibile per far posto ai filtri) ---
  const AVAILABLE_WIDTH = dimensions.width - 40;
  const AVAILABLE_HEIGHT = dimensions.height - HEADER_HEIGHT - FOOTER_HEIGHT - CONTROLS_HEIGHT;

  const VIEW_WIDTH = AVAILABLE_WIDTH * 0.6;  // Ridotto per filtri
  const VIEW_HEIGHT = AVAILABLE_HEIGHT * 0.6;
  // -------------------------------------------------------------

  const [cropBox, setCropBox] = useState({ x: 50, y: 50, w: 200, h: 200 });

  useEffect(() => {
    const initPlugin = async () => {
      try {
        // Request required permissions on plugin startup
        const readPermission = 'plugin.permission.FILE:READ';
        const readStatus = await PluginManager.hasPermission(readPermission);
        if (readStatus !== 1 && readStatus !== 2) {
          await PluginManager.requestPermission(
            readPermission,
            'Read permission is required to browse and select image files.'
          );
        }

        const writePermission = 'plugin.permission.FILE:WRITE';
        const writeStatus = await PluginManager.hasPermission(writePermission);
        if (writeStatus !== 1 && writeStatus !== 2) {
          await PluginManager.requestPermission(
            writePermission,
            'Write permission is required to insert images into notes.'
          );
        }

        let pageSize = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        const pathRes = await PluginCommAPI.getCurrentFilePath() as any;
        const pageRes = await PluginCommAPI.getCurrentPageNum() as any;

        if (pathRes?.success && pathRes.result && pageRes?.success && pageRes.result !== undefined) {
          const sizeRes = await PluginFileAPI.getPageSize(pathRes.result, pageRes.result) as any;
          if (sizeRes?.success && sizeRes.result) {
            pageSize = sizeRes.result;
          }
        }
        setDimensions(pageSize);
      } catch (e) {
        console.log('[IMAGE/Apps] Init Error:', e);
      }
    };
    initPlugin();
  }, []);

  useEffect(() => {
    if (selectedImage) {
      Image.getSize(selectedImage, (w, h) => {
        setOriginalSize({ width: w, height: h });

        const screenRatio = VIEW_WIDTH / VIEW_HEIGHT;
        const imageRatio = w / h;

        let dw, dh, dx, dy;
        if (imageRatio > screenRatio) {
          dw = VIEW_WIDTH;
          dh = VIEW_WIDTH / imageRatio;
          dx = 0;
          dy = (VIEW_HEIGHT - dh) / 2;
        } else {
          dh = VIEW_HEIGHT;
          dw = VIEW_HEIGHT * imageRatio;
          dx = (VIEW_WIDTH - dw) / 2;
          dy = 0;
        }
        setDisplaySize({ width: dw, height: dh, x: dx, y: dy });
        // Posiziona il crop box iniziale relativo al nuovo spazio 70%
        setCropBox({
          x: dx + dw / 4,
          y: dy + dh / 4,
          w: dw / 2,
          h: dh / 2,
        });
      });
    }
  }, [selectedImage, VIEW_WIDTH, VIEW_HEIGHT]);

  const handleClose = () => {
    setSelectedImage(null);
    PluginManager.closePluginView();
  };

  const handleImageSelected = (path: string) => {
    const fullPath = path.startsWith('/') ? `file://${path}` : path;
    setSelectedImage(fullPath);
  };

  const handleCropAndInsert = async () => {
    if (selectedImage && originalSize.width > 0) {
      try {
        let sourceUri = selectedImage;
        let workWidth = originalSize.width;
        let workHeight = originalSize.height;

        // Se abbiamo filtri attivi o vogliamo usare la cattura visuale per sicurezza
        if (viewShotRef.current) {
          sourceUri = await viewShotRef.current.capture();
          // Otteniamo la dimensione reale dell'immagine catturata
          await new Promise<void>((resolve, reject) => {
            Image.getSize(sourceUri, (w, h) => {
              workWidth = w;
              workHeight = h;
              resolve();
            }, reject);
          });
        }

        const relX = (cropBox.x - displaySize.x) / displaySize.width;
        const relY = (cropBox.y - displaySize.y) / displaySize.height;
        const relW = cropBox.w / displaySize.width;
        const relH = cropBox.h / displaySize.height;

        const cropData = {
          offset: {
            x: Math.max(0, relX * workWidth),
            y: Math.max(0, relY * workHeight),
          },
          size: {
            width: Math.min(workWidth, relW * workWidth),
            height: Math.min(workHeight, relH * workHeight),
          },
          displaySize: {
            width: Math.min(workWidth, relW * workWidth),
            height: Math.min(workHeight, relH * workHeight),
          },
          resizeMode: 'contain' as const,
        };

        const cropResult = await ImageEditor.cropImage(sourceUri, cropData);
        if (PluginNoteAPI) {
          PluginNoteAPI.insertImage(cropResult.uri.replace('file://', ''));
          handleClose();
        }
      } catch (err) {
        console.log('[IMAGE/Apps] Crop Error:', err);
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setCropBox(prev => {
          let newX = prev.x + gestureState.dx / 15;
          let newY = prev.y + gestureState.dy / 15;
          newX = Math.max(displaySize.x, Math.min(newX, displaySize.x + displaySize.width - prev.w));
          newY = Math.max(displaySize.y, Math.min(newY, displaySize.y + displaySize.height - prev.h));
          return { ...prev, x: newX, y: newY };
        });
      },
    })
  ).current;

  const changeCropSize = (dw: number, dh: number) => {
    setCropBox(prev => ({
      ...prev,
      w: Math.max(50, Math.min(prev.w + dw, displaySize.width - (prev.x - displaySize.x))),
      h: Math.max(50, Math.min(prev.h + dh, displaySize.height - (prev.y - displaySize.y))),
    }));
  };

  const moveCropBox = (dx: number, dy: number) => {
    setCropBox(prev => {
      let newX = Math.max(displaySize.x, Math.min(prev.x + dx, displaySize.x + displaySize.width - prev.w));
      let newY = Math.max(displaySize.y, Math.min(prev.y + dy, displaySize.y + displaySize.height - prev.h));
      return { ...prev, x: newX, y: newY };
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {!selectedImage ? (
        <FilePicker onSelect={handleImageSelected} onClose={handleClose} />
      ) : (
        <View style={styles.cropperContainer}>
          <View style={styles.cropperHeader}>
            <Pressable onPress={() => setSelectedImage(null)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>← Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>CROP IMAGE ({dimensions.width}x{dimensions.height})</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.navBtn}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.cropperFooter}>
            <Pressable onPress={async () => {
              if (PluginNoteAPI) {
                let finalUri = selectedImage!.replace('file://', '');
                if (viewShotRef.current) {
                  try {
                    const captured = await viewShotRef.current.capture();
                    finalUri = captured.replace('file://', '');
                  } catch (e) {
                    console.log('[IMAGE/Apps] Capture Error:', e);
                  }
                }
                PluginNoteAPI.insertImage(finalUri);
                handleClose();
              }
            }} style={[styles.footerBtn, styles.originalBtn]}>
              <Text style={styles.footerBtnText}>INSERT FULL IMAGE</Text>
            </Pressable>
            <Pressable onPress={handleCropAndInsert} style={[styles.footerBtn, styles.cropBtn]}>
              <Text style={[styles.footerBtnText, { color: '#fff' }]}>CROP & INSERT</Text>
            </Pressable>
          </View>

          <View style={styles.cropView}>
            <View style={styles.manualControls}>
              <View style={styles.controlRow}>
                <View style={styles.controlGroup}>
                  <Pressable onPress={() => changeCropSize(-30, 0)} style={styles.roundBtn}><Text style={styles.roundBtnText}>-</Text></Pressable>
                  <Text style={styles.controlLabel}>WIDTH</Text>
                  <Pressable onPress={() => changeCropSize(30, 0)} style={styles.roundBtn}><Text style={styles.roundBtnText}>+</Text></Pressable>
                </View>
                <View style={styles.controlGroup}>
                  <Pressable onPress={() => changeCropSize(0, -30)} style={styles.roundBtn}><Text style={styles.roundBtnText}>-</Text></Pressable>
                  <Text style={styles.controlLabel}>HEIGHT</Text>
                  <Pressable onPress={() => changeCropSize(0, 30)} style={styles.roundBtn}><Text style={styles.roundBtnText}>+</Text></Pressable>
                </View>
                <View style={styles.controlGroup}>
                  <Pressable
                    style={[styles.satBtn]}
                    onPress={() => setSaturation(s => Math.max(0, s - 0.1))}
                  >
                    <Text style={styles.satBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.controlLabel}>SATURATION {saturation.toFixed(1)}</Text>
                  <Pressable
                    style={[styles.satBtn]}
                    onPress={() => setSaturation(s => Math.min(1, s + 0.1))}
                  >
                    <Text style={styles.satBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.controlGroup}>
                <Pressable onPress={() => moveCropBox(-30, 0)} style={styles.roundBtn}><Text style={styles.roundBtnText}>←</Text></Pressable>
                <Pressable onPress={() => moveCropBox(0, -30)} style={styles.roundBtn}><Text style={styles.roundBtnText}>↑</Text></Pressable>
                <Pressable onPress={() => moveCropBox(0, 30)} style={styles.roundBtn}><Text style={styles.roundBtnText}>↓</Text></Pressable>
                <Pressable onPress={() => moveCropBox(30, 0)} style={styles.roundBtn}><Text style={styles.roundBtnText}>→</Text></Pressable>
              </View>
            </View>

            <View style={{
              width: VIEW_WIDTH,
              height: VIEW_HEIGHT,
              backgroundColor: '#fff',
              borderWidth: 2,
              borderColor: '#000',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}>
              <View style={{ width: displaySize.width, height: displaySize.height }}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={StyleSheet.absoluteFill}>
                  <Saturate amount={saturation}>
                    <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
                  </Saturate>
                </ViewShot>
                <View style={[styles.overlay, { width: displaySize.width, height: displaySize.height }]} pointerEvents="box-none">
                  <View
                    {...panResponder.panHandlers}
                    style={[styles.cropSelection, {
                      left: cropBox.x - displaySize.x,
                      top: cropBox.y - displaySize.y,
                      width: cropBox.w,
                      height: cropBox.h,
                    }]}
                  >
                    <View style={styles.cropHandle} />
                  </View>
                </View>
              </View>
            </View>
          </View>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  closeBtn: { padding: 5 },
  navBtn: { fontSize: 22, fontWeight: 'bold' },
  cropperContainer: { flex: 1, backgroundColor: '#fff' },
  cropperHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 3,
    borderColor: '#000',
  },
  headerTitle: { fontWeight: 'bold', fontSize: 18, color: '#000' },
  headerBtn: { padding: 10, minHeight: 45, justifyContent: 'center' },
  headerBtnText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  cropView: {
    flex: 1,
    backgroundColor: '#ddd', // Sfondo scuro per evidenziare l'area 70%
    justifyContent: 'flex-start', // Sposta l'area verso l'alto per lasciare spazio ai tasti
    alignItems: 'center',
    paddingTop: 20,
  },
  fullImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.05)' },
  cropSelection: { position: 'absolute', borderWidth: 4, borderColor: '#000', backgroundColor: 'rgba(255,255,255,0.1)' },
  cropHandle: { position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, backgroundColor: '#000', borderRadius: 10 },
  manualControls: {
    marginTop: 1,
    backgroundColor: '#fff',
    padding: 5,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    width: '100%',
  },
  controlGroup: { flexDirection: 'row', alignItems: 'center', marginVertical: 3, marginHorizontal: 5 },
  controlRow: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  roundBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  roundBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  controlLabel: { fontWeight: 'bold', fontSize: 12, width: 60, textAlign: 'center' },
  cropperFooter: { height: 80, flexDirection: 'row', padding: 10, borderTopWidth: 3, borderColor: '#000', backgroundColor: '#fff' },
  footerBtn: { flex: 1, marginHorizontal: 5, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 2, borderColor: '#000' },
  originalBtn: { backgroundColor: '#fff' },
  cropBtn: { backgroundColor: '#000' },
  footerBtnText: { fontSize: 14, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  filterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  bwToggleBtn: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 20,
  },
  bwToggleBtnActive: {
    backgroundColor: '#000',
  },
  bwToggleText: {
    fontWeight: 'bold',
    color: '#000',
  },
  bwToggleTextActive: {
    color: '#fff',
  },
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  satControlRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  satBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  satBtnDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  satBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterLabel: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 12,
  },
});

export default App;
