window.onload = async () => {
    // 1. URL'deki id parametresini al (Örn: detay.html?id=5)
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
        resimEl.src = post.image_url;
        resimEl.style.display = 'block'; // Resim yüklenince görünür yap

        // Admin panelinden girilen metni ekrana bas
        document.getElementById('icerik-metin').textContent = post.content;
        
        // Tarayıcı sekme başlığını da projenin adı yapalım
        document.title = `${post.title} | Taha.dev`;

    } catch (error) {
        console.error("Veri çekilirken hata oluştu:", error);
        document.getElementById('icerik-baslik').textContent = "Sunucuya bağlanılamadı.";
    }
};