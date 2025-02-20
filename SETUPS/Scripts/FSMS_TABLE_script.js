let dbVersion;
// Declare variables for elements
const dateField = document.getElementById('dateField');
const tableBody = document.getElementById('tablebody');
const saveTableButton = document.getElementById('savetablebtn');
const savetablebtnbottom = document.getElementById('savetablebtnbottom')
const resetTableButton = document.getElementById('resettableBtn');
const exportScheduleDB = document.getElementById('exportSchedule')
const importScheduleDB = document.getElementById("importSchedule");
const importScheduleFileInput = document.getElementById("foodScheduleFileInput");

// Function to retrieve participants from FSMS_Participant_DB
async function getParticipants() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FSMS_Participants_DB', 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('participants', 'readonly');
            const store = transaction.objectStore('participants');
            const allParticipants = store.getAll();

            allParticipants.onsuccess = () => {
                // Map each participant to an object with both name and participantID
                const participants = allParticipants.result.map(participant => ({
                    name: participant.name,
                    participantID: participant.participantID
                }))
                .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
                resolve(participants);
            };
            allParticipants.onerror = () => {
                reject('Failed to retrieve participants.');
            };
        };
        request.onerror = () => {
            reject('Failed to open FSMS_Participants_DB.');
        };
    });
}

// Function to populate participant rows in the table
async function populateTableRows() {
    try {
        const participants = await getParticipants();
        tableBody.innerHTML = ''; // Clear existing rows

        participants.forEach((participant) => {
            let row = document.createElement('tr');
            row.innerHTML = `
                <td>${participant.name}</td>
                <td><input type="checkbox" class="meal-checkbox" /></td>
                <td><input type="number" class="quantity-input" min="1" value="0" /></td>
                <td><input type="checkbox" class="meal-checkbox" /></td>
                <td><input type="number" class="quantity-input" min="1" value="0" /></td>
                <td><input type="checkbox" class="meal-checkbox" /></td>
                <td><input type="number" class="quantity-input" min="1" value="0" /></td>
                <td><input type="number" class="extra-input" min="0" /></td>
                <td><input type="text" class="details-input" /></td>
            `;
            tableBody.appendChild(row);
        });

        addCheckboxListeners(); // Add listeners to checkboxes for auto-setting quantity
    } catch (error) {
        console.error('Error populating participant rows:', error);
    }
}

// Add listener to set quantity to 1 when checkbox is checked
function addCheckboxListeners() {
    document.querySelectorAll('.meal-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
            const quantityInput = event.target.closest('td').nextElementSibling.querySelector('.quantity-input');
            if (checkbox.checked) {
                quantityInput.value = 1; // Set default quantity to 1
            } else {
                quantityInput.value = 0;
            }
        });
    });
}

// Function to initialize the IndexedDB and create month-specific object stores
function initIndexedDB(date) {
    return new Promise((resolve, reject) => {
        const dbName = 'FSMS_Schedule_Details_DB';
        const monthStore = new Date(date).toLocaleString('default', { month: 'long' });
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Ensure the object store for the current month is created during upgrade
            if (!db.objectStoreNames.contains(monthStore)) {
                db.createObjectStore(monthStore, { keyPath: 'date' });
                console.log(`Object store for ${monthStore} created.`);
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;

            // Check dynamically if the month store exists; create it if it doesn't
            if (!db.objectStoreNames.contains(monthStore)) {
                const version = db.version + 1; // Increment database version
                db.close(); // Close the current connection to upgrade

                const upgradeRequest = indexedDB.open(dbName, version);
                upgradeRequest.onupgradeneeded = (upgradeEvent) => {
                    const upgradedDB = upgradeEvent.target.result;
                    upgradedDB.createObjectStore(monthStore, { keyPath: 'date' });
                    console.log(`Object store for ${monthStore} created dynamically.`);
                };

                upgradeRequest.onsuccess = (upgradeEvent) => {
                    console.log(`${dbName} re-initialized successfully after dynamic upgrade.`);
                    resolve(upgradeEvent.target.result);
                };

                upgradeRequest.onerror = (upgradeEvent) => {
                    console.error(`Error during dynamic upgrade of ${dbName}:`, upgradeEvent.target.errorCode);
                    reject(upgradeEvent.target.errorCode);
                };
            } else {
                console.log(`${dbName} initialized successfully.`);
                resolve(db);
            }
        };

        request.onerror = (event) => {
            console.error(`Error initializing ${dbName}:`, event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Function to save table data to the appropriate month store in FSMS_Schedule_Details_DB
async function saveTableDataToIndexedDB() {
    const date = dateField.value;
    if (!date) {
        alert('Please select a date.');
        return;
    }

    const participants = await getParticipants();
    const monthStore = new Date(date).toLocaleString('default', { month: 'long' });

    try {
        const db = await initIndexedDB(date);
        const transaction = db.transaction(monthStore, 'readwrite');
        const store = transaction.objectStore(monthStore);

        // Retrieve existing data for the selected date
        const existingData = await new Promise((resolve, reject) => {
            const request = store.get(date);
            request.onsuccess = () => resolve(request.result ? request.result.rowsData : []);
            request.onerror = (e) => reject(e);
        });

        // Convert existing data into a Map for easy updates
        let existingDataMap = new Map(existingData.map(entry => [entry.participantID, entry]));

        // Loop through all participants and ensure they are saved
        participants.forEach(participant => {
            let row = Array.from(tableBody.rows).find(r => r.getAttribute('data-participant-id') === participant.participantID);

            let newEntry = {
                participantID: participant.participantID,
                participant: participant.name,
                breakfast: row ? row.cells[1].querySelector('input').checked : false,
                breakfastQuantity: row ? parseInt(row.cells[2].querySelector('input').value) || 0 : 0,
                lunch: row ? row.cells[3].querySelector('input').checked : false,
                lunchQuantity: row ? parseInt(row.cells[4].querySelector('input').value) || 0 : 0,
                dinner: row ? row.cells[5].querySelector('input').checked : false,
                dinnerQuantity: row ? parseInt(row.cells[6].querySelector('input').value) || 0 : 0,
                extras: row ? parseFloat(row.cells[7].querySelector('input').value) || 0 : 0,
                details: row ? row.cells[8].querySelector('input').value || '' : ''
            };

            // If participant already exists, update only changed fields
            if (existingDataMap.has(participant.participantID)) {
                let existingEntry = existingDataMap.get(participant.participantID);
                Object.assign(existingEntry, newEntry); // Merge new changes
            } else {
                // Add new participant entry if they are not in existing data
                existingDataMap.set(participant.participantID, newEntry);
            }
        });

        // Convert back to array and save to IndexedDB
        const updatedRowsData = Array.from(existingDataMap.values());
        store.put({ date, rowsData: updatedRowsData });

        transaction.oncomplete = () => {
            console.log(`Updated entries saved successfully for ${date}:`, updatedRowsData);
            alert('Table data saved successfully.');
        };

        transaction.onerror = (e) => {
            console.error('Transaction error:', e);
            alert('Error saving table data. Please try again.');
        };
    } catch (error) {
        console.error('Error saving table data:', error);
        alert('An unexpected error occurred while saving.');
    }
}

// Function to load table data for a specific date
async function loadTableData() {
    const date = dateField.value;
    if (!date) {
        console.warn('No date selected.');
        return;
    }

    const monthStore = new Date(date).toLocaleString('default', { month: 'long' });

    try {
        const db = await initIndexedDB(date);
        const participants = await getParticipants();

        const transaction = db.transaction(monthStore, 'readonly');
        const store = transaction.objectStore(monthStore);
        const dataRequest = store.get(date);

        dataRequest.onsuccess = (event) => {
            const savedData = event.target.result ? event.target.result.rowsData : [];
            const savedParticipantIDs = savedData.map(row => row.participantID);

            const missingParticipants = participants.filter(
                participant => !savedParticipantIDs.includes(participant.participantID)
            );

            const defaultRows = missingParticipants.map(participant => ({
                participantID: participant.participantID,
                participant: participant.name,
                breakfast: false,
                breakfastQuantity: 0,
                lunch: false,
                lunchQuantity: 0,
                dinner: false,
                dinnerQuantity: 0,
                extras: 0,
                details: '',
            }));

            const combinedData = [...savedData, ...defaultRows].sort((a, b) =>
                a.participant.localeCompare(b.participant)
            );
            populateTableWithData(combinedData);
        };

        dataRequest.onerror = () => {
            console.error('Error retrieving data for the selected date.');
            populateTableRows(); // Load default rows if no saved data
        };
    } catch (error) {
        console.error('Error loading table data:', error);
    }
}

// Populate table with existing data for a specific date
function populateTableWithData(rowsData) {
    tableBody.innerHTML = ''; // Clear existing rows

    if (!rowsData || rowsData.length === 0) {
        console.warn('No data found for the selected date. Loading default rows.');
        populateTableRows(); // Load default rows if no data
        return;
    }

    rowsData.forEach((rowData) => {
        let row = document.createElement('tr');
        row.setAttribute('data-participant-id', rowData.participantID); // Attach participantID to the row
        row.innerHTML = `
            <td>${rowData.participant}</td>
            <td><input type="checkbox" class="meal-checkbox" ${rowData.breakfast ? 'checked' : ''} /></td>
            <td><input type="number" class="quantity-input" min="1" value="${rowData.breakfastQuantity}" /></td>
            <td><input type="checkbox" class="meal-checkbox" ${rowData.lunch ? 'checked' : ''} /></td>
            <td><input type="number" class="quantity-input" min="1" value="${rowData.lunchQuantity}" /></td>
            <td><input type="checkbox" class="meal-checkbox" ${rowData.dinner ? 'checked' : ''} /></td>
            <td><input type="number" class="quantity-input" min="1" value="${rowData.dinnerQuantity}" /></td>
            <td><input type="number" class="extra-input" min="0" value="${rowData.extras}" /></td>
            <td><input type="text" class="details-input" value="${rowData.details}" /></td>
        `;
        tableBody.appendChild(row);
    });

    addCheckboxListeners(); // Re-add listeners to checkboxes for auto-setting quantity
}

// Export and reset function
async function openScheduleDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FSMS_Schedule_Details_DB', dbVersion);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (db) {
                console.log('Database opened successfully:', db);
                resolve(db);
            } else {
                console.error('Database opened but returned undefined.');
                reject('Failed to open database: DB object is undefined.');
            }
        };
        
        request.onerror = (event) => {
            console.error('Error opening database:', event.target.error);
            reject('Failed to open FSMS_Schedule_Details_DB.');
        };
    });
}

//Export the schedule details DB data to csv file 
async function exportScheduleToCSV(monthStoreName) {
    return new Promise((resolve, reject) => {
        const dbName = "FSMS_Schedule_Details_DB";
        const fileName = `Food_schedule_${monthStoreName}.csv`;

        const request = indexedDB.open(dbName, dbVersion);

        request.onsuccess = function(event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(monthStoreName)) {
                console.error(`Object store for ${monthStoreName} does not exist.`);
                reject(`Object store for ${monthStoreName} does not exist.`);
                return;
            }

            const transaction = db.transaction(monthStoreName, "readonly");
            const store = transaction.objectStore(monthStoreName);

            let csvContent = 'data:text/csv;charset=utf-8,';
            csvContent += 'Date,participantID,Participant,Breakfast,Breakfast Qty,Lunch,Lunch Qty,Dinner,Dinner Qty,Extras,Details\n';

            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const entry = cursor.value;
                    const date = entry.date || '';

                    entry.rowsData.forEach((data) => {
                        const participantID = data.participantID || '';  // Include the participantID
                        const participant = data.participant || '';
                        const breakfast = data.breakfast ? 'Yes' : 'No';
                        const breakfastQuantity = data.breakfastQuantity || 0;
                        const lunch = data.lunch ? 'Yes' : 'No';
                        const lunchQuantity = data.lunchQuantity || 0;
                        const dinner = data.dinner ? 'Yes' : 'No';
                        const dinnerQuantity = data.dinnerQuantity || 0;
                        const extras = data.extras || 0;
                        const details = data.details || '';

                        csvContent += `${date},${participantID},${participant},${breakfast},${breakfastQuantity},${lunch},${lunchQuantity},${dinner},${dinnerQuantity},${extras},${details}\n`;
                    });

                    cursor.continue();
                } else {
                    // All data has been read, download CSV file
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", fileName);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    resolve("CSV exported successfully.");
                }
            };

            store.openCursor().onerror = function(event) {
                reject("Error exporting schedule to CSV: " + event.target.errorCode);
            };
        };

        request.onerror = function(event) {
            reject("Error opening database: " + event.target.errorCode);
        };
    });
}

// Function to reset data: export and then delete
async function resetTableData() {
    const date = new Date(dateField.value || new Date());
    const currentMonthStoreName = date.toLocaleString('default', { month: 'long' });

    // Get the previous month
    let previousMonthDate = new Date(date);
    previousMonthDate.setMonth(date.getMonth() - 1);
    const previousMonthStoreName = previousMonthDate.toLocaleString('default', { month: 'long' });

    // Open the database to get the current version
    const dbRequest = indexedDB.open("FSMS_Schedule_Details_DB");

    dbRequest.onsuccess = async function(event) {
        const currentDB = event.target.result;
        const currentVersion = currentDB.version;
        currentDB.close();

        // Export data of the previous month to CSV before deleting the object store
        try {
            await exportScheduleToCSV(previousMonthStoreName);
            console.log(`Data for ${previousMonthStoreName} exported to CSV.`);
        } catch (error) {
            console.error('Failed to export data:', error);
            alert('Failed to export data. Reset aborted.');
            return;
        }

        // Reopen the database with an incremented version to delete the object store
        const upgradeRequest = indexedDB.open("FSMS_Schedule_Details_DB", currentVersion + 1);

        upgradeRequest.onupgradeneeded = function(event) {
            const db = event.target.result;

            // Delete the previous month's object store
            if (db.objectStoreNames.contains(previousMonthStoreName)) {
                db.deleteObjectStore(previousMonthStoreName);
                console.log(`Deleted ${previousMonthStoreName} object store from IndexedDB.`);
            } else {
                console.log(`Object store ${previousMonthStoreName} does not exist. Nothing to reset.`);
            }
        };

        upgradeRequest.onsuccess = function() {
            console.log(`Database version upgraded. ${previousMonthStoreName} object store deleted.`);
            alert(`Previous month's (${previousMonthStoreName}) data exported and reset.`);
            // Clear the table rows from the page if needed
            tableBody.innerHTML = '';
        };

        upgradeRequest.onerror = function(event) {
            console.error("Failed to upgrade database and delete object store:", event.target.error);
            alert("Failed to reset database. Please try again.");
        };
    };

    dbRequest.onerror = function(event) {
        console.error("Error opening database for version check:", event.target.errorCode);
        alert("Failed to open database for reset.");
    };
}


// Function to check if an object store exists in the database
function checkObjectStoreExists(db, storeName) {
    return db.objectStoreNames.contains(storeName);
}

// Handle file selection and import schedule data to IndexedDB
importScheduleFileInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            if (typeof csvData === 'string') {
                importCSVToScheduleDB(csvData);
            } else {
                console.error("File read error: Data is not in string format.");
            }
        };
        reader.readAsText(file);
    }
});

//Import schedule details into DB function
async function importCSVToScheduleDB(csvData) {
    const selectedDate = dateField.value; // Get the selected date from the date input
    if (!selectedDate) {
        alert("Please select a date before importing the schedule.");
        return;
    }

    const selectedMonth = new Date(selectedDate).toLocaleString('default', { month: 'long' }); // Get the month name
    const dbName = "FSMS_Schedule_Details_DB";

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(selectedMonth)) {
                db.createObjectStore(selectedMonth, { keyPath: 'date' });
                console.log(`Object store for ${selectedMonth} created.`);
            }
        };

        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(selectedMonth, "readwrite");
            const store = transaction.objectStore(selectedMonth);

            // Split CSV data into rows and extract headers
            const rows = csvData.split('\n').filter(row => row.trim() !== '');
            const headers = rows[0].split(',').map(header => header.trim().toLowerCase());

            const headerMap = {
                date: "date",
                participantid: "participantID",
                participant: "participant",
                breakfast: "breakfast",
                "breakfast qty": "breakfastQuantity",
                lunch: "lunch",
                "lunch qty": "lunchQuantity",
                dinner: "dinner",
                "dinner qty": "dinnerQuantity",
                extras: "extras",
                details: "details"
            };

            const scheduleByDate = {};

            rows.slice(1).forEach(row => {
                const values = row.split(',').map(value => value.trim());
                const entry = {};
                for (const [csvHeader, dbKey] of Object.entries(headerMap)) {
                    const index = headers.indexOf(csvHeader.toLowerCase());
                    entry[dbKey] = index !== -1 ? values[index] || '' : '';
                }

                entry.breakfast = entry.breakfast.toLowerCase() === 'yes';
                entry.lunch = entry.lunch.toLowerCase() === 'yes';
                entry.dinner = entry.dinner.toLowerCase() === 'yes';

                const date = entry.date;
                if (date) {
                    if (!scheduleByDate[date]) {
                        scheduleByDate[date] = [];
                    }
                    scheduleByDate[date].push(entry);
                }
            });

            for (const [date, rowsData] of Object.entries(scheduleByDate)) {
                store.put({ date, rowsData });
            }

            transaction.oncomplete = () => {
                location.reload();
                alert("Schedule imported successfully!");
                console.log(`CSV data imported successfully into ${selectedMonth}.`);
                resolve();
            };

            transaction.onerror = (event) => {
                alert("Error while importing Schedule Detials");
                console.error(`Error importing schedule CSV to ${selectedMonth}:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        };

        request.onerror = function (event) {
            console.error("Error opening database:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function filterTableRows(query) {
    const rows = Array.from(tableBody.querySelectorAll("tr")); // Convert NodeList to Array for sorting

    if (!query.trim()) {
        // Reset: Show all rows in their original order when the query is empty
        rows.forEach((row) => (row.style.display = ""));
        return;
    }

    // Filter rows that match the query
    const filteredRows = rows.filter((row) => {
        const participantNameCell = row.cells[0]; // Assuming the first column contains participant names
        if (participantNameCell) {
            const participantName = participantNameCell.textContent.toLowerCase();
            return participantName.includes(query.toLowerCase());
        }
        return false;
    });

    // Sort filtered rows: Alphabetical order first, then matches elsewhere in the name
    filteredRows.sort((a, b) => {
        const nameA = a.cells[0].textContent.toLowerCase();
        const nameB = b.cells[0].textContent.toLowerCase();
        const queryLower = query.toLowerCase();

        const startsWithA = nameA.startsWith(queryLower);
        const startsWithB = nameB.startsWith(queryLower);

        // Prioritize alphabetical order
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        // If equal alphabetically, prioritize exact matches
        if (startsWithA && !startsWithB) return -1;
        if (!startsWithA && startsWithB) return 1;

        return 0; // Maintain relative order if both are equal
    });

    // Hide all rows, then show filtered rows in the correct order
    rows.forEach((row) => (row.style.display = "none")); // Hide all rows
    filteredRows.forEach((row) => (row.style.display = "")); // Show filtered rows
}

// Add event listener to trigger the file input dialog when "Import Schedule" is clicked
importScheduleDB.addEventListener("click", () => {
    importScheduleFileInput.click(); // Opens the file dialog
});

// export schedule of current month from submenu of export
exportScheduleDB.addEventListener('click', async () => {
    const date = new Date(dateField.value || new Date());
    const currentMonthStoreName = date.toLocaleString('default', { month: 'long' });

    try {
        await exportScheduleToCSV(currentMonthStoreName);
        alert(`Current month's (${currentMonthStoreName}) data exported successfully.`);
    } catch (error) {
        console.error('Error exporting current month schedule:', error);
        alert('Failed to export current month schedule.');
    }
});

// Event Listeners
dateField.addEventListener('change', () => {
    initIndexedDB(dateField.value).then(loadTableData); // Initialize DB and load data for the selected date
});

saveTableButton.addEventListener('click', saveTableDataToIndexedDB);
savetablebtnbottom.addEventListener('click',saveTableDataToIndexedDB)
resetTableButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the table? This action cannot be undone.")) {
        resetTableData();
    }
});
