// Define the database name and object store
const dbName = "FSMS_Participants_DB";
const objectStoreName = "participants";
let dbVersion;
let db;

// DOM elements
const editNameInput = document.getElementById("editName");
const editMobileInput = document.getElementById("editMobile");
const editAddressInput = document.getElementById("editAddress");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const cancelEditPopup = document.getElementById("cancelEditPopup");
const editParticipantPopup = document.getElementById("editParticipantPopup");
const tableBody = document.getElementById("participantsTableBody");
const scheduleButton = document.getElementById("scheduleButton");

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

// Load participants from IndexedDB
function loadParticipants() {
    const transaction = db.transaction(objectStoreName, "readonly");
    const store = transaction.objectStore(objectStoreName);
    const request = store.getAll();

    request.onsuccess = () => {
        const participants = request.result;
        populateTable(participants);
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
    participants.forEach(participant => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${participant.participantID}</td>
            <td>${participant.name}</td>
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

    const transaction = db.transaction(objectStoreName, "readonly");
    const store = transaction.objectStore(objectStoreName);

    const request = store.get(normalizedParticipantID);

    request.onsuccess = () => {
        const fetchedParticipant = request.result;

        if (fetchedParticipant) {
            editNameInput.value = fetchedParticipant.name || "";
            editMobileInput.value = fetchedParticipant.mobile || "";
            editAddressInput.value = fetchedParticipant.address || "";

            saveChangesBtn.dataset.participantId = fetchedParticipant.participantID;
            editParticipantPopup.style.display = "block";
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
    const participantID = saveChangesBtn.dataset.participantId;

    if (!participantID) {
        alert("Invalid participant ID.");
        return;
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

saveChangesBtn.addEventListener("click", saveParticipantChanges);

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

function closeEditPopup() {
    editParticipantPopup.style.display = "none";
}

cancelEditPopup.addEventListener("click", closeEditPopup);

scheduleButton.addEventListener("click", () => {
    window.location.href = "FSMS_MAIN.html";
});

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
