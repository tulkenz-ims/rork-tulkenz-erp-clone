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
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { useAIActions } from '@/hooks/useAIActions';

// ══════════════════════════════════ TYPES ══════════════════════════════════

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  params?: Record<string, unknown>;
  image?: string;
  timestamp: Date;
}

interface AIResponse {
  success: boolean;
  action: string;
  speech: string;
  params: Record<string, unknown>;
}

// ══════════════════════════════════ CONFIG ══════════════════════════════════

const AI_ASSIST_URL = '/api/ai-assist';

const ACTION_ICONS: Record<string, { icon: any; color: string }> = {
  create_task_feed_post: { icon: Zap, color: '#F97316' },
  start_pre_op: { icon: CheckCircle, color: '#10B981' },
  complete_checklist_item: { icon: CheckCircle, color: '#10B981' },
  create_work_order: { icon: Wrench, color: '#3B82F6' },
  lookup_part: { icon: Package, color: '#F59E0B' },
  lookup_equipment: { icon: Wrench, color: '#3B82F6' },
  diagnose_issue: { icon: AlertTriangle, color: '#EF4444' },
  start_production_run: { icon: Zap, color: '#8B5CF6' },
  change_room_status: { icon: Zap, color: '#06B6D4' },
  search: { icon: Search, color: '#8B5CF6' },
  info: { icon: MessageCircle, color: '#6366F1' },
  clarify: { icon: MessageCircle, color: '#F59E0B' },
};

// ══════════════════════════════════ SPEECH RECOGNITION ══════════════════════════════════

// Web Speech API wrapper (works on web, falls back to text input on mobile)
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[AIAssist] Speech recognition not supported in this browser');
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
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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

    // Mobile: no built-in speech recognition — use text input
    return false;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, setTranscript };
}

// ══════════════════════════════════ COMPONENT ══════════════════════════════════

export default function AIAssistButton() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { executeAction: executeAIAction } = useAIActions();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string; mediaType: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechRecognition();

  // Pulse animation for the floating button
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // When transcript changes from speech recognition, update text input
  useEffect(() => {
    if (transcript) {
      setTextInput(transcript);
    }
  }, [transcript]);

  // When speech recognition stops and we have a transcript, auto-send
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      handleSend(transcript.trim());
      setTranscript('');
    }
  }, [isListening]);

  // ── Speak response ──
  const speakResponse = useCallback((text: string) => {
    if (!isSpeechEnabled) return;
    try {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (err) {
      console.error('[AIAssist] Speech synthesis error:', err);
    }
  }, [isSpeechEnabled]);

  // ── Send command to AI ──
  const handleSend = useCallback(async (commandText?: string) => {
    const text = commandText || textInput.trim();
    if (!text && !pendingImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Add user message
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

    try {
      const body: Record<string, unknown> = {
        command: text,
        context: {
          screen: 'unknown',
          userName: user?.name || 'Operator',
          userRole: user?.role || 'operator',
          currentRoom: null,
        },
      };

      // Add image if pending
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

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.speech || 'Action executed.',
        action: data.action,
        params: data.params,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Speak the response
      speakResponse(data.speech);

     // Execute the action
      const actionResult = await executeAction(data.action, data.params);

      // If the action returned useful data, show it as a follow-up message
      if (actionResult && actionResult.success && actionResult.message && 
          !['info', 'clarify'].includes(data.action)) {
        const followUpMsg: ChatMessage = {
          id: `result-${Date.now()}`,
          role: 'assistant',
          text: actionResult.message,
          action: data.action,
          params: actionResult.data as Record<string, unknown>,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, followUpMsg]);

        // Speak the result if it's different from Claude's original speech
        if (actionResult.message !== data.speech) {
          speakResponse(actionResult.message);
        }
      } else if (actionResult && !actionResult.success) {
        const errorFollowUp: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: actionResult.message || 'Action failed.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorFollowUp]);
      }

    } catch (err: any) {
      console.error('[AIAssist] Error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: `Sorry, I had trouble processing that. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, pendingImage, user, speakResponse]);

  // ── Execute AI action ──
  const executeAction = useCallback(async (action: string, params: Record<string, unknown>) => {
    console.log('[AIAssist] Execute:', action, params);
    try {
      const result = await executeAIAction(action, params);
      if (!result.success) {
        console.warn('[AIAssist] Action failed:', result.message);
      } else {
        console.log('[AIAssist] Action succeeded:', result.message);
      }
      return result;
    } catch (err) {
      console.error('[AIAssist] Action error:', err);
    }
  }, [executeAIAction]);

  // ── Mic button handler ──
  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isListening) {
      stopListening();
    } else {
      const started = startListening();
      if (!started) {
        // Fallback: focus text input (mobile or unsupported browser)
        console.log('[AIAssist] Speech not available — use text input');
      }
    }
  }, [isListening, startListening, stopListening]);

  // ── Camera handler ──
  const handleCamera = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let base64Data = asset.base64 || '';

        // If base64 not returned, read the file
        if (!base64Data && asset.uri) {
          const fileData = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Data = fileData;
        }

        setPendingImage({
          uri: asset.uri,
          base64: base64Data,
          mediaType: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('[AIAssist] Camera error:', err);
    }
  }, []);

  // ── Open/Close ──
  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: 'Hey, I\'m your AI assistant. You can ask me anything about the facility — start a Pre-Op, look up a part, diagnose an issue, or just take a photo and I\'ll tell you what I see. How can I help?',
        timestamp: new Date(),
      }]);
    }
  }, [messages.length]);

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
  }, []);

  // ── Render action badge ──
  const renderActionBadge = (action?: string) => {
    if (!action) return null;
    const config = ACTION_ICONS[action] || { icon: MessageCircle, color: '#6366F1' };
    const IconComp = config.icon;
    return (
      <View style={[styles.actionBadge, { backgroundColor: config.color + '20', borderColor: config.color + '40' }]}>
        <IconComp size={12} color={config.color} />
        <Text style={[styles.actionBadgeText, { color: config.color }]}>
          {action.replace(/_/g, ' ')}
        </Text>
      </View>
    );
  };

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
                onPress={() => {
                  setIsSpeechEnabled(!isSpeechEnabled);
                  if (isSpeechEnabled) Speech.stop();
                }}
              >
                {isSpeechEnabled ? <Volume2 size={18} color="#8B5CF6" /> : <VolumeX size={18} color={colors.textSecondary} />}
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
                  {
                    backgroundColor: msg.role === 'user' ? '#8B5CF6' : colors.surface,
                    borderColor: msg.role === 'user' ? '#8B5CF6' : colors.border,
                  },
                ]}
              >
                <View style={styles.messageHeader}>
                  <View style={[
                    styles.messageAvatar,
                    { backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : '#8B5CF620' },
                  ]}>
                    {msg.role === 'user'
                      ? <User size={14} color={msg.role === 'user' ? '#FFFFFF' : '#8B5CF6'} />
                      : <Bot size={14} color="#8B5CF6" />}
                  </View>
                  <Text style={[styles.messageRole, { color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                    {msg.role === 'user' ? (user?.name || 'You') : 'Claude'}
                  </Text>
                  <Text style={[styles.messageTime, { color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : colors.textTertiary }]}>
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
                {msg.role === 'assistant' && renderActionBadge(msg.action)}
              </View>
            ))}

            {isProcessing && (
              <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={[styles.typingText, { color: colors.textSecondary }]}>Thinking...</Text>
                </View>
              </View>
            )}

            {isListening && (
              <View style={[styles.listeningBanner, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]}>
                <Mic size={16} color="#8B5CF6" />
                <Text style={[styles.listeningText, { color: '#8B5CF6' }]}>
                  {transcript || 'Listening...'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Pending Image Preview */}
          {pendingImage && (
            <View style={[styles.imagePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image source={{ uri: pendingImage.uri }} style={styles.imagePreviewThumb} />
              <Text style={[styles.imagePreviewText, { color: colors.text }]}>Photo attached — type or speak your question</Text>
              <Pressable onPress={() => setPendingImage(null)}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Input Area */}
          <View style={[styles.inputArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.inputBtn, { backgroundColor: '#06B6D420' }]}
              onPress={handleCamera}
            >
              <Camera size={20} color="#06B6D4" />
            </Pressable>

            <Pressable
              style={[
                styles.micButton,
                {
                  backgroundColor: isListening ? '#EF4444' : '#8B5CF6',
                },
              ]}
              onPress={handleMicPress}
            >
              {isListening ? <MicOff size={22} color="#FFFFFF" /> : <Mic size={22} color="#FFFFFF" />}
            </Pressable>

            <TextInput
              style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Type or tap mic to speak..."
              placeholderTextColor={colors.textSecondary}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline={false}
            />

            <Pressable
              style={[styles.sendBtn, { backgroundColor: textInput.trim() || pendingImage ? '#8B5CF6' : colors.border }]}
              onPress={() => handleSend()}
              disabled={(!textInput.trim() && !pendingImage) || isProcessing}
            >
              <Send size={18} color={textInput.trim() || pendingImage ? '#FFFFFF' : colors.textTertiary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ══════════════════════════════════ STYLES ══════════════════════════════════

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
  modalContainer: {
    flex: 1,
  },
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  headerSub: {
    fontSize: 12,
  },
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
  closeBtn: {
    padding: 8,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    gap: 10,
  },
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
  messageRole: {
    fontSize: 11,
    fontWeight: '600' as const,
    flex: 1,
  },
  messageTime: {
    fontSize: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
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
  typingText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  listeningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'stretch' as any,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  imagePreview: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  imagePreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  imagePreviewText: {
    fontSize: 13,
    flex: 1,
  },
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
