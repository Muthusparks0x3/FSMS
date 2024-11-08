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
            db.createObjectStore("participants", { keyPath: "id", autoIncrement: true });
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

// JavaScript to toggle the settings popup
const settingsIcon = document.getElementById('settingsIcon');
const settingsPopup = document.getElementById('settingsPopup');

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


