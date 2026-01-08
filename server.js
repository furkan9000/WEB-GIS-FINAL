require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SWAGGER AYARLARI (JSON FORMATI - HATASIZ) ---
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AnkaraGIS API',
        version: '1.0.0',
        description: 'Ankara Web GIS projesi API dokümantasyonu',
        contact: { name: 'Furkan Ateş' }
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/api/auth/register': {
            post: {
                summary: 'Yeni kullanıcı kaydeder',
                tags: ['Auth'],
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Kullanıcı oluşturuldu' },
                    500: { description: 'Sunucu hatası' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                summary: 'Kullanıcı girişi yapar',
                tags: ['Auth'],
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    password: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Giriş başarılı, token döner' },
                    401: { description: 'Hatalı şifre' }
                }
            }
        },
        '/api/places': {
            get: {
                summary: 'Tüm mekanları GeoJSON olarak getirir',
                tags: ['Places'],
                security: [],
                responses: {
                    200: { description: 'Mekan listesi başarılı' }
                }
            },
            post: {
                summary: 'Yeni mekan ekler (Admin/Mod)',
                tags: ['Places'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    category: { type: 'string' },
                                    description: { type: 'string' },
                                    image_url: { type: 'string' },
                                    lat: { type: 'number' },
                                    lng: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Mekan eklendi' },
                    403: { description: 'Yetkisiz' }
                }
            }
        },
        '/api/places/{id}': {
            delete: {
                summary: 'Mekanı siler (Admin/Mod)',
                tags: ['Places'],
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: 'Silindi' },
                    403: { description: 'Yetkisiz' }
                }
            },
            put: {
                summary: 'Mekan bilgilerini günceller (Admin/Mod)',
                tags: ['Places'],
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    category: { type: 'string' },
                                    description: { type: 'string' },
                                    image_url: { type: 'string' },
                                    lat: { type: 'number' },
                                    lng: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Güncellendi' }
                }
            }
        },
        '/api/comments/{id}': {
            put: {
                summary: 'Yorumu günceller (Sadece Sahibi)',
                tags: ['Comments'],
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { comment_text: { type: 'string' } }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Yorum güncellendi' }
                }
            }
        }
    }
};

const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [] // Dosya taramayı kapattık, direkt yukarıdaki objeyi kullanacak
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// --- VERİTABANI BAĞLANTISI ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

pool.connect((err) => {
    if (err) console.error('Veritabanı bağlantı hatası:', err);
    else console.log('PostgreSQL Veritabanına başarıyla bağlanıldı! 🐘');
});

// --- SAYFA YÖNLENDİRMELERİ ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/places', (req, res) => res.sendFile(path.join(__dirname, 'public', 'places.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

// --- ARA YAZILIM (Verify Token) ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) return res.status(401).json({ success: false, message: 'Token bulunamadı' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token geçersiz' });
        req.user = user; 
        next();
    });
};

// ==================================================
// API ENDPOINTLERİ
// ==================================================

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
            [username, email, hashedPassword, 'user']
        );
        res.status(201).json({ message: 'Kullanıcı oluşturuldu', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Kayıt hatası. Email kullanılıyor olabilir.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Hatalı şifre' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({ message: 'Giriş başarılı', token, username: user.username, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({ success: true, user: req.user, message: 'Token geçerli' });
});

app.get('/api/places', async (req, res) => {
    try {
        const query = `SELECT id, name, category, description, image_url, ST_AsGeoJSON(geom) as geometry FROM places`;
        const result = await pool.query(query);
        
        const geojson = {
            type: "FeatureCollection",
            features: result.rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    description: row.description,
                    image_url: row.image_url
                }
            }))
        };
        res.json(geojson);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Mekanlar çekilemedi' });
    }
});

app.post('/api/places', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Giriş yapmalısınız' });

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user.role !== 'admin' && user.role !== 'moderator') {
            return res.status(403).json({ error: 'Yetkiniz yok!' });
        }

        const { name, category, description, image_url, lat, lng } = req.body;
        const query = `
            INSERT INTO places (name, category, description, image_url, created_by, geom)
            VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326))
            RETURNING id, name
        `;
        const values = [name, category, description, image_url, user.id, lng, lat];
        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Mekan eklendi', place: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.delete('/api/places/:id', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Giriş yapmalısınız' });

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user.role !== 'admin' && user.role !== 'moderator') {
            return res.status(403).json({ error: 'Yetkiniz yok!' });
        }
        const { id } = req.params;
        await pool.query('DELETE FROM comments WHERE place_id = $1', [id]);
        await pool.query('DELETE FROM places WHERE id = $1', [id]);
        res.json({ message: 'Mekan silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Silme hatası' });
    }
});

app.put('/api/places/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, category, description, image_url, lat, lng } = req.body;
    
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ error: 'Yetkiniz yok!' });
    }

    try {
        const query = `
            UPDATE places 
            SET name = $1, category = $2, description = $3, image_url = $4, 
                geom = ST_SetSRID(ST_MakePoint($6, $7), 4326)
            WHERE id = $5
            RETURNING *
        `;
        const values = [name, category, description, image_url, id, lng, lat];
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Mekan bulunamadı' });
        res.json({ message: 'Mekan güncellendi', place: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.get('/api/comments/:placeId', async (req, res) => {
    const { placeId } = req.params;
    try {
        const result = await pool.query(`
            SELECT c.id, c.comment_text, c.score, c.created_at, u.username, c.user_id 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.place_id = $1
            ORDER BY c.created_at DESC
        `, [placeId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Yorumlar çekilemedi' });
    }
});

app.post('/api/comments', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Giriş yapmalısınız' });

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        const { place_id, comment_text, score } = req.body;

        await pool.query(
            'INSERT INTO comments (place_id, user_id, comment_text, score) VALUES ($1, $2, $3, $4)',
            [place_id, user.id, comment_text, score]
        );
        res.status(201).json({ message: 'Yorum eklendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Yorum eklenemedi' });
    }
});

app.put('/api/comments/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.id; 

    try {
        const check = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Yorum bulunamadı' });
        if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Bu yorumu düzenleme yetkiniz yok!' });

        await pool.query('UPDATE comments SET comment_text = $1 WHERE id = $2', [comment_text, id]);
        res.json({ message: 'Yorum güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Giriş yapmalısınız' });

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user.role !== 'admin' && user.role !== 'moderator') {
            return res.status(403).json({ error: 'Yetkiniz yok!' });
        }
        const { id } = req.params;
        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        res.json({ message: 'Yorum silindi' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Yorum silinemedi' });
    }
});

app.listen(PORT, () => {
    console.log(`Server çalışıyor: http://localhost:${PORT}`);
    console.log(`Swagger Dokümantasyonu: http://localhost:${PORT}/api-docs`);
});