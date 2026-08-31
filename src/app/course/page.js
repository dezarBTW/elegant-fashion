"use client";
import styles from "./fashionschool.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";
import { getCachedValue, invalidateCachedValue, setCachedValue } from "@/lib/browserCache";
import BackToTopButton from "@/components/BackToTopButton";

const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const requiredFields = [
  "surname", "first_name", "gender", "date_of_birth", "age", "nationality",
  "marital_status", "state_of_origin", "address", "telephone", "email",
  "chosen_programme", "passport_photo", "agreed",
];

// African countries list
const africanCountries = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Democratic Republic of the Congo", "Republic of the Congo", "Djibouti",
  "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon",
  "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
  "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo",
  "Tunisia", "Uganda", "Zambia", "Zimbabwe"
];

// States / provinces / regions for every African country, keyed by the
// country names used in the `africanCountries` list above.
const africanStates = {
  "Algeria": ["Adrar", "Aïn Defla", "Aïn Témouchent", "Algiers", "Annaba", "Batna", "Béchar", "Béjaïa", "Biskra", "Blida", "Bordj Bou Arréridj", "Bouira", "Boumerdès", "Chlef", "Constantine", "Djelfa", "El Bayadh", "El Oued", "El Tarf", "Ghardaïa", "Guelma", "Illizi", "Jijel", "Khenchela", "Laghouat", "M'Sila", "Mascara", "Médéa", "Mila", "Mostaganem", "Naâma", "Oran", "Ouargla", "Oum El Bouaghi", "Relizane", "Saïda", "Sétif", "Sidi Bel Abbès", "Skikda", "Souk Ahras", "Tamanrasset", "Tébessa", "Tiaret", "Tindouf", "Tipaza", "Tissemsilt", "Tizi Ouzou", "Tlemcen"],
  "Angola": ["Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"],
  "Benin": ["Alibori", "Atacora", "Atlantique", "Borgou", "Collines", "Couffo", "Donga", "Littoral", "Mono", "Ouémé", "Plateau", "Zou"],
  "Botswana": ["Central", "Ghanzi", "Kgalagadi", "Kgatleng", "Kweneng", "North-East", "North-West", "South-East", "Southern"],
  "Burkina Faso": ["Boucle du Mouhoun", "Cascades", "Centre", "Centre-Est", "Centre-Nord", "Centre-Ouest", "Centre-Sud", "Est", "Hauts-Bassins", "Nord", "Plateau-Central", "Sahel", "Sud-Ouest"],
  "Burundi": ["Bubanza", "Bujumbura Mairie", "Bujumbura Rural", "Cankuzo", "Cibitoke", "Gitega", "Karuzi", "Kayanza", "Kirundo", "Makamba", "Muramvya", "Muyinga", "Mwaro", "Ngozi", "Rumonge", "Rutana", "Ruyigi"],
  "Cabo Verde": ["Boa Vista", "Brava", "Maio", "Mosteiros", "Paul", "Porto Novo", "Praia", "Ribeira Brava", "Ribeira Grande", "Ribeira Grande de Santiago", "Sal", "Santa Catarina", "Santa Catarina do Fogo", "Santa Cruz", "São Domingos", "São Filipe", "São Lourenço dos Órgãos", "São Miguel", "São Salvador do Mundo", "São Vicente", "Tarrafal", "Tarrafal de São Nicolau"],
  "Cameroon": ["Adamaoua", "Centre", "East", "Far North", "Littoral", "North", "Northwest", "South", "Southwest", "West"],
  "Central African Republic": ["Bamingui-Bangoran", "Bangui", "Basse-Kotto", "Haute-Kotto", "Haut-Mbomou", "Kémo", "Lobaye", "Mambéré-Kadéï", "Mbomou", "Nana-Grébizi", "Nana-Mambéré", "Ombella-M'Poko", "Ouaka", "Ouham", "Ouham-Pendé", "Sangha-Mbaéré", "Vakaga"],
  "Chad": ["Batha", "Borkou", "Chari-Baguirmi", "Ennedi-Est", "Ennedi-Ouest", "Guéra", "Hadjer-Lamis", "Kanem", "Lac", "Logone Occidental", "Logone Oriental", "Mandoul", "Mayo-Kebbi Est", "Mayo-Kebbi Ouest", "Moyen-Chari", "N'Djamena", "Ouaddaï", "Salamat", "Sila", "Tandjilé", "Tibesti", "Wadi Fira"],
  "Comoros": ["Anjouan", "Grande Comore", "Mohéli"],
  "Democratic Republic of the Congo": ["Bas-Uélé", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uélé", "Ituri", "Kasaï", "Kasaï Central", "Kasaï Oriental", "Kinshasa", "Kongo Central", "Kwango", "Kwilu", "Lomami", "Lualaba", "Maï-Ndombe", "Maniema", "Mongala", "Nord-Kivu", "Nord-Ubangi", "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika", "Tshopo", "Tshuapa"],
  "Republic of the Congo": ["Bouenza", "Brazzaville", "Cuvette", "Cuvette-Ouest", "Kouilou", "Lékoumou", "Likouala", "Niari", "Plateaux", "Pointe-Noire", "Pool", "Sangha"],
  "Djibouti": ["Ali Sabieh", "Arta", "Dikhil", "Djibouti", "Obock", "Tadjourah"],
  "Egypt": ["Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", "Matruh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"],
  "Equatorial Guinea": ["Annobón", "Bioko Norte", "Bioko Sur", "Centro Sur", "Djibloho", "Kié-Ntem", "Litoral", "Wele-Nzas"],
  "Eritrea": ["Anseba", "Debub", "Gash-Barka", "Maekel", "Northern Red Sea", "Southern Red Sea"],
  "Eswatini": ["Hhohho", "Lubombo", "Manzini", "Shiselweni"],
  "Ethiopia": ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray"],
  "Gabon": ["Estuaire", "Haut-Ogooué", "Moyen-Ogooué", "Ngounié", "Nyanga", "Ogooué-Ivindo", "Ogooué-Lolo", "Ogooué-Maritime", "Woleu-Ntem"],
  "Gambia": ["Banjul", "Central River", "Lower River", "North Bank", "Upper River", "West Coast"],
  "Ghana": ["Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North"],
  "Guinea": ["Boké", "Conakry", "Faranah", "Kankan", "Kindia", "Labé", "Mamou", "Nzérékoré"],
  "Guinea-Bissau": ["Bafatá", "Biombo", "Bissau", "Bolama", "Cacheu", "Gabú", "Oio", "Quinara", "Tombali"],
  "Ivory Coast": ["Abidjan", "Bas-Sassandra", "Comoé", "Denguélé", "Gôh-Djiboua", "Lacs", "Lagunes", "Montagnes", "Sassandra-Marahoué", "Savanes", "Vallée du Bandama", "Woroba", "Yamoussoukro", "Zanzan"],
  "Kenya": ["Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"],
  "Lesotho": ["Berea", "Butha-Buthe", "Leribe", "Mafeteng", "Maseru", "Mohale's Hoek", "Mokhotlong", "Qacha's Nek", "Quthing", "Thaba-Tseka"],
  "Liberia": ["Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount", "Grand Gedeh", "Grand Kru", "Lofa", "Margibi", "Maryland", "Montserrado", "Nimba", "River Cess", "River Gee", "Sinoe"],
  "Libya": ["Al Butnan", "Al Jabal al Akhdar", "Al Jabal al Gharbi", "Al Jafara", "Al Jufrah", "Al Kufrah", "Al Marj", "Al Marqab", "Al Wahat", "An Nuqat al Khams", "Az Zawiya", "Benghazi", "Derna", "Ghat", "Misrata", "Murqub", "Murzuq", "Nalut", "Sabha", "Surt", "Tripoli", "Wadi al Hayaa", "Wadi ash Shati'", "Sha'biyat"],
  "Madagascar": ["Alaotra-Mangoro", "Amoron'i Mania", "Analamanga", "Analanjirofo", "Androy", "Anosy", "Atsimo-Andrefana", "Atsimo-Atsinanana", "Atsinanana", "Betsiboka", "Boeny", "Bongolava", "Diana", "Haute Matsiatra", "Ihorombe", "Itasy", "Melaky", "Menabe", "Sava", "Sofia", "Vakinankaratra", "Vatovavy-Fitovinany"],
  "Malawi": ["Balaka", "Blantyre", "Chikwawa", "Chiradzulu", "Chitipa", "Dedza", "Dowa", "Karonga", "Kasungu", "Likoma", "Lilongwe", "Machinga", "Mangochi", "Mchinji", "Mulanje", "Mwanza", "Mzimba", "Neno", "Nkhata Bay", "Nkhotakota", "Nsanje", "Ntcheu", "Ntchisi", "Phalombe", "Rumphi", "Salima", "Thyolo", "Zomba"],
  "Mali": ["Bamako", "Gao", "Kayes", "Kidal", "Koulikoro", "Ménaka", "Mopti", "Ségou", "Sikasso", "Taoudénit", "Tombouctou"],
  "Mauritania": ["Adrar", "Assaba", "Brakna", "Dakhlet Nouadhibou", "Gorgol", "Guidimaka", "Hodh Ech Chargui", "Hodh El Gharbi", "Inchiri", "Nouakchott-Nord", "Nouakchott-Ouest", "Nouakchott-Sud", "Tagant", "Tiris Zemmour", "Trarza"],
  "Mauritius": ["Agaléga", "Black River", "Flacq", "Grand Port", "Moka", "Pamplemousses", "Plaines Wilhems", "Port Louis", "Rivière du Rempart", "Rodrigues", "Savanne"],
  "Morocco": ["Beni Mellal-Khénifra", "Casablanca-Settat", "Draa-Tafilalet", "Fès-Meknès", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Marrakech-Safi", "Oriental", "Rabat-Salé-Kénitra", "Souss-Massa", "Tangier-Tetouan-Al Hoceima", "Dakhla-Oued Ed-Dahab"],
  "Mozambique": ["Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo", "Maputo City", "Nampula", "Niassa", "Sofala", "Tete", "Zambezia"],
  "Namibia": ["Erongo", "Hardap", "Karas", "Kavango East", "Kavango West", "Khomas", "Kunene", "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi"],
  "Niger": ["Agadez", "Diffa", "Dosso", "Maradi", "Tahoua", "Tillabéri", "Zinder"],
  "Nigeria": ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"],
  "Rwanda": ["Eastern", "Kigali", "Northern", "Southern", "Western"],
  "Sao Tome and Principe": ["Cantagalo", "Caué", "Lembá", "Lobata", "Mé-Zóchi", "Príncipe", "São Tomé"],
  "Senegal": ["Dakar", "Diourbel", "Fatick", "Kaffrine", "Kaolack", "Kédougou", "Kolda", "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", "Thiès", "Ziguinchor"],
  "Seychelles": ["Anse aux Pins", "Anse Boileau", "Anse Etoile", "Anse Royale", "Anse Volandry", "Au Cap", "Baie Lazare", "Baie Sainte Anne", "Beau Vallon", "Bel Air", "Bel Ombre", "Cascade", "English River", "Glacis", "Grand'Anse Mahé", "Grand'Anse Praslin", "La Digue", "Les Mamelles", "Mont Buxton", "Mont Fleuri", "Plaisance", "Pointe Larue", "Port Glaud", "Roche Caiman", "Saint Louis", "Takamaka", "Ile Perseverance"],
  "Sierra Leone": ["Bo", "Bombali", "Bonthe", "Kailahun", "Kambia", "Kenema", "Koinadugu", "Kono", "Moyamba", "Pujehun", "Port Loko", "Tonkolili", "Western Area Freetown", "Western Area Rural"],
  "Somalia": ["Awdal", "Bakool", "Banaadir", "Bari", "Bay", "Galguduud", "Gedo", "Hiiraan", "Jubbada Dhexe", "Jubbada Hoose", "Mudug", "Nugaal", "Sanaag", "Shabelle Dhexe", "Shabelle Hoose", "Sool", "Togdheer", "Woqooyi Galbeed"],
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  "South Sudan": ["Central Equatoria", "Eastern Equatoria", "Jonglei", "Lakes", "Northern Bahr el Ghazal", "Unity", "Upper Nile", "Warrap", "Western Bahr el Ghazal", "Western Equatoria"],
  "Sudan": ["Al Jazirah", "Al Qadarif", "Blue Nile", "Central Darfur", "East Darfur", "Kassala", "Khartoum", "North Darfur", "North Kordofan", "Northern", "Red Sea", "River Nile", "Sennar", "South Darfur", "South Kordofan", "West Darfur", "West Kordofan", "White Nile"],
  "Tanzania": ["Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Unguja North", "Unguja South", "Unguja Urban West"],
  "Togo": ["Centrale", "Kara", "Maritime", "Plateaux", "Savanes"],
  "Tunisia": ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kef", "Mahdia", "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"],
  "Uganda": ["Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuria", "Amuru", "Apac", "Arua", "Budaka", "Bududa", "Bugiri", "Buhweju", "Buikwe", "Bukedea", "Bukwa", "Bukwo", "Bulambuli", "Buliisa", "Bundibugyo", "Bushenyi", "Busia", "Butaleja", "Buvuma", "Buyende", "Central Kampala", "Dokolo", "Gomba", "Gulu", "Hoima", "Ibanda", "Iganga", "Isingiro", "Jinja", "Kaabong", "Kabale", "Kabarole", "Kaberamaido", "Kagadi", "Kalangala", "Kaliro", "Kal Kampala", "Kampala", "Kamuli Kamuli", "Kamwenge", "Kanungu", "Kapchorwa", "Kasese", "Katakwi", "Kayunga", "Kibaale", "Kiboga", "Kibuku", "Kiruhura", "Kiryandongo", "Kisoro", "Kitgum", "Koboko", "Kole", "Kotido", "Kumi", "Kween", "Kyankwanzi", "Kyegegwa", "Kyenjojo", "Lamwo", "Lira", "Luuka", "Luweero", "Lwengo", "Lyantonde", "Manafwa", "Maracha", "Masaka", "Masindi", "Mayuge", "Mbale", "Mbarara", "Mitooma", "Mityana", "Moroto", "Moyo", "Mpigi", "Mubende", "Mukono", "Nakapiripirit", "Nakaseke", "Nakasongola", "Namayingo", "Namutumba", "Napak", "Nebbi", "Ngora", "Ntoroko", "Ntungamo", "Nwoya", "Oyam", "Pader", "Pallisa", "Rakai", "Rubirizi", "Rukungiri", "Sembabule", "Serere", "Sheema", "Sironko", "Soroti", "Tororo", "Wakiso", "Yumbe", "Zombo"],
  "Zambia": ["Central", "Copperbelt", "Eastern", "Luapula", "Lusaka", "Muchinga", "Northern", "North-Western", "Southern", "Western"],
  "Zimbabwe": ["Bulawayo", "Harare", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North", "Matabeleland South", "Midlands"],
};

const initialFormData = {
  surname: "", first_name: "", middle_name: "", gender: "", date_of_birth: "",
  age: "", nationality: "", marital_status: "", state_of_origin: "", address: "",
  telephone: "", email: "", chosen_programme: "", passport_photo: "", agreed: false,
};

function validateField(name, value) {
  if (name === "agreed") return value ? "" : "You must agree before submitting.";
  if (name === "passport_photo") return value ? "" : "Please upload your passport photograph.";
  if (!String(value || "").trim()) return "This field is required.";
  if (name === "email" && !/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  if (name === "age" && (Number(value) < 1 || Number(value) > 100)) return "Enter an age between 1 and 100.";
  if (name === "telephone" && String(value).replace(/\D/g, "").length < 7) return "Enter a valid telephone number.";
  return "";
}

function FieldError({ message }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

export default function Course() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [acceptingStudent, setAcceptingStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        // Admins manage the academy from this page; they should never be
        // redirected to the student registration form, even if this
        // account also happens to have a row in `students` (e.g. from
        // registering before becoming an admin).
        setCheckingRegistration(false);
        fetchPendingStudents();
      } else {
        checkExistingRegistration();
      }
    } else if (!loading) {
      setCheckingRegistration(false);
    }
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (!user) return;
    const draft = getCachedValue(`registration-draft:${user.id}`);
    if (draft) setFormData((current) => ({ ...current, ...draft }));
    setDraftLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user || !draftLoaded) return;
    const { passport_photo, ...draft } = formData;
    setCachedValue(`registration-draft:${user.id}`, draft, REGISTRATION_DRAFT_TTL_MS);
  }, [formData, user, draftLoaded]);

  const fetchPendingStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("accepted", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching pending students:", error);
      } else {
        setPendingStudents(data || []);
      }
    } catch (error) {
      console.error("Error fetching pending students:", error);
    }
  };

  const handleAcceptStudent = async (studentId) => {
    setAcceptingStudent(studentId);
    try {
      const { error } = await supabase
        .from("students")
        .update({ accepted: true })
        .eq("id", studentId);

      if (error) {
        console.error("Error accepting student:", error);
        alert("Error accepting student. Please try again.");
      } else {
        // Remove from pending list
        setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
      }
    } catch (error) {
      console.error("Error accepting student:", error);
      alert("Error accepting student. Please try again.");
    } finally {
      setAcceptingStudent(null);
    }
  };

  const filteredStudents = pendingStudents.filter((student) => {
    const fullName = `${student.first_name} ${student.surname} ${student.middle_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const checkExistingRegistration = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        router.push(`/course/registration/${data.id}`);
      } else {
        setCheckingRegistration(false);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setCheckingRegistration(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === "email" ? sanitizeEmail(value) : sanitizeText(value);
    setFormData((prev) => ({
      ...prev,
      [name]: safeValue,
    }));
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, safeValue) }));
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleAgreementChange = (e) => {
    const agreed = e.target.checked;
    setFormData((prev) => ({ ...prev, agreed }));
    setTouchedFields((prev) => ({ ...prev, agreed: true }));
    setFieldErrors((prev) => ({ ...prev, agreed: validateField("agreed", agreed) }));
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      e.target.value = "";
      return;
    }

    try {
      const filePath = `${user.id}/passport.${validation.extension}`;

      // Reset and start progress simulation
      setUploadProgress(0);
      
      // Simulate progress increments - start immediately visible
      setUploadProgress(1); // Ensure bar is visible immediately
      
      // Simulate progress increments
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Slow down progress as it gets higher to simulate realistic upload
          const increment = prev < 30 ? 10 : prev < 70 ? 5 : prev < 90 ? 2 : 1;
          const newProgress = Math.min(prev + increment, 95); // Cap at 95% until upload completes
          return newProgress;
        });
      }, 100); // Update every 100ms for smoother animation

      const { error: uploadError } = await supabase.storage
        .from('student-passports')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });

      // Clear progress interval
      clearInterval(progressInterval);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(`Error uploading passport: ${uploadError.message || "Please try again."}`);
        setUploadProgress(0);
        return;
      }

      // Complete progress
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('student-passports')
        .getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        passport_photo: publicUrl,
      }));
      setTouchedFields((prev) => ({ ...prev, passport_photo: true }));
      setFieldErrors((prev) => ({ ...prev, passport_photo: "" }));

      // Brief pause at 100% then reset
      setTimeout(() => {
        setUploadProgress(0);
      }, 1500);

      alert("Passport photo uploaded successfully!");
    } catch (error) {
      console.error("Passport upload error:", error);
      alert(`Error uploading passport: ${error?.message || "Please try again."}`);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = Object.fromEntries(
      requiredFields.map((name) => [name, validateField(name, formData[name])]).filter(([, error]) => error)
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouchedFields(Object.fromEntries(requiredFields.map((name) => [name, true])));
      return;
    }

    const rateLimit = consumeRateLimit(`registration:${user.id}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            surname: sanitizeText(formData.surname),
            first_name: sanitizeText(formData.first_name),
            middle_name: sanitizeText(formData.middle_name),
            gender: sanitizeText(formData.gender),
            date_of_birth: sanitizeText(formData.date_of_birth),
            age: parseInt(formData.age),
            nationality: sanitizeText(formData.nationality),
            marital_status: sanitizeText(formData.marital_status),
            state_of_origin: sanitizeText(formData.state_of_origin),
            address: sanitizeText(formData.address),
            telephone: sanitizeText(formData.telephone),
            email: sanitizeEmail(formData.email),
            chosen_programme: sanitizeText(formData.chosen_programme),
            passport_photo: formData.passport_photo,
            user_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Submission error:", error);
        alert("Error submitting application. Please try again.");
      } else {
        invalidateCachedValue(`registration-draft:${user.id}`);
        setRegistrationId(data[0].id);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (registrationId) {
      router.push(`/course/registration/${registrationId}`);
    }
  };

  const completedFields = requiredFields.filter(
    (name) => !validateField(name, formData[name])
  ).length;
  const isFormValid = completedFields === requiredFields.length;
  const progress = Math.round((completedFields / requiredFields.length) * 100);

  if (loading || checkingRegistration) {
    return (
      <div className="loading-container">
        <div className="spinner" aria-hidden="true" />
        <p>Loading fashion school...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-modal-overlay">
        <div className="auth-modal">
          <h2>Sign In Required</h2>
          <p>You need to sign in to access the student registration form.</p>
          <div className="auth-buttons">
            <Link href="/sign-in" className="auth-btn primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="auth-btn secondary">
              Sign Up
            </Link>
          </div>
          <button className="close-btn" onClick={() => router.push("/")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      {isAdmin ? (
        <div className="admin-panel">
          <div className="admin-header">
            <h2>Admin Panel</h2>
            <Link href="/course/accepted-students" className="admin-link-btn">
              View Accepted Students
            </Link>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="enter student name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredStudents.length > 0 ? (
            <div className="pending-students">
              <h3>Pending Students ({filteredStudents.length})</h3>
              <div className="students-list">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="student-card">
                    <div className="student-info">
                      <h4>{student.first_name} {student.surname}</h4>
                      <p>{student.email}</p>
                      <p>{student.chosen_programme}</p>
                    </div>
                    <div className="student-actions">
                      <Link
                        href={`/course/registration/${student.id}`}
                        className="view-btn"
                      >
                        View Application
                      </Link>
                      <button
                        onClick={() => handleAcceptStudent(student.id)}
                        className="accept-btn"
                        disabled={acceptingStudent === student.id}
                      >
                        {acceptingStudent === student.id ? "Accepting..." : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-pending">
              <p>{searchQuery ? "No students found matching your search." : "No pending students to review."}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <h1 className="header">STUDENT REGISTRATION FORM</h1>
          <Link href="/curriculum" className="curriculum-card">
            <h2>View Our Curriculum</h2>
            <p>
              Haven&apos;t viewed our curriculum yet? Click here to get acquainted
              with the programme, what you&apos;ll learn, and your options before
              registering.
            </p>
            <span aria-hidden="true">Explore the curriculum &rarr;</span>
          </Link>
          <div className="form-container">
            <div className="form-header">
              <h1>Personal Information</h1>
              <div className="registration-progress" aria-label={`${progress}% of registration completed`}>
                <div className="registration-progress-copy">
                  <span>Registration progress</span>
                  <strong>{completedFields} of {requiredFields.length} completed</strong>
                </div>
                <div className="registration-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

        <form onSubmit={handleSubmit} className="form-body" noValidate>
          {/* Surname */}
          <div className="question">
            <div className="question-number">1. Surname/Last Name <span className="required">*</span></div>
            <div className="question-label">Your surname is your family name</div>
            <input
              type="text"
              name="surname"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.surname}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.surname && <FieldError message={fieldErrors.surname} />}
          </div>

          {/* First Name */}
          <div className="question">
            <div className="question-number">2. First Name <span className="required">*</span></div>
            <div className="question-label">The name you are commonly known by</div>
            <input
              type="text"
              name="first_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.first_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.first_name && <FieldError message={fieldErrors.first_name} />}
          </div>

          {/* Middle Name */}
          <div className="question">
            <div className="question-number">3. Middle Name</div>
            <div className="question-label">An additional name (if you have one)</div>
            <input
              type="text"
              name="middle_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.middle_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
            />
          </div>

          {/* Gender */}
          <div className="question">
            <div className="question-number">4. Gender <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Male
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Female
              </label>
            </div>
            {touchedFields.gender && <FieldError message={fieldErrors.gender} />}
          </div>

          {/* Date of Birth */}
          <div className="question">
            <div className="question-number">5. Date of Birth <span className="required">*</span></div>
            <input
              type="date"
              name="date_of_birth"
              className="input-field"
              value={formData.date_of_birth}
              onChange={(e) => {
                handleInputChange(e);
                // Auto-calculate age when date of birth changes
                if (e.target.value) {
                  const birthDate = new Date(e.target.value);
                  const today = new Date();
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  setFormData(prev => ({ ...prev, age: age.toString() }));
                } else {
                  setFormData(prev => ({ ...prev, age: "" }));
                }
              }}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.date_of_birth && <FieldError message={fieldErrors.date_of_birth} />}
          </div>

          {/* Age */}
          <div className="question">
            <div className="question-number">6. Age <span className="required">*</span></div>
            <input
              type="number"
              name="age"
              className="input-field"
              placeholder="Calculated from date of birth"
              min="1"
              max="100"
              value={formData.age}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
              readOnly
            />
            {touchedFields.age && <FieldError message={fieldErrors.age} />}
          </div>

          {/* Nationality */}
          <div className="question">
            <div className="question-number">7. Nationality <span className="required">*</span></div>
            <select
              name="nationality"
              className="input-field"
              value={formData.nationality}
              onChange={(e) => {
                handleInputChange(e);
                // Reset state of origin when the country changes so the
                // selected state always belongs to the chosen nationality.
                setFormData((prev) => ({ ...prev, state_of_origin: "" }));
                setTouchedFields((prev) => ({ ...prev, state_of_origin: false }));
                setFieldErrors((prev) => ({ ...prev, state_of_origin: "" }));
              }}
              onBlur={handleFieldBlur}
              required
            >
              <option value="">Select your nationality</option>
              {africanCountries.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {touchedFields.nationality && <FieldError message={fieldErrors.nationality} />}
          </div>

          {/* Marital Status */}
          <div className="question">
            <div className="question-number">8. Marital Status <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Single"
                  checked={formData.marital_status === "Single"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Single
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Married"
                  checked={formData.marital_status === "Married"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Married
              </label>
            </div>
            {touchedFields.marital_status && <FieldError message={fieldErrors.marital_status} />}
          </div>

          {/* State of Origin */}
          <div className="question">
            <div className="question-number">9. State of Origin <span className="required">*</span></div>
            <select
              name="state_of_origin"
              className="input-field"
              value={formData.state_of_origin}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!formData.nationality}
              required
            >
              <option value="">
                {formData.nationality ? "Select your state/region" : "Select your nationality first"}
              </option>
              {(africanStates[formData.nationality] || []).map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {touchedFields.state_of_origin && <FieldError message={fieldErrors.state_of_origin} />}
          </div>

          {/* Address */}
          <div className="question">
            <div className="question-number">10. Address <span className="required">*</span></div>
            <textarea
              name="address"
              className="textarea"
              placeholder="Enter your full address"
              value={formData.address}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.address && <FieldError message={fieldErrors.address} />}
          </div>

          {/* Telephone */}
          <div className="question">
            <div className="question-number">11. Telephone <span className="required">*</span></div>
            <input
              type="tel"
              name="telephone"
              className="input-field"
              placeholder="Enter your phone number"
              value={formData.telephone}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.telephone && <FieldError message={fieldErrors.telephone} />}
          </div>

          {/* Email */}
          <div className="question">
            <div className="question-number">12. Email Address <span className="required">*</span></div>
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.email && <FieldError message={fieldErrors.email} />}
          </div>

          {/* Chosen Programme */}
          <div className="question">
            <div className="question-number">13. Chosen Programme <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="3 Months Programme"
                  checked={formData.chosen_programme === "3 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                3 Months Programme <span style={{color: 'black'}}>(₦150,000)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="6 Months Programme"
                  checked={formData.chosen_programme === "6 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                6 Months Programme <span style={{color: 'black'}}>(₦250,000)</span>
              </label>
            </div>
            {touchedFields.chosen_programme && <FieldError message={fieldErrors.chosen_programme} />}
          </div>

          {/* Passport Photograph */}
          <div className="question">
            <div className="question-number">14. Passport Photograph <span className="required">*</span></div>
            <div className="question-label">Upload a clear passport photo (JPG, JPEG, or PNG, max 5MB)</div>
            <input
              type="file"
              className="input-field"
              accept=".jpg,.jpeg,.png"
              onChange={handlePassportUpload}
              required
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            {uploadProgress === 100 && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar" style={{ width: '100%' }}></div>
              </div>
            )}
            {formData.passport_photo && (
              <div className="passport-preview">
                <img
                  src={formData.passport_photo}
                  alt="Passport Preview"
                  className="passport-image"
                />
              </div>
            )}
            {touchedFields.passport_photo && <FieldError message={fieldErrors.passport_photo} />}
          </div>

          <div className="declaration">
            <div className="declaration-text">
              I hereby apply for training at <strong>ELEGANTSTYLE FASHION AND DESIGN</strong> and have completed this form to the best of my knowledge.
            </div>
            <label className="agree-checkbox">
              <input type="checkbox" id="agree" checked={formData.agreed} onChange={handleAgreementChange} required />
              <span>I agree</span>
            </label>
            {touchedFields.agreed && <FieldError message={fieldErrors.agreed} />}
          </div>

          <button type="submit" className="submit-btn" disabled={submitting || !isFormValid}>
            {submitting ? (
              <>
                <span className="submit-spinner" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </button>
        </form>
      </div>
        </>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Registration Successful!</h2>
            <p>You have successfully registered!</p>
            <button className="success-modal-btn" onClick={handleCloseModal}>
              View Registration Details
            </button>
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
