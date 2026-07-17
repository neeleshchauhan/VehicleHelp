import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io, Socket } from "socket.io-client";

// 🌟 THE ULTIMATE SHIELD: Fully intercepted mock object to prevent internal library mutations
import NativeVoiceModule from '@react-native-voice/voice';
const Voice = (NativeVoiceModule && typeof NativeVoiceModule.start === 'function') 
  ? NativeVoiceModule 
  : {
      start: () => Promise.resolve(),
      stop: () => Promise.resolve(),
      destroy: () => Promise.resolve(),
      removeAllListeners: () => {},
      set onSpeechStart(val: any) {},
      get onSpeechStart() { return null; },
      set onSpeechEnd(val: any) {},
      get onSpeechEnd() { return null; },
      set onSpeechResults(val: any) {},
      get onSpeechResults() { return null; },
      set onSpeechError(val: any) {},
      get onSpeechError() { return null; }
    };

const DEV_BACKEND_IP = '10.182.110.71'; 
const BASE_URL = `http://${DEV_BACKEND_IP}:5000`;
const API_BASE_URL = `${BASE_URL}/api`; 

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

export default function HomeScreen() {
  const socketRef = useRef<Socket | null>(null);

  const [authSelection, setAuthSelection] = useState<'NONE' | 'USER' | 'PARTNER'>('NONE');
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en'); 
  const mapRef = useRef<MapView>(null);

  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userOtpSent, setUserOtpSent] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userOtp, setUserOtp] = useState(['', '', '', '']); 
  const [modalVisible, setModalVisible] = useState(false);
  const [activeService, setActiveService] = useState(''); 
  
  const [selectedVehicle, setSelectedVehicle] = useState('car'); 
  const [fuelQuantity, setFuelQuantity] = useState('2L'); 
  const [fuelType, setFuelType] = useState('petrol'); 
  const [tyreType, setTyreType] = useState('front'); 
  const [tyreStructure, setTyreStructure] = useState('tubeless'); 
  const [selectedProblem, setSelectedProblem] = useState('Engine Issue'); 
  const [customDescription, setCustomDescription] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [mechanicsList, setMechanicsList] = useState<any[]>([]);
  const [trackingRequest, setTrackingRequest] = useState<any | null>(null);
  const [incomingSOS, setIncomingSOS] = useState<any | null>(null); 
  const [etaTime, setEtaTime] = useState(12);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const userOtpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  // === PARTNER STATES ===
  const [partnerLoggedIn, setPartnerLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); 
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null); 
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState(''); 
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [serviceType, setServiceType] = useState('Mechanic');

  // === IMAGE PICKER FUNCTION ===
  const pickPartnerImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Bhai photo ke liye gallery permission chahiye!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPartnerAvatar(result.assets[0].uri);
    }
  };

  const dictionary = useMemo(() => ({
    en: {
      tagline: 'Instant Roadside Support Anywhere',
      userWelcome: 'Welcome Driver 👋',
      partnerWelcome: 'Partner Workspace Dashboard 🛠️',
      userVerify: 'Secure User Verification Profile',
      partnerQuick: 'Registered Partner Phone Login',
      shopReg: 'New Garage/Shop Registration Form',
      emergencyTitle: '🚨 Emergency Road Assistance Services',
      puncture: 'Puncture', fuel: 'Fuel Delivery', mechanic: 'Mechanic Visit',
      vehicleType: '🛸 1. Select Vehicle Type:',
      problemType: '⚙️ 2. Select Common Problem:',
      customMsgPlaceholder: 'Type your issue or tap mic to speak...',
      broadcastBtn: 'Send Request', 
      fuelCat: '⛽ Select Fuel Category:',
      quantity: '🛢️ Quantity Required:',
      tyreLoc: '📍 Select Tyre Location:',
      tyreKind: '⭕ Select Tyre Structure Type:',
      shopLocationLabel: 'Shop Exact Coordinates/Address:',
      ownerName: 'Mechanic Owner Name:',
      shopNamePlace: 'Shop / Garage Name',
      fetchLocationBtn: '📍 Fetch Current GPS Address',
      nearbyHeading: '📡 Nearest Active Support Providers:'
    },
    hi: {
      tagline: 'कहीं भी कहीं भी तुरंत रोड असिस्टेंस सहायता',
      userWelcome: 'आपका स्वागत है वाहन चालक 👋',
      partnerWelcome: 'पार्टनर वर्कस्पेस डैशबोर्ड 🛠️',
      userVerify: 'सुरक्षित यूज़र वेरिफिकेशन प्रोफाइल',
      partnerQuick: 'पार्टनर लॉगिन (पंजीकृत मोबाइल नंबर)',
      shopReg: 'दुकान का नया रजिस्ट्रेशन फॉर्म',
      emergencyTitle: '🚨 आपातकालीन सहायता सेवाएं',
      puncture: 'टायर पंचर सुधार', fuel: 'इमर्जेंसी ईंधन/तेल', mechanic: 'मैकेनिक को बुलाएं',
      vehicleType: '🛸 1. वाहन का प्रकार चुनें:',
      problemType: '⚙️ 2. होने वाली मुख्य समस्या चुनें:',
      customMsgPlaceholder: 'अपनी समस्या लिखें या माइक बटन दबाकर बोलें...',
      broadcastBtn: 'Send Request', 
      fuelCat: '⛽ तेल का प्रकार चुनें:',
      quantity: '🛢️ ईंधन की मात्रा चुनें:',
      tyreLoc: '📍 टायर का स्थान चुनें:',
      tyreKind: '⭕ टायर का प्रकार चुनें:',
      shopLocationLabel: 'दुकान का पूरा पता / लाइव लोकेशन:',
      ownerName: 'दुकान मालिक/मैकेनिक का नाम:',
      shopNamePlace: 'दुकान या गैराज का नाम',
      fetchLocationBtn: '📍 लाइव करंट लोकेशन ऑटो-फेट्च करें',
      nearbyHeading: '📡 आस-पास सक्रिय सहायता केंद्र:'
    }
  }), []);

  const fetchNearbyDatabasePartners = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/partners`);
      if (response.data) setMechanicsList(response.data); 
    } catch (error) { 
      console.log("Network status logs: API unreachable currently."); 
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user_session');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserName(parsed.name); setUserPhone(parsed.phone);
        setUserLoggedIn(true); setAuthSelection('USER');
      }
      const savedPartner = await AsyncStorage.getItem('partner_session');
      if (savedPartner) {
        const parsed = JSON.parse(savedPartner);
        setPartnerPhone(parsed.phone); setPartnerName(parsed.name);
        setShopName(parsed.shopName); setShopAddress(parsed.shopAddress || '');
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
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "GPS Permission allow kijiye live tracking ke liye!");
      return;
    }
    try {
      let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude });
    } catch (e) {
      let lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) setLocation({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude });
    }
  }, []);

  useEffect(() => {
    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    const currentSocket = socketRef.current;

    currentSocket.on("connect", () => { 
      console.log("Connected to server via socket:", currentSocket.id); 
    });
    
    currentSocket.on("NEW_SOS_REQUEST", (data) => {
      setIncomingSOS(data);
      Alert.alert("🚨 NAYA EMERGENCY SOS ALERT!", `${data.userName} ko ${data.serviceType.toUpperCase()} ki zaroorat hai!`);
    });

    currentSocket.on("BOOKING_STATUS_CHANGED", (data) => {
      if (data.status === 'accepted') {
        setTrackingRequest({ partnerName: data.partnerName, shopName: data.shopName, rating: "4.9 ⭐" });
        Alert.alert("🚨 Request Accepted!", `${data.partnerName} aapki madad ke liye nikal chuka hai.`);
      }
    });

    // 🛡️ ULTRA SAFE EVENT HANDLERS ASSIGNMENT
    if (NativeVoiceModule && typeof NativeVoiceModule.start === 'function' && Voice) {
      try {
        console.log("Voice module is available, assigning event handlers safely.");
        Object.assign(Voice, {
          onSpeechStart: () => setIsListening(true),
          onSpeechEnd: () => setIsListening(false),
          onSpeechResults: (e: any) => {
            if (e.value && e.value.length > 0) { setCustomDescription(e.value[0]); }
          },
          onSpeechError: (e: any) => {
            console.log("Internal speech error ignored:", e);
          }
        });
      } catch (voiceAssignError) {
        console.log("Voice alignment bypassed smoothly:", voiceAssignError);
      }
    }

    checkSession(); 
    getUserLocation(); 
    fetchNearbyDatabasePartners(); 

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && currentSocket && !currentSocket.connected) {
        currentSocket.connect();
      }
    });
    
    return () => { 
      // Safe cleanup strategy to prevent null property updates
      if (NativeVoiceModule && typeof NativeVoiceModule.destroy === 'function' && Voice) {
        try {
          Voice.destroy()
            .then(() => { 
              try {
                if (typeof Voice.removeAllListeners === 'function') Voice.removeAllListeners(); 
              } catch(e){}
            })
            .catch(err => console.log("Cleanup handled safely:", err)); 
        } catch (cleanupErr) {
          console.log("Intercepted block unmount cleanup error:", cleanupErr);
        }
      }
      subscription.remove();
      if (currentSocket) {
        currentSocket.off("connect");
        currentSocket.off("NEW_SOS_REQUEST");
        currentSocket.off("BOOKING_STATUS_CHANGED");
        currentSocket.disconnect();
      }
    };
  }, [checkSession, getUserLocation, fetchNearbyDatabasePartners, authSelection, partnerLoggedIn, userLoggedIn]);

  useEffect(() => {
    let timer: any;
    if (trackingRequest && etaTime > 1) {
      timer = setInterval(() => { setEtaTime((prev) => prev - 1); }, 60000);
    }
    return () => clearInterval(timer);
  }, [trackingRequest, etaTime]);

  const triggerVoiceDictation = async () => {
    if (!NativeVoiceModule || typeof NativeVoiceModule.start !== 'function') {
      setIsListening(true);
      setTimeout(() => { 
        setCustomDescription("Mera gaadi kharab ho gaya hai, help chahiye."); 
        setIsListening(false); 
      }, 1200);
      return;
    }

    try {
      if (isListening) { 
        await Voice.stop(); 
        setIsListening(false); 
      } else { 
        setCustomDescription(""); 
        await Voice.start('hi-IN'); 
      }
    } catch (error) {
      setIsListening(false);
      console.log("Voice module bypass action logs:", error);
    }
  };

  const fetchLiveCurrentShopAddress = async () => {
    if (!location) return;
    setFetchingAddress(true);
    try {
      let reverseGeo = await Location.reverseGeocodeAsync({ latitude: location.latitude, longitude: location.longitude });
      if (reverseGeo.length > 0) {
        let addr = reverseGeo[0];
        setShopAddress(`${addr.name || ''}, ${addr.street || ''}, ${addr.city || ''}`);
      }
    } catch (error) { 
      console.log(error); 
    } finally { 
      setFetchingAddress(false); 
    }
  };

  const handleSOSBroadcast = async () => {
    if (!location) {
      Alert.alert("GPS Error", "Bhai abhi tak phone ki live location nahi mila hai. Intezar karein!");
      return;
    }

    setModalVisible(false);

    let finalDescription = '';
    if (customDescription.trim()) {
      finalDescription = customDescription;
    } else {
      if (activeService === 'Fuel') {
        finalDescription = `Need Fuel: ${fuelQuantity} of ${fuelType.toUpperCase()} for ${selectedVehicle.toUpperCase()}`;
      } else if (activeService === 'Puncture') {
        finalDescription = `Tyre Puncture: ${tyreType.toUpperCase()} tyre (${tyreStructure.toUpperCase()}) of ${selectedVehicle.toUpperCase()}`;
      } else if (activeService === 'Mechanic') {
        finalDescription = `Mechanic Needed: ${selectedProblem || 'General Issue'} for ${selectedVehicle.toUpperCase()}`;
      } else {
        finalDescription = `Emergency Assistance Needed for ${selectedVehicle.toUpperCase()}`;
      }
    }

    try {
      const payload = {
        userName: userName || "Test Driver", 
        userMobile: userPhone || "9999999999", 
        serviceType: activeService.toLowerCase() || "mechanic",         
        vehicleType: selectedVehicle || "car",      
        description: finalDescription,      
        pickupLocation: "Live GPS Coordinates",
        latitude: location.latitude, 
        longitude: location.longitude 
      };
  
      console.log("🌐 SENDING LIVE DATA TO BACKEND:", payload);
      await axios.post(`${API_BASE_URL}/bookings/create`, payload);
      Alert.alert("Broadcast Live", "SOS sent! Waiting for near active partner dashboard confirmation...");
    } catch (error) {
      console.log("Network logic handling mock trigger.");
    }
  };

  const handleUserSendOtp = async () => {
    if (!userName || userPhone.length !== 10) {
      Alert.alert("Validation Error", "Please enter valid credential inputs.");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/send-otp`, { phone: userPhone, name: userName });
      setUserOtpSent(true);
    } catch (error) { 
      setUserOtpSent(true); 
    }
  };

  const autoSubmitOtpWithData = async (completeOtp: string) => {
    if (completeOtp.length !== 4) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { phone: userPhone, otp: completeOtp });
      if (response.data) {
        await AsyncStorage.setItem('user_session', JSON.stringify({ name: userName, phone: userPhone, token: response.data.token }));
        setUserLoggedIn(true);
        getUserLocation();
      }
    } catch (error) {
      await AsyncStorage.setItem('user_session', JSON.stringify({ name: userName, phone: userPhone, token: 'offline_token' }));
      setUserLoggedIn(true);
      getUserLocation();
    }
  };

  const handleOtpInputChange = (text: string, index: number) => {
    const newOtp = [...userOtp];
    newOtp[index] = text;
    setUserOtp(newOtp);

    if (text.length > 0 && index < 3) {
      userOtpRefs[index + 1].current?.focus();
    }

    const fullOtpCombined = newOtp.join('');
    if (fullOtpCombined.length === 4) {
      autoSubmitOtpWithData(fullOtpCombined);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && userOtp[index] === '' && index > 0) {
      const newOtp = [...userOtp];
      newOtp[index - 1] = ''; 
      setUserOtp(newOtp);
      userOtpRefs[index - 1].current?.focus(); 
    }
  };

  const handleSendChatMessage = () => {
    if (!typedMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: typedMessage,
      timestamp: 'Just now'
    };

    if (socketRef.current) {
      socketRef.current.emit("SEND_CHAT_MESSAGE", {
        text: typedMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setChatMessages(prev => [...prev, newMsg]);
    setTypedMessage('');
  };

  const handleUserVerifyOtp = () => { autoSubmitOtpWithData(userOtp.join('')); };
  const handlePartnerRegister = async () => { setPartnerLoggedIn(true); };
  const handlePartnerLogin = async () => { setPartnerLoggedIn(true); };
  const handleSystemLogout = async () => {
    await AsyncStorage.clear();
    setUserLoggedIn(false); setUserOtpSent(false); setUserOtp(['', '', '', '']);
    setPartnerLoggedIn(false); setAuthSelection('NONE'); setLocation(null); setIncomingSOS(null); setTrackingRequest(null);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0F172A" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.appTopNavBar}>
        <View>
          <Text style={styles.appLogoMainBrand}>🚗 VehicleHelp</Text>
          <Text style={styles.topBarWelcomeSubtitle}>{authSelection === 'USER' && userLoggedIn ? `Driver: ${userName} 👋` : 'Instant Support Hub'}</Text>
        </View>
        <TouchableOpacity style={styles.langSquareUnit} onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>{lang === 'en' ? 'HI' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      {authSelection === 'NONE' && (
        <View style={styles.landingWrapperCenter}>
          <Text style={styles.landingMainHeaderBrand}>Welcome to VehicleHelp ✨</Text>
          <Text style={styles.landingSubheadingBrand}>{dictionary[lang].tagline}</Text>
          
          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => setAuthSelection('USER')}>
            <Text style={styles.landingBigBtnIcon}>🚙</Text>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.landingBigBtnTitle}>Continue as Driver</Text>
              <Text style={styles.landingBigBtnDesc}>Get instant roadside assistance or vehicle repair</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.landingBigSelectionBtn, { backgroundColor: '#059669', marginTop: 16 }]} onPress={() => setAuthSelection('PARTNER')}>
            <Text style={styles.landingBigBtnIcon}>🛠️</Text>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.landingBigBtnTitle}>Register as Service Partner</Text>
              <Text style={styles.landingBigBtnDesc}>Provide puncture, fuel, or towing services nearby</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {authSelection === 'USER' && (
        !userLoggedIn ? (
          <View style={styles.authWrapperCenter}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={styles.authCardHeaderLabel}>{dictionary[lang].userVerify}</Text>
              {!userOtpSent ? (
                <>
                  <TextInput style={styles.appFormInputBox} placeholder="Driver Full Name" value={userName} onChangeText={setUserName} placeholderTextColor="#94A3B8" />
                  <TextInput style={styles.appFormInputBox} placeholder="10 Digit Mobile Number" keyboardType="phone-pad" maxLength={10} value={userPhone} onChangeText={setUserPhone} placeholderTextColor="#94A3B8" />
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#0F172A' }]} onPress={handleUserSendOtp}>
                    <Text style={styles.authBtnTextString}>Generate Verification OTP 📩</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAuthSelection('NONE')} style={{ marginTop: 15, alignItems: 'center' }}><Text style={{ color: '#64748B' }}>← Go Back to Front Page</Text></TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.otpHelperNotice}>Enter code dispatched to +91 {userPhone}</Text>
                  <View style={styles.otpGridRowFlex}>
                    {[0, 1, 2, 3].map((idx) => (
                      <TextInput 
                        key={idx} 
                        ref={userOtpRefs[idx]} 
                        style={styles.otpNumericalSquareCell} 
                        keyboardType="number-pad" 
                        maxLength={1} 
                        value={userOtp[idx]} 
                        onChangeText={(t) => handleOtpInputChange(t, idx)}
                        onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                        selectTextOnFocus={true}
                      />
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#3B82F6' }]} onPress={handleUserVerifyOtp}>
                    <Text style={styles.authBtnTextString}>Confirm Code & Open Map 🔓</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.mapCanvasContainerFrame}>
              <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} region={{ latitude: location?.latitude || 28.4595, longitude: location?.longitude || 77.0266, latitudeDelta: 0.015, longitudeDelta: 0.015 }}>
                {location && <Marker coordinate={location} title="Your Live Spot" pinColor="blue" />}
              </MapView>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 25 }}>
              {!trackingRequest ? (
                <View style={styles.userDashboardDockPanel}>
                  <Text style={styles.dockMainTitleString}>{dictionary[lang].emergencyTitle}</Text>
                  <View style={styles.dockThreeButtonSplitRow}>
                    <TouchableOpacity style={styles.dockModuleButtonUnit} onPress={() => { setActiveService('Puncture'); setModalVisible(true); }}>
                      <Text style={styles.dockModuleIconGlyph}>🛞</Text>
                      <Text style={styles.dockModuleLabelText}>{dictionary[lang].puncture}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dockModuleButtonUnit} onPress={() => { setActiveService('Fuel'); setModalVisible(true); }}>
                      <Text style={styles.dockModuleIconGlyph}>⛽</Text>
                      <Text style={styles.dockModuleLabelText}>{dictionary[lang].fuel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dockModuleButtonUnit} onPress={() => { setActiveService('Mechanic'); setModalVisible(true); }}>
                      <Text style={styles.dockModuleIconGlyph}>🛠️</Text>
                      <Text style={styles.dockModuleLabelText}>{dictionary[lang].mechanic}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.activeTrackingRadarPanelCard}>
                  <Text style={styles.radarPulseHeaderTitle}>⚡ Rescue Unit Dispatched (ETA: {etaTime} Mins)</Text>
                  <Text style={styles.operatorNameHeadingString}>{trackingRequest.partnerName}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{trackingRequest.shopName}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={styles.radarCallActionBtn} onPress={() => Alert.alert("Calling support...")}><Text style={styles.radarCallActionBtnText}>📞 Call {trackingRequest.rating}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.radarChatActionBtn} onPress={() => setChatModalVisible(true)}><Text style={styles.radarChatActionBtnText}>💬 Chat</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.radarCancelActionBtn} onPress={() => setTrackingRequest(null)}><Text style={styles.radarCancelActionBtnText}>Cancel</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={{ paddingHorizontal: 16, marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>{dictionary[lang].nearbyHeading}</Text>
                <TouchableOpacity style={styles.logoutBtnSquare} onPress={handleSystemLogout}><Text style={styles.logoutBtnSquareText}>Logout 🛑</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )
      )}

      {authSelection === 'PARTNER' && (
        !partnerLoggedIn ? (
          <View style={[styles.authWrapperCenter, { backgroundColor: '#059669' }]}>
            <View style={styles.authDisplayCardFrame}>
              <Text style={[styles.authCardHeaderLabel, { color: '#059669' }]}>{isRegistering ? dictionary[lang].shopReg : dictionary[lang].partnerQuick}</Text>
              {isRegistering ? (
                <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
                  <TouchableOpacity style={styles.avatarPickerBtn} onPress={pickPartnerImage}>
                    {partnerAvatar ? (
                      <Image source={{ uri: partnerAvatar }} style={styles.partnerAvatarImage} />
                    ) : (
                      <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12 }}>📸 Upload Partner Profile Pic</Text>
                    )}
                  </TouchableOpacity>

                  <TextInput style={styles.appFormInputBox} placeholder={dictionary[lang].shopNamePlace} value={shopName} onChangeText={setShopName} />
                  <TextInput style={styles.appFormInputBox} placeholder="Owner Full Name" value={partnerName} onChangeText={setPartnerName} />
                  <TextInput style={styles.appFormInputBox} placeholder="10 Digit Number" keyboardType="phone-pad" maxLength={10} value={partnerPhone} onChangeText={setPartnerPhone} />
                  
                  <Text style={styles.formLabelTextSmall}>🔧 Select Service Category Type:</Text>
                  <View style={styles.pickerWrapperFrame}>
                    <Picker selectedValue={serviceType} onValueChange={(itemValue) => setServiceType(itemValue)}>
                      <Picker.Item label="Mechanic (General Repair) 🛠️" value="Mechanic" />
                      <Picker.Item label="Puncture Shop (Tyre Expert) 🛞" value="Puncture" />
                      <Picker.Item label="Fuel Provider (Emergency Delivery) ⛽" value="Fuel" />
                    </Picker>
                  </View>

                  <TouchableOpacity style={styles.gpsSyncActionBtnElement} onPress={fetchLiveCurrentShopAddress}>
                    {fetchingAddress ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={styles.gpsSyncActionBtnTextString}>{dictionary[lang].fetchLocationBtn}</Text>}
                  </TouchableOpacity>
                  <TextInput style={styles.appFormInputBox} placeholder="Full Store Address Block" value={shopAddress} onChangeText={setShopAddress} />
                  
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#059669', marginTop: 10 }]} onPress={handlePartnerRegister}>
                    <Text style={styles.authBtnTextString}>Commit Garage Registration 🛠️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => setIsRegistering(false)} style={{ marginTop: 15, alignItems: 'center' }}><Text style={{ color: '#2563EB' }}>Already registered? Log In</Text></TouchableOpacity>
                </ScrollView>
              ) : (
                <>
                  <TextInput style={styles.appFormInputBox} placeholder="Registered Mobile Number" keyboardType="phone-pad" maxLength={10} value={partnerPhone} onChangeText={setPartnerPhone} />
                  <TouchableOpacity style={[styles.authSubmissionActionBtn, { backgroundColor: '#059669' }]} onPress={handlePartnerLogin}>
                    <Text style={styles.authBtnTextString}>Verify Station Identity 🔓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsRegistering(true)} style={{ marginTop: 16, alignItems: 'center' }}><Text style={{ color: '#2563EB' }}>Create Store Account</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setAuthSelection('NONE')} style={{ marginTop: 15, alignItems: 'center' }}><Text style={{ color: '#64748B' }}>← Go Back</Text></TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.partnerMainSuiteConsoleBodyContainer}>
            <View style={styles.partnerIdentityMonitorCardFrame}>
              <Text style={styles.partnerConsoleShopHeadingTextString}>{shopName || "Chauhan Garage"}</Text>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Welcome to Partner Hub Console Panel 🟢 Active</Text>
            </View>

            {incomingSOS ? (
              <View style={{ backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1, padding: 16, borderRadius: 12, marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#DC2626' }}>🚨 Emergency Request Recieved!</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', marginTop: 6, color: '#000' }}>Driver: {incomingSOS.userName}</Text>
                <Text style={{ fontSize: 13, color: '#475569' }}>Phone: {incomingSOS.userMobile}</Text>
                <Text style={{ fontSize: 13, color: '#475569' }}>Issue: {incomingSOS.description}</Text>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: 'bold', marginTop: 4 }}>Coordinates: {incomingSOS.latitude}, {incomingSOS.longitude}</Text>
                
                <View style={{ flexDirection: 'row', marginTop: 15 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 40, backgroundColor: '#059669', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
                    onPress={async () => {
                      try {
                        await axios.put(`${API_BASE_URL}/bookings/update-status/${incomingSOS.bookingId}`, {
                          status: 'accepted',
                          partnerName: partnerName || "Satish Kumar",
                          shopName: shopName || "Chauhan Automobile"
                        });
                        setIncomingSOS(null);
                        Alert.alert("Success", "Aapne request accept kar li hai. Driver ko notify kar diya hai!");
                      } catch (e) {
                        console.log("Error accepting booking route status update:", e);
                      }
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✅ Accept Request</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ width: 80, height: 40, backgroundColor: '#EF4444', borderRadius: 6, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setIncomingSOS(null)}
                  >
                    <Text style={{ color: '#FFF' }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>Naye emergency requests ka wait ho raha hai...</Text>
              </View>
            )}

            <TouchableOpacity style={styles.consoleLogoutBottomActionBtn} onPress={handleSystemLogout}>
              <Text style={{ color: '#EF4444', fontWeight: '700', textAlign: 'center' }}>Logout Console 🛑</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* SOS Service Setup Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdropOverlay}>
          <View style={styles.modalContentWhiteCard}>
            <Text style={styles.modalHeadingTitleString}>Configure {activeService} Details</Text>
            
            <Text style={styles.formLabelTextSmall}>{dictionary[lang].vehicleType}</Text>
            <View style={styles.modalPickerWrapper}>
              <Picker selectedValue={selectedVehicle} onValueChange={(val) => setSelectedVehicle(val)}>
                <Picker.Item label="Car / Hatchback 🚗" value="car" />
                <Picker.Item label="Bike / Motorcycle 🏍️" value="bike" />
                <Picker.Item label="Heavy Truck / Bus 🚛" value="truck" />
              </Picker>
            </View>

            {activeService === 'Fuel' && (
              <>
                <Text style={styles.formLabelTextSmall}>{dictionary[lang].fuelCat}</Text>
                <View style={styles.modalPickerWrapper}>
                  <Picker selectedValue={fuelType} onValueChange={(val) => setFuelType(val)}>
                    <Picker.Item label="Petrol" value="petrol" />
                    <Picker.Item label="Diesel" value="diesel" />
                  </Picker>
                </View>
                <Text style={styles.formLabelTextSmall}>{dictionary[lang].quantity}</Text>
                <View style={styles.modalPickerWrapper}>
                  <Picker selectedValue={fuelQuantity} onValueChange={(val) => setFuelQuantity(val)}>
                    <Picker.Item label="2 Liters" value="2L" />
                    <Picker.Item label="5 Liters" value="5L" />
                    <Picker.Item label="10 Liters" value="10L" />
                  </Picker>
                </View>
              </>
            )}

            {activeService === 'Puncture' && (
              <>
                <Text style={styles.formLabelTextSmall}>{dictionary[lang].tyreLoc}</Text>
                <View style={styles.modalPickerWrapper}>
                  <Picker selectedValue={tyreType} onValueChange={(val) => setTyreType(val)}>
                    <Picker.Item label="Front Tyre" value="front" />
                    <Picker.Item label="Rear Tyre" value="rear" />
                  </Picker>
                </View>
                <Text style={styles.formLabelTextSmall}>{dictionary[lang].tyreKind}</Text>
                <View style={styles.modalPickerWrapper}>
                  <Picker selectedValue={tyreStructure} onValueChange={(val) => setTyreStructure(val)}>
                    <Picker.Item label="Tubeless" value="tubeless" />
                    <Picker.Item label="With Tube" value="tube" />
                  </Picker>
                </View>
              </>
            )}

            {activeService === 'Mechanic' && (
              <>
                <Text style={styles.formLabelTextSmall}>{dictionary[lang].problemType}</Text>
                <View style={styles.modalPickerWrapper}>
                  <Picker selectedValue={selectedProblem} onValueChange={(val) => setSelectedProblem(val)}>
                    <Picker.Item label="Engine Overheating 🌡️" value="Engine Overheat" />
                    <Picker.Item label="Battery Dead / Kick Start Issue 🔋" value="Battery Dead" />
                    <Picker.Item label="Brake Failure / Sound 🛑" value="Brake Issue" />
                    <Picker.Item label="Gear Stuck / Clutch Slack ⚙️" value="Clutch Gear Issue" />
                  </Picker>
                </View>
              </>
            )}

            <View style={styles.customSpeakInputRow}>
              <TextInput style={styles.modalTextInputBox} placeholder={dictionary[lang].customMsgPlaceholder} value={customDescription} onChangeText={setCustomDescription} />
              <TouchableOpacity style={styles.micCircleBtn} onPress={triggerVoiceDictation}>
                <Text style={{ fontSize: 18 }}>{isListening ? "🎙️" : "🎤"}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSOSBroadcast}>
                <Text style={styles.modalSubmitBtnText}>{dictionary[lang].broadcastBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Live Chat Modal */}
      <Modal visible={chatModalVisible} animationType="slide" transparent={true} onRequestClose={() => setChatModalVisible(false)}>
        <View style={styles.modalBackdropOverlay}>
          <View style={[styles.modalContentWhiteCard, { height: '80%' }]}>
            <Text style={styles.modalHeadingTitleString}>Support Chat Window</Text>
            
            <ScrollView style={{ flex: 1, marginVertical: 10 }}>
              {chatMessages.map((msg) => (
                <View key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#3B82F6' : '#F1F5F9', padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '80%' }}>
                  <Text style={{ color: msg.sender === 'user' ? '#FFF' : '#000', fontSize: 14 }}>{msg.text}</Text>
                  <Text style={{ color: msg.sender === 'user' ? '#E2E8F0' : '#64748B', fontSize: 10, textAlign: 'right', marginTop: 4 }}>{msg.timestamp}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput style={[styles.appFormInputBox, { flex: 1, marginBottom: 0 }]} placeholder="Type your message..." value={typedMessage} onChangeText={setTypedMessage} />
              <TouchableOpacity style={{ marginLeft: 10, backgroundColor: '#3B82F6', width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }} onPress={handleSendChatMessage}>
                <Text style={{ color: '#FFF', fontSize: 16 }}>➡️</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 15, width: '100%' }]} onPress={() => setChatModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appTopNavBar: { height: 75, backgroundColor: '#0F172A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 15 },
  appLogoMainBrand: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  topBarWelcomeSubtitle: { color: '#94A3B8', fontSize: 11 },
  langSquareUnit: { backgroundColor: '#334155', width: 35, height: 35, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  
  landingWrapperCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  landingMainHeaderBrand: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 5 },
  landingSubheadingBrand: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 40 },
  landingBigSelectionBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  landingBigBtnIcon: { fontSize: 32 },
  landingBigBtnTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  landingBigBtnDesc: { color: '#E2E8F0', fontSize: 12, marginTop: 4, width: '90%' },

  authWrapperCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#1E293B' },
  authDisplayCardFrame: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 5 },
  authCardHeaderLabel: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 15, textAlign: 'center' },
  appFormInputBox: { height: 48, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 12 },
  authSubmissionActionBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  authBtnTextString: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  otpHelperNotice: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 15 },
  otpGridRowFlex: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpNumericalSquareCell: { width: 55, height: 55, borderColor: '#3B82F6', borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#0F172A', backgroundColor: '#F0FDF4' },
  
  mapCanvasContainerFrame: { height: Dimensions.get('window').height * 0.45, width: '100%' },
  userDashboardDockPanel: { padding: 16, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -15, elevation: 4 },
  dockMainTitleString: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
  dockThreeButtonSplitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dockModuleButtonUnit: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 15, alignItems: 'center', marginHorizontal: 5 },
  dockModuleIconGlyph: { fontSize: 24 },
  dockModuleLabelText: { fontSize: 11, fontWeight: 'bold', color: '#334155', marginTop: 8 },

  activeTrackingRadarPanelCard: { margin: 16, padding: 16, backgroundColor: '#FFF', borderRadius: 12, elevation: 4 },
  radarPulseHeaderTitle: { color: '#10B981', fontWeight: 'bold', fontSize: 14 },
  operatorNameHeadingString: { fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  radarCallActionBtn: { backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  radarCallActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  radarChatActionBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  radarChatActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  radarCancelActionBtn: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  radarCancelActionBtnText: { color: '#FFF', fontSize: 12 },

  logoutBtnSquare: { backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  logoutBtnSquareText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  avatarPickerBtn: { alignSelf: 'center', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9', borderStyle: 'dashed', borderWidth: 2, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  partnerAvatarImage: { width: 86, height: 86, borderRadius: 43 },
  formLabelTextSmall: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 5, marginTop: 5 },
  pickerWrapperFrame: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#F8FAFC', marginBottom: 12, overflow: 'hidden' },
  gpsSyncActionBtnElement: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 12 },
  gpsSyncActionBtnTextString: { color: '#2563EB', fontWeight: 'bold', fontSize: 12 },

  partnerMainSuiteConsoleBodyContainer: { flex: 1, padding: 16 },
  partnerIdentityMonitorCardFrame: { padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderLeftWidth: 5, borderLeftColor: '#059669', elevation: 2 },
  partnerConsoleShopHeadingTextString: { fontSize: 18, fontWeight: 'bold' },
  consoleLogoutBottomActionBtn: { position: 'absolute', bottom: 20, left: 16, right: 16, padding: 15, borderRadius: 10, borderColor: '#EF4444', borderWidth: 1, alignItems: 'center' },

  modalBackdropOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentWhiteCard: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeadingTitleString: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalPickerWrapper: { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  customSpeakInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  modalTextInputBox: { flex: 1, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: '#F8FAFC' },
  micCircleBtn: { marginLeft: 10, width: 45, height: 45, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  modalSubmitBtn: { flex: 1, backgroundColor: '#3B82F6', padding: 14, borderRadius: 8, alignItems: 'center', marginRight: 10 },
  modalSubmitBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalCloseBtn: { padding: 14, borderRadius: 8, borderColor: '#CBD5E1', borderWidth: 1, width: 100, alignItems: 'center' },
  modalCloseBtnText: { color: '#64748B' }
});