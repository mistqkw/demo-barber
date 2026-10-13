"""Bot Telegram do rezerwacji terminów (aiogram 3)."""
import asyncio
import logging
import os
import re
from datetime import date
from html import escape

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from dotenv import load_dotenv

import business
import db

load_dotenv()
router = Router()
log = logging.getLogger("bot")

DAYS_PL = ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."]
PHONE_RE = re.compile(r"^\+?[0-9 \-]{7,16}$")


def admin_ids() -> set[int]:
    raw = os.getenv("ADMIN_IDS", "")
    return {int(x) for x in re.split(r"[,\s]+", raw) if x.strip().isdigit()}


def fmt_day(d: date) -> str:
    return f"{DAYS_PL[d.weekday()]} {d.day:02d}.{d.month:02d}"


class Book(StatesGroup):
    service = State()
    day = State()
    slot = State()
    name = State()
    phone = State()
    confirm = State()


def main_menu():
    kb = InlineKeyboardBuilder()
    kb.button(text="📅 Umów się", callback_data="book")
    kb.button(text="🗂 Moje rezerwacje", callback_data="my")
    kb.adjust(1)
    return kb.as_markup()


@router.message(CommandStart())
async def start(m: Message, state: FSMContext):
    await state.clear()
    await m.answer(
        f"Cześć! To <b>{escape(business.NAME)}</b> 👋\n"
        f"{escape(business.TAGLINE)}\n\nUmów termin w kilku kliknięciach.",
        reply_markup=main_menu(),
    )


@router.message(Command("cancel"))
async def cancel_flow(m: Message, state: FSMContext):
    await state.clear()
    await m.answer("Anulowano. Wpisz /start, aby zacząć od nowa.", reply_markup=ReplyKeyboardRemove())


@router.message(Command("book"))
@router.callback_query(F.data == "book")
async def choose_service(event: Message | CallbackQuery, state: FSMContext):
    await state.clear()
    kb = InlineKeyboardBuilder()
    for s in business.SERVICES:
        kb.button(text=f"{s['name']} · {s['price']}", callback_data=f"svc:{s['id']}")
    kb.adjust(1)
    text = f"{business.CHOOSE_PROMPT}"
    await state.set_state(Book.service)
    if isinstance(event, CallbackQuery):
        await event.message.answer(text, reply_markup=kb.as_markup())
        await event.answer()
    else:
        await event.answer(text, reply_markup=kb.as_markup())


@router.callback_query(Book.service, F.data.startswith("svc:"))
async def on_service(cb: CallbackQuery, state: FSMContext):
    svc = next((s for s in business.SERVICES if s["id"] == cb.data[4:]), None)
    if not svc:
        return await cb.answer("Nieznana usługa", show_alert=True)
    await state.update_data(service_id=svc["id"], service_name=svc["name"])
    days = db.open_days()
    if not days:
        await state.clear()
        await cb.message.answer("Brak wolnych terminów w najbliższych dniach. Spróbuj później.")
        return await cb.answer()
    kb = InlineKeyboardBuilder()
    for d in days:
        kb.button(text=fmt_day(d), callback_data=f"day:{d.isoformat()}")
    kb.adjust(3)
    await state.set_state(Book.day)
    await cb.message.answer(f"<b>{escape(svc['name'])}</b>\nWybierz dzień:", reply_markup=kb.as_markup())
    await cb.answer()


@router.callback_query(Book.day, F.data.startswith("day:"))
async def on_day(cb: CallbackQuery, state: FSMContext):
    day = date.fromisoformat(cb.data[4:])
    slots = db.free_slots(day)
    if not slots:
        return await cb.answer("Ten dzień jest już zajęty — wybierz inny.", show_alert=True)
    await state.update_data(day=day.isoformat())
    kb = InlineKeyboardBuilder()
    for s in slots:
        kb.button(text=s, callback_data=f"slot:{s}")
    kb.adjust(4)
    await state.set_state(Book.slot)
    await cb.message.answer(f"{fmt_day(day)} — wybierz godzinę:", reply_markup=kb.as_markup())
    await cb.answer()


@router.callback_query(Book.slot, F.data.startswith("slot:"))
async def on_slot(cb: CallbackQuery, state: FSMContext):
    await state.update_data(slot=cb.data[5:])
    kb = InlineKeyboardBuilder()
    first = cb.from_user.first_name
    if first:
        kb.button(text=f"To ja: {first}", callback_data="name:me")
    await state.set_state(Book.name)
    await cb.message.answer("Jak masz na imię? Wpisz imię lub użyj przycisku.", reply_markup=kb.as_markup())
    await cb.answer()


async def ask_phone(target: Message, state: FSMContext):
    await state.set_state(Book.phone)
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📞 Wyślij mój numer", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
    await target.answer("Podaj numer telefonu (np. +48 600 000 000) lub użyj przycisku.", reply_markup=kb)


@router.callback_query(Book.name, F.data == "name:me")
async def name_from_profile(cb: CallbackQuery, state: FSMContext):
    await state.update_data(name=cb.from_user.first_name)
    await ask_phone(cb.message, state)
    await cb.answer()


@router.message(Book.name, F.text)
async def on_name(m: Message, state: FSMContext):
    name = m.text.strip()
    if not 2 <= len(name) <= 40:
        return await m.answer("Imię powinno mieć od 2 do 40 znaków.")
    await state.update_data(name=name)
    await ask_phone(m, state)


async def show_confirm(m: Message, state: FSMContext):
    d = await state.get_data()
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Potwierdzam", callback_data="ok")
    kb.button(text="✖️ Anuluj", callback_data="no")
    kb.adjust(2)
    await state.set_state(Book.confirm)
    await m.answer(
        "Sprawdź dane:\n\n"
        f"🔹 {escape(d['service_name'])}\n"
        f"🗓 {fmt_day(date.fromisoformat(d['day']))}, godz. {d['slot']}\n"
        f"👤 {escape(d['name'])}\n"
        f"📞 {escape(d['phone'])}",
        reply_markup=kb.as_markup(),
    )


@router.message(Book.phone, F.contact)
async def phone_contact(m: Message, state: FSMContext):
    await state.update_data(phone=m.contact.phone_number)
    await m.answer("Dziękuję!", reply_markup=ReplyKeyboardRemove())
    await show_confirm(m, state)


@router.message(Book.phone, F.text)
async def phone_text(m: Message, state: FSMContext):
    phone = m.text.strip()
    if not PHONE_RE.match(phone):
        return await m.answer("Numer wygląda nieprawidłowo. Spróbuj np. +48 600 000 000.")
    await state.update_data(phone=phone)
    await m.answer("Dziękuję!", reply_markup=ReplyKeyboardRemove())
    await show_confirm(m, state)


@router.callback_query(Book.confirm, F.data == "no")
async def confirm_no(cb: CallbackQuery, state: FSMContext):
    await state.clear()
    await cb.message.answer("Rezerwacja anulowana. /start — zacznij od nowa.")
    await cb.answer()


@router.callback_query(Book.confirm, F.data == "ok")
async def confirm_ok(cb: CallbackQuery, state: FSMContext, bot: Bot):
    d = await state.get_data()
    bid = db.add_booking(
        cb.from_user.id, cb.from_user.username, d["name"], d["phone"],
        d["service_id"], d["service_name"], d["day"], d["slot"],
    )
    await state.clear()
    if bid is None:
        await cb.message.answer("Ups, ten termin właśnie został zajęty. Wybierz inny: /book")
        return await cb.answer()
    day = fmt_day(date.fromisoformat(d["day"]))
    await cb.message.answer(
        f"✅ Rezerwacja <b>#{bid}</b> potwierdzona!\n{escape(d['service_name'])}, {day} o {d['slot']}.\n"
        f"Do zobaczenia — {escape(business.ADDRESS)}.\nZmiana planów? Wpisz /my."
    )
    await cb.answer()
    who = f"@{cb.from_user.username}" if cb.from_user.username else f"id {cb.from_user.id}"
    note = (
        f"🆕 Nowa rezerwacja <b>#{bid}</b>\n{escape(d['service_name'])}\n"
        f"🗓 {day}, {d['slot']}\n👤 {escape(d['name'])} ({escape(who)})\n📞 {escape(d['phone'])}"
    )
    for admin in admin_ids():
        try:
            await bot.send_message(admin, note)
        except Exception as exc:  # właściciel mógł nie uruchomić bota
            log.warning("Nie wysłano powiadomienia do %s: %s", admin, exc)


def booking_line(b) -> str:
    return (f"#{b['id']} · {fmt_day(date.fromisoformat(b['day']))} {b['slot']} · "
            f"{escape(b['service_name'])}")


@router.message(Command("my"))
@router.callback_query(F.data == "my")
async def my_bookings(event: Message | CallbackQuery):
    user_id = event.from_user.id
    rows = db.by_user(user_id)
    target = event.message if isinstance(event, CallbackQuery) else event
    if not rows:
        await target.answer("Nie masz aktywnych rezerwacji. /book — umów się.")
    else:
        kb = InlineKeyboardBuilder()
        for b in rows:
            kb.button(text=f"Odwołaj #{b['id']}", callback_data=f"cx:{b['id']}")
        kb.adjust(2)
        await target.answer("Twoje rezerwacje:\n" + "\n".join(booking_line(b) for b in rows),
                            reply_markup=kb.as_markup())
    if isinstance(event, CallbackQuery):
        await event.answer()


@router.callback_query(F.data.startswith("cx:"))
async def cancel_booking(cb: CallbackQuery, bot: Bot):
    b = db.get(int(cb.data[3:]))
    if not b or (b["user_id"] != cb.from_user.id and cb.from_user.id not in admin_ids()):
        return await cb.answer("Nie znaleziono rezerwacji.", show_alert=True)
    if not db.cancel(b["id"]):
        return await cb.answer("Ta rezerwacja jest już nieaktywna.", show_alert=True)
    await cb.message.answer(f"Odwołano rezerwację #{b['id']}.")
    await cb.answer()
    if cb.from_user.id == b["user_id"]:
        for admin in admin_ids():
            try:
                await bot.send_message(admin, f"❌ Klient odwołał: {booking_line(b)} — {escape(b['name'])}")
            except Exception as exc:
                log.warning("Nie wysłano powiadomienia do %s: %s", admin, exc)
    else:
        try:
            await bot.send_message(b["user_id"], f"Twoja rezerwacja #{b['id']} została odwołana przez obsługę. "
                                                  "Przepraszamy! Umów nowy termin: /book")
        except Exception as exc:
            log.warning("Nie wysłano wiadomości do klienta: %s", exc)


@router.message(Command("admin"))
async def admin(m: Message):
    if m.from_user.id not in admin_ids():
        return await m.answer("Ta komenda jest tylko dla właściciela.")
    rows = db.upcoming()
    if not rows:
        return await m.answer("Brak nadchodzących rezerwacji.")
    out, last = [], None
    for b in rows:
        if b["day"] != last:
            last = b["day"]
            out.append(f"\n<b>{fmt_day(date.fromisoformat(last))}</b>")
        out.append(f"{b['slot']} · {escape(b['service_name'])} · {escape(b['name'])} · {escape(b['phone'])}"
                   f" (#{b['id']})")
    kb = InlineKeyboardBuilder()
    for b in rows[:12]:
        kb.button(text=f"Odwołaj #{b['id']}", callback_data=f"cx:{b['id']}")
    kb.adjust(3)
    await m.answer("📋 Nadchodzące rezerwacje:" + "\n".join(out), reply_markup=kb.as_markup())


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise SystemExit("Brak BOT_TOKEN. Skopiuj .env.example do .env i wpisz token od @BotFather.")
    db.init()
    bot = Bot(token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
