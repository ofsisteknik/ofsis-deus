# 🛰️ OFSİS — Sismik Erken Uyarı ve Yapı Sağlığı İzleme Konsolu

OFSİS (Ortak Deprem Erken Uyarı ve Güvenlik Sistemi), sismik hareketleri milisaniyeler hassasiyetinde analiz ederek deprem yıkıcı şok dalgası (S-dalgası) binalara ulaşmadan önce kritik otomatik güvenlik önlemlerini devreye sokan, bulut tabanlı bir yeni nesil **Yapı Güvenlik ve Erken Uyarı Platformudur**.

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


---

## ⚠️ ÖNEMLİ: TEST VE KULLANIM BİLGİSİ (ÜÇÜNCÜ TARAF API)

> [!WARNING]
> **TİCARİ AMAÇLI DEĞİLDİR — SADECE TEST VE DEMO MAKSATLIDIR**
> Projede kullanılan canlı deprem verileri, **Kandilli Rasathanesi Deprem Veri Paylaşım Arayüzü API** (`https://github.com/orhanayd/kandili-rasathanesi-api`) entegrasyonu kullanılarak dinamik olarak çekilmektedir. 
> Bu veri sağlayıcı entegrasyonu tamamen **test, akademik araştırma ve prototip/demo gösterme amaçlı** olup, hiçbir sismik/endüstriyel sorumluluk kabul edilmemektedir. Ticari uygulamalarda resmi kurum lisansları veya özel donanımsal sismometre entegrasyonları kullanılmalıdır.
