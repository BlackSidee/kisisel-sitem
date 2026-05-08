// Veritabanından Projeleri Çekme ve Ekrana Yazdırma
async function projeleriGetir() {
    try {
        // Node.js API'mize istek atıyoruz
        const response = await fetch('/api/projeler');
        const projeler = await response.json();

        const projeGrid = document.querySelector('#projeler .project-grid');
        projeGrid.innerHTML = ''; // İçini temizle

        // Gelen her bir proje için HTML kartı oluştur
        projeler.forEach(proje => {
            const kartHTML = `
                <article class="project-card">
                    <h3>${proje.title}</h3>
                    <p>${proje.content}</p>
                    <a href="detay?id=${proje.id}">Detayları İncele</a>
                </article>
            `;
            projeGrid.innerHTML += kartHTML;
        });

    } catch (error) {
        console.error('Projeler yüklenirken hata oluştu:', error);
    }
}

// Sayfa yüklendiğinde fonksiyonu çalıştır.
projeleriGetir();

// Veritabanından Blogları Çekme ve Ekrana Yazdırma
async function bloglariGetir() {
    try {
        // Node.js API'mize bloglar için istek atıyoruz
        const response = await fetch('/api/bloglar');
        const bloglar = await response.json();

        // HTML'de blogların ekleneceği div'i seçiyoruz
        const blogGrid = document.querySelector('#blog .project-grid');
        blogGrid.innerHTML = ''; // İçini temizle

        // Gelen her bir blog için HTML kartı oluştur
        bloglar.forEach(blog => {
            const kartHTML = `
                <article class="project-card">
                    <h3>${blog.title}</h3>
                    <p>${blog.content}</p>
                    <a href="detay?id=${blog.id}">Okumaya Devam Et</a>
                </article>
            `;
            blogGrid.innerHTML += kartHTML;
        });

    } catch (error) {
        console.error('Bloglar yüklenirken hata oluştu:', error);
    }
}

// Sayfa yüklendiğinde blog fonksiyonunu da çalıştır
bloglariGetir();

// 1. Navbar (Menü) Scroll Efekti
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled-nav');
    } else {
        header.classList.remove('scrolled-nav');
    }
});

// 2. Scroll Reveal (Aşağı Kaydırdıkça Belirme Efekti)
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        // Eğer element ekranda görünür hale geldiyse
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        } else {
            // Eğer istersen yukarı çıkıldığında animasyonun tekrarlanması için
            // aşağıdaki satırı aktif bırakabilirsin. İstemezsen silebilirsin.
            entry.target.classList.remove('show'); 
        }
    });
});

// HTML'de 'hidden' class'ına sahip tüm elementleri bul ve gözlemlemeye başla
const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        sender_name: document.getElementById('name').value,
        sender_email: document.getElementById('email').value,
        message_body: document.getElementById('message').value
    };

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Mesajınız başarıyla gönderildi, teşekkürler!');
            document.getElementById('contact-form').reset();
        }
    } catch (error) {
        alert('Şu an mesaj iletilemiyor, lütfen daha sonra tekrar deneyin.');
    }
});

// --- NAVBAR SCROLLSPY (Aktif Menü Vurgulama) ---
document.addEventListener("DOMContentLoaded", () => {
    // Sayfadaki tüm ana bölümleri (section) ve navbar linklerini seçiyoruz
    const sections = document.querySelectorAll("section"); 
    const navLinks = document.querySelectorAll("nav a"); // Navbar içindeki a etiketlerini kendi HTML'ine göre düzenleyebilirsin (örn: .nav-links a)

    window.addEventListener("scroll", () => {
        let current = "";

        // Hangi bölümün ekranda olduğunu hesapla
        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            // Sayfayı kaydırırken üstten biraz pay bırakıyoruz (örneğin navbar yüksekliği kadar)
            if (pageYOffset >= sectionTop - 150) { 
                current = section.getAttribute("id");
            }
        });

        // Tüm linklerden active sınıfını temizle ve sadece ekranda olan bölümün linkine ekle
        navLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href").includes(current)) {
                link.classList.add("active");
            }
        });
    });
});

// Mobil Hamburger Menü İşlemleri
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
const navItems = document.querySelectorAll('.nav-links li a');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Mobilde bir linke tıklayınca menüyü otomatik kapat
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});