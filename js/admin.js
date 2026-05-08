// --- DEĞİŞKENLER ---
let duzenlemeModu = false;
let duzenlenecekId = null;

// --- 1. OTURUM KONTROLÜ (SAYFA AÇILDIĞINDA) ---
window.onload = async () => {
    // Hem kalıcı hafızaya hem de geçici hafızaya bakıyoruz
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');

    if (token) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        await icerikleriYukle();
        await mesajlariYukle();
    } else {
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
    }
};

// --- MENÜ GEÇİŞ SİSTEMİ ---
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        // Aktif menü rengini ayarla
        document.querySelectorAll('.sidebar-menu li').forEach(m => m.classList.remove('active'));
        item.classList.add('active');

        // Sadece seçilen sayfayı göster
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
            if(sec.id === targetId) sec.classList.add('active');
        });
    });
});

// --- 2. GİRİŞ YAPMA İŞLEMİ ---
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault(); 

    const usernameVal = document.getElementById('username').value;
    const passwordVal = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked; // Checkbox seçili mi?
    const messageEl = document.getElementById('login-message');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameVal, password: passwordVal })
        });

        const data = await response.json();

        if (response.ok) {
            // Checkbox durumuna göre nereye kaydedeceğimize karar veriyoruz
            if (rememberMe) {
                localStorage.setItem('adminToken', data.token); // Kalıcı
            } else {
                sessionStorage.setItem('adminToken', data.token); // Tarayıcı kapanana kadar
            }
            
            window.location.reload(); 
        } else {
            messageEl.textContent = data.error || "Giriş başarısız.";
        }
    } catch (error) {
        messageEl.textContent = "Sunucu bağlantı hatası.";
    }
};

// --- 3. ÇIKIŞ YAPMA İŞLEMİ ---
document.getElementById('logout-btn').onclick = () => {
    // Çıkış yapıldığında her ihtimale karşı iki hafızayı da temizliyoruz
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    window.location.reload();
};

// --- 4. VERİ ÇEKME FONKSİYONLARI ---
async function icerikleriYukle() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        const tbody = document.getElementById('admin-posts-list');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        
        posts.forEach(post => {
            const kategoriAdi = post.category_id == 1 ? 'Proje' : 'Blog';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${post.id}</td>
                <td>${post.title}</td>
                <td>${kategoriAdi}</td>
                <td>
                    <button class="edit-btn" onclick='duzenleModunaGec(${JSON.stringify(post)})' title="Düzenle">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="delete-btn" onclick="icerikSil(${post.id})" title="Sil">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("İçerikler yüklenemedi:", error);
    }
}

let tumMesajlar = [];
let suAnkiSayfa = 1;
const mesajSiniri = 10; // Bir sayfada maksimum 10 mesaj

async function mesajlariYukle() {
    try {
        const response = await fetch('/api/messages');
        tumMesajlar = await response.json();
        mesajlariEkranaBas(); // Mesajları çekince ekrana basan fonksiyona yolla
    } catch (error) {
        console.error("Mesajlar yüklenemedi:", error);
    }
}

function mesajlariEkranaBas() {
    const msgList = document.getElementById('admin-messages-list');
    const pagination = document.getElementById('msg-pagination');
    if (!msgList) return;
    
    msgList.innerHTML = '';

    if (tumMesajlar.length === 0) {
        msgList.innerHTML = '<p style="color: #888;">Henüz hiç mesaj gelmemiş.</p>';
        pagination.style.display = 'none';
        return;
    }

    // Matematik: Toplam kaç sayfa var ve hangi aralığı göstereceğiz?
    const toplamSayfa = Math.ceil(tumMesajlar.length / mesajSiniri);
    const baslangic = (suAnkiSayfa - 1) * mesajSiniri;
    const bitis = baslangic + mesajSiniri;
    const gosterilecekMesajlar = tumMesajlar.slice(baslangic, bitis);

    // Ekrana sadece o 10'lu grubu bas
    gosterilecekMesajlar.forEach(msg => {
        const date = new Date(msg.sent_at).toLocaleString('tr-TR');
        msgList.innerHTML += `
            <div class="message-item" style="border: 1px solid #333; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px; background-color: #1a1a1a;">
                <p style="color: #00e5ff; font-weight: bold; margin-bottom: 0.5rem;">${msg.sender_name}</p>
                <p style="font-size: 0.85rem; color: #888; margin-bottom: 1rem;">${msg.sender_email} | ${date}</p>
                <p style="color: #e0e0e0; line-height: 1.5;">${msg.message_body}</p>
            </div>
        `;
    });

    // 10'dan az mesaj varsa okları gizle, fazlaysa göster
    if (toplamSayfa > 1) {
        pagination.style.display = 'flex';
        document.getElementById('msg-page-info').textContent = `${suAnkiSayfa} / ${toplamSayfa}`;
        
        // İlk sayfadaysa Sol oku kapat, Son sayfadaysa Sağ oku kapat
        document.getElementById('prev-msg-btn').disabled = (suAnkiSayfa === 1);
        document.getElementById('next-msg-btn').disabled = (suAnkiSayfa === toplamSayfa);
    } else {
        pagination.style.display = 'none';
    }
}

// Ok butonlarına basılınca çalışacak yön fonksiyonu
function sayfaDegistir(yon) {
    suAnkiSayfa += yon;
    mesajlariEkranaBas(); // Değişen sayfa numarasıyla tekrar bas
}

// Bir içeriği düzenle butonuna basınca otomatik "Yeni İçerik Ekle" menüsüne geçmesi için:
const orijinalDuzenle = duzenleModunaGec;
duzenleModunaGec = function(post) {
    orijinalDuzenle(post); // Eski doldurma işlemlerini yap
    document.querySelector('[data-target="add-post-section"]').click(); // Menüyü o sayfaya kaydır
};

// --- 5. EKLEME VE GÜNCELLEME İŞLEMLERİ (FORM) ---
document.getElementById('add-post-form').onsubmit = async (e) => {
    e.preventDefault();
    
    const category_id = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value;
    const image_url = document.getElementById('post-image').value || '#';
    const content = document.getElementById('post-content').value;

    let url = '/api/posts';
    let method = 'POST';

    if (duzenlemeModu && duzenlenecekId) {
        url = `/api/posts/${duzenlenecekId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_id, title, image_url, content })
        });

        if (response.ok) {
            alert(duzenlemeModu ? 'İçerik başarıyla güncellendi!' : 'İçerik başarıyla eklendi!');
            
            // Modu sıfırla
            duzenlemeModu = false;
            duzenlenecekId = null;
            const submitBtn = document.querySelector('#add-post-form .submit-btn');
            submitBtn.textContent = "İçeriği Yayınla";
            submitBtn.style = "";
            
            document.getElementById('add-post-form').reset();
            document.getElementById('cancel-edit-btn').style.display = 'none';
            icerikleriYukle();
        }
    } catch (error) {
        alert('İşlem sırasında hata oluştu.');
    }
};

// --- 6. DÜZENLEME MODU ---
function duzenleModunaGec(post) {
    duzenlemeModu = true;
    duzenlenecekId = post.id;
    
    // Form kutularını veritabanındaki bilgilerle doldur
    document.getElementById('post-category').value = post.category_id;
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-image').value = post.image_url;
    document.getElementById('post-content').value = post.content;

    // Yayınla butonunu Güncelle butonuna çevir
    const submitBtn = document.querySelector('#add-post-form .submit-btn');
    submitBtn.textContent = "Değişiklikleri Kaydet";
    submitBtn.style.borderColor = "#ffaa00";
    submitBtn.style.color = "#ffaa00";
    
    // "Vazgeç" butonunu sahneye çıkar
    document.getElementById('cancel-edit-btn').style.display = 'block';

    // Sol menüden Yeni İçerik Ekle sekmesine otomatik geçiş yap
    document.querySelector('[data-target="add-post-section"]').click();
}

// --- VAZGEÇ BUTONU İŞLEVİ ---
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    // Düzenleme modundan çık
    duzenlemeModu = false;
    duzenlenecekId = null;
    
    // Formu tertemiz yap (Yeni içerik ekleme moduna döner)
    document.getElementById('add-post-form').reset();
    
    // Butonları orijinal "Ekleme" ayarlarına geri döndür
    const submitBtn = document.querySelector('#add-post-form .submit-btn');
    submitBtn.textContent = "İçeriği Yayınla";
    submitBtn.style = "flex: 1;"; // Rengini sıfırla
    
    // Vazgeç butonunu tekrar gizle
    document.getElementById('cancel-edit-btn').style.display = 'none';
});

// --- 7. SİLME İŞLEMİ ---
async function icerikSil(id) {
    // Ekrana Evet/Hayır seçenekli uyarı penceresi çıkartır
    const onay = confirm('Bu içeriği kalıcı olarak silmek istediğinize emin misiniz?');
    
    // Eğer kullanıcı "Tamam" (Evet) derse silme işlemini yap
    if (onay) {
        try {
            const response = await fetch(`/api/posts/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                icerikleriYukle(); // Tabloyu yenile
            }
        } catch (error) {
            alert('Silme işlemi başarısız oldu.');
        }
    }
    // Kullanıcı "İptal" derse hiçbir şey yapma (if bloğuna girmez)
}

// --- 8. RESİM YÜKLEME İŞLEMİ ---
document.getElementById('post-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const urlInput = document.getElementById('post-image');
    urlInput.value = "Resim yükleniyor, lütfen bekleyin...";

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData 
            // DİKKAT: FormData kullanırken 'Content-Type' yazmıyoruz, tarayıcı onu otomatik ayarlar!
        });

        const data = await response.json();

        if (response.ok) {
            urlInput.value = data.imageUrl; // Arka plandan gelen linki kutuya yapıştır
        } else {
            alert('Resim yükleme hatası: ' + data.error);
            urlInput.value = "";
        }
    } catch (error) {
        console.error('Yükleme hatası:', error);
        alert('Sunucuyla bağlantı kurulamadı.');
        urlInput.value = "";
    }
});

// Admin Paneli Mobil Menü İşlemleri
const adminMenuToggle = document.getElementById('admin-menu-toggle');
const adminSidebar = document.getElementById('admin-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarMenuLi = document.querySelectorAll('.sidebar-menu li');

if(adminMenuToggle && adminSidebar) {
    // Menüyü aç
    adminMenuToggle.addEventListener('click', () => {
        adminSidebar.classList.add('active');
    });

    // Menüyü çarpıdan kapat
    closeSidebarBtn.addEventListener('click', () => {
        adminSidebar.classList.remove('active');
    });

    // Mobilde menüden bir sekmeye tıklayınca menüyü otomatik kapat
    sidebarMenuLi.forEach(li => {
        li.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                adminSidebar.classList.remove('active');
            }
        });
    });
}