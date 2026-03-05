# Google Reviews Integration — Setup Guide

## 🎯 Što je dodano?

Nakon što gost uspješno plati, dobiva lijepo dizajniran CTA gumb koji ga vodi direktno na Google Review formu restorana.

## 📋 Setup za pravi restoran

### 1. Pronađi Google Place ID

**Način 1 — Kroz Google Maps:**
1. Otvori [Google Maps](https://www.google.com/maps)
2. Traži svoj restoran
3. Klikni na restoran
4. Pogledaj URL — Place ID je u URL-u nakon `place/` parametra
5. Ili desni klik → "What's here?" → Place ID će biti prikazan

**Način 2 — Kroz Google Place ID Finder:**
1. Idi na [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Traži restoran
3. Kopiraj Place ID (izgleda: `ChIJN1t_tDeuEmsRUsoyG83frY4`)

### 2. Dodaj Place ID u bazu

**MongoDB Atlas (ako koristiš cloud bazu):**
1. Idi na MongoDB Atlas dashboard
2. Collections → `restaurants`
3. Pronađi svoj restoran
4. Dodaj polje:
   ```json
   {
     "googlePlaceId": "ChIJ_paste_tvoj_place_id_ovdje"
   }
   ```

**Ili kroz Postman/API:**
```bash
PATCH /api/restaurants/:restaurantId
Content-Type: application/json

{
  "googlePlaceId": "ChIJ_tvoj_place_id_ovdje"
}
```

**Ili dodaj ručno pri registraciji restorana** — edit `RestaurantRegister.tsx` i dodaj input field za googlePlaceId.

### 3. Testiraj

1. Idi na payment flow
2. Plati račun
3. Na Success stranici bi trebao vidjeti sekciju **"Enjoyed your experience?"**
4. Klikni **"Leave a Google Review"**
5. Otvara se Google Review forma direktno za taj restoran

## 🎨 Kako izgleda?

Success stranica sada ima:
- ✅ Potvrda plaćanja
- 📧 Email receipt (opciono)
- ⭐ **Google Review CTA** (novo!) — zlatna sekcija sa zvjezdicom
- 🙏 Thank you poruka

## 🔧 Napredne opcije

### Prikaži samo za dobre ocjene

Ako želiš prikazati review CTA samo za goste koji su ostavili tip ili izabrali "excellent service":

```tsx
{restaurant && tipAmount >= 5 && (
  <div className="border-t pt-6...">
    {/* Google Review CTA */}
  </div>
)}
```

### Dodaj incentive

```tsx
<p className="text-sm text-center text-green-600 font-semibold mt-2">
  ⭐ Leave a review and get 10% off your next visit!
</p>
```

### Custom poruka po restoranu

Dodaj `reviewMessage` u Restaurant model i prikaži je umjesto generičke poruke.

## 📊 Tracking (opciono)

Ako želiš pratiti koliko ljudi klikne na review:

**Backend:** Dodaj endpoint `/api/analytics/review-click`

**Frontend:** U `SuccessPage.tsx`:
```tsx
const handleReviewClick = async () => {
  try {
    await fetch('/api/analytics/review-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        restaurantId: billData?.restaurant?._id,
        paymentId: paymentId
      })
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

<a onClick={handleReviewClick} ...>
```

## 🧪 Demo mode

Demo restoran već ima hardkodirani Place ID za testiranje. Idi na:
```
http://localhost:5173/demo
```

Klikni "Try Demo Now", idi kroz payment flow i vidi review CTA u akciji!

## ❓ FAQ

**Q: Što ako restoran nema Place ID u bazi?**  
A: CTA sekcija se prikazuje, ali vodi na generički Google search `"Restaurant Name review"` umjesto direktno na review formu.

**Q: Može li korisnik ostaviti review bez Google accounta?**  
A: Ne, Google zahtijeva prijavu za review. Ali većina ljudi ima Google account.

**Q: Trebam li plaćati za Google Reviews API?**  
A: Ne! Koristimo javni Google review link koji je potpuno besplatan.

**Q: Hoće li review automatski biti povezan s mojim Google Business profilom?**  
A: Da! Sve dok koristiš ispravan Place ID, review ide direktno na tvoj profil.

## 🚀 Next Steps

- Dodaj QR kod na email receipt koji vodi na review
- Implementiraj "Thank you for your review" stranicu
- Napravi dashboard s review statistikama
