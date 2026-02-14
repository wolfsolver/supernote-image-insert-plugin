# Supernote Image Inserter Plugin

A lightweight, high-performance plugin for Supernote devices that enables users to browse the local filesystem and insert images directly into their notes. 

> **Supernote** is a next-generation E-Ink device designed to provide a natural, distraction-free writing experience, blending the tactile feel of traditional paper with the digital versatility of an Android-based tablet. For more info, visit [supernote.com](https://supernote.com).

## Key Features
* **Zero-Click Entry**: The plugin launches directly into the file explorer for a seamless workflow.
* **Optimized for E-Ink**: Features high-contrast UI, large touch targets for the stylus, and clean typography.
* **Smart Navigation**: 
    * Browse directories starting from `/sdcard`.
    * Automatically filters for supported formats (`.jpg`, `.jpeg`, `.png`, `.bmp`).
* **Auto-Close**: Automatically closes the plugin and returns to the note view immediately after an image is selected.

## Prerequisites
* **React Native**: 0.79.2
* **SDK**: `sn-plugin-lib`
* **Dependencies**: `react-native-fs`

## Screenshot

![file picker](/screenshot/file_picker.png)

![result](/screenshot/image_in_note.png)
