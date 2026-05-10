window.onload = async () => {
    // 1. URL'deki id parametresini al (Örn: detay?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Eğer id yoksa ana sayfaya at
    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // 2. İlgili içeriği Backend'den çek
        const response = await fetch(`/api/posts/${id}`);
        
        if (!response.ok) {
            document.getElementById('icerik-baslik').textContent = "İçerik Bulunamadı!";
            return;
        }

        const post = await response.json();

        // 3. HTML elemanlarını doldur
        document.getElementById('icerik-baslik').textContent = post.title;
        
        const resimEl = document.getElementById('icerik-resim');
        const videoEl = document.getElementById('icerik-video');

        // 1. Adım: Başlangıçta her ikisini de kesin olarak gizle (Temiz sayfa)
        resimEl.style.display = 'none';
        if (videoEl) videoEl.style.display = 'none';

        // 2. Adım: Eğer video linki varsa sadece videoyu göster
        if (post.video_url && post.video_url.trim() !== "") {
            videoEl.src = post.video_url;
            videoEl.style.display = 'block';
        } 
        // 3. Adım: Video yoksa, resim linki varsa VE resim linki "#" DEĞİLSE resmi göster
        else if (post.image_url && post.image_url.trim() !== "" && post.image_url !== "#") {
            resimEl.src = post.image_url;
            resimEl.style.display = 'block';
        }
        // Eğer ikisi de yoksa, 1. adımda gizlediğimiz için ekranda hiçbir boşluk veya kırık ikon kalmaz!

        // Admin panelinden girilen metni ekrana bas
        document.getElementById('icerik-metin').textContent = post.content;
        
        // Tarayıcı sekme başlığını da projenin adı yapalım
        document.title = `${post.title} | TahaDEV`;

    } catch (error) {
        console.error("Veri çekilirken hata oluştu:", error);
        document.getElementById('icerik-baslik').textContent = "Sunucuya bağlanılamadı.";
    }

    // --- VERİLER YÜKLENDİKTEN SONRA LOADING EKRANINI KALDIR ---
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
};