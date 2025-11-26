// --- REQUIRED MODULES ---
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- SERVER SETUP ---
const app = express();
// Render automatically provides the PORT environment variable
const PORT = process.env.PORT || 3000; 

// Middleware to parse incoming JSON data from the frontend
app.use(bodyParser.json());

// In-memory user store (TEMPORARY - Must be replaced by a database for production)
const users = []; 

// Security: Use a robust secret key for signing JWTs
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_12345'; // Set this in Render's environment variables!

// --- CORS Configuration (Crucial for Deployment) ---
// This allows your frontend (which will be hosted on Render's domain) to talk to this backend.
app.use((req, res, next) => {
    // WARNING: In a production environment, change '*' to your specific frontend URL!
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// --- API Endpoint 1: /api/signup ---
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password, version } = req.body;
        
        if (!username || !password || !version) {
            return res.status(400).json({ success: false, message: 'Missing username, password, or bot version.' });
        }

        // 1. Check if user already exists
        if (users.find(u => u.username === username)) {
            return res.status(409).json({ success: false, message: 'Username already taken.' });
        }

        // 2. Hash the password securely (salt round 10 is standard)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create and store new user (in-memory)
        const newUser = {
            id: Date.now(),
            username,
            password: hashedPassword,
            version,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        
        console.log(`New user signed up: ${username}`);

        // 4. Generate JWT for automatic login
        const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '1d' });

        // 5. Success response
        return res.status(201).json({ 
            success: true, 
            message: 'Signup successful! Automatically logged in.',
            token: token
        });

    } catch (error) {
        console.error('Signup Error:', error);
        return res.status(500).json({ success: false, message: 'Server error during signup.' });
    }
});

// --- API Endpoint 2: /api/login ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Missing username or password.' });
        }

        // 1. Find user by username
        const user = users.find(u => u.username === username);

        if (!user) {
            // This message is required by your frontend to switch to the signup form
            return res.status(401).json({ success: false, message: "User doesn't have an account." }); 
        }

        // 2. Compare password hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        // 3. Generate JWT for successful login
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        
        // 4. Success response
        return res.status(200).json({ 
            success: true, 
            message: 'Login successful!', 
            token: token 
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// --- STATIC FILE SERVING (For Combined Deploy) ---
// This serves your frontend files (index.html, css, js) from the root of the Render service.
// This means you can deploy your frontend and backend as a single service on Render.
app.use(express.static(__dirname)); 

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // console.log('Current in-memory users:', users); 
});