import os
from flask import Flask, render_template, jsonify, request
from supabase import create_client, Client
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

# --- KONFIGURASI SUPABASE ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- KONFIGURASI GOOGLE CALENDAR ---
GOOGLE_CALENDAR_ID = "5f0201b5dbe49d8bddfa615e8bae44e61b53c9c0ade2e2bfb82a7c3bb42cf4f0@group.calendar.google.com"
CREDENTIALS_FILE = "credentials.json"

def get_calendar_service():
    try:
        if os.path.exists(CREDENTIALS_FILE):
            creds = service_account.Credentials.from_service_account_file(
                CREDENTIALS_FILE, scopes=['https://www.googleapis.com/auth/calendar']
            )
            return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"Gagal Inisialisasi Google Calendar: {e}")
    return None

# --- PEMERIKSA STATUS VERCEL / LOKAL ---
@app.before_request
def check_status():
    if os.environ.get("WEB_ACTIVE", "TRUE").upper() != "TRUE":
        return """
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
            <h1 style="color:red;">Akses Ditangguhkan ⚠️</h1>
            <p>Masa aktif aplikasi telah berakhir / menunggu konfirmasi pembayaran.</p>
            <p>Silakan hubungi Admin/Developer untuk mengaktifkan kembali.</p>
        </div>
        """, 403

# --- ROUTE HALAMAN ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/detail_siswa')
def detail_siswa():
    return render_template('detail_siswa.html')

@app.route('/detail_guru')
def detail_guru():
    return render_template('detail_guru.html')

# --- API ENDPOINTS UNTUK AMBIL/HAPUS DATA SUPABASE ---
@app.route('/api/kelas', methods=['GET', 'POST'])
def handle_kelas():
    if not supabase:
        return jsonify([])

    if request.method == 'GET':
        response = supabase.table('kelas').select('*').order('id', desc=False).execute()
        return jsonify(response.data)

    if request.method == 'POST':
        payload = request.json or {}
        response = supabase.table('kelas').insert(payload).execute()
        return jsonify(response.data), 201

@app.route('/api/kelas/<path:nama_kelas>', methods=['DELETE'])
def delete_kelas(nama_kelas):
    if not supabase:
        return jsonify({'error': 'Database tidak terhubung'}), 500

    try:
        response = supabase.table('kelas').delete().eq('nama_kelas', nama_kelas).execute()
        return jsonify({'message': f'Kelas {nama_kelas} berhasil dihapus', 'data': response.data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/absensi', methods=['GET', 'POST'])
def handle_absensi():
    if not supabase:
        return jsonify([])

    if request.method == 'GET':
        response = supabase.table('absensi').select('*').execute()
        return jsonify(response.data)

    if request.method == 'POST':
        payload = request.json or {}
        response = supabase.table('absensi').insert(payload).execute()
        return jsonify(response.data), 201

# --- API ENDPOINT SINKRONISASI GOOGLE CALENDAR ---
@app.route('/api/sync-calendar', methods=['POST'])
def sync_calendar():
    data = request.json or {}
    nama = data.get('nama', 'Siswa')
    kelas = data.get('kelas', '-')
    status = data.get('status_kehadiran', 'tepat')
    tanggal = data.get('tanggal')
    waktu = data.get('waktu')
    role = data.get('role', 'Siswa')

    service = get_calendar_service()
    if not service:
        return jsonify({'error': 'Google Calendar service tidak aktif atau file credentials.json belum ada'}), 500

    status_teks = "Hadir Tepat Waktu" if status in ['tepat', 'pegawai'] else "Terlambat"
    
    event_summary = f"[{kelas}] Absensi: {nama} ({status_teks})"
    event_description = (
        f"📋 REKAP KEHADIRAN SISWA/GURU\n"
        f"----------------------------------------\n"
        f"👤 Nama: {nama}\n"
        f"🏫 Kelas/Peran: {kelas} ({role})\n"
        f"⏰ Waktu Scan: {waktu} WIB\n"
        f"📌 Status: {status_teks}\n"
        f"📅 Tanggal: {tanggal}\n\n"
        f"Data terekam otomatis untuk pendataan rapor sekolah."
    )

    event = {
        'summary': event_summary,
        'description': event_description,
        'start': {
            'date': tanggal,
        },
        'end': {
            'date': tanggal,
        },
    }

    try:
        event_result = service.events().insert(calendarId=GOOGLE_CALENDAR_ID, body=event).execute()
        return jsonify({'message': 'Berhasil sinkron ke Google Calendar', 'link': event_result.get('htmlLink')}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)