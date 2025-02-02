// Function to toggle password visibility
function togglePasswordVisibility(passwordFieldId, checkboxId) {
    const passwordField = document.getElementById(passwordFieldId);
    const checkbox = document.getElementById(checkboxId);
    
    if (passwordField && checkbox) {
        checkbox.addEventListener('change', function() {
            passwordField.type = this.checked ? 'text' : 'password';
        });
    }
}

// Call the function for both the login and registration forms
document.addEventListener('DOMContentLoaded', function() {
    togglePasswordVisibility('password', 'showLoginPassword');
    togglePasswordVisibility('regPassword', 'showRegisterPassword');

    // Open (or create) the database
    const request = indexedDB.open('FSMS_USER_DB', 1);

    request.onupgradeneeded = function(event) {
        console.log('onupgradeneeded event:', event);
        const db = event.target.result;
        if (!db.objectStoreNames.contains('User_list')) {
            const objectStore = db.createObjectStore('User_list', { keyPath: 'Username' });
            objectStore.createIndex('Username', 'Username', { unique: true });
            objectStore.createIndex('Password', 'Password', { unique: false });
        }
    };

    request.onsuccess = function(event) {
        console.log('Database opened successfully:', event);
        const db = event.target.result;

        // Function to display the registration form and hide the login form
        window.showRegister = function() {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('registerContainer').style.display = 'block';
        };

        // Function to display the login form and hide the registration form
        window.showLogin = function() {
            document.getElementById('registerContainer').style.display = 'none';
            document.getElementById('loginContainer').style.display = 'block';
        };

        // Function to handle user login
        function login(username, password) {
            const transaction = db.transaction(['User_list'], 'readonly');
            const objectStore = transaction.objectStore('User_list');
            const request = objectStore.get(username);

            request.onsuccess = function(event) {
                const user = request.result;
                if (user && user.Password === password) {
                    alert('Login successful!');
                    window.location.href = 'FSMS_MAIN.html'; 
                } else {
                    alert('Invalid username or password!');
                }
            };

            request.onerror = function(event) {
                console.error('Login error:', event);
                alert('Login failed!');
            };
        }

        // Function to handle user registration
        function register(username, password) {
            const transaction = db.transaction(['User_list'], 'readwrite');
            const objectStore = transaction.objectStore('User_list');
            const request = objectStore.get(username);

            request.onsuccess = function(event) {
                if (request.result) {
                    alert('Username already taken!');
                } else {
                    const newUser = { Username: username, Password: password };
                    const addRequest = objectStore.add(newUser);
                    addRequest.onsuccess = function(event) {
                        alert('Registration successful!');
                        showLogin();
                    };
                    addRequest.onerror = function(event) {
                        console.error('Registration error:', event);
                        alert('Registration failed!');
                    };
                }
            };

            request.onerror = function(event) {
                console.error('Registration error:', event);
                alert('Registration failed!');
            };
        }

        // Event listener for login form submission
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            login(username, password);
        });

        // Event listener for registration form submission
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            register(username, password);
        });
    };
    
    request.onerror = function(event) {
        console.error('Database error:', event);
        alert('IndexedDB initialization failed!');
    };
});
