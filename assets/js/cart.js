
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

const CART_CATALOG = [
  // Courses
  {
    id: "foundation-grooming",
    title: "Foundation Course in Grooming",
    category: "Courses",
    price: 95000,
    priceDisplay: "₹95,000",
    desc: "7-week foundation-level grooming certification for beginners (dogs & cats)",
    requiresPetInfo: false,
    img: "assets/img/pawpad/course-dog-grooming.webp"
  },
  {
    id: "essentials-dog-grooming",
    title: "Essentials Dog Grooming",
    category: "Courses",
    price: 30000,
    priceDisplay: "₹30,000",
    desc: "5-day hands-on introduction to professional dog grooming",
    requiresPetInfo: false,
    isDogOnly: true,
    img: "assets/img/pawpad/course-dog-grooming.webp"
  },
  {
    id: "essentials-cat-grooming",
    title: "Essentials Cat Grooming",
    category: "Courses",
    price: 30000,
    priceDisplay: "₹30,000",
    desc: "5-day hands-on introductory course in feline grooming and handling",
    requiresPetInfo: false,
    isCatOnly: true,
    img: "assets/img/pawpad/course-cat-grooming.webp"
  },
  {
    id: "practitioner-dog-grooming",
    title: "Practitioner Dog Grooming",
    category: "Courses",
    price: 50000,
    priceDisplay: "₹50,000",
    desc: "3-week practitioner-level programme in canine grooming and scissoring",
    requiresPetInfo: false,
    isDogOnly: true,
    img: "assets/img/pawpad/course-dog-grooming.webp"
  },
  {
    id: "practitioner-cat-grooming",
    title: "Practitioner Cat Grooming",
    category: "Courses",
    price: 50000,
    priceDisplay: "₹50,000",
    desc: "3-week intensive feline grooming mastery and live styling",
    requiresPetInfo: false,
    isCatOnly: true,
    img: "assets/img/pawpad/course-cat-grooming.webp"
  },
  // Studio Setup & Business Consulting
  {
    id: "studio-consulting-online",
    title: "Remote Video Consultation (Studio Setup)",
    category: "Studio Setup",
    price: 20000,
    priceDisplay: "₹20,000",
    desc: "1:1 remote video session with equipment review, spatial layout guidance, budget validation, and vendor notes",
    requiresPetInfo: false,
    img: "assets/img/pawpad/studio-setup-overview.webp"
  },
  {
    id: "studio-consulting-in-person",
    title: "On-Site Studio Blueprint & Setup (In-Person)",
    category: "Studio Setup",
    price: 35000,
    priceDisplay: "₹35,000",
    desc: "Full physical studio layout consultation, plumbing/electrical review, on-site walkthrough, and comprehensive equipment blueprint",
    requiresPetInfo: false,
    img: "assets/img/pawpad/studio-setup-overview.webp"
  },
  // Boarding
  {
    id: "boarding-trial-day",
    title: "Trial Day Boarding",
    category: "Boarding",
    price: 850,
    priceDisplay: "₹850",
    desc: "Mandatory assessment trial day for small dogs before overnight stays",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/boarding-sleeping-puppy-toy.webp"
  },
  {
    id: "boarding-overnight",
    title: "Overnight Boarding",
    category: "Boarding",
    price: 1000,
    priceDisplay: "₹1,000 / night",
    desc: "Calm, supervised overnight stay for small dogs (trial day mandatory)",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    requiresTrialDayCheck: true,
    img: "assets/img/pawpad/boarding-dog-sleep-mask.webp"
  },
  // Grooming Services & Add-ons
  {
    id: "nail-clipping",
    title: "Nail Clipping",
    category: "Grooming",
    price: 250,
    priceDisplay: "₹250",
    desc: "Slow, gentle nail care for pets who need a quick maintenance visit",
    requiresPetInfo: true,
    allowPetTypeSelection: true,
    img: "assets/img/pawpad/grooming-page-grooming-nail-clipping.webp"
  },
  {
    id: "massage",
    title: "Pre & Post Grooming Massage",
    category: "Wellness",
    price: 1500,
    priceDisplay: "₹1,500",
    desc: "A quiet pre & post grooming relaxation massage add-on",
    requiresPetInfo: true,
    allowPetTypeSelection: true,
    img: "assets/img/pawpad/grooming-page-grooming-massage.webp"
  },
  {
    id: "hygiene-clip",
    title: "Hygiene Clip",
    category: "Grooming",
    price: 850,
    priceDisplay: "₹850",
    desc: "Focused sanitary trimming and paw tidying",
    requiresPetInfo: true,
    allowPetTypeSelection: true,
    img: "assets/img/pawpad/grooming-page-grooming-hygine-clip.webp"
  },
  {
    id: "dog-short",
    title: "Dog Grooming | Short Hair",
    category: "Grooming",
    price: 1600,
    priceDisplay: "₹1,600",
    desc: "A complete grooming reset for short-coated dogs",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-dog-short-hair-image.webp"
  },
  {
    id: "dog-long",
    title: "Dog Grooming | Long Hair",
    category: "Grooming",
    price: 2000,
    priceDisplay: "₹2,000",
    desc: "Maintenance and detailed coat care for longer coats",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-gromming-long-hair-dog.webp"
  },
  {
    id: "dog-grooming-long-hair",
    title: "Dog Grooming Long Hair with haircut",
    category: "Grooming",
    price: 2500,
    priceDisplay: "₹2,500",
    desc: "Full styling session with scissoring & haircut for long-coated dogs",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-dog-long-hair-haircut.webp"
  },
  {
    id: "puppy-short",
    title: "Puppy Grooming | Short Hair",
    category: "Grooming",
    price: 1000,
    priceDisplay: "₹1,000",
    desc: "Gentle introductions for puppies below 6 months",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-puppy-short-hair-image.webp"
  },
  {
    id: "puppy-long",
    title: "Puppy Grooming | Long Hair",
    category: "Grooming",
    price: 1500,
    priceDisplay: "₹1,500",
    desc: "Extra coat care & deshedding for long-coated puppies",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-puppy-long-hair-image.webp"
  },
  {
    id: "matted-dogs",
    title: "Matted Dogs Care",
    category: "Grooming",
    price: 850,
    priceDisplay: "₹850",
    desc: "Careful support and assessment for tangled coats",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/grooming-page-grooming-matted-dogs.webp"
  },
  // Cat Grooming
  {
    id: "cat-short",
    title: "Cat Grooming | Short Hair",
    category: "Grooming",
    price: 1500,
    priceDisplay: "₹1,500",
    desc: "Calm coat and hygiene care for short-haired cats",
    requiresPetInfo: true,
    isCatOnly: true,
    petType: "Cat",
    img: "assets/img/pawpad/cat-grooming-short-hair.webp"
  },
  {
    id: "cat-long",
    title: "Cat Grooming | Long Hair",
    category: "Grooming",
    price: 2000,
    priceDisplay: "₹2,000",
    desc: "Extra support for long coats, sanitary trim & dematting",
    requiresPetInfo: true,
    isCatOnly: true,
    petType: "Cat",
    img: "assets/img/pawpad/cat-grooming-long-hair.webp"
  },
  {
    id: "cat-haircut",
    title: "Cat Hair Cut",
    category: "Grooming",
    price: 1500,
    priceDisplay: "₹1,500",
    desc: "Complete haircut and gentle care session for cats",
    requiresPetInfo: true,
    isCatOnly: true,
    petType: "Cat",
    img: "assets/img/pawpad/cat-hair-cut.webp"
  },
  {
    id: "bath-brush-dogs",
    title: "Bath & Brush | Dogs",
    category: "Grooming",
    price: 999,
    priceDisplay: "₹999",
    desc: "A fast, no-fuss clean for dogs who don't need a full groom — just a wash, dry, and brush-out between full sessions.",
    requiresPetInfo: true,
    isDogOnly: true,
    petType: "Dog",
    img: "assets/img/pawpad/bath-brush-dogs.webp"
  },
  {
    id: "bath-brush-cats",
    title: "Bath & Brush | Cats",
    category: "Grooming",
    price: 999,
    priceDisplay: "₹999",
    desc: "A fast, no-fuss clean for cats who don't need a full groom — just a wash, dry, and brush-out between full sessions.",
    requiresPetInfo: true,
    isCatOnly: true,
    petType: "Cat",
    img: "assets/img/pawpad/bath-brush-cats.webp"
  },
  {
    id: "bath-brush-subscription",
    title: "Bath & Brush Subscription package",
    category: "Grooming",
    price: 3496.5,
    priceDisplay: "₹3,496.50",
    desc: "Keep your pet's coat consistently clean and healthy with regular bath-and-brush visits, spaced through the month.",
    requiresPetInfo: true,
    allowPetTypeSelection: true,
    img: "assets/img/pawpad/bath-brush-subscription.webp"
  }
];

function getRecommendedAdditions(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return CART_CATALOG.filter((c) => c.category === "Courses").slice(0, 3);
  }

  const inCartIds = new Set(cartItems.map((i) => i.id));

  const hasDogGrooming = cartItems.some((i) => {
    const id = (i.id || "").toLowerCase();
    const title = (i.title || "").toLowerCase();
    const cat = (i.category || "").toLowerCase();
    const isCat = id.includes("cat") || title.includes("cat") || !!i.isCatOnly;
    return (
      !isCat &&
      (cat === "grooming" ||
        cat === "wellness" ||
        cat === "styling" ||
        cat === "care" ||
        id.includes("dog") ||
        id.includes("puppy") ||
        id.includes("matted") ||
        id.includes("nail") ||
        id.includes("hygiene") ||
        id.includes("massage") ||
        !!i.isDogOnly)
    );
  });

  const hasCatGrooming = cartItems.some((i) => {
    const id = (i.id || "").toLowerCase();
    const title = (i.title || "").toLowerCase();
    return id.includes("cat") || title.includes("cat") || !!i.isCatOnly;
  });

  const hasCourse = cartItems.some((i) => {
    const id = (i.id || "").toLowerCase();
    const cat = (i.category || "").toLowerCase();
    return (
      cat === "courses" ||
      id.includes("course") ||
      id.includes("grooming-") ||
      id.includes("foundation") ||
      id.includes("practitioner") ||
      id.includes("essentials")
    );
  });

  const hasBoarding = cartItems.some((i) => {
    const id = (i.id || "").toLowerCase();
    const cat = (i.category || "").toLowerCase();
    return cat === "boarding" || id.startsWith("boarding-");
  });

  let candidateIds = [];

  // Rule 1: If dog related grooming services are added, display related dog grooming services or trial day / overnight stay
  if (hasDogGrooming) {
    candidateIds.push(
      "nail-clipping",
      "massage",
      "hygiene-clip",
      "boarding-trial-day",
      "boarding-overnight",
      "dog-short",
      "dog-long",
      "dog-grooming-long-hair",
      "puppy-short",
      "matted-dogs"
    );
  }

  // Rule 2: If cat grooming is added, display related cat grooming services
  if (hasCatGrooming) {
    candidateIds.push(
      "cat-short",
      "cat-long",
      "cat-haircut",
      "nail-clipping",
      "hygiene-clip",
      "essentials-cat-grooming"
    );
  }

  // Rule 3: If course is added, display other courses
  if (hasCourse) {
    candidateIds.push(
      "foundation-grooming",
      "essentials-dog-grooming",
      "essentials-cat-grooming",
      "practitioner-dog-grooming",
      "practitioner-cat-grooming"
    );
  }

  // Rule 4: If any boarding service is added, display dog grooming related services (and boarding pairing)
  if (hasBoarding) {
    if (inCartIds.has("boarding-overnight") && !inCartIds.has("boarding-trial-day")) {
      candidateIds.push("boarding-trial-day");
    } else if (inCartIds.has("boarding-trial-day") && !inCartIds.has("boarding-overnight")) {
      candidateIds.push("boarding-overnight");
    }
    candidateIds.push(
      "nail-clipping",
      "massage",
      "hygiene-clip",
      "dog-short",
      "dog-long",
      "dog-grooming-long-hair"
    );
  }

  // Deduplicate and filter out items already in cart
  const seen = new Set();
  const recommendations = [];

  for (const cid of candidateIds) {
    if (!inCartIds.has(cid) && !seen.has(cid)) {
      seen.add(cid);
      const catalogItem = CART_CATALOG.find((c) => c.id === cid);
      if (catalogItem) {
        recommendations.push(catalogItem);
      }
    }
  }

  // Fallback if needed
  if (recommendations.length < 3) {
    for (const c of CART_CATALOG) {
      if (!inCartIds.has(c.id) && !seen.has(c.id)) {
        if (hasCatGrooming && !hasDogGrooming && !hasBoarding && c.isDogOnly) {
          continue;
        }
        seen.add(c.id);
        recommendations.push(c);
        if (recommendations.length >= 3) break;
      }
    }
  }

  return recommendations.slice(0, 3);
}

function formatInr(amount) {
  const num = Number(amount) || 0;
  if (num % 1 !== 0) {
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString("en-IN");
}

const CART_STORAGE_KEY = "pawpad_cart_v1";

const PawpadCartStore = {
  getItems() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const items = stored ? JSON.parse(stored) : [];
      let modified = false;
      const catalog = typeof CART_CATALOG !== "undefined" ? CART_CATALOG : [];
      const sanitized = items.map((item) => {
        const cat = catalog.find((c) => c.id === item.id);
        if (cat && cat.price !== undefined && (item.price === 349650 || (item.price > 100000 && cat.price < 10000))) {
          modified = true;
          return {
            ...item,
            price: cat.price,
            priceDisplay: cat.priceDisplay || `₹${formatInr(cat.price)}`
          };
        }
        return item;
      });
      if (modified) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch (e) {
      console.warn("Could not read cart from localStorage", e);
      return [];
    }
  },
  saveItems(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("pawpad-cart-updated", { detail: items }));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  },
  addItem(item) {
    const items = this.getItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    const catalogItem = (typeof CART_CATALOG !== "undefined" ? CART_CATALOG : []).find((c) => c.id === item.id) || {};

    const isDogOnly = item.isDogOnly !== undefined ? !!item.isDogOnly : (catalogItem.isDogOnly !== undefined ? !!catalogItem.isDogOnly : item.category === "Boarding");
    const isCatOnly = item.isCatOnly !== undefined ? !!item.isCatOnly : (catalogItem.isCatOnly !== undefined ? !!catalogItem.isCatOnly : false);
    const petType = item.petType || catalogItem.petType || (isDogOnly ? "Dog" : isCatOnly ? "Cat" : undefined);
    const allowPetTypeSelection = item.allowPetTypeSelection !== undefined ? !!item.allowPetTypeSelection : (catalogItem.allowPetTypeSelection !== undefined ? !!catalogItem.allowPetTypeSelection : false);

    const priceNum = typeof item.price === "number" && !isNaN(item.price)
      ? item.price
      : (catalogItem.price !== undefined
        ? catalogItem.price
        : parseFloat(String(item.price || "0").replace(/,/g, "").replace(/[^0-9.]/g, "")) || 1000);

    if (existingIndex > -1) {
      items[existingIndex].quantity = (items[existingIndex].quantity || 1) + 1;
      if (item.isDogOnly !== undefined) items[existingIndex].isDogOnly = isDogOnly;
      if (item.isCatOnly !== undefined) items[existingIndex].isCatOnly = isCatOnly;
      if (item.petType !== undefined) items[existingIndex].petType = petType;
      if (item.allowPetTypeSelection !== undefined) items[existingIndex].allowPetTypeSelection = allowPetTypeSelection;
      if (item.img) items[existingIndex].img = item.img;
      if (priceNum) items[existingIndex].price = priceNum;
    } else {
      items.push({
        id: item.id || `item-${Date.now()}`,
        title: item.title || catalogItem.title || "Custom Service",
        category: item.category || catalogItem.category || "Service",
        price: priceNum,
        priceDisplay: item.priceDisplay || catalogItem.priceDisplay || `₹${formatInr(priceNum)}`,
        desc: item.desc || catalogItem.desc || "",
        requiresPetInfo: item.requiresPetInfo !== undefined ? item.requiresPetInfo !== false : (catalogItem.requiresPetInfo !== false),
        isDogOnly: isDogOnly,
        isCatOnly: isCatOnly,
        petType: petType,
        allowPetTypeSelection: allowPetTypeSelection,
        requiresTrialDayCheck: item.requiresTrialDayCheck !== undefined ? !!item.requiresTrialDayCheck : (catalogItem.requiresTrialDayCheck !== undefined ? !!catalogItem.requiresTrialDayCheck : (item.id === "boarding-overnight")),
        img: item.img || catalogItem.img || "assets/img/pawpad/landing-page-cover.webp",
        quantity: 1
      });
    }
    this.saveItems(items);
    return items;
  },
  updateQuantity(id, delta) {
    let items = this.getItems();
    const index = items.findIndex((i) => i.id === id);
    if (index > -1) {
      const newQty = (items[index].quantity || 1) + delta;
      if (newQty <= 0) {
        items = items.filter((i) => i.id !== id);
      } else {
        items[index].quantity = newQty;
      }
      this.saveItems(items);
    }
    return items;
  },
  removeItem(id) {
    const items = this.getItems().filter((i) => i.id !== id);
    this.saveItems(items);
    return items;
  },
  clearCart() {
    this.saveItems([]);
    return [];
  },
  getTotalCount() {
    return this.getItems().reduce((acc, item) => acc + (item.quantity || 1), 0);
  },
  getSubtotal() {
    return this.getItems().reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1), 0);
  },
  requiresPetInfo() {
    const items = this.getItems();
    if (items.length === 0) return true;
    return items.some((item) => item.requiresPetInfo !== false);
  }
};

// Cart Drawer Component (Side Window)
function CartDrawer({ open, onClose, onCheckout }) {
  const [items, setItems] = useStateC(PawpadCartStore.getItems());

  useEffectC(() => {
    const onCartUpdate = (e) => {
      setItems(e.detail || PawpadCartStore.getItems());
    };
    window.addEventListener("pawpad-cart-updated", onCartUpdate);
    setItems(PawpadCartStore.getItems());
    return () => window.removeEventListener("pawpad-cart-updated", onCartUpdate);
  }, []);


  useEffectC(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const onKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, onClose]);

  if (!open) return null;

  const totalCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const subtotal = items.reduce((acc, i) => acc + (Number(i.price) || 0) * (i.quantity || 1), 0);

  const handleAddQuick = (catItem) => {
    PawpadCartStore.addItem(catItem);
  };

  return React.createElement(
    "div",
    { className: "cart-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Shopping cart drawer" },
    React.createElement("div", { className: "cart-backdrop", onClick: onClose }),
    React.createElement(
      "div",
      { className: "cart-drawer" },
      // Header
      React.createElement(
        "div",
        { className: "cart-header" },
        React.createElement(
          "div",
          { className: "cart-title-wrap" },
          React.createElement("span", { className: "cart-icon-badge" }, React.createElement(CartIcon, { size: 18 })),
          React.createElement("h3", { className: "cart-heading" }, "Your Cart"),
          React.createElement(
            "span",
            { className: "cart-item-pill" },
            `${totalCount} ${totalCount === 1 ? "item" : "items"}`
          )
        ),
        React.createElement(
          "button",
          { className: "cart-close-btn", onClick: onClose, "aria-label": "Close cart" },
          "×"
        )
      ),

      // Body / Item list
      React.createElement(
        "div",
        { className: "cart-body" },
        items.length === 0
          ? React.createElement(
            "div",
            { className: "cart-empty-state" },
            React.createElement("div", { className: "cart-empty-paw" }, React.createElement(PawIcon, { size: 48, color: "var(--driftwood)" })),
            React.createElement("h4", null, "Your cart is empty"),
            React.createElement("p", null, "Add professional pet grooming courses and certificate programs to get started."),
            React.createElement(
              "div",
              { className: "cart-suggested-wrap" },
              React.createElement("p", { className: "cart-suggested-label" }, "Popular Grooming Courses"),
              React.createElement(
                "div",
                { className: "cart-suggested-list" },
                CART_CATALOG.filter((c) => c.category === "Courses").slice(0, 3).map((item) =>
                  React.createElement(
                    "div",
                    { key: item.id, className: "cart-suggest-card" },
                    React.createElement("img", { src: item.img, alt: item.title, className: "cart-suggest-img" }),
                    React.createElement(
                      "div",
                      { className: "cart-suggest-info" },
                      React.createElement("strong", null, item.title),
                      React.createElement("span", { className: "cart-suggest-price" }, item.priceDisplay)
                    ),
                    React.createElement(
                      "button",
                      {
                        className: "btn btn-cream btn-sm",
                        onClick: () => handleAddQuick(item)
                      },
                      "+ Add"
                    )
                  )
                )
              )
            )
          )
          : React.createElement(
            "div",
            { className: "cart-items-list" },
            items.map((item) =>
              React.createElement(
                "div",
                { key: item.id, className: "cart-item-card" },
                React.createElement("img", { src: item.img, alt: item.title, className: "cart-item-img" }),
                React.createElement(
                  "div",
                  { className: "cart-item-details" },
                  React.createElement(
                    "div",
                    { className: "cart-item-top" },
                    React.createElement("span", { className: "cart-item-cat" }, item.category || "Service"),
                    React.createElement(
                      "button",
                      {
                        className: "cart-item-remove",
                        onClick: () => PawpadCartStore.removeItem(item.id),
                        "aria-label": `Remove ${item.title}`
                      },
                      "✕"
                    )
                  ),
                  React.createElement("h5", { className: "cart-item-title" }, item.title),
                  item.desc ? React.createElement("p", { className: "cart-item-desc" }, item.desc) : null,
                  isPerNightItem(item) && React.createElement("p", { className: "cart-item-desc", "data-per-night-hint": true, style: { fontWeight: 600 } },
                    `${item.quantity || 1} dog${(item.quantity || 1) === 1 ? "" : "s"}, per night. You'll choose check-in and check-out dates at checkout.`),
                  React.createElement(
                    "div",
                    { className: "cart-item-bottom" },
                    React.createElement("span", { className: "cart-item-price" }, `₹${formatInr(item.price * (item.quantity || 1))}${isPerNightItem(item) ? " / night" : ""}`),
                    React.createElement(
                      "div",
                      { className: "cart-qty-stepper" },
                      React.createElement(
                        "button",
                        {
                          onClick: () => PawpadCartStore.updateQuantity(item.id, -1),
                          "aria-label": "Decrease quantity"
                        },
                        "−"
                      ),
                      React.createElement("span", null, item.quantity || 1),
                      React.createElement(
                        "button",
                        {
                          onClick: () => PawpadCartStore.updateQuantity(item.id, 1),
                          "aria-label": "Increase quantity"
                        },
                        "+"
                      )
                    )
                  )
                )
              )
            ),
            (() => {
              const recommendations = getRecommendedAdditions(items);
              if (!recommendations || recommendations.length === 0) return null;
              return React.createElement(
                "div",
                { className: "cart-addons-section" },
                React.createElement("p", { className: "cart-addons-title" }, "Recommended Additions"),
                React.createElement(
                  "div",
                  { className: "cart-addons-slider" },
                  recommendations.map((addon) =>
                    React.createElement(
                      "div",
                      { key: addon.id, className: "cart-addon-pill" },
                      React.createElement(
                        "div",
                        { className: "cart-addon-info-wrap" },
                        React.createElement("span", { className: "cart-addon-name" }, addon.title),
                        React.createElement("span", { className: "cart-addon-price" }, ` · ${addon.priceDisplay}`)
                      ),
                      React.createElement(
                        "button",
                        {
                          className: "cart-addon-add",
                          onClick: () => handleAddQuick(addon),
                          "aria-label": `Add ${addon.title}`
                        },
                        "+"
                      )
                    )
                  )
                )
              );
            })()
          )
      ),

      // Footer
      items.length > 0 &&
      React.createElement(
        "div",
        { className: "cart-footer" },
        React.createElement(
          "div",
          { className: "cart-subtotal-row" },
          React.createElement("span", { className: "cart-subtotal-label" }, "Subtotal"),
          React.createElement("span", { className: "cart-subtotal-val" }, `₹${formatInr(subtotal)}`)
        ),
        React.createElement(
          "p",
          { className: "cart-tax-note" },
          "Taxes & personalized scheduling confirmed at studio upon session."
        ),
        React.createElement(
          "button",
          {
            className: "btn btn-primary cart-checkout-btn",
            onClick: () => {
              onClose();
              onCheckout();
            }
          },
          "Proceed to Checkout ",
          React.createElement(Arrow, null)
        ),
        React.createElement(
          "button",
          {
            className: "cart-clear-link",
            onClick: () => PawpadCartStore.clearCart()
          },
          "Empty cart"
        )
      )
    )
  );
}

// Checkout Modal Component
const PET_TYPES_CHECKOUT = ["Dog", "Cat"];
const COAT_TYPES_CHECKOUT = ["Short", "Medium", "Long"];
const SIZES_DOG_CHECKOUT = ["Small (<10kg)", "Medium (10–25kg)", "Large (25kg+)"];
const SIZES_CAT_CHECKOUT = ["Kitten / Small (<3kg)", "Medium (3–6kg)", "Large (6kg+)"];
const SIZES_CHECKOUT = SIZES_DOG_CHECKOUT;
const TEMPERAMENTS_CHECKOUT = ["Chill & Friendly", "Excitable / Playful", "Anxious / Sensitive", "First-time visit"];

const FLEXIBLE_PET_TYPE_SERVICES = [
  "hygiene-clip",
  "nail-clipping",
  "massage",
  "bath-brush-subscription"
];

// Boarding can be requested up to about 3 months ahead; other enquiries up to 14 days.
const BOARDING_DAYS_AHEAD = 92;

/** "2026-12-24" (local date, as a date box gives it) for a Date. */
function localDateValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Overnight boarding is priced per dog, per night: the cart quantity is the number of dogs,
 * and the nights come from the check-in and check-out dates chosen at checkout.
 */
function isPerNightItem(item) {
  return Boolean(item) && item.category === "Boarding" && (item.id === "boarding-overnight" || /night/i.test(String(item.priceDisplay || "")));
}
const BOARDING_MAX_NIGHTS = 60;

/** Nights between check-in and check-out (date strings from the date boxes); 0 if either is missing. */
function stayNights(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const a = new Date(startIso);
  const b = new Date(endIso);
  const n = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  return n > 0 ? n : 0;
}

function generateCheckoutDates() {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const CHECKOUT_TIMES = ["11:00 AM", "12:00 PM", "1:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];

function derivePetSlots(items) {
  const petItems = (items || []).filter(
    (i) => i.requiresPetInfo !== false && i.category !== "Courses"
  );
  if (petItems.length === 0) return [];

  const hasCat = petItems.some((i) => i.isCatOnly || i.petType === "Cat");
  const hasDog = petItems.some((i) => i.isDogOnly || i.petType === "Dog" || i.category === "Boarding");

  const slots = [];

  petItems.forEach((item) => {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const isCat = !!(item.isCatOnly || item.petType === "Cat");
    const isDog = !!(item.isDogOnly || item.petType === "Dog" || item.category === "Boarding");
    const isFlexible = !!(item.allowPetTypeSelection || (!isCat && !isDog));
    // Stays that need a trial day first (set per boarding package in the admin panel).
    const isOvernight = item.requiresTrialDayCheck !== undefined ? !!item.requiresTrialDayCheck : item.id === "boarding-overnight";

    // Default pet type for flexible service: if only cat services exist in cart, default to Cat, else Dog
    const defaultFlexibleType = (hasCat && !hasDog) ? "Cat" : "Dog";

    for (let q = 0; q < qty; q++) {
      slots.push({
        id: `${item.id}-${slots.length}`,
        serviceId: item.id,
        serviceTitle: item.title + (qty > 1 ? (item.category === "Boarding" ? ` (Dog ${q + 1})` : ` (Slot #${q + 1})`) : ""),
        price: typeof item.price === "number" && !isNaN(item.price) ? item.price : null,
        petType: isCat ? "Cat" : (isDog ? "Dog" : defaultFlexibleType),
        isDogOnly: isDog && !isFlexible,
        isCatOnly: isCat && !isFlexible,
        allowPetTypeSelection: isFlexible,
        isOvernight: isOvernight,
        // Grooming services each take one real studio slot; boarding stays an enquiry.
        takesSlot: typeof PawpadSlots !== "undefined" && PawpadSlots.takesSlot(item)
      });
    }
  });

  return slots;
}

/** The Trial Day price from Website Content CMS → Boarding (₹850 if it can't be read). */
function boardingTrialDayPrice() {
  try {
    const boarding = window.PawpadContentStore && window.PawpadContentStore.get("boarding");
    const trial = boarding && Array.isArray(boarding.packages)
      ? boarding.packages.find((p) => p && (p.key === "trial-day" || String(p.title || "").toLowerCase().includes("trial")))
      : null;
    const n = trial ? parseFloat(String(trial.price || trial.priceNum || "").replace(/[^0-9.]/g, "")) : NaN;
    return n > 0 ? n : 850;
  } catch (e) {
    return 850;
  }
}

function CheckoutModal({ open, onClose }) {
  const [items, setItems] = useStateC(PawpadCartStore.getItems());
  const [step, setStep] = useStateC(0);
  const [completedOrder, setCompletedOrder] = useStateC(null);

  const [customerData, setCustomerData] = useStateC({
    name: "",
    email: "",
    phone: "",
    area: "",
    contactMethod: "WhatsApp",
    date: null,
    endDate: null,
    time: null,
    notes: ""
  });

  const [petSlots, setPetSlots] = useStateC([]);
  const [pets, setPets] = useStateC([]);
  const [activePetIndex, setActivePetIndex] = useStateC(0);
  // One chosen { date, time } per pet that needs a grooming slot (same order as petSlots).
  const [slotChoices, setSlotChoices] = useStateC([]);
  const [bookingError, setBookingError] = useStateC("");
  const [placing, setPlacing] = useStateC(false);
  const [availability, reloadAvailability] = typeof useSlotAvailability === "function" ? useSlotAvailability(open) : [null, () => {}];
  // Nights already full or nearly full (confirmed stays), so a full night is flagged before sending.
  const [boardingNights, setBoardingNights] = useStateC(null);
  useEffectC(() => {
    if (!open || !window.PawpadApi || !window.PawpadApi.isEnabled()) return;
    if (!PawpadCartStore.getItems().some(isPerNightItem)) return;
    window.PawpadApi.call("boarding_availability", {}).then((r) => { if (r.ok) setBoardingNights(r.data); });
  }, [open]);

  useEffectC(() => {
    if (open) {
      const currentItems = PawpadCartStore.getItems();
      setItems(currentItems);
      setStep(0);
      setCompletedOrder(null);
      setActivePetIndex(0);

      const slots = derivePetSlots(currentItems);
      setPetSlots(slots);
      setSlotChoices(slots.map(() => ({ date: null, time: null })));
      setBookingError("");
      setPlacing(false);
      setPets(
        slots.map((s) => ({
          id: s.id,
          serviceTitle: s.serviceTitle,
          petType: s.petType || "Dog",
          allowPetTypeSelection: !!s.allowPetTypeSelection,
          isDogOnly: !!s.isDogOnly,
          isCatOnly: !!s.isCatOnly,
          isOvernight: !!s.isOvernight,
          name: "",
          breed: "",
          age: "",
          coat: "",
          size: "",
          temperament: "",
          healthNotes: "",
          hasCompletedTrialDay: null,
          sameAsPrevious: false
        }))
      );

      document.body.style.overflow = "hidden";
      const onKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, onClose]);

  if (!open) return null;

  const requiresPetInfo = petSlots.length > 0;
  const hasOvernight = items.some((i) => (i.requiresTrialDayCheck !== undefined ? !!i.requiresTrialDayCheck : i.id === "boarding-overnight"));
  const trialDayItems = items.filter((i) => i.id === "boarding-trial-day").reduce((n, i) => n + (i.quantity || 1), 0);
  const hasTrialDay = trialDayItems > 0;

  // Every dog staying overnight that hasn't done a trial day pays for one (at the Trial Day price
  // set in the admin panel), unless a trial day is already in the cart for it.
  const anyPetHasCompletedTrial = pets.some((p) => p.isOvernight && p.hasCompletedTrialDay);
  const petsNeedingTrial = pets.filter((p) => p.isOvernight && p.hasCompletedTrialDay === false).length;
  const mandatoryTrialDayFee = hasOvernight ? Math.max(0, petsNeedingTrial - trialDayItems) * boardingTrialDayPrice() : 0;
  const hasStayItems = items.some(isPerNightItem);
  const nights = hasStayItems ? stayNights(customerData.date, customerData.endDate) : 0;
  // Dogs staying overnight: one per unit of each per-night item.
  const stayDogs = items.filter(isPerNightItem).reduce((n, i) => n + (i.quantity || 1), 0);
  const lineTotal = (i) => (Number(i.price) || 0) * (i.quantity || 1) * (isPerNightItem(i) ? Math.max(1, nights) : 1);
  const subtotal = items.reduce((acc, i) => acc + lineTotal(i), 0);
  const finalTotal = subtotal + mandatoryTrialDayFee;

  const updCustomer = (k, v) => setCustomerData((d) => ({ ...d, [k]: v }));

  // Pets whose service takes a real grooming slot, with their index in pets/petSlots.
  const slotPetIndexes = petSlots.map((s, idx) => (s.takesSlot ? idx : -1)).filter((idx) => idx !== -1);
  const hasSlotPets = slotPetIndexes.length > 0;
  // Boarding and course/consulting items are still enquiries with a preferred date.
  const hasEnquiryItems = items.some((i) => typeof PawpadSlots === "undefined" || !PawpadSlots.takesSlot(i));
  const hasBoardingItems = items.some((i) => i.category === "Boarding");
  // The preferred enquiry / boarding date, e.g. "Thu, 24 Dec 2026".
  const enquiryDateLabel = customerData.date
    ? new Date(customerData.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "To be scheduled";
  const endDateLabel = customerData.endDate
    ? new Date(customerData.endDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "";
  // "Mon, 12 Oct 2026 → Sat, 17 Oct 2026 (5 nights)"
  const stayLabel = hasStayItems && nights > 0 ? `${enquiryDateLabel} → ${endDateLabel} (${nights} night${nights === 1 ? "" : "s"})` : "";
  const dogsPerNight = boardingNights ? boardingNights.dogsPerNight : 3;
  const tooManyDogs = hasStayItems && stayDogs > dogsPerNight;
  // Nights of the chosen stay without room for these dogs.
  const fullNights = (() => {
    if (!stayLabel || !boardingNights) return [];
    const left = {};
    (boardingNights.nights || []).forEach((n) => { left[n.date] = n.left; });
    const out = [];
    const d = new Date(customerData.date);
    for (let k = 0; k < nights; k++) {
      const v = localDateValue(d);
      if ((v in left ? left[v] : dogsPerNight) < stayDogs) out.push(v);
      d.setDate(d.getDate() + 1);
    }
    return out;
  })();
  const isThursdayValue = (iso) => Boolean(iso) && new Date(iso).getDay() === 4;
  const updSlot = (idx, choice) => {
    setBookingError("");
    setSlotChoices((prev) => {
      const next = [...prev];
      next[idx] = choice;
      return next;
    });
  };
  const slotLabel = (choice) => choice && choice.date && choice.time
    ? `${PawpadSlots.formatDate(choice.date)} · ${PawpadSlots.formatTime(choice.time)}`
    : "Not chosen yet";

  const updPet = (index, field, value) => {
    setPets((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      if (field === "sameAsPrevious") {
        const isSame = !!value;
        const source = next[0];
        const currentSlot = petSlots[index] || {};
        const isCompatible = source && next[index] && (source.petType === next[index].petType || currentSlot.allowPetTypeSelection);
        if (isSame && index > 0 && isCompatible) {
          next[index] = {
            ...next[index],
            sameAsPrevious: true,
            petType: source.petType,
            name: source.name,
            breed: source.breed,
            age: source.age,
            coat: source.coat,
            size: source.size,
            temperament: source.temperament,
            healthNotes: source.healthNotes,
            hasCompletedTrialDay: source.hasCompletedTrialDay
          };
        } else {
          next[index] = {
            ...next[index],
            sameAsPrevious: false
          };
        }
      } else if (field === "petType") {
        let newSize = next[index].size;
        if (value === "Cat" && !SIZES_CAT_CHECKOUT.includes(newSize)) {
          newSize = "";
        } else if (value === "Dog" && !SIZES_DOG_CHECKOUT.includes(newSize)) {
          newSize = "";
        }
        next[index] = {
          ...next[index],
          petType: value,
          size: newSize
        };
        // If petType changes and no longer matches pet 0, disable sameAsPrevious
        if (index > 0 && next[0] && value !== next[0].petType) {
          next[index].sameAsPrevious = false;
        }
        // If editing pet 0 and subsequent pets have sameAsPrevious enabled, check compatibility
        if (index === 0) {
          for (let i = 1; i < next.length; i++) {
            if (next[i].sameAsPrevious) {
              const slot_i = petSlots[i] || {};
              if ((slot_i.isDogOnly && value !== "Dog") || (slot_i.isCatOnly && value !== "Cat")) {
                next[i].sameAsPrevious = false;
              } else {
                next[i] = {
                  ...next[i],
                  petType: value,
                  size: newSize
                };
              }
            }
          }
        }
      } else {
        next[index] = {
          ...next[index],
          [field]: value
        };
        // If editing pet 0 and subsequent pets have sameAsPrevious enabled, sync them
        if (index === 0) {
          for (let i = 1; i < next.length; i++) {
            if (next[i].sameAsPrevious) {
              next[i] = {
                ...next[i],
                [field]: value
              };
            }
          }
        }
      }
      return next;
    });
  };

  const isMultiPet = pets.length > 1;
  const allDogs = pets.length > 0 && pets.every((p) => p.petType === "Dog");
  const allCats = pets.length > 0 && pets.every((p) => p.petType === "Cat");

  const petStepLabel = isMultiPet
    ? `Pet Details (${pets.length} Pets)`
    : allDogs
      ? "Dog Details"
      : allCats
        ? "Cat Details"
        : "Pet Details";

  const CHECKOUT_STEPS = [
    { label: "Your Info" },
    ...(requiresPetInfo ? [{ label: petStepLabel }] : []),
    { label: "Schedule" },
    { label: "Review" }
  ];

  const petStepIndex = requiresPetInfo ? 1 : -1;
  const scheduleStepIndex = requiresPetInfo ? 2 : 1;
  const reviewStepIndex = requiresPetInfo ? 3 : 2;

  const isPetValid = (p, idx) => {
    if (!p) return false;
    const petIdx = typeof idx === "number" ? idx : pets.indexOf(p);
    const slot = petSlots[petIdx] || {};
    const isCompatible = pets[0] && (p.petType === pets[0].petType || slot.allowPetTypeSelection);
    const isSame = p.sameAsPrevious && petIdx > 0 && isCompatible;
    const target = isSame ? pets[0] : p;
    if (!target.name || !target.name.trim()) return false;
    if (!target.breed || !target.breed.trim()) return false;
    if (!target.size || !target.size.trim()) return false;
    if (!target.coat || !target.coat.trim()) return false;
    if (!target.temperament || !target.temperament.trim()) return false;
    if (slot.isOvernight || p.isOvernight) {
      if (target.hasCompletedTrialDay !== true && target.hasCompletedTrialDay !== false) {
        return false;
      }
    }
    return true;
  };

  const isStepValid = () => {
    if (step === 0) {
      return (
        customerData.name.trim().length > 1 &&
        customerData.phone.trim().length >= 8 &&
        customerData.email.includes("@")
      );
    }
    if (requiresPetInfo && step === petStepIndex) {
      return pets.length > 0 && pets.every((p, idx) => isPetValid(p, idx));
    }
    if (step === scheduleStepIndex) {
      if (hasBoardingItems && isThursdayValue(customerData.date)) return false; // closed on Thursdays
      if (hasStayItems) {
        // An overnight stay needs both dates, no Thursday check-out, and room on every night.
        if (!customerData.date || nights < 1 || isThursdayValue(customerData.endDate) || tooManyDogs || fullNights.length) return false;
      }
      return slotPetIndexes.every((idx) => slotChoices[idx] && slotChoices[idx].date && slotChoices[idx].time);
    }
    return true;
  };

  const handleNext = () => {
    if (requiresPetInfo && step === petStepIndex && isMultiPet) {
      const currentPet = pets[activePetIndex];
      if (!isPetValid(currentPet, activePetIndex)) {
        return;
      }
      const firstIncompleteIdx = pets.findIndex((p, idx) => !isPetValid(p, idx));
      if (firstIncompleteIdx !== -1 && firstIncompleteIdx !== activePetIndex) {
        setActivePetIndex(firstIncompleteIdx);
        return;
      }
    }

    if (!isStepValid()) return;
    if (step < CHECKOUT_STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (requiresPetInfo && step === petStepIndex && isMultiPet && activePetIndex > 0) {
      setActivePetIndex((i) => i - 1);
      return;
    }
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const handlePlaceOrder = async () => {
    if (placing) return;
    let orderRef = "PAW-" + Math.floor(100000 + Math.random() * 900000);
    const resolvedPets = pets.map((p, idx) => {
      const slot = petSlots[idx] || {};
      const isCompatible = pets[0] && (p.petType === pets[0].petType || slot.allowPetTypeSelection);
      const isSameAsFirst = p.sameAsPrevious && idx > 0 && isCompatible;
      const source = isSameAsFirst ? pets[0] : p;
      return {
        slot: idx + 1,
        serviceTitle: p.serviceTitle,
        name: source.name,
        type: source.petType,
        breed: source.breed,
        age: source.age,
        coat: source.coat,
        size: source.size,
        temperament: source.temperament,
        healthNotes: source.healthNotes,
        hasCompletedTrialDay: !!source.hasCompletedTrialDay,
        isSamePetAsPrevious: !!isSameAsFirst
      };
    });

    const orderPayload = {
      orderId: orderRef,
      items: [...items],
      subtotal: subtotal,
      mandatoryTrialDayFee: mandatoryTrialDayFee,
      hasCompletedTrialDay: anyPetHasCompletedTrial,
      totalAmount: finalTotal,
      customer: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        area: customerData.area,
        contactMethod: customerData.contactMethod
      },
      pets: resolvedPets,
      pet: resolvedPets.length > 0 ? resolvedPets[0] : null,
      appointment: {
        date: stayLabel || enquiryDateLabel,
        time: customerData.time || "Flexible",
        notes: customerData.notes
      },
      boardingStay: hasBoardingItems ? (stayLabel || enquiryDateLabel) : "",
      createdAt: new Date().toISOString()
    };

    // Reserve the grooming slots on the Pawpad server first; nothing is sent if that fails.
    if (hasSlotPets) {
      setPlacing(true);
      setBookingError("");
      const result = await PawpadSlots.book({
        customer: orderPayload.customer,
        notes: customerData.notes,
        estimatedTotal: `₹${formatInr(finalTotal)}`,
        pets: slotPetIndexes.map((idx) => ({
          serviceId: petSlots[idx].serviceId,
          serviceTitle: pets[idx].serviceTitle,
          price: petSlots[idx].price,
          date: slotChoices[idx].date,
          time: slotChoices[idx].time,
          pet: resolvedPets[idx]
        })),
        botcheck: ""
      });
      setPlacing(false);
      if (!result.ok) {
        setBookingError(result.error);
        if (result.taken && result.taken.length) {
          // Someone else got that slot first: clear it and show the latest free times.
          setSlotChoices((prev) => prev.map((c) => (c && result.taken.some((t) => t.date === c.date && t.time === c.time) ? { date: c.date, time: null } : c)));
          reloadAvailability(true);
          setStep(scheduleStepIndex);
        }
        return;
      }
      orderRef = result.ref;
      orderPayload.orderId = result.ref;
      orderPayload.confirmedSlots = result.bookings;
      orderPayload.confirmationEmailSent = result.emailSent;
      orderPayload.appointment = {
        date: result.bookings.map((b) => b.label).join(" | "),
        time: "Confirmed",
        notes: customerData.notes
      };
    }

    // Boarding stays are saved on the Pawpad server too, so the team can confirm them in the admin panel.
    const boardingItems = items.filter((i) => i.category === "Boarding");
    if (boardingItems.length && window.PawpadApi && window.PawpadApi.isEnabled()) {
      setPlacing(true);
      const boarding = await window.PawpadApi.call("create_boarding_request", {
        customer: orderPayload.customer,
        stayDate: enquiryDateLabel,
        stayTime: customerData.time || "Flexible",
        stayEnd: stayLabel ? endDateLabel : "",
        checkIn: stayLabel ? localDateValue(new Date(customerData.date)) : "",
        checkOut: stayLabel ? localDateValue(new Date(customerData.endDate)) : "",
        dogs: stayLabel ? stayDogs : 0,
        notes: customerData.notes || "",
        items: boardingItems.map((i) => ({
          title: i.title,
          quantity: i.quantity || 1,
          nights: isPerNightItem(i) ? nights : 0,
          priceDisplay: i.priceDisplay || `₹${formatInr(i.price)}`,
          lineTotal: `₹${formatInr(lineTotal(i))}`
        })),
        pets: resolvedPets.filter((p, idx) => petSlots[idx] && String(petSlots[idx].serviceId || "").startsWith("boarding")),
        total: `₹${formatInr(finalTotal)}`,
        trialFee: mandatoryTrialDayFee > 0 ? `₹${formatInr(mandatoryTrialDayFee)}` : "",
        botcheck: ""
      });
      setPlacing(false);
      if (boarding.ok) {
        orderPayload.boardingRef = boarding.data.ref;
        if (!hasSlotPets) orderPayload.orderId = boarding.data.ref; // no grooming booking: use the boarding reference
      } else if (boarding.status === 409) {
        // A night filled up meanwhile (or too many dogs).
        const message = (boarding.data && boarding.data.error) || "Boarding is fully booked on those dates.";
        if (!hasSlotPets) {
          setBookingError(message);
          window.PawpadApi.call("boarding_availability", {}).then((r) => { if (r.ok) setBoardingNights(r.data); });
          setStep(scheduleStepIndex);
          return;
        }
        orderPayload.boardingError = message; // the grooming booking is already made
      }
    }

    if (window.hsSubmit) {
      window.hsSubmit("checkout", orderPayload);
    }

    setCompletedOrder(orderPayload);
    PawpadCartStore.clearCart();
    setStep(99); // Completed confirmation state
  };

  const currentPet = pets[activePetIndex] || pets[0] || {};
  const currentSlot = petSlots[activePetIndex] || petSlots[0] || {};
  const isCurrentDog = currentPet.petType === "Dog";
  const isCurrentCat = currentPet.petType === "Cat";
  const firstPet = pets[0] || {};
  const isSamePetTypeAsFirst = isMultiPet && activePetIndex > 0 && firstPet.petType && (currentPet.petType === firstPet.petType || currentSlot.allowPetTypeSelection);

  return React.createElement(
    "div",
    { className: "checkout-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Checkout booking modal" },
    React.createElement("div", { className: "checkout-backdrop", onClick: onClose }),
    React.createElement(
      "div",
      { className: "checkout-modal" },
      React.createElement(
        "button",
        { className: "checkout-close-btn", onClick: onClose, "aria-label": "Close checkout" },
        "×"
      ),

      // Confirmation screen
      step === 99 && completedOrder
        ? React.createElement(
          "div",
          { className: "checkout-success" },
          React.createElement(
            "div",
            { className: "success-icon-wrap" },
            React.createElement(PawIcon, { size: 36, color: "var(--white)" })
          ),
          React.createElement("p", { className: "eyebrow", style: { justifyContent: "center" } }, completedOrder.confirmedSlots ? "Booking Confirmed" : "Booking & Order Placed"),
          React.createElement("h3", { className: "h-2" }, "Thank you, ", completedOrder.customer.name, "!"),
          completedOrder.confirmedSlots
            ? React.createElement(
              "p",
              { className: "success-sub" },
              "Your grooming time is reserved. ",
              completedOrder.confirmationEmailSent
                ? `A confirmation email is on its way to ${completedOrder.customer.email}.`
                : "We'll send your confirmation shortly.",
              " Payment is at the studio."
            )
            : React.createElement(
            "p",
            { className: "success-sub" },
            "We’ve received your booking request. Our team will review your order details and confirm your slot via ",
            completedOrder.customer.contactMethod,
            "."
          ),
          React.createElement(
            "div",
            { className: "order-ref-card" },
            React.createElement(
              "div",
              { className: "ref-row" },
              React.createElement("span", null, "Booking Reference"),
              React.createElement("strong", { className: "ref-number" }, completedOrder.orderId)
            ),
            completedOrder.mandatoryTrialDayFee > 0
              ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  "div",
                  { className: "ref-row" },
                  React.createElement("span", null, "Services Subtotal"),
                  React.createElement("strong", null, `₹${formatInr(completedOrder.subtotal)}`)
                ),
                React.createElement(
                  "div",
                  { className: "ref-row" },
                  React.createElement("span", { style: { color: "var(--driftwood-deep)" } }, "Mandatory First-Time Trial Day"),
                  React.createElement("strong", { style: { color: "var(--driftwood-deep)" } }, `+₹${formatInr(completedOrder.mandatoryTrialDayFee)}`)
                )
              )
              : null,
            React.createElement(
              "div",
              { className: "ref-row" },
              React.createElement("span", null, "Total Estimated"),
              React.createElement("strong", null, `₹${formatInr(completedOrder.totalAmount)}`)
            ),
            completedOrder.pets && completedOrder.pets.length > 0 &&
            React.createElement(
              "div",
              { className: "ref-row", style: { alignItems: "flex-start" } },
              React.createElement("span", null, completedOrder.pets.length > 1 ? "Pets" : "Pet"),
              React.createElement(
                "strong",
                { style: { textAlign: "right" } },
                completedOrder.pets.map((p) => (
                  `${p.name} (${p.type}${p.breed ? ` · ${p.breed}` : ""})`
                )).join(" | ")
              )
            ),
            completedOrder.confirmedSlots && completedOrder.boardingStay && !completedOrder.boardingError && React.createElement(
              "div",
              { className: "ref-row" },
              React.createElement("span", null, "Boarding stay"),
              React.createElement("strong", null, completedOrder.boardingStay)
            ),
            completedOrder.boardingError && React.createElement(
              "div",
              { className: "ref-row", role: "alert", style: { color: "var(--danger, #b3261e)" } },
              React.createElement("span", null, "Boarding not requested"),
              React.createElement("strong", null, completedOrder.boardingError)
            ),
            completedOrder.confirmedSlots
              ? completedOrder.confirmedSlots.map((b, i) => React.createElement(
                "div",
                { className: "ref-row confirmed-slot", key: "cs-" + i },
                React.createElement("span", null, b.petName ? `${b.petName} · ${b.serviceTitle}` : b.serviceTitle),
                React.createElement("strong", null, b.label)
              ))
              : completedOrder.appointment &&
            React.createElement(
              "div",
              { className: "ref-row" },
              React.createElement("span", null, "Preferred Schedule"),
              React.createElement("strong", null, `${completedOrder.appointment.date} at ${completedOrder.appointment.time}`)
            )
          ),
          React.createElement(
            "div",
            { className: "success-actions" },
            React.createElement(
              "a",
              {
                href: `https://wa.me/919148443330?text=${encodeURIComponent(
                  `Hi Pawpad! I placed booking ref ${completedOrder.orderId} for ${completedOrder.pets && completedOrder.pets.length > 0
                    ? completedOrder.pets.map((p) => `${p.name} (${p.type})`).join(", ")
                    : "my booking"
                  }. Total: ₹${formatInr(completedOrder.totalAmount)}${completedOrder.mandatoryTrialDayFee > 0 ? " (includes ₹${formatInr(completedOrder.mandatoryTrialDayFee)} Trial Day fee)" : ""}.`
                )}`,
                target: "_blank",
                rel: "noopener",
                className: "btn btn-primary"
              },
              "Chat on WhatsApp ",
              React.createElement(Arrow, null)
            ),
            React.createElement(
              "button",
              { className: "btn btn-ghost", onClick: onClose },
              "Return to Website"
            )
          )
        )
        : React.createElement(
          React.Fragment,
          null,
          // Stepper
          React.createElement(
            "div",
            { className: "checkout-stepper" },
            CHECKOUT_STEPS.map((s, idx) =>
              React.createElement(
                "div",
                {
                  key: s.label,
                  className: "c-stepper-item " + (idx === step ? "on" : idx < step ? "done" : "")
                },
                React.createElement(
                  "span",
                  { className: "c-step-num" },
                  idx < step ? "✓" : idx + 1
                ),
                React.createElement("span", { className: "c-step-name" }, s.label)
              )
            )
          ),

          // Form Content Area
          React.createElement(
            "div",
            { className: "checkout-body" },
            // Step 0: Personal Info
            step === 0 &&
            React.createElement(
              "div",
              { className: "checkout-step-pane" },
              React.createElement(
                "div",
                { className: "step-head" },
                React.createElement("p", { className: "eyebrow" }, "Step 1"),
                React.createElement("h4", { className: "h-3" }, "Your Personal Information"),
                React.createElement(
                  "p",
                  { className: "lead-sm" },
                  "How our team can reach you for confirmations and arrival instructions."
                )
              ),
              React.createElement(
                "div",
                { className: "form-grid" },
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Full Name *"),
                  React.createElement("input", {
                    type: "text",
                    required: true,
                    placeholder: "e.g. Maya Shankar",
                    value: customerData.name,
                    onChange: (e) => updCustomer("name", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Phone Number *"),
                  React.createElement("input", {
                    type: "tel",
                    required: true,
                    placeholder: "e.g. 9876543210",
                    value: customerData.phone,
                    onChange: (e) => updCustomer("phone", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Email Address *"),
                  React.createElement("input", {
                    type: "email",
                    required: true,
                    placeholder: "e.g. maya@example.com",
                    value: customerData.email,
                    onChange: (e) => updCustomer("email", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Bengaluru Neighborhood / Area"),
                  React.createElement("input", {
                    type: "text",
                    placeholder: "e.g. Kalyan Nagar, Indiranagar, HRBR Layout",
                    value: customerData.area,
                    onChange: (e) => updCustomer("area", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, "Preferred Contact Mode"),
                  React.createElement(
                    "div",
                    { className: "chip-select" },
                    ["WhatsApp", "Phone Call", "Email"].map((mode) =>
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          key: mode,
                          className: "chip-btn " + (customerData.contactMethod === mode ? "active" : ""),
                          onClick: () => updCustomer("contactMethod", mode)
                        },
                        mode
                      )
                    )
                  )
                )
              )
            ),

            // Step 1: Pet Details (Single or Multi-Pet)
            requiresPetInfo &&
            step === petStepIndex &&
            React.createElement(
              "div",
              { className: "checkout-step-pane" },
              React.createElement(
                "div",
                { className: "step-head" },
                React.createElement(
                  "p",
                  { className: "eyebrow" },
                  isMultiPet
                    ? `Step 2 · Pet Details (${pets.length} Pets)`
                    : isCurrentDog
                      ? "Step 2 · Dog Details"
                      : isCurrentCat
                        ? "Step 2 · Cat Details"
                        : "Step 2 · Pet Details"
                ),
                React.createElement(
                  "h4",
                  { className: "h-3" },
                  isMultiPet
                    ? `Tell Us About Your Pets (Pet ${activePetIndex + 1} of ${pets.length})`
                    : isCurrentDog
                      ? "Tell Us About Your Dog"
                      : isCurrentCat
                        ? "Tell Us About Your Cat"
                        : "Tell Us About Your Pet"
                ),
                React.createElement(
                  "p",
                  { className: "lead-sm" },
                  isMultiPet
                    ? `Configure the profile for ${currentPet.name || `Pet #${activePetIndex + 1}`} (${currentPet.serviceTitle || currentPet.petType}). Switch tabs above if you have multiple pets.`
                    : isCurrentDog
                      ? (items.some((i) => i.category === "Boarding")
                        ? "Pawpad Boarding is open exclusively to small dogs. Knowing your dog's coat and temperament helps us ensure an intimate, stress-free stay."
                        : "Pawpad sessions are paced around your dog's comfort. Knowing their coat and temperament helps us tailor the session pace.")
                      : isCurrentCat
                        ? "Sessions at Pawpad are never rushed. Knowing your cat’s temperament and coat type helps us tailor the session pace in a quiet, low-stress environment."
                        : "Sessions at Pawpad are never rushed. Knowing your pet’s temperament and coat type helps us tailor the session pace."
                )
              ),

              // Multi-Pet Navigation Tabs
              isMultiPet &&
              React.createElement(
                "div",
                { className: "pet-tabs-bar" },
                pets.map((p, idx) => {
                  const isCurrent = idx === activePetIndex;
                  const isDone = isPetValid(p, idx);
                  const icon = p.petType === "Cat" ? "🐱" : "🐕";
                  const tabLabel = p.sameAsPrevious && p.petType === pets[0]?.petType
                    ? `${pets[0]?.name || "Pet 1"} (Same)`
                    : (p.name ? p.name : `Pet ${idx + 1}`);
                  return React.createElement(
                    "button",
                    {
                      key: idx,
                      type: "button",
                      className: `pet-tab-btn ${isCurrent ? "active" : ""} ${isDone ? "completed" : ""}`,
                      onClick: () => setActivePetIndex(idx)
                    },
                    React.createElement("span", { className: "pet-tab-icon" }, icon),
                    React.createElement("span", null, `${tabLabel} · ${p.petType}`),
                    React.createElement("span", { className: "pet-tab-badge" }, isDone ? "✓" : idx + 1)
                  );
                })
              ),

              // Same as previous pet details checkbox (shown for Pet 2 onwards ONLY when same pet category/species)
              isSamePetTypeAsFirst &&
              React.createElement(
                "div",
                {
                  className: "same-pet-card",
                  onClick: () => updPet(activePetIndex, "sameAsPrevious", !currentPet.sameAsPrevious)
                },
                React.createElement(
                  "label",
                  {
                    className: "same-pet-label",
                    onClick: (e) => e.stopPropagation()
                  },
                  React.createElement("input", {
                    type: "checkbox",
                    className: "same-pet-checkbox",
                    checked: !!currentPet.sameAsPrevious,
                    onChange: (e) => updPet(activePetIndex, "sameAsPrevious", e.target.checked)
                  }),
                  React.createElement(
                    "span",
                    null,
                    `Both for same pet (Use ${pets[0]?.name || "Pet 1"}'s details)`
                  )
                ),
                React.createElement(
                  "p",
                  { className: "same-pet-subtext" },
                  currentPet.sameAsPrevious
                    ? `✓ Using ${pets[0]?.name || "Pet 1"}'s profile for this service.`
                    : `Check this box if this service is for the same pet as Pet 1 (${pets[0]?.name || "Pet 1"}).`
                )
              ),

              React.createElement(
                "div",
                { className: "form-grid" },
                // Pet Type Selector if service allows flexible pet selection
                currentSlot.allowPetTypeSelection && !currentPet.sameAsPrevious &&
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, "Pet Type *"),
                  React.createElement(
                    "div",
                    { className: "chip-select" },
                    PET_TYPES_CHECKOUT.map((t) =>
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          key: t,
                          className: "chip-btn " + ((currentPet.petType || "Dog") === t ? "active" : ""),
                          onClick: () => updPet(activePetIndex, "petType", t)
                        },
                        t
                      )
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement(
                    "label",
                    null,
                    isMultiPet
                      ? `Pet #${activePetIndex + 1} (${currentPet.petType}) Name *`
                      : isCurrentDog
                        ? "Dog Name *"
                        : isCurrentCat
                          ? "Cat Name *"
                          : "Pet Name *"
                  ),
                  React.createElement("input", {
                    type: "text",
                    required: true,
                    placeholder: isCurrentDog ? "e.g. Leo, Bruno, Maya" : isCurrentCat ? "e.g. Luna, Oliver, Simba" : "e.g. Leo, Bruno, Luna",
                    value: currentPet.name || "",
                    disabled: !!currentPet.sameAsPrevious,
                    onChange: (e) => updPet(activePetIndex, "name", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Breed / Mix *"),
                  React.createElement("input", {
                    type: "text",
                    placeholder: isCurrentDog
                      ? "e.g. Shih Tzu, Indie, Lhasa Apso, Beagle"
                      : isCurrentCat
                        ? "e.g. Persian Cat, Indie, Siamese, British Shorthair"
                        : "e.g. Indie, Golden Retriever, Shih Tzu, Persian Cat",
                    value: currentPet.breed || "",
                    disabled: !!currentPet.sameAsPrevious,
                    onChange: (e) => updPet(activePetIndex, "breed", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field" },
                  React.createElement("label", null, "Age"),
                  React.createElement("input", {
                    type: "text",
                    placeholder: "e.g. 2 years, 4 months",
                    value: currentPet.age || "",
                    disabled: !!currentPet.sameAsPrevious,
                    onChange: (e) => updPet(activePetIndex, "age", e.target.value)
                  })
                ),
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, isCurrentCat ? "Cat Size / Weight Category *" : "Dog Size / Weight Category *"),
                  React.createElement(
                    "div",
                    { className: "chip-select" },
                    (isCurrentCat ? SIZES_CAT_CHECKOUT : SIZES_DOG_CHECKOUT).map((s) =>
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          key: s,
                          className: "chip-btn " + (currentPet.size === s ? "active" : ""),
                          disabled: !!currentPet.sameAsPrevious,
                          onClick: () => updPet(activePetIndex, "size", s)
                        },
                        s
                      )
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, "Coat Type *"),
                  React.createElement(
                    "div",
                    { className: "chip-select" },
                    COAT_TYPES_CHECKOUT.map((c) =>
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          key: c,
                          className: "chip-btn " + (currentPet.coat === c ? "active" : ""),
                          disabled: !!currentPet.sameAsPrevious,
                          onClick: () => updPet(activePetIndex, "coat", c)
                        },
                        `${c} Coat`
                      )
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, "Temperament / Handling *"),
                  React.createElement(
                    "div",
                    { className: "chip-select" },
                    TEMPERAMENTS_CHECKOUT.map((t) =>
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          key: t,
                          className: "chip-btn " + (currentPet.temperament === t ? "active" : ""),
                          disabled: !!currentPet.sameAsPrevious,
                          onClick: () => updPet(activePetIndex, "temperament", t)
                        },
                        t
                      )
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement("label", null, "Special Needs, Sensitivities or Diet"),
                  React.createElement("textarea", {
                    rows: 2,
                    placeholder: "e.g. Dislikes loud noises, food allergies, vet medicines, etc.",
                    value: currentPet.healthNotes || "",
                    disabled: !!currentPet.sameAsPrevious,
                    onChange: (e) => updPet(activePetIndex, "healthNotes", e.target.value)
                  })
                ),
                currentSlot.isOvernight &&
                React.createElement(
                  "div",
                  { className: "field full-span" },
                  React.createElement(
                    "div",
                    { className: "trial-day-verify-card" },
                    React.createElement(
                      "div",
                      { className: "trial-day-verify-header" },
                      React.createElement("div", { className: "trial-day-verify-icon" }, "📋"),
                      React.createElement(
                        "div",
                        null,
                        React.createElement("h5", { className: "trial-day-verify-title" }, "Trial Day Verification"),
                        React.createElement(
                          "p",
                          { className: "trial-day-verify-notice" },
                          "A complete trial day is mandatory before an overnight stay to ensure your dog is comfortable in our intimate group."
                        )
                      )
                    ),
                    React.createElement(
                      "div",
                      { className: "trial-day-question-wrap" },
                      React.createElement(
                        "label",
                        { className: "trial-day-question-label" },
                        "Has your pet already completed a trial day at Pawpad before? ",
                        React.createElement("span", { className: "trial-day-required-star" }, "*")
                      ),
                      React.createElement(
                        "div",
                        { className: "trial-day-btn-group" },
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            id: "trial-day-btn-yes",
                            className: "trial-day-toggle-btn trial-day-toggle-yes " + (currentPet.hasCompletedTrialDay === true ? "active" : ""),
                            disabled: !!currentPet.sameAsPrevious,
                            onClick: () => updPet(activePetIndex, "hasCompletedTrialDay", true)
                          },
                          React.createElement("span", { className: "trial-day-toggle-check" }, currentPet.hasCompletedTrialDay === true ? "✓ " : ""),
                          "Yes, Completed Before"
                        ),
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            id: "trial-day-btn-no",
                            className: "trial-day-toggle-btn trial-day-toggle-no " + (currentPet.hasCompletedTrialDay === false ? "active" : ""),
                            disabled: !!currentPet.sameAsPrevious,
                            onClick: () => updPet(activePetIndex, "hasCompletedTrialDay", false)
                          },
                          React.createElement("span", { className: "trial-day-toggle-check" }, currentPet.hasCompletedTrialDay === false ? "✓ " : ""),
                          "No, First-Time Stay"
                        )
                      )
                    ),
                    currentPet.hasCompletedTrialDay === null
                      ? React.createElement(
                        "div",
                        { className: "trial-day-helper-badge unselected" },
                        "⚠️ Please select Yes or No above to proceed with your booking."
                      )
                      : currentPet.hasCompletedTrialDay === true
                        ? React.createElement(
                          "div",
                          { className: "trial-day-helper-badge verified" },
                          "✓ Previous Trial Day Recorded: A verification will be done by our team and you might be asked to provide the previous Trial day visit proof if required. If no previous records are found, your Trial Day might be booked at the discretion of our team and the fee will be applicable."
                        )
                        : React.createElement(
                          "div",
                          { className: "trial-day-helper-badge fee-notice" },
                          `ℹ️ First-Time Stay: Since your pet hasn't had a trial day before, the mandatory Trial Day fee (₹${formatInr(boardingTrialDayPrice())}) will be added to your final bill summary.`
                        )
                  )
                )
              ),

              // Multi-Pet Tab switcher footer helper inside Step 2
              isMultiPet &&
              React.createElement(
                "div",
                { style: { display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px dashed color-mix(in oklab, var(--ink), transparent 88%)" } },
                activePetIndex > 0
                  ? React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "btn btn-ghost btn-sm",
                      onClick: () => setActivePetIndex((i) => Math.max(0, i - 1))
                    },
                    "← Previous Pet"
                  )
                  : React.createElement("div", null),
                activePetIndex < pets.length - 1 &&
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-ghost btn-sm",
                    onClick: () => setActivePetIndex((i) => Math.min(pets.length - 1, i + 1))
                  },
                  `Next Pet (${activePetIndex + 2} of ${pets.length}) →`
                )
              )
            ),

            // Step 2 (or 1): Preferred Schedule
            step === scheduleStepIndex &&
            React.createElement(
              "div",
              { className: "checkout-step-pane" },
              React.createElement(
                "div",
                { className: "step-head" },
                React.createElement("p", { className: "eyebrow" }, "Step · Schedule"),
                React.createElement("h4", { className: "h-3" }, hasSlotPets ? "Choose Your Grooming Time" : "Preferred Date & Time"),
                React.createElement(
                  "p",
                  { className: "lead-sm" },
                  hasSlotPets
                    ? "Only free times are shown. Each pet gets its own time, reserved as soon as you place the booking. Closed on Thursdays."
                    : "Pick a tentative slot (closed on Thursdays). We will confirm based on studio availability and calm spacing."
                )
              ),
              bookingError && React.createElement("div", { className: "slot-status slot-error", role: "alert", style: { marginBottom: 16 } }, bookingError),
              hasSlotPets && slotPetIndexes.map((idx) =>
                React.createElement(
                  "div",
                  { key: "slot-" + idx, className: "slot-pet-block", "data-slot-pet": idx, style: { marginBottom: 28 } },
                  React.createElement("p", { className: "eyebrow", style: { marginBottom: 10 } },
                    `${slotPetIndexes.length > 1 ? `Pet ${slotPetIndexes.indexOf(idx) + 1} · ` : ""}${(pets[idx] && pets[idx].name) || "Your pet"} — ${(pets[idx] && pets[idx].serviceTitle) || "Grooming"}`
                  ),
                  React.createElement(SlotPicker, {
                    availability,
                    serviceId: petSlots[idx].serviceId,
                    value: slotChoices[idx],
                    onChange: (choice) => updSlot(idx, choice),
                    excluded: slotPetIndexes.filter((other) => other !== idx).map((other) => slotChoices[other]).filter((c) => c && c.date && c.time),
                    onRetry: () => reloadAvailability(true)
                  })
                )
              ),
              (!hasSlotPets || hasEnquiryItems) && hasSlotPets && React.createElement("p", { className: "eyebrow", style: { marginTop: 8 } }, "Boarding / enquiry — preferred date (we'll confirm with you)"),
              (!hasSlotPets || hasEnquiryItems) && React.createElement(
                "div",
                { className: "date-picker-wrap" },
                !hasStayItems && React.createElement("label", { className: "sub-label", htmlFor: hasBoardingItems ? "boarding-date" : undefined },
                  hasBoardingItems ? "Select Date (up to 3 months ahead)" : "Select Date (Next 14 Days)"),
                // Boarding: date boxes (check-in, and check-out for overnight stays) covering the next 3 months.
                hasBoardingItems && (() => {
                  const min = new Date(); // boarding can start today
                  const max = new Date(); max.setDate(max.getDate() + BOARDING_DAYS_AHEAD);
                  const value = customerData.date ? localDateValue(new Date(customerData.date)) : "";
                  const endValue = customerData.endDate ? localDateValue(new Date(customerData.endDate)) : "";
                  const endMinDate = value ? PawpadSlots.toDate(value) : new Date(min);
                  endMinDate.setDate(endMinDate.getDate() + 1);
                  const endMaxDate = value ? PawpadSlots.toDate(value) : new Date(max);
                  endMaxDate.setDate(endMaxDate.getDate() + BOARDING_MAX_NIGHTS);
                  const boxStyle = { padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line, #ddd)", fontSize: 16, minWidth: 200 };
                  const thursday = isThursdayValue(customerData.date) || (hasStayItems && isThursdayValue(customerData.endDate));
                  const problem = thursday
                    ? `The studio is closed on Thursdays, so ${isThursdayValue(customerData.date) ? "check-in" : "check-out"} can't be on a Thursday. Please choose another day.`
                    : tooManyDogs
                      ? `We can board up to ${dogsPerNight} dogs per night. Please WhatsApp us on +91 91484 43330 for a larger group.`
                      : fullNights.length
                        ? `Sorry, boarding is fully booked on ${fullNights.slice(0, 4).map((v) => PawpadSlots.formatDate(v, { weekday: "short", day: "numeric", month: "short" })).join(", ")}${fullNights.length > 4 ? ` and ${fullNights.length - 4} more` : ""} (up to ${dogsPerNight} dogs per night). Please choose other dates.`
                        : "";
                  const info = hasStayItems
                    ? (stayLabel ? `${nights} night${nights === 1 ? "" : "s"} · ${stayDogs} dog${stayDogs === 1 ? "" : "s"}. We'll confirm the dates with you.` : "Choose the day you drop your dog off and the day you pick them up.")
                    : "From today up to 3 months ahead. We'll confirm the dates with you.";
                  return React.createElement("div", null,
                    React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" } },
                      React.createElement("div", null,
                      hasStayItems && React.createElement("label", { className: "sub-label", htmlFor: "boarding-date", style: { display: "block" } }, "Check-in date"),
                      React.createElement("input", {
                        id: "boarding-date", type: "date", className: "boarding-date-input", "aria-label": hasStayItems ? "Check-in date" : "Date",
                        min: localDateValue(min), max: localDateValue(max), value,
                        onChange: (e) => {
                          const v = e.target.value;
                          if (!v) return updCustomer("date", "");
                          if (v < localDateValue(min) || v > localDateValue(max)) return;
                          setCustomerData((d) => {
                            const next = { ...d, date: PawpadSlots.toDate(v).toISOString() };
                            // A check-out on or before the new check-in no longer fits.
                            if (next.endDate && stayNights(next.date, next.endDate) < 1) next.endDate = null;
                            return next;
                          });
                        },
                        style: boxStyle
                      })),
                      hasStayItems && React.createElement("div", null,
                        React.createElement("label", { className: "sub-label", htmlFor: "boarding-end-date", style: { display: "block" } }, "Check-out date"),
                        React.createElement("input", {
                          id: "boarding-end-date", type: "date", className: "boarding-date-input", "aria-label": "Check-out date",
                          min: localDateValue(endMinDate), max: localDateValue(endMaxDate), value: endValue, disabled: !value,
                          onChange: (e) => {
                            const v = e.target.value;
                            if (!v) return updCustomer("endDate", null);
                            if (v < localDateValue(endMinDate) || v > localDateValue(endMaxDate)) return;
                            updCustomer("endDate", PawpadSlots.toDate(v).toISOString());
                          },
                          style: boxStyle
                        }))),
                    React.createElement("p", { className: "lead-sm", "data-stay-message": problem ? "problem" : "info", role: problem ? "alert" : undefined, style: { marginTop: 8, fontSize: 13, color: problem ? "var(--danger, #b3261e)" : undefined } },
                      problem || info));
                })(),
                !hasBoardingItems && React.createElement(
                  "div",
                  { className: "date-chip-grid" },
                  generateCheckoutDates().map((d, i) => {
                    const isClosed = d.getDay() === 4;
                    const dateStr = d.toISOString();
                    const isSel = !isClosed && customerData.date && new Date(customerData.date).toDateString() === d.toDateString();
                    return React.createElement(
                      "button",
                      {
                        type: "button",
                        key: i,
                        className: "date-chip " + (isSel ? "active " : "") + (isClosed ? "closed" : ""),
                        onClick: () => !isClosed && updCustomer("date", dateStr),
                        disabled: isClosed,
                        title: isClosed ? "Closed on Thursdays" : undefined
                      },
                      React.createElement("span", { className: "d-day" }, d.toLocaleDateString("en-IN", { weekday: "short" })),
                      React.createElement("strong", { className: "d-num" }, d.getDate()),
                      React.createElement("span", { className: "d-mon" }, d.toLocaleDateString("en-IN", { month: "short" })),
                      isClosed && React.createElement("span", { className: "d-closed" }, "Closed")
                    );
                  })
                )
              ),
              (!hasSlotPets || hasEnquiryItems) && React.createElement(
                "div",
                { className: "time-picker-wrap", style: { marginTop: 24 } },
                React.createElement("label", { className: "sub-label" }, "Select Time Slot"),
                React.createElement(
                  "div",
                  { className: "time-chip-grid" },
                  CHECKOUT_TIMES.map((t) =>
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        key: t,
                        className: "time-chip " + (customerData.time === t ? "active" : ""),
                        onClick: () => updCustomer("time", t)
                      },
                      t
                    )
                  )
                )
              ),
              React.createElement(
                "div",
                { className: "field", style: { marginTop: 24 } },
                React.createElement("label", null, "Additional Instructions / Notes"),
                React.createElement("textarea", {
                  rows: 2,
                  placeholder: "Any specific requests or questions for our team?",
                  value: customerData.notes,
                  onChange: (e) => updCustomer("notes", e.target.value)
                })
              )
            ),

            // Final Step: Review & Confirm
            step === reviewStepIndex &&
            React.createElement(
              "div",
              { className: "checkout-step-pane" },
              React.createElement(
                "div",
                { className: "step-head" },
                React.createElement("p", { className: "eyebrow" }, "Final Review"),
                React.createElement("h4", { className: "h-3" }, "Review Your Booking"),
                React.createElement(
                  "p",
                  { className: "lead-sm" },
                  "Check your contact info, pet details, and selected services before submitting."
                )
              ),
              bookingError && React.createElement("div", { className: "slot-status slot-error", role: "alert", style: { marginBottom: 16 } }, bookingError),
              React.createElement(
                "div",
                { className: "review-summary-grid" },
                // Items list
                React.createElement(
                  "div",
                  { className: "review-items-card" },
                  React.createElement("h5", { className: "review-card-title" }, "Selected Services & Items"),
                  React.createElement(
                    "div",
                    { className: "review-items-list" },
                    items.map((item) =>
                      React.createElement(
                        "div",
                        { key: item.id, className: "review-item-row" },
                        React.createElement(
                          "div",
                          null,
                          React.createElement("strong", null, item.title),
                          React.createElement("span", { className: "review-item-qty" }, isPerNightItem(item)
                            ? ` · ${item.quantity || 1} dog${(item.quantity || 1) === 1 ? "" : "s"} × ${Math.max(1, nights)} night${Math.max(1, nights) === 1 ? "" : "s"}`
                            : ` × ${item.quantity || 1}`)
                        ),
                        React.createElement("span", { className: "review-item-price" }, `₹${formatInr(lineTotal(item))}`)
                      )
                    ),
                    mandatoryTrialDayFee > 0 &&
                    React.createElement(
                      "div",
                      { className: "review-item-row review-mandatory-fee-row" },
                      React.createElement(
                        "div",
                        null,
                        React.createElement("strong", { style: { color: "var(--driftwood-deep)" } }, "Mandatory First-Time Trial Day"),
                        React.createElement("span", { className: "review-item-qty" }, " · Required assessment")
                      ),
                      React.createElement("span", { className: "review-item-price", style: { color: "var(--driftwood-deep)" } }, `+₹${formatInr(mandatoryTrialDayFee)}`)
                    )
                  ),
                  mandatoryTrialDayFee > 0 &&
                  React.createElement(
                    "div",
                    { className: "review-item-row", style: { padding: "10px 0 0", color: "var(--ink-mute)", fontSize: "13px" } },
                    React.createElement("span", null, "Services Subtotal"),
                    React.createElement("span", null, `₹${formatInr(subtotal)}`)
                  ),
                  React.createElement(
                    "div",
                    { className: "review-subtotal-row" },
                    React.createElement("strong", null, "Total Estimated"),
                    React.createElement("strong", { className: "review-total-price" }, `₹${formatInr(finalTotal)}`)
                  )
                ),

                // Details summary
                React.createElement(
                  "div",
                  { className: "review-details-card" },
                  React.createElement("h5", { className: "review-card-title" }, "Booking Information"),
                  React.createElement(
                    "div",
                    { className: "review-info-grid" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement("span", { className: "review-label" }, "Client:"),
                      React.createElement("p", null, customerData.name, " (", customerData.phone, ")")
                    ),
                    React.createElement(
                      "div",
                      null,
                      React.createElement("span", { className: "review-label" }, "Email:"),
                      React.createElement("p", null, customerData.email)
                    ),
                    requiresPetInfo &&
                    React.createElement(
                      "div",
                      { style: { gridColumn: "1 / -1" } },
                      React.createElement("span", { className: "review-label" }, isMultiPet ? `Pets (${pets.length}):` : `${pets[0]?.petType || "Pet"}:`),
                      pets.map((p, idx) => {
                        const isSameAsFirst = p.sameAsPrevious && idx > 0 && pets[0] && p.petType === pets[0].petType;
                        const source = isSameAsFirst ? pets[0] : p;
                        const icon = source.petType === "Cat" ? "🐱" : "🐕";
                        return React.createElement(
                          "div",
                          { key: idx, className: "review-pet-card" },
                          React.createElement(
                            "div",
                            { className: "review-pet-title" },
                            React.createElement("span", null, icon),
                            React.createElement("span", null, `${source.name || `Pet #${idx + 1}`} (${source.petType})`),
                            isSameAsFirst && React.createElement("span", { style: { fontSize: 11, color: "var(--driftwood-deep)", fontWeight: 600 } }, "· Same pet as Pet 1")
                          ),
                          React.createElement(
                            "div",
                            { className: "review-pet-service" },
                            p.serviceTitle || "Grooming / Wellness"
                          ),
                          petSlots[idx] && petSlots[idx].takesSlot && React.createElement(
                            "div",
                            { className: "review-pet-details", style: { fontWeight: 600 } },
                            `🕒 ${slotLabel(slotChoices[idx])}`
                          ),
                          React.createElement(
                            "div",
                            { className: "review-pet-details" },
                            `${source.breed || "Indie/Mix"} · ${source.coat} Coat · ${source.size} · ${source.temperament}`
                          ),
                          source.healthNotes &&
                          React.createElement(
                            "div",
                            { className: "review-pet-details", style: { marginTop: 4, fontStyle: "italic" } },
                            `Note: ${source.healthNotes}`
                          )
                        );
                      })
                    ),
                    hasOvernight &&
                    React.createElement(
                      "div",
                      null,
                      React.createElement("span", { className: "review-label" }, "Trial Day Status:"),
                      React.createElement(
                        "p",
                        { style: { color: anyPetHasCompletedTrial ? "#2e7d32" : "var(--driftwood-deep)", fontWeight: 600 } },
                        anyPetHasCompletedTrial
                          ? "✓ Completed & Verified (No trial fee)"
                          : (hasTrialDay ? "Trial Day included in cart" : `First-Time Stay (+₹${formatInr(mandatoryTrialDayFee || boardingTrialDayPrice())} Assessment Fee added)`)
                      )
                    ),
                    React.createElement(
                      "div",
                      null,
                      React.createElement("span", { className: "review-label" }, "Schedule:"),
                      hasSlotPets && slotPetIndexes.map((idx) => React.createElement("p", { key: "rv-" + idx },
                        `${(pets[idx] && pets[idx].name) || "Pet"}: ${slotLabel(slotChoices[idx])}`)),
                      hasStayItems && stayLabel
                        ? React.createElement("p", { "data-review-stay": true }, `Boarding: ${stayLabel}${customerData.time ? ` · drop-off ${customerData.time}` : ""}`)
                        : (!hasSlotPets || hasBoardingItems) && React.createElement(
                          "p",
                          null,
                          customerData.date
                            ? `${hasSlotPets ? "Boarding: " : ""}${new Date(customerData.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} · ${customerData.time || "Morning"}`
                            : "To be coordinated on WhatsApp/Call"
                        )
                    )
                  ),
                  React.createElement(
                    "div",
                    { className: "studio-payment-badge" },
                    React.createElement("span", null, "📍 Payment Mode:"),
                    React.createElement("p", null, "No advance payment required today. Pay at studio via UPI, Card, or Cash after your pet's comfortable session.")
                  )
                )
              )
            )
          ),

          // Footer / Actions
          React.createElement(
            "div",
            { className: "checkout-footer" },
            React.createElement(
              "button",
              {
                className: "btn btn-ghost",
                onClick: handlePrev,
                disabled: step === 0,
                style: { opacity: step === 0 ? 0.3 : 1 }
              },
              "← Back"
            ),
            React.createElement("div", { style: { flex: 1 } }),
            step === reviewStepIndex
              ? React.createElement(
                "button",
                {
                  className: "btn btn-primary",
                  onClick: handlePlaceOrder,
                  disabled: placing
                },
                placing ? "Reserving your time… " : "Confirm Booking & Checkout ",
                React.createElement(Arrow, null)
              )
              : React.createElement(
                "button",
                {
                  className: "btn btn-primary",
                  onClick: handleNext,
                  disabled: !isStepValid(),
                  style: { opacity: isStepValid() ? 1 : 0.4 }
                },
                "Continue ",
                React.createElement(Arrow, null)
              )
          )
        )
    )
  );
}

// Expose on window
Object.assign(window, {
  CART_CATALOG,
  PawpadCartStore,
  CartDrawer,
  CheckoutModal,
  getRecommendedAdditions
});
