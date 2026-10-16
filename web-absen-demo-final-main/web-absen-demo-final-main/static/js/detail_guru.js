document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const nama = urlParams.get('nama') || 'Guru Tanpa Nama';
    const kelas = urlParams.get('kelas') || 'Guru';
    const jk = urlParams.get('jk') || '-';
    const tepat = parseInt(urlParams.get('tepat')) || 0;
    const telat = parseInt(urlParams.get('telat')) || 0;

    if (document.getElementById('detailNamaGuru')) document.getElementById('detailNamaGuru').innerText = nama;
    if (document.getElementById('detailRoleGuru')) document.getElementById('detailRoleGuru').innerText = `Status: ${kelas}`;
    if (document.getElementById('detailGenderGuru')) document.getElementById('detailGenderGuru').innerText = `👤 Jenis Kelamin: ${jk}`;

    const TOTAL_HARI_KERJA = 22; 
    const totalHadir = tepat + telat;
    const persentase = Math.round((totalHadir / TOTAL_HARI_KERJA) * 100);

    if (document.getElementById('valTepatGuru')) document.getElementById('valTepatGuru').innerText = `${tepat} Hari`;
    if (document.getElementById('valTelatGuru')) document.getElementById('valTelatGuru').innerText = `${telat} Hari`;

    if (document.getElementById('textPersentaseGuru')) document.getElementById('textPersentaseGuru').innerText = `${persentase}%`;
    if (document.getElementById('barFillGuru')) document.getElementById('barFillGuru').style.width = `${Math.min(100, persentase)}%`;

    const canvasChart = document.getElementById('grafikKehadiranGuru');
    if (canvasChart && typeof Chart !== 'undefined') {
        new Chart(canvasChart, {
            type: 'doughnut',
            data: {
                labels: ['Tepat Waktu / Hadir', 'Terlambat'],
                datasets: [{
                    data: [tepat, telat],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', font: { family: 'Poppins' } }
                    }
                }
            }
        });
    }

    const savedPhoto = localStorage.getItem(`foto_guru_${nama}`);
    if (savedPhoto && document.getElementById('imgFotoGuru')) {
        document.getElementById('imgFotoGuru').src = savedPhoto;
    }
});

function pratinjauFotoGuru(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const resultData = e.target.result;
            const imgElem = document.getElementById('imgFotoGuru');
            if (imgElem) imgElem.src = resultData;

            const urlParams = new URLSearchParams(window.location.search);
            const nama = urlParams.get('nama');
            if (nama) {
                localStorage.setItem(`foto_guru_${nama}`, resultData);
            }
        };
        reader.readAsDataURL(file);
    }
}
