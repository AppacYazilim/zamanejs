# ZamaneJS
ZamaneJS, Zamane zaman damgası servisinin bir JavaScript uygulamasıdır. Zamane servisiyle etkileşim için basit ve kolay kullanımlı bir API sunar.

## Zamane

Zamane, TÜBİTAK tarafından Türk hükümeti için yazılmış, verilen dosyalar için zaman damgaları oluşturan bir uygulamadır. Bu zaman damgaları, mahkemede bir dosya veya belgenin iddia edilen zamanda mevcut olduğunu kanıtlamak için kullanılabilir.

## Hukuki

Bu paket, TÜBİTAK ile ilişkilendirilmemektedir. Açık kaynaklı bir projedir ve bu paketin kullanımından kaynaklanabilecek herhangi bir hukuki sorundan sorumlu değildir. Bu paketin kullanımının kullanıldığı ülkenin yasalarına uygun olmasını sağlamak kullanıcının sorumluluğundadır.

## İletişim

Herhangi bir soru veya öneri için, [e-postam](mailto:info@appac.ltd) üzerinden benimle iletişime geçebilirsiniz. Lütfen konu satırında [zamane] ifadesini ekleyin.

## Özellikler

- Saf JavaScript uygulaması, harici CLI bağımlılıkları gerekmez.
- Dosya ve stringlerin hash'lenmesi, zaman damgalarının istenmesi ve doğrulanması için metotlar sağlar.
- Hem dosya tabanlı hem de string tabanlı zaman damgalama destekler.

## Kurulum

ZamaneJS'yi npm veya yarn kullanarak kurabilirsiniz:

```bash
npm install zamanejs
# veya
yarn add zamanejs
```

## Kimlik Bilgileri

Dosyaları zaman damgalamak için kredi satın almanız gerekmektedir. Ancak, geliştirme ve test amaçları için TÜBİTAK'tan örnek kimlik bilgileri isteyebilirsiniz.

kaynaktan alıntı [kaynak](https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/ucretsiz_zaman_damgasi_istemci_yazilimi.jsp)
> Zamane test kullanıcısı talep etmek amacıyla Kamu SM (bilgi[at]kamusm.gov.tr)'ye e-posta gönderilmesi gerekmektedir. İlgili e-posta'nın konu kısmında "Zamane test kullanıcı talebi", içeriğinde ise "Kurum adı, kurum vergi kimlik numarası, kurum adresi, kurum sabit telefon, yetkili kişi adı ve soyadı, cep telefonu numarası, yetkili kişi e-posta" bilgilerinin ve Sha-256 veya Sha-512 özet algoritmasından hangisinin istendiğinin yer alması gerekmektedir.

Lütfen Kamu SM'nin Türkçe yazılmış bir e-posta isteyebileceğini unutmayın!

### Gerçek Kimlik Bilgileri Nasıl Alınır

Ücretli kimlik bilgileri için verenlerin listesi. (tam liste veya resmi liste değil)
- https://e-tugra.com.tr/zaman-damgasi/
- https://tssuser.e-imzatr.com.tr:8027/
- https://zdportal.kamusm.gov.tr/

## Kullanım

Öncelikle, `Zamane` sınıfını import edin ve kimlik bilgilerinizle yeni bir örnek olu

```javascript
import { Zamane } from 'zamanejs';

const zamane

 = new Zamane({
  tssAddress: 'http://tzd.kamusm.gov.tr', // hükümetin örnek zaman damgası sunucusu
  hashAlgorithm: 'SHA-256', // kullanılacak hash algoritması. 'SHA-256' veya 'SHA-512'
  customerNo: '00000', // müşteri numaranız. sadece rakamlar içerir, gerekmezse atlayın
  customerPassword: 'a1b2c3d4', // müşteri şifreniz, gerekmezse atlayın
});
```

### Bir Dosyayı Hash'lama

`hashFromPath` metodu kullanarak bir dosyayı hash'leyebilirsiniz:

```javascript
zamane.hashFromPath("example.txt").then(hash => {
  console.log("Dosya Hash'i: ", hash);
});
```

### Bir String'i Hash'lama

`hashFromString` metodu kullanarak bir string'i hash'leyebilirsiniz:

```javascript
zamane.hashFromString("Test İçeriği").then(hash => {
  console.log("String Hash'i: ", hash);
});
```

### Zaman Damgası İsteme

`timeStampRequest` metodu kullanarak bir zaman damgası isteyebilirsiniz:

```javascript
const hash = await zamane.hashFromString("Test İçeriği");
zamane.timeStampRequest(hash).then(timestamp => {
  console.log("Zaman Damgası: ", timestamp);
});
```

Nonce değerini TSA isteğinden önce kaydetmek için isteğe bağlı ikinci parametre
olarak 8–32 baytlık bir `Buffer` veya `Uint8Array` verin:

```javascript
import { randomBytes } from 'node:crypto';

const nonce = randomBytes(16);
await saveNonce(nonce); // İstekten önce veri özetiyle birlikte saklayın.
const timestamp = await zamane.timeStampRequest(hash, nonce);
// Dönen yanıtın nonce, özet ve imza kontrolleri yapılmıştır.
```

Nonce, işaretsiz RFC 3161 INTEGER olarak kodlanır. DER gereksiz baştaki sıfırları
atar ve gerektiğinde pozitif işaret baytı ekler. Verilen baytlar sıfırla
başlıyorsa çözülmüş tamsayı değerlerini karşılaştırın. İkinci parametre
verilmezse nonce otomatik üretilir ve yanıtta doğrulanır. Metot ham yanıtı yine
`Buffer` olarak döndürür.

### Zaman damgası doğrulaması ve isteğe bağlı CA

`timeStampRequest` yanıtı döndürmeden önce RFC 3161 durumunu, SHA-256 veya
SHA-512 özetini, nonce değerini, CMS imzasını, imzacı sertifikası bağını ve
sertifikanın kritik zaman damgalama kullanımını denetler. Başarısız doğrulama
`TimeStampVerificationError` üretir.

Sertifika zincirini de zorunlu kılmak için güvenilen TSA CA sertifikasını verin:

```javascript
import { readFileSync } from 'node:fs';

const ca = readFileSync('trusted-tsa-root.pem');
const timestamp = await zamane.timeStampRequest(hash, nonce, { ca });
```

`ca` PEM metni, PEM sertifika demeti veya DER baytları olabilir. CA verilmezse
imza, yanıtın içindeki imzacı sertifikasıyla kriptografik olarak doğrulanır;
ancak imzacının **güvenilir kimliği doğrulanmış sayılmaz**. CA sertifikasını
bağımsız ve güvenilir bir kaynaktan sağlayın. İptal durumu otomatik olarak
sorgulanmaz; TSA politikası ve zamanının kabul edilebilirliği uygulama
tarafından değerlendirilmelidir.

### Dışarıdan alınan bir zaman damgası dosyasını doğrulama

Mevcut bir `.tsr` dosyasını `Zamane` nesnesi, TSA hesap bilgileri veya yeni bir
zaman damgası isteği olmadan çevrimdışı doğrulayabilirsiniz. **Orijinal dosyanın
aynı baytlarını**, istekteki özet algoritmasını ve istek gönderilirken kaydedilen
nonce değerini kullanın:

```javascript
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { verifyTimeStampResponse } from 'zamanejs';

const original = readFileSync('belge.pdf');
const tsr = readFileSync('gelen.tsr');
const nonce = readFileSync('istek-nonce.bin'); // Orijinal istekteki nonce.
const hash = createHash('sha256').update(original).digest();

await verifyTimeStampResponse(tsr, {
  hashAlgorithm: 'SHA-256',
  hash,
  nonce,
  ca: readFileSync('guvenilen-tsa-kok.pem')
});
// Yanıt ve imzalayanın sertifika zinciri doğrulanırsa tamamlanır.
```

Güvenilen CA sertifikanız yoksa yalnızca kriptografik kontroller için `ca`
alanını atlayın:

```javascript
await verifyTimeStampResponse(tsr, { hashAlgorithm: 'SHA-256', hash, nonce });
```

CA olmadan imzalayanın kimliği güvenilir sayılmaz. Beklenen nonce değerini
orijinal istekten veya o sırada saklanan kayıttan alın. Yalnızca `.tsr`
içindeki nonce değerini kullanmak, yanıtın sizin isteğinize ait olduğunu
kanıtlamaz. Beklenen nonce eksikse veya eşleşmiyorsa doğrulama başarısız olur.
Bu API TSA'ya bağlanmaz ve sertifika iptal durumunu sorgulamaz.

### Kimlik doğrulama ve bağlantı hataları

`customerNo` ve `customerPassword` verildiğinde HTTP Basic doğrulamasıyla
gönderilir. Doğrulama gerektirmeyen sunucular için iki alanı da atlayın. Servis
sağlayıcınız bu yöntemi desteklemelidir; sağlayıcıya özel Zamane kimlik belirteci
üretilmez. HTTP ve HTTPS desteklenir. Mümkünse HTTPS tercih edin: HTTP üzerinden
Basic doğrulama, hesap bilgilerini şifrelemez.

`requestTimeoutMs` toplam istek süresini sınırlar (varsayılan: 30000 ms).
`timeStampRequest`; 200 dışındaki HTTP durumlarını, eksik veya beklenmeyen
`application/timestamp-reply` içerik türünü, boş yanıtları, 10 MiB üzerindeki
yanıtları ve kesilen/zaman aşımına uğrayan istekleri reddeder. Yönlendirmeler
izlenmez. Yanıt hataları dışa aktarılan `TssRequestError` ile, mevcutsa
`statusCode` alanıyla döner. Hatalara yanıt gövdesi veya hesap bilgileri eklenmez.

Dönen Buffer orijinal RFC 3161 yanıt baytlarını içerir. Uygulama güvenilir TSA
kimliği istiyorsa `ca` vermelidir.

## Lisans

ZamaneJS, MIT Lisansı altında lisanslanmıştır. Daha fazla detay için `LICENSE` dosyasına bakınız.
