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
const logoutbutton =  document.getElementById("logoutButton")
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
//Export page button
const ExportPage = document.getElementById("Exportpage");
//password modal
const passwordModal = document.getElementById('passwordModal');
const settingsPasswordInput = document.getElementById('settingsPassword');
const submitPasswordBtn = document.getElementById('submitPasswordBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
// Predefined password
const SETTINGS_PASSWORD = "Helix@0x3";

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

        // Update the dropdown and display total participants
        updateDropdown(participants);
        totalParticipants.textContent = `Total Participants: ${participants.length}`;
    };

    request.onerror = function(event) {
        console.error("Error loading participants", event.target.errorCode);
    };
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
            // Once iteration is complete, generate the new participantID
            const newParticipantID = lastParticipantID + 1;
            callback(newParticipantID);
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
        // Generate a new participantID and add participant once generated
        generateParticipantID(function(newParticipantID) {
            if (newParticipantID !== null) {
                const transaction = db.transaction("participants", "readwrite");
                const store = transaction.objectStore("participants");

                // Add participant with new participantID
                store.add({
                    participantID: newParticipantID,  // Store auto-incremented participantID
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
            csvContent += 'ID,ParticipantID,Name,Mobile,Address\n';

            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const participant = cursor.value;
                    const id = participant.id || '';
                    const participantID = participant.participantID || ''; // Include participantID
                    const name = participant.name || '';
                    const mobile = participant.mobile || '';
                    const address = participant.address || '';

                    csvContent += `${id},${participantID},${name},${mobile},${address}\n`;

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
        mobile: "mobile" ,  
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

// Show the password modal when the settings icon is clicked
settingsIcon.addEventListener('click', () => {
    passwordModal.style.display = 'block';
    settingsPasswordInput.value = ''; // Clear the input field
    settingsPasswordInput.focus(); // Focus on the input field
});

// Handle password submission when the submit button is clicked
submitPasswordBtn.addEventListener('click', validatePassword);

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

// Initialize IndexedDB and object stores on page load
window.onload = function () {
    initDB();
};


