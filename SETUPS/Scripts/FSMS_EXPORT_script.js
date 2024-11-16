let dbVersion
// Variables for UI elements
const searchBar = document.getElementById("search-bar");
const participantDropdown = document.getElementById("participant-dropdown");
const monthDropdown = document.getElementById("month-dropdown");
const participantDetailsContainer = document.getElementById("participant-details");
const tableBody = document.getElementById("table-body");
const generateButton = document.getElementById("generate");
const settingsIcon = document.getElementById("settingsIcon");
const settingsPopup = document.getElementById("settingsPopup");
const changeAmountOption = document.getElementById("changeAmountOption");
const changeAmountPopup = document.getElementById("changeAmountPopup");
const breakfastAmountInput = document.getElementById("breakfastAmount");
const lunchAmountInput = document.getElementById("lunchAmount");
const dinnerAmountInput = document.getElementById("dinnerAmount");
const updateButton = document.getElementById("updateAmount");
const cancelButton = document.getElementById("cancelAmount");
const schedulebutton = document.getElementById("scheduleButton")
const logoutbutton =  document.getElementById("logoutButton")
// Variables for summary table elements
const summaryTable = document.querySelector(".summary-table");
const breakfastQuantityElement = document.getElementById("breakfastQuantity");
const breakfastAmountElement = document.getElementById("breakfast-Amount");
const lunchQuantityElement = document.getElementById("lunchQuantity");
const lunchAmountElement = document.getElementById("lunch-Amount");
const dinnerQuantityElement = document.getElementById("dinnerQuantity");
const dinnerAmountElement = document.getElementById("dinner-Amount");
const extraAmountElement = document.getElementById("extraAmount");
const totalAmountElement = document.getElementById("totalAmount");
const excelbutton = document.getElementById("export-excel")
const pdfbutton = document.getElementById("export-pdf")
// Disable Export buttons initially
excelbutton.disabled = true;
pdfbutton.disabled = true;

// Set initial placeholder text for dropdowns and search bar
searchBar.placeholder = "Search Participant";
participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";
monthDropdown.innerHTML = "<option value='' disabled selected>Select Month</option>";

// IndexedDB initialization function
let db;
function initDB() {
    const request = indexedDB.open("FSMS_Participants_DB", 1);

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Database opened successfully");
        loadParticipants(); // Populate the participant dropdown on DB open
    };

    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };
}

// Load participants into the dropdown
async function loadParticipants() {
    const participants = await fetchParticipants();
    participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";
    participants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant.participantID;
        option.textContent = participant.name;
        participantDropdown.appendChild(option);
    });
}

// Populate month dropdown with month names
function populateMonthDropdown() {
    const months = [
        "January", "February", "March", "April", "May", 
        "June", "July", "August", "September", "October", 
        "November", "December"
    ];

    monthDropdown.innerHTML = "<option value='' disabled selected>Select Month</option>";
    months.forEach((month) => {
        const option = document.createElement("option");
        option.value = month; // Use month name as value
        option.textContent = month;
        monthDropdown.appendChild(option);
    });
}

// Call this function after initializing other elements
populateMonthDropdown();

// Fetch participants from IndexedDB
async function fetchParticipants() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database is not initialized.");
            return;
        }

        const transaction = db.transaction("participants", "readonly");
        const store = transaction.objectStore("participants");
        const request = store.getAll();

        request.onsuccess = function() {
            const participants = request.result.map(participant => ({
                participantID: participant.participantID,
                name: participant.name,
                mobile: participant.mobile,
                address: participant.address
            }));
            resolve(participants);
        };

        request.onerror = function() {
            reject("Failed to retrieve participants.");
        };
    });
}

// Display participant details when a participant is selected
function displayParticipantDetails(participantID) {
    if (!db) {
        console.error("Database is not initialized.");
        return;
    }

    const transaction = db.transaction("participants", "readonly");
    const store = transaction.objectStore("participants");
    const index = store.index("name_id"); // Access the index created for participantID

    // Fetch the participant based on the participantID using the index
    const request = index.getAll();

    request.onsuccess = function() {
        const participants = request.result;
        const participant = participants.find(p => p.participantID == participantID); // Match participantID

        if (participant) {
            participantDetailsContainer.innerHTML = `
                <p><strong>Participant ID:</strong> ${participant.participantID}</p>
                <p><strong>Name:</strong> ${participant.name}</p>
                <p><strong>Mobile No:</strong> ${participant.mobile || "N/A"}</p>
                <p><strong>Address:</strong> ${participant.address || "N/A"}</p>
            `;

            // Store the participant name and mobile in localStorage
            localStorage.setItem("participantName", participant.name);
            localStorage.setItem("participantMobile", participant.mobile || "N/A");
        } else {
            participantDetailsContainer.innerHTML = "<p>Participant not found.</p>";
        }
    };

    request.onerror = function() {
        console.error("Failed to fetch participant details.");
    };
}

// Search participants based on input
function searchParticipants() {
    const query = searchBar.value.toLowerCase();
    participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";

    fetchParticipants()
        .then(participants => {
            // Filter participants whose names start with the search query
            const matchingParticipants = participants.filter(participant =>
                participant.name.toLowerCase().startsWith(query)
            );

            // Display a message if no results are found
            if (matchingParticipants.length === 0) {
                participantDropdown.innerHTML += "<option disabled>No results found</option>";
            } else {
                // Add matching participants to the dropdown
                matchingParticipants.forEach(participant => {
                    const option = document.createElement('option');
                    option.value = participant.participantID;
                    option.textContent = participant.name;
                    participantDropdown.appendChild(option);
                });
            }
        })
        .catch(error => console.error(error));
}

// Event listeners for search and dropdown selection
searchBar.addEventListener("input", searchParticipants);
participantDropdown.addEventListener("change", function() {
    const participantID = participantDropdown.value;
    if (participantID) {
        displayParticipantDetails(participantID);
    }
});

// Fetch schedule data based on month and participant selection
async function fetchScheduleData(selectedMonth, participantID) {
    return new Promise((resolve, reject) => {
        const dbName = 'FSMS_Schedule_Details_DB';
        const dbRequest = indexedDB.open(dbName, dbVersion);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(selectedMonth, 'readonly');
            const store = transaction.objectStore(selectedMonth);

            const request = store.getAll();

            request.onsuccess = function () {
                const allScheduleData = request.result;

                // Filter data for the selected participant
                const participantScheduleData = allScheduleData.flatMap(entry =>
                    entry.rowsData.filter(row => row.participantID == participantID).map(row => ({
                        date: entry.date,
                        ...row
                    }))
                );

                // Store the filtered data in localStorage
                localStorage.setItem('participantSchedule', JSON.stringify(participantScheduleData));
                console.log("Generated Schedule: ", participantScheduleData);

                resolve(participantScheduleData);
            };

            request.onerror = function () {
                console.error("Failed to fetch schedule data.");
                reject("Failed to fetch schedule data.");
            };
        };

        dbRequest.onerror = function () {
            console.error("Failed to open FSMS_Schedule_Details_DB.");
            reject("Failed to open FSMS_Schedule_Details_DB.");
        };
    });
}

// Populate the schedule table with the fetched data
function populateScheduleTable(scheduleData) {
    tableBody.innerHTML = ""; // Clear existing table data
    scheduleData.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.breakfast ? "Yes" : "No"}</td>
            <td>${entry.breakfastQuantity || "-"}</td>
            <td>${entry.lunch ? "Yes" : "No"}</td>
            <td>${entry.lunchQuantity || "-"}</td>
            <td>${entry.dinner ? "Yes" : "No"}</td>
            <td>${entry.dinnerQuantity || "-"}</td>
            <td>${entry.extras || "-"}</td>
            <td>${entry.details || "-"}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function generateSchedule(selectedMonth, participantID) {
    try {
        const participantScheduleData = await fetchScheduleData(selectedMonth, participantID);

        // Populate the table with the fetched schedule data
        populateScheduleTable(participantScheduleData);

        // Update the summary table
        updateSummaryTable();

        // Check if tables are populated
        checkTablePopulation();

        // Log the generated schedule for verification
        console.log("Generated Schedule:", participantScheduleData);
    } catch (error) {
        console.error("Error generating schedule:", error);
    }
}

// Function to load amounts from localStorage
function loadAmounts() {
    breakfastAmountInput.value = localStorage.getItem("breakfastAmount") || 40; // Default to 40 if not set
    lunchAmountInput.value = localStorage.getItem("lunchAmount") || 70;
    dinnerAmountInput.value = localStorage.getItem("dinnerAmount") || 40;
    console.log("Breakfast amount:",breakfastAmountInput.value)
    console.log("Lunch amount:",lunchAmountInput.value)
    console.log("Dinner amount:",dinnerAmountInput.value)
}

// Call loadAmounts on page load to set the values in the input fields
loadAmounts();

// Function to update the summary table with calculated data
function updateSummaryTable() {
    // Retrieve schedule data from localStorage
    const scheduleData = JSON.parse(localStorage.getItem('participantSchedule')) || [];

    // Initialize counters for quantities and extra amount
    let totalBreakfastQty = 0;
    let totalLunchQty = 0;
    let totalDinnerQty = 0;
    let totalExtras = 0;

    // Accumulate quantities and extra amounts
    scheduleData.forEach(entry => {
        totalBreakfastQty += parseInt(entry.breakfastQuantity) || 0;
        totalLunchQty += parseInt(entry.lunchQuantity) || 0;
        totalDinnerQty += parseInt(entry.dinnerQuantity) || 0;
        totalExtras += parseFloat(entry.extras) || 0; // Safely convert extras to a number
    });

    // Get amounts from localStorage or default values
    const breakfastAmount = parseFloat(localStorage.getItem("breakfastAmount")) || 40;
    const lunchAmount = parseFloat(localStorage.getItem("lunchAmount")) || 70;
    const dinnerAmount = parseFloat(localStorage.getItem("dinnerAmount")) || 40;

    // Calculate total cost for each meal type
    const breakfastTotal = totalBreakfastQty * breakfastAmount;
    const lunchTotal = totalLunchQty * lunchAmount;
    const dinnerTotal = totalDinnerQty * dinnerAmount;

    // Calculate the grand total
    const grandTotal = breakfastTotal + lunchTotal + dinnerTotal + totalExtras;

    // Display data in the summary table
    breakfastQuantityElement.textContent = totalBreakfastQty;
    breakfastAmountElement.textContent = breakfastTotal.toFixed(2);

    lunchQuantityElement.textContent = totalLunchQty;
    lunchAmountElement.textContent = lunchTotal.toFixed(2);

    dinnerQuantityElement.textContent = totalDinnerQty;
    dinnerAmountElement.textContent = dinnerTotal.toFixed(2);

    extraAmountElement.textContent = totalExtras.toFixed(2);

    totalAmountElement.textContent = grandTotal.toFixed(2);

    // Make the summary table visible
    summaryTable.style.display = "block";
}

// Function to export schedule and summary tables to Excel
function exportToExcel() {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Retrieve participant details from localStorage
    const participantDetails = {
        Name: localStorage.getItem("participantName") || "N/A",
        Mobile: localStorage.getItem("participantMobile") || "N/A"
    };

    // Get the current month and participant name
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const fileName = `${participantDetails.Name}_${currentMonth}_Food_Schedule_Bill.xlsx`;

    // Add title
    const title = `A to Z Food ${currentMonth} Bill`;
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
    ws["!merges"] = [{ s: { c: 0, r: 0 }, e: { c: 3, r: 0 } }]; // Merge cells for the title

    // Add Participant Details section
    const participantData = [
        ["Participant Details"],
        ["Name", participantDetails.Name],
        ["Mobile", participantDetails.Mobile]
    ];
    XLSX.utils.sheet_add_aoa(ws, participantData, { origin: "A3" });

    // Set starting row for Schedule Table
    let currentRow = participantData.length + 4;

    // Function to extract table data as array of arrays
    function extractTableData(table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(row => Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText));
    }

    // Add Schedule Table to Excel
    const scheduleTable = document.querySelector(".meal-table");
    if (scheduleTable) {
        const scheduleData = extractTableData(scheduleTable);
        XLSX.utils.sheet_add_aoa(ws, [["Schedule Table"]], { origin: `A${currentRow}` });
        XLSX.utils.sheet_add_aoa(ws, scheduleData, { origin: `A${currentRow + 1}` });
        currentRow += scheduleData.length + 3;
    } else {
        console.error("Meal table not found in the DOM.");
    }

    // Add Summary Table to Excel
    const summaryTable = document.querySelector(".summary-table");
    if (summaryTable) {
        const summaryData = extractTableData(summaryTable);
        XLSX.utils.sheet_add_aoa(ws, [["Summary Table"]], { origin: `A${currentRow}` });
        XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${currentRow + 1}` });
        currentRow += summaryData.length + 3;
    } else {
        console.error("Summary table not found in the DOM.");
    }

    // Add Company Details at the bottom
    const companyDetails = [
        [],
        ["Company Name: Helix Services"],
        ["Contact: muthulakshmananchellappan@gmail.com"],
        ["Phone: +91 7708303969"]
    ];
    XLSX.utils.sheet_add_aoa(ws, companyDetails, { origin: `A${currentRow}` });

    // Add outline borders
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell) {
                cell.s = cell.s || {};
                cell.s.border = {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                };
            }
        }
    }

    // Append the worksheet and save the file
    XLSX.utils.book_append_sheet(wb, ws, "Food Schedule Bill");
    XLSX.writeFile(wb, fileName);
}

// Function to export schedule and summary tables to PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Retrieve participant details from localStorage
    const participantDetails = {
        Name: localStorage.getItem("participantName") || "N/A",
        Mobile: localStorage.getItem("participantMobile") || "N/A"
    };

    // Get current month and participant name for the file name
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const fileName = `${participantDetails.Name}_${currentMonth}_Food_Schedule_Bill.pdf`;

    // Add Title
    const title = `A to Z Food ${currentMonth} Bill`;
    pdf.setFontSize(16);
    pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 20, { align: "center" });

    // Add Participant Details
    pdf.setFontSize(12);
    pdf.text("Participant Details", 10, 40);
    pdf.text(`Name: ${participantDetails.Name}`, 10, 50);
    pdf.text(`Mobile: ${participantDetails.Mobile}`, 10, 60);

    let currentY = 70; // Starting Y position after participant details

    // Function to extract table data as array of arrays
    function extractTableData(table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(row => Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText));
    }

    // Add Schedule Table to PDF
    const scheduleTable = document.querySelector(".meal-table");
    if (scheduleTable) {
        const scheduleData = extractTableData(scheduleTable);
        pdf.text("Schedule Table", 10, currentY);
        pdf.autoTable({
            startY: currentY + 10,
            head: [scheduleData[0]], // Set the first row as header
            body: scheduleData.slice(1),
            styles: { lineColor: [0, 0, 0], lineWidth: 0.5 },
            theme: 'grid'
        });
        currentY = pdf.autoTable.previous.finalY + 10;
    } else {
        console.error("Meal table not found in the DOM.");
    }

    // Add Summary Table to PDF
    const summaryTable = document.querySelector(".summary-table");
    if (summaryTable) {
        const summaryData = extractTableData(summaryTable);
        pdf.text("Summary Table", 10, currentY);
        pdf.autoTable({
            startY: currentY + 10,
            head: [summaryData[0]], // Set the first row as header
            body: summaryData.slice(1),
            styles: { lineColor: [0, 0, 0], lineWidth: 0.5 },
            theme: 'grid'
        });
        currentY = pdf.autoTable.previous.finalY + 10;
    } else {
        console.error("Summary table not found in the DOM.");
    }

    // Add Company Details at the bottom
    pdf.setFontSize(10);
    currentY = pdf.internal.pageSize.getHeight() - 30;
    pdf.text("Company Name: Helix Services", 10, currentY);
    pdf.text("Contact: muthulakshmananchellappan@gmail.com", 10, currentY + 10);
    pdf.text("Phone: +91 7708303969", 10, currentY + 20);

    // Save the PDF
    pdf.save(fileName);
}

// Function to check if data is populated
function checkTablePopulation() {
    const scheduleRows = tableBody.querySelectorAll('tr');
    const summaryPopulated = totalAmountElement.textContent !== "";

    if (scheduleRows.length > 0 && summaryPopulated) {
        excelbutton.disabled = false;
        pdfbutton.disabled = false;
    } else {
        excelbutton.disabled = true;
        pdfbutton.disabled = true;
    }
}

// Event listener for the update button
updateButton.addEventListener("click", () => {
    const oldBreakfastAmount = localStorage.getItem("breakfastAmount") || 40;
    const oldLunchAmount = localStorage.getItem("lunchAmount") || 70;
    const oldDinnerAmount = localStorage.getItem("dinnerAmount") || 40;

    const newBreakfastAmount = breakfastAmountInput.value;
    const newLunchAmount = lunchAmountInput.value;
    const newDinnerAmount = dinnerAmountInput.value;

    // Confirmation dialog
    const confirmUpdate = confirm("Are you sure you want to update the meal amounts?");
    if (confirmUpdate) {
        // Store updated amounts in localStorage
        localStorage.setItem("breakfastAmount", newBreakfastAmount);
        localStorage.setItem("lunchAmount", newLunchAmount);
        localStorage.setItem("dinnerAmount", newDinnerAmount);

        // Provide feedback to the user
        alert("Amounts updated successfully!");
        // Refresh the page
        location.reload();
    } else {
        alert("Update cancelled.");
    }
    // Log changes to the console
    console.log(`Breakfast amount changed from ${oldBreakfastAmount} to ${newBreakfastAmount}`);
    console.log(`Lunch amount changed from ${oldLunchAmount} to ${newLunchAmount}`);
    console.log(`Dinner amount changed from ${oldDinnerAmount} to ${newDinnerAmount}`);
});

// Event listener for the "Generate" button
generateButton.addEventListener("click", async () => {
    const selectedParticipant = participantDropdown.value;
    const selectedMonth = monthDropdown.value;

    if (!selectedParticipant || !selectedMonth) {
        alert("Please select a participant and month to generate the schedule.");
        return;
    }

    try {
        await generateSchedule(selectedMonth, selectedParticipant);
        excelbutton.disabled = false;
        pdfbutton.disabled = false;
    } catch (error) {
        console.error("Error generating schedule:", error);
        alert("Failed to generate the schedule. Please try again.");
    }
});

// Ensure buttons are checked for state on page load
document.addEventListener("DOMContentLoaded", () => {
    checkTablePopulation();
});

// Event listener to open the settings popup
settingsIcon.addEventListener("click", () => {
    settingsPopup.style.display = "block";
});

// Event listener to open the Change Amount popup from the settings popup
changeAmountOption.addEventListener("click", () => {
    settingsPopup.style.display = "none"; // Hide the settings popup
    changeAmountPopup.style.display = "block"; // Show the Change Amount popup
});

// Event listener to close the Change Amount popup
cancelButton.addEventListener("click", () => {
    changeAmountPopup.style.display = "none";
});

// Add event listeners to Export buttons to show appropriate messages
excelbutton.addEventListener("click", () => {
    if (excelbutton.disabled) {
        alert("Please populate the schedule and summary tables before exporting.");
    } else {
        exportToExcel();
        alert("Data successfully exported to Excel.");
    }
});

pdfbutton.addEventListener("click", () => {
    if (pdfbutton.disabled) {
        alert("Please populate the schedule and summary tables before exporting.");
    } else {
        exportToPDF();
        alert("Data successfully exported to PDF.");
    }
});

// Event listener for participant dropdown
participantDropdown.addEventListener("change", () => {
    // Clear the table and disable export buttons
    tableBody.innerHTML = "";
    excelbutton.disabled = true;
    pdfbutton.disabled = true;

    // Clear summary table
    summaryTable.style.display = "none";
    participantDetailsContainer.innerHTML = ""; // Reset participant details
});

// Event listener for the month dropdown
monthDropdown.addEventListener("change", () => {
    // Disable export buttons until the schedule is generated
    excelbutton.disabled = true;
    pdfbutton.disabled = true;
});

// Event listener for Schedule button
schedulebutton.addEventListener("click", () => {
    // You can redirect or show a related page
    window.location.href = "FSMS_MAIN.html"; // Replace with your schedule page
});

// Event listener for Logout button
logoutbutton.addEventListener("click", () => {
    // Add functionality for Logout button
    alert("Logging out...");
    window.location.href = "FSMS_LOGIN.html"; // Redirect to the login page
});

// Initialize the database and load initial data
initDB();
