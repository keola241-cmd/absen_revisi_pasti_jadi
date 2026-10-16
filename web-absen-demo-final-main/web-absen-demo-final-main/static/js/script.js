const SUPABASE_URL = "https://kqptqnoklfuogpecmeuk.supabase.co";       
const SUPABASE_KEY = "sb_publishable__FMX9980QMs4YayETQ2ruQ_nftCfpJP"; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tabAktifSekarang = "";
let isProcessing = false;
let cooldownList = {}; 
let isPencilMode = false;
let targetPencilDate = "";
let offsetHalamanTanggal = 0; 
let modeTampilanMatrix = false; 
let kelasTargetHapus = "";
let namaTargetHapusVar = "";

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

let markerAcaraMap = JSON.parse(localStorage.getItem('marker_acara_sekolah') || '{}');

function updateJamDigital() {
    const elemJam = document.getElementById('jamDigitalHeader');
    if (!elemJam) return;
    const d = new Date();
    elemJam.innerText = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} WIB`;
}
setInterval(updateJamDigital, 1000);

function toggleFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;
    if (!doc.fullscreenElement) {
        if (docEl.requestFullscreen) docEl.requestFullscreen();
    } else {
        if (doc.exitFullscreen) doc.exitFullscreen();
    }
}

function switchPage(pageId, element) {
    document.querySelectorAll('.page-view').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    if (element) element.classList.add('active');

    if (pageId === 'page-siswa' || pageId === 'page-guru') {
        muatDaftarTab();
    }
    toggleSidebar();
}

function toggleModeTampilan() {
    modeTampilanMatrix = !modeTampilanMatrix;
    const btn = document.getElementById('btnToggleView');
    const viewCalendar = document.getElementById('viewModeCalendar');
    const viewMatrix = document.getElementById('viewModeMatrix');
    const viewDetail = document.getElementById('viewModeDateDetail');

    viewDetail.style.display = 'none';

    if (modeTampilanMatrix) {
        btn.innerText = "🎮 Buka Career Calendar";
        viewCalendar.style.display = 'none';
        viewMatrix.style.display = 'block';
        muatRekapTab(tabAktifSekarang);
    } else {
        btn.innerText = "📋 Buka Tabel Matriks";
        viewMatrix.style.display = 'none';
        viewCalendar.style.display = 'block';
        muatGridKalender();
    }
}

async function muatDaftarTab() {
    try {
        const { data: tabs, error } = await _supabase
            .from('kelas')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        const containerMenu = document.getElementById('kelasMenuBar');
        if (!containerMenu) return;
        
        containerMenu.innerHTML = '';

        if (tabs && tabs.length > 0) {
            let tabDitemukan = false;

            tabs.forEach((item, index) => {
                const namaTab = item.nama_kelas;
                const btnTab = document.createElement('div');
                btnTab.className = 'tab-btn';

                if (!tabAktifSekarang && index === 0) {
                    tabAktifSekarang = namaTab;
                }

                if (namaTab === tabAktifSekarang) {
                    btnTab.classList.add('active');
                    tabDitemukan = true;
                }

                const spanNama = document.createElement('span');
                spanNama.className = 'tab-label';
                spanNama.innerText = `tap ${namaTab}`;
                spanNama.onclick = function() { pilihKelas(namaTab, btnTab); };

                const btnHapus = document.createElement('span');
                btnHapus.className = 'btn-delete-tab';
                btnHapus.innerHTML = '&times;'; 
                btnHapus.title = `Hapus Kelas ${namaTab}`;
                btnHapus.onclick = function(e) { 
                    e.stopPropagation(); 
                    bukaModalHapusKelas(namaTab); 
                };

                btnTab.appendChild(spanNama);
                btnTab.appendChild(btnHapus);
                containerMenu.appendChild(btnTab);
            });

            if (!tabDitemukan && tabs.length > 0) {
                tabAktifSekarang = tabs[0].nama_kelas;
            }

            if (modeTampilanMatrix) {
                muatRekapTab(tabAktifSekarang);
            } else {
                muatGridKalender();
            }
        } else {
            tabAktifSekarang = "";
            document.getElementById('calendarGridTiles').innerHTML = '<div style="color:white; grid-column: span 6; text-align:center;">Belum ada kelas. Klik tombol + di atas untuk menambah kelas.</div>';
        }
    } catch (err) {
        console.error("Gagal muat tab:", err.message);
    }
}

function pilihKelas(namaKelas, element) {
    document.querySelectorAll('#kelasMenuBar .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');
    tabAktifSekarang = namaKelas;
    
    document.getElementById('viewModeDateDetail').style.display = 'none';
    if (modeTampilanMatrix) {
        muatRekapTab(namaKelas);
        document.getElementById('viewModeMatrix').style.display = 'block';
        document.getElementById('viewModeCalendar').style.display = 'none';
    } else {
        muatGridKalender();
        document.getElementById('viewModeCalendar').style.display = 'block';
        document.getElementById('viewModeMatrix').style.display = 'none';
    }
}

// TAMBAH KELAS
function bukaModalTambahKelas() {
    document.getElementById('modalTambahKelas').classList.add('active');
}

function tutupModalTambahKelas() {
    document.getElementById('modalTambahKelas').classList.remove('active');
    document.getElementById('namaKelasBaru').value = '';
}

async function prosesTambahKelas() {
    const namaKelas = document.getElementById('namaKelasBaru').value.trim();
    if (!namaKelas) {
        alert("Nama kelas tidak boleh kosong!");
        return;
    }

    try {
        const { error } = await _supabase.from('kelas').insert([{ nama_kelas: namaKelas }]);
        if (error) throw error;

        tutupModalTambahKelas();
        tabAktifSekarang = namaKelas;
        muatDaftarTab();
    } catch (err) {
        alert("Gagal menambahkan kelas: " + err.message);
    }
}

// HAPUS KELAS
function bukaModalHapusKelas(namaKelas) {
    kelasTargetHapus = namaKelas;
    document.getElementById('namaKelasHapusTeks').innerText = namaKelas;
    document.getElementById('modalHapusKelas').classList.add('active');
}

function tutupModalHapusKelas() {
    document.getElementById('modalHapusKelas').classList.remove('active');
    kelasTargetHapus = "";
}

async function eksekusiHapusKelas() {
    if (!kelasTargetHapus) return;

    try {
        const { error } = await _supabase.from('kelas').delete().eq('nama_kelas', kelasTargetHapus);
        if (error) throw error;

        tutupModalHapusKelas();
        tabAktifSekarang = "";
        muatDaftarTab();
    } catch (err) {
        alert("Gagal menghapus kelas: " + err.message);
        tutupModalHapusKelas();
    }
}

// HAPUS PROFILE SISWA
function konfirmasiHapusNama(nama) {
    namaTargetHapusVar = nama;
    document.getElementById('namaTargetHapus').innerText = nama;
    document.getElementById('modalHapusNama').classList.add('active');
}

function tutupModalHapusNama() {
    document.getElementById('modalHapusNama').classList.remove('active');
    namaTargetHapusVar = "";
}

async function eksekusiHapusNama() {
    if (!namaTargetHapusVar) return;

    try {
        const { error } = await _supabase.from('absensi').delete().eq('nama', namaTargetHapusVar);
        if (error) throw error;

        tutupModalHapusNama();
        if (modeTampilanMatrix) {
            muatRekapTab(tabAktifSekarang);
        } else {
            muatGridKalender();
        }
    } catch (err) {
        alert("Gagal menghapus profil: " + err.message);
        tutupModalHapusNama();
    }
}

// MODAL PEMILIH BULAN & TAHUN
function bukaModalPilihBulan() {
    document.getElementById('inputPilihBulan').value = currentMonth;
    document.getElementById('inputPilihTahun').value = currentYear;
    document.getElementById('modalPilihBulan').classList.add('active');
}

function tutupModalPilihBulan() {
    document.getElementById('modalPilihBulan').classList.remove('active');
}

function prosesPilihBulan() {
    const b = parseInt(document.getElementById('inputPilihBulan').value);
    const t = parseInt(document.getElementById('inputPilihTahun').value);
    if (!isNaN(b) && !isNaN(t)) {
        currentMonth = b;
        currentYear = t;
        offsetHalamanTanggal = 0;
        tutupModalPilihBulan();
        muatGridKalender();
    }
}

// RENDER GRID KALENDER CAREER MODE BERDASARKAN BULAN & TAHUN AKTIF
async function muatGridKalender() {
    const gridContainer = document.getElementById('calendarGridTiles');
    if (!gridContainer) return;

    gridContainer.innerHTML = '<div style="color:white; grid-column: span 6; text-align:center;">Memuat kalender...</div>';

    const namaBulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calendarMonthTitle').innerText = `${namaBulanArr[currentMonth]} ${currentYear} 📅`;

    let dataAbsensi = [];
    if (tabAktifSekarang) {
        const { data } = await _supabase.from('absensi').select('*').eq('kelas', tabAktifSekarang);
        dataAbsensi = data || [];
    }

    gridContainer.innerHTML = '';

    const totalHariBulan = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startIdx = (offsetHalamanTanggal * 24) + 1;
    const endIdx = Math.min(startIdx + 23, totalHariBulan);

    for (let tgl = startIdx; tgl <= endIdx; tgl++) {
        const tglFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
        const dObj = new Date(currentYear, currentMonth, tgl);
        const dayOfWeek = dObj.getDay(); 

        const card = document.createElement('div');
        card.className = 'tile-card';

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        if (isWeekend) card.classList.add('weekend');

        const keyAcara = `${tabAktifSekarang}_${tglFormatted}`;
        const markerInfo = markerAcaraMap[keyAcara];
        if (markerInfo) {
            card.classList.add('marked-holiday');
        }

        const absensiHariIni = dataAbsensi.filter(row => row.tanggal === tglFormatted);
        const totalHadir = absensiHariIni.length;
        const namaHari = ["Mgu", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][dayOfWeek];

        card.innerHTML = `
            <div class="tile-header">
                <span class="tile-date">${tgl} ${namaHari}</span>
                <span class="tile-badge-info">${isWeekend ? 'Weekend' : 'Hari Kerja'}</span>
            </div>
            <div class="tile-body-stats">
                ${markerInfo ? `<strong>📌 \${markerInfo}</strong>` : (totalHadir > 0 ? `✅ \${totalHadir} Absen` : '-')}
            </div>
        `;

        card.onclick = () => handleKlikTanggal(tglFormatted, absensiHariIni, markerInfo);
        gridContainer.appendChild(card);
    }
}

function slideCalendar(direction) {
    offsetHalamanTanggal += direction;
    if (offsetHalamanTanggal < 0) offsetHalamanTanggal = 0;
    muatGridKalender();
}

function togglePencilMode() {
    isPencilMode = !isPencilMode;
    const btn = document.getElementById('btnPencilMarker');
    if (isPencilMode) {
        btn.classList.add('active');
        alert("Mode Pensil Aktif! Klik salah satu tanggal untuk menandai acara/libur.");
    } else {
        btn.classList.remove('active');
    }
}

function handleKlikTanggal(tglStr, dataAbsen, markerInfo) {
    if (isPencilMode) {
        targetPencilDate = tglStr;
        document.getElementById('textPencilTarget').innerText = `Tandai acara untuk tanggal ${tglStr} di kelas ${tabAktifSekarang}:`;
        document.getElementById('inputNamaAcara').value = markerInfo || '';
        document.getElementById('modalPencilMarker').classList.add('active');
    } else {
        document.getElementById('viewModeCalendar').style.display = 'none';
        document.getElementById('viewModeMatrix').style.display = 'none';
        document.getElementById('viewModeDateDetail').style.display = 'block';
        document.getElementById('dateDetailHeaderTitle').innerText = `Daftar Hadir Tanggal ${tglStr} (${tabAktifSekarang})`;

        const tbody = document.getElementById('tabelDetailTanggalSiswa');
        tbody.innerHTML = '';

        if (dataAbsen.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data presensi pada tanggal ini.</td></tr>';
        } else {
            dataAbsen.forEach((item, idx) => {
                const tr = document.createElement('tr');
                const stBadge = item.status_kehadiran === 'telat' ? '<span class="badge badge-warning">Terlambat</span>' : '<span class="badge badge-success">Tepat Waktu</span>';
                
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><a href="/detail_siswa?nama=${encodeURIComponent(item.nama)}&kelas=${encodeURIComponent(item.kelas)}&jk=${encodeURIComponent(item.gender || '-')}" style="color: var(--text-title); text-decoration: underline; font-weight: 600;">${item.nama}</a></td>
                    <td>${item.kelas}</td>
                    <td>${item.gender || '-'}</td>
                    <td>${item.waktu || '-'} WIB</td>
                    <td>${stBadge}</td>
                    <td><a href="/detail_siswa?nama=${encodeURIComponent(item.nama)}&kelas=${encodeURIComponent(item.kelas)}&jk=${encodeURIComponent(item.gender || '-')}" class="tab-btn" style="padding: 4px 10px; font-size: 0.8rem;">Lihat Profil</a></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
}

function kembaliKeKalender() {
    document.getElementById('viewModeDateDetail').style.display = 'none';
    if (modeTampilanMatrix) {
        document.getElementById('viewModeMatrix').style.display = 'block';
    } else {
        document.getElementById('viewModeCalendar').style.display = 'block';
    }
}

function tutupModalPencilMarker() { document.getElementById('modalPencilMarker').classList.remove('active'); }

function simpanMarkerAcara() {
    const val = document.getElementById('inputNamaAcara').value.trim();
    const keyAcara = `${tabAktifSekarang}_${targetPencilDate}`;
    if (val) {
        markerAcaraMap[keyAcara] = val;
    } else {
        delete markerAcaraMap[keyAcara];
    }
    localStorage.setItem('marker_acara_sekolah', JSON.stringify(markerAcaraMap));
    tutupModalPencilMarker();
    togglePencilMode();
    muatGridKalender();
}

function hapusMarkerAcara() {
    const keyAcara = `${tabAktifSekarang}_${targetPencilDate}`;
    delete markerAcaraMap[keyAcara];
    localStorage.setItem('marker_acara_sekolah', JSON.stringify(markerAcaraMap));
    tutupModalPencilMarker();
    togglePencilMode();
    muatGridKalender();
}

// RENDER TABEL MATRIKS LENGKAP DENGAN STYLING RAPI
async function muatRekapTab(namaTab) {
    const tbodySiswa = document.getElementById('tabel_rekap_siswa');
    if (!tbodySiswa) return;
    tbodySiswa.innerHTML = '<tr><td colspan="38" style="text-align:center;">Memuat data...</td></tr>';

    try {
        const { data, error } = await _supabase.from('absensi').select('*').eq('kelas', namaTab);
        if (error) throw error;

        tbodySiswa.innerHTML = '';
        if (!data || data.length === 0) {
            tbodySiswa.innerHTML = '<tr><td colspan="38" style="text-align:center;">Belum ada data untuk ditampilkan.</td></tr>';
            return;
        }

        const rekapMap = {};

        data.forEach(row => {
            if (!rekapMap[row.nama]) {
                rekapMap[row.nama] = { nama: row.nama, gender: row.gender || '-', kelas: row.kelas || '-', tepat: 0, telat: 0, harian: {} };
            }
            if (row.tanggal) {
                const parts = row.tanggal.split('-');
                const tgl = parseInt(parts[2], 10);
                if (row.status_kehadiran === 'tepat' || row.status_kehadiran === 'pegawai') {
                    rekapMap[row.nama].harian[tgl] = 'H';
                    rekapMap[row.nama].tepat++;
                } else if (row.status_kehadiran === 'telat') {
                    rekapMap[row.nama].harian[tgl] = 'T';
                    rekapMap[row.nama].telat++;
                }
            }
        });

        Object.values(rekapMap).forEach((item, index) => {
            const tr = document.createElement('tr');
            let kolomTanggalHTML = '';
            for (let i = 1; i <= 31; i++) {
                const st = item.harian[i];
                if (st === 'H') kolomTanggalHTML += `<td style="background-color: rgba(6, 78, 59, 0.7); color: #34d399; font-weight: bold; text-align: center; border: 1px solid var(--border-color);">H</td>`;
                else if (st === 'T') kolomTanggalHTML += `<td style="background-color: rgba(120, 53, 15, 0.7); color: #fbbf24; font-weight: bold; text-align: center; border: 1px solid var(--border-color);">T</td>`;
                else kolomTanggalHTML += `<td style="text-align: center; color: var(--text-sub); opacity: 0.5; border: 1px solid var(--border-color);">-</td>`;
            }

            tr.innerHTML = `
                <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <a href="/detail_siswa?nama=${encodeURIComponent(item.nama)}&kelas=${encodeURIComponent(item.kelas)}&jk=${encodeURIComponent(item.gender)}&tepat=${item.tepat}&telat=${item.telat}" 
                           style="color: var(--text-title); text-decoration: underline; font-weight: 600;">
                            ${item.nama}
                        </a>
                        <button onclick="konfirmasiHapusNama('${item.nama.replace(/'/g, "\\'")}')" 
                                title="Hapus ${item.nama}" 
                                style="background: none; border: none; color: #ef4444; font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 4px; line-height: 1;">
                            &times;
                        </button>
                    </div>
                </td>
                <td style="text-align: center;">${item.gender}</td>
                ${kolomTanggalHTML}
                <td style="text-align: center;"><span class="badge badge-success">${item.tepat}</span></td>
                <td style="text-align: center;"><span class="badge badge-warning">${item.telat}</span></td>
                <td style="text-align: center;"><strong>${item.tepat + item.telat}</strong></td>
            `;
            tbodySiswa.appendChild(tr);
        });
    } catch (err) {
        tbodySiswa.innerHTML = `<tr><td colspan="38" style="text-align:center; color:red;">Gagal: ${err.message}</td></tr>`;
    }
}

function filterTabelSiswa() {
    const input = document.getElementById('searchSiswa').value.toLowerCase();
    document.querySelectorAll('#tabel_rekap_siswa tr').forEach(row => {
        const nama = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';
        row.style.display = nama.includes(input) ? '' : 'none';
    });
}

function downloadPDF() {
    const element = document.getElementById('cetakAreaSiswa');
    const opt = {
        margin: 0.5,
        filename: `Rekap_Presensi_${tabAktifSekarang}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;
    playBeep();

    try { scanner.pause(true); } catch (e) {}

    const useVoice = document.getElementById('voiceToggle') ? document.getElementById('voiceToggle').checked : true;
    const dataSplit = decodedText.split('|').map(s => s.trim());

    if (dataSplit.length < 4) {
        tampilPesan("⚠️ Format QR Code Salah!", "#ef4444", useVoice);
        return resetScanner();
    }

    const [id_user, nama, kelas, role] = dataSplit;
    const gender = dataSplit[4] || '-';

    const skrg = Math.floor(Date.now() / 1000);
    if (cooldownList[id_user] && (skrg - cooldownList[id_user]) < 60) {
        const sisa = 60 - (skrg - cooldownList[id_user]);
        tampilPesan(`⚠️ ${nama} baru saja scan! Tunggu ${sisa} detik.`, "#f59e0b", useVoice);
        return resetScanner();
    }

    const d = new Date();
    const jam = String(d.getHours()).padStart(2, '0');
    const menit = String(d.getMinutes()).padStart(2, '0');
    const waktuTeks = `${jam}:${menit}`;
    const tglTeks = d.toISOString().split('T')[0];

    let statusKehadiran = waktuTeks > "10:00" ? "telat" : "tepat";

    try {
        const { error } = await _supabase.from('absensi').insert([{
            user_id: id_user, nama, kelas, role, gender, tanggal: tglTeks, waktu: waktuTeks, status_kehadiran: statusKehadiran
        }]);

        if (error) throw error;

        fetch('/api/sync-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: id_user, nama, kelas, role, gender, tanggal: tglTeks, waktu: waktuTeks, status_kehadiran: statusKehadiran })
        }).catch(err => console.error("Gagal sinkron Google Calendar:", err));

        cooldownList[id_user] = skrg;
        const msg = statusKehadiran === "telat" ? `⚠️ ${nama} Terlambat (${waktuTeks})!` : `✅ Berhasil Absen, Selamat Datang ${nama}`;
        tampilPesan(msg, statusKehadiran === "telat" ? "#f59e0b" : "#10b981", useVoice);

    } catch (err) {
        tampilPesan("⚠️ Gagal Simpan Data: " + err.message, "#ef4444", useVoice);
    }

    resetScanner();
}

function tampilPesan(msg, color, useVoice) {
    const textPesan = document.getElementById('pesan_hasil');
    if (textPesan) {
        textPesan.innerText = msg;
        textPesan.style.color = color;
    }
    if (useVoice) bicara(msg);
}

function resetScanner() {
    setTimeout(() => {
        isProcessing = false;
        try { scanner.resume(); } catch (e) {}
    }, 3000);
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay');
    if (sb) sb.classList.toggle('active');
    if (ov) ov.classList.toggle('active');
}

switchTheme = function(checkbox) {
    const theme = checkbox.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function switchVoice(checkbox) { localStorage.setItem('useVoice', checkbox.checked); }
function switchVolume(val) {
    localStorage.setItem('appVolume', val);
    if (document.getElementById('volumeLabel')) document.getElementById('volumeLabel').innerText = Math.round(val * 100) + '%';
}

function playBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vol = parseFloat(localStorage.getItem('appVolume') ?? '1.0');
        if (vol <= 0) return;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, ctx.currentTime);
        gain.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
}

function bicara(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let suara = new SpeechSynthesisUtterance(text);
        suara.lang = 'id-ID';
        suara.volume = parseFloat(localStorage.getItem('appVolume') ?? '1.0');
        window.speechSynthesis.speak(suara);
    }
}

let scanner = null;
document.addEventListener('DOMContentLoaded', () => {
    updateJamDigital();
    muatDaftarTab();

    if (document.getElementById('reader')) {
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        scanner.render(onScanSuccess);
    }
});