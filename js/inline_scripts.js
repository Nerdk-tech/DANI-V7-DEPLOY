Let githubUsername = 'Nerdk-tech';
        let selectedVersion = 'QUEEN-DANI-V7';
        let isLoading = false;
        
        // Check for expired session on page load
        function checkSessionExpiry() {
            const loginTime = localStorage.getItem('loginTime');
            if (loginTime) {
                const now = new Date().getTime();
                const loginTimestamp = parseInt(loginTime);
                const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                
                if (now - loginTimestamp > oneDay) {
                    // Session expired
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('loginTime');
                    return false;
                }
            }
            return true;
        } // FIX: Added closing curly brace here
        
        
        // Simulate loading
        window.addEventListener('DOMContentLoaded', () => {
            // Check session expiry first
            if (!checkSessionExpiry() && localStorage.getItem('authToken')) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('loginTime');
            }
            
            setTimeout(() => {
                document.getElementById('loadingScreen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    
                    // Check if already logged in
                    if (localStorage.getItem('authToken')) {
                        window.location.href = '/dashboard';
                    } else {
                        document.getElementById('githubVerification').style.display = 'block';
                    }
                }, 500);
            }, 1500);
        });

        async function verifyAccess() {
            if (isLoading) return;
            
            githubUsername = document.getElementById('githubUser').value.trim();
            
            if (!githubUsername) {
                showError("Please enter a GitHub username.");
                return;
            }

            isLoading = true;
            document.getElementById('forkButton').classList.add('hidden');
            
            try {
                // Check if the GitHub user exists
                let userResponse = await fetch(`https://api.github.com/users/${githubUsername}`);
                if (!userResponse.ok) {
                    throw new Error("GitHub username not found.");
                }

                // Check if the user has forked the repository
                let forkResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${selectedVersion}`);
                if (!forkResponse.ok) {
                    document.getElementById('forkButton').classList.remove('hidden');
                    throw new Error(`You need to fork the repository first.`);
                }

                // Show auth forms if verification succeeds
                document.getElementById('githubVerification').style.display = 'none';
                document.getElementById('authForms').style.display = 'block';
            } catch (error) {
                showError(error.message);
            } finally {
                isLoading = false;
            }
        }

        function showError(message) {
            const errorDiv = document.getElementById('error');
            document.getElementById('error-message').textContent = message;
            errorDiv.classList.add('show');
            
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }

        function forkRepository() {
            window.open(`https://github.com/Nerdk-tech/${selectedVersion}/fork`, "_blank");
        }

        // Add keyboard support
        document.getElementById('githubUser').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyAccess();
            }
        });

        // Toggle between login and signup forms
        document.getElementById('toggleForms').addEventListener('click', (e) => {
            e.preventDefault();
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const toggleLink = document.getElementById('toggleForms');
            
            if (loginForm.classList.contains('hidden')) {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                toggleLink.textContent = 'Create new account';
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                toggleLink.textContent = 'Already have an account?';
            }
        });

        // Handle signup - FIX APPLIED HERE
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
            
            if (password !== confirmPassword) {
                showStatus('Passwords do not match', 'error');
                return;
            }

            showStatus('Creating account...', 'info');
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // 🔑 FIX: Send 'version' and map 'email' to 'username'
                    body: JSON.stringify({ username: email, password, version: selectedVersion })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('Account created successfully! Redirecting...', 'success');
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('loginTime', new Date().getTime().toString()); // Store login time
                    setTimeout(() => window.location.href = '/dashboard', 1500);
                } else {
                    showStatus(data.message || 'Signup failed', 'error');
                }
            } catch (error) {
                showStatus('Network error. Please try again.', 'error');
            }
        });

        // Handle login with new error handling - FIX APPLIED HERE
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            showStatus('Authenticating...', 'info');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // 🔑 FIX: Map 'email' to 'username' for server consistency
                    body: JSON.stringify({ username: email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('Login successful! Redirecting...', 'success');
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('loginTime', new Date().getTime().toString()); // Store login time
                    setTimeout(() => window.location.href = '/dashboard', 1500);
                } else {
                    // Show specific error message
                    showStatus(data.message, 'error');
                    
                    // If user doesn't exist, show signup form
                    if (data.message.includes("don't have an account")) {
                        document.getElementById('loginForm').classList.add('hidden');
                        document.getElementById('signupForm').classList.remove('hidden');
                        document.getElementById('toggleForms').textContent = 'Already have an account?';
                    }
                }
            } catch (error) {
                showStatus('Network error. Please try again.', 'error');
            }
        });

        function showStatus(message, type) {
            const statusDiv = document.getElementById('authStatus');
            statusDiv.textContent = message;
            statusDiv.className = `mt-3 md:mt-4 text-center text-xs md:text-sm text-${type === 'success' ? 'green' : 
                                type === 'error' ? 'red' : 'blue'}-500`;
            statusDiv.classList.remove('hidden');
        }
        