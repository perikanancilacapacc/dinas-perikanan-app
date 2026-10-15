import { useState, useEffect } from 'react';
import { 
  Globe, CarFront, FileText, UserCircle, Trash2, Edit, ChevronLeft, ChevronRight, CheckCircle2, XCircle, KeyRound, LogOut, ExternalLink, AlertCircle, Upload, CalendarOff, Settings, Printer, Download
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import * as XLSX from 'xlsx';

// IMPORT FIREBASE
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

const parseLocal = (ymd) => {
  const [y, m, d] = ymd.split('-');
  return new Date(y, m - 1, d);
};
const formatYMD = (dateObj) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const formatIndoDate = (dateStr) => {
  if(!dateStr) return '';
  try {
    return parseLocal(dateStr).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  } catch (e) {
    return dateStr;
  }
};

export default function App() {
  // PERBAIKAN: Gunakan sessionStorage agar status login bertahan saat halaman di-refresh
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('is_admin_logged_in') === 'true');
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('admin_password') || 'admin123');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [oldPwdInput, setOldPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');

  const [showDateModal, setShowDateModal] = useState(false);
  const [modalView, setModalView] = useState('details'); 

  // --- STATE REKAP CETAK & PDF ---
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [recapStartDate, setRecapStartDate] = useState(formatYMD(new Date()));
  const [recapEndDate, setRecapEndDate] = useState(formatYMD(new Date()));
  const [recapType, setRecapType] = useState('surat'); // 'surat' atau 'booking'
  const [isPrintingRecap, setIsPrintingRecap] = useState(false);
  const [recapData, setRecapData] = useState([]);

  useEffect(() => { localStorage.setItem('admin_password', adminPassword); }, [adminPassword]);

  // PERBAIKAN: Simpan ke sessionStorage saat berhasil login
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput === adminPassword) { 
      setIsAdmin(true); 
      sessionStorage.setItem('is_admin_logged_in', 'true');
      setShowLoginModal(false); 
      setLoginInput(''); 
    } else {
      alert("Password salah!");
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (oldPwdInput !== adminPassword) return alert("Password lama salah!");
    if (!newPwdInput || newPwdInput.length < 4) return alert("Password baru minimal 4 karakter!");
    setAdminPassword(newPwdInput); setShowChangePwdModal(false); setOldPwdInput(''); setNewPwdInput(''); alert("Password berhasil diubah!");
  };

  const [bookings, setBookings] = useState([]);
  const [surats, setSurats] = useState([]);
  const [excelArchives, setExcelArchives] = useState({});
  const [holidays, setHolidays] = useState([]);
  
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDateInput, setHolidayDateInput] = useState('');
  const [holidayDescInput, setHolidayDescInput] = useState('');

  useEffect(() => {
    const unsubSurat = onSnapshot(collection(db, "surats"), (snap) => {
      setSurats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubBooking = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubHoliday = onSnapshot(collection(db, "holidays"), (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubExcel = onSnapshot(collection(db, "excelArchives"), (snap) => {
      const archivesObj = {};
      snap.docs.forEach(d => { archivesObj[d.id] = d.data().items || []; });
      setExcelArchives(archivesObj);
    });

    return () => { unsubSurat(); unsubBooking(); unsubHoliday(); unsubExcel(); };
  }, []);

  const fasilitas = [
    "Innova (R 1478 XB)", "Avanza (R 1138 XB)", "Hilux (R 8134 XB)", 
    "Mobil bak (R 8184 XB)", "Mobil bak (R 8243 XB)", 
    "Ruang Rapat Lantai 1", "Ruang Rapat Lantai 2"
  ];

  const START_DATE_STR = '2026-10-01';
  const START_GLOBAL_NUMBER = 1910;

  const todayObj = new Date();
  const maxDateObj = new Date();
  maxDateObj.setDate(todayObj.getDate() + 2);
  const maxDateLimit = formatYMD(maxDateObj); 

  const isHoliday = (dateStr) => {
    const day = parseLocal(dateStr).getDay();
    if (day === 0 || day === 6) return true;
    return holidays.some(h => h.date === dateStr);
  };

  const getHolidayDesc = (dateStr) => {
    const day = parseLocal(dateStr).getDay();
    if (day === 0) return "Hari Minggu";
    if (day === 6) return "Hari Sabtu";
    const h = holidays.find(h => h.date === dateStr);
    return h ? h.desc : "Hari Libur";
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (holidays.some(h => h.date === holidayDateInput)) return alert("Tanggal ini sudah ada dalam daftar libur!");
    try {
      await setDoc(doc(db, "holidays", holidayDateInput), { date: holidayDateInput, desc: holidayDescInput });
      setHolidayDateInput('');
      setHolidayDescInput('');
    } catch (error) {
      alert("Gagal menyimpan hari libur: " + error.message);
    }
  };

  const handleRemoveHoliday = async (dateStr) => {
    try {
      await deleteDoc(doc(db, "holidays", dateStr));
    } catch (error) {
      alert("Gagal menghapus hari libur: " + error.message);
    }
  };

  const getNumbersForDate = (dateStr, suratsData) => {
    if (dateStr < START_DATE_STR) return []; 
    if (isHoliday(dateStr)) return []; 

    let countWorkingDays = 0;
    let cur = parseLocal(START_DATE_STR);
    let end = parseLocal(dateStr);

    while (cur < end) {
      if (!isHoliday(formatYMD(cur))) countWorkingDays++;
      cur.setDate(cur.getDate() + 1);
    }

    const baseStart = START_GLOBAL_NUMBER + (countWorkingDays * 15);
    
    let displayed = [];
    let currentNum = baseStart;
    let validCount = 0;

    while (validCount < 15) {
      const surat = suratsData.find(s => s.nomorGlobal === currentNum);
      if (!surat || surat.tanggal === dateStr) {
        validCount++;
        displayed.push(currentNum);
      }
      currentNum++;
    }

    const extraSurats = suratsData.filter(s => s.tanggal === dateStr && !displayed.includes(s.nomorGlobal));
    extraSurats.forEach(s => displayed.push(s.nomorGlobal));

    return displayed.sort((a, b) => a - b);
  };

  const todayYMD = formatYMD(new Date());
  const [currentViewDate, setCurrentViewDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(todayYMD); 

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const prevMonth = () => setCurrentViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentViewDate(new Date(year, month + 1, 1));

  const [formBooking, setFormBooking] = useState({ fasilitas: '', keperluan: '', tglMulai: '', jamMulai: '', tglSelesai: '', jamSelesai: '', penanggungjawab: '' });
  const [formSurat, setFormSurat] = useState({ tanggal: '', kodeSurat: '', kodeDinas: '', perihal: '', tujuan: '', penanggungjawab: '', nomorGlobal: '' });

  const [editingBooking, setEditingBooking] = useState(null);
  const [editingSurat, setEditingSurat] = useState(null);

  // --- PERBAIKAN: FUNGSI GENERATE LAPORAN ---
  // Kita rubah agar fungsi ini hanya MENAMPILKAN preview data terlebih dahulu.
  // Eksekusi print dan PDF dilakukan oleh tombol di halaman Preview agar sistem tidak macet.
  const handleGenerateReportPreview = (e) => {
    e.preventDefault();
    if (recapStartDate > recapEndDate) return alert("Tanggal Mulai tidak boleh lebih dari Tanggal Akhir!");
    
    let filtered = [];
    if (recapType === 'surat') {
      const activeSurats = surats.filter(s => s.tanggal >= recapStartDate && s.tanggal <= recapEndDate);
      let archivedSurats = [];
      Object.keys(excelArchives).forEach(dateStr => {
        if (dateStr >= recapStartDate && dateStr <= recapEndDate) {
          const filled = (excelArchives[dateStr] || []).filter(item => item.isFilled).map(item => ({...item, tanggal: dateStr}));
          archivedSurats = archivedSurats.concat(filled);
        }
      });
      filtered = [...activeSurats, ...archivedSurats].sort((a, b) => {
        if (a.tanggal === b.tanggal) return a.nomorGlobal - b.nomorGlobal;
        return a.tanggal > b.tanggal ? 1 : -1;
      });
    } else {
      filtered = bookings.filter(b => b.tglMulai >= recapStartDate && b.tglMulai <= recapEndDate).sort((a, b) => {
        if (a.tglMulai === b.tglMulai) return a.jamMulai > b.jamMulai ? 1 : -1;
        return a.tglMulai > b.tglMulai ? 1 : -1;
      });
    }
    
    if (filtered.length === 0) return alert("Tidak ada data untuk periode tanggal yang dipilih.");

    setRecapData(filtered);
    setShowRecapModal(false);
    setIsPrintingRecap(true); // Beralih ke layar preview
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formBooking.fasilitas || !formBooking.tglMulai || !formBooking.jamMulai || !formBooking.tglSelesai || !formBooking.jamSelesai || !formBooking.penanggungjawab) return alert("Lengkapi semua data wajib!");

    const newStart = new Date(`${formBooking.tglMulai}T${formBooking.jamMulai}`);
    const newEnd = new Date(`${formBooking.tglSelesai}T${formBooking.jamSelesai}`);
    if (newStart >= newEnd) return alert("Waktu Selesai harus lebih lambat dari Waktu Mulai!");

    const isConflict = bookings.some(b => {
      if (b.fasilitas !== formBooking.fasilitas) return false;
      const existStart = new Date(`${b.tglMulai}T${b.jamMulai}`);
      const existEnd = new Date(`${b.tglSelesai}T${b.jamSelesai}`);
      return (newStart < existEnd && newEnd > existStart);
    });

    if (isConflict) return alert(`DITOLAK: ${formBooking.fasilitas} sudah dipinjam pada hari dan jam tersebut!`);

    try {
      await addDoc(collection(db, "bookings"), { ...formBooking });
      alert("Peminjaman berhasil disimpan!");
      setFormBooking({ fasilitas: '', keperluan: '', tglMulai: '', jamMulai: '', tglSelesai: '', jamSelesai: '', penanggungjawab: '' }); 
      setModalView('details');
      setShowDateModal(false);
    } catch (error) {
      alert("Gagal menyimpan peminjaman: " + error.message);
    }
  };

  const handleSuratSubmit = async (e) => {
    e.preventDefault();
    if (!formSurat.tanggal || !formSurat.kodeSurat || !formSurat.kodeDinas || !formSurat.perihal || !formSurat.tujuan || !formSurat.penanggungjawab || !formSurat.nomorGlobal) return alert("Lengkapi semua data wajib!");

    try {
      const numGlobal = Number(formSurat.nomorGlobal);
      if (formSurat.tanggal < START_DATE_STR) {
        const existingArchives = excelArchives[formSurat.tanggal] || [];
        const updatedArchives = existingArchives.map(item => item.nomorGlobal === numGlobal ? {
          ...item, kodeSurat: formSurat.kodeSurat, kodeDinas: formSurat.kodeDinas, perihal: formSurat.perihal, tujuan: formSurat.tujuan, penanggungjawab: formSurat.penanggungjawab, nomorLengkap: `${formSurat.kodeSurat}/${numGlobal}/${formSurat.kodeDinas}`, isFilled: true
        } : item);
        
        await setDoc(doc(db, "excelArchives", formSurat.tanggal), { items: updatedArchives });
        alert(`Berhasil mengisi nomor agenda ${numGlobal}!`);
      } else {
        if (surats.some(s => s.nomorGlobal === numGlobal)) return alert("Nomor tersebut sudah terisi oleh orang lain!");
        const nomorSuratLengkap = `${formSurat.kodeSurat}/${numGlobal}/${formSurat.kodeDinas}`;
        await addDoc(collection(db, "surats"), { ...formSurat, nomorGlobal: numGlobal, nomorLengkap: nomorSuratLengkap });
        alert(`Berhasil! Nomor Surat Anda: ${nomorSuratLengkap}`);
      }

      setFormSurat({ tanggal: '', kodeSurat: '', kodeDinas: '', perihal: '', tujuan: '', penanggungjawab: '', nomorGlobal: '' });
      setModalView('details');
      setShowDateModal(false);
    } catch (error) {
      alert("Gagal menyimpan surat: " + error.message);
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    const newStart = new Date(`${editingBooking.tglMulai}T${editingBooking.jamMulai}`);
    const newEnd = new Date(`${editingBooking.tglSelesai}T${editingBooking.jamSelesai}`);
    if (newStart >= newEnd) return alert("Waktu Selesai harus lebih lambat dari Waktu Mulai!");

    const isConflict = bookings.some(b => {
      if (b.id === editingBooking.id) return false; 
      if (b.fasilitas !== editingBooking.fasilitas) return false;
      const existStart = new Date(`${b.tglMulai}T${b.jamMulai}`);
      const existEnd = new Date(`${b.tglSelesai}T${b.jamSelesai}`);
      return (newStart < existEnd && newEnd > existStart);
    });

    if (isConflict) return alert(`DITOLAK: ${editingBooking.fasilitas} sudah dipinjam pada rentang waktu tersebut!`);

    try {
      await updateDoc(doc(db, "bookings", editingBooking.id), { ...editingBooking });
      setEditingBooking(null);
      alert("Data peminjaman berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui peminjaman: " + error.message);
    }
  };

  const handleUpdateSurat = async (e) => {
    e.preventDefault();
    try {
      const nomorLengkap = `${editingSurat.kodeSurat}/${editingSurat.nomorGlobal}/${editingSurat.kodeDinas}`;
      const oldTanggal = editingSurat.originalTanggal;
      const newTanggal = editingSurat.tanggal;

      if (oldTanggal === newTanggal) {
        if (oldTanggal < START_DATE_STR) {
          const existingArchives = excelArchives[oldTanggal] || [];
          const updated = existingArchives.map(item => item.nomorGlobal === editingSurat.nomorGlobal ? { ...editingSurat, nomorLengkap } : item);
          await setDoc(doc(db, "excelArchives", oldTanggal), { items: updated });
        } else {
          await updateDoc(doc(db, "surats", editingSurat.id), { ...editingSurat, nomorLengkap });
        }
      } 
      else {
        if (oldTanggal < START_DATE_STR) {
          const oldArchives = excelArchives[oldTanggal] || [];
          const updatedOld = oldArchives.map(arc => arc.nomorGlobal === editingSurat.nomorGlobal ? {
            ...arc, perihal: '', tujuan: '', penanggungjawab: '', nomorLengkap: '', isFilled: false
          } : arc);
          await setDoc(doc(db, "excelArchives", oldTanggal), { items: updatedOld });
        } else {
          await deleteDoc(doc(db, "surats", editingSurat.id));
        }

        if (newTanggal < START_DATE_STR) {
          const newArchives = excelArchives[newTanggal] || [];
          const existingIdx = newArchives.findIndex(arc => arc.nomorGlobal === editingSurat.nomorGlobal);
          if (existingIdx >= 0) {
            newArchives[existingIdx] = { ...editingSurat, nomorLengkap, isFilled: true };
          } else {
            newArchives.push({ ...editingSurat, nomorLengkap, isFilled: true });
          }
          await setDoc(doc(db, "excelArchives", newTanggal), { items: newArchives });
        } else {
          const { id, originalTanggal, ...dataToSave } = editingSurat;
          await addDoc(collection(db, "surats"), { ...dataToSave, nomorLengkap, tanggal: newTanggal });
        }
      }

      setEditingSurat(null);
      alert(`Data surat berhasil diperbarui!${oldTanggal !== newTanggal ? `\n(Nomor agenda ${editingSurat.nomorGlobal} telah dipindahkan dari ${oldTanggal} ke ${newTanggal})` : ''}`);
    } catch (error) {
      alert("Gagal memperbarui surat: " + error.message);
    }
  };

  const hapusBooking = async (id) => { 
    if (confirm("Hapus data ini?")) {
      try { await deleteDoc(doc(db, "bookings", id)); } 
      catch (error) { alert("Gagal menghapus: " + error.message); }
    }
  };
  
  const hapusSurat = async (item, dateStr) => { 
    if (confirm(`Kosongkan kembali nomor agenda ${item.nomorGlobal}?`)) {
      try {
        if (dateStr < START_DATE_STR) {
          const existingArchives = excelArchives[dateStr] || [];
          const updated = existingArchives.map(arc => arc.nomorGlobal === item.nomorGlobal ? {
            ...arc, perihal: '', tujuan: '', penanggungjawab: '', nomorLengkap: '', isFilled: false
          } : arc);
          await setDoc(doc(db, "excelArchives", dateStr), { items: updated });
        } else {
          await deleteDoc(doc(db, "surats", item.id));
        }
      } catch (error) {
        alert("Gagal menghapus: " + error.message);
      }
    } 
  };

  const getBookingsForFasilitasAndDate = (fasil, dateStr) => bookings.filter(b => b.fasilitas === fasil && dateStr >= b.tglMulai && dateStr <= b.tglSelesai);

  const handlePilihNomorKosong = (tanggal, num) => { 
    if (tanggal >= START_DATE_STR && tanggal > maxDateLimit) return alert("Pengisian nomor surat maksimal hanya diizinkan sampai 2 hari ke depan (H+2)!");
    if (isHoliday(tanggal)) return alert(`Tidak dapat mengisi nomor. Tanggal ini adalah hari libur: ${getHolidayDesc(tanggal)}.`);
    setFormSurat(prev => ({ ...prev, tanggal: tanggal, nomorGlobal: num })); 
    setModalView('surat'); 
  };

  const handlePilihFasilitasKosong = (fasil, tanggal) => { 
    setFormBooking(prev => ({ ...prev, fasilitas: fasil, tglMulai: tanggal, tglSelesai: tanggal })); 
    setModalView('booking'); 
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const archivesMap = {};
        data.forEach((row) => {
          let tglRaw = row['TANGGAL SURAT'];
          if (!tglRaw) return;
          let dateStr = '';
          if (typeof tglRaw === 'number') {
            const d = new Date((tglRaw - (25567 + 2)) * 86400 * 1000);
            dateStr = formatYMD(d);
          } else {
            const parsed = new Date(tglRaw);
            if (!isNaN(parsed)) dateStr = formatYMD(parsed);
            else {
              const parts = String(tglRaw).split(' ')[0].split('-');
              if (parts.length === 3) dateStr = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
            }
          }

          if (!dateStr || dateStr >= START_DATE_STR) return;
          const noAgenda = Number(row['NO AGENDA'] || 0);
          if (!noAgenda) return;
          const noSurat = row['NO. SURAT'] || '';
          const tujuan = row['KEPADA'] || '';
          const isi = row['ISI SURAT / PERIHAL'] || row['KETERANGAN'] || '';
          const pj = row['PENANGGUNGJAWAB / PENGISI FORM'] || '';

          if (!archivesMap[dateStr]) archivesMap[dateStr] = [];
          archivesMap[dateStr].push({
            nomorGlobal: noAgenda,
            nomorLengkap: noSurat,
            tujuan: tujuan,
            perihal: isi,
            penanggungjawab: pj,
            isFilled: Boolean(isi || noSurat || pj)
          });
        });

        alert("Mohon tunggu, sedang menyinkronkan data arsip Excel ke Firebase...");
        await Promise.all(
          Object.entries(archivesMap).map(([dStr, items]) => 
            setDoc(doc(db, "excelArchives", dStr), { items })
          )
        );
        alert("File Excel arsip berhasil diunggah dan disinkronkan ke Database!");
      } catch (err) {
        console.error(err);
        alert("Gagal membaca file atau sinkronisasi Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // =========================================
  // RENDER TAMPILAN PREVIEW, CETAK & PDF
  // =========================================
  if (isPrintingRecap) {
    return (
      <div className="bg-gray-200 min-h-screen w-full flex flex-col items-center pb-10">
        
        {/* NAVIGASI TOP BAR (Disediakan khusus agar tidak error/terjebak) */}
        <div className="w-full bg-cyan-950 p-4 flex flex-col md:flex-row justify-between items-center shadow-md print:hidden sticky top-0 z-50 gap-4">
          <div className="text-white font-bold flex items-center gap-2">
            <FileText size={20} /> Preview Rekap Laporan
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => window.print()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
              <Printer size={16}/> Print Laporan
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('pdf-content-area');
                if (typeof window.html2pdf === 'undefined') {
                  alert("Library PDF sedang dimuat. Mohon klik OK dan tunggu 2 detik, lalu klik Download PDF lagi.");
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                  document.head.appendChild(script);
                } else {
                  const opt = {
                    margin: 10,
                    filename: `Rekap_${recapType === 'surat' ? 'Nomor_Surat' : 'Peminjaman_Aset'}_${recapStartDate}.pdf`,
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                  };
                  window.html2pdf().set(opt).from(element).save();
                }
              }} 
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download size={16}/> Download PDF
            </button>
            <button onClick={() => setIsPrintingRecap(false)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
              <XCircle size={16}/> Kembali
            </button>
          </div>
        </div>

        {/* AREA KERTAS DOKUMEN (A4 Landscape, Font Tahoma) */}
        <div id="pdf-content-area" className="bg-white text-black p-8 shadow-2xl w-full max-w-[297mm] min-h-[210mm] mt-6 relative" style={{ fontFamily: 'Tahoma, sans-serif' }}>
          
          {/* CSS khusus saat di-print fisik */}
          <style>
            {`
              @media print {
                @page { size: A4 landscape; margin: 15mm; }
                body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                #pdf-content-area { max-width: none; box-shadow: none; padding: 0; margin: 0; }
                table { break-inside: auto; }
                tr { break-inside: avoid; page-break-inside: avoid; }
              }
            `}
          </style>

          <div className="text-center font-bold mb-6 border-b-2 border-black pb-4">
            <h2 className="text-xl uppercase tracking-wide">REKAPITULASI {recapType === 'surat' ? 'PENGISIAN NOMOR SURAT' : 'PEMINJAMAN ASET / KENDARAAN'}</h2>
            <h3 className="text-lg mt-1 uppercase tracking-wide">DINAS PERIKANAN KABUPATEN CILACAP</h3>
            <p className="text-sm mt-2 font-medium">Periode: {formatIndoDate(recapStartDate)} s.d. {formatIndoDate(recapEndDate)}</p>
          </div>
          
          <table className="w-full border-collapse border border-black text-xs md:text-sm text-left">
            <thead>
              {recapType === 'surat' ? (
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-center w-10">No</th>
                  <th className="border border-black p-2 w-32">Tanggal</th>
                  <th className="border border-black p-2 w-40">Nomor Surat</th>
                  <th className="border border-black p-2">Perihal</th>
                  <th className="border border-black p-2 w-56">Tujuan</th>
                  <th className="border border-black p-2 w-40">Penanggungjawab</th>
                </tr>
              ) : (
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-center w-10">No</th>
                  <th className="border border-black p-2 w-48">Fasilitas / Kendaraan</th>
                  <th className="border border-black p-2">Keperluan</th>
                  <th className="border border-black p-2 w-64">Waktu Pelaksanaan</th>
                  <th className="border border-black p-2 w-40">Penanggungjawab</th>
                </tr>
              )}
            </thead>
            <tbody>
              {recapData.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  {recapType === 'surat' ? (
                    <>
                      <td className="border border-black p-2">{formatIndoDate(item.tanggal)}</td>
                      <td className="border border-black p-2 font-semibold">{item.nomorLengkap || `Agenda ${item.nomorGlobal}`}</td>
                      <td className="border border-black p-2">{item.perihal}</td>
                      <td className="border border-black p-2">{item.tujuan}</td>
                      <td className="border border-black p-2">{item.penanggungjawab}</td>
                    </>
                  ) : (
                    <>
                      <td className="border border-black p-2 font-semibold">{item.fasilitas}</td>
                      <td className="border border-black p-2">{item.keperluan}</td>
                      <td className="border border-black p-2">
                        Mulai: {formatIndoDate(item.tglMulai)} pkl {item.jamMulai} WIB<br/>
                        Selesai: {formatIndoDate(item.tglSelesai)} pkl {item.jamSelesai} WIB
                      </td>
                      <td className="border border-black p-2">{item.penanggungjawab}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 font-sans flex flex-col relative overflow-hidden">
      
      {/* ========================================= */}
      {/* HEADER                                    */}
      {/* ========================================= */}
      <header className="bg-cyan-950 text-white p-4 shadow-md relative z-10">
        <div className="absolute right-4 top-4 z-20">
          {isAdmin ? (
            <button onClick={() => setShowAdminMenu(true)} className="flex flex-col items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors">
              <Settings size={22} />
              <span className="text-[10px] font-bold mt-1">Admin</span>
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex flex-col items-center justify-center text-cyan-300 hover:text-white transition-colors">
              <UserCircle size={22} />
              <span className="text-[10px] font-bold mt-1">Login</span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <img src="/logo cilacap.png" alt="Logo Cilacap" className="h-14 w-12 object-contain mb-3 drop-shadow-md" />
          <h1 className="text-sm md:text-base font-bold leading-tight tracking-widest uppercase">SISTEM ADMINISTRASI</h1>
          <h2 className="text-sm md:text-base font-bold leading-tight tracking-widest uppercase mt-0.5">TERINTEGRASI</h2>
          <h2 className="text-sm md:text-base font-bold leading-tight tracking-widest uppercase mt-0.5 text-cyan-300">DINAS PERIKANAN CILACAP</h2>
        </div>
      </header>

      {/* ========================================= */}
      {/* MAIN CONTENT                              */}
      {/* ========================================= */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center w-full">
        <div className="w-full max-w-lg flex flex-col items-center justify-center mt-2">
          
          <div className="text-center mb-5">
            <h3 className="text-xl md:text-2xl font-bold text-cyan-900">Kalender Interaktif</h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1 px-4">Ketuk pada tanggal manapun untuk melihat, meminjam aset, atau mengisi nomor surat.</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-cyan-200 w-full">
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-1.5 md:p-2 bg-sky-50 hover:bg-cyan-100 rounded-full transition-colors border border-cyan-100"><ChevronLeft size={18} className="text-cyan-800"/></button>
              <span className="font-bold text-sm md:text-base text-cyan-900 px-4 py-1.5 bg-cyan-50 rounded-lg border border-cyan-100 text-center uppercase tracking-wide">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 md:p-2 bg-sky-50 hover:bg-cyan-100 rounded-full transition-colors border border-cyan-100"><ChevronRight size={18} className="text-cyan-800"/></button>
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                <div key={d} className="text-center font-bold text-[10px] md:text-xs text-cyan-800 bg-cyan-50 py-1.5 md:py-2 rounded-lg">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="h-10 md:h-12 bg-gray-50/50 rounded-lg border border-gray-100 opacity-50"></div>)}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dateNum = i + 1;
                const dateStr = formatYMD(new Date(year, month, dateNum));
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === formatYMD(new Date());
                
                const isBeforeAppStart = dateStr < START_DATE_STR;
                const isCustomHoliday = holidays.some(h => h.date === dateStr);

                return (
                  <div 
                    key={dateNum} 
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setModalView('details');
                      setShowDateModal(true);
                    }}
                    className={`h-10 md:h-12 p-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center relative
                      ${isSelected ? 'border-cyan-500 bg-cyan-100 ring-2 ring-cyan-200 shadow-inner' : 'border-gray-200 hover:shadow-md hover:border-cyan-300'}
                      ${isCustomHoliday ? 'bg-red-50 hover:border-red-300' : isBeforeAppStart ? 'bg-amber-50/50 hover:border-amber-300' : 'bg-white'}
                    `}
                  >
                    {isCustomHoliday && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" title={getHolidayDesc(dateStr)}></div>}
                    
                    <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-cyan-600 text-white shadow-md' : isCustomHoliday ? 'text-red-700' : 'text-gray-700'}`}>
                      {dateNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* ========================================= */}
      {/* FOOTER                                    */}
      {/* ========================================= */}
      <footer className="bg-white border-t border-cyan-100 p-4 shrink-0 flex flex-col items-center w-full z-10">
        <div className="flex flex-wrap justify-center gap-3 mb-3">
          <a href="https://www.facebook.com/perikanancilacap/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] text-white rounded-full shadow-sm text-[10px] md:text-xs font-medium"><FaFacebook size={14} /> Facebook</a>
          <a href="https://twitter.com/PerikananCLP" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1DA1F2] text-white rounded-full shadow-sm text-[10px] md:text-xs font-medium"><FaTwitter size={14} /> Twitter</a>
          <a href="https://www.instagram.com/perikanancilacap/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-full shadow-sm text-[10px] md:text-xs font-medium"><FaInstagram size={14} /> Instagram</a>
          <a href="https://www.youtube.com/@perikanancilacap" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF0000] text-white rounded-full shadow-sm text-[10px] md:text-xs font-medium"><FaYoutube size={14} /> YouTube</a>
          <a href="https://disperka.cilacapkab.go.id/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 text-white rounded-full shadow-sm text-[10px] md:text-xs font-medium"><Globe size={14} /> Website</a>
        </div>
        <p className="text-[10px] md:text-xs text-gray-500 text-center font-semibold">
          © 2026 All Rights Reserved. Created by aris triono using AI technology
        </p>
      </footer>


      {/* ========================================= */}
      {/* MODAL: DETAIL TANGGAL / FORM PENGISIAN    */}
      {/* ========================================= */}
      {showDateModal && (
        <div className="fixed inset-0 bg-cyan-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-full max-h-[95vh] md:max-h-[90vh]">
            
            <div className="bg-cyan-700 p-4 text-white font-bold flex justify-between items-center shadow-md z-10 shrink-0">
              <span className="text-sm md:text-base">
                {modalView === 'details' && `Rincian: ${parseLocal(selectedDate).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}`}
                {modalView === 'booking' && `Form Peminjaman Aset`}
                {modalView === 'surat' && `Form Nomor Surat`}
              </span>
              <button onClick={() => { setShowDateModal(false); setModalView('details'); }} className="hover:bg-cyan-800 p-1.5 rounded-full transition-colors bg-cyan-600">
                <XCircle size={20}/>
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-sky-50">
              
              {modalView === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full">
                  
                  {/* Kolom Status Aset */}
                  <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-cyan-100 flex flex-col">
                    <h3 className="font-bold text-cyan-900 mb-3 border-b border-cyan-100 pb-2 flex items-center gap-2 text-sm md:text-base">
                      <CarFront size={18} className="text-cyan-600"/> Status Aset & Ruangan
                    </h3>
                    <div className="space-y-2.5 overflow-y-auto pr-1">
                      {fasilitas.map((fasil, idx) => {
                        const fasilBookings = getBookingsForFasilitasAndDate(fasil, selectedDate);
                        const isBooked = fasilBookings.length > 0;
                        
                        return (
                          <div key={idx} 
                               className={`p-3 rounded-lg border transition-colors ${isBooked ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 cursor-pointer shadow-sm'}`}
                               onClick={() => { if (!isBooked) handlePilihFasilitasKosong(fasil, selectedDate); }}>
                            <div className="font-bold flex justify-between items-center mb-1 text-xs md:text-sm">
                              <span className="text-cyan-900">{fasil}</span>
                              {isBooked ? 
                                <span className="text-[9px] md:text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full tracking-wide">DIBOOKING</span> : 
                                <span className="text-[9px] md:text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full tracking-wide">TERSEDIA</span>
                              }
                            </div>
                            
                            {isBooked ? (
                              <div className="text-red-800 text-[10px] md:text-xs mt-2 space-y-1">
                                {fasilBookings.map(b => (
                                  <div key={b.id} className="bg-white/80 p-2 rounded border border-red-100 relative group">
                                    <p><span className="font-semibold">Keperluan:</span> {b.keperluan}</p>
                                    <p><span className="font-semibold">Waktu:</span> {b.jamMulai} - {b.jamSelesai}</p>
                                    <p><span className="font-semibold">PJ:</span> {b.penanggungjawab}</p>
                                    {isAdmin && (
                                      <div className="mt-1 flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingBooking(b); }} className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold">Edit</button>
                                        <button onClick={(e) => { e.stopPropagation(); hapusBooking(b.id); }} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold">Hapus</button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-emerald-700 text-[10px] md:text-xs font-medium mt-1">Ketuk untuk meminjam.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kolom Nomor Surat */}
                  <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-cyan-100 flex flex-col mt-4 md:mt-0">
                    <h3 className="font-bold text-cyan-900 mb-3 border-b border-cyan-100 pb-2 flex items-center gap-2 text-sm md:text-base">
                      <FileText size={18} className="text-cyan-600"/> Data Nomor Surat
                    </h3>
                    
                    <div className="overflow-y-auto flex-1 pr-1 space-y-4">
                      {(() => {
                        let availableNumbers = [];
                        let filledNumbers = [];

                        if (selectedDate < START_DATE_STR) {
                            const archives = excelArchives[selectedDate] || [];
                            availableNumbers = archives.filter(a => !a.isFilled).map(a => a.nomorGlobal);
                            filledNumbers = archives.filter(a => a.isFilled).map(a => ({...a, id: a.nomorGlobal})); 
                        } else {
                            const allNums = getNumbersForDate(selectedDate, surats);
                            availableNumbers = allNums.filter(n => !surats.find(s => s.nomorGlobal === n));
                            filledNumbers = surats.filter(s => s.tanggal === selectedDate);
                        }

                        const isWithinRange = selectedDate <= maxDateLimit;

                        return (
                          <>
                            <div>
                              <h4 className="text-[10px] md:text-[11px] font-bold text-cyan-700 uppercase mb-2 tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={12}/> Tersedia (Ketuk untuk isi)
                              </h4>
                              {isHoliday(selectedDate) ? (
                                  <div className="text-[10px] md:text-xs text-red-600 bg-red-50 p-2 md:p-3 rounded-lg border border-red-100 font-medium">Hari Libur. Tidak ada alokasi nomor baru.</div>
                              ) : selectedDate >= START_DATE_STR && !isWithinRange ? (
                                  <div className="text-[10px] md:text-xs text-gray-500 bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 font-medium">Maksimal pengisian sampai H+2.</div>
                              ) : availableNumbers.length === 0 ? (
                                  <div className="text-[10px] md:text-xs text-gray-500 bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 font-medium">Tidak ada nomor tersedia / habis.</div>
                              ) : (
                                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 md:gap-2">
                                      {availableNumbers.map(num => (
                                          <button key={num} onClick={() => handlePilihNomorKosong(selectedDate, num)} className="bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-500 hover:text-white transition-colors rounded-lg py-2 text-xs md:text-sm font-bold shadow-sm">
                                              {num}
                                          </button>
                                      ))}
                                  </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                              <h4 className="text-[10px] md:text-[11px] font-bold text-amber-700 uppercase mb-2 tracking-wider">Riwayat Terisi</h4>
                              {filledNumbers.length === 0 ? (
                                  <div className="text-[10px] md:text-xs text-gray-500 italic">Belum ada surat.</div>
                              ) : (
                                  <div className="space-y-2">
                                      {filledNumbers.map(item => (
                                          <div key={item.nomorGlobal} className="bg-amber-50 border border-amber-200 p-2.5 md:p-3 rounded-lg text-[10px] md:text-xs relative group shadow-sm">
                                              <div className="font-bold text-amber-900 mb-1 border-b border-amber-200/50 pb-1">{item.nomorLengkap || `Agenda ${item.nomorGlobal}`}</div>
                                              <div className="text-gray-700 space-y-0.5">
                                                  <p><span className="font-semibold text-gray-900">Perihal:</span> {item.perihal}</p>
                                                  <p><span className="font-semibold text-gray-900">Tujuan:</span> {item.tujuan}</p>
                                                  <p><span className="font-semibold text-gray-900">PJ:</span> {item.penanggungjawab}</p>
                                              </div>
                                              {isAdmin && (
                                                  <div className="mt-1.5 flex gap-1">
                                                      <button onClick={() => {
                                                        const docItem = selectedDate < START_DATE_STR ? { ...item, tanggal: selectedDate } : item;
                                                        setEditingSurat({ ...docItem, originalTanggal: docItem.tanggal });
                                                      }} className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold">Edit</button>
                                                      <button onClick={() => hapusSurat(item, selectedDate)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold">Kosongkan</button>
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: FORM BOOKING */}
              {modalView === 'booking' && (
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-cyan-100 max-w-xl mx-auto">
                  <form className="space-y-3 md:space-y-4" onSubmit={handleBookingSubmit}>
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Fasilitas Terpilih</label>
                      <input type="text" readOnly value={formBooking.fasilitas} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-gray-100 text-gray-600 font-bold" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Keperluan <span className="text-red-500">*</span></label>
                        <input required type="text" value={formBooking.keperluan} onChange={(e) => setFormBooking({...formBooking, keperluan: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Tulis keperluan..." />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Penanggungjawab <span className="text-red-500">*</span></label>
                        <input required type="text" value={formBooking.penanggungjawab} onChange={(e) => setFormBooking({...formBooking, penanggungjawab: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Nama pegawai..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Waktu Mulai <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                          <input required type="date" value={formBooking.tglMulai} onChange={(e) => setFormBooking({...formBooking, tglMulai: e.target.value})} className="w-3/5 border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none text-xs md:text-sm" />
                          <input required type="time" value={formBooking.jamMulai} onChange={(e) => setFormBooking({...formBooking, jamMulai: e.target.value})} className="w-2/5 border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none text-xs md:text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Waktu Selesai <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                          <input required type="date" value={formBooking.tglSelesai} onChange={(e) => setFormBooking({...formBooking, tglSelesai: e.target.value})} className="w-3/5 border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none text-xs md:text-sm" />
                          <input required type="time" value={formBooking.jamSelesai} onChange={(e) => setFormBooking({...formBooking, jamMulai: e.target.value})} className="w-2/5 border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none text-xs md:text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3 pt-3 md:pt-4 mt-2 border-t border-cyan-100">
                      <button type="button" onClick={() => setModalView('details')} className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 md:py-3 px-2 rounded-lg transition-colors border border-gray-300 text-xs md:text-sm">Batal</button>
                      <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 md:py-3 px-2 rounded-lg transition-colors text-xs md:text-sm">Simpan Booking</button>
                    </div>
                  </form>
                </div>
              )}

              {/* VIEW 3: FORM SURAT */}
              {modalView === 'surat' && (
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-cyan-100 max-w-xl mx-auto">
                  <form className="space-y-3 md:space-y-4" onSubmit={handleSuratSubmit}>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 bg-sky-50/50 rounded-lg border border-cyan-100">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Tanggal</label>
                        <input type="date" readOnly value={formSurat.tanggal} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-gray-100 text-gray-600 font-bold text-xs md:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Nomor Agenda</label>
                        <input type="text" readOnly value={formSurat.nomorGlobal} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-gray-100 text-gray-600 font-bold text-xs md:text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Kode Surat Depan <span className="text-red-500">*</span></label>
                        <input required type="text" value={formSurat.kodeSurat} onChange={(e) => setFormSurat({...formSurat, kodeSurat: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Misal: 005" />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Kode Dinas/Bidang <span className="text-red-500">*</span></label>
                        <input required type="text" value={formSurat.kodeDinas} onChange={(e) => setFormSurat({...formSurat, kodeDinas: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Misal: DISPERKA/2026" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Perihal Surat <span className="text-red-500">*</span></label>
                      <input required type="text" value={formSurat.perihal} onChange={(e) => setFormSurat({...formSurat, perihal: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Contoh: Undangan Rapat..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Tujuan / Instansi <span className="text-red-500">*</span></label>
                        <input required type="text" value={formSurat.tujuan} onChange={(e) => setFormSurat({...formSurat, tujuan: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Instansi tujuan..." />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Penanggungjawab <span className="text-red-500">*</span></label>
                        <input required type="text" value={formSurat.penanggungjawab} onChange={(e) => setFormSurat({...formSurat, penanggungjawab: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2 md:p-2.5 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Nama pegawai..." />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 md:gap-3 pt-3 md:pt-4 mt-2 border-t border-cyan-100">
                      <button type="button" onClick={() => setModalView('details')} className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 md:py-3 px-2 rounded-lg transition-colors border border-gray-300 text-xs md:text-sm">Batal</button>
                      <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 md:py-3 px-2 rounded-lg transition-colors text-xs md:text-sm">Simpan Nomor</button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL ADMIN MENU                          */}
      {/* ========================================= */}
      {showAdminMenu && (
        <div className="fixed inset-0 bg-cyan-950/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="bg-emerald-600 p-4 text-white font-bold flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2"><Settings size={18}/> Menu Administrator</span>
              <button onClick={() => setShowAdminMenu(false)} className="hover:bg-emerald-700 p-1.5 rounded-full"><XCircle size={20}/></button>
            </div>
            <div className="p-4 space-y-3 bg-gray-50">
              <button onClick={() => { setShowAdminMenu(false); setShowRecapModal(true); }} className="w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-colors bg-white border border-teal-100 text-teal-700 shadow-sm hover:shadow-md">
                <span className="flex items-center gap-3"><FileText size={18} /> Cetak & Download Rekap</span> <ChevronRight size={16}/>
              </button>

              <button onClick={() => { setShowAdminMenu(false); setShowHolidayModal(true); }} className="w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-colors bg-white border border-indigo-100 text-indigo-700 shadow-sm hover:shadow-md">
                <span className="flex items-center gap-3"><CalendarOff size={18} /> Atur Hari Libur</span> <ChevronRight size={16}/>
              </button>
              
              <label className="w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-colors bg-white border border-emerald-100 text-emerald-700 shadow-sm hover:shadow-md cursor-pointer">
                <span className="flex items-center gap-3"><Upload size={18} /> Unggah File Excel (.xlsx)</span> <ChevronRight size={16}/>
                <input type="file" accept=".xlsx, .xls" onChange={(e) => { setShowAdminMenu(false); handleFileUpload(e); }} className="hidden" />
              </label>

              <button onClick={() => { setShowAdminMenu(false); setShowChangePwdModal(true); }} className="w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-colors bg-white border border-amber-100 text-amber-700 shadow-sm hover:shadow-md">
                <span className="flex items-center gap-3"><KeyRound size={18} /> Ganti Password</span> <ChevronRight size={16}/>
              </button>
              
              {/* PERBAIKAN LOGOUT: Hapus data dari sessionStorage saat logout */}
              <button onClick={() => { 
                setShowAdminMenu(false); 
                setIsAdmin(false); 
                sessionStorage.removeItem('is_admin_logged_in'); 
              }} className="w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-colors bg-red-600 hover:bg-red-700 text-white shadow-sm mt-4">
                <span className="flex items-center gap-3"><LogOut size={18} /> Logout Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL CETAK REKAP LAPORAN                 */}
      {/* ========================================= */}
      {showRecapModal && (
        <div className="fixed inset-0 bg-cyan-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-teal-600 p-4 text-white font-bold text-sm flex justify-between items-center">
              <span className="flex items-center gap-2"><FileText size={18}/> Pilih Tanggal Laporan</span>
              <button onClick={() => setShowRecapModal(false)} className="hover:bg-teal-700 p-1 rounded-full"><XCircle size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Laporan</label>
                <select value={recapType} onChange={e => setRecapType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm font-medium outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                  <option value="surat">Nomor Surat Terisi</option>
                  <option value="booking">Peminjaman Kendaraan / Aset</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dari Tanggal</label>
                  <input type="date" required value={recapStartDate} onChange={e => setRecapStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-xs md:text-sm outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sampai Tanggal</label>
                  <input type="date" required value={recapEndDate} onChange={e => setRecapEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-xs md:text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={handleGenerateReportPreview} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg text-[13px] md:text-sm flex items-center justify-center gap-2 transition-colors">
                   Tampilkan Preview Laporan
                </button>
                <button type="button" onClick={() => setShowRecapModal(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-sm border border-gray-200 transition-colors">
                   Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Booking Aset */}
      {editingBooking && (
        <div className="fixed inset-0 bg-cyan-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-600 p-4 text-white text-center font-bold flex justify-between items-center">
              <span className="text-sm md:text-base">Edit Data Booking Aset</span>
              <button onClick={() => setEditingBooking(null)} className="hover:bg-blue-700 p-1 rounded"><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleUpdateBooking} className="p-4 md:p-6 space-y-3 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Fasilitas</label>
                <select required value={editingBooking.fasilitas} onChange={(e) => setEditingBooking({...editingBooking, fasilitas: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm">
                  {fasilitas.map((item, idx) => (<option key={idx} value={item}>{item}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Keperluan</label><input required type="text" value={editingBooking.keperluan} onChange={(e) => setEditingBooking({...editingBooking, keperluan: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
                <div><label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Penanggungjawab</label><input required type="text" value={editingBooking.penanggungjawab} onChange={(e) => setEditingBooking({...editingBooking, penanggungjawab: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Waktu Mulai</label>
                  <div className="flex gap-2">
                    <input required type="date" value={editingBooking.tglMulai} onChange={(e) => setEditingBooking({...editingBooking, tglMulai: e.target.value})} className="w-3/5 border border-cyan-200 rounded-lg p-2 bg-sky-50 text-xs" />
                    <input required type="time" value={editingBooking.jamMulai} onChange={(e) => setEditingBooking({...editingBooking, jamMulai: e.target.value})} className="w-2/5 border border-cyan-200 rounded-lg p-2 bg-sky-50 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-cyan-800 mb-1">Waktu Selesai</label>
                  <div className="flex gap-2">
                    <input required type="date" value={editingBooking.tglSelesai} onChange={(e) => setEditingBooking({...editingBooking, tglSelesai: e.target.value})} className="w-3/5 border border-cyan-200 rounded-lg p-2 bg-sky-50 text-xs" />
                    <input required type="time" value={editingBooking.jamSelesai} onChange={(e) => setEditingBooking({...editingBooking, jamSelesai: e.target.value})} className="w-2/5 border border-cyan-200 rounded-lg p-2 bg-sky-50 text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setEditingBooking(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-sm">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Surat */}
      {editingSurat && (
        <div className="fixed inset-0 bg-cyan-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-600 p-4 text-white text-center font-bold flex justify-between items-center">
              <span className="text-sm md:text-base">Edit Surat (Agenda: {editingSurat.nomorGlobal})</span>
              <button onClick={() => setEditingSurat(null)} className="hover:bg-blue-700 p-1 rounded"><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleUpdateSurat} className="p-4 md:p-6 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-3 bg-sky-50 p-3 rounded-lg border border-cyan-200">
                <div>
                  <label className="block text-xs font-semibold text-cyan-900 mb-1">Tanggal (Bisa Diedit)</label>
                  <input type="date" required value={editingSurat.tanggal} onChange={(e) => setEditingSurat({...editingSurat, tanggal: e.target.value})} className="w-full border border-cyan-300 rounded-lg p-2 bg-white text-cyan-900 text-xs focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nomor Agenda</label>
                  <input type="text" readOnly value={editingSurat.nomorGlobal} className="w-full border border-gray-300 rounded-lg p-2 bg-gray-200 text-gray-600 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-cyan-800 mb-1">Kode Surat</label><input required type="text" value={editingSurat.kodeSurat} onChange={(e) => setEditingSurat({...editingSurat, kodeSurat: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-cyan-800 mb-1">Kode Dinas</label><input required type="text" value={editingSurat.kodeDinas} onChange={(e) => setEditingSurat({...editingSurat, kodeDinas: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-cyan-800 mb-1">Perihal Surat</label><input required type="text" value={editingSurat.perihal} onChange={(e) => setEditingSurat({...editingSurat, perihal: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-cyan-800 mb-1">Tujuan</label><input required type="text" value={editingSurat.tujuan} onChange={(e) => setEditingSurat({...editingSurat, tujuan: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-cyan-800 mb-1">PJ</label><input required type="text" value={editingSurat.penanggungjawab} onChange={(e) => setEditingSurat({...editingSurat, penanggungjawab: e.target.value})} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" /></div>
              </div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setEditingSurat(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-sm">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm">Update Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hari Libur */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-cyan-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white text-center font-bold flex justify-between items-center text-sm">
              <span>Atur Hari Libur Nasional</span>
              <button onClick={() => setShowHolidayModal(false)} className="hover:bg-indigo-700 p-1 rounded"><XCircle size={18}/></button>
            </div>
            <div className="p-4 md:p-5">
              <form onSubmit={handleAddHoliday} className="flex flex-col gap-2 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <input required type="date" value={holidayDateInput} onChange={e => setHolidayDateInput(e.target.value)} className="border border-indigo-200 p-2 rounded text-sm w-full" />
                <div className="flex gap-2">
                  <input required type="text" placeholder="Keterangan..." value={holidayDescInput} onChange={e => setHolidayDescInput(e.target.value)} className="border border-indigo-200 p-2 rounded text-sm flex-1" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold transition-colors">+</button>
                </div>
              </form>
              <h4 className="font-bold text-indigo-900 mb-2 text-sm">Daftar Libur Nasional</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50">
                {holidays.length === 0 ? <div className="text-center text-xs text-gray-400 py-4 font-medium">Belum ada data.</div> : null}
                {holidays.sort((a,b) => a.date > b.date ? 1 : -1).map(h => (
                  <div key={h.date} className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded shadow-sm">
                    <div>
                      <span className="font-bold text-xs text-indigo-700">{parseLocal(h.date).toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short', year:'numeric'})}</span>
                      <p className="text-[10px] text-gray-600">{h.desc}</p>
                    </div>
                    <button onClick={() => handleRemoveHoliday(h.date)} className="text-red-500 hover:bg-red-100 p-1.5 rounded"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Login Admin */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-cyan-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-cyan-900 p-4 text-white text-center font-bold">Login Administrator</div>
            <form onSubmit={handleLogin} className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cyan-800 mb-1">Password</label>
                <input type="password" autoFocus required value={loginInput} onChange={e => setLoginInput(e.target.value)} className="w-full border border-cyan-200 rounded-lg p-2.5 bg-sky-50 text-sm" placeholder="Masukkan password..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-sm">Batal</button>
                <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-lg text-sm">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ganti Password */}
      {showChangePwdModal && (
        <div className="fixed inset-0 bg-cyan-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-600 p-4 text-white text-center font-bold text-sm">Ganti Password Admin</div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password Lama</label>
                <input type="password" required autoFocus value={oldPwdInput} onChange={e => setOldPwdInput(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
                <input type="password" required minLength={4} value={newPwdInput} onChange={e => setNewPwdInput(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowChangePwdModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-sm">Batal</button>
                <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg text-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}