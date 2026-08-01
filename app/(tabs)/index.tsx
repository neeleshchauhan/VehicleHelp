import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io, Socket } from "socket.io-client";

// Safe Native Module Check (Prevents Expo Go Crash)
let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch (e) {
  console.log('Native Speech Recognition Module not found - running in Safe Mode');
}

const Voice = {
  start: async (locale: string = 'en-US') => {
    try {
      if (ExpoSpeechRecognitionModule) {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (result.granted) {
          ExpoSpeechRecognitionModule.start({ lang: locale });
        }
      } else {
        Alert.alert("Notice", "Voice recognition requires a native build.");
      }
    } catch (e) {
      console.log('Error starting speech recognition:', e);
    }
  },
  stop: async () => {
    try {
      if (ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      console.log('Error stopping speech recognition:', e);
    }
  },
  destroy: async () => {
    try {
      if (ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      console.log('Error destroying speech recognition:', e);
    }
  },
  removeAllListeners: () => {},
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechResults: null,
  onSpeechError: null,
};

const DEV_BACKEND_IP = '10.182.110.71'; 
const BASE_URL = `http://${DEV_BACKEND_IP}:5000`;
const API_BASE_URL = `${BASE_URL}/api`; 
const RATE_PER_KM = 8; // ₹8 / km standard rate

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'partner';
  text: string;
  timestamp: string;
}

interface SpareItem {
  id: string;
  name: string;
  price: number;
  imageUri: string | null;
}

export default function HomeScreen() {
  const socketRef = useRef<Socket | null>(null);

  const [authSelection, setAuthSelection] = useState<'NONE' | 'USER' | 'PARTNER'>('NONE');
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en'); 
  const mapRef = useRef<MapView>(null);

  // === USER & AUTH STATES ===
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // === SERVICE REQUEST CONFIGURATION STATES ===
  const [modalVisible, setModalVisible] = useState(false);
  const [activeService, setActiveService] = useState('Mechanic'); 
  const [selectedVehicle, setSelectedVehicle] = useState('bike'); 
  const [selectedProblem, setSelectedProblem] = useState('Engine Issue'); 
  const [customDescription, setCustomDescription] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [trackingRequest, setTrackingRequest] = useState<any | null>(null);
  const [incomingSOS, setIncomingSOS] = useState<any | null>(null); 
  
  // === OTP & RATING STATES ===
  const [arrivalOTP, setArrivalOTP] = useState('1234');
  const [serviceClosureOTP, setServiceClosureOTP] = useState('4739'); 
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [partnerClosureOtpInput, setPartnerClosureOtpInput] = useState('');
  const [partnerArrivalOtpInput, setPartnerArrivalOtpInput] = useState('');
  const [jobStatus, setJobStatus] = useState<'assigned' | 'arrived' | 'inprogress' | 'completed'>('assigned');

  // === LIVE BILLING & FARE STATES ===
  const [distanceKm, setDistanceKm] = useState<number>(4.5);
  const [travelFare, setTravelFare] = useState<number>(36);
  const [billingItems, setBillingItems] = useState<SpareItem[]>([]);
  const [totalBillAmount, setTotalBillAmount] = useState<number>(36);
  const [newPartName, setNewPartName] = useState('');
  const [newPartImage, setNewPartImage] = useState<string | null>(null);

  // === DYNAMIC CHAT CHANNELS ===
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // === PARTNER SYSTEM STATES ===
  const [partnerLoggedIn, setPartnerLoggedIn] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState(false); 
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null); 
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState(''); 
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [serviceType, setServiceType] = useState('Mechanic');

  // Dynamic Strict Localization Dictionary
  const dictionary = useMemo(() => ({
    en: {
      appName: '🚗 VehicleHelp',
      tagline: 'Instant Roadside Support Anywhere',
      selectModeHeader: 'Select Mode',
      selectModeSubtitle: 'Choose your portal to get started',
      driverPortalTitle: 'Driver Portal',
      driverPortalDesc: 'Request emergency roadside assistance',
      partnerPortalTitle: 'Partner Portal',
      partnerPortalDesc: 'Accept nearby distress calls & requests',
      driverLoginHeader: 'Driver Quick Access',
      driverNamePlace: 'Driver Name',
      mobilePlace: 'Mobile Number',
      enterDriverDash: 'Enter Driver Dashboard 🔓',
      yourLocation: 'Your Location',
      emergencyPoint: 'Emergency Origin',
      selectServiceHeader: 'Select Emergency Service Required:',
      mechanicService: 'Mechanic Breakdown',
      punctureService: 'Tyre Puncture',
      fuelService: 'Fuel Delivery',
      etaText: 'ETA: 10 Mins',
      totalPayable: 'Total Bill Amount:',
      closeCodeLabel: 'Service Closure Code:',
      closeCodeNote: 'Share this 4-digit OTP code with partner once job is completed.',
      chatBtnText: 'Open Live Chat 💬',
      completeRateBtn: 'Complete & Rate Service ⭐',
      logoutText: 'Logout Session 🛑',
      shopReg: 'Garage/Partner Registration',
      partnerQuick: 'Partner Quick Login',
      uploadPhotoText: 'Upload Garage Photo 📷',
      ownerName: 'Owner / Mechanic Name:',
      ownerNamePlace: 'e.g. Nilesh Singh',
      garageNameLabel: 'Garage / Workshop Title:',
      shopNamePlace: 'e.g. Chauhan Motors',
      categoryTypeLabel: 'Select Category Type:',
      generalMechanicLabel: 'General Mechanic & Repair',
      punctureFixingLabel: 'Tyre Puncture Service',
      emergencyFuelLabel: 'Emergency Fuel Delivery',
      shopLocationLabel: 'Workshop Location Address:',
      storeAddressPlace: 'Enter complete street address',
      fetchLocationBtn: '📍 Fetch Live GPS Address',
      phonePlaceholder: 'Enter 10-Digit Phone Number',
      alreadyRegUser: 'Already registered? Login here',
      createPartnerAccountLink: 'New Garage? Register Partner Account',
      goBack: '← Switch Back to Role Selection',
      verifyLaunchPartner: 'Verify & Launch Partner Account 🔓',
      onlineStatus: '● ONLINE & ACTIVE',
      offlineStatus: '○ OFFLINE MODE',
      offlineNotice: 'You are OFFLINE. Switch ON to accept requests.',
      alertReceivedTitle: '🚨 Emergency SOS Request Received',
      driverNameLabel: 'Driver:',
      issueLogsLabel: 'Issue:',
      travelLabel: 'Travel',
      bonusLabel: 'Fare',
      arrivalOtpPlace: 'Enter Driver\'s 4-Digit Arrival OTP',
      verifyArrivalBtn: 'Verify Driver Arrival OTP',
      addPartHeading: 'Add Spare Parts / Labor Cost',
      partNamePlace: 'Part Name / Service Description',
      uploadPartImg: '📷 Snap Part Photo',
      aiFetchBtn: 'Add Part Item',
      partnerOtpInputLabel: 'Enter Driver Service Closure OTP:',
      partnerOtpPlaceholder: '4-Digit Code',
      partnerVerifyActionBtn: 'Complete Job & Payment ✔️',
      rejectClearText: 'Decline / Clear Request',
      waitingRequests: 'Listening for incoming roadside SOS requests...',
      logoutWorkstation: 'Exit Partner Portal 🛑',
      configureReq: 'Configure Emergency Request',
      vehicleType: 'Select Vehicle Category:',
      bikeOption: '🏍️ Bike',
      carOption: '🚗 Car',
      autoOption: '🛺 Auto',
      otherCustomText: '🚚 Other',
      problemType: 'Select Problem Type:',
      customDescTitle: 'Additional Notes / Voice Dictation:',
      customMsgPlaceholder: 'e.g. Engine stopped suddenly near highway',
      tipMessage: '💡 Tip: Stay inside your vehicle in unsafe locations.',
      broadcastBtn: 'Broadcast SOS Alert 📢',
      cancelText: 'Cancel & Go Back',
      srvFeedbackTitle: 'Rate Service Experience',
      srvFeedbackDesc: 'Please rate the mechanic speed and repair quality.',
      srvFeedbackPlace: 'Write your experience feedback (optional)...',
      submitStarRating: 'Submit Rating & Close',
      liveChatTitle: 'Live Assistance Chat',
      chatInputPlace: 'Type message...',
      sendText: 'Send',
      closeRoomText: 'Close Chat',
      successLabel: 'Success',
      errorLabel: 'Error',
      srvSuccessMsg: 'Service completed successfully!',
      incorrectCodeMsg: 'Incorrect closure code. Please verify.',
    },
    hi: {
      appName: '🚗 VehicleHelp',
      tagline: 'कहीं भी तुरंत रोड साइड सहायता पाएं',
      selectModeHeader: 'मोड चुनें',
      selectModeSubtitle: 'आगे बढ़ने के लिए अपना पोर्टल चुनें',
      driverPortalTitle: 'ड्राइवर पोर्टल',
      driverPortalDesc: 'आपातकालीन रोड साइड सहायता मांगें',
      partnerPortalTitle: 'पार्टनर पोर्टल',
      partnerPortalDesc: 'आस-पास की आपातकालीन कॉल स्वीकार करें',
      driverLoginHeader: 'ड्राइवर लॉगिन',
      driverNamePlace: 'ड्राइवर का नाम',
      mobilePlace: 'मोबाइल नंबर',
      enterDriverDash: 'ड्राइवर डैशबोर्ड में प्रवेश करें 🔓',
      yourLocation: 'आपका स्थान',
      emergencyPoint: 'आपातकालीन बिंदु',
      selectServiceHeader: 'आवश्यक आपातकालीन सेवा चुनें:',
      mechanicService: 'मैकेनिक सहायता',
      punctureService: 'टायर पंक्चर',
      fuelService: 'ईंधन वितरण',
      etaText: 'समय: 10 मिनट',
      totalPayable: 'कुल भुगतान राशि:',
      closeCodeLabel: 'सर्विस क्लोजर कोड:',
      closeCodeNote: 'काम पूरा होने पर यह 4-अंकीय OTP मैकेनिक को दें।',
      chatBtnText: 'लाइव चैट खोलें 💬',
      completeRateBtn: 'सर्विस पूर्ण करें और रेटिंग दें ⭐',
      logoutText: 'लॉगआउट करें 🛑',
      shopReg: 'गैराज/पार्टनर पंजीकरण',
      partnerQuick: 'पार्टनर त्वरित लॉगिन',
      uploadPhotoText: 'गैराज का फोटो अपलोड करें 📷',
      ownerName: 'मालिक / मैकेनिक का नाम:',
      ownerNamePlace: 'उदा. नीलेश सिंह',
      garageNameLabel: 'गैराज / वर्कशॉप का नाम:',
      shopNamePlace: 'उदा. चौहान मोटर्स',
      categoryTypeLabel: 'श्रेणी का प्रकार चुनें:',
      generalMechanicLabel: 'सामान्य मैकेनिक और मरम्मत',
      punctureFixingLabel: 'टायर पंक्चर सेवा',
      emergencyFuelLabel: 'आपातकालीन ईंधन वितरण',
      shopLocationLabel: 'कार्यशाला का पता:',
      storeAddressPlace: 'पूरा पता दर्ज करें',
      fetchLocationBtn: '📍 लाइव जीपीएस पता प्राप्त करें',
      phonePlaceholder: '10-अंकीय मोबाइल नंबर दर्ज करें',
      alreadyRegUser: 'पहले से पंजीकृत हैं? लॉगिन करें',
      createPartnerAccountLink: 'नया गैराज? पार्टनर खाता बनाएं',
      goBack: '← भूमिका चयन पर वापस जाएं',
      verifyLaunchPartner: 'सत्यापित करें और खाता शुरू करें 🔓',
      onlineStatus: '● ऑनलाइन एवं सक्रिय',
      offlineStatus: '○ ऑफ़लाइन मोड',
      offlineNotice: 'आप ऑफ़लाइन हैं। अनुरोध स्वीकार करने के लिए ऑन करें।',
      alertReceivedTitle: '🚨 आपातकालीन SOS अनुरोध प्राप्त हुआ',
      driverNameLabel: 'चालक:',
      issueLogsLabel: 'समस्या:',
      travelLabel: 'दूरी',
      bonusLabel: 'राशि',
      arrivalOtpPlace: 'ड्राइवर का 4-अंकीय अराइवल OTP दर्ज करें',
      verifyArrivalBtn: 'अराइवल OTP सत्यापित करें',
      addPartHeading: 'स्पेयर पार्ट्स / श्रम लागत जोड़ें',
      partNamePlace: 'पार्ट का नाम / विवरण',
      uploadPartImg: '📷 पार्ट का फोटो लें',
      aiFetchBtn: 'पार्ट जोड़ें',
      partnerOtpInputLabel: 'ड्राइवर का सर्विस क्लोजर OTP दर्ज करें:',
      partnerOtpPlaceholder: '4-अंकीय कोड',
      partnerVerifyActionBtn: 'कार्य पूर्ण और भुगतान करें ✔️',
      rejectClearText: 'अस्वीकार / साफ़ करें',
      waitingRequests: 'आस-पास के लाइव SOS अनुरोधों की प्रतीक्षा की जा रही है...',
      logoutWorkstation: 'पार्टनर पोर्टल से बाहर निकलें 🛑',
      configureReq: 'आपातकालीन अनुरोध दर्ज करें',
      vehicleType: 'वाहन श्रेणी चुनें:',
      bikeOption: '🏍️ बाइक',
      carOption: '🚗 कार',
      autoOption: '🛺 ऑटो',
      otherCustomText: '🚚 अन्य',
      problemType: 'समस्या का प्रकार चुनें:',
      customDescTitle: 'अतिरिक्त नोट्स / वॉयस संदेश:',
      customMsgPlaceholder: 'उदा. हाईवे के पास इंजन अचानक बंद हो गया',
      tipMessage: '💡 सुझाव: असुरक्षित स्थानों में वाहन के अंदर रहें।',
      broadcastBtn: 'SOS अलर्ट प्रसारित करें 📢',
      cancelText: 'रद्द करें और वापस जाएं',
      srvFeedbackTitle: 'सेवा अनुभव को रेट करें',
      srvFeedbackDesc: 'कृपया मैकेनिक की गति और मरम्मत गुणवत्ता का मूल्यांकन करें।',
      srvFeedbackPlace: 'अपना अनुभव लिखें (वैकल्पिक)...',
      submitStarRating: 'रेटिंग सबमिट करें',
      liveChatTitle: 'लाइव सहायता चैट',
      chatInputPlace: 'संदेश टाइप करें...',
      sendText: 'भेजें',
      closeRoomText: 'चैट बंद करें',
      successLabel: 'सफलता',
      errorLabel: 'त्रुटि',
      srvSuccessMsg: 'सेवा सफलतापूर्वक पूर्ण कर दी गई है!',
      incorrectCodeMsg: 'गलत क्लोजर कोड!',
    }
  }), []);

  const dynamicProblemsList = useMemo(() => {
    if (lang === 'hi') {
      return [
        { label: 'इंजन चालू नहीं हो रहा / बैटरी समस्या', value: 'Engine Issue' },
        { label: 'ब्रेक फेलियर / फ्लूइड लीक', value: 'Brake Issue' },
        { label: 'ओवरहीटिंग / धुआँ निकलना', value: 'Overheating' },
        { label: 'क्लच / गियर खराबी', value: 'Gear Issue' }
      ];
    }
    return [
      { label: 'Engine Not Starting / Battery Issue', value: 'Engine Issue' },
      { label: 'Brake Failure / Fluid Leak', value: 'Brake Issue' },
      { label: 'Overheating / Smoke', value: 'Overheating' },
      { label: 'Clutch / Gear Transmission Breakdown', value: 'Gear Issue' }
    ];
  }, [lang]);

  // Distance Calculation Helper
  const calculateDistanceKm = (coords1: LocationCoords, coords2: LocationCoords): number => {
    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371; 
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(coords1.latitude)) * Math.cos(toRad(coords2.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const checkSession = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user_session');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserName(parsed.name || 'Driver'); setUserPhone(parsed.phone); setUserAvatar(parsed.avatar || null);
        setUserLoggedIn(true); setAuthSelection('USER');
      }
      const savedPartner = await AsyncStorage.getItem('partner_session');
      if (savedPartner) {
        const parsed = JSON.parse(savedPartner);
        setPartnerPhone(parsed.phone); setPartnerName(parsed.name);
        setShopName(parsed.shopName); setShopAddress(parsed.shopAddress || ''); setPartnerAvatar(parsed.avatar || null);
        setPartnerLoggedIn(true); setAuthSelection('PARTNER');
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  const getUserLocation = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    try {
      let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude });
    } catch (e) {
      let lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) setLocation({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude });
    }
  }, []);

  // Socket Listener
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('https://vehiclehelp-backend.onrender.com', { 
        transports: ['websocket', 'polling'], 
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });
    }

    const currentSocket = socketRef.current;

    const handleNewSOS = (data: any) => {
      const dist = data.latitude && location ? calculateDistanceKm(location, { latitude: data.latitude, longitude: data.longitude }) : 4.5;
      const fare = dist * RATE_PER_KM;

      setIncomingSOS({ ...data, calculatedDist: dist, calculatedFare: fare });
      setJobStatus('assigned');
      setDistanceKm(dist);
      setTravelFare(fare);
      Alert.alert(dictionary[lang].alertReceivedTitle, `${data.userName} - ${dist} KM (Fare: ₹${fare})`);
    };

    currentSocket.off("NEW_SOS_REQUEST");
    currentSocket.on("NEW_SOS_REQUEST", handleNewSOS);

    checkSession(); 
    getUserLocation(); 

    return () => { 
      if (currentSocket) {
        currentSocket.off("NEW_SOS_REQUEST", handleNewSOS);
      }
    };
  }, [checkSession, getUserLocation]);

  useEffect(() => {
    const spareTotal = billingItems.reduce((sum, item) => sum + item.price, 0);
    setTotalBillAmount(travelFare + spareTotal);
  }, [travelFare, billingItems]);

  const pickImage = async (type: 'USER' | 'PARTNER') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      if (type === 'USER') setUserAvatar(result.assets[0].uri);
      else setPartnerAvatar(result.assets[0].uri);
    }
  };

  const triggerCameraForPart = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setNewPartImage(result.assets[0].uri);
    }
  };

  const fetchLiveCurrentShopAddress = async () => {
    setFetchingAddress(true);
    if (location) {
      try {
        let reverseGps = await Location.reverseGeocodeAsync(location);
        if (reverseGps.length > 0) {
          const item = reverseGps[0];
          setShopAddress(`${item.name || ''} ${item.street || ''}, ${item.city || ''}`);
        }
      } catch (e) {}
    }
    setFetchingAddress(false);
  };

  const handlePartnerSubmitRegistration = async () => {
    if (!partnerPhone || (isRegistering && (!shopName || !partnerName))) {
      Alert.alert(dictionary[lang].errorLabel, lang === 'hi' ? "कृपया सभी आवश्यक विवरण भरें।" : "Please fill in all mandatory details.");
      return;
    }
    const payload = {
      phone: partnerPhone,
      name: partnerName || "Mechanic Owner",
      shopName: shopName || "Chauhan Workshop",
      shopAddress: shopAddress,
      serviceType: serviceType,
      avatar: partnerAvatar,
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0
    };
    try {
      await axios.post(`${API_BASE_URL}/partners/register`, payload);
    } catch (e) {}
    await AsyncStorage.setItem('partner_session', JSON.stringify(payload));
    setPartnerLoggedIn(true);
  };

  const triggerVoiceDictation = () => {
    if (isListening) {
      Voice.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      Voice.start(lang === 'hi' ? 'hi-IN' : 'en-US');
    }
  };

  const handleSOSBroadcast = async () => {
    if (!location) return;
    setModalVisible(false);
    let finalDescription = `[${activeService}] Vehicle: ${selectedVehicle.toUpperCase()}. ${customDescription}`;

    const simulatedMechCoords = { latitude: location.latitude + 0.012, longitude: location.longitude + 0.011 };
    const calculatedKm = calculateDistanceKm(location, simulatedMechCoords);
    const calculatedFare = calculatedKm * RATE_PER_KM;

    setDistanceKm(calculatedKm);
    setTravelFare(calculatedFare);

    try {
      const payload = {
        userName: userName || "Driver Identity", 
        userMobile: userPhone, 
        serviceType: activeService,         
        vehicleType: selectedVehicle,      
        description: finalDescription,      
        latitude: location.latitude, 
        longitude: location.longitude,
        distanceKm: calculatedKm,
        travelFare: calculatedFare
      };
      await axios.post(`${API_BASE_URL}/bookings/create`, payload);
      
      setTimeout(() => {
        setTrackingRequest({ partnerName: "Chauhan Garage", shopName: "Nilesh Hub", rating: "4.8 ⭐" });
        setJobStatus('assigned');
      }, 1000);
    } catch (error) {
      setTrackingRequest({ partnerName: "Chauhan Garage", shopName: "Nilesh Hub", rating: "4.8 ⭐" });
      setJobStatus('assigned');
    }
  };

  const handleVerifyArrivalOtp = () => {
    if (partnerArrivalOtpInput === arrivalOTP) {
      setJobStatus('inprogress');
      Alert.alert(dictionary[lang].successLabel, lang === 'hi' ? "आगमन सत्यापित! कार्य शुरू हुआ।" : "Arrival verified! Job started.");
    } else {
      Alert.alert(dictionary[lang].errorLabel, lang === 'hi' ? "अमान्य अराइवल OTP" : "Invalid arrival OTP.");
    }
  };

  const handleMechanicAddItem = () => {
    if (!newPartName) return;
    const newItem: SpareItem = {
      id: Date.now().toString(),
      name: newPartName,
      price: 250, 
      imageUri: newPartImage
    };
    setBillingItems(prev => [...prev, newItem]);
    setNewPartName('');
    setNewPartImage(null);
  };

  const handleVerifyClosureOtpAndClose = () => {
    if (partnerClosureOtpInput === serviceClosureOTP) {
      setJobStatus('completed');
      Alert.alert(dictionary[lang].successLabel, dictionary[lang].srvSuccessMsg);
      setIncomingSOS(null);
    } else {
      Alert.alert(dictionary[lang].errorLabel, dictionary[lang].incorrectCodeMsg);
    }
  };

  const submitDriverRating = () => {
    setRatingModalVisible(false);
    setTrackingRequest(null);
    Alert.alert(dictionary[lang].successLabel, lang === 'hi' ? "प्रतिक्रिया सफलतापूर्वक सबमिट की गई!" : "Feedback submitted successfully!");
  };

  const handleSendChatMessage = () => {
    if (!typedMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: authSelection === 'USER' ? 'user' : 'partner',
      text: typedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setTypedMessage('');
  };

  const handleSystemLogout = async () => {
    await AsyncStorage.clear();
    setUserLoggedIn(false);
    setPartnerLoggedIn(false);
    setAuthSelection('NONE');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* APP TOP NAVIGATION BAR */}
      <View style={styles.appTopNavBar}>
        <View>
          <Text style={styles.appLogoMainBrand}>{dictionary[lang].appName}</Text>
          <Text style={styles.topBarWelcomeSubtitle}>{dictionary[lang].tagline}</Text>
        </View>
        <TouchableOpacity style={styles.langSquareUnit} onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{lang === 'en' ? 'हिन्दी' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      {/* SELECTION LANDING SCREEN */}
      {authSelection === 'NONE' && (
        <View style={styles.landingWrapperCenter}>
          <Text style={styles.landingMainHeaderBrand}>{dictionary[lang].selectModeHeader}</Text>
          <Text style={styles.landingSubheadingBrand}>{dictionary[lang].selectModeSubtitle}</Text>
          
          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#2563EB' }]} onPress={() => setAuthSelection('USER')}>
            <Text style={styles.landingBigBtnIcon}>🚗 </Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.landingBigBtnTitle}>{dictionary[lang].driverPortalTitle}</Text>
              <Text style={styles.landingBigBtnDesc}>{dictionary[lang].driverPortalDesc}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#0F172A', marginTop: 16 }]} onPress={() => setAuthSelection('PARTNER')}>
            <Text style={styles.landingBigBtnIcon}>🛠️ </Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.landingBigBtnTitle}>{dictionary[lang].partnerPortalTitle}</Text>
              <Text style={styles.landingBigBtnDesc}>{dictionary[lang].partnerPortalDesc}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* DRIVER / USER WORKFLOW */}
      {authSelection === 'USER' && (
        !userLoggedIn ? (
          <View style={styles.authWrapperCenter}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{dictionary[lang].driverLoginHeader}</Text>
              <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].driverNamePlace} value={userName} onChangeText={setUserName} placeholderTextColor="#94A3B8" />
              <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].mobilePlace} keyboardType="phone-pad" value={userPhone} onChangeText={setUserPhone} placeholderTextColor="#94A3B8" />
              <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#2563EB' }]} onPress={() => { setUserLoggedIn(true); AsyncStorage.setItem('user_session', JSON.stringify({ name: userName, phone: userPhone })); }}>
                <Text style={styles.authBtnTextString}>{dictionary[lang].enterDriverDash}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setAuthSelection('NONE')}>
                <Text style={{ textAlign: 'center', color: '#64748B' }}>{dictionary[lang].goBack}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }}>
              {/* MAP CANVAS */}
              <View style={styles.mapCanvasContainerFrame}>
                <MapView
                  ref={mapRef}
                  style={{ width: '100%', height: '100%' }}
                  initialRegion={{
                    latitude: location ? location.latitude : 28.6139,
                    longitude: location ? location.longitude : 77.2090,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {location && <Marker coordinate={location} title={dictionary[lang].yourLocation} description={dictionary[lang].emergencyPoint} />}
                </MapView>
              </View>

              {/* SERVICES GRID */}
              <View style={{ padding: 16 }}>
                <Text style={styles.servicesGridTitle}>{dictionary[lang].selectServiceHeader}</Text>
                <View style={styles.servicesGridFlexibleRow}>
                  <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Mechanic'); setModalVisible(true); }}>
                    <Text style={{ fontSize: 24 }}>🛠️</Text>
                    <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].mechanicService}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Puncture'); setModalVisible(true); }}>
                    <Text style={{ fontSize: 24 }}>🛞</Text>
                    <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].punctureService}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Fuel'); setModalVisible(true); }}>
                    <Text style={{ fontSize: 24 }}>⛽</Text>
                    <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].fuelService}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* LIVE TRACKING PANEL */}
              {trackingRequest && (
                <View style={styles.trackingDashboardContainer}>
                  <View style={styles.trackingHeaderFlexRow}>
                    <View>
                      <Text style={styles.trackingPartnerNameMainTitle}>{trackingRequest.partnerName}</Text>
                      <Text style={styles.trackingPartnerShopSubtitle}>{trackingRequest.shopName} • {trackingRequest.rating}</Text>
                    </View>
                    <View style={styles.etaDisplayBadgeFrame}>
                      <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].etaText}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{dictionary[lang].totalPayable}</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#DC2626' }}>₹{totalBillAmount}</Text>
                  </View>

                  <View style={styles.otpSecureClosureDisplayCard}>
                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#1E293B' }}>{dictionary[lang].closeCodeLabel}</Text>
                    <Text style={styles.otpClosureCodeString}>{serviceClosureOTP}</Text>
                    <Text style={styles.otpClosureNoticeSubtext}>{dictionary[lang].closeCodeNote}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', marginTop: 12 }}>
                    <TouchableOpacity style={styles.chatRoomTriggerBtn} onPress={() => setChatModalVisible(true)}>
                      <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 13 }}>{dictionary[lang].chatBtnText}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.completeRatingTriggerBtn} onPress={() => setRatingModalVisible(true)}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{dictionary[lang].completeRateBtn}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <TouchableOpacity style={styles.accountLogoutActionBtn} onPress={handleSystemLogout}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{dictionary[lang].logoutText}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )
      )}

      {/* PARTNER WORKFLOW */}
      {authSelection === 'PARTNER' && (
        !partnerLoggedIn ? (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{isRegistering ? dictionary[lang].shopReg : dictionary[lang].partnerQuick}</Text>
              
              {isRegistering && (
                <>
                  <TouchableOpacity style={{ alignItems: 'center', marginBottom: 12 }} onPress={() => pickImage('PARTNER')}>
                    {partnerAvatar ? (
                      <Image source={{ uri: partnerAvatar }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                    ) : (
                      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>{dictionary[lang].uploadPhotoText}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].ownerName}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].ownerNamePlace} value={partnerName} onChangeText={setPartnerName} placeholderTextColor="#94A3B8" />

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].garageNameLabel}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].shopNamePlace} value={shopName} onChangeText={setShopName} placeholderTextColor="#94A3B8" />

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].categoryTypeLabel}</Text>
                  <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                    <Picker selectedValue={serviceType} onValueChange={(itemValue) => setServiceType(itemValue)}>
                      <Picker.Item label={dictionary[lang].generalMechanicLabel} value="Mechanic" />
                      <Picker.Item label={dictionary[lang].punctureFixingLabel} value="Puncture" />
                      <Picker.Item label={dictionary[lang].emergencyFuelLabel} value="Fuel" />
                    </Picker>
                  </View>

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].shopLocationLabel}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].storeAddressPlace} value={shopAddress} onChangeText={setShopAddress} placeholderTextColor="#94A3B8" />
                  <TouchableOpacity style={{ marginBottom: 12 }} onPress={fetchLiveCurrentShopAddress}>
                    <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].fetchLocationBtn}</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>Mobile Number:</Text>
              <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].phonePlaceholder} keyboardType="phone-pad" value={partnerPhone} onChangeText={setPartnerPhone} placeholderTextColor="#94A3B8" />

              <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#0F172A' }]} onPress={handlePartnerSubmitRegistration}>
                <Text style={styles.authBtnTextString}>{dictionary[lang].verifyLaunchPartner}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setIsRegistering(!isRegistering)}>
                <Text style={{ textAlign: 'center', color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>
                  {isRegistering ? dictionary[lang].alreadyRegUser : dictionary[lang].createPartnerAccountLink}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setAuthSelection('NONE')}>
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12 }}>{dictionary[lang].goBack}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12 }}>
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{shopName || "Chauhan Workshop"}</Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>{partnerName || "Mechanic Partner"}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8, fontWeight: 'bold', fontSize: 12, color: isPartnerOnline ? '#16A34A' : '#DC2626' }}>
                  {isPartnerOnline ? dictionary[lang].onlineStatus : dictionary[lang].offlineStatus}
                </Text>
                <Switch value={isPartnerOnline} onValueChange={setIsPartnerOnline} />
              </View>
            </View>

            {!isPartnerOnline && (
              <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ color: '#DC2626', textAlign: 'center', fontSize: 12 }}>{dictionary[lang].offlineNotice}</Text>
              </View>
            )}

            {incomingSOS ? (
              <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#DC2626' }}>
                <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{dictionary[lang].alertReceivedTitle}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].driverNameLabel}</Text> {incomingSOS.userName}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].issueLogsLabel}</Text> {incomingSOS.description}</Text>
                <Text style={{ fontSize: 14, marginBottom: 12 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].travelLabel}:</Text> {incomingSOS.calculatedDist} KM | <Text style={{ fontWeight: 'bold' }}>{dictionary[lang].bonusLabel}:</Text> ₹{incomingSOS.calculatedFare}</Text>

                {jobStatus === 'assigned' && (
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <TextInput 
                      style={styles.appFormInputBox} 
                      placeholder={dictionary[lang].arrivalOtpPlace} 
                      keyboardType="numeric" 
                      value={partnerArrivalOtpInput} 
                      onChangeText={setPartnerArrivalOtpInput} 
                    />
                    <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={handleVerifyArrivalOtp}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].verifyArrivalBtn}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {jobStatus === 'inprogress' && (
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>{dictionary[lang].addPartHeading}</Text>
                    <TextInput 
                      style={styles.appFormInputBox} 
                      placeholder={dictionary[lang].partNamePlace} 
                      value={newPartName} 
                      onChangeText={setNewPartName} 
                    />
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <TouchableOpacity style={{ backgroundColor: '#64748B', padding: 8, borderRadius: 6, marginRight: 8 }} onPress={triggerCameraForPart}>
                        <Text style={{ color: '#FFF', fontSize: 11 }}>{dictionary[lang].uploadPartImg}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#16A34A', padding: 8, borderRadius: 6 }} onPress={handleMechanicAddItem}>
                        <Text style={{ color: '#FFF', fontSize: 11 }}>{dictionary[lang].aiFetchBtn}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontWeight: 'bold', marginTop: 8, fontSize: 12 }}>{dictionary[lang].partnerOtpInputLabel}</Text>
                    <TextInput 
                      style={styles.appFormInputBox} 
                      placeholder={dictionary[lang].partnerOtpPlaceholder} 
                      keyboardType="numeric" 
                      value={partnerClosureOtpInput} 
                      onChangeText={setPartnerClosureOtpInput} 
                    />
                    <TouchableOpacity style={{ backgroundColor: '#16A34A', padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={handleVerifyClosureOtpAndClose}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].partnerVerifyActionBtn}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={{ backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => setIncomingSOS(null)}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].rejectClearText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12 }}>{dictionary[lang].waitingRequests}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.accountLogoutActionBtn, { marginTop: 20 }]} onPress={handleSystemLogout}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{dictionary[lang].logoutWorkstation}</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* SOS REQUEST CONFIGURATION MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>{dictionary[lang].configureReq}</Text>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].vehicleType}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              {['bike', 'car', 'auto', 'other'].map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={{ padding: 8, borderRadius: 6, backgroundColor: selectedVehicle === type ? '#2563EB' : '#F1F5F9' }} 
                  onPress={() => setSelectedVehicle(type)}
                >
                  <Text style={{ color: selectedVehicle === type ? '#FFF' : '#1E293B', fontSize: 11, fontWeight: 'bold' }}>
                    {type === 'bike' ? dictionary[lang].bikeOption : type === 'car' ? dictionary[lang].carOption : type === 'auto' ? dictionary[lang].autoOption : dictionary[lang].otherCustomText}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].problemType}</Text>
            <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
              <Picker selectedValue={selectedProblem} onValueChange={(itemValue) => setSelectedProblem(itemValue)}>
                {dynamicProblemsList.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].customDescTitle}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput 
                style={[styles.appFormInputBox, { flex: 1, marginBottom: 0 }]} 
                placeholder={dictionary[lang].customMsgPlaceholder} 
                value={customDescription} 
                onChangeText={setCustomDescription} 
              />
              <TouchableOpacity style={{ padding: 8, backgroundColor: isListening ? '#EF4444' : '#2563EB', borderRadius: 8, marginLeft: 8 }} onPress={triggerVoiceDictation}>
                <Text style={{ color: '#FFF' }}>🎙️</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 12 }}>{dictionary[lang].tipMessage}</Text>

            <TouchableOpacity style={{ backgroundColor: '#DC2626', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }} onPress={handleSOSBroadcast}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{dictionary[lang].broadcastBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: 8, alignItems: 'center' }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#64748B' }}>{dictionary[lang].cancelText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RATING MODAL */}
      <Modal visible={ratingModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{dictionary[lang].srvFeedbackTitle}</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>{dictionary[lang].srvFeedbackDesc}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedStars(star)}>
                  <Text style={{ fontSize: 28, marginHorizontal: 4 }}>{star <= selectedStars ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={[styles.appFormInputBox, { height: 60 }]} 
              placeholder={dictionary[lang].srvFeedbackPlace} 
              multiline={true} 
              value={reviewText} 
              onChangeText={setReviewText} 
            />

            <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={submitDriverRating}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{dictionary[lang].submitStarRating}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHAT MODAL */}
      <Modal visible={chatModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardContainer, { height: 400 }]}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{dictionary[lang].liveChatTitle}</Text>
            
            <ScrollView style={{ flex: 1, marginBottom: 8 }}>
              {chatMessages.map((msg) => (
                <View key={msg.id} style={{ alignSelf: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#2563EB' : '#E2E8F0', padding: 8, borderRadius: 8, marginBottom: 4, maxWidth: '80%' }}>
                  <Text style={{ color: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#FFF' : '#1E293B', fontSize: 12 }}>{msg.text}</Text>
                  <Text style={{ color: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#E2E8F0' : '#64748B', fontSize: 9, textAlign: 'right' }}>{msg.timestamp}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                style={[styles.appFormInputBox, { flex: 1, marginBottom: 0 }]} 
                placeholder={dictionary[lang].chatInputPlace} 
                value={typedMessage} 
                onChangeText={setTypedMessage} 
              />
              <TouchableOpacity style={{ backgroundColor: '#2563EB', padding: 10, borderRadius: 8, marginLeft: 8 }} onPress={handleSendChatMessage}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{dictionary[lang].sendText}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ marginTop: 8, alignItems: 'center' }} onPress={() => setChatModalVisible(false)}>
              <Text style={{ color: '#64748B', fontSize: 12 }}>{dictionary[lang].closeRoomText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Global Export Declaration for Expo Router

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appTopNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 },
  appLogoMainBrand: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  topBarWelcomeSubtitle: { color: '#94A3B8', fontSize: 11 },
  langSquareUnit: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  landingWrapperCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  landingMainHeaderBrand: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  landingSubheadingBrand: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  landingBigSelectionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  landingBigBtnIcon: { fontSize: 28 },
  landingBigBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  landingBigBtnDesc: { color: '#94A3B8', fontSize: 11 },
  authWrapperCenter: { flex: 1, justifyContent: 'center', padding: 20 },
  authDisplayCardFrame: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2 },
  authCardHeaderLabel: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  appFormInputBox: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, backgroundColor: '#FFF' },
  authSubmissionActionBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  authBtnTextString: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  mapCanvasContainerFrame: { width: '100%', height: 250, backgroundColor: '#E2E8F0' },
  servicesGridTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  servicesGridFlexibleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  serviceSquareUnitBtn: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  serviceUnitTextLabel: { fontSize: 11, fontWeight: 'bold', marginTop: 4, textAlign: 'center', color: '#1E293B' },
  trackingDashboardContainer: { backgroundColor: '#FFF', margin: 16, padding: 12, borderRadius: 12, elevation: 2 },
  trackingHeaderFlexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  trackingPartnerNameMainTitle: { fontWeight: 'bold', fontSize: 15, color: '#0F172A' },
  trackingPartnerShopSubtitle: { color: '#64748B', fontSize: 11 },
  etaDisplayBadgeFrame: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  otpSecureClosureDisplayCard: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  otpClosureCodeString: { fontSize: 18, fontWeight: 'bold', color: '#D97706', letterSpacing: 2 },
  otpClosureNoticeSubtext: { fontSize: 9, color: '#92400E', textAlign: 'center' },
  chatRoomTriggerBtn: { flex: 1, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 6, alignItems: 'center', marginRight: 4 },
  completeRatingTriggerBtn: { flex: 1, backgroundColor: '#16A34A', padding: 8, borderRadius: 6, alignItems: 'center', marginLeft: 4 },
  accountLogoutActionBtn: { margin: 16, padding: 10, alignItems: 'center' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCardContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 5 },
});