let dbVersion;
// Declare variables for elements
const dateField = document.getElementById('dateField');
const tableBody = document.getElementById('tablebody');
const saveTableButton = document.getElementById('savetablebtn');
const savetablebtnbottom = document.getElementById('savetablebtnbottom')
const resetTableButton = document.getElementById('resettableBtn');
const exportScheduleDB = document.getElementById('exportSchedule')

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
                resolve(allParticipants.result);
            };
            allParticipants.onerror = () => {
                reject('Failed to retrieve participants.');
            };
        };
        request.onerror = () => {
            reject('Failed to open FSMS_Participant_DB.');
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
            if (!db.objectStoreNames.contains(monthStore)) {
                db.createObjectStore(monthStore, { keyPath: 'date' });
                console.log(`Object store for ${monthStore} created.`);
            }
        };

        request.onsuccess = (event) => {
            console.log(`${dbName} initialized successfully.`);
            resolve(event.target.result);
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

    const rowsData = Array.from(tableBody.rows).map(row => ({
        participant: row.cells[0].innerText,
        breakfast: row.cells[1].querySelector('input').checked,
        breakfastQuantity: row.cells[2].querySelector('input').value,
        lunch: row.cells[3].querySelector('input').checked,
        lunchQuantity: row.cells[4].querySelector('input').value,
        dinner: row.cells[5].querySelector('input').checked,
        dinnerQuantity: row.cells[6].querySelector('input').value,
        extras: row.cells[7].querySelector('input').value,
        details: row.cells[8].querySelector('input').value,
    }));

    const monthStore = new Date(date).toLocaleString('default', { month: 'long' });
    
    try {
        const db = await initIndexedDB(date);

        const transaction = db.transaction(monthStore, 'readwrite');
        const store = transaction.objectStore(monthStore);
        store.put({ date, rowsData });

        transaction.oncomplete = () => {
            alert('Table data saved.');
        };
        
        transaction.onerror = () => {
            console.error('Error saving data to IndexedDB.');
        };
    } catch (error) {
        console.error('Failed to save table data:', error);
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
        const db = await initIndexedDB(date); // Ensure object store exists

        const transaction = db.transaction(monthStore, 'readonly');
        const store = transaction.objectStore(monthStore);
        const dataRequest = store.get(date);

        dataRequest.onsuccess = (event) => {
            const data = event.target.result;
            if (data) {
                populateTableWithData(data.rowsData);
            } else {
                console.warn('No saved data for the selected date.');
                populateTableRows(); // Load default rows if no data
            }
        };
    } catch (error) {
        console.error('Error loading table data:', error);
    }
}


// Populate table with existing data for a specific date
function populateTableWithData(rowsData) {
    tableBody.innerHTML = ''; // Clear existing rows

    if (!rowsData) {
        console.warn('No data found for the selected date. Loading default rows.');
        populateTableRows(); // Load default rows if no data
        return;
    }

    rowsData.forEach((rowData) => {
        let row = document.createElement('tr');
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
// Function to open the schedule database
// Function to open the schedule database
async function openScheduleDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FSMS_Schedule_Details_DB', 1);
        
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
async function exportScheduleToCSV() {
    return new Promise((resolve, reject) => {
        const dbName = "FSMS_Schedule_Details_DB";
        const date = new Date();
        const monthStoreName = date.toLocaleString('default', { month: 'long' });
        const fileName = `Food_schedule_${monthStoreName}.csv`;

        const request = indexedDB.open(dbName, 1);

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
            csvContent += 'Date,Participant,Breakfast,Breakfast Qty,Lunch,Lunch Qty,Dinner,Dinner Qty,Extras,Details\n';

            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const entry = cursor.value;
                    const date = entry.date || '';

                    entry.rowsData.forEach((data) => {
                        const participant = data.participant || '';
                        const breakfast = data.breakfast ? 'Yes' : 'No';
                        const breakfastQuantity = data.breakfastQuantity || 0;
                        const lunch = data.lunch ? 'Yes' : 'No';
                        const lunchQuantity = data.lunchQuantity || 0;
                        const dinner = data.dinner ? 'Yes' : 'No';
                        const dinnerQuantity = data.dinnerQuantity || 0;
                        const extras = data.extras || 0;
                        const details = data.details || '';

                        csvContent += `${date},${participant},${breakfast},${breakfastQuantity},${lunch},${lunchQuantity},${dinner},${dinnerQuantity},${extras},${details}\n`;
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
    const date = dateField.value;
    const monthStoreName = new Date(date).toLocaleString('default', { month: 'long' });
    const db = await openScheduleDB().catch((error) => {
        console.error('Error in opening database for reset:', error);
        alert('Error in opening database for reset.');
    });

    if (!db) return; // Stop if db is undefined

    if (!checkObjectStoreExists(db, monthStoreName)) {
        console.error(`Object store ${monthStoreName} does not exist.`);
        alert(`Object store ${monthStoreName} does not exist. Reset aborted.`);
        return;
    }

    try {
        // Export data to CSV
        await exportScheduleToCSV(monthStoreName, db);

        // Delete the object store data after export
        const deleteTransaction = db.transaction(monthStoreName, 'readwrite');
        const deleteStore = deleteTransaction.objectStore(monthStoreName);

        deleteStore.clear().onsuccess = () => {
            console.log(`Cleared ${monthStoreName} store from IndexedDB.`);
            alert('Table data exported and reset.');

            // Clear the table rows from the page
            tableBody.innerHTML = '';
        };

        deleteTransaction.onerror = () => {
            console.error(`Failed to clear ${monthStoreName} store from IndexedDB.`);
        };

    } catch (error) {
        console.error(error);
        alert('Failed to export data. Reset aborted.');
    }
}

// Event Listeners
dateField.addEventListener('change', () => {
    initIndexedDB(dateField.value).then(loadTableData); // Initialize DB and load data for the selected date
});

saveTableButton.addEventListener('click', saveTableDataToIndexedDB);
savetablebtnbottom.addEventListener('click',saveTableDataToIndexedDB)
resetTableButton.addEventListener('click', resetTableData);
exportScheduleDB.addEventListener('click',exportScheduleToCSV);

