import os
import numpy as np
import matplotlib
import matplotlib.figure
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Wedge
from matplotlib.lines import Line2D

OUT = "ilustrasi_moderasi"  # folder output (dibuat di tempat script dijalankan)
os.makedirs(OUT, exist_ok=True)

# ---- palet (diambil dari Manual_Book_Perhitungan_Moderasi_EduBuz.docx) ----
INK = "#332F2D"      # teks utama
CREAM = "#F7F1E8"    # latar sel tabel
OLIVE = "#776938"    # header tabel / aksen utama
COPPER = "#B9895F"   # aksen label ILUSTRASI
MUTED = "#5D594C"    # teks sekunder
WHITE = "#FFFFFF"
# turunan (tint) dari warna di atas
OLIVE_L = "#D9D0B2"
COPPER_L = "#EBD6C1"
GRID = "#E3D9C6"
DEEP = "#4D4524"

for f in font_manager.findSystemFonts():
    if "Inter" in os.path.basename(f) and "Display" not in os.path.basename(f):
        font_manager.fontManager.addfont(f)
_has_inter = any(f.name == "Inter" for f in font_manager.fontManager.ttflist)
plt.rcParams["font.family"] = "Inter" if _has_inter else "DejaVu Sans"  # fallback bila Inter tidak ada
plt.rcParams["svg.fonttype"] = "none"  # teks di SVG tetap bisa diedit (Figma/Inkscape)

# setiap savefig PNG otomatis juga menyimpan SVG (vektor, editable)
_orig_savefig = matplotlib.figure.Figure.savefig
def _savefig_both(self, fname, *a, **k):
    _orig_savefig(self, fname, *a, **k)
    if str(fname).endswith(".png"):
        _orig_savefig(self, str(fname)[:-4] + ".svg", facecolor=k.get("facecolor"))
matplotlib.figure.Figure.savefig = _savefig_both
plt.rcParams["axes.unicode_minus"] = False

TAG = {
    "real": ("ANGKA ASLI NOTEBOOK", OLIVE),
    "ilus": ("ILUSTRASI", COPPER),
    "diag": ("DIAGRAM · KONFIGURASI ASLI", MUTED),
    "calc": ("DIHITUNG DARI ANGKA ASLI", DEEP),
}


def fmt(v, d=4):
    return f"{v:.{d}f}".replace(".", ",")


def base(title, sub, tags, source):
    fig = plt.figure(figsize=(8, 4.5), facecolor=CREAM)
    fig.text(0.04, 0.955, title, size=13.5, weight="bold", color=INK, va="top")
    fig.text(0.04, 0.893, sub, size=7.6, color=MUTED, va="top")
    x = 0.96
    for t in tags[::-1]:
        lab, col = TAG[t]
        tx = fig.text(x, 0.953, lab, size=6, weight="bold", color=WHITE, ha="right", va="top",
                      bbox=dict(boxstyle="round,pad=0.38,rounding_size=0.3", fc=col, ec="none"))
        fig.canvas.draw()
        bb = tx.get_window_extent()
        x -= (bb.width / fig.bbox.width) + 0.018
    fig.add_artist(Line2D([0.04, 0.96], [0.855, 0.855], color=OLIVE, lw=1.3))
    fig.text(0.04, 0.028, source, size=6, color=MUTED, va="bottom")
    return fig


def card(ax, grid=True):
    ax.set_facecolor(WHITE)
    for s in ax.spines.values():
        s.set_color(GRID)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(colors=MUTED, labelsize=7, length=2.5)
    if grid:
        ax.grid(True, color=GRID, lw=0.6)
        ax.set_axisbelow(True)


def panel_title(ax, t, tag=None):
    ax.set_title(t, loc="left", fontsize=8.3, weight="bold", color=INK, pad=6)
    if tag:
        lab, col = TAG[tag]
        ax.text(1.0, 1.04, lab, transform=ax.transAxes, ha="right", va="bottom", size=5.3, weight="bold",
                color=WHITE, bbox=dict(boxstyle="round,pad=0.3,rounding_size=0.3", fc=col, ec="none"))


def canvas(fig, rect=(0.04, 0.09, 0.92, 0.75)):
    ax = fig.add_axes(rect)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100 * rect[3] * 4.5 / (rect[2] * 8))
    ax.axis("off")
    return ax


def box(ax, x, y, w, h, text, fc=WHITE, ec=OLIVE, tc=INK, size=7.2, weight="normal", lw=1.2, r=1.2, ls="-", va="center"):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw, ls=ls)
    ax.add_patch(p)
    if text:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va=va, size=size, color=tc, weight=weight, linespacing=1.35)


def arrow(ax, x1, y1, x2, y2, color=OLIVE, lw=1.4, style="-|>", ms=9, rad=0.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0))


def cm_draw(ax, tn, fp, fn, tp, title, tag=None, size=15):
    card(ax, grid=False)
    cells = [[tn, fp], [fn, tp]]
    names = [["TN", "FP"], ["FN", "TP"]]
    for i in range(2):
        for j in range(2):
            good = (i == j)
            fc = OLIVE if good else COPPER
            if (i, j) in [(0, 0), (1, 1)]:
                alpha = 0.25 + 0.75 * cells[i][j] / max(tn, tp)
            else:
                alpha = 0.35 + 0.65 * cells[i][j] / max(fp, fn, 1) * (0.55 if max(fp, fn) > 0 else 0)
            ax.add_patch(Rectangle((j, 1 - i), 1, 1, fc=fc, alpha=min(alpha, 1), ec=WHITE, lw=2.5))
            ax.text(j + 0.5, 1 - i + 0.57, str(cells[i][j]), ha="center", va="center", size=size, weight="bold",
                    color=WHITE if (good and alpha > 0.5) else INK)
            ax.text(j + 0.5, 1 - i + 0.25, names[i][j], ha="center", va="center", size=7, color=WHITE if (good and alpha > 0.5) else MUTED)
    ax.set_xlim(0, 2)
    ax.set_ylim(0, 2)
    ax.set_xticks([0.5, 1.5])
    ax.set_xticklabels(["NON_TOXIC", "TOXIC"], size=7)
    ax.set_yticks([0.5, 1.5])
    ax.set_yticklabels(["TOXIC", "NON_TOXIC"], size=7, rotation=90, va="center")
    ax.set_xlabel("PREDIKSI", size=7, color=MUTED)
    ax.set_ylabel("AKTUAL", size=7, color=MUTED)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    panel_title(ax, title, tag)


SRC = "Sumber: moderation (1).ipynb · palet warna: Manual_Book_Perhitungan_Moderasi_EduBuz.docx"

# =====================================================================
# 01 Alur sistem moderasi
# =====================================================================
fig = base("Alur Sistem Moderasi EduBuz", "Dari pesan siswa sampai keputusan CONTINUE / REJECT (konfigurasi sesuai notebook)",
           ["diag"], SRC + " · Bab 1")
ax = canvas(fig)
steps = [
    ("1  Input", "Siswa mengirim\nteks mentah"),
    ("2  Preprocessing", "Trim + rapikan\nwhitespace"),
    ("3  Chunking", "Potong tiap 300\nkarakter, overlap 0"),
    ("4  IndoBERT", "Tokenisasi (maks 32)\nP(TOXIC) tiap chunk"),
    ("5  Agregasi", "Ambil probabilitas\nMAKSIMUM antar-chunk"),
    ("6  Threshold", "P ≥ 0,90 → TOXIC\nselain itu NON_TOXIC"),
]
bw, bh = 21.5, 15
xs = [1.5, 26.0, 50.5, 75.0]
ys = [28, 5]
pos = [(xs[0], ys[0]), (xs[1], ys[0]), (xs[2], ys[0]), (xs[3], ys[0]), (xs[3], ys[1]), (xs[2], ys[1])]
for i, ((t, d), (x, y)) in enumerate(zip(steps, pos)):
    hl = i in (3, 5)
    box(ax, x, y, bw, bh, "", fc=OLIVE if hl else WHITE, ec=OLIVE)
    ax.text(x + bw / 2, y + bh - 3.6, t, ha="center", va="center", size=7.6, weight="bold", color=WHITE if hl else OLIVE)
    ax.text(x + bw / 2, y + 5.3, d, ha="center", va="center", size=6.3, color=WHITE if hl else INK, linespacing=1.35)
for a, b in [(0, 1), (1, 2), (2, 3)]:
    arrow(ax, pos[a][0] + bw, pos[a][1] + bh / 2, pos[b][0], pos[b][1] + bh / 2)
arrow(ax, pos[3][0] + bw / 2, pos[3][1], pos[4][0] + bw / 2, pos[4][1] + bh)
arrow(ax, pos[4][0], pos[4][1] + bh / 2, pos[5][0] + bw, pos[5][1] + bh / 2)
# aksi
box(ax, 1.5, 9.2, 21.5, 6.3, "REJECT  (label TOXIC)", fc=COPPER, ec=COPPER, tc=WHITE, size=7, weight="bold")
box(ax, 1.5, 1.2, 21.5, 6.3, "CONTINUE  (NON_TOXIC)", fc=OLIVE_L, ec=OLIVE, tc=DEEP, size=7, weight="bold")
ax.text(1.5, 20.4, "7  Aksi", size=7.6, weight="bold", color=OLIVE)
arrow(ax, pos[5][0], pos[5][1] + bh / 2 + 2, 23.3, 12.4, color=COPPER)
arrow(ax, pos[5][0], pos[5][1] + bh / 2 - 2, 23.3, 4.4, color=OLIVE)
ax.text(27.2, 20.5, "Qwen2.5-1.5B hanya menjawab setelah lolos moderasi;\nQwen tidak ikut menentukan label.", size=6.2, color=MUTED, linespacing=1.4)
fig.savefig(f"{OUT}/01_alur_sistem_moderasi.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 02 Pembentukan label dari taksonomi
# =====================================================================
fig = base("Dari Taksonomi Bahaya ke Label Biner", "Regex pada risk_area + types_of_harm + specific_harms → TOXIC (1) / NON_TOXIC (0)",
           ["real"], SRC + " · sel 'Konstruksi label binary' · 2.014 baris Train + 12 hard negative = 2.026")
ax1 = fig.add_axes([0.30, 0.12, 0.34, 0.66])
card(ax1)
ra = [("Region-specific Sensitivity", 947), ("Discrimination, Exclusion,\nToxicity, Hateful, Offensive", 364),
      ("Misinformation Harms", 227), ("Malicious Uses", 226), ("Information Hazards", 168),
      ("Human-Chatbot Interaction Harms", 82)][::-1]
ax1.barh([r[0] for r in ra], [r[1] for r in ra], color=OLIVE, height=0.62)
for i, r in enumerate(ra):
    ax1.text(r[1] + 12, i, f"{r[1]:,}".replace(",", "."), va="center", size=7, color=INK, weight="bold")
ax1.set_xlim(0, 1130)
ax1.tick_params(axis="y", labelsize=6)
ax1.grid(axis="y", visible=False)
panel_title(ax1, "risk_area di IndoSafety-Train (n = 2.014)")
fig.text(0.035, 0.68, "16 pola regex:\nhate, insult,\nthreat, sexual,\ndiscriminat,\nharass, ...", size=6.6, color=INK,
         bbox=dict(boxstyle="round,pad=0.5,rounding_size=0.2", fc=WHITE, ec=OLIVE, lw=1.1), va="top")
fig.text(0.035, 0.44, "cocok → TOXIC (1)\ntidak cocok →\nNON_TOXIC (0)", size=6.6, color=DEEP, weight="bold", va="top")
ax2 = fig.add_axes([0.68, 0.12, 0.28, 0.66])
ax2.set_facecolor(CREAM)
ax2.pie([1472, 554], colors=[OLIVE, COPPER], startangle=90, counterclock=False, wedgeprops=dict(width=0.38, edgecolor=CREAM, lw=2))
ax2.text(0, 0.1, "2.026", ha="center", va="center", size=13, weight="bold", color=INK)
ax2.text(0, -0.18, "baris", ha="center", va="center", size=7, color=MUTED)
ax2.set_title("Label biner hasil konstruksi", loc="center", fontsize=8.3, weight="bold", color=INK, pad=6)
ax2.text(0, -1.38, "■ NON_TOXIC  1.472 (72,66%)", ha="center", size=7, color=OLIVE, weight="bold")
ax2.text(0, -1.62, "■ TOXIC  554 (27,34%)", ha="center", size=7, color=COPPER, weight="bold")
fig.savefig(f"{OUT}/02_pembentukan_label_taksonomi.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 03 Split stratified
# =====================================================================
fig = base("Stratified Split 80 / 10 / 10 (seed 42)", "Proporsi TOXIC dijaga ±27% di ketiga bagian; test dikunci dengan fingerprint SHA-256",
           ["real", "calc"], SRC + " · jumlah per kelas train = 1.620 − 1.177 = 443 (Bab 5 manual)")
ax = fig.add_axes([0.14, 0.17, 0.80, 0.60])
card(ax)
labels = ["Train", "Validation", "Test (locked)"]
non = [1177, 147, 148]
tox = [443, 56, 55]
tot = [1620, 203, 203]
tpct = ["27,35%", "27,59%", "27,09%"]
y = np.arange(3)[::-1]
ax.barh(y, non, color=OLIVE, height=0.55, label="NON_TOXIC")
ax.barh(y, tox, left=non, color=COPPER, height=0.55, label="TOXIC")
for yi, n, t, T, p in zip(y, non, tox, tot, tpct):
    ax.text(n / 2, yi, f"{n:,}".replace(",", "."), ha="center", va="center", color=WHITE, weight="bold", size=7.5)
    ax.text(n + t / 2, yi, str(t), ha="center", va="center", color=WHITE, weight="bold", size=7.2)
    ax.text(T + 25, yi, f"n = {T:,}".replace(",", ".") + f"\nTOXIC {p}", va="center", size=6.8, color=INK, linespacing=1.4)
ax.set_yticks(y)
ax.set_yticklabels(labels, size=8, weight="bold", color=INK)
ax.set_xlim(0, 2050)
ax.set_xlabel("jumlah contoh", size=7, color=MUTED)
ax.grid(axis="y", visible=False)
ax.legend(loc="lower right", fontsize=7, frameon=False)
fig.text(0.14, 0.83, "Fingerprint test: bf163a911db7… (SHA-256) — jika isi test berubah, assert gagal", size=6.8, color=DEEP, weight="bold", va="center")
fig.savefig(f"{OUT}/03_stratified_split.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 04 Panjang token & max_length
# =====================================================================
fig = base("Panjang Token dan Pilihan max_length = 32", "Statistik panjang token (WordPiece IndoBERT) pada data train",
           ["real"], SRC + " · hanya statistik ringkas yang dicetak notebook; histogram tidak tersedia, jadi tidak digambar")
ax = fig.add_axes([0.06, 0.25, 0.88, 0.50])
card(ax, grid=False)
ax.set_xlim(0, 50)
ax.set_ylim(0, 1)
ax.set_yticks([])
ax.add_patch(Rectangle((0, 0.40), 46, 0.20, fc=OLIVE_L, ec="none"))
ax.add_patch(Rectangle((0, 0.40), 32, 0.20, fc=OLIVE, ec="none", alpha=0.85))
ax.text(16, 0.50, "dipakai penuh", ha="center", va="center", color=WHITE, size=7, weight="bold")
ax.text(39, 0.50, "dipotong\n(truncation)", ha="center", va="center", color=DEEP, size=6.3)
marks = [(17.3, "mean 17,3", 0.33, OLIVE), (16, "median 16", 0.72, MUTED), (25, "p90 25", 0.72, MUTED),
         (28, "p95 28", 0.33, OLIVE), (46, "maks 46", 0.72, COPPER)]
for v, t, yy, c in marks:
    ax.plot([v, v], [0.40, 0.60], color=INK, lw=1)
    ax.text(v, yy + (0.0), t, ha="center", va="center", size=7, color=c, weight="bold",
            bbox=dict(boxstyle="round,pad=0.2", fc=WHITE, ec="none"))
ax.plot([32, 32], [0.30, 0.70], color=COPPER, lw=2.2, ls="--")
ax.text(32, 0.15, "max_length = 32", ha="center", size=8, color=COPPER, weight="bold")
ax.set_xlabel("jumlah token", size=7, color=MUTED)
ax.spines["left"].set_visible(False)
fig.text(0.06, 0.82, "max_length = min(256, pembulatan ke atas kelipatan 8 dari p95) = kelipatan 8 terdekat ≥ 28 = 32", size=8.4, color=INK, weight="bold", va="center")
fig.text(0.06, 0.075, "Hanya sebagian kecil data (di atas p95) yang terpotong; memori dan waktu training lebih hemat.", size=7, color=MUTED, va="center")
fig.savefig(f"{OUT}/04_panjang_token_max_length.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 05 Arsitektur IndoBERT + head
# =====================================================================
fig = base("Arsitektur Classifier: IndoBERT + Linear(768→2)", "Satu prompt melewati model, dari teks sampai probabilitas TOXIC",
           ["diag"], SRC + " · 124,4 juta parameter · head klasifikasi diinisialisasi baru")
ax = canvas(fig)
items = [
    ("Teks", "prompt siswa", WHITE, INK),
    ("WordPiece", "vocab 30.521\npotong/pad ke 32", WHITE, INK),
    ("IndoBERT\nbase-p1", "12 layer encoder\n(pra-latih)", OLIVE, WHITE),
    ("Vektor [CLS]", "768 dimensi", WHITE, INK),
    ("Linear\n768 → 2", "head baru\n(dilatih)", COPPER, WHITE),
    ("Softmax", "P(NON_TOXIC)\nP(TOXIC)", WHITE, INK),
]
n = len(items)
w = 13.4
gap = (100 - 2 - n * w) / (n - 1)
for i, (t, d, fc, tc) in enumerate(items):
    x = 1 + i * (w + gap)
    box(ax, x, 22, w, 16, t, fc=fc, ec=OLIVE if fc != COPPER else COPPER, tc=tc, size=7.4, weight="bold")
    ax.text(x + w / 2, 15.5, d, ha="center", va="center", size=6.3, color=MUTED, linespacing=1.35)
    if i < n - 1:
        arrow(ax, x + w, 30, x + w + gap, 30)
ax.add_patch(Rectangle((1 + 2 * (w + gap) - 1.2, 19), w + 2.4, 21.5, fc="none", ec=OLIVE, lw=1, ls=(0, (4, 3))))
ax.text(1 + 2 * (w + gap) + w / 2, 42.5, "fine-tuning seluruh bobot", ha="center", size=6.3, color=OLIVE, weight="bold")
ax.add_patch(Rectangle((1 + 4 * (w + gap) - 1.2, 19), w + 2.4, 21.5, fc="none", ec=COPPER, lw=1, ls=(0, (4, 3))))
ax.text(1 + 4 * (w + gap) + w / 2, 42.5, "lapisan baru", ha="center", size=6.3, color=COPPER, weight="bold")
ax.text(50, 4, "Transfer learning: IndoBERT sudah 'paham' bahasa Indonesia; data kita hanya 1.620 baris untuk menyesuaikan ke tugas toksisitas.",
        ha="center", size=6.6, color=INK)
fig.savefig(f"{OUT}/05_arsitektur_indobert.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 06 Softmax ilustrasi
# =====================================================================
z = np.array([0.20, 1.00])
ez = np.exp(z)
p = ez / ez.sum()
fig = base("Dari Logit ke Probabilitas (Softmax)", "Contoh sederhana: z₀ = 0,20 (NON_TOXIC) dan z₁ = 1,00 (TOXIC)",
           ["ilus"], SRC + " · Bab 2.1 manual · angka ini ILUSTRASI, bukan logit hasil ekspor model penelitian")
axs = [fig.add_axes([0.06 + i * 0.32, 0.24, 0.25, 0.52]) for i in range(3)]
cols = [OLIVE, COPPER]
for ax in axs:
    card(ax)
axs[0].bar(["NON_TOXIC", "TOXIC"], z, color=cols, width=0.55)
for i, v in enumerate(z):
    axs[0].text(i, v + 0.04, fmt(v, 2), ha="center", size=8, weight="bold", color=INK)
axs[0].set_ylim(0, 1.3)
panel_title(axs[0], "1. Logit z")
axs[1].bar(["NON_TOXIC", "TOXIC"], ez, color=cols, width=0.55)
for i, v in enumerate(ez):
    axs[1].text(i, v + 0.06, fmt(v, 3), ha="center", size=8, weight="bold", color=INK)
axs[1].set_ylim(0, 3.4)
axs[1].text(0.5, 3.12, f"jumlah = {fmt(ez.sum(), 3)}", ha="center", size=7, color=MUTED)
panel_title(axs[1], "2. exp(z)")
axs[2].bar(["NON_TOXIC", "TOXIC"], p, color=cols, width=0.55)
for i, v in enumerate(p):
    axs[2].text(i, v + 0.025, fmt(v, 3), ha="center", size=8, weight="bold", color=INK)
axs[2].axhline(0.90, color=INK, ls="--", lw=1)
axs[2].text(1.45, 0.915, "threshold 0,90", ha="right", size=6.5, color=INK, weight="bold")
axs[2].axhline(0.50, color=MUTED, ls=":", lw=1)
axs[2].text(1.45, 0.515, "0,50", ha="right", size=6.3, color=MUTED)
axs[2].set_ylim(0, 1.05)
panel_title(axs[2], "3. Probabilitas")
for i in range(2):
    fig.add_artist(FancyArrowPatch((0.318 + i * 0.32, 0.50), (0.372 + i * 0.32, 0.50), transform=fig.transFigure,
                                   arrowstyle="-|>", mutation_scale=10, color=OLIVE, lw=1.4))
fig.text(0.5, 0.085, "P(TOXIC) = e^z₁ / (e^z₀ + e^z₁) = 0,690 → di bawah 0,90 sehingga NON_TOXIC → CONTINUE (di threshold 0,50 akan REJECT)",
         ha="center", size=7, color=INK)
fig.savefig(f"{OUT}/06_logit_softmax_ilustrasi.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 07 Class weight
# =====================================================================
cnt = np.array([1177, 443])
wts = np.array([1620 / (2 * 1177), 1620 / (2 * 443)])
fig = base("Class Weight: Menyeimbangkan Kelas TOXIC", "bobot = N / (jumlah_kelas × N_kelas) = 1.620 / (2 × N_kelas)",
           ["real", "calc"], SRC + " · log training: Class weights [0.6882, 1.8284] · kontribusi = jumlah × bobot (dihitung)")
axs = [fig.add_axes([0.06 + i * 0.32, 0.24, 0.25, 0.52]) for i in range(3)]
for ax in axs:
    card(ax)
names = ["NON_TOXIC", "TOXIC"]
axs[0].bar(names, cnt, color=cols, width=0.55)
for i, v in enumerate(cnt):
    axs[0].text(i, v + 25, f"{v:,}".replace(",", "."), ha="center", size=8, weight="bold")
axs[0].set_ylim(0, 1400)
panel_title(axs[0], "Jumlah data train")
axs[1].bar(names, wts, color=cols, width=0.55)
for i, v in enumerate(wts):
    axs[1].text(i, v + 0.04, fmt(v, 3), ha="center", size=8, weight="bold")
axs[1].set_ylim(0, 2.2)
panel_title(axs[1], "Bobot kelas")
contrib = cnt * wts
axs[2].bar(names, contrib, color=cols, width=0.55)
for i, v in enumerate(contrib):
    axs[2].text(i, v + 18, f"{v:.0f}".replace(".", ","), ha="center", size=8, weight="bold")
axs[2].set_ylim(0, 1000)
panel_title(axs[2], "Kontribusi ke loss")
for i, t in enumerate(["× ", "→ "]):
    fig.text(0.315 + i * 0.32, 0.50, "→", size=16, color=OLIVE, ha="left", va="center", weight="bold")
fig.text(0.5, 0.085, "Setelah diberi bobot, kedua kelas menyumbang kontribusi yang sama besar (≈ 810 = 1.620 / 2). Class weight memengaruhi training, bukan threshold.",
         ha="center", size=6.9, color=INK)
fig.savefig(f"{OUT}/07_class_weight.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 08 Kurva training / validasi per epoch
# =====================================================================
ep = [1, 2, 3, 4]
vl = [0.4204, 0.2869, 0.2572, 0.2637]
pr = [0.7018, 0.6753, 0.7500, 0.7500]
rc = [0.7143, 0.9286, 0.9107, 0.9107]
f1 = [0.7080, 0.7820, 0.8226, 0.8226]
mf = [0.7977, 0.8379, 0.8723, 0.8723]
fig = base("Validasi per Epoch dan Pemilihan Epoch Terbaik", "Model dipilih dari epoch dengan Macro-F1 validasi tertinggi (epoch 3); early stopping patience 2",
           ["real"], SRC + " · fine-tuning: lr 2e-5, batch 32, AdamW, weight decay 0,01, warmup 20 step, fp16")
a1 = fig.add_axes([0.07, 0.17, 0.38, 0.60])
a2 = fig.add_axes([0.56, 0.17, 0.38, 0.60])
for a in (a1, a2):
    card(a)
    a.set_xticks(ep)
    a.set_xlabel("epoch", size=7, color=MUTED)
a1.plot(ep, vl, "o-", color=OLIVE, lw=2, ms=6)
for e, v in zip(ep, vl):
    a1.text(e + 0.06, v + 0.014, fmt(v), ha="left", size=7, weight="bold")
a1.set_ylim(0.22, 0.46)
a1.set_xlim(0.7, 4.6)
panel_title(a1, "Validation loss")
a2.plot(ep, pr, "^-", color=MUTED, lw=1.5, ms=5, label="Precision")
a2.plot(ep, rc, "s-", color=COPPER, lw=1.5, ms=5, label="Recall")
a2.plot(ep, mf, "o-", color=OLIVE, lw=2, ms=6, label="Macro-F1")
a2.set_ylim(0.62, 1.0)
a2.legend(fontsize=6.5, frameon=False, loc="lower right", bbox_to_anchor=(1.0, 0.0))
a2.text(3, 0.8723 + 0.02, "0,8723", ha="center", size=7, weight="bold", color=OLIVE)
panel_title(a2, "Metrik validasi (threshold 0,5 default)")
for a in (a1, a2):
    a.axvline(3, color=INK, ls="--", lw=1)
    a.text(3.04, a.get_ylim()[1] - (a.get_ylim()[1] - a.get_ylim()[0]) * 0.03, "epoch terbaik", size=6.2, color=INK, va="top")
fig.savefig(f"{OUT}/08_validasi_per_epoch.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 09 Threshold sweep
# =====================================================================
thr = np.arange(0.10, 0.901, 0.05)
precision = [0.6310, 0.6709, 0.6842, 0.6842, 0.7027, 0.7123, 0.7222, 0.7183, 0.7500, 0.7846, 0.7846, 0.7969, 0.8226, 0.8226, 0.8475, 0.8909, 0.9412]
recall = [0.9464, 0.9464, 0.9286, 0.9286, 0.9286, 0.9286, 0.9286, 0.9107, 0.9107, 0.9107, 0.9107, 0.9107, 0.9107, 0.9107, 0.8929, 0.8750, 0.8571]
macro = [0.8147, 0.8391, 0.8428, 0.8428, 0.8529, 0.8580, 0.8631, 0.8568, 0.8723, 0.8882, 0.8882, 0.8935, 0.9044, 0.9044, 0.9090, 0.9194, 0.9302]
fprv = [0.2109, 0.1769, 0.1633, 0.1633, 0.1497, 0.1429, 0.1361, 0.1361, 0.1156, 0.0952, 0.0952, 0.0884, 0.0748, 0.0748, 0.0612, 0.0408, 0.0204]
FP = [31, 26, 24, 24, 22, 21, 20, 20, 17, 14, 14, 13, 11, 11, 9, 6, 3]
FN = [3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 7, 8]
assert all(round(f * 147) == a for f, a in zip(fprv, FP)), "FP tidak cocok dengan FPR"
assert all(round((1 - r) * 56) == a for r, a in zip(recall, FN)), "FN tidak cocok dengan recall"
fig = base("Memilih Threshold dari Validation (17 kandidat)", "Syarat: recall TOXIC ≥ 0,85 dan FPR ≤ 0,02 → tidak ada yang memenuhi keduanya, dipakai fallback FPR terendah = 0,90",
           ["real"], SRC + " · validation n = 203 (147 NON_TOXIC, 56 TOXIC)")
a1 = fig.add_axes([0.07, 0.17, 0.41, 0.60])
a2 = fig.add_axes([0.58, 0.17, 0.37, 0.60])
for a in (a1, a2):
    card(a)
    a.set_xlabel("threshold", size=7, color=MUTED)
    a.axvline(0.90, color=INK, ls="--", lw=1)
a1.plot(thr, precision, "o-", color=MUTED, ms=3.5, lw=1.5, label="Precision")
a1.plot(thr, recall, "s-", color=COPPER, ms=3.5, lw=1.5, label="Recall")
a1.plot(thr, macro, "o-", color=OLIVE, ms=3.5, lw=2.2, label="Macro-F1")
a1.axhline(0.85, color=COPPER, ls=":", lw=1)
a1.text(0.105, 0.855, "syarat recall 0,85", size=6, color=COPPER, va="bottom")
a1.set_ylim(0.6, 1.0)
a1.legend(fontsize=6.5, frameon=False, loc="lower center", ncol=3, bbox_to_anchor=(0.5, 0.0))
panel_title(a1, "Metrik vs threshold")
a2.plot(thr, FP, "o-", color=COPPER, ms=3.5, lw=2, label="False Positive (aman diblokir)")
a2.plot(thr, FN, "s-", color=OLIVE, ms=3.5, lw=2, label="False Negative (toksik lolos)")
a2.annotate("FP 3, FN 8\n(terpilih 0,90)", xy=(0.90, 3), xytext=(0.50, 17.5), size=6.5, color=INK, weight="bold",
            arrowprops=dict(arrowstyle="-", color=INK, lw=0.8))

a2.legend(fontsize=6.2, frameon=False, loc="upper center", bbox_to_anchor=(0.55, 1.0))
a2.set_ylim(0, 36)
panel_title(a2, "FP vs FN (jumlah kalimat)")
fig.savefig(f"{OUT}/09_threshold_sweep_validation.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 10 Validation CM: 0.50 vs 0.90
# =====================================================================
fig = base("Efek Threshold pada Confusion Matrix Validation", "Menaikkan threshold 0,50 → 0,90: FP turun 17 → 3, FN naik 5 → 8",
           ["real", "calc"], SRC + " · TN dan TP dihitung: TN = 147 − FP, TP = 56 − FN")
a1 = fig.add_axes([0.06, 0.20, 0.30, 0.56])
a2 = fig.add_axes([0.62, 0.20, 0.30, 0.56])
cm_draw(a1, 130, 17, 5, 51, "Threshold 0,50 (default)")
cm_draw(a2, 144, 3, 8, 48, "Threshold 0,90 (terpilih)")
fig.add_artist(FancyArrowPatch((0.39, 0.46), (0.58, 0.46), transform=fig.transFigure, arrowstyle="-|>", mutation_scale=14, color=OLIVE, lw=2))
fig.text(0.485, 0.53, "threshold\nnaik", ha="center", size=7, color=OLIVE, weight="bold", va="bottom")
fig.text(0.485, 0.40, "FP ↓ 14\nFN ↑ 3", ha="center", size=7.2, color=INK, weight="bold", va="top")
fig.text(0.21, 0.06, "Recall 0,9107 · FPR 0,1156", ha="center", size=7, color=MUTED)
fig.text(0.77, 0.06, "Recall 0,8571 · FPR 0,0204", ha="center", size=7, color=MUTED)
fig.savefig(f"{OUT}/10_threshold_050_vs_090_validation.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 11 Locked test: CM + metrik
# =====================================================================
TN, FPp, FNn, TPp = 145, 3, 11, 44
met = [("Accuracy", 0.9310), ("Precision", 0.9362), ("Recall TOXIC", 0.8000), ("Specificity", 0.9797),
       ("F1 TOXIC", 0.8627), ("Macro-F1", 0.9083), ("FPR", 0.0203), ("FNR", 0.2000)]
fig = base("Hasil Locked Internal Test @ threshold 0,90", "TN = 145 · FP = 3 · FN = 11 · TP = 44 · total 203",
           ["real"], SRC + " · uji test hanya dijalankan setelah model dan threshold dikunci")
a1 = fig.add_axes([0.07, 0.15, 0.30, 0.60])
cm_draw(a1, TN, FPp, FNn, TPp, "Confusion matrix (test)")
a2 = fig.add_axes([0.55, 0.15, 0.40, 0.60])
card(a2)
yy = np.arange(len(met))[::-1]
colors = [OLIVE if k not in ("FPR", "FNR") else COPPER for k, _ in met]
a2.barh(yy, [v for _, v in met], color=colors, height=0.6)
for y0, (k, v) in zip(yy, met):
    a2.text(v + 0.015, y0, fmt(v), va="center", size=7, weight="bold", color=INK)
a2.set_yticks(yy)
a2.set_yticklabels([k for k, _ in met], size=7.2)
a2.set_xlim(0, 1.15)
a2.grid(axis="y", visible=False)
panel_title(a2, "Metrik (olive = baik tinggi · tembaga = error rate)")
fig.text(0.55, 0.085, "Recall 0,80 → 11 dari 55 prompt TOXIC lolos (FN) pada test internal.", size=6.8, color=MUTED)
fig.savefig(f"{OUT}/11_hasil_locked_test.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 12 Chunking + agregasi max
# =====================================================================
fig = base("Chunking 300 Karakter dan Agregasi Maksimum", "Teks panjang dipotong tiap 300 karakter (overlap 0); skor pesan = nilai maksimum antar-chunk",
           ["real", "ilus"], SRC + " · pemotongan: uji assert notebook (650 karakter → 300/300/50) · skor per chunk = contoh Bab 7.1")
ax = fig.add_axes([0.05, 0.57, 0.90, 0.22])
ax.set_xlim(0, 650)
ax.set_ylim(0, 1)
ax.axis("off")
parts = [(0, 300), (300, 300), (600, 50)]
for i, (s, ln) in enumerate(parts):
    ax.add_patch(Rectangle((s + 3, 0.2), ln - 6, 0.6, fc=[OLIVE, OLIVE, OLIVE_L][i], ec="none"))
    ax.text(s + ln / 2, 0.5, f"Chunk {i+1}\n{ln} karakter", ha="center", va="center", size=7, weight="bold",
            color=WHITE if i < 2 else DEEP, linespacing=1.3)
ax.text(0, 0.02, "karakter 1", size=6, color=MUTED, va="top")
ax.text(650, 0.02, "650", size=6, color=MUTED, va="top", ha="right")
ax.text(325, 1.0, "teks contoh 650 karakter", ha="center", size=6.8, color=MUTED, va="bottom")
a2 = fig.add_axes([0.05, 0.14, 0.50, 0.33])
card(a2)
pv = [0.12, 0.93, 0.40]
bar = a2.bar(["Chunk 1", "Chunk 2", "Chunk 3"], pv, color=[OLIVE_L, COPPER, OLIVE_L], width=0.5)
for i, v in enumerate(pv):
    a2.text(i, v + 0.03, fmt(v, 2), ha="center", size=8, weight="bold")
a2.axhline(0.90, color=INK, ls="--", lw=1)
a2.text(2.48, 0.935, "threshold 0,90", ha="right", size=6.3, weight="bold")
a2.set_ylim(0, 1.1)
panel_title(a2, "P(TOXIC) per chunk (ILUSTRASI)")
a3 = fig.add_axes([0.62, 0.14, 0.33, 0.33])
a3.axis("off")
a3.set_xlim(0, 1)
a3.set_ylim(0, 1)
box(a3, 0.02, 0.60, 0.96, 0.36, "", fc=WHITE, ec=OLIVE, r=0.04)
a3.text(0.5, 0.86, "max(0,12; 0,93; 0,40)", ha="center", size=7.2, color=INK)
a3.text(0.5, 0.71, "= 0,93", ha="center", size=11, weight="bold", color=COPPER)
a3.text(0.5, 0.42, "0,93 ≥ 0,90 → TOXIC → REJECT", ha="center", size=7, weight="bold", color=INK)
a3.text(0.5, 0.20, "Satu chunk bernilai tinggi dapat\nmenentukan seluruh pesan.", ha="center", size=6.4, color=MUTED, linespacing=1.35)
fig.savefig(f"{OUT}/12_chunking_agregasi_max.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 13 Recall turun antar set evaluasi + audit Eval-1
# =====================================================================
fig = base("Recall TOXIC Menurun pada Data yang Makin Jauh dari Train", "Validation → locked test → Eval-1 (de-overlapped) → Inference-50 buatan sendiri, semua @ threshold 0,90",
           ["real"], SRC + " · Eval-1: hanya subset TOXIC yang dievaluasi (precision/specificity tidak tersedia)")
a1 = fig.add_axes([0.08, 0.17, 0.47, 0.58])
card(a1)
nm = ["Validation\n(n TOXIC = 56)", "Locked test\n(n = 55)", "Eval-1 external\n(n = 125)", "Inference-50\n(n = 20)"]
rv = [0.8571, 0.8000, 0.6560, 0.4000]
a1.bar(nm, rv, color=[OLIVE, OLIVE, OLIVE, COPPER], width=0.55)
for i, v in enumerate(rv):
    a1.text(i, v + 0.02, fmt(v), ha="center", size=8, weight="bold")
a1.set_ylim(0, 1.05)
a1.tick_params(axis="x", labelsize=6.2)
a1.set_ylabel("Recall TOXIC", size=7, color=MUTED)
panel_title(a1, "Recall per set evaluasi")
a2 = fig.add_axes([0.72, 0.17, 0.24, 0.58])
card(a2, grid=False)
fun = [("Eval-1 asli", 2514, OLIVE), ("Overlap persis\ndengan Train", 2014, COPPER_L), ("External\n(setelah dibuang)", 500, OLIVE), ("Subset TOXIC", 125, DEEP)]
ys2 = np.arange(4)[::-1]
vals = [f[1] for f in fun]
a2.barh(ys2, [2514, 2014, 500, 125], color=[f[2] for f in fun], height=0.58)
for y0, (nme, v, c) in zip(ys2, fun):
    a2.text(v + 60, y0, f"{v:,}".replace(",", "."), va="center", size=7.5, weight="bold")
a2.set_yticks(ys2)
a2.set_yticklabels([f[0] for f in fun], size=6.2)
a2.set_xlim(0, 3600)
a2.set_xticks([])
a2.spines["bottom"].set_visible(False)
panel_title(a2, "Audit overlap Eval-1 (80,11%)")
fig.savefig(f"{OUT}/13_recall_antar_set_evaluasi.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 14 Inference-50
# =====================================================================
fig = base("Inference-50: 50 Prompt Buatan Sendiri @ threshold 0,90", "20 SAFE_NORMAL + 20 TOXIC + 10 SAFE_OOD (OOD tetap berlabel NON_TOXIC)",
           ["real"], SRC + " · hasil kecil dan indikatif, bukan bukti generalisasi kuat")
a1 = fig.add_axes([0.07, 0.21, 0.30, 0.55])
cm_draw(a1, 30, 0, 12, 8, "Confusion matrix")
a2 = fig.add_axes([0.52, 0.21, 0.43, 0.54])
card(a2)
gn = ["SAFE_NORMAL\n(n = 20)", "SAFE_OOD\n(n = 10)", "TOXIC\n(n = 20)"]
gm = [0.0192, 0.0839, 0.6914]
a2.bar(gn, gm, color=[OLIVE, OLIVE, COPPER], width=0.5)
for i, v in enumerate(gm):
    a2.text(i, v + 0.025, fmt(v), ha="center", size=8, weight="bold")
a2.axhline(0.90, color=INK, ls="--", lw=1)
a2.text(2.4, 0.915, "threshold 0,90", ha="right", size=6.5, weight="bold")
a2.set_ylim(0, 1.05)
a2.set_ylabel("rata-rata P(TOXIC)", size=7, color=MUTED)
panel_title(a2, "Rata-rata probabilitas per grup")
fig.text(0.07, 0.062, "Accuracy 0,76 · Precision 1,00 · Recall 0,40 · F1 0,5714 · Specificity 1,00", size=7, color=INK, weight="bold")
fig.text(0.52, 0.062, "TOXIC rata-rata 0,691 < 0,90 → 12 dari 20 lolos.", size=6.8, color=MUTED)
fig.savefig(f"{OUT}/14_inference50.png", dpi=250, facecolor=CREAM)
plt.close(fig)

# =====================================================================
# 15 Stylistic-only vs IndoBERT
# =====================================================================
fig = base("Cek Confound: Fitur Gaya Saja vs IndoBERT", "Logistic Regression dari 4 fitur bentuk teks (panjang, jumlah kata, '?', kata tanya) dibanding IndoBERT, pada validation",
           ["real", "calc"], SRC + " · proporsi NON_TOXIC validation = 147 / 203 = 0,7241 (dihitung)")
ax = fig.add_axes([0.08, 0.17, 0.60, 0.58])
card(ax)
ms = ["Accuracy", "F1 TOXIC", "Macro-F1"]
sty = [0.7143, 0.2564, 0.5398]
ind = [0.9458, 0.8972, 0.9302]
x = np.arange(3)
ax.bar(x - 0.19, sty, 0.36, color=COPPER, label="Stylistic-only LR")
ax.bar(x + 0.19, ind, 0.36, color=OLIVE, label="IndoBERT")
for i in range(3):
    ax.text(x[i] - 0.19, sty[i] + 0.02, fmt(sty[i]), ha="center", size=7, weight="bold")
    ax.text(x[i] + 0.19, ind[i] + 0.02, fmt(ind[i]), ha="center", size=7, weight="bold")
ax.axhline(0.7241, color=MUTED, ls="--", lw=1)
ax.set_xticks(x)
ax.set_xticklabels(ms, size=8)
ax.set_ylim(0, 1.25)
ax.legend(fontsize=7, frameon=False, loc="upper center", ncol=2)
panel_title(ax, "Metrik validation")
fig.text(0.72, 0.62, "Selisih F1\n−0,6408", size=14, weight="bold", color=COPPER, va="center", linespacing=1.3)
fig.text(0.72, 0.38, "Garis putus-putus = tebakan\nselalu NON_TOXIC (0,7241).\nFitur gaya saja hampir sama\ndengan tebakan itu, sedangkan\nIndoBERT belajar makna:\nconfound domain rendah.", size=7, color=INK, va="center", linespacing=1.45)
fig.savefig(f"{OUT}/15_cek_confound_stylistic.png", dpi=250, facecolor=CREAM)
plt.close(fig)
print("ok")
