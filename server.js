import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API Endpoint for diagnostics
app.post('/api/diagnose', async (req, res) => {
    const { appliance, brand, errorCode, symptoms, isUrgent } = req.body;

    // Optional: Log the request
    console.log(`Diagnosis requested for ${appliance} (Brand: ${brand}, Urgent: ${isUrgent})`);
    if (errorCode) console.log(`Error code: ${errorCode}`);

    try {
        const prompt = `
            You are an expert home appliance repair technician. A user is having an issue with their appliance.
            
            Appliance Type: ${appliance || 'Unknown'}
            Brand: ${brand || 'Unknown'}
            Error Code: ${errorCode || 'None provided'}
            Symptoms: ${symptoms || 'Unknown'}
            Urgent Issue: ${isUrgent ? 'Yes' : 'No'}
            
            Please diagnose the potential issues and provide step-by-step troubleshooting solutions.
            You must return your entire response as a structured JSON object matching the exact schema provided.
            Ensure there are a maximum of 3 common issues to keep the response concise.
        `;

        const responseSchema = {
            type: "object",
            properties: {
                title: { type: "string", description: "The title of the diagnosis, e.g. 'Refrigerator Diagnosis'" },
                commonIssues: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            issue: { type: "string", description: "Name of the potential issue" },
                            probability: { type: "number", description: "Probability of this being the correct issue out of 100" },
                            solutions: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of actionable step-by-step solutions to fix the issue"
                            },
                            estimatedTime: { type: "string", description: "Estimated time to fix, e.g. '30-60 minutes'" },
                            difficulty: { type: "string", description: "Difficulty level, e.g. 'Easy', 'Moderate', 'Hard', 'Professional Required'" },
                            cost: { type: "string", description: "Estimated parts cost, e.g. '$50-$200'" }
                        },
                        required: ["issue", "probability", "solutions", "estimatedTime", "difficulty", "cost"]
                    }
                }
            },
            required: ["title", "commonIssues"]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2
            }
        });

        // Parse and return the generated JSON
        const result = JSON.parse(response.text);
        res.json(result);

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);

        // Graceful fallback for the frontend if the API fails or if they forgot to set the API Key
        res.status(500).json({
            title: "Diagnosis Unavailable",
            commonIssues: [
                {
                    issue: 'Service Error - AI Unavailable',
                    probability: 100,
                    solutions: [
                        'Ensure the GEMINI_API_KEY environment variable is set in the .env file',
                        'Check your network connection',
                        'Verify the backend server is running and can reach the internet'
                    ],
                    estimatedTime: 'N/A',
                    difficulty: 'N/A',
                    cost: 'N/A'
                }
            ]
        });
    }
});

// Basic health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Fix My Device backend is running.' });
});

// Auth Endpoints
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        
        // Generate token
        const token = jwt.sign(
            { userId: newUser._id }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '1h' }
        );
        res.status(201).json({ token, email, message: 'Signup successful' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Generate Token
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '1h' }
        );
        res.json({ token, email, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
