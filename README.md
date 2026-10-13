# Brzytwa & Cień — barbershop, Kraków (demo project)

[PL](#polski) · [EN](#english)

> **Demo project.** Brzytwa & Cień is a fictional business. Names, prices, address and contacts are made up. Live page: https://mistqkw.github.io/demo-barber/

## Polski

Demo strony i bota Telegram dla małej firmy (barbershop). Projekt pokazowy autorstwa **mistqkw**.

### Co zawiera

- **Landing** (`index.html`, `style.css`, `main.js`): czysty HTML/CSS/JS, własny układ i animacje: reflektor «cienia» podążający za kursorem, pływające litery z paralaksą, manifest zapalający się słowo po słowie, linia brzytwy rysowana przy przewijaniu, cennik z poziomym scrollem (GSAP + ScrollTrigger, Lenis), kręcący się słup barberski, jasny i ciemny motyw, układ mobilny oraz interaktywny «bilet» rezerwacji z wyborem usługi, dnia i godziny (w demo nie wysyła danych).
- **Bot Telegram** (`bot/`, Python + aiogram 3): wybór usługi, dnia i godziny, imię i telefon, potwierdzenie, powiadomienie właściciela, `/my` (moje rezerwacje i odwoływanie), `/admin` (lista rezerwacji dla właściciela). Dane w SQLite.

### Uruchomienie strony

Wystarczy otworzyć `index.html` w przeglądarce lub uruchomić serwer: `python -m http.server 8000`. Wersja online działa na GitHub Pages.

### Uruchomienie bota

1. Utwórz bota u [@BotFather](https://t.me/BotFather) i skopiuj token.
2. Swoje ID poznasz u bota [@userinfobot](https://t.me/userinfobot).
3. W folderze `bot/` skopiuj `.env.example` do `.env` i uzupełnij `BOT_TOKEN` oraz `ADMIN_IDS` (kilka ID po przecinku).
4. Uruchom jedną linią:

```bash
cd bot && pip install -r requirements.txt && python bot.py
```

Token trzymamy tylko w `.env` (plik jest w `.gitignore`). Dane firmy (usługi, godziny, liczba miejsc) edytujesz w `bot/business.py`.

### Struktura bota

| Plik | Rola |
|---|---|
| `bot.py` | obsługa rozmowy (FSM), komendy `/start`, `/book`, `/my`, `/admin` |
| `db.py` | SQLite: rezerwacje, wolne terminy |
| `business.py` | dane firmy: usługi, godziny, pojemność |

## English

A demo website and Telegram bot for a small business (barbershop). Showcase project by **mistqkw**.

### What's inside

- **Landing page** (`index.html`, `style.css`, `main.js`): plain HTML/CSS/JS with its own layout and animations: a cursor-following "shadow" spotlight, parallax outline lettering, a manifesto that lights up word by word, a razor line drawn on scroll, a pinned horizontal-scroll price list (GSAP + ScrollTrigger, Lenis), a spinning barber pole, light and dark theme, mobile layout and an interactive booking "ticket" with service, day and time pickers (does not send data in the demo).
- **Telegram bot** (`bot/`, Python + aiogram 3): pick a service, day and time, enter name and phone, confirm, owner notification, `/my` (own bookings and cancelling), `/admin` (booking list for the owner). Data stored in SQLite.

### Running the site

Open `index.html` in a browser, or serve it with `python -m http.server 8000`. The online version is hosted on GitHub Pages.

### Running the bot

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Get your Telegram ID from [@userinfobot](https://t.me/userinfobot).
3. In `bot/`, copy `.env.example` to `.env` and fill in `BOT_TOKEN` and `ADMIN_IDS` (comma-separated).
4. Start it with one line:

```bash
cd bot && pip install -r requirements.txt && python bot.py
```

The token lives only in `.env` (git-ignored). Business data (services, opening hours, capacity) is edited in `bot/business.py`.

---
mistqkw · demo project
