# Supernote Image Inserter Plugin

A lightweight, high-performance plugin for Supernote devices that enables users to browse the local filesystem, crop, and insert images directly into their notes. 

> **Supernote** is a next-generation E-Ink device designed to provide a natural, distraction-free writing experience, blending the tactile feel of traditional paper with the digital versatility of an Android-based tablet. For more info, visit [supernote.com](https://supernote.com).

## Key Features
* **Zero-Click Entry**: The plugin launches directly into the file explorer for a seamless workflow.
* **Optimized for E-Ink**: Features high-contrast UI, large touch targets for the stylus, and manual controls designed for E-Ink touch latency.
* **Smart Navigation**: 
    * Browse directories starting from `/sdcard`.
    * Automatically filters for supported formats (`.jpg`, `.jpeg`, `.png`, `.bmp`).
* **Advanced Cropping**: Integrated cropping tool with dedicated controls for positioning and resizing.
* **Device Awareness**: Automatically detects device type (A5/A6 family) to optimize layout and resolution.
* **One-Tap Insertion**: Directly inserts the final image (original or cropped) into the current note.

## Image Cropping & Editing
The plugin includes a custom cropping interface specifically designed for the Supernote's unique touch response:
* **Manual Movement**: Use directional arrows (← ↑ ↓ →) for precise positioning without relying on standard touch-and-drag.
* **Independent Resizing**: Separate controls for **Width** and **Height** allow you to change the aspect ratio freely.
* **Insertion Modes**:
  * **Insert Original**: Skip cropping and insert the full image as-is.
  * **Crop and Insert**: Process and insert only the selected area.

  See croping in action: https://1drv.ms/v/c/6958bccc4c47c1d3/IQAW38Ra7zoXQZSCLdO5QA63ASRA429byBqCNgyZWexGpaM?e=r0vXTM

## Prerequisites
* **React Native**: 0.79.2
* **SDK**: `sn-plugin-lib`
* **Dependencies**: `react-native-fs`, `@react-native-community/image-editor`

After clone run `npm install`.

### Additional requirement for SuperNote
* Android NDK installed: 27.0.12077973
* Android SDK installed 
  * `build-tools;35.0.0`
  * `platforms;android-35`
* Java JDK 
* JAVA_HOME set
* ANDROID_HOME set

## Screenshots

| Folder Navigation | File Picker | Cropping Tool |
| :---: | :---: | :---: |
| ![folder](/screenshot/folder_navigation.png) | ![file picker](/screenshot/file_picker.png) | ![cropping](/
screenshot/cropping.png) |

| Result (Full) | Result (Cropped) |
| :---: | :---: |
| ![result](/screenshot/image_in_note.png) | ![insert_crop](/screenshot/insert_crop.png) |

| Colored | BW |
| :---: | :---: |
| ![Colored](/screenshot/20260720_131159.png) | ![BW](/screenshot/20260720_131209.png) |
