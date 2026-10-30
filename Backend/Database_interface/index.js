
require('dotenv').config();

const express = require('express');
const db = require('./Database_interface/database_interface');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Lipsește JWT_SECRET din fișierul .env');
}

// Înregistrare
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (
            typeof username !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !email.trim() ||
            password.length < 8
        ) {
            return res.status(400).json({
                error: 'Completează username-ul și emailul și folosește o parolă de minimum 8 caractere.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const existingUser = await db.getUserByEmail(cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                error: 'Există deja un cont cu acest email.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const userID = await db.createUser({
            username: username.trim(),
            email: cleanEmail,
            passwordHash
        });

        res.status(201).json({
            message: 'Cont creat cu succes.',
            userID
        });
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        res.status(500).json({
            error: 'Nu s-a putut crea contul.'
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: 'Introdu emailul și parola.'
            });
        }

        const user = await db.getUserByEmail(email.trim().toLowerCase());

        if (!user || !user.IsActive) {
            return res.status(401).json({
                error: 'Email sau parolă incorectă.'
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.PasswordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: 'Email sau parolă incorectă.'
            });
        }

        const token = jwt.sign(
            {
                userID: user.UserID,
                isAdmin: Boolean(user.IsAdmin)
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            message: 'Autentificare reușită.',
            token,
            user: {
                userID: user.UserID,
                username: user.Username,
                email: user.Email
            }
        });
    } catch (error) {
        console.error('Eroare la login:', error);
        res.status(500).json({
            error: 'Nu s-a putut realiza autentificarea.'
        });
    }
});
// Verificare API
app.get('/', (req, res) => {
    res.json({
        message: 'root.esp API is running'
    });
});

// Catalog plante
app.get('/api/plants/catalog', async (req, res) => {
    try {
        const plants = await db.getPlantCatalog();
        res.json(plants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Nu s-a putut încărca catalogul plantelor.' });
    }
});

// Catalog boli
app.get('/api/diseases', async (req, res) => {
    try {
        const diseases = await db.getDiseaseCatalog();
        res.json(diseases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Nu s-a putut încărca catalogul bolilor.' });
    }
});


app.post('/api/users/:userID/plants', async (req, res) => {
    try {
        const userID = Number(req.params.userID);
        const { plantName, location, plantedAt, notes } = req.body;

        if (!Number.isInteger(userID) || userID <= 0) {
            return res.status(400).json({ error: 'ID de utilizator invalid.' });
        }

        if (typeof plantName !== 'string' || !plantName.trim()) {
            return res.status(400).json({ error: 'Numele plantei este obligatoriu.' });
        }

        const plantID = await db.addUserPlant({
            userID,
            plantName: plantName.trim(),
            location,
            plantedAt,
            notes
        });

        res.status(201).json({
            message: 'Planta a fost adăugată cu succes.',
            plantID
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Nu s-a putut adăuga planta.' });
    }
});


// Plantele unui utilizator
app.get('/api/users/:userID/plants', async (req, res) => {
    try {
        const userID = Number(req.params.userID);

        if (!Number.isInteger(userID) || userID <= 0) {
            return res.status(400).json({ error: 'ID de utilizator invalid.' });
        }

        const plants = await db.getUserPlants(userID);
        res.json(plants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Nu s-au putut încărca plantele.' });
    }
});

// Pornire server
app.listen(PORT, () => {
    console.log(`root.esp API rulează la http://localhost:${PORT}`);
});
