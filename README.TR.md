# ZamaneJS
ZamaneJS, Zamane zaman damgası servisinin bir JavaScript uygulamasıdır. Zamane servisiyle etkileşim için basit ve kolay kullanımlı bir API sunar.

Teoride bu sadece RFC3161'in temel bir uygulamasıdır fakat Zamane'nin çalışabilmesi için bazı küçük değişiklikler gerekli olduğundan, ayrı bir paket oluşturmaya karar verdim. Detaylar için [ZamaneFix](src/utils/zamaneZdFix.ts) dosyasına bakınız.

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

## Lisans

ZamaneJS, MIT Lisansı altında lisanslanmıştır. Daha fazla detay için `LICENSE` dosyasına bakınız.
