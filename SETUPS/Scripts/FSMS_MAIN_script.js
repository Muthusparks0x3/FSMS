// Variables for HTML elements
const addParticipantBtn = document.getElementById('addParticipantBtn');
const editParticipantBtn = document.getElementById('editParticipantBtn');
const addParticipantPopup = document.getElementById('addParticipantPopup');
const editParticipantPopup = document.getElementById('editParticipantPopup');
const closeAddPopup = document.getElementById('closeAddPopup');
const saveParticipantBtn = document.getElementById('saveParticipantBtn');
const saveChangesBtn = document.getElementById('saveChangesBtn');
const cancelEditPopup = document.getElementById('cancelEditPopup');
const deleteParticipantBtn = document.getElementById('deleteParticipantBtn');
const searchBar = document.getElementById('searchBar');
const searchButton = document.getElementById("searchButton");
const suggestionsContainer = document.getElementById("suggestions");
const totalParticipants = document.getElementById('totalParticipants');
const logoutbutton =  document.getElementById("logoutButton")
const refreshPageButton = document.getElementById('refreshPageBtn');
const settingsIcon = document.getElementById('settingsIcon');
const settingsPopup = document.getElementById('settingsPopup');
const exportOption = document.getElementById('exportOption');
const importOption = document.getElementById('importOption');
const importOPtionsPopup = document.getElementById('importOptionsPopup');
const exportOptionsPopup = document.getElementById('exportOptionsPopup');
const exportParticipantDB = document.getElementById('exportParticipants');
const importParticipantsDB = document.getElementById("importParticipants");
const importFileInput = document.getElementById("importFileInput");
const ExportPage = document.getElementById("Exportpage");
//password modal
const passwordModal = document.getElementById('passwordModal');
const settingsPasswordInput = document.getElementById('settingsPassword');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
//Participant list
const participantlistbtn = document.getElementById("participantListBtn");
//storage options
const storageOption = document.getElementById('storageOption');
const storagePopup = document.getElementById('storagePopup');
const closeStoragePopup = document.getElementById('closeStoragePopup');
const participantsStorage = document.getElementById('participantsStorage');
const scheduleStorage = document.getElementById('scheduleStorage');
const availableStorage = document.getElementById('availableStorage');
// Predefined password
const SETTINGS_PASSWORD = "Helix@0x3";

let db;
let participants = []; // Ensure participants array is defined here
let initialEditValues = {};

// Initialize IndexedDB
function initDB() {
    const request = indexedDB.open("FSMS_Participants_DB", 1); // Open the database with version 1

    // Handle database upgrade or creation
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        console.log("onupgradeneeded triggered");

        // Check if the object store exists, if not create it
        if (!db.objectStoreNames.contains("participants")) {
            const store = db.createObjectStore("participants", { keyPath: "participantID" });
            store.createIndex("name_id", ["name", "participantID"], { unique: true });
            console.log("Object store 'participants' created.");
        }
    };

    // Handle success
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("Database opened successfully");
        
        // Load participants after DB is opened
        loadParticipants();
    };

    // Handle errors
    request.onerror = function(event) {
        console.error("Database error: " + event.target.errorCode);
    };
}

// Load participants from IndexedDB
function loadParticipants() {
    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");

    // Get all participants from the object store
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        participants = event.target.result || []; // Store participants in array, ensure it's not undefined
        console.log("Participants loaded:", participants);
        
        // Sort participants alphabetically by name
        participants.sort((a, b) => a.name.localeCompare(b.name))

        // Update and display total participants
        updateTotalParticipants(participants.length);
    };

    request.onerror = function(event) {
        console.error("Error loading participants", event.target.errorCode);
    };
}

// Update total participants count
function updateTotalParticipants(count) {
    totalParticipants.textContent = `Total Participants: ${count}`;
}

// Update suggestions based on search input
function updateSuggestions(query) {
    const filtered = participants.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) // Match names containing the query
    );

    suggestionsContainer.innerHTML = "";
    if (query && filtered.length > 0) {
        filtered.forEach((participant) => {
            const suggestion = document.createElement("div");
            suggestion.textContent = participant.name;
            suggestion.addEventListener("click", () => {
                searchBar.value = participant.name;
                suggestionsContainer.style.display = "none";
                filterTableRows(participant.name); // Filter the table based on the clicked suggestion
            });
            suggestionsContainer.appendChild(suggestion);
        });
        suggestionsContainer.style.display = "block";
    } else {
        suggestionsContainer.style.display = "none";
    }

    // Dynamically filter the table as the user types
    filterTableRows(query);
}

// Function to generate a unique participantID starting from 100
function generateParticipantID(callback) {
    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");

    let lastParticipantID = 99; // Start with 99, so the first ID generated is 100

    // Open a cursor to iterate through records and find the highest participantID
    store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const participantID = parseInt(cursor.value.participantID, 10); // Ensure it's treated as an integer
            if (!isNaN(participantID) && participantID > lastParticipantID) {
                lastParticipantID = participantID;
            }
            cursor.continue();
        } else {
            // Once iteration is complete, generate the new participantID as a string
            const ParticipantID = (lastParticipantID + 1).toString();
            callback(ParticipantID);
        }
    };

    transaction.onerror = function(event) {
        console.error("Error generating participantID:", event.target.errorCode);
        callback(null); // Return null in case of error
    };
}

// Add participant
function addParticipant() {
    const name = document.getElementById('addName').value;
    const mobile = document.getElementById('addMobile').value;
    const address = document.getElementById('addAddress').value;

    if (name && mobile && address) {
        generateParticipantID(function(ParticipantID) {
            if (ParticipantID !== null) {
                const transaction = db.transaction("participants", "readwrite");
                const store = transaction.objectStore("participants");

                // Add participant with new participantID as a string
                store.add({
                    participantID: ParticipantID,
                    name: name,
                    mobile: mobile,
                    address: address
                });

                transaction.oncomplete = () => {
                    alert("Participant added successfully!");
                    loadParticipants();
                    clearAddParticipantFields();
                };

                transaction.onerror = (event) => {
                    console.error("Error adding participant:", event.target.errorCode);
                };
            } else {
                alert("Error generating participant ID.");
            }
        });
    } else {
        alert("All fields are required.");
    }
}

// Clear input fields after adding a participant
function clearAddParticipantFields() {
    document.getElementById('addName').value = '';
    document.getElementById('addMobile').value = '';
    document.getElementById('addAddress').value = '';
}

// Edit participant
function editParticipant() {
    const searchQuery = searchBar.value.trim(); // Get the search query from the search bar

    if (searchQuery) {
        const transaction = db.transaction("participants", "readonly");
        const store = transaction.objectStore("participants");

        // Open a cursor to iterate through participants
        const request = store.openCursor();
        request.onsuccess = function (event) {
            const cursor = event.target.result;

            if (cursor) {
                const participant = cursor.value;

                // Match the participant's name (case-insensitive)
                if (participant.name.toLowerCase() === searchQuery.toLowerCase()) {
                    // Populate the edit fields
                    document.getElementById("editName").value = participant.name;
                    document.getElementById("editMobile").value = participant.mobile;
                    document.getElementById("editAddress").value = participant.address;

                    // Store the participantID for reference
                    editParticipantPopup.dataset.participantId = participant.participantID;

                    // Store the initial values for comparison
                    initialEditValues = {
                        name: participant.name,
                        mobile: participant.mobile,
                        address: participant.address,
                    };

                    // Show the edit popup
                    editParticipantPopup.style.display = "block";
                    return; // Stop further cursor iterations
                }

                cursor.continue();
            } else {
                alert("Participant not found.");
            }
        };

        request.onerror = function () {
            console.error("Error searching for participant.");
            alert("Failed to load participant details.");
        };
    } else {
        alert("Search field is empty. Cannot edit participant.");
    }
}

// Save changes to participant
function saveChanges() {
    const participantID = editParticipantPopup.dataset.participantId; // Retrieve the participantID
    const name = document.getElementById('editName').value.trim();
    const mobile = document.getElementById('editMobile').value.trim();
    const address = document.getElementById('editAddress').value.trim();

    // Confirm before saving changes
    if (confirm("Are you sure you want to save changes?")) {
        const transaction = db.transaction("participants", "readwrite");
        const store = transaction.objectStore("participants");

        // Use a cursor to find the participant by participantID and update their details
        const request = store.openCursor();
        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.participantID === participantID) {
                    const updatedParticipant = {
                        ...cursor.value, // Keep existing fields intact
                        name: name,
                        mobile: mobile,
                        address: address,
                    };

                    cursor.update(updatedParticipant).onsuccess = function () {
                        alert("Participant details updated successfully!");
                        loadParticipants(); // Refresh participant table
                    };

                    return; // Exit after updating
                }
                cursor.continue();
            } else {
                alert("Participant not found.");
            }
        };

        request.onerror = function () {
            console.error("Error saving participant details.");
            alert("Failed to save changes. Please try again.");
        };
        editParticipantPopup.style.display = 'none';
    }
    else {
        editParticipantPopup.style.display = 'block';
    }
}

// Delete participant
function deleteParticipant() {
    const participantID = editParticipantPopup.dataset.participantId; // Use participantID
    const transaction = db.transaction("participants", "readwrite");
    const participantsStore = transaction.objectStore("participants");

    // Fetch participant details using participantID
    const getAllRequest = participantsStore.getAll();

    getAllRequest.onsuccess = async () => {
        const participants = getAllRequest.result;
        const participant = participants.find(p => p.participantID === participantID);

        if (participant) {
            const { name } = participant;

            // Confirm deletion
            if (confirm(`Are you sure you want to delete participant "${name}" and all their associated data?`)) {
                // Delete participant by matching participantID
                const deleteRequest = participantsStore.delete(participant.participantID); // Use participantID for deletion

                deleteRequest.onsuccess = async () => {
                    console.log(`Participant "${name}" with participantID ${participantID} deleted from participants store.`);

                    // Delete associated schedule data
                    await deleteParticipantData(participantID);

                    // Reload participants to reflect changes
                    loadParticipants();
                    alert(`Participant "${name}" and their associated data were deleted successfully!`);
                };

                deleteRequest.onerror = (e) => {
                    console.error("Error deleting participant:", e);
                };
            }
        } else {
            alert("Participant not found.");
        }
    };

    getAllRequest.onerror = (e) => {
        console.error("Error fetching participant details:", e);
    };
}

async function deleteParticipantData(participantID) {
    console.log(`Starting data deletion for participantID: ${participantID}`);

    const dbRequest = indexedDB.open('FSMS_Schedule_Details_DB', dbVersion);

    dbRequest.onsuccess = (event) => {
        const db = event.target.result;

        // Ensure the database is open and ready before proceeding
        if (db) {
            // Get all object store names (representing months)
            const objectStores = Array.from(db.objectStoreNames);
            console.log("Object store names:", objectStores);

            objectStores.forEach((storeName) => {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);

                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    const records = getAllRequest.result;

                    console.log(`Fetched ${records.length} records from store "${storeName}".`);

                    // Filter and update records to exclude the participant's data
                    const updatedRecords = records.map(record => {
                        const originalLength = record.rowsData.length;
                        record.rowsData = record.rowsData.filter(row => row.participantID !== participantID);
                        console.log(`Updated record for date ${record.date}: Removed ${originalLength - record.rowsData.length} rows.`);
                        return record;
                    }).filter(record => record.rowsData.length > 0);

                    // Clear the store and insert updated records
                    const clearRequest = store.clear();

                    clearRequest.onsuccess = () => {
                        console.log(`Cleared object store "${storeName}". Re-inserting updated records.`);
                        updatedRecords.forEach(record => {
                            store.put(record);
                        });
                    };

                    clearRequest.onerror = (e) => {
                        console.error(`Error clearing store "${storeName}":`, e);
                    };
                };

                getAllRequest.onerror = (e) => {
                    console.error(`Error fetching data from store "${storeName}":`, e);
                };
            });
        } else {
            console.error('Database does not exist or failed to open.');
        }
    };

    dbRequest.onerror = (e) => {
        console.error('Failed to open FSMS_Schedule_Details_DB:', e);
    };
}

async function exportParticipantsToCSV() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FSMS_Participants_DB", 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction("participants", "readonly");
            const store = transaction.objectStore("participants");

            let csvContent = 'data:text/csv;charset=utf-8,';
            csvContent += 'ParticipantID,Name,Mobile,Address\n'; // Removed 'ID' column

            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const participant = cursor.value;
                    const participantID = participant.participantID || ''; // Only include participantID
                    const name = participant.name || '';
                    const mobile = participant.mobile || '';
                    const address = participant.address || '';

                    csvContent += `${participantID},${name},${mobile},${address}\n`; // Removed 'id' from CSV

                    cursor.continue();
                } else {
                    // Download the CSV once all participants are processed
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "FSMS_Participants_data.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    resolve("CSV exported successfully.");
                }
            };

            store.openCursor().onerror = function(event) {
                reject("Error exporting participants to CSV: " + event.target.errorCode);
            };
        };

        request.onerror = function(event) {
            reject("Error opening database: " + event.target.errorCode);
        };
    });
}



// Handle file selection and import to IndexedDB
importFileInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            if (typeof csvData === 'string') {
                importCSVToIndexedDB(csvData);
            } else {
                console.error("File read error: Data is not in string format.");
            }
        };
        reader.readAsText(file);
    }
});

// Function to parse CSV data and import it into IndexedDB
function importCSVToIndexedDB(csvData) {
    const transaction = db.transaction("participants", "readwrite");
    const store = transaction.objectStore("participants");
    const index = store.index("name_id"); // Index based on name and participantID

    const rows = csvData.split('\n').filter(row => row.trim() !== '');
    const headers = rows[0].split(',').map(header => header.trim().toLowerCase());

    const headerMap = {
        participantid: "ParticipantID",
        name: "name",
        mobile: "mobile",  
        address: "address"
    };

    // Check if the participantID column exists in the CSV file
    const participantIDIndex = headers.findIndex(header => header === headerMap.participantid.toLowerCase());
    if (participantIDIndex === -1) {
        console.error("participantID column is missing in CSV headers.");
        return;
    }

    let highestParticipantID = 0; // Initialize highest participant ID

    // Fetch all existing participants to determine the highest participantID
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = function() {
        const participants = getAllRequest.result;
        participants.forEach(participant => {
            if (participant.participantID > highestParticipantID) {
                highestParticipantID = participant.participantID;
            }
        });

        // Now, process the CSV rows
        rows.slice(1).forEach(row => {
            const values = row.split(',').map(value => value.trim());

            let participant = {
                participantID: values[participantIDIndex] || (highestParticipantID + 1), // Default to highestParticipantID + 1 if missing
                name: values[headers.indexOf(headerMap.name)] || '',
                mobile: values[headers.indexOf(headerMap.mobile)] || '',
                address: values[headers.indexOf(headerMap.address)] || ''
            };

            // Check if the participantID from CSV already exists for a different participant
            const searchKey = [participant.name, participant.participantID];
            const getRequest = index.get(searchKey);

            getRequest.onsuccess = function(event) {
                const existingEntry = event.target.result;

                if (existingEntry) {
                    // Scenario 1: If participantID exists but is for a different participant, update the ID
                    if (existingEntry.participantID !== participant.participantID) {
                        // Change the participant ID to the next available ID (highest + 1)
                        participant.participantID = highestParticipantID + 1;
                        highestParticipantID = participant.participantID; // Update highest ID
                    }

                    // Proceed to add or update the participant
                    store.put(participant);
                } else {
                    // No existing participant found, so just add the new one
                    store.add(participant);
                }
            };

            getRequest.onerror = function(event) {
                console.error("Error accessing index to verify participant:", event.target.errorCode);
            };
        });
    };

    getAllRequest.onerror = function(event) {
        console.error("Error fetching participants from IndexedDB:", event.target.errorCode);
    };

    transaction.oncomplete = () => {
        console.log("CSV data imported successfully to IndexedDB.");
        loadParticipants(); // Reload participants to reflect new data
    };

    transaction.onerror = (event) => {
        console.error("Error importing CSV to IndexedDB:", event.target.errorCode);
    };
}

// Function to validate the entered password
function validatePassword() {
    const enteredPassword = settingsPasswordInput.value;
    if (enteredPassword === SETTINGS_PASSWORD) {
        // Password is correct; show the settings popup
        passwordModal.style.display = 'none';
        settingsPopup.style.display = 'block';
    } else {
        alert("Incorrect password. Access denied.");
        settingsPasswordInput.value = ''; // Clear the input field
        settingsPasswordInput.focus(); // Refocus the input field
    }
}

// Function to calculate storage
function calculateStorage() {
    // IndexedDB storage sizes
    calculateIndexedDBSize("FSMS_Participants_DB")
        .then(size => {
            participantsStorage.textContent = `Participants DB: ${formatSize(size)}`;
        })
        .catch(() => {
            participantsStorage.textContent = "Participants DB: Unable to calculate";
        });

    calculateIndexedDBSize("FSMS_Schedule_Details_DB")
        .then(size => {
            scheduleStorage.textContent = `Schedule DB: ${formatSize(size)}`;
        })
        .catch(() => {
            scheduleStorage.textContent = "Schedule DB: Unable to calculate";
        });

    // Total available storage (assume a quota of 50MB)
    const quota = 50 * 1024 * 1024; // 50MB
    navigator.storage.estimate().then(estimate => {
        const used = estimate.usage || 0;
        const remaining = quota - used;
        availableStorage.textContent = `Available Storage: ${formatSize(remaining)}`;
    });
}

// Helper function to calculate IndexedDB size
function calculateIndexedDBSize(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = event => {
            const db = event.target.result;
            let totalSize = 0;

            // Calculate size of all object stores
            const transaction = db.transaction(db.objectStoreNames, 'readonly');
            transaction.oncomplete = () => {
                db.close();
                resolve(totalSize);
            };

            transaction.onerror = () => reject();
            for (const storeName of db.objectStoreNames) {
                const store = transaction.objectStore(storeName);
                const countRequest = store.getAll();

                countRequest.onsuccess = () => {
                    const records = countRequest.result;
                    totalSize += JSON.stringify(records).length;
                };

                countRequest.onerror = () => reject();
            }
        };

        request.onerror = () => reject();
    });
}

// Helper function to format sizes
function formatSize(bytes) {
    if (bytes > 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes > 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
        return `${bytes} Bytes`;
    }
}

storageOption.addEventListener('click', () => {
    // Get the dimensions and position of the storage option
    const rect = storageOption.getBoundingClientRect();

    // Calculate the position for the popup
    storagePopup.style.top = `${rect.top + window.scrollY}px`; // Align vertically with the storage option
    storagePopup.style.left = `${rect.left - storagePopup.offsetWidth - 100}px`; // Move to the left of the storage option with a 10px gap

    // Ensure the popup doesn't exceed the screen's left boundary
    if (storagePopup.getBoundingClientRect().left < 0) {
        storagePopup.style.left = `${rect.right + 10}px`; // Move to the right of the storage option as fallback
    }

    // Show the popup
    storagePopup.style.display = 'block';

    // Fetch and update storage details
    calculateStorage();
});

closeStoragePopup.addEventListener('click', () => {
    storagePopup.style.display = 'none';
});

document.addEventListener('click', (event) => {
    if (!storagePopup.contains(event.target) && event.target !== storageOption) {
        storagePopup.style.display = 'none';
    }
});

// Event Listeners
searchBar.addEventListener("input", () => {
    updateSuggestions(searchBar.value);
    const searchQuery = searchBar.value.trim();
    editParticipantBtn.disabled = !searchQuery; // Disable if the search field is empty
});

searchBar.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        const query = searchBar.value.trim();
        if (query) {
            dispatchSearchEvent(query);
            suggestionsContainer.style.display = "none";
        } else {
            alert("Please enter a participant's name to search.");
        }
    }
});

// Show the password modal when the settings icon is clicked
settingsIcon.addEventListener('click', () => {
    passwordModal.style.display = 'block';
    settingsPasswordInput.value = ''; // Clear the input field
    settingsPasswordInput.focus(); // Focus on the input field
});

// Handle password submission when the Enter key is pressed
settingsPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        validatePassword();
    }
});

// Handle password modal cancellation
cancelPasswordBtn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
    settingsPasswordInput.value = ''; // Clear the input field
});

// Close the password modal and settings popup if the user clicks outside them
document.addEventListener('click', (event) => {
    if (!passwordModal.contains(event.target) && event.target !== settingsIcon) {
        passwordModal.style.display = 'none';
    }
    if (!settingsPopup.contains(event.target) && event.target !== settingsIcon) {
        settingsPopup.style.display = 'none';
    }
});

// Close the popup if the user clicks outside of it
document.addEventListener('click', (event) => {
    if (!settingsIcon.contains(event.target) && !settingsPopup.contains(event.target)) {
        settingsPopup.style.display = 'none';
    }
});

// Show export options when "Export" is clicked
exportOption.addEventListener('click', (event) => {
    // Position exportOptionsPopup directly below the "Export" option
    const exportOptionRect = exportOption.getBoundingClientRect();
    exportOptionsPopup.style.top = `${exportOptionRect.bottom + window.scrollY}px`;
    exportOptionsPopup.style.left = `${exportOptionRect.left + window.scrollX}px`;
    
    // Toggle export options visibility
    exportOptionsPopup.style.display = exportOptionsPopup.style.display === 'block' ? 'none' : 'block';
});

// Toggle display for Import popups
importOption.addEventListener('click', (event) => {
    // Position exportOptionsPopup directly below the "Export" option
    const importOptionRect = importOption.getBoundingClientRect();
    importOPtionsPopup.style.top = `${importOptionRect.bottom + window.scrollY}px`;
    importOPtionsPopup.style.left = `${importOptionRect.left + window.scrollX}px`;
    
    // Toggle export options visibility
    importOPtionsPopup.style.display = exportOptionsPopup.style.display === 'block' ? 'none' : 'block';
});

// Hide both popups when clicking outside
document.addEventListener('click', (event) => {
    if (!settingsPopup.contains(event.target) && event.target !== settingsIcon) {
        settingsPopup.style.display = 'none';
    }
    if (!exportOptionsPopup.contains(event.target) && event.target !== exportOption) {
        exportOptionsPopup.style.display = 'none';
    }
    if (!importOPtionsPopup.contains(event.target) && event.target !== importOption){
        importOPtionsPopup.style.display ='none';
    }
});

//Exporting the Participant DB to CSV file
exportParticipantDB.addEventListener('click',exportParticipantsToCSV);

// Add event listener to trigger the file input dialog when "Participants" is clicked
importParticipantsDB.addEventListener("click", () => {
    importFileInput.click(); // Opens the file dialog
});

// Event listeners
addParticipantBtn.onclick = () => addParticipantPopup.style.display = 'block';
closeAddPopup.onclick = () => addParticipantPopup.style.display = 'none';
saveParticipantBtn.onclick = () => {
    addParticipant();
    addParticipantPopup.style.display = 'none';
};
editParticipantBtn.onclick = editParticipant;
saveChangesBtn.onclick = () => {
    saveChanges();
};
cancelEditPopup.onclick = () => {
    // Get the current values from the form
    const currentEditValues = {
        name: document.getElementById("editName").value,
        mobile: document.getElementById("editMobile").value,
        address: document.getElementById("editAddress").value,
    };

    // Check if any changes were made
    const changesMade =
        currentEditValues.name !== initialEditValues.name ||
        currentEditValues.mobile !== initialEditValues.mobile ||
        currentEditValues.address !== initialEditValues.address;

    if (changesMade) {
        if (confirm("Are you sure to cancel the changes made?")) {
            editParticipantPopup.style.display = "none";
        }
    } else {
        // Close the popup without confirmation if no changes were made
        editParticipantPopup.style.display = "none";
    }
};
deleteParticipantBtn.onclick = () => {
    deleteParticipant();
    editParticipantPopup.style.display = 'none';
};

// Add an event listener to the refresh button to reload the page
refreshPageButton.addEventListener('click', () => {
    location.reload(); // Refreshes the page
});

//Navigation to export page
ExportPage.addEventListener('click', function(){ // Redirect to the login page
window.location.href = 'FSMS_EXPORT.html';
});

// Event listener for Logout button
logoutbutton.addEventListener("click", () => {
    // Add functionality for Logout button
    alert("Logging out...");
    window.location.href = "FSMS_LOGIN.html"; // Redirect to the login page
});

//participant list
participantlistbtn.addEventListener("click", () => {
    window.location.href = "FSMS_PARTICIPANT_LIST.html"; // Redirect to the participant list page
});

// Initialize IndexedDB and object stores on page load
window.onload = function () {
    initDB();
};


