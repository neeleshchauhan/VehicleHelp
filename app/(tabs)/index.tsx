// ==========================================
// 🚗 VEHICLEHELP - FULL CODE (DEFAULT: ENGLISH)
// ==========================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';

const API_BASE_URL = 'http://192.168.1.100:5000'; // Server IP

// LOCALIZATION DICTIONARY
const dictionary = {
  hi: {
    appTitle: '🚗 VehicleHelp',
    welcomeSub: 'आपकी सुरक्षा, हमारी जिम्मेदारी',
    userRoleBtn: 'ड्राइवर / वाहन चालक',
    partnerRoleBtn: 'मैकेनिक / वर्कशॉप',
    userDesc: 'सड़क पर मदद चाहिए? तुरंत मैकेनिक बुलाएं',
    partnerDesc: 'अपनी दुकान पंजीकृत करें और काम पाएं',
    loginTitle: 'ड्राइवर साइन-अप / लॉगिन',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर',
    continueBtn: '🚀 जारी रखें / लॉगिन करें',
    selectServiceHeader: 'सेवा चुनें',
    mechanicService: 'मैकेनिक',
    punctureService: 'पंचर',
    fuelService: 'ईंधन',
    etaText: '⏱️ 15-20 मिनट',
    totalPayable: 'कुल देय राशि:',
    closeCodeLabel: 'सर्विस क्लोजर कोड:',
    closeCodeNote: 'काम पूरा होने पर मैकेनिक को यह कोड दें',
    chatBtnText: '💬 चैट करें',
    completeRateBtn: '⭐ काम पूरा हुआ / रेट करें',
    logoutText: '🚪 लॉगआउट करें',
    shopReg: 'दुकान का पंजीकरण',
    partnerQuick: 'पार्टनर त्वरित लॉगिन',
    uploadPhotoText: '📷 दुकान/मालिक की फोटो अपलोड करें',
    ownerName: 'मालिक का नाम:',
    ownerNamePlace: 'अपना नाम दर्ज करें',
    garageNameLabel: 'गैराज / दुकान का नाम:',
    shopNamePlace: 'दुकान का नाम',
    categoryTypeLabel: 'मुख्य सेवा श्रेणी:',
    generalMechanicLabel: 'सामान्य मैकेनिक',
    punctureFixingLabel: 'पंचर / टायर',
    emergencyFuelLabel: 'आपतकालीन ईंधन',
    shopLocationLabel: 'दुकान का पता:',
    storeAddressPlace: 'दुकान का पूरा पता',
    fetchLocationBtn: '📍 वर्तमान स्थान प्राप्त करें',
    verifyLaunchPartner: '🚀 पंजीकृत करें और शुरू करें',
    alreadyRegUser: 'पहले से पंजीकृत हैं? लॉगिन करें',
    createPartnerAccountLink: 'नया खाता बनाएं',
    goBack: '⬅️ पीछे जाएं',
    onlineStatus: '🟢 ऑनलाइन',
    offlineStatus: '🔴 ऑफलाइन',
    offlineNotice: 'आप अभी ऑफलाइन हैं। काम प्राप्त करने के लिए ऑनलाइन जाएं।',
    alertReceivedTitle: '🚨 नई सहायता का अनुरोध!',
    driverNameLabel: 'चालक का नाम:',
    issueLogsLabel: 'समस्या:',
    travelLabel: 'दूरी',
    bonusLabel: 'अनुमानित किराया',
    arrivalOtpPlace: 'पहुंचने का कोड दर्ज करें',
    verifyArrivalBtn: 'पहुंच सत्यापित करें',
    addPartHeading: 'अतिरिक्त स्पेयर पार्ट्स जोड़ें:',
    partNamePlace: 'पार्ट का नाम और मूल्य',
    uploadPartImg: '📷 फोटो लें',
    aiFetchBtn: '➕ जोड़ें',
    partnerOtpInputLabel: 'ग्राहक का क्लोजर कोड दर्ज करें:',
    partnerOtpPlaceholder: '4-अंकों का कोड',
    partnerVerifyActionBtn: '✅ सत्यापित करें और काम समाप्त करें',
    rejectClearText: '❌ अस्वीकार करें / हटाएं',
    waitingRequests: 'नए अनुरोधों की प्रतीक्षा की जा रही है...',
    logoutWorkstation: '🚪 वर्कस्टेशन से लॉगआउट करें',
    configureReq: 'अनुरोध विवरण',
    vehicleType: 'वाहन का प्रकार:',
    bikeOption: '🛵 बाइक',
    carOption: '🚗 कार',
    autoOption: '🛺 ऑटो',
    otherCustomText: '🚜 अन्य',
    problemType: 'समस्या का प्रकार:',
    customDescTitle: 'समस्या का विवरण (मैसेज / नोट):',
    customMsgPlaceholder: 'क्या समस्या है विस्तार से बताएं (जैसे Front Tyre Puncture)...',
    broadcastBtn: '🚨 अनुरोध भेजें (Request Help)',
    cancelText: 'रद्द करें',
    srvFeedbackTitle: 'सेवा प्रतिक्रिया',
    srvFeedbackDesc: 'कृपया अपने अनुभव को रेट करें',
    srvFeedbackPlace: 'अपनी प्रतिक्रिया लिखें...',
    submitStarRating: 'रेटिंग जमा करें',
    liveChatTitle: '💬 लाइव चैट',
    chatInputPlace: 'संदेश लिखें...',
    sendText: 'भेजें',
    closeRoomText: 'बंद करें',
  },
  en: {
    appTitle: '🚗 VehicleHelp',
    welcomeSub: 'Your Safety, Our Responsibility',
    userRoleBtn: 'Driver / Vehicle Owner',
    partnerRoleBtn: 'Mechanic / Workshop',
    userDesc: 'Need roadside help? Get a mechanic instantly',
    partnerDesc: 'Register your shop & get jobs nearby',
    loginTitle: 'Driver Signup / Login',
    namePlaceholder: 'Enter Full Name',
    phonePlaceholder: '10-digit mobile number',
    continueBtn: '🚀 Continue / Login',
    selectServiceHeader: 'Select Service',
    mechanicService: 'Mechanic',
    punctureService: 'Puncture',
    fuelService: 'Fuel',
    etaText: '⏱️ 15-20 Min',
    totalPayable: 'Total Payable:',
    closeCodeLabel: 'Service Closure Code:',
    closeCodeNote: 'Share this code with mechanic when job is completed',
    chatBtnText: '💬 Chat',
    completeRateBtn: '⭐ Complete / Rate',
    logoutText: '🚪 Logout',
    shopReg: 'Shop Registration',
    partnerQuick: 'Partner Quick Login',
    uploadPhotoText: '📷 Upload Shop/Owner Photo',
    ownerName: 'Owner Name:',
    ownerNamePlace: 'Enter your full name',
    garageNameLabel: 'Garage / Shop Name:',
    shopNamePlace: 'Shop Name',
    categoryTypeLabel: 'Primary Service Category:',
    generalMechanicLabel: 'General Mechanic',
    punctureFixingLabel: 'Puncture / Tyre',
    emergencyFuelLabel: 'Emergency Fuel',
    shopLocationLabel: 'Shop Address:',
    storeAddressPlace: 'Full Shop Address',
    fetchLocationBtn: '📍 Fetch Current Location',
    verifyLaunchPartner: '🚀 Register & Launch',
    alreadyRegUser: 'Already registered? Login',
    createPartnerAccountLink: 'Create New Account',
    goBack: '⬅️ Go Back',
    onlineStatus: '🟢 ONLINE',
    offlineStatus: '🔴 OFFLINE',
    offlineNotice: 'You are currently offline. Go online to receive requests.',
    alertReceivedTitle: '🚨 NEW REQUEST RECEIVED!',
    driverNameLabel: 'Driver Name:',
    issueLogsLabel: 'Issue:',
    travelLabel: 'Distance',
    bonusLabel: 'Est. Fare',
    arrivalOtpPlace: 'Enter Arrival Code',
    verifyArrivalBtn: 'Verify Arrival',
    addPartHeading: 'Add Spare Parts / Bill Items:',
    partNamePlace: 'Part Name & Cost',
    uploadPartImg: '📷 Take Photo',
    aiFetchBtn: '➕ Add Item',
    partnerOtpInputLabel: 'Enter Customer Closure Code:',
    partnerOtpPlaceholder: '4-Digit Code',
    partnerVerifyActionBtn: '✅ Verify & Complete Job',
    rejectClearText: '❌ Reject / Clear',
    waitingRequests: 'Waiting for incoming requests...',
    logoutWorkstation: '🚪 Logout Workstation',
    configureReq: 'Configure Assistance Request',
    vehicleType: 'Vehicle Type:',
    bikeOption: '🛵 Bike',
    carOption: '🚗 Car',
    autoOption: '🛺 Auto',
    otherCustomText: '🚜 Other',
    problemType: 'Problem Type:',
    customDescTitle: 'Custom Description (Message / Note):',
    customMsgPlaceholder: 'Describe the issue (e.g. Front Tyre Puncture)...',
    broadcastBtn: '🚨 BROADCAST HELP REQUEST',
    cancelText: 'Cancel',
    srvFeedbackTitle: 'Service Feedback',
    srvFeedbackDesc: 'Please rate your experience with the mechanic',
    srvFeedbackPlace: 'Write your feedback here...',
    submitStarRating: 'Submit Rating',
    liveChatTitle: '💬 Live Chat Support',
    chatInputPlace: 'Type a message...',
    sendText: 'Send',
    closeRoomText: 'Close Room',
  }
};

export default function App() {
  // SET DEFAULT LANGUAGE TO ENGLISH ('en')
  const [lang, setLang] = useState<'hi' | 'en'>('en');
  const [authSelection, setAuthSelection] = useState<'NONE' | 'USER' | 'PARTNER'>('NONE');
  const [loading, setLoading] = useState<boolean>(false);

  // Driver Auth States
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [isNewUser, setIsNewUser] = useState<boolean>(true);
  const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);

  // Partner Auth States
  const [partnerPhone, setPartnerPhone] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('Mechanic');
  const [shopAddress, setShopAddress] = useState<string>('');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [partnerLoggedIn, setPartnerLoggedIn] = useState<boolean>(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState<boolean>(true);

  // Location & Map
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Request States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [activeService, setActiveService] = useState<'Mechanic' | 'Puncture' | 'Fuel' | ''>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('bike');
  const [selectedProblem, setSelectedProblem] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');

  // Tracking & Job Status
  const [trackingRequest, setTrackingRequest] = useState<any | null>(null);
  const [incomingSOS, setIncomingSOS] = useState<any | null>(null);
  const [serviceClosureOTP, setServiceClosureOTP] = useState<string>('4382');
  const [totalBillAmount, setTotalBillAmount] = useState<number>(350);

  // Modals
  const [ratingModalVisible, setRatingModalVisible] = useState<boolean>(false);
  const [chatModalVisible, setChatModalVisible] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState<string>('');

  const socketRef = useRef<any>(null);

  // Dynamic Problems Selection
  const getDynamicProblems = () => {
    if (activeService === 'Fuel') {
      return [
        { label: '⛽ Petrol Needed (2 - 5 Litres)', value: 'petrol_delivery' },
        { label: '⛽ Diesel Needed (2 - 5 Litres)', value: 'diesel_delivery' }
      ];
    }
    if (activeService === 'Puncture') {
      return [
        { label: '🛞 Front Tyre Puncture', value: 'front_puncture' },
        { label: '🛞 Rear Tyre Puncture', value: 'rear_puncture' },
        { label: '🛞 Both Tyres Puncture / Tube Damage', value: 'both_puncture' }
      ];
    }
    return [
      { label: selectedVehicle === 'bike' ? '⛓️ Chain Broken / Slips' : '🔥 Engine Overheating', value: 'engine_issue' },
      { label: '🛑 Brake Failure / Soft Brakes', value: 'brake_failure' },
      { label: '🔋 Dead Battery / Start Issue', value: 'battery_dead' },
      { label: '⚙️ Clutch Wire / Gear Jam', value: 'clutch_gear' },
      { label: '🛠️ Other Mechanical Issue', value: 'mech_other' }
    ];
  };

  const getUserLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc);
    } catch (e) {
      console.log('Location error:', e);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@vh_user_session');
      const savedPartner = await AsyncStorage.getItem('@vh_partner_session');
      if (savedUser) {
        const uData = JSON.parse(savedUser);
        setUserName(uData.name || 'Driver');
        setUserPhone(uData.phone);
        setUserLoggedIn(true);
        setAuthSelection('USER');
      } else if (savedPartner) {
        const pData = JSON.parse(savedPartner);
        setPartnerName(pData.name);
        setShopName(pData.shopName);
        setPartnerPhone(pData.phone);
        setPartnerAvatar(pData.avatar || null);
        setPartnerLoggedIn(true);
        setAuthSelection('PARTNER');
      }
    } catch (e) {
      console.log('Session error:', e);
    }
  }, []);

  useEffect(() => {
    checkSession();
    getUserLocation();

    socketRef.current = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true
    });

    const handleNewSOS = (data: any) => {
      setIncomingSOS({ ...data, calculatedDist: 3.5, calculatedFare: 250 });
    };

    socketRef.current.on('NEW_SOS_REQUEST', handleNewSOS);
    socketRef.current.on('SOS_ACCEPTED', (data: any) => {
      setTrackingRequest(data);
      setModalVisible(false);
      Alert.alert('Mechanic Accepted!', `${data.partnerName} is on the way.`);
    });
    socketRef.current.on('CHAT_MESSAGE_RECEIVED', (data: any) => {
      setChatMessages((prev) => [...prev, data]);
    });

    const currentSocket = socketRef.current;
    return () => {
      if (currentSocket) {
        currentSocket.off('NEW_SOS_REQUEST', handleNewSOS);
        currentSocket.disconnect();
      }
    };
  }, [checkSession, getUserLocation]);

  // IMAGE PICKER FOR PARTNER REGISTRATION
  const handlePickPartnerPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required ⚠️', 'Allow access to gallery/camera to upload photo.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setPartnerAvatar(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick image');
    }
  };

  // AUTOMATIC DATABASE CHECK & LOGIN LOGIC
  const handlePhoneChange = async (text: string) => {
    setUserPhone(text);
    if (text.length === 10) {
      setLoading(true);
      try {
        const dbUsersRaw = await AsyncStorage.getItem('@vh_registered_users_db');
        const dbUsers = dbUsersRaw ? JSON.parse(dbUsersRaw) : {};

        if (dbUsers[text]) {
          setIsNewUser(false);
          setUserName(dbUsers[text].name);
        } else {
          setIsNewUser(true);
          setUserName('');
        }
      } catch (e) {
        console.log('DB Search Error', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUserAuthSubmit = async () => {
    if (userPhone.length < 10) {
      Alert.alert('Invalid Number ❌', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (isNewUser && !userName.trim()) {
      Alert.alert('Name Required ⚠️', 'Please enter your full name to register.');
      return;
    }

    setLoading(true);
    try {
      const dbUsersRaw = await AsyncStorage.getItem('@vh_registered_users_db');
      let dbUsers = dbUsersRaw ? JSON.parse(dbUsersRaw) : {};

      const finalName = isNewUser ? userName.trim() : dbUsers[userPhone]?.name || userName || 'Driver';
      dbUsers[userPhone] = { name: finalName, phone: userPhone, registeredAt: new Date().toISOString() };

      await AsyncStorage.setItem('@vh_registered_users_db', JSON.stringify(dbUsers));
      const sessionData = { name: finalName, phone: userPhone };
      await AsyncStorage.setItem('@vh_user_session', JSON.stringify(sessionData));

      setUserLoggedIn(true);
      Alert.alert('Welcome! 🎉', `Logged in as ${finalName}`);
    } catch (e) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSubmitRegistration = async () => {
    if (partnerPhone.length < 10) {
      Alert.alert('Error ❌', 'Please enter valid 10-digit mobile number.');
      return;
    }
    setLoading(true);

    const payload = {
      name: partnerName || 'Partner',
      shopName: shopName || 'Auto Workshop',
      serviceType,
      address: shopAddress,
      phone: partnerPhone,
      avatar: partnerAvatar
    };

    setTimeout(async () => {
      await AsyncStorage.setItem('@vh_partner_session', JSON.stringify(payload));
      setPartnerLoggedIn(true);
      setLoading(false);
    }, 600);
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
  };

  const handleSOSBroadcast = () => {
    if (!location) {
      Alert.alert('Location Missing', 'Fetching location. Please try again.');
      getUserLocation();
      return;
    }
    const payload = {
      userName,
      userPhone,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      service: activeService,
      vehicle: selectedVehicle,
      problem: selectedProblem || activeService,
      description: customDescription
    };

    if (socketRef.current) {
      socketRef.current.emit('BROADCAST_SOS', payload);
    }
    setModalVisible(false);
    Alert.alert('Request Sent! 🚨', 'Searching for nearby available mechanics...');
  };

  const handleSendChatMessage = () => {
    if (!typedMessage.trim()) return;
    const msgObj = {
      id: Date.now().toString(),
      sender: authSelection === 'USER' ? 'user' : 'partner',
      text: typedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (socketRef.current) {
      socketRef.current.emit('SEND_CHAT_MESSAGE', msgObj);
    }
    setChatMessages((prev) => [...prev, msgObj]);
    setTypedMessage('');
  };

  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.appTopNavBar}>
        <View>
          <Text style={styles.appLogoMainBrand}>{dictionary[lang].appTitle}</Text>
          <Text style={styles.topBarWelcomeSubtitle}>{dictionary[lang].welcomeSub}</Text>
        </View>
        <TouchableOpacity style={styles.langSquareUnit} onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>🌐 {lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* LANDING PAGE */}
      {authSelection === 'NONE' && (
        <View style={styles.landingWrapperCenter}>
          <Text style={styles.landingMainHeaderBrand}>🚗 VehicleHelp</Text>
          <Text style={styles.landingSubheadingBrand}>Select your profile to continue</Text>

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

      {/* DRIVER AUTHENTICATION FLOW */}
      {authSelection === 'USER' && (
        !userLoggedIn ? (
          <View style={styles.authWrapperCenter}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{dictionary[lang].loginTitle}</Text>

              <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Mobile Number:</Text>
              <TextInput 
                style={styles.appFormInputBox} 
                placeholder={dictionary[lang].phonePlaceholder} 
                keyboardType="phone-pad" 
                value={userPhone} 
                onChangeText={handlePhoneChange} 
                placeholderTextColor="#94A3B8" 
                maxLength={10}
              />

              {userPhone.length === 10 && (
                <View style={{ marginBottom: 12, padding: 6, borderRadius: 6, backgroundColor: isNewUser ? '#FEF3C7' : '#DCFCE7' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: isNewUser ? '#D97706' : '#15803D', textAlign: 'center' }}>
                    {isNewUser ? "✨ New User Detected! Enter Name below to register." : `✅ Account Found! Welcome back, ${userName}`}
                  </Text>
                </View>
              )}

              {isNewUser && (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Full Name:</Text>
                  <TextInput 
                    style={styles.appFormInputBox} 
                    placeholder={dictionary[lang].namePlaceholder} 
                    value={userName} 
                    onChangeText={setUserName} 
                    placeholderTextColor="#94A3B8" 
                  />
                </>
              )}

              <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#2563EB' }]} onPress={handleUserAuthSubmit}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].continueBtn}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setAuthSelection('NONE')}>
                <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12 }}>{dictionary[lang].goBack}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
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
                  <Marker coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }} title="Your Location" pinColor="blue" />
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

            <ScrollView style={{ flex: 1 }}>
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
          </View>
        )
      )}

      {/* MECHANIC / PARTNER FLOW */}
      {authSelection === 'PARTNER' && (
        !partnerLoggedIn ? (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{isRegistering ? dictionary[lang].shopReg : dictionary[lang].partnerQuick}</Text>

              {isRegistering && (
                <>
                  <Text style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>{dictionary[lang].uploadPhotoText}</Text>
                  <TouchableOpacity style={styles.photoPickerContainer} onPress={handlePickPartnerPhoto}>
                    {partnerAvatar ? (
                      <Image source={{ uri: partnerAvatar }} style={styles.photoPreviewImage} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, marginBottom: 4 }}>📷</Text>
                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '500' }}>Tap to upload shop / profile photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].ownerName}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].ownerNamePlace} value={partnerName} onChangeText={setPartnerName} placeholderTextColor="#94A3B8" />

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].garageNameLabel}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].shopNamePlace} value={shopName} onChangeText={setShopName} placeholderTextColor="#94A3B8" />

                  <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{dictionary[lang].shopLocationLabel}</Text>
                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].storeAddressPlace} value={shopAddress} onChangeText={setShopAddress} placeholderTextColor="#94A3B8" />
                  <TouchableOpacity style={{ marginBottom: 12 }} onPress={fetchLiveCurrentShopAddress}>
                    <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 12 }}>{dictionary[lang].fetchLocationBtn}</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>Mobile Number:</Text>
              <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].phonePlaceholder} keyboardType="phone-pad" value={partnerPhone} onChangeText={setPartnerPhone} placeholderTextColor="#94A3B8" maxLength={10} />

              <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#0F172A' }]} onPress={handlePartnerSubmitRegistration}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnTextString}>{dictionary[lang].verifyLaunchPartner}</Text>}
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {partnerAvatar && <Image source={{ uri: partnerAvatar }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />}
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>🛠️ {shopName || "Workshop"}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>👤 {partnerName || "Mechanic Partner"}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8, fontWeight: 'bold', fontSize: 12, color: isPartnerOnline ? '#16A34A' : '#DC2626' }}>
                  {isPartnerOnline ? dictionary[lang].onlineStatus : dictionary[lang].offlineStatus}
                </Text>
                <Switch value={isPartnerOnline} onValueChange={setIsPartnerOnline} />
              </View>
            </View>

            {incomingSOS ? (
              <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#DC2626' }}>
                <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{dictionary[lang].alertReceivedTitle}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].driverNameLabel}</Text> {incomingSOS.userName}</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Service:</Text> {incomingSOS.service} ({incomingSOS.vehicle})</Text>
                <Text style={{ fontSize: 14, marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].issueLogsLabel}</Text> {incomingSOS.description || incomingSOS.problem}</Text>
                <Text style={{ fontSize: 14, marginBottom: 12 }}><Text style={{ fontWeight: 'bold' }}>{dictionary[lang].travelLabel}:</Text> {incomingSOS.calculatedDist} KM | <Text style={{ fontWeight: 'bold' }}>{dictionary[lang].bonusLabel}:</Text> ₹{incomingSOS.calculatedFare}</Text>

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

      {/* REQUEST CONFIGURATION MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
              {activeService === 'Puncture' ? '🛞 Puncture Repair Request' : activeService === 'Fuel' ? '⛽ Fuel Emergency Request' : '🛠️ Mechanic Help Request'}
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
              <Picker selectedValue={selectedProblem} onValueChange={(itemValue) => setSelectedProblem(itemValue)}>
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

      {/* LIVE CHAT MODAL */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  appTopNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 },
  appLogoMainBrand: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  topBarWelcomeSubtitle: { color: '#94A3B8', fontSize: 11 },
  langSquareUnit: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  landingWrapperCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  landingMainHeaderBrand: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
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
  photoPickerContainer: { borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: '#F8FAFC', height: 100 },
  photoPreviewImage: { width: '100%', height: '100%', borderRadius: 6 },
  mapCanvasContainerFrame: { width: '100%', height: 250, backgroundColor: '#E2E8F0' },
  servicesGridTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  servicesGridFlexibleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  serviceSquareUnitBtn: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
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
  modalCardContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 5 },
});