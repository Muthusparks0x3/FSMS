// Define the database name and object store
const dbName = "FSMS_Participants_DB";
const objectStoreName = "participants";
let dbVersion;
let db;
// Store initial values when editing starts
let originalParticipantData = {};

// DOM elements
const editNameInput = document.getElementById("editName");
const editMobileInput = document.getElementById("editMobile");
const editAddressInput = document.getElementById("editAddress");
const saveParticipantButton  = document.getElementById("saveParticipantButton");
const cancelParticipantButton = document.getElementById("cancelParticipantButton");
const saveEditButton = document.getElementById("saveEditButton");
const cancelEditButton = document.getElementById("cancelEditButton")
const editParticipantPopup = document.getElementById("editParticipantPopup");
const addParticipantPopup = document.getElementById("addParticipantPopup");
const tableBody = document.getElementById("participantsTableBody");
const scheduleButton = document.getElementById("scheduleButton");
const searchBar = document.getElementById("searchBar");
const suggestionsContainer = document.getElementById("suggestions");
const addParticipantButton = document.getElementById("addParticipantButton");
const totalParticipantsCount = document.getElementById("totalParticipants");
const ExportPage = document.getElementById("Exportpage");

// Open IndexedDB
const request = indexedDB.open(dbName, dbVersion);

request.onsuccess = (event) => {
    db = event.target.result;
    loadParticipants();
};

request.onerror = (event) => {
    console.error("Error opening database:", event.target.errorCode);
    alert("Failed to load participants. Please try again later.");
};

// Function to count total participants
function updateTotalParticipants() {
    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");

    const countRequest = store.count();

    countRequest.onsuccess = () => {
        totalParticipantsCount.textContent = `Total Participants: ${countRequest.result}`;
    };

    countRequest.onerror = (event) => {
        console.error("Error counting participants:", event.target.errorCode);
    };
}

// Load participants from IndexedDB
function loadParticipants() {
    const transaction = db.transaction(objectStoreName, "readonly");
    const store = transaction.objectStore(objectStoreName);
    const request = store.getAll();

    request.onsuccess = () => {
        const participants = request.result;
        populateTable(participants);
        updateTotalParticipants(); // Update total participants
    };

    request.onerror = () => {
        console.error("Error loading participants");
        alert("Failed to load participants. Please try again.");
    };
}

// Populate the participant table
function populateTable(participants) {
    tableBody.innerHTML = ""; // Clear existing rows

    participants.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    participants.forEach((participant, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>  <!-- Auto-incremented Serial Number -->
            <td>${participant.name}</td>
            <td>${participant.participantID}</td>
            <td>${participant.mobile}</td>
            <td>${participant.address}</td>
            <td><button onclick="editParticipant('${participant.participantID}')">Edit</button></td>
            <td><button onclick="deleteParticipant('${participant.participantID}')">Delete</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// Open the edit popup
function editParticipant(participantID) {
    const normalizedParticipantID = participantID.toString();

    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");

    const request = store.get(normalizedParticipantID);

    request.onsuccess = () => {
        const fetchedParticipant = request.result;

        if (fetchedParticipant) {
            editNameInput.value = fetchedParticipant.name || "";
            editMobileInput.value = fetchedParticipant.mobile || "";
            editAddressInput.value = fetchedParticipant.address || "";

            saveEditButton.dataset.participantId = fetchedParticipant.participantID;
            editParticipantPopup.style.display = "block";

            // Store original data for comparison
            originalParticipantData = { ...fetchedParticipant };
        } else {
            alert("Participant not found.");
        }
    };

    request.onerror = () => {
        console.error("Error fetching participant.");
        alert("Failed to load participant details.");
    };
}

function saveParticipantChanges() {
    const participantID = saveEditButton.dataset.participantId;

    if (!participantID) {
        alert("Invalid participant ID.");
        return;
    }

    // Ask for confirmation before saving
    if (!confirm("Are you sure you want to save the changes?")) {
        return; // Cancel save if user selects "No"
    }

    const updatedParticipant = {
        participantID: participantID,
        name: editNameInput.value.trim(),
        mobile: editMobileInput.value.trim(),
        address: editAddressInput.value.trim(),
    };

    const transaction = db.transaction("participants", "readwrite");
    const store = transaction.objectStore("participants");

    const request = store.put(updatedParticipant);
    request.onsuccess = () => {
        alert("Changes saved successfully!");
        closeEditPopup();
        loadParticipants();
    };

    request.onerror = () => {
        console.error("Error updating participant.");
        alert("Failed to save changes. Please try again.");
    };
}

function closeEditPopup() {
    editParticipantPopup.style.display = "none";
}

function hasChangesMade() {
    return (
        editNameInput.value.trim() !== originalParticipantData.name ||
        editMobileInput.value.trim() !== originalParticipantData.mobile ||
        editAddressInput.value.trim() !== originalParticipantData.address
    );
}

function deleteParticipant(participantID) {
    const normalizedParticipantID = participantID.toString();

    if (confirm("Are you sure you want to delete this participant?")) {
        const transaction = db.transaction(objectStoreName, "readwrite");
        const store = transaction.objectStore(objectStoreName);

        const request = store.delete(normalizedParticipantID);

        request.onsuccess = () => {
            alert(`Participant and their associated data were deleted successfully!`);
            deleteParticipantData(normalizedParticipantID);
            loadParticipants();
        };

        request.onerror = () => {
            console.error("Error deleting participant.");
            alert("Failed to delete participant. Please try again.");
        };
    }
}

async function deleteParticipantData(participantID) {
    const dbRequest = indexedDB.open('FSMS_Schedule_Details_DB', dbVersion);

    dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const objectStores = Array.from(db.objectStoreNames);

        objectStores.forEach((storeName) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const records = getAllRequest.result;

                const updatedRecords = records.map(record => {
                    const originalLength = record.rowsData.length;
                    record.rowsData = record.rowsData.filter(row => row.participantID !== participantID);
                    return record;
                }).filter(record => record.rowsData.length > 0);

                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
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
    };

    dbRequest.onerror = (e) => {
        console.error('Failed to open FSMS_Schedule_Details_DB:', e);
    };
}

// Filter participants in the table based on the search input
function filterParticipants() {
    const query = searchBar.value.trim().toLowerCase();
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(row => {
        const nameCell = row.cells[1]; // Assuming the Name column is the second column
        if (nameCell) {
            const name = nameCell.textContent.toLowerCase();
            if (name.includes(query)) {
                row.style.display = ""; // Show matching rows
            } else {
                row.style.display = "none"; // Hide non-matching rows
            }
        }
    });
}

// Generate a Unique Participant ID
function generateParticipantID(callback) {
    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");

    let lastParticipantID = 99;

    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const participantID = parseInt(cursor.value.participantID, 10);
            if (!isNaN(participantID) && participantID > lastParticipantID) {
                lastParticipantID = participantID;
            }
            cursor.continue();
        } else {
            const newID = (lastParticipantID + 1).toString();
            callback(newID);
        }
    };

    transaction.onerror = function (event) {
        console.error("Error generating Participant ID:", event.target.errorCode);
        callback(null);
    };
}

// Add Participant Functionality
function addParticipant() {
    const name = document.getElementById("addName").value.trim();
    const mobile = document.getElementById("addMobile").value.trim();
    const address = document.getElementById("addAddress").value.trim();

    if (name && mobile && address) {
        generateParticipantID((newID) => {
            if (newID !== null) {
                const transaction = db.transaction("participants", "readwrite");
                const store = transaction.objectStore("participants");

                store.add({
                    participantID: newID,
                    name: name,
                    mobile: mobile,
                    address: address,
                });

                transaction.oncomplete = () => {
                    alert("Participant added successfully!");
                    loadParticipants();
                    addParticipantPopup.style.display = "none"; // Hide popup
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

// Clear Input Fields
function clearAddParticipantFields() {
    document.getElementById("addName").value = "";
    document.getElementById("addMobile").value = "";
    document.getElementById("addAddress").value = "";
}

// Show Popup
addParticipantButton.addEventListener("click", () => {
    addParticipantPopup.style.display = "block";
});

saveEditButton.addEventListener("click", saveParticipantChanges);

// Hide Popup on Cancel
cancelParticipantButton.addEventListener("click", () => {
    addParticipantPopup.style.display = "none";
    clearAddParticipantFields();
});

// Attach Add Participant Functionality
saveParticipantButton.addEventListener("click", addParticipant);

cancelEditButton.addEventListener("click", () => {
    if (hasChangesMade()) {
        const userChoice = confirm("You have unsaved changes. Do you want to save them?");
        if (userChoice) {
            saveParticipantChanges(); // Save changes before closing
        } else {
            closeEditPopup(); // Close without saving
        }
    } else {
        closeEditPopup(); // Simply close if no changes were made
    }
});

scheduleButton.addEventListener("click", () => {
    window.location.href = "FSMS_MAIN.html";
});

ExportPage.addEventListener('click', function(){ // Redirect to the login page
    window.location.href = 'FSMS_EXPORT.html';
});

searchBar.addEventListener("input", filterParticipants);