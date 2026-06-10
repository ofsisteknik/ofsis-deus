# 🛰️ OFSİS — Sismik Erken Uyarı ve Yapı Sağlığı İzleme Konsolu

OFSİS (Ortak Deprem Erken Uyarı ve Güvenlik Sistemi), sismik hareketleri milisaniyeler hassasiyetinde analiz ederek deprem yıkıcı şok dalgası (S-dalgası) binalara ulaşmadan önce kritik otomatik güvenlik önlemlerini devreye sokan, bulut tabanlı bir yeni nesil **Yapı Güvenlik ve Erken Uyarı Platformudur**.

---

## 📢 Satış & Pazarlama Rehberi: Ürünü Müşteriye Nasıl Anlatmalıyız?

Bir pazarlama uzmanı veya satış temsilcisi olarak müşterilerinize (Site Yönetimleri, Fabrika Müdürleri, Organize Sanayi Bölgeleri, Akıllı Bina Yatırımcıları, Kamu Kurumları) OFSİS'in değerini ve benzersiz yeteneklerini aşağıdaki ana başlıklar altında kolayca sunabilirsiniz:

### 1. ⏱️ Hayat Kurtaran Saniyeler: P ve S Dalgası Nedir?
Deprem merkez üssünden iki temel dalga yayılır:
* **P-Dalgası (Primer / Öncü Dalga):** Yıkıcı gücü olmayan, hızlı hareket eden ve sarsıntının geleceğini haber veren dalgadır.
* **S-Dalgası (Sekonder / Yıkıcı Dalga):** Asıl hasarı veren, binaları sallayan ve arkadan gelen yavaş dalgadır.

**OFSİS sismik istasyon cihazları**, depremin öncü dalgasını (P) algıladığı anda milisaniyeler içinde sistemi uyarır. Yıkıcı dalga (S) binaya ulaşmadan önce **5 ila 30 saniye arasında altın değerinde bir erken uyarı süresi** kazandırır.

### 2. ⚡ Otomatik Bina Emniyet Sistemi (Endüstriyel Entegrasyonlar)
OFSİS sadece sesli bir uyarı sistemi değildir; deprem anında bina yönetim sistemleriyle tam entegre çalışarak **otomatik fiziksel aksiyonlar** alır:
* **🚪 Güvenli Asansör Senaryosu (≥ 3.5 Büyüklük):** Asansörler deprem dalgası ulaşmadan hemen önce en yakın veya zemin kata indirilerek kapıları açılır; yolcuların asansörde mahsur kalması engellenir.
* **🔥 Doğalgaz ve Enerji Kesme (≥ 4.0 Büyüklük):** Gaz vanaları ve elektrik şalterleri otomatik kapatılarak deprem sonrası oluşabilecek yangın ve patlamaların önüne geçilir.
* **📢 Erken Siren ve Tahliye Alarmları (≥ 5.0 Büyüklük):** Bina genelindeki sirenler çalar, kullanıcılara mobil anlık bildirimler gönderilir; güvenli tahliye veya "Çök-Kapan-Tutun" için paha biçilmez saniyeler kazandırılır.

### 3. 🎯 Kişiselleştirilmiş Kapsama Alanları ve Bildirim Eşikleri
Her cihazın etrafında esnek bir kapsama alanı tanımlanabilir (Örn: 150 km). Sadece o cihazın etki alanına giren depremler, o cihazla ilişkili kullanıcılara bildirilir. Böylece gereksiz paniklerin ve bilgi kirliliğinin önüne geçilir.

---

## 🖥️ Konsol Yetenekleri ve Kullanım Senaryoları

### 👤 1. Kullanıcı ve Cihaz Yetkilendirme
* **Hiyerarşik Erişim Kontrolü:** Yöneticiler (Admin), sisteme yeni sismik erken uyarı cihazları tanımlayabilir, bunları harita üzerinden koordinat ve kapsama yarıçapıyla konumlandırabilir.
* **Esnek Kullanıcı Ataması:** Her bir müşteriye veya bina sorumlusuna yalnızca kendi binalarındaki cihaz(lar) atanır. Kullanıcılar yalnızca kendilerine tanımlanmış olan sismik istasyonların durumunu, geçmişini ve acil durum senaryolarını takip edebilirler.

### 🗺️ 2. Gerçek Zamanlı Sismik Harita
* Canlı harita üzerinde aktif sismik istasyonlar, konumları ve anlık durumları (Online, Warning, Alarm) renkli göstergelerle izlenir.
* Gerçekleşen depremlerin büyüklüklerine göre haritada şık, yarı saydam renk çemberleri belirerek sarsıntının etki derinliği görselleştirilir.

### 📋 3. Aktivite ve Erken Uyarı Logları
* Gerçekleşen tüm depremler sismik istasyon bazlı listelenir.
* İstasyonların P-Dalgası tahmin büyüklükleri (`estimatedMagnitude`) ile gerçekleşen S-Dalgası büyüklükleri (`actualMagnitude`) karşılaştırmalı olarak kayıt altına alınır.

---

## 🔑 Demo Sürüm Erişim Bilgileri

Sistemin sunduğu zengin arayüzü, yönetici panelini ve cihaz ilişkilendirmelerini anında müşterilerinize canlı olarak sunabilmeniz için önceden tanımlanmış demo hesaplar:

| Rol (Kullanıcı Tipi) | Giriş E-postası | Giriş Şifresi | Görebileceği Alanlar |
|---------------------|-----------------|---------------|----------------------|
| **Sistem Yöneticisi (Admin)** | `admin@ofsis.io` | `Admin2026!` | Cihaz Ekleme/Silme, Kullanıcı Yönetimi, Cihaz Atama, Tüm Harita ve Ayarlar |
| **Bina Sorumlusu (Standart Kullanıcı)** | `baris@ofsis.io` | `Baris123!` | Sadece kendisine atanan binaların/istasyonların erken uyarı bildirimleri ve harita takibi |
| **Teknisyen** | `baris@ofsis.io` (Standart) | `Baris123!` | İlgili cihazın teknik log geçmişi ve sistem otomasyon eşikleri |

---

## ⚠️ ÖNEMLİ: TEST VE KULLANIM BİLGİSİ (ÜÇÜNCÜ TARAF API)

> [!WARNING]
> **TİCARİ AMAÇLI DEĞİLDİR — SADECE TEST VE DEMO MAKSATLIDIR**
> Projede kullanılan canlı deprem verileri, **Kandilli Rasathanesi Deprem Veri Paylaşım Arayüzü API** (`https://github.com/orhanayd/kandilli-rasathanesi-api`) entegrasyonu kullanılarak dinamik olarak çekilmektedir. 
> Bu veri sağlayıcı entegrasyonu tamamen **test, akademik araştırma ve prototip/demo gösterme amaçlı** olup, hiçbir sismik/endüstriyel sorumluluk kabul edilmemektedir. Ticari uygulamalarda resmi kurum lisansları veya özel donanımsal sismometre entegrasyonları kullanılmalıdır.

---

## 🛠️ Teknik Bilgiler (Geliştiriciler İçin)

### 🚀 Lokal Geliştirme Ortamını Çalıştırma
```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Mock veritabanını ve senkronizasyon sunucusunu başlat (Port: 5000)
npm run server

# 3. Web konsolunu yerel ağda başlat
npm run web
```

### 📦 GitHub Pages Dağıtım ve Yayın Süreci
Web projesini test maksatlı **GitHub Pages** üzerinde (`https://ofsisteknik.github.io/ofsis-deus`) yayınlamak için gerekli altyapı hazırlanmıştır.

```bash
# Statik web build'ini export etmek için:
npm run build:web
```
Bu komut, projenin statik web çıktılarını `/dist` klasörüne yazar. Projeninizi GitHub Pages ayarlarından `/dist` klasörünü gösterecek şekilde veya `gh-pages` dalını kullanarak saniyeler içinde yayına alabilirsiniz.
- GitHub Pages sunucusuz (serverless) çalıştığından; sistem Express lokal sunucusuna erişemediğinde otomatik olarak **istemci taraflı (client-side) doğrudan canlı sismik API bağlantısına** geçiş yapar ve kesintisiz deprem takibini sürdürür!

---

## 📅 Proje Durum Raporu: Son Yapılan Çalışmalar & Yol Haritası (Haziran 2026)

Bu bölümde, projenin üretim aşamasına (Raspberry Pi 5 ve Web Dashboard kararlılığı) hazırlanması sürecinde en son tamamlanan çalışmalar, çözülen kritik sorunlar ve bir sonraki aşama için yol haritası yer almaktadır.

### ✅ Tamamlanan Çalışmalar (Neler Yaptık?)

1. **Sismik Veri Senkronizasyonu & Tekilleştirme Optimizasyonu (Backend):**
   * **Çoklu Kaynak Entegrasyonu:** `server/server.js` üzerindeki senkronizasyon döngüsü AFAD (`deprem.afad.gov.tr`) ve Sismik Harita API kaynaklarını öncelik sırasına göre tarayacak şekilde güçlendirildi.
   * **Hassas Tekilleştirme (Deduplication):** Aynı depremin farklı servislerden mükerrer kaydedilmesini engellemek için mesafe farkı (< 80km) ve zaman farkı (< 180s) kriterlerine dayalı akıllı bir eşleştirme algoritması entegre edildi. AFAD verilerine öncelik verilerek veri kaybı önlendi.
   * **Zaman Sıralaması ve Limit:** Veritabanında (`db.json`) deprem kayıtlarının her zaman en güncelden en eskiye doğru (kronolojik) sıralanması sağlandı ve disk doluluğunu korumak için 50 kayıtlık bir limit konuldu.

2. **Arayüz Modernizasyonu & Hata Çözümleri (Frontend):**
   * **Görünüm ve Kaynak (KAYNAK) Etiket Hatası Çözümü:** Veritabanında `deviceName` alanında tutulan deprem kaynağı bilgisinin (KANDILLI, EMSC, AFAD vb.) arayüzde hep "AFAD" olarak görünmesine sebep olan `act.provider` hatalı kontrolü düzeltilerek doğrudan `deviceName` alanının gösterilmesi sağlandı.
   * **Aktivite Logu Sağ Panel Tasarım Güncellemesi:** Ana sayfadaki sağ tarafta açılan Aktivite Logu panelinde, cihaz kapsama alanı dışındaki (genel) depremler için düzenleme yapıldı:
     * **Sol Taraf:** Üstte *Gerçekleşen Büyüklük (Mw/ML)*, altında sismik *Kaynak (Kandilli/EMSC/AFAD)*.
     * **Sağ Taraf:** Üstte deprem *Konumu*, altında *Tarih/Saat* bilgisi yer alacak şekilde görsel hiyerarşi optimize edildi.
   * **React Native Web Shadow Uyarısı:** Konsoldaki `props.pointerEvents` ve `shadow* style props are deprecated` uyarılarını gidermek amacıyla tüm gölgelendirmeler standart ve modern `boxShadow` biçimine dönüştürüldü.
   * **Harita ve Y-Eksen Kararlılığı:** Grafiklerdeki baseline titreşimleri giderildi ve haritada son 3 saatlik depremlerin filtrelenme penceresi optimize edildi.

3. **Bağlantı & Süreç Yönetimi (DevOps):**
   * Yetim (orphan) kalan Node.js işlemlerinin 5000 ve 8081 portlarını bloke etmesi sorunu PowerShell port sonlandırma rutini ile çözüldü.
   * Dış sismik servislere yapılan isteklerde IP banlanmasını ve rate-limit engellerini önlemek için `User-Agent` sahteleme (spoofing) ve istekler arası gecikme (cooldown) mekanizmaları uygulandı.

---

### 📌 Yol Haritası (Nerede Kaldık & Sıradaki Adımlar?)

Projenin sahada 24/7 kararlı çalışması için planlanan sıradaki adımlar şunlardır:

1. **Üretim Ortamı Konfigürasyon Dosyası (.env):** Hardcoded olarak kullanılan backend adreslerinin (`http://localhost:5000`) tek bir noktadan yönetilebilmesi için `.env` (environment variables) entegrasyonu tamamlanmalıdır.
2. **Veritabanı Dosya Kilitleme (File Locking):** `db.json` dosyasına çoklu eşzamanlı yazma/okuma yapıldığında veri kaybını veya dosya bozulmasını önlemek için `lowdb` entegrasyonu veya dosya kilidi (file locking) sistemi eklenmelidir.
3. **Servis Yapılandırması (PM2 / systemd):** Sunucu çökmelerinde veya elektrik kesintisi sonrasında Raspberry Pi 5 açıldığında uygulamanın otomatik olarak (arka planda görünmez şekilde) başlaması için `pm2 startup` veya Linux `systemd` servis tanımlaması yapılmalıdır.
4. **Gelişmiş Günlük Kaydı (Structured Logging):** Depremlerin senkronizasyon filtrelerine takılıp elendiği veya dış API'lere erişilemediği durumları denetlemek için yerel diskte dosya tabanlı bir log kayıt kütüphanesi (örn: `winston`) devreye alınmalıdır.
