This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run typecheck (`npm run typecheck`) before declaring any task done.

## Bu proje hakkında

Kişisel antrenman takip uygulaması. Arayüz dili Türkçe. Birincil hedef, iPhone ana ekranına eklenen çevrimdışı web uygulaması (`npm run build:web`, çıktı `dist/`). Aynı kod ileride EAS ile yerel iOS/Android uygulamasına derlenebilir, bu yüzden yalnızca web'de çalışan API'ler `Platform.OS === 'web'` denetimi arkasında tutulur.

- Veriler yalnızca cihazda durur: `src/store.tsx`, AsyncStorage anahtarı `spor-db-v1`. Sunucu yok.
- `app.json` içindeki `experiments.baseUrl` GitHub Pages alt yoluna (`/spor`) göre ayarlıdır.
- `public/sw.js` ve `public/index.html` çevrimdışı önbelleği yönetir.
- Program iki düzende çalışır: hiçbir güne hafta günü atanmadıysa günler sırayla döner (`nextDayId`); atandıysa haftalık plan geçerlidir (`ProgramDay.weekdays`, `todayPlan`, `assignWeekday` — hepsi `src/actions.ts`).

## İstatistik kuralları

Aynı veri her ekranda aynı sonucu vermeli. Yeni bir grafik ya da hesap eklerken şunlara uy:

- Hafta her yerde Pazartesi–Pazar'dır (`weekStart`, `weekStarts`). Tek istisna kas haritasının "Son 7 gün" görünümüdür ve öyle etiketlenir.
- Set sayımı tek yerden geçer: `doneSets` (ısınma ve işaretlenmemiş setler sayılmaz). Ana kas 1, yardımcı kas 0,5 set.
- Grafikler `src/charts.tsx` içindeki ortak bileşenlerle çizilir (`LineChart`, `BarChart`, `PartsBar`, `CalendarGrid`). Elle çubuk ya da eksen çizme.
- Trend grafikleri ortak aralık seçiciyi kullanır (`RangePicker`, `useRangeWeeks`, `useRangeStart`). Seçim `settings.statsRange` içinde tutulur ve tüm ekranlarda aynıdır.
- Vücut modeli `src/body3d.tsx` içindedir: gövde, kollar ve bacaklar elips kesitlerle tanımlı pürüzsüz parçalardır, kaslar bu yüzeyin üstündeki açı ve yükseklik aralıklarıdır. Hazır 3D model ya da 3D kütüphane eklenmez. Kasları ayrı yuvarlak şekillerle çizme; denendi ve kötü göründü.

## Navigation & Routing

- Expo Router **kullanılmıyor**. Tek sayfalık yapı: sekmeler ve üst üste açılan ekranlar `src/nav.tsx` içindeki basit yığınla yönetilir, ekranlar `App.tsx` içinde eşlenir. Yeni ekran eklerken `Route` tipine ekle ve `renderRoute` içinde karşılığını yaz.
- Onay pencereleri için `Alert` yerine `useDialog()` kullan; `Alert` web'de çalışmaz.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
