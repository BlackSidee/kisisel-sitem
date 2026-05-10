// Gerekli paketleri projeye dahil ediyoruz
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config(); // .env dosyasındaki gizli verileri okumak için

// Express uygulamamızı başlatıyoruz
const app = express();

const server = http.createServer(app);
const io = new Server(server);

// Middleware (Ara Katman) Ayarları
app.use(cors()); // Frontend ve Backend farklı portlarda çalışırken hata almamak için
app.use(express.json()); // Frontend'den form ile gönderilecek JSON verilerini okuyabilmek için

// Veritabanı Bağlantı Havuzu (Pool) Oluşturma
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT // <--- İŞTE EKLENEN YENİ SATIR BURASI
});

// Veritabanı Bağlantısını Test Edelim
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Veritabanına bağlanırken hata oluştu:', err.message);
    } else {
        console.log('✅ MySQL Veritabanına (portfolio_db) başarıyla bağlanıldı!');
        connection.release(); // Bağlantıyı geri bırakıyoruz
    }
});

// Ana Sayfa Test Endpoint'i (Tarayıcıdan sunucuyu test etmek için)
// app.get('/', (req, res) => {
//    res.send('Taha.dev Backend API Sorunsuz Çalışıyor! 🚀');
// });

// Yüklenen resimleri ön yüzde gösterebilmek için klasörü dışa açıyoruz
app.use('/uploads', express.static('uploads'));

// Resimlerin nereye ve hangi isimle kaydedileceğini ayarlıyoruz
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Oluşturduğumuz klasör
    },
    filename: (req, file, cb) => {
        // Aynı isimde dosyalar çakışmasın diye isimlerin sonuna o anki tarihi milisaniye olarak ekliyoruz
        cb(null, 'tahadev-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Projeleri Veritabanından Çeken API Endpoint'i
app.get('/api/projeler', (req, res) => {
    // category_id = 1 olanlar (Projelerim)
    const sql = 'SELECT * FROM posts WHERE category_id = 1 ORDER BY created_at DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Veri çekme hatası:', err);
            res.status(500).json({ error: 'Veritabanı hatası' });
        } else {
            res.json(results); // Gelen veriyi frontend'e JSON olarak yolla
        }
    });
});

// Blogları Veritabanından Çeken API Endpoint'i
app.get('/api/bloglar', (req, res) => {
    // category_id = 2 olanlar (Yani Blog Yazıları)
    const sql = 'SELECT * FROM posts WHERE category_id = 2 ORDER BY created_at DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Blog veri çekme hatası:', err);
            res.status(500).json({ error: 'Veritabanı hatası' });
        } else {
            res.json(results); // Gelen veriyi frontend'e JSON olarak yolla
        }
    });
});

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

app.get('/detay', (req, res) => {
    res.sendFile(__dirname + '/detay.html');
});

// --- KULLANICI İŞLEMLERİ ---

// 1. KAYIT OL (Register) Endpoint'i - Sadece 1 kere kendi admin hesabımızı açmak için
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Şifreyi 10 tur şifreleme algoritmasından geçiriyoruz (Hashing)
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hashedPassword, email], (err, result) => {
            if (err) {
                console.error('Kayıt hatası:', err);
                return res.status(500).json({ error: 'Kayıt yapılamadı, kullanıcı adı alınmış olabilir.' });
            }
            res.json({ message: 'Admin hesabı başarıyla oluşturuldu!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// 2. GİRİŞ YAP (Login) Endpoint'i
// server.js içindeki Login kısmını şu şekilde güncelle:
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        if (results.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Giriş başarılıysa 1 gün geçerli bir Token oluşturuyoruz
            const token = jwt.sign(
                { id: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.json({ 
                message: 'Giriş başarılı!', 
                token: token // Token'ı frontend'e gönderiyoruz
            });
        } else {
            res.status(401).json({ error: 'Şifre hatalı.' });
        }
    });
});

// --- RESİM YÜKLEME İŞLEMİ ---
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Lütfen bir dosya seçin.' });
    }
    // Yüklenen resmin sunucudaki tam linkini oluşturup frontend'e yolluyoruz
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl: imageUrl });
});

// Ana sitemizin HTML, CSS ve JS dosyalarını (kök dizini) internete açıyoruz
app.use(express.static(__dirname));

// --- ADMİN PANELİ İŞLEMLERİ ---

// 1. Tüm İçerikleri Tabloya Çekme (GET)
// 1.5 Tek Bir İçeriği ID'ye Göre Çekme (GET)
// 1. TÜM İÇERİKLERİ ÇEKME (Ana sayfa ve Admin Panel tablosu için)
app.get('/api/posts', (req, res) => {
    const sql = 'SELECT * FROM posts ORDER BY created_at ASC'; // veya DESC
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        res.json(results);
    });
});

// 1.5 TEK BİR İÇERİĞİ ÇEKME (Detay sayfası için)
app.get('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM posts WHERE id = ?';
    
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        if (results.length === 0) return res.status(404).json({ error: 'İçerik bulunamadı' });
        res.json(results[0]); 
    });
});

// 2. Yeni İçerik Ekleme (POST)
app.post('/api/posts', (req, res) => {
    // req.body içinden video_url dahil tüm verileri alıyoruz
    const { category_id, title, content, image_url, video_url } = req.body; 
    
    // SQL sorgusuna video_url'i de ekliyoruz
    const sql = 'INSERT INTO posts (category_id, title, content, image_url, video_url) VALUES (?, ?, ?, ?, ?)';
    
    // Gelen verileri sırasıyla SQL'e gönderiyoruz
    db.query(sql, [category_id, title, content, image_url, video_url], (err, result) => {
        if (err) {
            console.error('Kayıt hatası:', err);
            return res.status(500).json({ error: 'Ekleme hatası' });
        }
        res.json({ message: 'İçerik başarıyla eklendi!' });
    });
});

// 3. İçerik Silme (DELETE)
app.delete('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM posts WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Silme hatası' });
        res.json({ message: 'İçerik başarıyla silindi!' });
    });
});

// 4. İçerik Güncelleme (PUT)
app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    
    // video_url değişkenini de karşılıyoruz
    const { category_id, title, content, image_url, video_url } = req.body; 
    
    // UPDATE sorgusuna video_url = ? ekliyoruz
    const sql = 'UPDATE posts SET category_id = ?, title = ?, content = ?, image_url = ?, video_url = ? WHERE id = ?';
    
    // Diziye video_url ve id'yi sırasıyla ekliyoruz
    db.query(sql, [category_id, title, content, image_url, video_url, id], (err, result) => {
        if (err) {
            console.error('Güncelleme hatası:', err);
            return res.status(500).json({ error: 'Güncelleme hatası' });
        }
        res.json({ message: 'İçerik başarıyla güncellendi!' });
    });
});

// --- İLETİŞİM FORMU İŞLEMLERİ ---

// Ziyaretçiden gelen mesajı kaydetme
app.post('/api/messages', (req, res) => {
    const { sender_name, sender_email, message_body } = req.body;
    const sql = 'INSERT INTO messages (sender_name, sender_email, message_body) VALUES (?, ?, ?)';
    
    db.query(sql, [sender_name, sender_email, message_body], (err, result) => {
        if (err) {
            console.error('Mesaj kaydetme hatası:', err);
            return res.status(500).json({ error: 'Mesaj gönderilemedi.' });
        }
        res.json({ message: 'Mesajınız başarıyla iletildi!' });
    });
});

// Admin panelinde mesajları listeleme
app.get('/api/messages', (req, res) => {
    const sql = 'SELECT * FROM messages ORDER BY sent_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Mesajlar çekilemedi.' });
        res.json(results);
    });
});

// --- GERÇEK ZAMANLI ZİYARETÇİ TAKİBİ ---
let anlikZiyaretci = 0;

io.on('connection', (socket) => {
    // Biri siteye girdiğinde sayıyı artır ve herkese duyur
    anlikZiyaretci++;
    io.emit('ziyaretciGuncelle', anlikZiyaretci);

    // Biri siteden çıktığında sayıyı azalt ve herkese duyur
    socket.on('disconnect', () => {
        anlikZiyaretci--;
        io.emit('ziyaretciGuncelle', anlikZiyaretci);
    });
});

// Sunucuyu Ayağa Kaldırma (app.listen yerine server.listen kullanıyoruz)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});