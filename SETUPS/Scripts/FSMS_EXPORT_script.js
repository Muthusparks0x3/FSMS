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
const schedulebutton = document.getElementById("scheduleButton");
const logoutbutton =  document.getElementById("logoutButton");
const participantlistbtn = document.getElementById("participantListBtn")
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
const excelbutton = document.getElementById("export-excel");
const pdfbutton = document.getElementById("export-pdf");
// Disable Export buttons initially
excelbutton.disabled = true;
pdfbutton.disabled = true;

// Set initial placeholder text for dropdowns and search bar
searchBar.placeholder = "Search Participant";
participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";
monthDropdown.innerHTML = "<option value='' disabled selected>Select Month</option>";

let oldBreakfastAmount = localStorage.getItem("breakfastAmount") || 40;
let oldLunchAmount = localStorage.getItem("lunchAmount") || 70;
let oldDinnerAmount = localStorage.getItem("dinnerAmount") || 40;

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

    // Directly fetch the participant using participantID as the key
    const request = store.get(participantID);

    request.onsuccess = function () {
        const participant = request.result;

        if (participant) {
            // Ensure the container exists
            const participantDetailsContainer = document.getElementById("participant-details");
            if (!participantDetailsContainer) {
                console.error("Participant details container not found in the DOM.");
                return;
            }

            // Update the participant details container
            participantDetailsContainer.innerHTML = `
                <p><strong>Participant ID:</strong> ${participant.participantID}</p>
                <p><strong>Name:</strong> ${participant.name}</p>
                <p><strong>Mobile No:</strong> ${participant.mobile || "N/A"}</p>
                <p><strong>Address:</strong> ${participant.address || "N/A"}</p>
            `;

            // Optionally store the participant name and mobile in localStorage
            localStorage.setItem("participantID", participant.participantID);
            localStorage.setItem("participantName", participant.name);
            localStorage.setItem("participantMobile", participant.mobile || "N/A");
        } else {
            console.warn(`Participant with ID ${participantID} not found.`);
            const participantDetailsContainer = document.getElementById("participant-details");
            participantDetailsContainer.innerHTML = "<p>Participant not found.</p>";
        }
    };

    request.onerror = function (event) {
        console.error("Error fetching participant details:", event.target.error);
    };
}

// Search participants based on input
async function searchParticipants() {
    const query = searchBar.value.toLowerCase().trim();
    const suggestionsContainer = document.getElementById("suggestions-container");
    participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";
    suggestionsContainer.innerHTML = ""; // Clear previous suggestions

    // Hide suggestions if search bar is empty
    if (query === "") {
        suggestionsContainer.style.display = "none";
        return;
    }

    try {
        const participants = await fetchParticipants();

        // Filter participants for suggestions (Allow single-letter)
        let filteredParticipants = participants
            .filter(p => p.name.toLowerCase().includes(query))
            .sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                // Priority to names starting with query
                const startsWithA = nameA.startsWith(query);
                const startsWithB = nameB.startsWith(query);
                if (startsWithA && !startsWithB) return -1;
                if (!startsWithA && startsWithB) return 1;

                return nameA.localeCompare(nameB); // Sort alphabetically
            });

        // Populate suggestions box
        if (filteredParticipants.length > 0) {
            filteredParticipants.forEach(participant => {
                const suggestion = document.createElement("div");
                suggestion.textContent = participant.name;
                suggestion.addEventListener("click", () => {
                    searchBar.value = participant.name; // Set search field
                    suggestionsContainer.style.display = "none"; // Hide suggestions
                    updateDropdown(filteredParticipants); // Filter dropdown based on selection
                });
                suggestionsContainer.appendChild(suggestion);
            });

            suggestionsContainer.style.display = "block"; // Show suggestions
        } else {
            suggestionsContainer.style.display = "none"; // Hide if no matches
        }

        // Always update dropdown
        updateDropdown(filteredParticipants);
    } catch (error) {
        console.error("Error fetching participants:", error);
    }
}

// Update dropdown based on filtered names
function updateDropdown(filteredParticipants) {
    participantDropdown.innerHTML = "<option value='' disabled selected>Select Participant</option>";

    filteredParticipants.forEach(participant => {
        const option = document.createElement("option");
        option.value = participant.participantID;
        option.textContent = participant.name;
        participantDropdown.appendChild(option);
    });
}

// Event listener for search input
searchBar.addEventListener("input", searchParticipants);

// Fetch schedule data based on month and participant selection
async function fetchScheduleData(selectedMonth, participantID) {
    return new Promise((resolve, reject) => {
        const dbName = 'FSMS_Schedule_Details_DB';
        const dbRequest = indexedDB.open(dbName, dbVersion);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(selectedMonth)) {
                alert(`No data available for ${selectedMonth}. Please select a different month.`);
                console.warn(`Object store for ${selectedMonth} does not exist.`);
                reject(`Object store for ${selectedMonth} not found.`);
                return;
            }
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

//Function to export bill in excel
function exportToExcel() {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Retrieve selected participant details
    const selectedParticipantID = participantDropdown.value;
    const selectedMonth = monthDropdown.value;

    if (!selectedParticipantID || !selectedMonth) {
        alert("Please select a participant and month to export the Excel file.");
        return;
    }

    const participantName = participantDropdown.options[participantDropdown.selectedIndex].textContent;
    const participantMobile = localStorage.getItem("participantMobile") || "N/A";

    // Set the filename
    const fileName = `${participantName}_${selectedMonth}_Food_Schedule_Bill.xlsx`;

    // Add Title
    const title = `A to Z Food Service ${selectedMonth} Bill`;
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
    ws["!merges"] = [{ s: { c: 0, r: 0 }, e: { c: 3, r: 0 } }];

    // Add Participant Details
    const participantData = [
        ["Participant Details"],
        ["Name", participantName],
        ["Mobile", participantMobile]
    ];
    XLSX.utils.sheet_add_aoa(ws, participantData, { origin: "A3" });

    // Set the starting row for Schedule Table
    let currentRow = participantData.length + 4;

    // Function to extract table data as an array of arrays
    function extractTableData(table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(row => Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText));
    }

    // Add Schedule Table to Excel
    const scheduleTable = document.querySelector(".meal-table");
    if (scheduleTable) {
        const scheduleData = extractTableData(scheduleTable);

        if (scheduleData.length > 1) { // Ensure data is present
            XLSX.utils.sheet_add_aoa(ws, [["Schedule Table"]], { origin: `A${currentRow}` });
            XLSX.utils.sheet_add_aoa(ws, scheduleData, { origin: `A${currentRow + 1}` });
            currentRow += scheduleData.length + 3;
        } else {
            console.warn("No schedule data found for the selected participant.");
        }
    } else {
        console.error("Meal table not found in the DOM.");
    }

    // Add Summary Table to Excel
    const summaryTable = document.querySelector(".summary-table");
    if (summaryTable) {
        const summaryData = extractTableData(summaryTable);

        if (summaryData.length > 1) { // Ensure data is present
            XLSX.utils.sheet_add_aoa(ws, [["Summary Table"]], { origin: `A${currentRow}` });
            XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: `A${currentRow + 1}` });
            currentRow += summaryData.length + 3;
        } else {
            console.warn("No summary data found for the selected participant.");
        }
    } else {
        console.error("Summary table not found in the DOM.");
    }

    // Add Company Details at the bottom
    const companyDetails = [
        ["A TO Z FOOD SERVICES"],
        ["Phone: +91 9941935517. PAY TO THIS MOBILE NUMBER"],
        ["DEVELOPED BY HELIX"],
        ["For any app development contact muthulakshmananchellappan@gmail.com"]
    ];
    XLSX.utils.sheet_add_aoa(ws, companyDetails, { origin: `A${currentRow}` });

    // Append the worksheet and save the file
    XLSX.utils.book_append_sheet(wb, ws, "Food Schedule Bill");
    XLSX.writeFile(wb, fileName);
}

// Function to export schedule and summary tables to PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Retrieve participant details from dropdowns
    const selectedParticipantID = participantDropdown.value;
    const selectedMonth = monthDropdown.value;

    // Check if participant and month are selected
    if (!selectedParticipantID || !selectedMonth) {
        alert("Please select a participant and month to export the PDF.");
        return;
    }

    // Retrieve participant details from localStorage or database
    const participantName = participantDropdown.options[participantDropdown.selectedIndex].textContent;
    const participantMobile = localStorage.getItem("participantMobile") || "N/A";

    // Set the filename with the selected participant and month
    const fileName = `${participantName}_${selectedMonth}_Food_Schedule_Bill.pdf`;

    // Add Title
    const title = `A to Z Food Service - ${selectedMonth} Bill`;
    pdf.setFontSize(16);
    pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 20, { align: "center" });

    // Add Participant Details
    pdf.setFontSize(12);
    pdf.text("Participant Details", 10, 40);
    pdf.text(`Name: ${participantName}`, 10, 50);
    pdf.text(`Mobile: ${participantMobile}`, 10, 60);

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
    pdf.text("A TO Z FOOD SERVICES", 10, currentY);
    pdf.text("Phone: +91 9941935517. PAY TO THIS MOBILE NUMBER", 10, currentY + 5);
    pdf.text("DEVELOPED BY HELIX", 10, currentY + 10);
    pdf.text("For any app development contact muthulakshmananchellappan@gmail.com", 10, currentY + 15);

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

        // Update old values to match the new ones
        oldBreakfastAmount = newBreakfastAmount;
        oldLunchAmount = newLunchAmount;
        oldDinnerAmount = newDinnerAmount;

        alert("Amounts updated successfully!");
        location.reload(); // Refresh the page to reflect changes
    } else {
        alert("Update cancelled.");
    }
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
    const currentBreakfast = breakfastAmountInput.value;
    const currentLunch = lunchAmountInput.value;
    const currentDinner = dinnerAmountInput.value;

    // Check if any changes were made
    const changesMade = 
        currentBreakfast !== oldBreakfastAmount.toString() || 
        currentLunch !== oldLunchAmount.toString() || 
        currentDinner !== oldDinnerAmount.toString();

    if (changesMade) {
        const confirmCancel = confirm("Changes were made. Do you want to discard them?");
        if (confirmCancel) {
            // Restore old values
            breakfastAmountInput.value = oldBreakfastAmount;
            lunchAmountInput.value = oldLunchAmount;
            dinnerAmountInput.value = oldDinnerAmount;

            alert("Changes discarded.");
            changeAmountPopup.style.display = "none"; // Close the popup
        }
        // If user selects "No," do nothing (popup remains open)
    } else {
        changeAmountPopup.style.display = "none"; // Close the popup if no changes
    }
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
    const participantID = participantDropdown.value;
    if (participantID) {
        displayParticipantDetails(participantID);
    }
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

participantlistbtn.addEventListener("click", () => {
    window.location.href = "FSMS_PARTICIPANT_LIST.html"; // Redirect to the participant list page
});

// Initialize the database and load initial data
initDB();

(function () {
    const tabID = Date.now().toString(); // Unique ID for the tab
    const appKey = "FSMS_APP_ACTIVE_TAB"; // Storage key for the active tab
    const channel = new BroadcastChannel("FSMS_TAB_CHANNEL"); // Communication channel

    function checkActiveTab() {
        const activeTab = localStorage.getItem(appKey);

        if (activeTab && activeTab !== tabID) {
            showTabWarning();
        } else {
            localStorage.setItem(appKey, tabID); // Mark this tab as active
        }
    }

    function showTabWarning() {
        alert("This application is already open in another tab. Please close other tabs to continue.");
        document.body.innerHTML = "<h2 style='color: red; text-align: center;'>Application is already open in another tab. Please close other tabs.</h2>";
    }

    function handleTabChange(event) {
        if (event.key === appKey && event.newValue !== tabID) {
            showTabWarning();
        }
    }

    function handleBroadcastMessage(event) {
        if (event.data === "NEW_TAB_OPENED" && localStorage.getItem(appKey) !== tabID) {
            showTabWarning();
        }
    }

    function releaseTabLock() {
        if (localStorage.getItem(appKey) === tabID) {
            localStorage.removeItem(appKey);
        }
        channel.postMessage("TAB_CLOSED");
    }

    // Initial check for active tabs
    checkActiveTab();

    // Listen for tab changes
    window.addEventListener("storage", handleTabChange);
    channel.addEventListener("message", handleBroadcastMessage);
    channel.postMessage("NEW_TAB_OPENED");

    // Release lock when tab is closed
    window.addEventListener("beforeunload", releaseTabLock);
})();
