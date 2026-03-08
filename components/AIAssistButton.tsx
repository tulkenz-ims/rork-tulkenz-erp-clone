import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import {
  Mic,
  MicOff,
  X,
  Send,
  Camera,
  Volume2,
  VolumeX,
  Wrench,
  Package,
  Zap,
  AlertTriangle,
  CheckCircle,
  Search,
  MessageCircle,
  Bot,
  User,
  Navigation,
  ClipboardList,
  Thermometer,
  Bug,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useAIActions } from '@/hooks/useAIActions';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolName?: string;
  params?: Record<string, unknown>;
  image?: string;
  timestamp: Date;
  isResult?: boolean;
}

// Raw Claude-format message for conversation history (sent to API)
interface ConversationTurn {
  role: 'user' | 'assistant';
  content: any;
}

interface AIResponse {
  success: boolean;
  action: string;
  tool_name: string | null;
  speech: string | null;
  params: Record<string, unknown>;
  needs_photo?: boolean;
  conversation_continue?: boolean;
  assistant_message?: ConversationTurn;
}

// ══════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════

const AI_ASSIST_URL = '/api/ai-assist';

// Maps tool_name → icon + color for the action badge
const TOOL_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  // Task Feed templates
  create_task_feed_post_broken_glove:        { icon: AlertTriangle, color: '#F97316', label: 'Broken Glove' },
  create_task_feed_post_foreign_material:    { icon: AlertTriangle, color: '#EF4444', label: 'Foreign Material' },
  create_task_feed_post_chemical_spill:      { icon: AlertTriangle, color: '#F59E0B', label: 'Chemical Spill' },
  create_task_feed_post_employee_injury:     { icon: Shield,         color: '#EF4444', label: 'Employee Injury' },
  create_task_feed_post_equipment_breakdown: { icon: Wrench,         color: '#3B82F6', label: 'Equipment Breakdown' },
  create_task_feed_post_metal_detector_reject:{ icon: AlertTriangle, color: '#8B5CF6', label: 'Metal Detector Reject' },
  create_task_feed_post_pest_sighting:       { icon: Bug,            color: '#84CC16', label: 'Pest Sighting' },
  create_task_feed_post_temperature_deviation:{ icon: Thermometer,   color: '#06B6D4', label: 'Temp Deviation' },
  create_task_feed_post_customer_complaint:  { icon: MessageCircle,  color: '#EC4899', label: 'Customer Complaint' },
  create_task_feed_post_generic:             { icon: Zap,            color: '#F97316', label: 'Task Feed Post' },
  create_task_feed_post:                     { icon: Zap,            color: '#F97316', label: 'Task Feed Post' },
  // Query
  query_task_feed:                           { icon: ClipboardList,  color: '#6366F1', label: 'Task Feed Query' },
  // Work Orders / Pre-Op
  create_work_order:                         { icon: Wrench,         color: '#3B82F6', label: 'Work Order' },
  start_pre_op:                              { icon: CheckCircle,    color: '#10B981', label: 'Pre-Op' },
  // Equipment / Parts
  lookup_part:                               { icon: Package,        color: '#F59E0B', label: 'Parts Lookup' },
  lookup_equipment:                          { icon: Wrench,         color: '#3B82F6', label: 'Equipment Lookup' },
  diagnose_issue:                            { icon: AlertTriangle,  color: '#EF4444', label: 'Diagnosis' },
  // Production
  start_production_run:                      { icon: Zap,            color: '#8B5CF6', label: 'Production Run' },
  end_production_run:                        { icon: Zap,            color: '#6366F1', label: 'End Run' },
  change_room_status:                        { icon: Zap,            color: '#06B6D4', label: 'Room Status' },
  // Navigation
  navigate:                                  { icon: Navigation,     color: '#10B981', label: 'Navigate' },
  // Utility
  ask_clarification:                         { icon: MessageCircle,  color: '#F59E0B', label: 'Clarifying' },
  general_response:                          { icon: MessageCircle,  color: '#6366F1', label: 'Info' },
  // Legacy / fallback
  info:                                      { icon: MessageCircle,  color: '#6366F1', label: 'Info' },
  clarify:                                   { icon: MessageCircle,  color: '#F59E0B', label: 'Clarifying' },
  search:                                    { icon: Search,         color: '#8B5CF6', label: 'Search' },
};

// ══════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION
// ══════════════════════════════════════════════════════════════════

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[AIAssist] Speech recognition not supported');
        return false;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0].transcript;
          else interimTranscript += result[0].transcript;
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('[AIAssist] Speech error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setTranscript('');
      return true;
    }
    return false;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, setTranscript };
}

// ══════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AIAssistButton() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { executeAction: executeAIAction } = useAIActions();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [pendingImage, setPendingImage] = useState<{
    uri: string; base64: string; mediaType: string;
  } | null>(null);

  // Raw Claude-format history for multi-turn API calls
  const conversationHistoryRef = useRef<ConversationTurn[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isListening, transcript, startListening, stopListening, setTranscript } =
    useSpeechRecognition();

  // ── Load saved chat on mount ──
  useEffect(() => {
    const chatKey = `ai_chat_${user?.id || 'default'}`;
    AsyncStorage.getItem(chatKey).then(stored => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch (e) { console.warn('[AIAssist] Failed to parse saved chat'); }
      }
    });
  }, [user?.id]);

  // ── Save chat on change ──
  useEffect(() => {
    if (messages.length > 0) {
      const chatKey = `ai_chat_${user?.id || 'default'}`;
      AsyncStorage.setItem(chatKey, JSON.stringify(messages.slice(-50))).catch(() => {});
    }
  }, [messages, user?.id]);

  // ── Pulse animation ──
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── Transcript → text input ──
  useEffect(() => {
    if (transcript) setTextInput(transcript);
  }, [transcript]);

  // ── Auto-send when speech recognition stops ──
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      handleSend(transcript.trim());
      setTranscript('');
    }
  }, [isListening]);

  // ── Speak response ──
  const speakResponse = useCallback((text: string) => {
    if (!isSpeechEnabled || !text) return;
    try {
      Speech.speak(text, { language: 'en-US', pitch: 1.0, rate: 0.95 });
    } catch (err) {
      console.error('[AIAssist] Speech error:', err);
    }
  }, [isSpeechEnabled]);

  // ── Send command ──
  const handleSend = useCallback(async (commandText?: string) => {
    const text = commandText || textInput.trim();
    if (!text && !pendingImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Add user message to display
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text || '(Photo sent)',
      image: pendingImage?.uri,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setTextInput('');
    setIsProcessing(true);

    // Build user content for Claude conversation history (NOT added yet — added after response)
    const userContent: any[] = [];
    if (pendingImage) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: pendingImage.mediaType,
          data: pendingImage.base64,
        },
      });
    }
    if (text) {
      userContent.push({ type: 'text', text });
    }

    try {
      const body: Record<string, unknown> = {
        command: text,
        context: {
          screen: 'unknown',
          userName: user?.name || 'Operator',
          userRole: user?.role || 'operator',
          userDepartment: user?.department || 'unknown',
          currentRoom: null,
          activeRecordId: null,
        },
        // Send PRIOR history only — ai-assist.js appends the current message itself
        conversation: conversationHistoryRef.current.slice(-10),
      };

      if (pendingImage) {
        body.image = {
          data: pendingImage.base64,
          media_type: pendingImage.mediaType,
        };
        setPendingImage(null);
      }

      const response = await fetch(AI_ASSIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: AIResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'AI request failed');
      }

      // Resolve tool name + speech FIRST (needed for history storage below)
      const toolName = data.tool_name || data.action;
      const speechText = data.speech || 'Done.';

      // After successful response, add both turns to history.
      // CRITICAL: If assistant_message has a tool_use block, the Anthropic API
      // requires the next user message to have a matching tool_result block.
      // Since we do plain conversational follow-ups, we store a plain text
      // version of the assistant turn to avoid the API rejecting the next call.
      //
      // Also: NEVER store raw image base64 in history — it bloats the payload
      // and causes the API to fail on subsequent calls. Replace image blocks
      // with a lightweight text placeholder instead.
      const userContentForHistory = userContent.map((block: any) =>
        block.type === 'image'
          ? { type: 'text', text: '[Photo attached by user]' }
          : block
      );
      const userTurn: ConversationTurn = {
        role: 'user',
        content: userContentForHistory.length === 1 && userContentForHistory[0].type === 'text'
          ? userContentForHistory[0].text
          : userContentForHistory,
      };

      if (data.assistant_message) {
        const hasToolUse = Array.isArray(data.assistant_message.content) &&
          data.assistant_message.content.some((b: any) => b.type === 'tool_use');

        const assistantTurnToStore: ConversationTurn = hasToolUse
          ? { role: 'assistant', content: speechText }
          : data.assistant_message;

        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          userTurn,
          assistantTurnToStore,
        ];
        if (conversationHistoryRef.current.length > 20) {
          conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
        }
      }

      // Add Claude's response bubble
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: speechText,
        toolName,
        params: data.params,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      speakResponse(speechText);

      // ── If clarification needed, stop here — user needs to reply ──
      if (data.conversation_continue || toolName === 'ask_clarification' || toolName === 'clarify') {
        setIsProcessing(false);
        return;
      }

      // ── If photo needed, prompt user ──
      if (data.needs_photo) {
        const photoPromptMsg: ChatMessage = {
          id: `photo-prompt-${Date.now()}`,
          role: 'assistant',
          text: '📷 A photo is required for this report. Tap the camera icon and attach one, then I\'ll submit the report.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, photoPromptMsg]);
        speakResponse('A photo is required. Tap the camera icon to attach one.');
        setIsProcessing(false);
        return;
      }

      // ── Execute the tool action ──
      if (toolName && !['info', 'general_response'].includes(toolName)) {
        const actionResult = await executeAIAction(toolName, data.params || {});

        if (actionResult && actionResult.success && actionResult.message &&
            actionResult.message !== 'Information provided.' &&
            actionResult.message !== 'Waiting for clarification.') {

          const resultMsg: ChatMessage = {
            id: `result-${Date.now()}`,
            role: 'assistant',
            text: actionResult.message,
            toolName,
            params: actionResult.data as Record<string, unknown>,
            timestamp: new Date(),
            isResult: true,
          };
          setMessages(prev => [...prev, resultMsg]);

          if (actionResult.message !== speechText) {
            speakResponse(actionResult.message);
          }
        } else if (actionResult && !actionResult.success) {
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ ${actionResult.message || 'Action failed. Please try again.'}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      }

    } catch (err: any) {
      console.error('[AIAssist] Error:', err);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: `Sorry, I had trouble with that. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, pendingImage, user, speakResponse, executeAIAction]);

  // ── Mic ──
  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isListening) stopListening();
    else {
      const started = startListening();
      if (!started) console.log('[AIAssist] Speech unavailable — use text input');
    }
  }, [isListening, startListening, stopListening]);

  // ── Camera / Image Picker ──
  // On web: use a hidden <input type="file"> — most reliable way to get base64 in browser
  // On native: use expo-image-picker
  const fileInputRef = useRef<any>(null);

  const handleWebFilePicked = useCallback((e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix — API needs raw base64 only
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const mediaType = file.type || 'image/jpeg';
      const objectUrl = URL.createObjectURL(file);
      console.log(`[AIAssist] Web image loaded: ${Math.round(base64Data.length * 0.75 / 1024)}KB`);
      setPendingImage({ uri: objectUrl, base64: base64Data, mediaType });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCamera = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Web: trigger hidden file input directly — bypasses expo-image-picker entirely
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
      return;
    }

    // Native (iOS / Android)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let base64Data = asset.base64 || '';

        if (!base64Data && asset.uri) {
          try {
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (fsErr) {
            console.error('[AIAssist] FileSystem read failed:', fsErr);
          }
        }

        if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];

        if (!base64Data || base64Data.length < 100) {
          console.error('[AIAssist] Could not read image data');
          return;
        }

        setPendingImage({ uri: asset.uri, base64: base64Data, mediaType: 'image/jpeg' });
      }
    } catch (err) {
      console.error('[AIAssist] Image picker error:', err);
    }
  }, []);

  // ── Open / Close ──
  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: `Hey${user?.name ? ` ${user.name.split(' ')[0]}` : ''}, I'm your AI assistant. I can start a Pre-Op, report an issue, look up a part, diagnose equipment from a photo, or navigate anywhere in the app. What do you need?`,
        timestamp: new Date(),
      }]);
    }
  }, [messages.length, user?.name]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.stop();
    if (isListening) stopListening();
    setIsOpen(false);
  }, [isListening, stopListening]);

  const handleClearChat = useCallback(() => {
    Speech.stop();
    setMessages([]);
    setPendingImage(null);
    setTextInput('');
    conversationHistoryRef.current = [];
    AsyncStorage.removeItem(`ai_chat_${user?.id || 'default'}`).catch(() => {});
  }, [user?.id]);

  // ── Action badge ──
  const renderActionBadge = (toolName?: string) => {
    if (!toolName || ['info', 'general_response'].includes(toolName)) return null;
    const config = TOOL_ICONS[toolName] || { icon: MessageCircle, color: '#6366F1', label: toolName.replace(/_/g, ' ') };
    const IconComp = config.icon;
    return (
      <View style={[styles.actionBadge, { backgroundColor: config.color + '20', borderColor: config.color + '40' }]}>
        <IconComp size={12} color={config.color} />
        <Text style={[styles.actionBadgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Animated.View style={[styles.floatingButton, { transform: [{ scale: pulseAnim }] }]}>
          <Pressable
            style={[styles.floatingButtonInner, { backgroundColor: '#8B5CF6' }]}
            onPress={handleOpen}
          >
            <Bot size={26} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: '#8B5CF620' }]}>
                <Bot size={22} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                  {isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Voice or text'}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                style={[styles.headerBtn, { backgroundColor: isSpeechEnabled ? '#8B5CF620' : colors.backgroundSecondary }]}
                onPress={() => { setIsSpeechEnabled(!isSpeechEnabled); if (isSpeechEnabled) Speech.stop(); }}
              >
                {isSpeechEnabled
                  ? <Volume2 size={18} color="#8B5CF6" />
                  : <VolumeX size={18} color={colors.textSecondary} />}
              </Pressable>
              <Pressable
                style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
                onPress={handleClearChat}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Clear</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  msg.isResult && styles.resultBubble,
                  {
                    backgroundColor: msg.role === 'user'
                      ? '#8B5CF6'
                      : msg.isResult
                        ? colors.backgroundSecondary
                        : colors.surface,
                    borderColor: msg.role === 'user'
                      ? '#8B5CF6'
                      : msg.isResult
                        ? '#10B98140'
                        : colors.border,
                  },
                ]}
              >
                <View style={styles.messageHeader}>
                  <View style={[
                    styles.messageAvatar,
                    { backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : '#8B5CF620' },
                  ]}>
                    {msg.role === 'user'
                      ? <User size={14} color="#FFFFFF" />
                      : <Bot size={14} color="#8B5CF6" />}
                  </View>
                  <Text style={[
                    styles.messageRole,
                    { color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
                  ]}>
                    {msg.role === 'user' ? (user?.name || 'You') : 'Claude'}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    { color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : colors.textTertiary },
                  ]}>
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>

                {msg.image && (
                  <Image source={{ uri: msg.image }} style={styles.messageImage} />
                )}

                <Text style={[
                  styles.messageText,
                  { color: msg.role === 'user' ? '#FFFFFF' : colors.text },
                ]}>
                  {msg.text}
                </Text>

                {msg.role === 'assistant' && renderActionBadge(msg.toolName)}
              </View>
            ))}

            {isProcessing && (
              <View style={[
                styles.messageBubble,
                styles.assistantBubble,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={[styles.typingText, { color: colors.textSecondary }]}>Thinking...</Text>
                </View>
              </View>
            )}

            {isListening && (
              <View style={[
                styles.listeningBanner,
                { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' },
              ]}>
                <Mic size={16} color="#8B5CF6" />
                <Text style={[styles.listeningText, { color: '#8B5CF6' }]}>
                  {transcript || 'Listening...'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Pending Image Preview */}
          {pendingImage && (
            <View style={[
              styles.imagePreview,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
              <Image source={{ uri: pendingImage.uri }} style={styles.imagePreviewThumb} />
              <Text style={[styles.imagePreviewText, { color: colors.text }]}>
                Photo attached — type or speak your question
              </Text>
              <Pressable onPress={() => setPendingImage(null)}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Input Area */}
          <View style={[
            styles.inputArea,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}>
            <Pressable
              style={[styles.inputBtn, { backgroundColor: '#06B6D420' }]}
              onPress={handleCamera}
            >
              <Camera size={20} color="#06B6D4" />
            </Pressable>

            <Pressable
              style={[styles.micButton, { backgroundColor: isListening ? '#EF4444' : '#8B5CF6' }]}
              onPress={handleMicPress}
            >
              {isListening
                ? <MicOff size={22} color="#FFFFFF" />
                : <Mic size={22} color="#FFFFFF" />}
            </Pressable>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type or tap mic to speak..."
              placeholderTextColor={colors.textSecondary}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline={false}
            />

            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: (textInput.trim() || pendingImage) ? '#8B5CF6' : colors.border },
              ]}
              onPress={() => handleSend()}
              disabled={(!textInput.trim() && !pendingImage) || isProcessing}
            >
              <Send
                size={18}
                color={(textInput.trim() || pendingImage) ? '#FFFFFF' : colors.textTertiary}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Hidden file input for web image picking */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleWebFilePicked}
          />
        )}
      </Modal>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  floatingButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  modalContainer: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' as const },
  headerSub: { fontSize: 12 },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  closeBtn: { padding: 8 },
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 10 },
  messageBubble: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    maxWidth: '85%' as any,
  },
  userBubble: {
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: 4,
  },
  resultBubble: {
    borderLeftWidth: 3,
  },
  messageHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 6,
  },
  messageAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  messageRole: { fontSize: 11, fontWeight: '600' as const, flex: 1 },
  messageTime: { fontSize: 10 },
  messageText: { fontSize: 14, lineHeight: 21 },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 10,
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  typingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  typingText: { fontSize: 13, fontStyle: 'italic' as const },
  listeningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'stretch' as any,
  },
  listeningText: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  imagePreview: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  imagePreviewThumb: { width: 44, height: 44, borderRadius: 8 },
  imagePreviewText: { fontSize: 13, flex: 1 },
  inputArea: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    paddingBottom: 30,
  },
  inputBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
