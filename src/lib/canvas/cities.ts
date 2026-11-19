/**
 * Data edisi koran per kota.
 *
 * Fakta kota diambil dari sumber publik (detikJabar, Kompas, Indonesia Travel,
 * Disbudpar Surabaya, Jakarta Tourism, Dinas Kebudayaan DIY, SIMCABUD Makassar).
 * Foto arsip dan lambang kota berasal dari Wikimedia Commons; lisensi tiap foto
 * dicantumkan di halaman koran. Lambang kota berstatus domain publik.
 */

export type NewspaperId =
  | 'news-bandung'
  | 'news-jogja'
  | 'news-surabaya'
  | 'news-jakarta'
  | 'news-semarang'
  | 'news-makassar'

export type CityEdition = {
  frameId: NewspaperId
  /** Nama pendek untuk kartu di UI. */
  name: string
  /** Nama besar di halaman koran, huruf kapital. */
  city: string
  tagline: string
  /** Label kecil di bawah nama kota. */
  kicker: string
  issue: string
  coords: string
  /** Tahun hari jadi kota. */
  founded: string
  /** Lambang kota (domain publik, Wikimedia Commons). */
  crest: string
  headline: string
  deck: string
  paragraphs: [string, string]
  tag: string
  heroCaption: string
  facts: [string, string, string]
  archive: {
    /** Foto arsip landmark, sudah diperkecil agar ringan. */
    photo: string
    photoCaption: string
    /** Kredit fotografer dan lisensi. */
    credit: string
    title: string
    note: string
  }
}

export const CITY_EDITIONS: CityEdition[] = [
  {
    frameId: 'news-bandung',
    name: 'Bandung',
    city: 'BANDUNG',
    tagline: 'Edisi koran: Paris van Java',
    kicker: 'PARIS VAN JAVA',
    issue: 'EDISI 04 · NO. 07',
    coords: '6.9175° S · 107.6191° E',
    founded: '1810',
    crest: '/news/crest-bandung.png',
    headline: 'Bandung: Kota Kreatif di Antara Gunung dan Sejarah',
    deck: 'Dari Braga yang ramai hingga Gedung Sate yang berdiri sejak 1924, Bandung menyimpan cerita tentang kota yang sengaja dirancang untuk nyaman ditinggali.',
    paragraphs: [
      'Julukan Paris van Java bukan pujian yang datang tiba-tiba. Menurut riwayat kota, istilah itu dipakai pedagang mebel di Bragaweg sebagai gimmick pameran Jaarbeurs pada 1920, lalu diulang arsitek Hendrik Berlage pada 1928 dengan nada menyindir karena Bandung terlalu meniru Eropa. Sindiran itu justru melekat, dan kota berhawa sejuk di ketinggian 768 meter ini tumbuh sebagai pusat mode, musik, dan arsitektur.',
      'Gedung Sate menyimpan petunjuk lain. Enam bulatan di puncak menaranya bukan tusuk sate, melainkan enam juta gulden biaya pembangunan 1920–1924. Sementara di Jalan Asia Afrika, Gedung Merdeka menjadi saksi Konferensi Asia-Afrika 1955, momen ketika Bandung bicara kepada dunia.',
    ],
    tag: 'ARSITEKTUR KOLONIAL',
    heroCaption: 'Braga, tempat kota ini belajar bergaya.',
    facts: [
      'Enam bulatan di puncak Gedung Sate = enam juta gulden biaya 1920–1924.',
      'Braga jadi pusat mode Eropa, asal julukan Paris van Java.',
      'Kota ini berdiri di ketinggian 768 meter, sejuk sepanjang tahun.',
    ],
    archive: {
      photo: '/news/gedung-sate.jpg',
      photoCaption: 'Gedung Sate, Bandung',
      credit: 'Gunawan Kartapranata · CC BY-SA 3.0',
      title: 'GEDUNG SATE, 1924',
      note: 'Menara enam tusuk di Jalan Diponegoro, saksi pemindahan pusat pemerintahan Hindia Belanda ke Bandung.',
    },
  },
  {
    frameId: 'news-jogja',
    name: 'Yogyakarta',
    city: 'YOGYAKARTA',
    tagline: 'Edisi koran: Sumbu filosofi',
    kicker: 'KOTA PELAJAR',
    issue: 'EDISI 04 · NO. 08',
    coords: '7.7956° S · 110.3695° E',
    founded: '1755',
    crest: '/news/crest-jogja.png',
    headline: 'Yogyakarta: Garis Lurus dari Tugu ke Keraton',
    deck: 'Sumbu filosofis kota ini bukan metafora: Tugu, Malioboro, dan Keraton berdiri pada satu garis yang menghubungkan manusia, penguasa, dan sang pencipta.',
    paragraphs: [
      'Garis imajiner itu membentang dari Tugu Pal Putih di utara, melewati Malioboro, hingga Keraton Ngayogyakarta Hadiningrat di selatan. Pada 2023, UNESCO menetapkan sumbu ini sebagai Sumbu Filosofi Yogyakarta: pengakuan atas tata kota abad ke-18 yang dirancang dengan makna spiritual, bukan sekadar geometri.',
      'Tugu yang berdiri sekarang setinggi 15 meter adalah versi ketiga. Bentuk awalnya tiang bulat setinggi 25 meter yang dibangun Hamengkubuwono I, runtuh pada gempa 1867, lalu dibangun ulang dengan puncak kerucut. Di bawahnya, Malioboro tetap menjadi ruang paling demokratis di kota: pedagang, pelajar, dan pelancong berbagi trotoar yang sama.',
    ],
    tag: 'SUMBU FILOSOFI',
    heroCaption: 'Malioboro menjelang senja.',
    facts: [
      'Tugu Pal Putih setinggi 15 meter adalah versi ketiga, dibangun ulang 1889.',
      'Sumbu Filosofi Yogyakarta ditetapkan UNESCO pada 2023.',
      'Malioboro membentang dari Tugu hingga perempatan Kantor Pos.',
    ],
    archive: {
      photo: '/news/tugu-jogja.jpg',
      photoCaption: 'Tugu Pal Putih, Yogyakarta',
      credit: 'CEphoto, Uwe Aranas · CC BY-SA 3.0',
      title: 'TUGU PAL PUTIH, 1889',
      note: 'Tiang 15 meter di ujung utara Malioboro, titik awal garis imajiner menuju Keraton.',
    },
  },
  {
    frameId: 'news-surabaya',
    name: 'Surabaya',
    city: 'SURABAYA',
    tagline: 'Edisi koran: Kota pahlawan',
    kicker: 'KOTA PAHLAWAN',
    issue: 'EDISI 04 · NO. 09',
    coords: '7.2575° S · 112.7521° E',
    founded: '1293',
    crest: '/news/crest-surabaya.jpg',
    headline: 'Surabaya: Kota yang Lahir dari Perlawanan',
    deck: 'Sepuluh November 1945 mengubah Surabaya menjadi simbol. Tugu Pahlawan menyimpan tanggal itu di setiap lengkungannya.',
    paragraphs: [
      'Tugu Pahlawan tidak dirancang asal berdiri. Sepuluh lengkungan dan sebelas ruas pada tiangnya mengabadikan 10 November, tanggal pertempuran yang menewaskan ribuan arek Suroboyo. Monumen setinggi 41,15 meter ini diresmikan Soekarno pada 10 November 1952, tujuh tahun setelah perang yang membuat dunia menoleh ke kota ini.',
      'Sejarah Surabaya lebih tua dari perangnya. Sejak abad ke-13 kota ini sudah menjadi pelabuhan penting di muara Kali Mas, dan nama Suroboyo muncul dalam cerita rakyat tentang hiu dan buaya yang berkelahi. Kini Jembatan Suramadu sepanjang 5.438 meter membelah Selat Madura, menjadi wajah baru kota yang sama.',
    ],
    tag: 'ARSITEKTUR PERJUANGAN',
    heroCaption: 'Tugu Pahlawan, 41,15 meter.',
    facts: [
      'Sepuluh lengkungan dan 11 ruas tiang menandai 10 November 1945.',
      'Jembatan Suramadu 5.438 meter, dibuka 10 Juni 2009.',
      'Tugu Pahlawan setinggi 41,15 meter, diresmikan Soekarno 1952.',
    ],
    archive: {
      photo: '/news/tugu-pahlawan.jpg',
      photoCaption: 'Tugu Pahlawan, Surabaya',
      credit: 'sbamueller · CC BY-SA 2.0',
      title: 'TUGU PAHLAWAN, 1952',
      note: 'Berdiri di bekas gedung Kempetai, diresmikan Soekarno pada 10 November 1952.',
    },
  },
  {
    frameId: 'news-jakarta',
    name: 'Jakarta',
    city: 'JAKARTA',
    tagline: 'Edisi koran: Nyala Monas',
    kicker: 'IBU KOTA',
    issue: 'EDISI 04 · NO. 10',
    coords: '6.1754° S · 106.8272° E',
    founded: '1527',
    crest: '/news/crest-jakarta.png',
    headline: 'Jakarta: Nyala Emas di Jantung Indonesia',
    deck: 'Monas bukan sekadar tugu. Bentuknya menyimpan lingga dan yoni, dan api di puncaknya dilapisi emas.',
    paragraphs: [
      'Pembangunan Monas dimulai 17 Agustus 1961, dipimpin arsitek R.M. Soedarsono dengan konsep lingga dan yoni dari Soekarno. Tugu setinggi 132 meter itu berdiri di lahan 80 hektar, dan baru dibuka untuk umum pada 12 Juli 1975 — empat belas tahun setelah tiang pertamanya dipancangkan.',
      'Di dalamnya, Museum Sejarah Nasional menyimpan diorama perjalanan bangsa, sementara Ruang Kemerdekaan menyimpan naskah proklamasi. Lapangan Merdeka di sekelilingnya kini menjadi ruang publik terbesar di ibu kota: tempat warga berlari pagi, berfoto, dan menunggu air mancur menari saat senja.',
    ],
    tag: 'LINGGA & YONI',
    heroCaption: 'Monas dari Lapangan Merdeka.',
    facts: [
      'Monas setinggi 132 meter berdiri di lahan seluas 80 hektar.',
      'Dibuka untuk umum 12 Juli 1975 setelah 14 tahun pembangunan.',
      'Puncak Monas dilapisi emas, simbol semangat perjuangan bangsa.',
    ],
    archive: {
      photo: '/news/monas.jpg',
      photoCaption: 'Monas, Jakarta',
      credit: 'Ramayoni · CC BY-SA 4.0',
      title: 'MONAS, 1975',
      note: 'Lidah api berlapis emas di atas tiang 132 meter, dibuka untuk umum 12 Juli 1975.',
    },
  },
  {
    frameId: 'news-semarang',
    name: 'Semarang',
    city: 'SEMARANG',
    tagline: 'Edisi koran: Dua zaman',
    kicker: 'KOTA PELABUHAN',
    issue: 'EDISI 04 · NO. 11',
    coords: '6.9667° S · 110.4167° E',
    founded: '1547',
    crest: '/news/crest-semarang.png',
    headline: 'Semarang: Dua Zaman di Satu Kota Lama',
    deck: 'Di Kota Lama, kanal, gereja, dan gudang abad ke-18 masih berdiri; di Tugu Muda, lima hari pertempuran 1945 dikenang.',
    paragraphs: [
      'Kota Lama Semarang tumbuh sebagai pusat perdagangan VOC pada abad ke-17, dengan kanal dan gudang yang meniru kota-kota Belanda. Gereja Blenduk, yang dibangun 1753, masih menjadi penanda kawasan ini; kubah tembaganya yang menggelembung memberinya nama. Kini gedung-gedung kolonial di sekitarnya hidup kembali sebagai kafe, galeri, dan kantor.',
      'Tidak jauh dari sana, Lawang Sewu mulai dibangun 1904 sebagai kantor Nederlandsch-Indische Spoorweg Maatschappij. Masyarakat menyebutnya pintu seribu, meski jumlah pintu dan jendelanya 928. Pada Oktober 1945, pertempuran lima hari melawan pasukan Jepang dikenang lewat Tugu Muda, yang hingga kini menjadi titik nol kota.',
    ],
    tag: 'KOTA LAMA & KANAL',
    heroCaption: 'Kanal Kota Lama dan Gereja Blenduk.',
    facts: [
      'Gereja Blenduk berdiri sejak 1753, tertua di Jawa Tengah.',
      'Lawang Sewu punya 928 pintu dan jendela — bukan seribu.',
      'Kota Lama dijuluki Little Netherlands karena tata kanalnya.',
    ],
    archive: {
      photo: '/news/blenduk.jpg',
      photoCaption: 'Gereja Blenduk, Semarang',
      credit: 'Herusutimbul · CC BY-SA 4.0',
      title: 'GEREJA BLENDUK, 1753',
      note: 'Kubah tembaga segi delapan di Kota Lama, gereja Protestan tertua di Jawa Tengah.',
    },
  },
  {
    frameId: 'news-makassar',
    name: 'Makassar',
    city: 'MAKASSAR',
    tagline: 'Edisi koran: Kota angin',
    kicker: 'GERBANG SULAWESI',
    issue: 'EDISI 04 · NO. 12',
    coords: '5.1477° S · 119.4327° E',
    founded: '1607',
    crest: '/news/crest-makassar.jpg',
    headline: 'Makassar: Kota Angin di Ujung Selat',
    deck: 'Dari benteng yang dibangun 1545 hingga matahari terbenam di Losari, Makassar tumbuh sebagai kota pelaut.',
    paragraphs: [
      'Benteng Ujung Pandang dibangun pada 1545 oleh Raja Gowa ke-9 dan berbentuk menyerupai penyu bila dilihat dari udara. Setelah Perjanjian Bungaya 1667, VOC mengambil alih dan menamainya Fort Rotterdam, mengikuti kota kelahiran Cornelis Speelman. Di dalamnya kini hidup museum yang menyimpan jejak Kerajaan Gowa-Tallo.',
      'Makassar dijuluki Kota Angin karena monsun yang bertiup sepanjang tahun — berkah bagi pelaut Bugis-Makassar yang berlayar hingga Australia utara. Di Pantai Losari, tradisi itu masih terasa: pedagang pisang epe dan bentor menunggu senja, ketika langit Selat Makassar berubah jingga.',
    ],
    tag: 'FORT ROTTERDAM',
    heroCaption: 'Senja di Pantai Losari.',
    facts: [
      'Benteng Ujung Pandang dibangun 1545 oleh Raja Gowa ke-9.',
      'Berganti nama Fort Rotterdam setelah Perjanjian Bungaya 1667.',
      'Losari menghadap Selat Makassar, tempat terbaik menunggu senja.',
    ],
    archive: {
      photo: '/news/fort-rotterdam.jpg',
      photoCaption: 'Fort Rotterdam, Makassar',
      credit: 'Sanko. · CC BY-SA 3.0',
      title: 'FORT ROTTERDAM, 1667',
      note: 'Benteng berbentuk penyu yang menjadi markas VOC di Indonesia timur.',
    },
  },
]
