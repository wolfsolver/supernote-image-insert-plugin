import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  Dimensions,
  Image,
  PanResponder,
  LayoutChangeEvent
} from 'react-native';
import { FilePicker } from './components/FilePicker';
import { PluginManager, PluginNoteAPI } from 'sn-plugin-lib';
import ImageEditor from '@react-native-community/image-editor';
import config from './PluginConfig.json';

const DEFAULT_WIDTH = 1404;
const DEFAULT_HEIGHT = 1872;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 80;
const CONTROLS_HEIGHT = 220; // Spazio riservato per i tasti manuali in basso

function App(): React.JSX.Element {
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Area visualizzazione immagine, ridotta per non sovrapporsi a Header, Footer e Controlli manuali
  const VIEW_WIDTH = dimensions.width - 40; // 20px di margine per lato
  const VIEW_HEIGHT = dimensions.height - HEADER_HEIGHT - FOOTER_HEIGHT - CONTROLS_HEIGHT;

  // Crop area in coordinate relative alla View (0 a VIEW_WIDTH/HEIGHT)
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, w: 200, h: 200 });

  useEffect(() => {
    const initPlugin = async () => {
      console.log("[IMAGE/Apps] App Mounted - initializing");

      // Determiniamo le dimensioni in base al device
      try {
        const deviceType = await PluginManager.getDeviceType();
        console.log("[IMAGE/Apps] Device Type:", deviceType);
        if (deviceType === 5) { // A5X / A5X2
          setDimensions({ width: 1920, height: 2560 });
        } else { // A6X / A6X2 e altri
          setDimensions({ width: 1404, height: 1872 });
        }
      } catch (e) {
        console.log("[IMAGE/Apps] Error getting device type:", e);
      }

      setSelectedImage(null);

      if (PluginManager.registerButtonListener) {
        (PluginManager.registerButtonListener as any)({
          onButtonPress(event: any) {
            if (event.id === 100 || event.id === '100') {
              console.log("[IMAGE/Apps] Plugin refocused via listener - resetting image");
              setSelectedImage(null);
            }
          }
        });
      }
    };

    initPlugin();
  }, []);

  useEffect(() => {
    if (selectedImage) {
      Image.getSize(selectedImage, (w, h) => {
        setOriginalSize({ width: w, height: h });

        // Calcoliamo come l'immagine viene fittata nell'area (resizeMode: contain)
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
        // Centriamo un box iniziale
        setCropBox({
          x: dx + dw / 4,
          y: dy + dh / 4,
          w: dw / 2,
          h: dh / 2
        });
      });
    }
  }, [selectedImage]);

  const handleClose = () => {
    console.log("[IMAGE/Apps] Close Plugin and clear data");
    setSelectedImage(null);
    setOriginalSize({ width: 0, height: 0 });
    setDisplaySize({ width: 0, height: 0, x: 0, y: 0 });
    PluginManager.closePluginView();
  };

  const handleImageSelected = (path: string) => {
    const fullPath = path.startsWith('/') ? `file://${path}` : path;
    console.log("[IMAGE/Apps] Image Select path:" + fullPath);
    setSelectedImage(fullPath);
  };

  const handleBackToPicker = () => {
    console.log("[IMAGE/Apps] Back to FilePicker");
    setSelectedImage(null);
    setOriginalSize({ width: 0, height: 0 });
    setDisplaySize({ width: 0, height: 0, x: 0, y: 0 });
  };

  const handleInsertOriginal = () => {
    if (selectedImage && PluginNoteAPI) {
      const cleanPath = selectedImage.replace('file://', '');
      console.log("[IMAGE/Apps] Image Insert path:" + cleanPath);
      PluginNoteAPI.insertImage(cleanPath);
      handleClose();
    }
  };

  const handleCropAndInsert = async () => {
    console.log("[IMAGE/Apps] Crop and Insert for:", selectedImage);
    if (selectedImage && originalSize.width > 0) {
      try {
        // Calcoliamo le coordinate reali dell'immagine
        // 1. Troviamo la posizione del box rispetto all'immagine renderizzata
        const relX = (cropBox.x - displaySize.x) / displaySize.width;
        const relY = (cropBox.y - displaySize.y) / displaySize.height;
        const relW = cropBox.w / displaySize.width;
        const relH = cropBox.h / displaySize.height;

        const cropData = {
          offset: {
            x: Math.max(0, relX * originalSize.width),
            y: Math.max(0, relY * originalSize.height),
          },
          size: {
            width: Math.min(originalSize.width, relW * originalSize.width),
            height: Math.min(originalSize.height, relH * originalSize.height),
          },
          displaySize: {
            width: Math.min(originalSize.width, relW * originalSize.width),
            height: Math.min(originalSize.height, relH * originalSize.height),
          },
          resizeMode: 'contain' as const,
        };

        console.log("[IMAGE/Apps] Crop Data:", JSON.stringify(cropData));

        const cropResult = await ImageEditor.cropImage(selectedImage, cropData);
        console.log("[IMAGE/Apps] Image Crop path:" + cropResult.uri);

        if (PluginNoteAPI) {
          const cleanPath = cropResult.uri.replace('file://', '');
          console.log("[IMAGE/Apps] Image Insert cropped path:" + cleanPath);
          PluginNoteAPI.insertImage(cleanPath);
          handleClose();
        }
      } catch (err) {
        console.log("[IMAGE/Apps] Crop Error:", err);
      }
    }
  };

  // PanResponder per muovere il box
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setCropBox(prev => {
          let newX = prev.x + gestureState.dx / 20; // Smorzamento per e-ink
          let newY = prev.y + gestureState.dy / 20;

          // Limiti
          newX = Math.max(displaySize.x, Math.min(newX, displaySize.x + displaySize.width - prev.w));
          newY = Math.max(displaySize.y, Math.min(newY, displaySize.y + displaySize.height - prev.h));

          return { ...prev, x: newX, y: newY };
        });
      },
      onPanResponderRelease: () => { },
    })
  ).current;

  // Semplice ridimensionamento tramite tasti o trascinamento angolo (qui facciamo tasti per stabilità)
  const changeCropSize = (dw: number, dh: number) => {
    setCropBox(prev => {
      const newW = Math.max(50, Math.min(prev.w + dw, displaySize.width - (prev.x - displaySize.x)));
      const newH = Math.max(50, Math.min(prev.h + dh, displaySize.height - (prev.y - displaySize.y)));
      return { ...prev, w: newW, h: newH };
    });
  };

  const moveCropBox = (dx: number, dy: number) => {
    setCropBox(prev => {
      let newX = prev.x + dx;
      let newY = prev.y + dy;

      // Limiti
      newX = Math.max(displaySize.x, Math.min(newX, displaySize.x + displaySize.width - prev.w));
      newY = Math.max(displaySize.y, Math.min(newY, displaySize.y + displaySize.height - prev.h));

      return { ...prev, x: newX, y: newY };
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {!selectedImage ? (
        <FilePicker
          onSelect={handleImageSelected}
          onClose={handleClose}
        />
      ) : (
        <View style={styles.cropperContainer}>
          <View style={styles.cropperHeader}>
            <Pressable onPress={handleBackToPicker} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>← Indietro</Text>
            </Pressable>
            <Text style={styles.headerTitle}>RITAGLIA IMMAGINE</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.navBtn}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.cropView}>
            {/* Wrapper con dimensioni dinamiche e margine di sicurezza */}
            <View style={{
              width: VIEW_WIDTH,
              height: VIEW_HEIGHT,
              marginTop: 10,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              {/* Overlay di oscuramento */}
              <View style={[styles.overlay, {
                left: displaySize.x, top: displaySize.y,
                width: displaySize.width, height: displaySize.height
              }]}>
                {/* Box di ritaglio */}
                <View
                  {...panResponder.panHandlers}
                  style={[styles.cropSelection, {
                    left: cropBox.x - displaySize.x,
                    top: cropBox.y - displaySize.y,
                    width: cropBox.w,
                    height: cropBox.h
                  }]}
                >
                  <View style={styles.cropHandle} />
                </View>
              </View>
            </View>

            {/* Controlli zoom/ridimensionamento/spostamento manuali (più affidabili su E-ink) */}
            <View style={styles.manualControls}>
              <View style={styles.controlRow}>
                <View style={styles.controlGroup}>
                  <Pressable onPress={() => changeCropSize(-30, 0)} style={styles.roundBtn}>
                    <Text style={styles.roundBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.controlLabel}>LARGHEZZA</Text>
                  <Pressable onPress={() => changeCropSize(30, 0)} style={styles.roundBtn}>
                    <Text style={styles.roundBtnText}>+</Text>
                  </Pressable>
                </View>

                <View style={styles.controlGroup}>
                  <Pressable onPress={() => changeCropSize(0, -30)} style={styles.roundBtn}>
                    <Text style={styles.roundBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.controlLabel}>ALTEZZA</Text>
                  <Pressable onPress={() => changeCropSize(0, 30)} style={styles.roundBtn}>
                    <Text style={styles.roundBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.controlGroup}>
                <Pressable onPress={() => moveCropBox(-30, 0)} style={styles.roundBtn}>
                  <Text style={styles.roundBtnText}>←</Text>
                </Pressable>
                <Pressable onPress={() => moveCropBox(0, -30)} style={styles.roundBtn}>
                  <Text style={styles.roundBtnText}>↑</Text>
                </Pressable>
                <Pressable onPress={() => moveCropBox(0, 30)} style={styles.roundBtn}>
                  <Text style={styles.roundBtnText}>↓</Text>
                </Pressable>
                <Pressable onPress={() => moveCropBox(30, 0)} style={styles.roundBtn}>
                  <Text style={styles.roundBtnText}>→</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.cropperFooter}>
            <Pressable
              onPress={handleInsertOriginal}
              style={[styles.footerBtn, styles.originalBtn]}
            >
              <Text style={styles.footerBtnText}>INSERISCI INTERA</Text>
            </Pressable>
            <Pressable
              onPress={handleCropAndInsert}
              style={[styles.footerBtn, styles.cropBtn]}
            >
              <Text style={[styles.footerBtnText, { color: '#fff' }]}>RITAGLIA E INSERISCI</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!selectedImage && (
        <View style={styles.footerContainer}>
          <Text style={styles.footer}>
            {config.name} v{config.versionName} by {config.author}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  footerContainer: { paddingBottom: 10, alignItems: 'center' },
  footer: { fontSize: 14, fontStyle: 'italic', color: '#666' },
  closeBtn: { padding: 5 },
  navBtn: { fontSize: 22, fontWeight: 'bold' },
  // Stili Cropper
  cropperContainer: { flex: 1, backgroundColor: '#fff' },
  cropperHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 3,
    borderColor: '#000'
  },
  headerTitle: { fontWeight: 'bold', fontSize: 18, color: '#000' },
  headerBtn: {
    padding: 10,
    marginLeft: -5,
    minHeight: 45,
    justifyContent: 'center'
  },
  headerBtnText: { fontSize: 16, fontWeight: 'bold', color: '#000' },

  cropView: {
    flex: 1,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.1)', // Molto leggero per E-ink
  },
  cropSelection: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cropHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 20,
    height: 20,
    backgroundColor: '#000',
    borderRadius: 10,
  },
  manualControls: {
    position: 'absolute',
    bottom: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    width: '95%',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    marginHorizontal: 5,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  roundBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  controlLabel: { fontWeight: 'bold', fontSize: 12 },

  cropperFooter: {
    height: 80,
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 3,
    borderColor: '#000',
    backgroundColor: '#fff'
  },
  footerBtn: {
    flex: 1,
    marginHorizontal: 5,
    height: 55, // Abbastanza grande per la stilo
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000'
  },
  originalBtn: { backgroundColor: '#fff' },
  cropBtn: { backgroundColor: '#000' },
  footerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center'
  },
});

export default App;
