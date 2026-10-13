"""Dane firmy (przykładowe). Zmień je pod konkretnego klienta."""

NAME = 'Brzytwa & Cień'
TAGLINE = 'Barbershop w centrum Krakowa'
ADDRESS = 'ul. Przykładowa 12/3, 31-000 Kraków'
CHOOSE_PROMPT = 'Wybierz usługę:'

# Długość jednego terminu w minutach oraz liczba równoległych miejsc (fotele, stoliki, stanowiska).
SLOT_MIN = 30
CAPACITY = 2
DAYS_AHEAD = 14

# Godziny otwarcia: 0 = poniedziałek ... 6 = niedziela; None = zamknięte.
HOURS = {
    0: ('10:00', '20:00'),
    1: ('10:00', '20:00'),
    2: ('10:00', '20:00'),
    3: ('10:00', '20:00'),
    4: ('10:00', '20:00'),
    5: ('09:00', '16:00'),
    6: None,
}

SERVICES = [
    {'id': 'cut', 'name': 'Strzyżenie klasyczne', 'price': '80 zł', 'duration': '45 min'},
    {'id': 'cutbeard', 'name': 'Strzyżenie + broda', 'price': '130 zł', 'duration': '70 min'},
    {'id': 'beard', 'name': 'Broda i gorący ręcznik', 'price': '70 zł', 'duration': '30 min'},
    {'id': 'shave', 'name': 'Golenie brzytwą', 'price': '90 zł', 'duration': '40 min'},
    {'id': 'kid', 'name': 'Strzyżenie dziecięce', 'price': '60 zł', 'duration': '30 min'},
    {'id': 'wedding', 'name': 'Pakiet ślubny', 'price': '250 zł', 'duration': '90 min'},
]
