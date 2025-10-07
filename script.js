const storageKey = "politodex-contacts";

const form = document.getElementById("contact-form");
const fileInput = form?.querySelector("input[name='photo']");
const fileNameDisplay = form?.querySelector(".file-name");
const defaultFileLabel = fileNameDisplay?.dataset.empty ?? "No file selected";
const track = document.getElementById("contact-track");
const template = document.getElementById("contact-card-template");
const prevButton = document.querySelector(".nav-button.prev");
const nextButton = document.querySelector(".nav-button.next");
const searchInput = document.getElementById("contact-search");

const modal = document.getElementById("contact-modal");
const modalView = modal?.querySelector(".contact-modal__view");
const modalPortrait = modal?.querySelector("#contact-modal-portrait");
const modalName = modal?.querySelector(".contact-modal__name");
const modalCompany = modal?.querySelector(".contact-modal__company");
const modalIndustry = modal?.querySelector(".contact-modal__industry");
const modalEmail = modal?.querySelector(".contact-modal__email");
const modalPhone = modal?.querySelector(".contact-modal__phone");
const modalNotes = modal?.querySelector(".contact-modal__notes");
const editButton = modal?.querySelector("[data-edit]");
const editForm = document.getElementById("edit-form");
const cancelEditButton = modal?.querySelector("[data-cancel-edit]");
const modalCloseControls = modal ? Array.from(modal.querySelectorAll("[data-close]")) : [];
const editFileInput = editForm?.querySelector("input[name='photo']");
const editFileNameDisplay = editForm?.querySelector(".file-name");
const editDefaultFileLabel = editFileNameDisplay?.textContent ?? "No file selected";

let activeContactIndex = null;
let isTrackPointerDown = false;
let trackPointerId = null;
let trackPointerStartX = 0;
let trackPointerScrollStart = 0;
let trackWasDragged = false;
let trackPointerCaptured = false;
const TRACK_DRAG_THRESHOLD = 12;

const defaultContacts = [
  {
    name: "Rick Sanchez",
    company: "Campaign for Galactic Unity",
    industry: "Multiverse Strategy",
    email: "rick@citadel.gov",
    phone: "+44 020 1234 567",
    notes:
      "Chief strategist specializing in cross-reality outreach initiatives. Prefers unconventional tactics.",
    photo:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "President Morty",
    company: "Citadel Governance Council",
    industry: "Executive Leadership",
    email: "president.morty@citadel.gov",
    phone: "+1 (202) 555-0110",
    notes:
      "Progressive liaison and key power broker when navigating citadel-level policy decisions.",
    photo:
      "https://images.unsplash.com/photo-1603415527039-36e4abcc2cb9?auto=format&fit=crop&w=400&q=80",
  },
];

function loadContacts() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to parse stored contacts", error);
  }
  return defaultContacts;
}

let contacts = loadContacts();

function saveContacts() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(contacts));
  } catch (error) {
    console.error("Failed to save contacts", error);
  }
}

function getFilteredContactsWithIndex() {
  const query = searchInput?.value?.trim().toLowerCase() ?? "";
  return contacts
    .map((contact, index) => ({ contact, index }))
    .filter(({ contact }) => {
      if (!query) return true;
      return (contact.name || "").toLowerCase().includes(query);
    });
}

function renderContacts() {
  if (!track || !template) {
    return;
  }

  const filtered = getFilteredContactsWithIndex();
  track.innerHTML = "";

  if (filtered.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No contacts found.";
    track.appendChild(emptyState);
    return;
  }

  filtered.forEach(({ contact, index }) => {
    const card = template.content.cloneNode(true);
    const article = card.querySelector(".contact-card");
    const portrait = card.querySelector(".portrait");
    const nameEl = card.querySelector(".contact-name");
    const companyEl = card.querySelector(".company");

    const fallbackPortrait = contact.photo || generateInitialsPlaceholder(contact.name);
    portrait.src = fallbackPortrait;
    portrait.alt = `${contact.name || "Contact"}'s portrait`;
    nameEl.textContent = contact.name || "Untitled";
    companyEl.textContent = contact.company || "Independent";

    const contactIndex = index;
    article.dataset.contactIndex = String(contactIndex);
    article.style.setProperty("--card-index", contactIndex);
    article.setAttribute("aria-label", `${contact.name || "Contact"} details`);
    article.addEventListener("focus", () => scrollIntoView(article));
    article.addEventListener("click", (event) => {
      if (trackWasDragged) {
        trackWasDragged = false;
        return;
      }
      event.preventDefault();
      openContactModal(contactIndex);
    });
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openContactModal(contactIndex);
      }
    });

    track.appendChild(card);
  });

  toggleNavButtons();
}

function generateInitialsPlaceholder(name = "Unknown") {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 400, 400);
  gradient.addColorStop(0, "#38c6ff");
  gradient.addColorStop(1, "#0d3c4f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(3, 26, 36, 0.8)";
  ctx.font = "bold 160px Rajdhani";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

async function getPhotoData(file) {
  if (!file) return null;
  if (file.size > 3 * 1024 * 1024) {
    alert("Portrait file is larger than 3MB. Please choose a smaller image.");
    return null;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", (event) => reject(event));
    reader.readAsDataURL(file);
  });
}

function scrollTrackBy(delta) {
  if (!track) return;
  track.scrollBy({ left: delta, behavior: "smooth" });
}

function scrollIntoView(element) {
  const trackBounds = track.getBoundingClientRect();
  const elementBounds = element.getBoundingClientRect();
  if (elementBounds.left < trackBounds.left || elementBounds.right > trackBounds.right) {
    element.scrollIntoView({ behavior: "smooth", inline: "center" });
  }
}

function toggleNavButtons() {
  if (!track || !prevButton || !nextButton) return;
  const maxScroll = track.scrollWidth - track.clientWidth;
  prevButton.disabled = track.scrollLeft <= 0;
  nextButton.disabled = track.scrollLeft >= maxScroll - 1;
}

function populateModal(contact) {
  if (!modal || !modalPortrait || !modalName || !modalCompany || !modalIndustry || !modalEmail || !modalPhone || !modalNotes) {
    return;
  }

  const portraitSource = contact.photo || generateInitialsPlaceholder(contact.name);
  modalPortrait.src = portraitSource;
  modalPortrait.alt = `${contact.name || "Contact"}'s portrait`;
  modalName.textContent = contact.name || "Untitled";
  modalCompany.textContent = contact.company || "Independent";
  modalIndustry.textContent = contact.industry || "General";

  const emailText = contact.email?.trim();
  if (emailText) {
    modalEmail.textContent = emailText;
    modalEmail.href = `mailto:${emailText}`;
    modalEmail.classList.remove("is-disabled");
  } else {
    modalEmail.textContent = "—";
    modalEmail.removeAttribute("href");
    modalEmail.classList.add("is-disabled");
  }

  const phoneText = contact.phone?.trim();
  if (phoneText) {
    modalPhone.textContent = phoneText;
    modalPhone.href = `tel:${phoneText.replace(/[^+\d]/g, "")}`;
    modalPhone.classList.remove("is-disabled");
  } else {
    modalPhone.textContent = "—";
    modalPhone.removeAttribute("href");
    modalPhone.classList.add("is-disabled");
  }

  modalNotes.textContent = contact.notes?.trim() || "No notes provided.";
}

function populateEditForm(contact) {
  if (!editForm) return;
  const nameField = editForm.elements.namedItem("name");
  const companyField = editForm.elements.namedItem("company");
  const industryField = editForm.elements.namedItem("industry");
  const emailField = editForm.elements.namedItem("email");
  const phoneField = editForm.elements.namedItem("phone");
  const notesField = editForm.elements.namedItem("notes");

  if (nameField) nameField.value = contact.name || "";
  if (companyField) companyField.value = contact.company || "";
  if (industryField) industryField.value = contact.industry || "";
  if (emailField) emailField.value = contact.email || "";
  if (phoneField) phoneField.value = contact.phone || "";
  if (notesField) notesField.value = contact.notes || "";

  if (editFileInput) {
    editFileInput.value = "";
  }
  if (editFileNameDisplay) {
    editFileNameDisplay.textContent = editDefaultFileLabel;
    editFileNameDisplay.dataset.empty = "true";
  }
}

function setModalEditing(isEditing) {
  if (!modal || !modalView || !editForm) {
    return;
  }

  if (isEditing) {
    modal.classList.add("editing");
    modalView.setAttribute("hidden", "true");
    editForm.removeAttribute("hidden");
  } else {
    modal.classList.remove("editing");
    modalView.removeAttribute("hidden");
    editForm.setAttribute("hidden", "true");
    if (editFileInput) {
      editFileInput.value = "";
    }
    if (editFileNameDisplay) {
      editFileNameDisplay.textContent = editDefaultFileLabel;
      editFileNameDisplay.dataset.empty = "true";
    }
  }
}

function openContactModal(index) {
  if (!modal) return;
  const contact = contacts[index];
  if (!contact) return;

  activeContactIndex = index;
  populateModal(contact);
  populateEditForm(contact);
  setModalEditing(false);

  modal.removeAttribute("hidden");
  modal.classList.add("open");
  document.body.classList.add("modal-open");

  const closeButton = modal.querySelector(".contact-modal__close");
  closeButton?.focus({ preventScroll: true });
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("hidden", "true");
  document.body.classList.remove("modal-open");
  activeContactIndex = null;
  setModalEditing(false);
}

function updateEditFileName() {
  if (!editFileInput || !editFileNameDisplay) return;
  const file = editFileInput.files?.[0];
  if (file) {
    editFileNameDisplay.textContent = file.name;
    editFileNameDisplay.dataset.empty = "false";
  } else {
    editFileNameDisplay.textContent = editDefaultFileLabel;
    editFileNameDisplay.dataset.empty = "true";
  }
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const contact = Object.fromEntries(formData.entries());
    const photoData = await getPhotoData(fileInput?.files?.[0]);
    const trimmedContact = Object.fromEntries(
      Object.entries(contact).map(([key, value]) => [key, value.trim()])
    );

    const newContact = {
      ...trimmedContact,
      photo: photoData || contactsImageFallback(trimmedContact),
    };

    contacts = [newContact, ...contacts];
    saveContacts();
    renderContacts();
    form.reset();
    updateFileName();
    track?.firstElementChild?.querySelector(".contact-card")?.focus({ preventScroll: true });
  });
}

function contactsImageFallback(contact) {
  if (contact.photo) return contact.photo;
  if (contact.name) return generateInitialsPlaceholder(contact.name);
  return null;
}

function updateFileName() {
  if (!fileInput || !fileNameDisplay) return;
  const file = fileInput.files?.[0];
  if (file) {
    fileNameDisplay.textContent = file.name;
    fileNameDisplay.dataset.empty = "false";
  } else {
    fileNameDisplay.textContent = defaultFileLabel;
    fileNameDisplay.dataset.empty = "true";
  }
}

fileInput?.addEventListener("change", updateFileName);

editFileInput?.addEventListener("change", updateEditFileName);

prevButton?.addEventListener("click", () => scrollTrackBy(-300));
nextButton?.addEventListener("click", () => scrollTrackBy(300));

track?.addEventListener("scroll", () => window.requestAnimationFrame(toggleNavButtons));

track?.addEventListener("pointerdown", (event) => {
  if (!track) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (!event.isPrimary) return;
  isTrackPointerDown = true;
  trackWasDragged = false;
  trackPointerId = event.pointerId;
  trackPointerStartX = event.clientX;
  trackPointerScrollStart = track.scrollLeft;
  trackPointerCaptured = false;
  track.classList.remove("dragging");
});

track?.addEventListener("pointermove", (event) => {
  if (!isTrackPointerDown || !track) return;
  const deltaX = event.clientX - trackPointerStartX;
  if (Math.abs(deltaX) < TRACK_DRAG_THRESHOLD) {
    return;
  }
  if (!trackPointerCaptured && trackPointerId !== null) {
    try {
      track.setPointerCapture?.(trackPointerId);
      trackPointerCaptured = true;
    } catch (error) {
      trackPointerCaptured = false;
    }
  }
  track.classList.add("dragging");
  trackWasDragged = true;
  track.scrollLeft = trackPointerScrollStart - deltaX;
});

const releaseTrackPointer = () => {
  if (!isTrackPointerDown || !track) return;
  const didDrag = trackWasDragged;
  isTrackPointerDown = false;
  if (trackPointerCaptured && trackPointerId !== null) {
    try {
      track.releasePointerCapture?.(trackPointerId);
    } catch (error) {
      // ignore
    }
  }
  trackPointerId = null;
  trackPointerCaptured = false;
  track.classList.remove("dragging");
  if (didDrag) {
    requestAnimationFrame(() => {
      trackWasDragged = false;
    });
  } else {
    trackWasDragged = false;
  }
};

track?.addEventListener("pointerup", releaseTrackPointer);
track?.addEventListener("pointercancel", releaseTrackPointer);
track?.addEventListener("pointerleave", () => {
  if (!isTrackPointerDown) return;
  releaseTrackPointer();
});

modalCloseControls.forEach((control) =>
  control.addEventListener("click", (event) => {
    event.preventDefault();
    closeModal();
  })
);

cancelEditButton?.addEventListener("click", () => {
  if (activeContactIndex !== null) {
    populateEditForm(contacts[activeContactIndex]);
    populateModal(contacts[activeContactIndex]);
  }
  setModalEditing(false);
});

editButton?.addEventListener("click", () => {
  if (activeContactIndex !== null) {
    populateEditForm(contacts[activeContactIndex]);
  }
  setModalEditing(true);
});

editForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (activeContactIndex === null) {
    return;
  }

  const existing = contacts[activeContactIndex];
  const updated = { ...existing };
  const formData = new FormData(editForm);

  for (const [key, value] of formData.entries()) {
    if (key === "photo") continue;
    if (typeof value === "string") {
      updated[key] = value.trim();
    }
  }

  const newPhoto = await getPhotoData(editFileInput?.files?.[0]);
  if (newPhoto) {
    updated.photo = newPhoto;
  } else if (!updated.photo) {
    updated.photo = contactsImageFallback(updated);
  }

  contacts[activeContactIndex] = updated;
  saveContacts();
  renderContacts();
  populateModal(updated);
  populateEditForm(updated);
  setModalEditing(false);
});

searchInput?.addEventListener("input", () => {
  renderContacts();
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    scrollTrackBy(-250);
  }
  if (event.key === "ArrowRight") {
    scrollTrackBy(250);
  }
  if (event.key === "Escape") {
    closeModal();
  }
});

renderContacts();
