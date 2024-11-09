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
const participantDropdown = document.getElementById('participantDropdown');
const totalParticipants = document.getElementById('totalParticipants');
// Get the refresh button element
const refreshPageButton = document.getElementById('refreshPageBtn');
// JavaScript to toggle the settings popup
const settingsIcon = document.getElementById('settingsIcon');
const settingsPopup = document.getElementById('settingsPopup');
const exportOption = document.getElementById('exportOption');
const importOption = document.getElementById('importOption');
const importOPtionsPopup = document.getElementById('importOptionsPopup');
const exportOptionsPopup = document.getElementById('exportOptionsPopup');
const exportParticipantDB = document.getElementById('exportParticipants');
// Select the import option and file input elements
const importParticipantsDB = document.getElementById("importParticipants");
const importFileInput = document.getElementById("importFileInput");

let db;
let participants = []; // Ensure participants array is defined here

// Initialize IndexedDB
function initDB() {
    const request = indexedDB.open("FSMS_Participants_DB", 1); // Open the database with version 1

    // Handle database upgrade or creation
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        console.log("onupgradeneeded triggered");

        // Check if the object store exists, if not create it
        if (!db.objectStoreNames.contains("participants")) {
            const store = db.createObjectStore("participants", { keyPath: "id", autoIncrement: true });
            store.createIndex("name_mobile", ["name", "mobile"], { unique: true });
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

        // Update the dropdown and display total participants
        updateDropdown(participants);
        totalParticipants.textContent = `Total Participants: ${participants.length}`;
    };

    request.onerror = function(event) {
        console.error("Error loading participants", event.target.errorCode);
    };
}

// Add participant
function addParticipant() {
    const name = document.getElementById('addName').value;
    const mobile = document.getElementById('addMobile').value;
    const address = document.getElementById('addAddress').value;
    if (name && mobile && address) {
        const transaction = db.transaction("participants", "readwrite");
        transaction.objectStore("participants").add({ name, mobile, address });
        transaction.oncomplete = () => {
            alert("Participant added successfully!"); // Success message
            loadParticipants();
            clearAddParticipantFields();
        };
    }
    else {
        alert("All fields are required.");
    }
}

// Clear input fields after adding a participant
function clearAddParticipantFields() {
    document.getElementById('addName').value = '';
    document.getElementById('addMobile').value = '';
    document.getElementById('addAddress').value = '';
}

// Update dropdown with participants
function updateDropdown(participantsList) {
    participantDropdown.innerHTML = '<option value="">Select Participant</option>';
    participantsList.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        participantDropdown.appendChild(option);
    });
    editParticipantBtn.disabled = true; // Disable edit button initially
}

// Filter dropdown based on search input with exact start of name match
searchBar.addEventListener('input', () => {
    const searchText = searchBar.value.toLowerCase();
    const filteredParticipants = participants.filter(p => 
        p.name.toLowerCase().startsWith(searchText) // Match from the beginning of the name
    );
    updateDropdown(filteredParticipants);
});

// Enable edit button when a participant is selected
participantDropdown.addEventListener('change', () => {
    editParticipantBtn.disabled = participantDropdown.value === "";
});

// Edit participant
function editParticipant() {
    const selectedId = participantDropdown.value;
    if (selectedId) {
        const transaction = db.transaction("participants", "readonly");
        const store = transaction.objectStore("participants");
        store.get(Number(selectedId)).onsuccess = function(event) {
            const participant = event.target.result;
            document.getElementById('editName').value = participant.name;
            document.getElementById('editMobile').value = participant.mobile;
            document.getElementById('editAddress').value = participant.address;
            editParticipantPopup.dataset.id = participant.id;
            editParticipantPopup.style.display = 'block';
        };
    }
}

// Save changes to participant
function saveChanges() {
    const id = Number(editParticipantPopup.dataset.id);
    const name = document.getElementById('editName').value;
    const mobile = document.getElementById('editMobile').value;
    const address = document.getElementById('editAddress').value;

    // Ask for confirmation before saving changes
    if (confirm("Are you sure you want to save changes?")) {
        const transaction = db.transaction("participants", "readwrite");
        const store = transaction.objectStore("participants");
        store.put({ id, name, mobile, address }).onsuccess = () => {
            loadParticipants();
            alert("Participant details updated successfully!"); // Success message
        };
    }
}

// Delete participant
function deleteParticipant() {
    const id = Number(editParticipantPopup.dataset.id);
    const name = document.getElementById('editName').value;

    // Ask for confirmation before deleting
    if (confirm(`Are you sure you want to delete participant "${name}"?`)) {
        const transaction = db.transaction("participants", "readwrite");
        transaction.objectStore("participants").delete(id).onsuccess = () => {
            loadParticipants();
            alert(`Participant "${name}" deleted successfully!`); // Success message
        };
    }
}

async function exportParticipantsToCSV() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FSMS_Participants_DB", 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction("participants", "readonly");
            const store = transaction.objectStore("participants");

            let csvContent = 'data:text/csv;charset=utf-8,';
            csvContent += 'ID,Name,Mobile,Address\n';

            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const participant = cursor.value;
                    const id = participant.id || '';
                    const name = participant.name || '';
                    const mobile = participant.mobile || '';
                    const address = participant.address || '';

                    csvContent += `${id},${name},${mobile},${address}\n`;

                    cursor.continue();
                } else {
                    // Download the CSV once all participants are processed
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "participants_data.csv");
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
// Function to parse CSV data and import it into IndexedDB
async function importCSVToIndexedDB(csvData) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FSMS_Participants_DB", 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction("participants", "readwrite");
            const store = transaction.objectStore("participants");

            // Split CSV data into rows
            const rows = csvData.split('\n').filter(row => row.trim() !== '');

            // Extract headers from the first row and normalize them
            let headers = rows[0].split(',').map(header => header.trim().toLowerCase());

            // Create a mapping based on expected field names
            const headerMap = {
                id: "id",
                name: "name",
                mobile: "mobile",
                address: "address"
            };

            // Process each row (excluding headers)
            rows.slice(1).forEach(row => {
                const values = row.split(',').map(value => value.trim());

                // Create a participant object with fields mapped correctly
                const participant = {
                    name: values[headers.indexOf(headerMap.name)] || '',
                    mobile: values[headers.indexOf(headerMap.mobile)] || '',
                    address: values[headers.indexOf(headerMap.address)] || ''
                };

                // Check for existing entry with the same name and mobile number
                const index = store.index("name_mobile"); // Assuming you have a compound index on name and mobile
                const searchKey = [participant.name, participant.mobile];
                const getRequest = index.getKey(searchKey);

                getRequest.onsuccess = function() {
                    const existingId = getRequest.result;

                    // If existing record is found, delete it
                    if (existingId !== undefined) {
                        store.delete(existingId);
                    }

                    // Add the new participant record
                    store.add(participant);
                };

                getRequest.onerror = function(event) {
                    console.error("Error checking for existing entry:", event.target.errorCode);
                };
            });

            transaction.oncomplete = () => {
                console.log("CSV data imported successfully to IndexedDB.");
                resolve();
            };
            
            transaction.onerror = (event) => {
                console.error("Error importing CSV to IndexedDB:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        };

        request.onerror = function(event) {
            console.error("Error opening database for import:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}



settingsIcon.addEventListener('click', () => {
    // Toggle popup visibility
    settingsPopup.style.display = settingsPopup.style.display === 'block' ? 'none' : 'block';
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
    editParticipantPopup.style.display = 'none';
};
cancelEditPopup.onclick = () => editParticipantPopup.style.display = 'none';
deleteParticipantBtn.onclick = () => {
    deleteParticipant();
    editParticipantPopup.style.display = 'none';
};

// Add an event listener to the refresh button to reload the page
refreshPageButton.addEventListener('click', () => {
    location.reload(); // Refreshes the page
});

// Initialize IndexedDB and object stores on page load
window.onload = function () {
    initDB();
};


