// js/utils.js - Utility Functions Module

export function showNotification(message, duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
        // Fallback to alert if notification area is missing
        alert(`Notification: ${message}`);
        return;
    }
    try {
        const notification = document.createElement('div');
        notification.className = 'notification-message';
        notification.textContent = message;
        notificationArea.appendChild(notification);

        // Trigger fade-in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10); // Short delay to allow element to be added to DOM before transition

        // Set timeout to remove the notification
        setTimeout(() => {
            notification.classList.remove('show');
            // Remove the element after the fade-out transition
            setTimeout(() => {
                if (notification.parentElement) {
                    notificationArea.removeChild(notification);
                }
            }, 300); // Duration of the fade-out transition (should match CSS)
        }, duration);
    } catch (error) {
        console.error("Error displaying notification:", error, "Message:", message);
    }
}

export function showCustomModal(title, contentHTML, buttonsConfig, modalClass = '') {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("CRITICAL: Modal container ('modalContainer') not found in DOM. Cannot show modal:", title);
        return null;
    }

    // Remove any existing modal first
    if (modalContainer.firstChild) {
        try {
            modalContainer.firstChild.remove();
        } catch (e) {
            console.warn("Error removing previous modal:", e);
        }
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = `modal-dialog ${modalClass}`;

    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar';
    titleBar.textContent = title || 'Dialog';
    dialog.appendChild(titleBar);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content';
    if (typeof contentHTML === 'string') {
        contentDiv.innerHTML = contentHTML;
    } else if (contentHTML instanceof HTMLElement) {
        contentDiv.appendChild(contentHTML);
    } else {
        console.warn("Modal content is not a string or HTMLElement for modal:", title);
        contentDiv.textContent = "Invalid modal content.";
    }
    dialog.appendChild(contentDiv);

    if (buttonsConfig && Array.isArray(buttonsConfig) && buttonsConfig.length > 0) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons';
        buttonsConfig.forEach(btnConfig => {
            if (btnConfig && typeof btnConfig.text === 'string') {
                const button = document.createElement('button');
                button.textContent = btnConfig.text;
                button.onclick = () => {
                    if (btnConfig.action && typeof btnConfig.action === 'function') {
                        try {
                            btnConfig.action();
                        } catch (e) {
                            console.error("Error in modal button action:", e);
                        }
                    }
                    if (btnConfig.closesModal !== false) { // Default to closesModal = true
                        try {
                            overlay.remove();
                        } catch (e) {
                            console.warn("Error removing modal overlay on button click:", e);
                        }
                    }
                };
                buttonsDiv.appendChild(button);
            }
        });
        dialog.appendChild(buttonsDiv);
    }

    overlay.appendChild(dialog);
    modalContainer.appendChild(overlay);

    // Attempt to focus the first button for accessibility
    const firstButton = dialog.querySelector('.modal-buttons button');
    if (firstButton) {
        try {
            firstButton.focus();
        } catch (e) {
            // Non-critical if focus fails
        }
    }

    return { overlay, dialog, contentDiv };
}


export function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
    const buttons = [
        { text: 'OK', action: onConfirm },
        { text: 'Cancel', action: onCancel } // onCancel can be null, action check in showCustomModal handles it
    ];
    showCustomModal(title, `<p>${message}</p>`, buttons, 'confirmation-dialog');
}


export function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null, existingAudioData = null) {
    const indexString = (padOrSliceIndex !== null && padOrSliceIndex !== undefined) ? `-${padOrSliceIndex}` : '';
    const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${indexString}`;

    let dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}"`;
    if (padOrSliceIndex !== null && padOrSliceIndex !== undefined) {
        dataAttributes += ` data-pad-slice-index="${padOrSliceIndex}"`;
    }

    let currentFileText = 'Drag & Drop Audio File or <br>';
    let relinkButtonHTML = '';
    let statusClass = '';
    const fileName = existingAudioData?.originalFileName || 'Unknown File';

    if (existingAudioData) {
        switch (existingAudioData.status) {
            case 'loaded':
                currentFileText = `Loaded: ${fileName}<br>`;
                break;
            case 'missing':
            case 'missing_db':
                currentFileText = `Missing: ${fileName}<br>`;
                statusClass = 'drop-zone-missing';
                relinkButtonHTML = `<button class="drop-zone-relink-button">Relink</button>`; // CSS will style this
                break;
            case 'error':
                currentFileText = `Error Loading: ${fileName}<br>`;
                statusClass = 'drop-zone-error';
                relinkButtonHTML = `<button class="drop-zone-relink-button">Retry</button>`;
                break;
            case 'loading':
                currentFileText = `Loading: ${fileName}...<br>`;
                statusClass = 'drop-zone-loading';
                break;
            default: // 'empty' or unknown
                currentFileText = 'Drag & Drop Audio File or <br>';
                break;
        }
    }

    return `
        <div class="drop-zone ${statusClass}" id="${dropZoneId}" ${dataAttributes}>
            ${currentFileText}
            <label for="${inputId}" class="drop-zone-upload-label">Click to Upload</label>
            <input type="file" id="${inputId}" accept="audio/*, .sfz, .sf2" class="hidden">
            ${relinkButtonHTML}
        </div>`.trim();
}

export function setupGenericDropZoneListeners(
    dropZoneElement,
    trackId, // Passed directly, not from dataset, for clarity
    trackTypeHint, // Passed directly
    padIndexOrSliceId = null, // Passed directly
    loadSoundFromBrowserCallback, // For items from sound browser
    loadFileCallback, // For files from OS
    getTrackByIdCallback // To get track instance if needed by callbacks (e.g., selectedDrumPadForEdit)
) {
    if (!dropZoneElement) {
        console.error("[Utils setupGenericDropZoneListeners] dropZoneElement is null. TrackId:", trackId, "Type:", trackTypeHint, "Pad/Slice:", padIndexOrSliceId);
        return;
    }

    dropZoneElement.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.add('dragover');
        event.dataTransfer.dropEffect = "copy";
    });

    dropZoneElement.addEventListener('dragleave', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.remove('dragover');
    });

    dropZoneElement.addEventListener('drop', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.remove('dragover');

        const soundDataString = event.dataTransfer.getData("application/json");

        if (soundDataString) { // Item from Sound Browser
            try {
                const soundData = JSON.parse(soundDataString);
                if (soundData.type === 'sound-browser-item' && loadSoundFromBrowserCallback && typeof loadSoundFromBrowserCallback === 'function') {
                    // Use passed trackId, trackTypeHint, padIndexOrSliceId directly
                    await loadSoundFromBrowserCallback(soundData, trackId, trackTypeHint, padIndexOrSliceId);
                } else {
                    console.warn("[Utils DropZone] Dropped item is not a recognized sound-browser-item or loadSoundFromBrowserCallback is missing.", soundData);
                }
            } catch (e) {
                console.error("[Utils DropZone] Error parsing dropped sound data from sound browser:", e, "Raw data:", soundDataString);
                showNotification("Error processing dropped sound data. It might be invalid.", 3000);
            }
        } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) { // File from OS
            const file = event.dataTransfer.files[0];
            const simulatedEvent = { target: { files: [file] } }; // Simulate file input event
            if (loadFileCallback && typeof loadFileCallback === 'function') {
                if (trackTypeHint === 'DrumSampler') {
                    let actualPadIndex = padIndexOrSliceId;
                    if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex)) { // If no specific padIndex was given with the dropzone
                        const trackInstance = getTrackByIdCallback ? getTrackByIdCallback(trackId) : null;
                        actualPadIndex = trackInstance ? trackInstance.selectedDrumPadForEdit : 0; // Fallback to selected or 0
                    }
                    await loadFileCallback(simulatedEvent, trackId, actualPadIndex, file.name);
                } else if (trackTypeHint === 'Sampler' || trackTypeHint === 'InstrumentSampler' || trackTypeHint === 'Audio') { // Added 'Audio'
                    await loadFileCallback(simulatedEvent, trackId, trackTypeHint, file.name); // trackTypeHint acts as target context
                } else {
                    console.warn(`[Utils DropZone] Unhandled trackType "${trackTypeHint}" for OS file drop with loadFileCallback.`);
                }
            } else {
                 console.warn("[Utils DropZone] loadFileCallback not provided for OS file drop.");
            }
        } else {
            console.log("[Utils DropZone] Drop event did not contain recognized data (JSON or files).");
        }
    });

    // Listener for the relink/retry button if it exists
    const relinkButton = dropZoneElement.querySelector('.drop-zone-relink-button');
    if (relinkButton) {
        relinkButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dropzone's own click/label activation
            const fileInput = dropZoneElement.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.click(); // Trigger the hidden file input
            } else {
                console.warn("[Utils DropZone] Could not find file input for relink button on dropzone:", dropZoneElement.id);
            }
        });
    }
}


export function secondsToBBSTime(seconds) {
    if (typeof Tone === 'undefined' || seconds === null || seconds === undefined || isNaN(seconds)) {
        console.warn(`[Utils secondsToBBSTime] Invalid input or Tone not available. Seconds: ${seconds}`);
        return "0:0:0";
    }
    try {
        return Tone.Time(seconds).toBarsBeatsSixteenths();
    } catch (e) {
        console.error(`[Utils secondsToBBSTime] Error converting ${seconds}s to B:B:S:`, e);
        return "0:0:0"; // Fallback
    }
}

export function bbsTimeToSeconds(bbsString) {
    if (typeof Tone === 'undefined' || !bbsString || typeof bbsString !== 'string') {
        console.warn(`[Utils bbsTimeToSeconds] Invalid input or Tone not available. BBS String: ${bbsString}`);
        return null;
    }
    try {
        const seconds = Tone.Time(bbsString).toSeconds();
        return isNaN(seconds) ? null : seconds;
    } catch (e) {
        console.error(`[Utils bbsTimeToSeconds] Error converting B:B:S string "${bbsString}" to seconds:`, e);
        return null; // Fallback
    }
}

let activeContextMenu = null;

export function createContextMenu(event, menuItems, appServicesForZIndex = null) {
    if (!event || !menuItems || !Array.isArray(menuItems)) {
        console.error("[Utils createContextMenu] Invalid arguments provided.");
        return null;
    }
    event.preventDefault();
    event.stopPropagation();

    if (activeContextMenu) {
        try {
            activeContextMenu.remove();
        } catch (e) { console.warn("Error removing previous context menu:", e); }
        activeContextMenu = null;
    }

    const menu = document.createElement('div');
    menu.id = `snug-context-menu-${Date.now()}`; // More unique ID
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    let zIndexToSet = 10000; // Default high z-index
    if (appServicesForZIndex && typeof appServicesForZIndex.getHighestZ === 'function' && typeof appServicesForZIndex.incrementHighestZ === 'function') {
        try {
            // It's better to use incrementHighestZ to ensure it's on top of other elements managed by the same system
            zIndexToSet = appServicesForZIndex.incrementHighestZ();
        } catch (e) {
            console.warn("Error getting z-index from appServices, using default.", e);
        }
    } else if (typeof window !== 'undefined' && window.highestZIndex) { // Fallback to a potentially global var (less ideal)
        zIndexToSet = window.highestZIndex + 100;
    }
    menu.style.zIndex = zIndexToSet;


    const ul = document.createElement('ul');
    menuItems.forEach(itemConfig => {
        if (!itemConfig) return; // Skip null/undefined items

        if (itemConfig.separator) {
            const hr = document.createElement('hr');
            hr.className = 'context-menu-separator';
            ul.appendChild(hr);
            return;
        }

        const li = document.createElement('li');
        li.className = `context-menu-item ${itemConfig.disabled ? 'disabled' : ''}`;
        li.textContent = itemConfig.label || 'Menu Item';
        if (itemConfig.title) li.title = itemConfig.title;

        if (!itemConfig.disabled && typeof itemConfig.action === 'function') {
            li.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from bubbling to document listener immediately
                try {
                    itemConfig.action();
                } catch (actionError) {
                    console.error("Error in context menu item action:", actionError);
                }
                if (activeContextMenu && activeContextMenu.parentElement) { // Check if still in DOM
                    try { activeContextMenu.remove(); } catch (e) {}
                }
                activeContextMenu = null;
                // Document listener for closing should be removed by itself (see below)
            });
        }
        ul.appendChild(li);
    });

    menu.appendChild(ul);
    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Adjust position if out of viewport
    try {
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (menuRect.right > viewportWidth) {
            menu.style.left = `${Math.max(0, viewportWidth - menuRect.width - 5)}px`; // Added buffer
        }
        if (menuRect.bottom > viewportHeight) {
            menu.style.top = `${Math.max(0, viewportHeight - menuRect.height - 5)}px`; // Added buffer
        }
         if (menuRect.left < 0) { // Check left boundary
            menu.style.left = '5px';
        }
        if (menuRect.top < 0) { // Check top boundary
            menu.style.top = '5px';
        }
    } catch (e) {
        console.warn("Error adjusting context menu position:", e);
    }

    // Unified close listener
    const closeListener = (e) => {
        if (activeContextMenu && (!menu.contains(e.target) || e.type === 'contextmenu' && e.target !== menu && !menu.contains(e.target))) {
            try {
                activeContextMenu.remove();
            } catch (removeError) { /* ignore if already removed */ }
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur); // Also remove blur listener
        }
    };
    const closeListenerBlur = () => { // Separate for blur as it doesn't have e.target
        if (activeContextMenu) {
             try { activeContextMenu.remove(); } catch (removeError) { /* ignore */ }
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur);
        }
    }

    // Add listeners after a short delay to avoid capturing the event that opened the menu
    setTimeout(() => {
        document.addEventListener('click', closeListener, { capture: true });
        document.addEventListener('contextmenu', closeListener, { capture: true });
        window.addEventListener('blur', closeListenerBlur); // Close on window blur
    }, 0);

    return menu;
}
