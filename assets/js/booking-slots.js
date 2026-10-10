/**
 * Grooming slot booking, shared by the checkout and the "Book a session" window.
 *
 * Free start times come from the Pawpad server (api.pawpad.in), which checks
 * existing bookings, admin blocks and the info@pawpad.in calendar. The server
 * checks everything again when the booking is saved, so a slot can never be
 * booked twice.
 */

const { useState: useStateSlots, useEffect: useEffectSlots } = React;

// Items that take a grooming slot. Boarding and courses stay as enquiries.
const SLOT_CATEGORIES = ["Grooming", "Wellness"];
// Used when someone books "Grooming" without choosing the exact service yet.
const UNSPECIFIED_GROOMING_SERVICE = "grooming-unspecified";

const PawpadSlots = {
  _cached: null,
  _cachedAt: 0,

  /** Free times for the next 30 days: { ok, days: [{date, times}], eveningTime, noEveningServices, error }. */
  async load(force) {
    if (!force && this._cached && Date.now() - this._cachedAt < 30000) return this._cached;
    if (!window.PawpadApi || !window.PawpadApi.isEnabled()) {
      return { ok: false, days: [], error: "Online booking is switched off." };
    }
    const result = await window.PawpadApi.call("booking_availability", {});
    const value = result.ok
      ? { ok: true, days: result.data.days || [], eveningTime: result.data.eveningTime || "19:00", noEveningServices: result.data.noEveningServices || [], error: "" }
      : {
          ok: false,
          days: [],
          error: (result.data && result.data.error) || "Online booking is not available right now. Please WhatsApp us on +91 91484 43330 to book."
        };
    if (value.ok) {
      this._cached = value;
      this._cachedAt = Date.now();
    }
    return value;
  },

  forget() {
    this._cached = null;
  },

  takesSlot(item) {
    return Boolean(item) && SLOT_CATEGORIES.includes(item.category);
  },

  /** Free times on a date for one service (7 PM only for services without a haircut / clipping). */
  timesFor(availability, date, serviceId, excluded) {
    if (!availability || !availability.ok) return [];
    const day = availability.days.find((d) => d.date === date);
    if (!day) return [];
    const noEvening = (availability.noEveningServices || []).includes(serviceId || UNSPECIFIED_GROOMING_SERVICE);
    return day.times.filter((t) => {
      if (noEvening && t === availability.eveningTime) return false;
      return !(excluded || []).some((x) => x.date === date && x.time === t);
    });
  },

  formatTime(time) {
    const [h, m] = String(time).split(":").map(Number);
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  },

  /** "2026-09-25" as a Date at local midnight (not UTC, so the day never shifts). */
  toDate(dateStr) {
    const [y, mo, d] = String(dateStr).split("-").map(Number);
    return new Date(y, mo - 1, d);
  },

  formatDate(dateStr, opts) {
    return this.toDate(dateStr).toLocaleDateString("en-IN", opts || { weekday: "short", day: "numeric", month: "short" });
  },

  /**
   * Books one slot per pet. Resolves to { ok, ref, bookings, error, taken }.
   */
  async book(payload) {
    const result = await window.PawpadApi.call("create_booking", payload);
    this.forget();
    if (result.ok) return { ok: true, ...result.data };
    return {
      ok: false,
      taken: (result.data && result.data.taken) || [],
      error: (result.data && result.data.error) || "Could not reach the Pawpad server. Please check your internet connection, or WhatsApp us on +91 91484 43330."
    };
  }
};

/**
 * Loads availability once when shown; returns [availability, reload].
 */
function useSlotAvailability(active) {
  const [availability, setAvailability] = useStateSlots(null);
  const reload = async (force) => {
    setAvailability(null);
    setAvailability(await PawpadSlots.load(force));
  };
  useEffectSlots(() => {
    if (active) reload(false);
  }, [active]);
  return [availability, reload];
}

/**
 * Date + time picker showing only free slots for one service.
 * value: { date, time }; excluded: slots already chosen by other pets in the same order.
 */
function SlotPicker({ availability, serviceId, value, onChange, excluded, onRetry }) {
  if (!availability) {
    return React.createElement("p", { className: "lead-sm slot-status" }, "Checking free times…");
  }
  if (!availability.ok) {
    return React.createElement(
      "div",
      { className: "slot-status slot-error", role: "alert" },
      React.createElement("p", null, availability.error),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 } },
        onRetry && React.createElement("button", { type: "button", className: "btn btn-ghost", onClick: onRetry }, "Try again"),
        React.createElement("a", { className: "btn btn-primary", href: "https://wa.me/919148443330?text=" + encodeURIComponent("Hi Pawpad, I would like to book a grooming slot."), target: "_blank", rel: "noopener" }, "WhatsApp us")
      )
    );
  }

  const selected = value || {};
  const times = selected.date ? PawpadSlots.timesFor(availability, selected.date, serviceId, excluded) : [];
  const noEvening = (availability.noEveningServices || []).includes(serviceId || UNSPECIFIED_GROOMING_SERVICE);

  return React.createElement(
    "div",
    { className: "slot-picker" },
    React.createElement(
      "div",
      { className: "date-picker-wrap" },
      React.createElement("label", { className: "sub-label" }, "Select Date (next 30 days)"),
      React.createElement(
        "div",
        { className: "date-chip-grid" },
        availability.days.map((day) => {
          const d = PawpadSlots.toDate(day.date);
          const isClosed = d.getDay() === 4;
          const free = PawpadSlots.timesFor(availability, day.date, serviceId, excluded);
          const disabled = isClosed || free.length === 0;
          const isSel = selected.date === day.date;
          return React.createElement(
            "button",
            {
              type: "button",
              key: day.date,
              className: "date-chip " + (isSel ? "active " : "") + (disabled ? "closed" : ""),
              onClick: () => !disabled && onChange({ date: day.date, time: null }),
              disabled,
              "data-date": day.date,
              title: isClosed ? "Closed on Thursdays" : (free.length === 0 ? "Fully booked" : undefined)
            },
            React.createElement("span", { className: "d-day" }, d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })),
            React.createElement("strong", { className: "d-num" }, d.getDate()),
            React.createElement("span", { className: "d-mon" }, d.toLocaleDateString("en-IN", { month: "short" })),
            disabled && React.createElement("span", { className: "d-closed" }, isClosed ? "Closed" : "Full")
          );
        })
      )
    ),
    selected.date && React.createElement(
      "div",
      { className: "time-picker-wrap", style: { marginTop: 20 } },
      React.createElement("label", { className: "sub-label" }, `Free times on ${PawpadSlots.formatDate(selected.date, { weekday: "long", day: "numeric", month: "long" })}`),
      times.length === 0
        ? React.createElement("p", { className: "lead-sm" }, "No free times left on this day. Please pick another date.")
        : React.createElement(
            "div",
            { className: "time-chip-grid" },
            times.map((t) =>
              React.createElement(
                "button",
                {
                  type: "button",
                  key: t,
                  "data-time": t,
                  className: "time-chip " + (selected.time === t ? "active" : ""),
                  onClick: () => onChange({ date: selected.date, time: t })
                },
                PawpadSlots.formatTime(t)
              )
            )
          ),
      noEvening && React.createElement("p", { className: "lead-sm", style: { marginTop: 10, fontSize: 13 } },
        "The 7:00 PM slot is only for services without a haircut or clipping.")
    )
  );
}

Object.assign(window, { PawpadSlots, SlotPicker, useSlotAvailability, UNSPECIFIED_GROOMING_SERVICE });
