## Why

Users currently have no way to manually refresh the local file directory view within the image-inserter plugin when new files are added or deleted while the plugin is open. Adding a manual refresh capability resolves this sync issue, ensuring a responsive and reliable user experience on Supernote devices.

## What Changes

* Add a manual refresh button (🔄) to the navigation/header of the FilePicker component.
* Expose a refresh function in the file browsing logic to reload items from the current directory.
* Add a loading visual feedback (e.g., temporary button disablement or loading indicator) to handle E-Ink touch latency gracefully.

## Capabilities

### New Capabilities

- `folder-refresh`: Provides the capability to manually reload and scan the local directory contents within the Supernote image inserter plugin.

## Detail instruction

### Requirement: Manual Refresh Trigger
The FilePicker component SHALL display a clearly visible refresh button (🔄) within its header.

#### Scenario: Refresh button is present in the header
- **WHEN** the FilePicker is opened and displays a directory
- **THEN** a manual refresh button (🔄) is displayed in the header alongside other navigation controls

### Requirement: Directory Scanning on Refresh
When the manual refresh button is clicked, the system SHALL re-scan the currently selected directory and update the file list in real time with any added, removed, or modified files.

#### Scenario: Successful directory refresh
- **WHEN** the user clicks the manual refresh button (🔄)
- **THEN** the system reads the directory contents for the current path again and displays the updated file list

### Requirement: Visual Feedback and Latency Handling
To prevent duplicate clicks caused by E-Ink latency, the system SHALL disable the refresh button and show a visual feedback indicator (such as loading text or a state transition) during the refresh operation, and re-enable it once the operation completes.

#### Scenario: Click prevention during active refresh
- **WHEN** the user clicks the manual refresh button (🔄) and the directory scan is in progress
- **THEN** the button is disabled to prevent duplicate clicks and shows a visual feedback indicator
