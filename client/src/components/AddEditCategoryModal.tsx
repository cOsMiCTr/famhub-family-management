import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  XMarkIcon, 
  HomeIcon, 
  ChartBarIcon, 
  ChartPieIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  SparklesIcon, 
  TruckIcon, 
  PaintBrushIcon, 
  BanknotesIcon, 
  CubeTransparentIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CameraIcon,
  MusicalNoteIcon,
  BookOpenIcon,
  AcademicCapIcon,
  HeartIcon,
  GiftIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  MapIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  UsersIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ScissorsIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  FolderIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
  PlusIcon,
  MinusIcon,
  CheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  CakeIcon,
  CloudIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface AssetCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  type: string;
  category_type: string;
  icon?: string;
  requires_ticker: boolean;
  depreciation_enabled: boolean;
  is_default: boolean;
}

interface AddEditCategoryModalProps {
  category?: AssetCategory;
  onClose: () => void;
  onSave: (categoryData: Partial<AssetCategory>) => void;
  mode: 'add' | 'edit';
}

const AddEditCategoryModal: React.FC<AddEditCategoryModalProps> = ({
  category,
  onClose,
  onSave,
  mode
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // Icon mapping for categories
  const getCategoryIcon = (iconName: string) => {
    const iconMap: {[key: string]: React.ComponentType<any>} = {
      // Old format (full component names with "Icon" suffix)
      'HomeIcon': HomeIcon,
      'ChartBarIcon': ChartBarIcon,
      'ChartPieIcon': ChartPieIcon,
      'DocumentTextIcon': DocumentTextIcon,
      'CurrencyDollarIcon': CurrencyDollarIcon,
      'SparklesIcon': SparklesIcon,
      'TruckIcon': TruckIcon,
      'PaintBrushIcon': PaintBrushIcon,
      'BanknotesIcon': BanknotesIcon,
      'CubeTransparentIcon': CubeTransparentIcon,
      'BuildingOfficeIcon': BuildingOfficeIcon,
      'BuildingOffice2Icon': BuildingOffice2Icon,
      'BriefcaseIcon': BriefcaseIcon,
      'ComputerDesktopIcon': ComputerDesktopIcon,
      'DevicePhoneMobileIcon': DevicePhoneMobileIcon,
      'CameraIcon': CameraIcon,
      'MusicalNoteIcon': MusicalNoteIcon,
      'BookOpenIcon': BookOpenIcon,
      'AcademicCapIcon': AcademicCapIcon,
      'HeartIcon': HeartIcon,
      'GiftIcon': GiftIcon,
      'StarIcon': StarIcon,
      'FireIcon': FireIcon,
      'BoltIcon': BoltIcon,
      'SunIcon': SunIcon,
      'MoonIcon': MoonIcon,
      'GlobeAltIcon': GlobeAltIcon,
      'MapIcon': MapIcon,
      'ClockIcon': ClockIcon,
      'CalendarIcon': CalendarIcon,
      'UserIcon': UserIcon,
      'UsersIcon': UsersIcon,
      'ShieldCheckIcon': ShieldCheckIcon,
      'LockClosedIcon': LockClosedIcon,
      'KeyIcon': KeyIcon,
      'CogIcon': CogIcon,
      'WrenchScrewdriverIcon': WrenchScrewdriverIcon,
      'ScissorsIcon': ScissorsIcon,
      'PencilIcon': PencilIcon,
      'ClipboardDocumentIcon': ClipboardDocumentIcon,
      'FolderIcon': FolderIcon,
      'ArchiveBoxIcon': ArchiveBoxIcon,
      'ShoppingBagIcon': ShoppingBagIcon,
      'ShoppingCartIcon': ShoppingCartIcon,
      'CreditCardIcon': CreditCardIcon,
      'ReceiptPercentIcon': ReceiptPercentIcon,
      'CalculatorIcon': CalculatorIcon,
      'PlusIcon': PlusIcon,
      'MinusIcon': MinusIcon,
      'CheckIcon': CheckIcon,
      'XCircleIcon': XCircleIcon,
      'ExclamationTriangleIcon': ExclamationTriangleIcon,
      'InformationCircleIcon': InformationCircleIcon,
      'QuestionMarkCircleIcon': QuestionMarkCircleIcon,
      'LightBulbIcon': LightBulbIcon,
      'PuzzlePieceIcon': PuzzlePieceIcon,
      'RocketLaunchIcon': RocketLaunchIcon,
      'BeakerIcon': BeakerIcon,
      'MagnifyingGlassIcon': MagnifyingGlassIcon,
      'EyeIcon': EyeIcon,
      'EyeSlashIcon': EyeSlashIcon,
      'HandRaisedIcon': HandRaisedIcon,
      'HandThumbUpIcon': HandThumbUpIcon,
      'HandThumbDownIcon': HandThumbDownIcon,
      'FaceSmileIcon': FaceSmileIcon,
      'FaceFrownIcon': FaceFrownIcon,
      'CakeIcon': CakeIcon,
      'CloudIcon': CloudIcon,
      'ArrowTrendingUpIcon': ArrowTrendingUpIcon,
      'ArrowTrendingDownIcon': ArrowTrendingDownIcon,
      'ArrowUpIcon': ArrowUpIcon,
      'ArrowDownIcon': ArrowDownIcon,
      'ArrowRightIcon': ArrowRightIcon,
      'ArrowLeftIcon': ArrowLeftIcon,
      // New format (Heroicon names without "Icon" suffix)
      'home-modern': HomeIcon,
      'chart-bar': ChartBarIcon,
      'chart-bar-square': ChartBarIcon,
      'document-text': DocumentTextIcon,
      'currency-bitcoin': CurrencyDollarIcon,
      'currency-dollar': CurrencyDollarIcon,
      'sparkles': SparklesIcon,
      'truck': TruckIcon,
      'paint-brush': PaintBrushIcon,
      'banknotes': BanknotesIcon,
      'cube': CubeTransparentIcon,
      'building-office': BuildingOfficeIcon,
      'building-office-2': BuildingOffice2Icon,
      'briefcase': BriefcaseIcon,
      'computer-desktop': ComputerDesktopIcon,
      'device-phone-mobile': DevicePhoneMobileIcon,
      'camera': CameraIcon,
      'musical-note': MusicalNoteIcon,
      'book-open': BookOpenIcon,
      'academic-cap': AcademicCapIcon,
      'heart': HeartIcon,
      'gift': GiftIcon,
      'star': StarIcon,
      'fire': FireIcon,
      'bolt': BoltIcon,
      'sun': SunIcon,
      'moon': MoonIcon,
      'globe-alt': GlobeAltIcon,
      'map': MapIcon,
      'clock': ClockIcon,
      'calendar': CalendarIcon,
      'user': UserIcon,
      'users': UsersIcon,
      'shield-check': ShieldCheckIcon,
      'lock-closed': LockClosedIcon,
      'key': KeyIcon,
      'cog': CogIcon,
      'wrench-screwdriver': WrenchScrewdriverIcon,
      'scissors': ScissorsIcon,
      'pencil': PencilIcon,
      'clipboard-document': ClipboardDocumentIcon,
      'folder': FolderIcon,
      'archive-box': ArchiveBoxIcon,
      'shopping-bag': ShoppingBagIcon,
      'shopping-cart': ShoppingCartIcon,
      'credit-card': CreditCardIcon,
      'receipt-percent': ReceiptPercentIcon,
      'calculator': CalculatorIcon,
      'plus': PlusIcon,
      'minus': MinusIcon,
      'check': CheckIcon,
      'x-circle': XCircleIcon,
      'exclamation-triangle': ExclamationTriangleIcon,
      'information-circle': InformationCircleIcon,
      'question-mark-circle': QuestionMarkCircleIcon,
      'light-bulb': LightBulbIcon,
      'puzzle-piece': PuzzlePieceIcon,
      'rocket-launch': RocketLaunchIcon,
      'beaker': BeakerIcon,
      'magnifying-glass': MagnifyingGlassIcon,
      'eye': EyeIcon,
      'eye-slash': EyeSlashIcon,
      'hand-raised': HandRaisedIcon,
      'hand-thumb-up': HandThumbUpIcon,
      'hand-thumb-down': HandThumbDownIcon,
      'face-smile': FaceSmileIcon,
      'face-frown': FaceFrownIcon,
      'cake': CakeIcon,
      'cloud': CloudIcon,
      'arrow-trending-up': ArrowTrendingUpIcon,
      'arrow-trending-down': ArrowTrendingDownIcon,
      'arrow-up': ArrowUpIcon,
      'arrow-down': ArrowDownIcon,
      'arrow-right': ArrowRightIcon,
      'arrow-left': ArrowLeftIcon,
    };
    return iconMap[iconName] || CubeTransparentIcon;
  };

  // Icon definitions with translations
  const iconDefinitions = [
    { value: 'AcademicCapIcon', label_en: 'Education', label_de: 'Bildung', label_tr: 'Eğitim', component: AcademicCapIcon },
    { value: 'ArchiveBoxIcon', label_en: 'Archive', label_de: 'Archiv', label_tr: 'Arşiv', component: ArchiveBoxIcon },
    { value: 'ArrowDownIcon', label_en: 'Arrow Down', label_de: 'Pfeil Runter', label_tr: 'Aşağı Ok', component: ArrowDownIcon },
    { value: 'ArrowLeftIcon', label_en: 'Arrow Left', label_de: 'Pfeil Links', label_tr: 'Sol Ok', component: ArrowLeftIcon },
    { value: 'ArrowRightIcon', label_en: 'Arrow Right', label_de: 'Pfeil Rechts', label_tr: 'Sağ Ok', component: ArrowRightIcon },
    { value: 'ArrowTrendingDownIcon', label_en: 'Trending Down', label_de: 'Fallend', label_tr: 'Düşen', component: ArrowTrendingDownIcon },
    { value: 'ArrowTrendingUpIcon', label_en: 'Trending Up', label_de: 'Steigend', label_tr: 'Yükselen', component: ArrowTrendingUpIcon },
    { value: 'ArrowUpIcon', label_en: 'Arrow Up', label_de: 'Pfeil Hoch', label_tr: 'Yukarı Ok', component: ArrowUpIcon },
    { value: 'BanknotesIcon', label_en: 'Banknotes', label_de: 'Banknoten', label_tr: 'Banknotlar', component: BanknotesIcon },
    { value: 'BeakerIcon', label_en: 'Beaker', label_de: 'Becherglas', label_tr: 'Beher', component: BeakerIcon },
    { value: 'BoltIcon', label_en: 'Lightning', label_de: 'Blitz', label_tr: 'Şimşek', component: BoltIcon },
    { value: 'BookOpenIcon', label_en: 'Book', label_de: 'Buch', label_tr: 'Kitap', component: BookOpenIcon },
    { value: 'BriefcaseIcon', label_en: 'Briefcase', label_de: 'Aktenkoffer', label_tr: 'Çanta', component: BriefcaseIcon },
    { value: 'BuildingOffice2Icon', label_en: 'Office Building 2', label_de: 'Bürogebäude 2', label_tr: 'Ofis Binası 2', component: BuildingOffice2Icon },
    { value: 'BuildingOfficeIcon', label_en: 'Office Building', label_de: 'Bürogebäude', label_tr: 'Ofis Binası', component: BuildingOfficeIcon },
    { value: 'CalculatorIcon', label_en: 'Calculator', label_de: 'Taschenrechner', label_tr: 'Hesap Makinesi', component: CalculatorIcon },
    { value: 'CalendarIcon', label_en: 'Calendar', label_de: 'Kalender', label_tr: 'Takvim', component: CalendarIcon },
    { value: 'CameraIcon', label_en: 'Camera', label_de: 'Kamera', label_tr: 'Kamera', component: CameraIcon },
    { value: 'CakeIcon', label_en: 'Cake', label_de: 'Kuchen', label_tr: 'Pasta', component: CakeIcon },
    { value: 'ChartBarIcon', label_en: 'Chart Bar', label_de: 'Balkendiagramm', label_tr: 'Çubuk Grafik', component: ChartBarIcon },
    { value: 'ChartPieIcon', label_en: 'Chart Pie', label_de: 'Kreisdiagramm', label_tr: 'Pasta Grafik', component: ChartPieIcon },
    { value: 'CheckIcon', label_en: 'Check', label_de: 'Haken', label_tr: 'Onay', component: CheckIcon },
    { value: 'ClipboardDocumentIcon', label_en: 'Clipboard', label_de: 'Zwischenablage', label_tr: 'Pano', component: ClipboardDocumentIcon },
    { value: 'CloudIcon', label_en: 'Cloud', label_de: 'Wolke', label_tr: 'Bulut', component: CloudIcon },
    { value: 'CogIcon', label_en: 'Settings', label_de: 'Einstellungen', label_tr: 'Ayarlar', component: CogIcon },
    { value: 'ComputerDesktopIcon', label_en: 'Computer', label_de: 'Computer', label_tr: 'Bilgisayar', component: ComputerDesktopIcon },
    { value: 'CreditCardIcon', label_en: 'Credit Card', label_de: 'Kreditkarte', label_tr: 'Kredi Kartı', component: CreditCardIcon },
    { value: 'CubeTransparentIcon', label_en: 'Cube', label_de: 'Würfel', label_tr: 'Küp', component: CubeTransparentIcon },
    { value: 'CurrencyDollarIcon', label_en: 'Currency', label_de: 'Währung', label_tr: 'Para Birimi', component: CurrencyDollarIcon },
    { value: 'DevicePhoneMobileIcon', label_en: 'Mobile Phone', label_de: 'Handy', label_tr: 'Cep Telefonu', component: DevicePhoneMobileIcon },
    { value: 'DocumentTextIcon', label_en: 'Document', label_de: 'Dokument', label_tr: 'Belge', component: DocumentTextIcon },
    { value: 'ExclamationTriangleIcon', label_en: 'Warning', label_de: 'Warnung', label_tr: 'Uyarı', component: ExclamationTriangleIcon },
    { value: 'EyeIcon', label_en: 'Eye', label_de: 'Auge', label_tr: 'Göz', component: EyeIcon },
    { value: 'EyeSlashIcon', label_en: 'Eye Slash', label_de: 'Auge Durchgestrichen', label_tr: 'Göz Çizgili', component: EyeSlashIcon },
    { value: 'FaceFrownIcon', label_en: 'Frown', label_de: 'Stirnrunzeln', label_tr: 'Kaş Çatma', component: FaceFrownIcon },
    { value: 'FaceSmileIcon', label_en: 'Smile', label_de: 'Lächeln', label_tr: 'Gülümseme', component: FaceSmileIcon },
    { value: 'FireIcon', label_en: 'Fire', label_de: 'Feuer', label_tr: 'Ateş', component: FireIcon },
    { value: 'FolderIcon', label_en: 'Folder', label_de: 'Ordner', label_tr: 'Klasör', component: FolderIcon },
    { value: 'GiftIcon', label_en: 'Gift', label_de: 'Geschenk', label_tr: 'Hediye', component: GiftIcon },
    { value: 'GlobeAltIcon', label_en: 'Globe', label_de: 'Globus', label_tr: 'Dünya', component: GlobeAltIcon },
    { value: 'HandRaisedIcon', label_en: 'Hand Raised', label_de: 'Hand Gehoben', label_tr: 'El Kalkık', component: HandRaisedIcon },
    { value: 'HandThumbDownIcon', label_en: 'Thumbs Down', label_de: 'Daumen Runter', label_tr: 'Başparmak Aşağı', component: HandThumbDownIcon },
    { value: 'HandThumbUpIcon', label_en: 'Thumbs Up', label_de: 'Daumen Hoch', label_tr: 'Başparmak Yukarı', component: HandThumbUpIcon },
    { value: 'HeartIcon', label_en: 'Heart', label_de: 'Herz', label_tr: 'Kalp', component: HeartIcon },
    { value: 'HomeIcon', label_en: 'Home', label_de: 'Zuhause', label_tr: 'Ev', component: HomeIcon },
    { value: 'InformationCircleIcon', label_en: 'Info', label_de: 'Info', label_tr: 'Bilgi', component: InformationCircleIcon },
    { value: 'KeyIcon', label_en: 'Key', label_de: 'Schlüssel', label_tr: 'Anahtar', component: KeyIcon },
    { value: 'LightBulbIcon', label_en: 'Light Bulb', label_de: 'Glühbirne', label_tr: 'Ampul', component: LightBulbIcon },
    { value: 'LockClosedIcon', label_en: 'Lock', label_de: 'Schloss', label_tr: 'Kilit', component: LockClosedIcon },
    { value: 'MagnifyingGlassIcon', label_en: 'Search', label_de: 'Suchen', label_tr: 'Arama', component: MagnifyingGlassIcon },
    { value: 'MapIcon', label_en: 'Map', label_de: 'Karte', label_tr: 'Harita', component: MapIcon },
    { value: 'MinusIcon', label_en: 'Minus', label_de: 'Minus', label_tr: 'Eksi', component: MinusIcon },
    { value: 'MoonIcon', label_en: 'Moon', label_de: 'Mond', label_tr: 'Ay', component: MoonIcon },
    { value: 'MusicalNoteIcon', label_en: 'Music', label_de: 'Musik', label_tr: 'Müzik', component: MusicalNoteIcon },
    { value: 'PaintBrushIcon', label_en: 'Paint Brush', label_de: 'Pinsel', label_tr: 'Fırça', component: PaintBrushIcon },
    { value: 'PencilIcon', label_en: 'Pencil', label_de: 'Bleistift', label_tr: 'Kalem', component: PencilIcon },
    { value: 'PlusIcon', label_en: 'Plus', label_de: 'Plus', label_tr: 'Artı', component: PlusIcon },
    { value: 'PuzzlePieceIcon', label_en: 'Puzzle', label_de: 'Puzzle', label_tr: 'Bulmaca', component: PuzzlePieceIcon },
    { value: 'QuestionMarkCircleIcon', label_en: 'Question', label_de: 'Frage', label_tr: 'Soru', component: QuestionMarkCircleIcon },
    { value: 'ReceiptPercentIcon', label_en: 'Receipt', label_de: 'Quittung', label_tr: 'Fiş', component: ReceiptPercentIcon },
    { value: 'RocketLaunchIcon', label_en: 'Rocket', label_de: 'Rakete', label_tr: 'Roket', component: RocketLaunchIcon },
    { value: 'ScissorsIcon', label_en: 'Scissors', label_de: 'Schere', label_tr: 'Makas', component: ScissorsIcon },
    { value: 'ShieldCheckIcon', label_en: 'Shield', label_de: 'Schild', label_tr: 'Kalkan', component: ShieldCheckIcon },
    { value: 'ShoppingBagIcon', label_en: 'Shopping Bag', label_de: 'Einkaufstasche', label_tr: 'Alışveriş Çantası', component: ShoppingBagIcon },
    { value: 'ShoppingCartIcon', label_en: 'Shopping Cart', label_de: 'Einkaufswagen', label_tr: 'Alışveriş Arabası', component: ShoppingCartIcon },
    { value: 'SparklesIcon', label_en: 'Sparkles', label_de: 'Funkeln', label_tr: 'Pırıltı', component: SparklesIcon },
    { value: 'StarIcon', label_en: 'Star', label_de: 'Stern', label_tr: 'Yıldız', component: StarIcon },
    { value: 'SunIcon', label_en: 'Sun', label_de: 'Sonne', label_tr: 'Güneş', component: SunIcon },
    { value: 'TruckIcon', label_en: 'Truck', label_de: 'LKW', label_tr: 'Kamyon', component: TruckIcon },
    { value: 'UserIcon', label_en: 'User', label_de: 'Benutzer', label_tr: 'Kullanıcı', component: UserIcon },
    { value: 'UsersIcon', label_en: 'Users', label_de: 'Benutzer', label_tr: 'Kullanıcılar', component: UsersIcon },
    { value: 'WrenchScrewdriverIcon', label_en: 'Tools', label_de: 'Werkzeuge', label_tr: 'Araçlar', component: WrenchScrewdriverIcon },
    { value: 'XCircleIcon', label_en: 'X Circle', label_de: 'X Kreis', label_tr: 'X Daire', component: XCircleIcon },
  ];

  // Simple function to get sorted icons based on current language
  const getSortedIcons = () => {
    const currentLang = i18n.language || 'en';
    let langKey = 'label_en'; // default to English
    
    if (currentLang.startsWith('de')) {
      langKey = 'label_de';
    } else if (currentLang.startsWith('tr')) {
      langKey = 'label_tr';
    }
    
    return [...iconDefinitions].sort((a, b) => {
      const labelA = a[langKey as keyof typeof a] || a.label_en;
      const labelB = b[langKey as keyof typeof b] || b.label_en;
      return String(labelA).localeCompare(String(labelB), currentLang);
    }).map(icon => ({
      value: icon.value,
      label: icon[langKey as keyof typeof icon] || icon.label_en,
      component: icon.component
    }));
  };

  const availableIcons = getSortedIcons();

  const [formData, setFormData] = useState({
    name_en: '',
    name_de: '',
    name_tr: '',
    type: 'income',
    category_type: 'other',
    icon: '',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: false
  });
  
  const [showIconDropdown, setShowIconDropdown] = useState(false);

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name_en: category.name_en,
        name_de: category.name_de,
        name_tr: category.name_tr,
        type: category.type,
        category_type: category.category_type,
        icon: category.icon || '',
        requires_ticker: category.requires_ticker,
        depreciation_enabled: category.depreciation_enabled,
        is_default: category.is_default
      });
    }
  }, [category, mode]);

  // Handle clicking outside to close icon dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showIconDropdown && !(event.target as Element).closest('.icon-dropdown')) {
        setShowIconDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showIconDropdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryTypes = [
    { value: 'real_estate', label: t('assetCategories.realEstate') },
    { value: 'stocks', label: t('assetCategories.stocks') },
    { value: 'etf', label: t('assetCategories.etf') },
    { value: 'bonds', label: t('assetCategories.bonds') },
    { value: 'crypto', label: t('assetCategories.crypto') },
    { value: 'gold', label: t('assetCategories.gold') },
    { value: 'vehicles', label: t('assetCategories.vehicles') },
    { value: 'collectibles', label: t('assetCategories.collectibles') },
    { value: 'cash', label: t('assetCategories.cash') },
    { value: 'other', label: t('assetCategories.other') }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {mode === 'add' ? t('assetCategories.addCategory') : t('assetCategories.editCategory')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (EN) *
                </label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (DE) *
                </label>
                <input
                  type="text"
                  name="name_de"
                  value={formData.name_de}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (TR) *
                </label>
                <input
                  type="text"
                  name="name_tr"
                  value={formData.name_tr}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Type and Category Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('assetCategories.typeLabel')} *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="income">{t('assetCategories.income')}</option>
                  <option value="expense">{t('assetCategories.expense')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('assetCategories.categoryType')}
                </label>
                <select
                  name="category_type"
                  value={formData.category_type}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categoryTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('assetCategories.icon')}
              </label>
              <div className="relative icon-dropdown">
                <button
                  type="button"
                  onClick={() => setShowIconDropdown(!showIconDropdown)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-left flex items-center justify-between"
                >
                  <div className="flex items-center">
                    {formData.icon ? (
                      <>
                        {(() => {
                          const IconComponent = getCategoryIcon(formData.icon);
                          // Try to find the label in availableIcons first
                          let iconLabel = availableIcons.find(i => i.value === formData.icon)?.label;
                          // If not found, try to find by converting the icon name format
                          if (!iconLabel) {
                            // Convert "home-modern" to "HomeIcon" or try exact match
                            const convertedName = formData.icon.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join('') + 'Icon';
                            iconLabel = availableIcons.find(i => i.value === convertedName)?.label;
                          }
                          // If still not found, use the icon name as-is
                          if (!iconLabel) {
                            iconLabel = formData.icon.charAt(0).toUpperCase() + formData.icon.slice(1).replace(/-/g, ' ');
                          }
                          return (
                            <>
                              {React.createElement(IconComponent as any, { 
                                className: "h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" 
                              })}
                              <span>{String(iconLabel)}</span>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <span>Select an icon</span>
                    )}
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showIconDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                    {availableIcons.map(icon => {
                      const IconComponent = icon.component;
                      return (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, icon: icon.value }));
                            setShowIconDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                        >
                          {React.createElement(IconComponent as any, { 
                            className: "h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" 
                          })}
                          <span>{String(icon.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('assetCategories.settingsLabel')}</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requires_ticker"
                    checked={formData.requires_ticker}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('assetCategories.requiresTickerSymbol')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="depreciation_enabled"
                    checked={formData.depreciation_enabled}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('assetCategories.depreciationEnabledLabel')}
                  </span>
                </label>
                {mode === 'add' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t('assetCategories.defaultCategory')}
                    </span>
                  </label>
                )}
              </div>
              
              {/* Compact Settings Explanations */}
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-400">
                <div className="space-y-1">
                  <div><strong>Ticker Symbol:</strong> Required for stocks, ETFs, bonds (e.g., AAPL, SPY)</div>
                  <div><strong>Depreciation:</strong> Enables automatic value reduction over time</div>
                  <div><strong>Default:</strong> Pre-selected when creating new assets</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.saving') : (mode === 'add' ? t('assetCategories.addCategory') : t('assetCategories.editCategory'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditCategoryModal;
