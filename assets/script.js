/**
 * LinkVault — Praktikum 3 PABWE (Studi Kasus)
 * Fitur: Tab switcher, Expense Tracker, Bookmark Manager, Quiz App
 * Semua data disimpan di localStorage (tanpa backend).
 */

/* ================================================================== */
/* ========================== UTILITAS =============================== */
/* ================================================================== */

/** Ambil satu elemen; lempar error jika tidak ada (membantu debug DOM) */
function $(selector) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
    return el;
}

function $all(selector) {
    return document.querySelectorAll(selector);
}

// Key localStorage dibedakan per fitur agar data tidak saling menimpa
const STORAGE = {
    expenses: "linkvault_expenses",
    bookmarks: "linkvault_bookmarks",
    highScore: "linkvault_high_score",
    activeTab: "linkvault_active_tab"
};

/** Baca JSON dari localStorage; jika kosong / rusak kembalikan fallback */
function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const value = JSON.parse(raw);
        return Array.isArray(fallback) && !Array.isArray(value) ? fallback : value;
    } catch {
        return fallback;
    }
}

/** Simpan JSON ke localStorage */
function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        showToast("Data tidak bisa disimpan di browser ini.");
    }
}

/** Format angka ke Rupiah, mis. 15000 -> "Rp 15.000" */
const rupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(value);

/** Tanggal hari ini (zona waktu lokal) dalam format yyyy-mm-dd */
function todayISO() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(`${dateString}T00:00:00`));
}

/** ID unik sederhana untuk setiap data */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Waktu pembuatan (data lama yang belum punya createdAt memakai id numeriknya) */
function createdTime(item) {
    return item.createdAt || Number(item.id) || 0;
}

/** Cegah XSS: escape teks dari pengguna sebelum masuk innerHTML */
function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/** Hubungkan sekelompok tombol pilihan urutan (chip) ke sebuah state */
function bindSortChips(container, onChange) {
    container.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-sort]");
        if (!chip) return;

        container.querySelectorAll("[data-sort]").forEach((btn) => {
            const active = btn === chip;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-pressed", String(active));
        });

        onChange(chip.dataset.sort);
    });
}

/* ================================================================== */
/* ======================= TAB SWITCHER =============================== */
/* ================================================================== */

const tabButtons = $all(".tab-btn");
const panels = $all(".panel");
const TAB_NAMES = ["expense", "bookmark", "quiz"];

/** Ganti tab aktif: hanya satu panel tampil, lalu ingat pilihan di localStorage */
function openTab(tabName) {
    if (!TAB_NAMES.includes(tabName)) tabName = "expense";

    tabButtons.forEach((button) => {
        const isActive = button.dataset.tab === tabName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === `${tabName}-panel`);
    });

    try {
        localStorage.setItem(STORAGE.activeTab, tabName);
    } catch { /* abaikan jika storage tidak tersedia */ }
}

tabButtons.forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.tab));
});

// Pulihkan tab terakhir yang dibuka saat halaman dimuat ulang.
// Prioritas: ?tab= di URL (untuk deep-link / audit per halaman) > localStorage > default.
const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
openTab(TAB_NAMES.includes(tabFromUrl) ? tabFromUrl : (localStorage.getItem(STORAGE.activeTab) || "expense"));

/* ================================================================== */
/* ============================ TOAST ================================= */
/* ================================================================== */

const toast = $("#toast");
let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ================================================================== */
/* ============ MODAL (dipakai Ubah & Hapus, semua fitur) ============= */
/* ================================================================== */

const modal = $("#modal");
const modalTitle = $("#modalTitle");
const editForm = $("#editForm");
const closeModal = $("#closeModal");
const cancelModal = $("#cancelModal");
const saveModal = $("#saveModal");

// modalMode: "expense" | "bookmark" | "delete-expense" | "delete-bookmark"
let modalMode = "";
let modalId = "";

function showModal() {
    modal.classList.add("show");
    const firstField = editForm.querySelector("input, select, textarea");
    (firstField || saveModal).focus();
}

function hideModal() {
    modal.classList.remove("show");
    editForm.innerHTML = "";
    modalMode = "";
    modalId = "";
    saveModal.textContent = "Simpan Perubahan";
    saveModal.classList.remove("btn-danger");
}

closeModal.addEventListener("click", hideModal);
cancelModal.addEventListener("click", hideModal);

// Klik area gelap di luar kotak modal menutup modal
modal.addEventListener("click", (event) => {
    if (event.target === modal) hideModal();
});

// Tombol Escape menutup modal
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("show")) hideModal();
});

// Tekan Enter di dalam form ubah = simpan
editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveModal.click();
});

/** Modal konfirmasi hapus (Expense & Bookmark) — bukan confirm() bawaan browser */
function openDeleteConfirm(mode, id, title) {
    modalMode = mode;
    modalId = id;
    modalTitle.textContent = mode === "delete-expense" ? "Hapus Transaksi" : "Hapus Tautan";

    editForm.innerHTML = `
        <p class="delete-confirm-text">
            Yakin ingin menghapus <strong>"${escapeHTML(title)}"</strong>?
            Tindakan ini tidak dapat dibatalkan.
        </p>
    `;

    saveModal.textContent = "Ya, Hapus";
    saveModal.classList.add("btn-danger");
    showModal();
}

/* ================================================================== */
/* =================  1. CATATAN PENGELUARAN HARIAN  =================== */
/* ================================================================== */

const CATEGORIES = ["Makanan", "Transportasi", "Kuliah", "Hiburan", "Belanja", "Lainnya"];

let expenses = loadJSON(STORAGE.expenses, []);
let expenseSortMode = "newest";

const expenseForm = $("#expenseForm");
const expenseList = $("#expenseList");
const expenseSearch = $("#expenseSearch");
const expenseFilter = $("#expenseFilter");
const expenseFilterCategory = $("#expenseFilterCategory");
const expenseSortRow = $("#expenseSort");
const expenseCategory = $("#expenseCategory");

const totalIncome = $("#totalIncome");
const totalExpense = $("#totalExpense");
const balance = $("#balance");
const heroBalance = $("#heroBalance");

/** Isi <option> kategori dari satu sumber data (CATEGORIES) */
function fillCategoryOptions(select) {
    CATEGORIES.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}
fillCategoryOptions(expenseCategory);
fillCategoryOptions(expenseFilterCategory);

$("#expenseDate").value = todayISO();

function saveExpenses() {
    saveJSON(STORAGE.expenses, expenses);
}

/** Hitung total pemasukan, pengeluaran, dan saldo */
function updateExpenseSummary() {
    const income = expenses
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expense = expenses
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    totalIncome.textContent = rupiah(income);
    totalExpense.textContent = rupiah(expense);
    balance.textContent = rupiah(income - expense);
    heroBalance.textContent = rupiah(income - expense);
}

/** Terapkan pencarian (judul), filter (tipe + kategori), dan sorting */
function getVisibleExpenses() {
    const keyword = expenseSearch.value.toLowerCase().trim();
    const type = expenseFilter.value;
    const category = expenseFilterCategory.value;

    const result = expenses.filter((item) => {
        const matchKeyword = item.title.toLowerCase().includes(keyword);
        const matchType = type === "all" || item.type === type;
        const matchCategory = category === "all" || item.category === category;
        return matchKeyword && matchType && matchCategory;
    });

    result.sort((a, b) => {
        switch (expenseSortMode) {
            case "oldest":
                return new Date(a.date) - new Date(b.date) || createdTime(a) - createdTime(b);
            case "high":
                return b.amount - a.amount;
            case "low":
                return a.amount - b.amount;
            default: // newest
                return new Date(b.date) - new Date(a.date) || createdTime(b) - createdTime(a);
        }
    });

    return result;
}

function renderExpenses() {
    updateExpenseSummary();

    const visible = getVisibleExpenses();
    expenseList.innerHTML = "";

    // Empty state: bedakan "belum ada data" dan "tidak ada yang cocok"
    if (visible.length === 0) {
        expenseList.innerHTML = `
            <div class="empty" role="status">
                ${expenses.length === 0
                    ? "Belum ada transaksi.<br>Yuk, tambahkan transaksi pertama kamu."
                    : "Tidak ada transaksi yang cocok dengan pencarian atau filter."}
            </div>
        `;
        return;
    }

    visible.forEach((item) => {
        const isIncome = item.type === "income";
        const article = document.createElement("article");
        article.className = "item";

        article.innerHTML = `
            <div class="item-main">
                <div class="item-title">${escapeHTML(item.title)}</div>
                <div class="item-meta">${formatDate(item.date)}</div>
                <span class="badge ${isIncome ? "type-income" : "type-expense"}">
                    ${isIncome ? "Pemasukan" : "Pengeluaran"}
                </span>
                <span class="badge">${escapeHTML(item.category)}</span>
            </div>

            <div class="actions">
                <div class="amount ${item.type}">
                    ${isIncome ? "+" : "-"} ${rupiah(item.amount)}
                </div>
                <button type="button" class="icon-btn edit-expense" data-id="${escapeHTML(item.id)}">Ubah</button>
                <button type="button" class="icon-btn delete delete-expense" data-id="${escapeHTML(item.id)}">Hapus</button>
            </div>
        `;

        expenseList.appendChild(article);
    });
}

/** Validasi transaksi: field wajib terisi, jumlah angka valid > 0 */
function validateExpense({ title, category, amount, type, date }) {
    if (!title || !category || !type || !date) return "Semua field wajib diisi.";
    if (!Number.isFinite(amount) || amount <= 0) return "Jumlah harus berupa angka lebih dari 0.";
    return null;
}

// Tambah transaksi
expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
        title: $("#expenseTitle").value.trim(),
        category: expenseCategory.value,
        amount: Number($("#expenseAmount").value),
        type: $("#expenseType").value,
        date: $("#expenseDate").value
    };

    const error = validateExpense(data);
    if (error) {
        showToast(error);
        return;
    }

    expenses.push({ id: uid(), createdAt: Date.now(), ...data });

    saveExpenses();
    expenseForm.reset();
    $("#expenseDate").value = todayISO();
    renderExpenses();
    showToast("Transaksi berhasil disimpan.");
});

// Tombol Ubah / Hapus (event delegation)
expenseList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const item = expenses.find((expense) => expense.id === button.dataset.id);
    if (!item) return;

    if (button.classList.contains("edit-expense")) openExpenseModal(item);
    if (button.classList.contains("delete-expense")) openDeleteConfirm("delete-expense", item.id, item.title);
});

/** Buka modal ubah transaksi, isi form dengan data lama */
function openExpenseModal(item) {
    modalMode = "expense";
    modalId = item.id;
    modalTitle.textContent = "Ubah Transaksi";

    const categoryOptions = CATEGORIES
        .map((name) => `<option value="${name}" ${item.category === name ? "selected" : ""}>${name}</option>`)
        .join("");

    editForm.innerHTML = `
        <div class="form-group">
            <label for="editExpenseTitle">Judul / Deskripsi</label>
            <input id="editExpenseTitle" value="${escapeHTML(item.title)}" required>
        </div>

        <div class="form-group">
            <label for="editExpenseCategory">Kategori</label>
            <select id="editExpenseCategory">${categoryOptions}</select>
        </div>

        <div class="form-group">
            <label for="editExpenseAmount">Jumlah</label>
            <input id="editExpenseAmount" type="number" min="1" value="${item.amount}" required>
        </div>

        <div class="form-group">
            <label for="editExpenseType">Tipe</label>
            <select id="editExpenseType">
                <option value="income" ${item.type === "income" ? "selected" : ""}>Pemasukan</option>
                <option value="expense" ${item.type === "expense" ? "selected" : ""}>Pengeluaran</option>
            </select>
        </div>

        <div class="form-group">
            <label for="editExpenseDate">Tanggal</label>
            <input id="editExpenseDate" type="date" value="${item.date}" required>
        </div>
    `;

    showModal();
}

// Pencarian, filter, sorting
expenseSearch.addEventListener("input", renderExpenses);
expenseFilter.addEventListener("change", renderExpenses);
expenseFilterCategory.addEventListener("change", renderExpenses);
bindSortChips(expenseSortRow, (mode) => {
    expenseSortMode = mode;
    renderExpenses();
});

/* ================================================================== */
/* ===================  2. BOOKMARK / LINK MANAGER  ==================== */
/* ================================================================== */

let bookmarks = loadJSON(STORAGE.bookmarks, []);
let bookmarkSortMode = "newest";

const bookmarkForm = $("#bookmarkForm");
const bookmarkList = $("#bookmarkList");
const bookmarkSearch = $("#bookmarkSearch");
const bookmarkSortRow = $("#bookmarkSort");
const heroLinkCount = $("#heroLinkCount");

function saveBookmarks() {
    saveJSON(STORAGE.bookmarks, bookmarks);
}

/** Validasi URL: wajib diawali http:// atau https:// dan berbentuk URL yang benar */
function validURL(url) {
    if (!/^https?:\/\/.+/i.test(url)) return false;
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes(".") || parsed.hostname === "localhost";
    } catch {
        return false;
    }
}

/** Cari (nama / URL / kategori) lalu urutkan (terbaru / A–Z / Z–A) */
function getVisibleBookmarks() {
    const keyword = bookmarkSearch.value.toLowerCase().trim();

    const result = bookmarks.filter((item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.url.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword)
    );

    result.sort((a, b) => {
        if (bookmarkSortMode === "az") return a.title.localeCompare(b.title, "id", { sensitivity: "base" });
        if (bookmarkSortMode === "za") return b.title.localeCompare(a.title, "id", { sensitivity: "base" });
        return createdTime(b) - createdTime(a);
    });

    return result;
}

function renderBookmarks() {
    heroLinkCount.textContent = `${bookmarks.length} tersimpan`;

    const visible = getVisibleBookmarks();
    bookmarkList.innerHTML = "";

    if (visible.length === 0) {
        bookmarkList.innerHTML = `
            <div class="empty" role="status">
                ${bookmarks.length === 0
                    ? "Belum ada tautan tersimpan.<br>Simpan website pentingmu di sini."
                    : "Tidak ada tautan yang cocok dengan pencarianmu."}
            </div>
        `;
        return;
    }

    visible.forEach((item) => {
        const safeUrl = escapeHTML(item.url);
        const article = document.createElement("article");
        article.className = "item bookmark-card";

        // Judul, URL, dan tombol Buka: semuanya membuka tautan di tab baru
        article.innerHTML = `
            <div class="site-icon">${escapeHTML(item.title.charAt(0).toUpperCase())}</div>

            <div class="item-main" style="flex:1">
                <a class="bookmark-title" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.title)}</a>

                <div class="url">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
                </div>
                <span class="badge">${escapeHTML(item.category)}</span>
                ${item.note ? `<div class="note">${escapeHTML(item.note)}</div>` : ""}
            </div>

            <div class="actions">
                <a class="icon-btn open-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Buka ↗</a>
                <button type="button" class="icon-btn edit-bookmark" data-id="${escapeHTML(item.id)}">Ubah</button>
                <button type="button" class="icon-btn delete delete-bookmark" data-id="${escapeHTML(item.id)}">Hapus</button>
            </div>
        `;

        bookmarkList.appendChild(article);
    });
}

/** Validasi bookmark: nama, URL, kategori wajib; URL harus valid */
function validateBookmark({ title, url, category }) {
    if (!title || !url || !category) return "Nama, URL, dan kategori wajib diisi.";
    if (!validURL(url)) return "URL harus diawali http:// atau https:// dan berbentuk alamat yang benar.";
    return null;
}

// Tambah bookmark
bookmarkForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
        title: $("#bookmarkTitle").value.trim(),
        url: $("#bookmarkUrl").value.trim(),
        category: $("#bookmarkCategory").value.trim(),
        note: $("#bookmarkNote").value.trim()
    };

    const error = validateBookmark(data);
    if (error) {
        showToast(error);
        return;
    }

    bookmarks.push({ id: uid(), createdAt: Date.now(), ...data });

    saveBookmarks();
    bookmarkForm.reset();
    renderBookmarks();
    showToast("Tautan berhasil disimpan.");
});

// Tombol Ubah / Hapus (event delegation)
bookmarkList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const item = bookmarks.find((bookmark) => bookmark.id === button.dataset.id);
    if (!item) return;

    if (button.classList.contains("edit-bookmark")) openBookmarkModal(item);
    if (button.classList.contains("delete-bookmark")) openDeleteConfirm("delete-bookmark", item.id, item.title);
});

/** Buka modal ubah bookmark */
function openBookmarkModal(item) {
    modalMode = "bookmark";
    modalId = item.id;
    modalTitle.textContent = "Ubah Tautan";

    editForm.innerHTML = `
        <div class="form-group">
            <label for="editBookmarkTitle">Nama / Judul</label>
            <input id="editBookmarkTitle" value="${escapeHTML(item.title)}" required>
        </div>

        <div class="form-group">
            <label for="editBookmarkUrl">URL</label>
            <input id="editBookmarkUrl" value="${escapeHTML(item.url)}" required>
        </div>

        <div class="form-group">
            <label for="editBookmarkCategory">Kategori</label>
            <input id="editBookmarkCategory" value="${escapeHTML(item.category)}" required>
        </div>

        <div class="form-group">
            <label for="editBookmarkNote">Catatan</label>
            <textarea id="editBookmarkNote">${escapeHTML(item.note || "")}</textarea>
        </div>
    `;

    showModal();
}

// Pencarian & sorting
bookmarkSearch.addEventListener("input", renderBookmarks);
bindSortChips(bookmarkSortRow, (mode) => {
    bookmarkSortMode = mode;
    renderBookmarks();
});

/* ================================================================== */
/* ============ AKSI SIMPAN DI MODAL (ubah & hapus) =================== */
/* ================================================================== */

saveModal.addEventListener("click", () => {
    if (modalMode === "expense") {
        const data = {
            title: $("#editExpenseTitle").value.trim(),
            category: $("#editExpenseCategory").value,
            amount: Number($("#editExpenseAmount").value),
            type: $("#editExpenseType").value,
            date: $("#editExpenseDate").value
        };

        const error = validateExpense(data);
        if (error) {
            showToast(error);
            return;
        }

        const index = expenses.findIndex((item) => item.id === modalId);
        if (index !== -1) expenses[index] = { ...expenses[index], ...data };

        saveExpenses();
        renderExpenses();
        hideModal();
        showToast("Transaksi berhasil diubah.");
    } else if (modalMode === "bookmark") {
        const data = {
            title: $("#editBookmarkTitle").value.trim(),
            url: $("#editBookmarkUrl").value.trim(),
            category: $("#editBookmarkCategory").value.trim(),
            note: $("#editBookmarkNote").value.trim()
        };

        const error = validateBookmark(data);
        if (error) {
            showToast(error);
            return;
        }

        const index = bookmarks.findIndex((item) => item.id === modalId);
        if (index !== -1) bookmarks[index] = { ...bookmarks[index], ...data };

        saveBookmarks();
        renderBookmarks();
        hideModal();
        showToast("Tautan berhasil diubah.");
    } else if (modalMode === "delete-expense") {
        expenses = expenses.filter((item) => item.id !== modalId);
        saveExpenses();
        renderExpenses();
        hideModal();
        showToast("Transaksi dihapus.");
    } else if (modalMode === "delete-bookmark") {
        bookmarks = bookmarks.filter((item) => item.id !== modalId);
        saveBookmarks();
        renderBookmarks();
        hideModal();
        showToast("Tautan dihapus.");
    }
});

/* ================================================================== */
/* =========================  3. KUIS INTERAKTIF  ======================== */
/* ================================================================== */

// Bank soal: array of object (pertanyaan, opsi, index jawaban benar)
const questions = [
    {
        question: "Apa fungsi utama querySelector()?",
        options: [
            "Menghapus semua data",
            "Memilih satu elemen DOM berdasarkan selector",
            "Menyimpan data ke database",
            "Membuat file JavaScript"
        ],
        answer: 1
    },
    {
        question: "Method array apa yang digunakan untuk menambahkan data di bagian akhir array?",
        options: ["filter()", "find()", "push()", "sort()"],
        answer: 2
    },
    {
        question: "Apa kegunaan localStorage?",
        options: [
            "Menjalankan server",
            "Mengubah CSS menjadi JavaScript",
            "Membuat koneksi Wi-Fi",
            "Menyimpan data di browser agar tetap tersedia setelah refresh"
        ],
        answer: 3
    },
    {
        question: "Event apa yang biasanya digunakan ketika form dikirim?",
        options: ["hover", "scroll", "submit", "loadCSS"],
        answer: 2
    },
    {
        question: "Manakah yang merupakan contoh array of object?",
        options: [
            "{nama: ['Ester', 'Budi']}",
            "[{nama: 'Ester'}, {nama: 'Budi'}]",
            "'Ester, Budi'",
            "true && false"
        ],
        answer: 1
    }
];

const QUESTION_TIME = 20; // bonus: timer per soal (detik)

// State kuis
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizTimerId = null;
let quizTimeLeft = QUESTION_TIME;

const quizStart = $("#quizStart");
const quizBox = $("#quizBox");
const quizResult = $("#quizResult");
const quizQuestion = $("#quizQuestion");
const quizOptions = $("#quizOptions");
const quizNumber = $("#quizNumber");
const quizTimer = $("#quizTimer");
const quizProgress = $("#quizProgress");
const quizFeedback = $("#quizFeedback");
const nextQuizBtn = $("#nextQuizBtn");

$("#quizTotalText").textContent = questions.length;

function getHighScore() {
    return Number(localStorage.getItem(STORAGE.highScore)) || 0;
}

/** Tampilkan high score (mis. "4/5") di layar mulai & hasil */
function showHighScore() {
    const text = `${getHighScore()}/${questions.length}`;
    $("#highScoreStart").textContent = text;
    $("#highScoreResult").textContent = text;
}

/** Mulai / ulangi kuis: reset seluruh state */
function startQuiz() {
    quizIndex = 0;
    quizScore = 0;
    quizAnswered = false;

    quizStart.style.display = "none";
    quizResult.classList.remove("show");
    quizBox.classList.add("show");

    renderQuestion();
}

/** Render soal aktif + opsi lewat DOM */
function renderQuestion() {
    const current = questions[quizIndex];

    quizNumber.textContent = `Soal ${quizIndex + 1} dari ${questions.length}`;
    quizQuestion.textContent = current.question;
    quizOptions.innerHTML = "";
    quizFeedback.textContent = "";
    nextQuizBtn.disabled = true;
    nextQuizBtn.textContent = quizIndex === questions.length - 1 ? "Lihat Hasil →" : "Berikutnya →";
    quizAnswered = false;

    quizProgress.style.width = `${((quizIndex + 1) / questions.length) * 100}%`;

    current.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option";
        button.textContent = option;
        button.addEventListener("click", () => answerQuestion(index));
        quizOptions.appendChild(button);
    });

    startTimer();
}

/** Timer mundur per soal (bonus). Jika habis, dihitung salah. */
function startTimer() {
    stopTimer();
    quizTimeLeft = QUESTION_TIME;
    renderTimer();

    quizTimerId = setInterval(() => {
        quizTimeLeft--;
        renderTimer();

        if (quizTimeLeft <= 0) {
            stopTimer();
            if (!quizAnswered) answerQuestion(-1);
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(quizTimerId);
    quizTimerId = null;
}

function renderTimer() {
    quizTimer.textContent = `⏱ ${Math.max(quizTimeLeft, 0)} dtk`;
    quizTimer.classList.toggle("low", quizTimeLeft <= 5);
}

/** Nilai jawaban: bandingkan dengan kunci, update skor, beri feedback */
function answerQuestion(selectedIndex) {
    if (quizAnswered) return;

    quizAnswered = true;
    stopTimer();

    const current = questions[quizIndex];
    const isCorrect = selectedIndex === current.answer;

    quizOptions.querySelectorAll(".option").forEach((button, index) => {
        button.disabled = true;
        if (index === current.answer) button.classList.add("correct");
        if (index === selectedIndex && !isCorrect) button.classList.add("wrong");
    });

    if (isCorrect) {
        quizScore++;
        quizFeedback.textContent = "Jawaban benar!";
        quizFeedback.style.color = "#2f6e4a";
    } else {
        quizFeedback.textContent = selectedIndex === -1 ? "Waktu habis." : "Belum tepat.";
        quizFeedback.style.color = "#a8425a";
    }

    nextQuizBtn.disabled = false;
}

nextQuizBtn.addEventListener("click", () => {
    quizIndex++;

    if (quizIndex < questions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
});

/** Tampilkan skor akhir, bandingkan & simpan high score */
function finishQuiz() {
    stopTimer();
    quizBox.classList.remove("show");
    quizResult.classList.add("show");

    $("#finalScore").textContent = `${quizScore}/${questions.length}`;

    const isNewRecord = quizScore > getHighScore();
    if (isNewRecord) localStorage.setItem(STORAGE.highScore, quizScore);

    let message = "Bagus. Coba lagi untuk mendapatkan skor yang lebih tinggi.";
    if (quizScore === questions.length) message = "Mantap, semua jawaban benar!";
    else if (isNewRecord && quizScore > 0) message = "Rekor baru! Skor terbaikmu diperbarui.";
    $("#scoreMessage").textContent = message;

    showHighScore();
}

$("#startQuizBtn").addEventListener("click", startQuiz);
$("#retryQuizBtn").addEventListener("click", startQuiz);

/* ================================================================== */
/* ================ NAVBAR, TOMBOL HERO & SCROLLSPY =================== */
/* ================================================================== */

function scrollToApp() {
    $("#app").scrollIntoView({ behavior: "smooth" });
}

$("#startAppBtn").addEventListener("click", scrollToApp);
$("#heroStartBtn").addEventListener("click", scrollToApp);
$("#heroFeatureBtn").addEventListener("click", scrollToApp);

const navLinks = $all("#mainNav a");
const spySections = ["beranda", "app", "tentang"].map((id) => document.getElementById(id)).filter(Boolean);

/** Tandai link nav sesuai section yang sedang terlihat */
function setActiveNav(sectionId) {
    navLinks.forEach((link) => link.classList.toggle("active", link.dataset.nav === sectionId));
}

navLinks.forEach((link) => link.addEventListener("click", () => setActiveNav(link.dataset.nav)));

if ("IntersectionObserver" in window) {
    const spyObserver = new IntersectionObserver(
        (entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActiveNav(visible.target.id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    spySections.forEach((section) => spyObserver.observe(section));
}

/* ================================================================== */
/* ======================== RENDER AWAL =============================== */
/* ================================================================== */

renderExpenses();
renderBookmarks();
showHighScore();