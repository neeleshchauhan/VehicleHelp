import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';

export default function App() {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [authSelection, setAuthSelection] = useState<'NONE' | 'USER' | 'PARTNER'>('NONE');
  
  // User States
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  // Partner/Mechanic States
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [serviceType, setServiceType] = useState('Mechanic');
  const [shopAddress, setShopAddress] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [partnerLoggedIn, setPartnerLoggedIn] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(true);

  // Shared Auth & Service States
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Modals & Active Service States
  const [modalVisible, setModalVisible] = useState(false);
  const [activeService, setActiveService] = useState<'Mechanic' | 'Puncture' | 'Fuel'>('Mechanic');
  const [selectedVehicle, setSelectedVehicle] = useState('bike');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Tracking & Live Interactions
  const [incomingSOS, setIncomingSOS] = useState<any>(null);
  const [trackingRequest, setTrackingRequest] = useState<any>(null);
  const [totalBillAmount, setTotalBillAmount] = useState('350');
  const [serviceClosureOTP] = useState('4892');
  
  // Chat & Rating Modals
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [userFeedbackText, setUserFeedbackText] = useState('');

  const socketRef = useRef<Socket | null>(null);

  // Dictionary for Bilingual Support (English & Hindi)
  const dictionary = {
    en: {
      appTitle: 'VehicleHelp 🚗',
      welcomeSub: 'Instant Roadside Assistance',
      landingSelectProfile: 'Select your role to continue',
      userRoleBtn: 'Driver ',
      userDesc: 'Get mechanic, puncture or fuel help',
      partnerRoleBtn: 'Partners',
      partnerDesc: 'Accept breakdown requests & earn',
      loginTitle: 'Driver Authentication',
      phoneLabel: 'Mobile Number',
      phonePlaceholder: 'Enter 10-digit number',
      nameLabel: 'Full Name',
      namePlaceholder: 'Enter your name',
      newUserNotice: 'New user detected! Please register.',
      existingUserNotice: 'Welcome back,',
      continueBtn: 'Request OTP',
      otpSentNotice: 'OTP sent successfully to',
      otpPlaceholder: 'Enter 6-digit OTP',
      verifyOtpBtn: 'Verify & Login',
      editPhone: 'Edit Phone Number',
      goBack: '← Back to Role Selection',
      helloUser: 'Hello Driver,',
      helloPartner: 'Hello Partner,',
      yourLocation: 'Your Current Location',
      selectServiceHeader: 'Select Breakdown Service',
      mechanicService: 'Mechanic',
      punctureService: 'Puncture',
      fuelService: 'Fuel Delivery',
      etaText: 'ETA: ~12 mins',
      totalPayable: 'Estimated Service Charge',
      closeCodeLabel: 'Secure Closure Code',
      closeCodeNote: 'Share this code with mechanic only after work is complete.',
      chatBtnText: '💬 Live Chat',
      completeRateBtn: '⭐ Complete & Rate',
      logoutText: 'Logout Account',
      logoutWorkstation: 'Logout Workstation',
      shopReg: 'Workshop Registration',
      partnerQuick: 'Partner Quick Login',
      addPhotoBtn: 'Add Photo',
      uploadPhotoText: 'Upload Workshop / Profile Image',
      ownerName: 'Owner Name',
      ownerNamePlace: 'Enter owner full name',
      garageNameLabel: 'Workshop / Garage Name',
      shopNamePlace: 'Enter garage title',
      categoryTypeLabel: 'Primary Service Specialization',
      generalMechanicLabel: 'General Mechanic',
      punctureFixingLabel: 'Puncture & Tyres',
      emergencyFuelLabel: 'Emergency Fuel',
      shopLocationLabel: 'Workshop Address',
      storeAddressPlace: 'Enter complete address or fetch live',
      fetchLocationBtn: '📍 Fetch Current GPS Location',
      verifyLaunchPartner: 'Send Verification OTP',
      alreadyRegUser: 'Already registered? Login here',
      createPartnerAccountLink: 'New Partner? Register Workshop',
      onlineStatus: 'ONLINE (Ready)',
      offlineStatus: 'OFFLINE (Busy)',
      alertReceivedTitle: '🚨 Emergency Breakdown Request!',
      driverNameLabel: 'Driver:',
      serviceLabel: 'Service:',
      issueLogsLabel: 'Issue:',
      travelLabel: 'Distance',
      bonusLabel: 'Est. Fare',
      acceptSOSBtn: '✅ Accept Request & Navigate',
      rejectClearText: '❌ Reject / Dismiss',
      waitingRequests: 'Waiting for nearby vehicle breakdown alerts...',
      offlineNotice: 'You are currently offline. Go online to receive requests.',
      mechReqTitle: '🛠️ Mechanic Assistance Request',
      puncReqTitle: '🛞 Puncture Repair Request',
      fuelReqTitle: '⛽ Emergency Fuel Request',
      vehicleType: 'Select Vehicle Type',
      bikeOption: ' 🏍️Bike ',
      carOption: ' 🚗Car',
      autoOption: '🛺Auto',
      otherCustomText: 'Other',
      problemType: 'Select Specific Problem',
      customDescTitle: 'Additional Problem Description (Optional)',
      customMsgPlaceholder: 'E.g., Chain broke down near highway...',
      broadcastBtn: '🚨 Broadcast SOS Request Now',
      cancelText: 'Cancel',
      srvFeedbackTitle: 'Service Feedback & Rating',
      srvFeedbackDesc: 'How was your experience with the mechanic partner?',
      srvFeedbackPlace: 'Write your feedback here...',
      submitStarRating: 'Submit Feedback & Finish',
      liveChatTitle: 'Live Assistance Chat',
      chatInputPlace: 'Type a message...',
      sendText: 'Send',
      closeRoomText: 'Close Chat'
    },
    hi: {
      appTitle: 'VehicleHelp 🚗',
      welcomeSub: 'तत्काल सड़क किनारा सहायता',
      landingSelectProfile: 'जारी रखने के लिए अपनी भूमिका चुनें',
      userRoleBtn: 'ड्राइवर / वाहन मालिक',
      userDesc: 'मैकेनिक, पंचर या ईंधन सहायता प्राप्त करें',
      partnerRoleBtn: 'मैकेनिक / वर्कशॉप पार्टनर',
      partnerDesc: 'ब्रेकडाउन अनुरोध स्वीकार करें और कमाएं',
      loginTitle: 'ड्राइवर प्रमाणीकरण',
      phoneLabel: 'मोबाइल नंबर',
      phonePlaceholder: '10 अंकों का नंबर दर्ज करें',
      nameLabel: 'पूरा नाम',
      namePlaceholder: 'अपना नाम दर्ज करें',
      newUserNotice: 'नया उपयोगकर्ता! कृपया पंजीकरण करें।',
      existingUserNotice: 'वापसी पर स्वागत है,',
      continueBtn: 'OTP अनुरोध करें',
      otpSentNotice: 'सफलतापूर्वक OTP भेजा गया',
      otpPlaceholder: '6 अंकों का OTP दर्ज करें',
      verifyOtpBtn: 'सत्यापित करें और लॉगिन करें',
      editPhone: 'फ़ोन नंबर बदलें',
      goBack: '← भूमिका चयन पर वापस जाएं',
      helloUser: 'नमस्ते ड्राइवर,',
      helloPartner: 'नमस्ते पार्टनर,',
      yourLocation: 'आपकी वर्तमान स्थिति',
      selectServiceHeader: 'ब्रेकडाउन सेवा चुनें',
      mechanicService: 'मैकेनिक',
      punctureService: 'पंचर',
      fuelService: 'ईंधन डिलीवरी',
      etaText: 'ETA: ~12 मिनिट',
      totalPayable: 'अनुमानित सेवा शुल्क',
      closeCodeLabel: 'सुरक्षित समापन कोड',
      closeCodeNote: 'काम पूरा होने के बाद ही इस कोड को मैकेनिक के साथ साझा करें।',
      chatBtnText: '💬 लाइव चैट',
      completeRateBtn: '⭐ पूर्ण और रेट करें',
      logoutText: 'खाता लॉगआउट करें',
      logoutWorkstation: 'वर्कस्टेशन लॉगआउट करें',
      shopReg: 'वर्कशॉप पंजीकरण',
      partnerQuick: 'पार्टनर त्वरित लॉगिन',
      addPhotoBtn: 'फोटो जोड़ें',
      uploadPhotoText: 'वर्कशॉप / प्रोफाइल इमेज अपलोड करें',
      ownerName: 'मालिक का नाम',
      ownerNamePlace: 'मालिक का पूरा नाम दर्ज करें',
      garageNameLabel: 'वर्कशॉप / गैराज का नाम',
      shopNamePlace: 'गैराज का शीर्षक दर्ज करें',
      categoryTypeLabel: 'प्राथमिक सेवा विशेषज्ञता',
      generalMechanicLabel: 'सामान्य मैकेनिक',
      punctureFixingLabel: 'पंचर और टायर',
      emergencyFuelLabel: 'आपातकालीन ईंधन',
      shopLocationLabel: 'वर्कशॉप का पता',
      storeAddressPlace: 'पूरा पता दर्ज करें या GPS से प्राप्त करें',
      fetchLocationBtn: '📍 वर्तमान GPS लोकेशन प्राप्त करें',
      verifyLaunchPartner: 'सत्यापन OTP भेजें',
      alreadyRegUser: 'पहले से पंजीकृत हैं? यहाँ लॉगिन करें',
      createPartnerAccountLink: 'नया पार्टनर? वर्कशॉप रजिस्टर करें',
      onlineStatus: 'ऑनलाइन (तैयार)',
      offlineStatus: 'ऑफ़लाइन (व्यस्त)',
      alertReceivedTitle: '🚨 आपातकालीन ब्रेकडाउन अनुरोध!',
      driverNameLabel: 'ड्राइवर:',
      serviceLabel: 'सेवा:',
      issueLogsLabel: 'समस्या:',
      travelLabel: 'दूरी',
      bonusLabel: 'अनुमानित किराया',
      acceptSOSBtn: '✅ अनुरोध स्वीकार करें और नेविगेट करें',
      rejectClearText: '❌ अस्वीकार / हटाएं',
      waitingRequests: 'आसपास के वाहन ब्रेकडाउन अलर्ट की प्रतीक्षा की जा रही है...',
      offlineNotice: 'आप वर्तमान में ऑफ़लाइन हैं। अनुरोध प्राप्त करने के लिए ऑनलाइन आएं।',
      mechReqTitle: '🛠️ मैकेनिक सहायता अनुरोध',
      puncReqTitle: '🛞 पंचर मरम्मत अनुरोध',
      fuelReqTitle: '⛽ आपातकालीन ईंधन अनुरोध',
      vehicleType: 'वाहन का प्रकार चुनें',
      bikeOption: 'बाइक्स / स्कूटर',
      carOption: 'कार',
      autoOption: 'ऑटो रिक्शा',
      otherCustomText: 'अन्य',
      problemType: 'विशिष्ट समस्या चुनें',
      customDescTitle: 'अतिरिक्त समस्या विवरण (वैकल्पिक)',
      customMsgPlaceholder: 'जैसे, हाईवे के पास चेन टूट गई है...',
      broadcastBtn: '🚨 SOS अनुरोध अभी प्रसारित करें',
      cancelText: 'रद्द करें',
      srvFeedbackTitle: 'सेवा प्रतिक्रिया और रेटिंग',
      srvFeedbackDesc: 'मैकेनिक पार्टनर के साथ आपका अनुभव कैसा रहा?',
      srvFeedbackPlace: 'अपनी प्रतिक्रिया यहाँ लिखें...',
      submitStarRating: 'प्रतिक्रिया जमा करें और समाप्त करें',
      liveChatTitle: 'लाइव सहायता चैट',
      chatInputPlace: 'संदेश टाइप करें...',
      sendText: 'भेजें',
      closeRoomText: 'चैट बंद करें'
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    })();

    // Initialize Socket connection
    socketRef.current = io('https://vehiclehelp-backend.onrender.com');

    socketRef.current.on('connect', () => {
      console.log('Connected to VehicleHelp backend server socket ID:', socketRef.current?.id);
    });

    socketRef.current.on('INCOMING_SOS_ALERT', (data) => {
      setIncomingSOS(data);
    });

    socketRef.current.on('RECEIVE_CHAT_MESSAGE', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handlePhoneChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setUserPhone(cleaned);
    if (cleaned.length === 10) {
      try {
        const dbUsersRaw = await AsyncStorage.getItem('@vh_registered_users_db');
        const dbUsers = dbUsersRaw ? JSON.parse(dbUsersRaw) : {};
        if (dbUsers[cleaned]) {
          setIsNewUser(false);
          setUserName(dbUsers[cleaned].name);
        } else {
          setIsNewUser(true);
          setUserName('');
        }
      } catch (e) {
        setIsNewUser(true);
      }
    }
  };

  const handlePartnerPhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPartnerPhone(cleaned);
  };

  const handlePickPartnerPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setPartnerAvatar(result.assets[0].uri);
    }
  };

  const getDynamicProblems = () => {
    if (activeService === 'Puncture') {
      return [
        { label: lang === 'hi' ? 'सिंगल पंचर' : 'Single Puncture', value: 'Single Puncture' },
        { label: lang === 'hi' ? 'ट्यूब बदलना है' : 'Tube Replacement', value: 'Tube Replacement' },
        { label: lang === 'hi' ? 'ट्यूबलेस टायर एयर लीक' : 'Tubeless Air Leak', value: 'Tubeless Air Leak' }
      ];
    } else if (activeService === 'Fuel') {
      return [
        { label: lang === 'hi' ? 'पेट्रोल (1 लीटर)' : 'Petrol (1 Litre)', value: 'Petrol 1L' },
        { label: lang === 'hi' ? 'डीजल (1 लीटर)' : 'Diesel (1 Litre)', value: 'Diesel 1L' }
      ];
    } else {
      return [
        { label: lang === 'hi' ? 'इंजन स्टार्ट नहीं हो रहा' : 'Engine Won\'t Start', value: 'Engine Start Issue' },
        { label: lang === 'hi' ? 'चेन / बेल्ट टूट गई' : 'Chain / Belt Broken', value: 'Chain Broken' },
        { label: lang === 'hi' ? 'बैटरी डिस्चार्ज समस्या' : 'Battery Dead', value: 'Battery Dead' },
        { label: lang === 'hi' ? 'अन्य यांत्रिक खराबी' : 'Other Mechanical Issue', value: 'General Breakdown' }
      ];
    }
  };

  const handleRequestOTP = () => {
    const targetPhone = authSelection === 'USER' ? userPhone : partnerPhone;
    if (targetPhone.length < 10) {
      Alert.alert(lang === 'hi' ? 'अमान्य नंबर ❌' : 'Invalid Number ❌', lang === 'hi' ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (authSelection === 'USER' && isNewUser && !userName.trim()) {
      Alert.alert(lang === 'hi' ? 'नाम आवश्यक है ⚠️' : 'Name Required ⚠️', lang === 'hi' ? 'पंजीकरण के लिए अपना पूरा नाम दर्ज करें।' : 'Please enter your full name to register.');
      return;
    }
    if (authSelection === 'PARTNER' && isRegistering && (!partnerName.trim() || !shopName.trim())) {
      Alert.alert(lang === 'hi' ? 'विवरण आवश्यक हैं ⚠️' : 'Details Required ⚠️', lang === 'hi' ? 'कृपया मालिक और दुकान का नाम भरें।' : 'Please fill owner and shop name.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const mockOTP = '123456';
      setGeneratedOtp(mockOTP);
      setOtpSent(true);
      setLoading(false);
      Alert.alert('🔐 Demo OTP Sent', `Use OTP: ${mockOTP} to proceed.`);
    }, 800);
  };

  const handleVerifyOTP = async () => {
    if (inputOtp !== generatedOtp && inputOtp !== '123456') {
      Alert.alert(lang === 'hi' ? 'अमान्य OTP ❌' : 'Invalid OTP ❌', lang === 'hi' ? 'कृपया सही 6 अंकों का OTP दर्ज करें।' : 'Please enter correct 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      if (authSelection === 'USER') {
        const dbUsersRaw = await AsyncStorage.getItem('@vh_registered_users_db');
        let dbUsers = dbUsersRaw ? JSON.parse(dbUsersRaw) : {};

        const finalName = isNewUser ? userName.trim() : dbUsers[userPhone]?.name || userName || 'Driver';
        dbUsers[userPhone] = { name: finalName, phone: userPhone, registeredAt: new Date().toISOString() };

        await AsyncStorage.setItem('@vh_registered_users_db', JSON.stringify(dbUsers));
        const sessionData = { name: finalName, phone: userPhone };
        await AsyncStorage.setItem('@vh_user_session', JSON.stringify(sessionData));

        setUserLoggedIn(true);
      } else {
        const payload = {
          name: partnerName || 'Partner Mechanic',
          shopName: shopName || 'Auto Workshop',
          serviceType,
          address: shopAddress,
          phone: partnerPhone,
          avatar: partnerAvatar
        };
        await AsyncStorage.setItem('@vh_partner_session', JSON.stringify(payload));
        setPartnerLoggedIn(true);
      }
      setOtpSent(false);
      setInputOtp('');
    } catch (e) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveCurrentShopAddress = async () => {
    if (location) {
      try {
        const reversed = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (reversed && reversed[0]) {
          const item = reversed[0];
          setShopAddress(`${item.name || ''}, ${item.street || ''}, ${item.city || ''}`);
        }
      } catch (e) {
        setShopAddress('Delhi NCR Workshop');
      }
    }
  };

  const handleSystemLogout = async () => {
    await AsyncStorage.removeItem('@vh_user_session');
    await AsyncStorage.removeItem('@vh_partner_session');
    setUserLoggedIn(false);
    setPartnerLoggedIn(false);
    setAuthSelection('NONE');
    setTrackingRequest(null);
    setIncomingSOS(null);
    setUserPhone('');
    setUserName('');
    setOtpSent(false);
    setInputOtp('');
  };

  const handleSOSBroadcast = () => {
    const lat = location?.coords?.latitude || 28.6139;
    const lng = location?.coords?.longitude || 77.2090;

    const payload = {
      userName,
      userPhone,
      latitude: lat,
      longitude: lng,
      service: activeService,
      vehicle: selectedVehicle,
      problem: selectedProblem || activeService,
      description: customDescription
    };

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('BROADCAST_SOS', payload);
    }
    setModalVisible(false);
    Alert.alert(
      lang === 'hi' ? 'अनुरोध भेजा गया! 🚨' : 'Request Sent! 🚨',
      lang === 'hi' ? 'निकटतम उपलब्ध मैकेनिकों की खोज की जा रही है...' : 'Searching for nearby available mechanics...'
    );
  };

  const handleAcceptSOS = () => {
    if (!incomingSOS) return;

    const acceptPayload = {
      sosId: incomingSOS.id || Date.now().toString(),
      partnerName: partnerName || 'Mechanic Partner',
      shopName: shopName || 'Auto Garage',
      partnerPhone,
      latitude: location?.coords?.latitude || 28.62,
      longitude: location?.coords?.longitude || 77.21,
    };

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('ACCEPT_SOS', acceptPayload);
    }

    setTrackingRequest(acceptPayload);
    setIncomingSOS(null);
    Alert.alert(
      lang === 'hi' ? 'अनुरोध स्वीकार किया गया! ✅' : 'SOS Accepted! ✅',
      lang === 'hi' ? 'ड्राइवर का स्थान मैप पर दिख रहा है।' : 'Driver location is now visible on map.'
    );
  };

  const handleSendChatMessage = () => {
    if (!typedMessage.trim()) return;
    const msgObj = {
      id: Date.now().toString(),
      sender: authSelection === 'USER' ? 'user' : 'partner',
      text: typedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('SEND_CHAT_MESSAGE', msgObj);
    }
    setChatMessages((prev) => [...prev, msgObj]);
    setTypedMessage('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* TOP HEADER */}
      <View style={styles.appTopNavBar}>
        <View>
          <Text style={styles.appLogoMainBrand}>{dictionary[lang].appTitle}</Text>
          <Text style={styles.topBarWelcomeSubtitle}>
            {userLoggedIn 
              ? `${dictionary[lang].helloUser} ${userName}` 
              : partnerLoggedIn 
                ? `${dictionary[lang].helloPartner} ${partnerName}` 
                : dictionary[lang].welcomeSub}
          </Text>
        </View>
        <TouchableOpacity style={styles.langSquareUnit} onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>🌐 {lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* LANDING SCREEN */}
      {authSelection === 'NONE' && (
        <View style={styles.landingWrapperCenter}>
          <Text style={styles.landingMainHeaderBrand}>{dictionary[lang].appTitle}</Text>
          <Text style={styles.landingSubheadingBrand}>{dictionary[lang].landingSelectProfile}</Text>

          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#2563EB', marginBottom: 16 }]} onPress={() => setAuthSelection('USER')}>
            <Text style={styles.landingBigBtnIcon}>🚗 </Text>
            <View>
              <Text style={styles.landingBigBtnTitle}>{dictionary[lang].userRoleBtn}</Text>
              <Text style={styles.landingBigBtnDesc}>{dictionary[lang].userDesc}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#0F172A' }]} onPress={() => setAuthSelection('PARTNER')}>
            <Text style={styles.landingBigBtnIcon}>🛠️ </Text>
            <View>
              <Text style={styles.landingBigBtnTitle}>{dictionary[lang].partnerRoleBtn}</Text>
              <Text style={styles.landingBigBtnDesc}>{dictionary[lang].partnerDesc}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* DRIVER AUTH & DASHBOARD */}
      {authSelection === 'USER' && (
        !userLoggedIn ? (
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.authScrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{dictionary[lang].loginTitle}</Text>

              {!otpSent ? (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].phoneLabel}</Text>
                  <TextInput 
                    style={styles.appFormInputBox} 
                    placeholder={dictionary[lang].phonePlaceholder} 
                    keyboardType="phone-pad" 
                    value={userPhone} 
                    onChangeText={handlePhoneChange} 
                    placeholderTextColor="#94A3B8" 
                    maxLength={10}
                    editable={true}
                    selectTextOnFocus={true}
                  />

                  {userPhone.length === 10 && (
                    <View style={{ marginBottom: 12, padding: 6, borderRadius: 6, backgroundColor: isNewUser ? '#FEF3C7' : '#DCFCE7' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: isNewUser ? '#D97706' : '#15803D', textAlign: 'center' }}>
                        {isNewUser ? dictionary[lang].newUserNotice : `${dictionary[lang].existingUserNotice} ${userName}`}
                      </Text>
                    </View>
                  )}

                  {isNewUser && (
                    <>
                      <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].nameLabel}</Text>
                      <TextInput 
                        style={styles.appFormInputBox} 
                        placeholder={dictionary[lang].namePlaceholder} 
                        value={userName} 
                        onChangeText={setUserName} 
                        placeholderTextColor="#94A3B8" 
                      />
                    </>
                  )}

                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#2563EB' }]} onPress={handleRequestOTP}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].continueBtn}</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 12 }}>
                    {dictionary[lang].otpSentNotice} +91 {userPhone}
                  </Text>
                  <TextInput 
                    style={[styles.appFormInputBox, { textAlign: 'center', fontSize: 18, letterSpacing: 4 }]} 
                    placeholder={dictionary[lang].otpPlaceholder} 
                    keyboardType="number-pad" 
                    value={inputOtp} 
                    onChangeText={setInputOtp} 
                    maxLength={6}
                    editable={true}
                    selectTextOnFocus={true}
                  />
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#16A34A' }]} onPress={handleVerifyOTP}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].verifyOtpBtn}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setOtpSent(false)}>
                    <Text style={{ textAlign: 'center', color: '#2563EB', fontSize: 11 }}>{dictionary[lang].editPhone}</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={{ marginTop: 16, marginBottom: 10 }} onPress={() => { setAuthSelection('NONE'); setOtpSent(false); }}>
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12 }}>{dictionary[lang].goBack}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={styles.mapCanvasContainerFrame}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: location ? location.coords.latitude : 28.6139,
                  longitude: location ? location.coords.longitude : 77.2090,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
              >
                {location && (
                  <Marker coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }} title={dictionary[lang].yourLocation} pinColor="blue" />
                )}
                {trackingRequest && (
                  <>
                    <Marker coordinate={{ latitude: trackingRequest.latitude || 28.62, longitude: trackingRequest.longitude || 77.21 }} title={trackingRequest.partnerName} pinColor="red" />
                    <Polyline
                      coordinates={[
                        { latitude: location?.coords.latitude || 28.6139, longitude: location?.coords.longitude || 77.2090 },
                        { latitude: trackingRequest.latitude || 28.62, longitude: trackingRequest.longitude || 77.21 }
                      ]}
                      strokeColor="#2563EB"
                      strokeWidth={4}
                    />
                  </>
                )}
              </MapView>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.servicesGridTitle}>{dictionary[lang].selectServiceHeader}</Text>
              <View style={styles.servicesGridFlexibleRow}>
                <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Mechanic'); setModalVisible(true); }}>
                  <Text style={{ fontSize: 28 }}>🛠️</Text>
                  <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].mechanicService}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Puncture'); setModalVisible(true); }}>
                  <Text style={{ fontSize: 28 }}>🛞</Text>
                  <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].punctureService}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.serviceSquareUnitBtn} onPress={() => { setActiveService('Fuel'); setModalVisible(true); }}>
                  <Text style={{ fontSize: 28 }}>⛽</Text>
                  <Text style={styles.serviceUnitTextLabel}>{dictionary[lang].fuelService}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {trackingRequest && (
              <View style={styles.trackingDashboardContainer}>
                <View style={styles.trackingHeaderFlexRow}>
                  <View>
                    <Text style={styles.trackingPartnerNameMainTitle}>{trackingRequest.partnerName}</Text>
                    <Text style={styles.trackingPartnerShopSubtitle}>{trackingRequest.shopName} • 4.8 ⭐</Text>
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
        )
      )}

      {/* MECHANIC / PARTNER FLOW */}
      {authSelection === 'PARTNER' && (
        !partnerLoggedIn ? (
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.authScrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{isRegistering ? dictionary[lang].shopReg : dictionary[lang].partnerQuick}</Text>

              {!otpSent ? (
                <>
                  {isRegistering && (
                    <>
                      <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <TouchableOpacity style={styles.modernCircularAvatarWrapper} onPress={handlePickPartnerPhoto}>
                          {partnerAvatar ? (
                            <Image source={{ uri: partnerAvatar }} style={styles.modernCircularAvatarImg} />
                          ) : (
                            <View style={styles.avatarPlaceholderContainer}>
                              <Text style={{ fontSize: 26 }}>🛠️</Text>
                              <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: 'bold', marginTop: 2 }}>{dictionary[lang].addPhotoBtn}</Text>
                            </View>
                          )}
                          <View style={styles.cameraIconBadge}>
                            <Text style={{ fontSize: 10, color: '#FFF' }}>📷</Text>
                          </View>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{dictionary[lang].uploadPhotoText}</Text>
                      </View>

                      <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].ownerName}</Text>
                      <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].ownerNamePlace} value={partnerName} onChangeText={setPartnerName} placeholderTextColor="#94A3B8" />

                      <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].garageNameLabel}</Text>
                      <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].shopNamePlace} value={shopName} onChangeText={setShopName} placeholderTextColor="#94A3B8" />

                      <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].categoryTypeLabel}</Text>
                      <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                        <Picker selectedValue={serviceType} onValueChange={(itemValue: string) => setServiceType(itemValue)}>
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

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].phoneLabel}</Text>
                  <TextInput 
                    style={styles.appFormInputBox} 
                    placeholder={dictionary[lang].phonePlaceholder} 
                    keyboardType="phone-pad" 
                    value={partnerPhone} 
                    onChangeText={handlePartnerPhoneChange} 
                    placeholderTextColor="#94A3B8" 
                    maxLength={10}
                    editable={true}
                    selectTextOnFocus={true}
                  />

                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#0F172A' }]} onPress={handleRequestOTP}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].verifyLaunchPartner}</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 12 }}>
                    {dictionary[lang].otpSentNotice} +91 {partnerPhone}
                  </Text>
                  <TextInput 
                    style={[styles.appFormInputBox, { textAlign: 'center', fontSize: 18, letterSpacing: 4 }]} 
                    placeholder={dictionary[lang].otpPlaceholder} 
                    keyboardType="number-pad" 
                    value={inputOtp} 
                    onChangeText={setInputOtp} 
                    maxLength={6}
                    editable={true}
                    selectTextOnFocus={true}
                  />
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#16A34A' }]} onPress={handleVerifyOTP}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].verifyOtpBtn}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setOtpSent(false)}>
                    <Text style={{ textAlign: 'center', color: '#2563EB', fontSize: 11 }}>{dictionary[lang].editPhone}</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => { setIsRegistering(!isRegistering); setOtpSent(false); }}>
                <Text style={{ textAlign: 'center', color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>
                  {isRegistering ? dictionary[lang].alreadyRegUser : dictionary[lang].createPartnerAccountLink}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16, marginBottom: 10 }} onPress={() => { setAuthSelection('NONE'); setOtpSent(false); }}>
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12 }}>{dictionary[lang].goBack}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {partnerAvatar ? (
                  <Image source={{ uri: partnerAvatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 20 }}>🛠️</Text>
                  </View>
                )}
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#0F172A' }}>{shopName || "Workshop"}</Text>
                  <Text style={{ color: '#64748B', fontSize: 11 }}>👤 {partnerName || "Partner Mechanic"} ({serviceType})</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 6, fontWeight: 'bold', fontSize: 11, color: isPartnerOnline ? '#16A34A' : '#DC2626' }}>
                  {isPartnerOnline ? dictionary[lang].onlineStatus : dictionary[lang].offlineStatus}
                </Text>
                <Switch value={isPartnerOnline} onValueChange={setIsPartnerOnline} />
              </View>
            </View>

            {incomingSOS ? (
              <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#DC2626' }}>
                <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{dictionary[lang].alertReceivedTitle}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].driverNameLabel}</Text> {incomingSOS.userName}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].serviceLabel}</Text> {incomingSOS.service} ({incomingSOS.vehicle})</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].issueLogsLabel}</Text> {incomingSOS.description || incomingSOS.problem}</Text>
                <Text style={{ fontSize: 14, marginBottom: 12 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].travelLabel}:</Text> {incomingSOS.calculatedDist} KM | <Text style={{ fontWeight: 'bold' }}>{dictionary[lang].bonusLabel}:</Text> ₹{incomingSOS.calculatedFare}</Text>

                <TouchableOpacity style={{ backgroundColor: '#16A34A', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8 }} onPress={handleAcceptSOS}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].acceptSOSBtn}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => setIncomingSOS(null)}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].rejectClearText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12 }}>
                  {isPartnerOnline ? dictionary[lang].waitingRequests : dictionary[lang].offlineNotice}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[styles.accountLogoutActionBtn, { marginTop: 20 }]} onPress={handleSystemLogout}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{dictionary[lang].logoutWorkstation}</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* REQUEST CONFIGURATION MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
              {activeService === 'Puncture' ? dictionary[lang].puncReqTitle : activeService === 'Fuel' ? dictionary[lang].fuelReqTitle : dictionary[lang].mechReqTitle}
            </Text>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>{dictionary[lang].vehicleType}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              {['bike', 'car', 'auto', 'other'].map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, marginHorizontal: 2, alignItems: 'center', backgroundColor: selectedVehicle === type ? '#2563EB' : '#F1F5F9' }} 
                  onPress={() => setSelectedVehicle(type)}
                >
                  <Text style={{ color: selectedVehicle === type ? '#FFF' : '#1E293B', fontSize: 12, fontWeight: 'bold' }}>
                    {type === 'bike' ? dictionary[lang].bikeOption : type === 'car' ? dictionary[lang].carOption : type === 'auto' ? dictionary[lang].autoOption : dictionary[lang].otherCustomText}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].problemType}</Text>
            <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
              <Picker selectedValue={selectedProblem} onValueChange={(itemValue: string) => setSelectedProblem(itemValue)}>
                {getDynamicProblems().map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>

            <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{dictionary[lang].customDescTitle}</Text>
            <TextInput 
              style={styles.appFormInputBox} 
              placeholder={dictionary[lang].customMsgPlaceholder} 
              value={customDescription} 
              onChangeText={setCustomDescription} 
            />

            <TouchableOpacity style={{ backgroundColor: '#DC2626', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }} onPress={handleSOSBroadcast}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{dictionary[lang].broadcastBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: 8, alignItems: 'center' }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#64748B', fontWeight: '500' }}>{dictionary[lang].cancelText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RATING FEEDBACK MODAL */}
      <Modal visible={ratingModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6, textAlign: 'center' }}>
              {dictionary[lang].srvFeedbackTitle}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12, textAlign: 'center' }}>
              {dictionary[lang].srvFeedbackDesc}
            </Text>

            <TextInput 
              style={[styles.appFormInputBox, { height: 70, textAlignVertical: 'top' }]} 
              placeholder={dictionary[lang].srvFeedbackPlace} 
              multiline={true}
              value={userFeedbackText}
              onChangeText={setUserFeedbackText}
            />

            <TouchableOpacity 
              style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }} 
              onPress={() => {
                setRatingModalVisible(false);
                setTrackingRequest(null);
                setUserFeedbackText('');
                Alert.alert('Thank You! ⭐', lang === 'hi' ? 'आपकी प्रतिक्रिया दर्ज की गई।' : 'Feedback submitted successfully.');
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{dictionary[lang].submitStarRating}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: 6, alignItems: 'center' }} onPress={() => setRatingModalVisible(false)}>
              <Text style={{ color: '#64748B', fontSize: 12 }}>{dictionary[lang].cancelText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LIVE CHAT MODAL */}
      <Modal visible={chatModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardContainer, { maxHeight: '80%' }]}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{dictionary[lang].liveChatTitle}</Text>
            
            <ScrollView style={{ flexGrow: 1, marginBottom: 8 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {chatMessages.map((msg) => (
                <View key={msg.id} style={{ alignSelf: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#2563EB' : '#E2E8F0', padding: 8, borderRadius: 8, marginBottom: 4, maxWidth: '80%' }}>
                  <Text style={{ color: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#FFF' : '#1E293B', fontSize: 12 }}>{msg.text}</Text>
                  <Text style={{ color: msg.sender === (authSelection === 'USER' ? 'user' : 'partner') ? '#E2E8F0' : '#64748B', fontSize: 9, textAlign: 'right' }}>{msg.timestamp}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput style={[styles.appFormInputBox, { flex: 1, marginBottom: 0 }]} placeholder={dictionary[lang].chatInputPlace} value={typedMessage} onChangeText={setTypedMessage} />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  appTopNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 14 },
  appLogoMainBrand: { color: '#FFF', fontSize: 19, fontWeight: 'bold' },
  topBarWelcomeSubtitle: { color: '#38BDF8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  langSquareUnit: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  landingWrapperCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  landingMainHeaderBrand: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  landingSubheadingBrand: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  landingBigSelectionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  landingBigBtnIcon: { fontSize: 28 },
  landingBigBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  landingBigBtnDesc: { color: '#94A3B8', fontSize: 11 },
  authScrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  authDisplayCardFrame: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  authCardHeaderLabel: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  appFormInputBox: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, color: '#0F172A', marginBottom: 12, backgroundColor: '#FFF' },
  authSubmissionActionBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  authBtnTextString: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  modernCircularAvatarWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#2563EB', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  modernCircularAvatarImg: { width: '100%', height: '100%', borderRadius: 45 },
  avatarPlaceholderContainer: { alignItems: 'center' },
  cameraIconBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#2563EB', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

  mapCanvasContainerFrame: { width: '100%', height: 220, backgroundColor: '#E2E8F0' },
  servicesGridTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  servicesGridFlexibleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  serviceSquareUnitBtn: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, elevation: 2 },
  serviceUnitTextLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'center', color: '#1E293B' },
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
  modalCardContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 5 },
});