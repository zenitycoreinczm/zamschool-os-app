// ============================================================
// ZamSchool OS Mobile - Sign In Page
// Source: C:\zamschool-os-mobile--main\src\screens\LoginScreen.js
// Copy everything below into your project
// ============================================================

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAuthRateLimitInfo,
  normalizeAuthError,
  resetPasswordForEmail,
  signInWithPassword,
} from '../services/authService';
import { colors, radii, spacing } from '../theme';

export function LoginScreen({ globalError, onClearError }) {
  const { width } = useWindowDimensions();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [errors, setErrors] = useState({});
  const [cooldownEmail, setCooldownEmail] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());

  const compact = width < 390;
  const normalizedEmail = email.trim().toLowerCase();
  const cooldownActive = cooldownEmail === normalizedEmail && cooldownUntil > cooldownNow;
  const cooldownRemainingSeconds = cooldownActive
    ? Math.ceil((cooldownUntil - cooldownNow) / 1000)
    : 0;

  useEffect(() => {
    if (!cooldownUntil) {
      return undefined;
    }

    setCooldownNow(Date.now());
    const timer = setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (cooldownUntil && cooldownUntil <= cooldownNow) {
      setCooldownUntil(0);
      setCooldownEmail('');
    }
  }, [cooldownNow, cooldownUntil]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!email.includes('@')) errs.email = 'Enter a valid email';

    if (!password) errs.password = 'Password is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearErrorKeys = (...keys) => {
    setErrors((current) => {
      let next = current;
      keys.forEach((key) => {
        if (next[key] !== undefined) {
          if (next === current) next = { ...current };
          delete next[key];
        }
      });
      return next;
    });
  };

  const handleLogin = async () => {
    if (!validate()) return;
    if (cooldownActive) {
      setErrors((current) => ({
        ...current,
        form: `Too many login attempts. Try again in ${cooldownRemainingSeconds} seconds.`,
      }));
      return;
    }
    setIsLoading(true);
    setSuccessText('');
    try {
      await signInWithPassword(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const rateLimit = getAuthRateLimitInfo(err);
      if (rateLimit.isRateLimited) {
        const now = Date.now();
        setCooldownEmail(email.trim().toLowerCase());
        setCooldownUntil(now + rateLimit.retryAfterSeconds * 1000);
        setCooldownNow(now);
      }
      setErrors((current) => ({ ...current, form: normalizeAuthError(err) }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrors((current) => ({ ...current, email: 'Enter email first for reset.' }));
      return;
    }

    try {
      await resetPasswordForEmail(email.trim());
      setSuccessText('Password reset email sent.');
    } catch (err) {
      setErrors((current) => ({ ...current, form: normalizeAuthError(err) }));
    }
  };

  const styles = useMemo(() => createStyles(compact), [compact]);
  const authMessage = cooldownActive
    ? `Too many login attempts. Try again in ${cooldownRemainingSeconds} seconds.`
    : errors.form || globalError;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#09111F', '#14233F', '#2A4B7E']}
            style={styles.hero}
          >
            <View pointerEvents="none" style={styles.dotGrid} />
            <View pointerEvents="none" style={styles.orbSky} />
            <View pointerEvents="none" style={styles.orbSoft} />

            <View style={styles.heroTopRow}>
              <View style={styles.logoWrap}>
                <View style={styles.logoInner}>
                  <Image
                    source={require('../../assets/zam-school-os-icon-512.png')}
                    style={styles.logoImage}
                  />
                </View>
              </View>

              <View style={styles.heroBadge}>
                <Feather name="shield" size={14} color="rgba(255,255,255,0.88)" />
                <Text style={styles.heroBadgeText}>Secure access</Text>
              </View>
            </View>

            <View style={styles.heroBody}>
              <Text style={styles.heroEyebrow}>ZAM School OS</Text>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSubtitle}>Sign in to your school workspace.</Text>
              <Text style={styles.heroSupport}>Use your school email and password to continue.</Text>
            </View>
          </LinearGradient>

          <View style={styles.loginPanel}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>Use your school email and password to continue.</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                <Feather name="mail" size={18} color={errors.email ? '#C83A3A' : '#8A97AA'} />
                <TextInput
                  style={styles.input}
                  placeholder="your@school.edu"
                  placeholderTextColor="#8A97AA"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearErrorKeys('email', 'form');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Password</Text>
                <Pressable onPress={handleForgotPassword} hitSlop={8}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
                <Feather name="lock" size={18} color={errors.password ? '#C83A3A' : '#8A97AA'} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#8A97AA"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearErrorKeys('password', 'form');
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={8}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8A97AA" />
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {authMessage ? <Text style={styles.errorText}>{authMessage}</Text> : null}
            {successText ? <Text style={styles.successText}>{successText}</Text> : null}

            <Text style={styles.infoText}>
              Your account is created and linked to your role by the school administrator.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.loginButton, pressed || isLoading ? styles.loginButtonPressed : null]}
              onPress={() => {
                onClearError?.();
                handleLogin();
              }}
              disabled={isLoading || cooldownActive}
            >
              <LinearGradient colors={['#133262', '#2458A3']} style={styles.buttonGradient}>
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>Signing in</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(compact) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#FBF7F1',
    },
    root: {
      flex: 1,
      backgroundColor: '#FBF7F1',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 38,
      gap: 20,
    },
    hero: {
      borderRadius: 34,
      overflow: 'hidden',
      paddingTop: compact ? 14 : 20,
      paddingBottom: compact ? 14 : 20,
      paddingHorizontal: compact ? 14 : 20,
      position: 'relative',
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.16,
          shadowRadius: 32,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    dotGrid: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.08,
      backgroundColor: 'transparent',
    },
    orbSky: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 200,
      backgroundColor: 'rgba(14,165,233,0.18)',
      top: -72,
      right: -56,
    },
    orbSoft: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 200,
      backgroundColor: 'rgba(255,255,255,0.10)',
      bottom: -84,
      left: -42,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    logoWrap: {
      width: compact ? 78 : 88,
      height: compact ? 78 : 88,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoInner: {
      width: compact ? 56 : 62,
      height: compact ? 56 : 62,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: compact ? 40 : 46,
      height: compact ? 40 : 46,
      borderRadius: 12,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.88)',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    heroBody: {
      marginTop: compact ? 14 : 20,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.70)',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    heroTitle: {
      marginTop: 10,
      fontSize: compact ? 30 : 34,
      lineHeight: compact ? 34 : 38,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.8,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.90)',
    },
    heroSupport: {
      marginTop: 6,
      maxWidth: 260,
      fontSize: 12,
      lineHeight: 18,
      color: 'rgba(255,255,255,0.74)',
      fontWeight: '600',
    },
    loginPanel: {
      gap: 14,
    },
    formHeader: {
      gap: 6,
    },
    formTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#09111C',
      letterSpacing: -0.5,
    },
    formSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: '#33445E',
      fontWeight: '600',
    },
    fieldGroup: {
      gap: 6,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: '#344256',
    },
    forgotText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1B3A6B',
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E5D8C5',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    inputError: {
      borderColor: '#C83A3A',
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: '#09111C',
      padding: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      ...(Platform.OS === 'web'
        ? {
            outlineStyle: 'none',
            outlineWidth: 0,
            outlineColor: 'transparent',
            appearance: 'none',
          }
        : null),
    },
    hintText: {
      fontSize: 11,
      color: '#94A3B8',
    },
    errorText: {
      fontSize: 12,
      color: '#C83A3A',
      fontWeight: '600',
      lineHeight: 18,
    },
    successText: {
      fontSize: 12,
      color: '#115740',
      fontWeight: '600',
      lineHeight: 18,
    },
    infoText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#66768D',
      marginTop: 4,
    },
    loginButton: {
      borderRadius: 20,
      overflow: 'hidden',
      marginTop: 6,
      shadowColor: '#1B3A6B',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 4,
    },
    loginButtonPressed: {
      opacity: 0.9,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 56,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
  });
}


// ============================================================
// AUTH SERVICE FUNCTIONS (src/services/authService.js)
// The LoginScreen calls these 4 functions. Implement them or
// replace with your own auth layer.
// ============================================================

// signInWithPassword(email, password)
//   -> calls Supabase client.auth.signInWithPassword()
//   -> returns { data.session }

// resetPasswordForEmail(email)
//   -> calls Supabase client.auth.resetPasswordForEmail()

// getAuthRateLimitInfo(error)
//   -> checks if error is a rate-limit response
//   -> returns { isRateLimited, retryAfterSeconds, message }

// normalizeAuthError(error)
//   -> maps Supabase errors to user-friendly strings
//   -> e.g. "Invalid login credentials" -> "Invalid email or password."


// ============================================================
// REQUIRED PACKAGES (install these)
// ============================================================

// npm install @expo/vector-icons
// npm install expo-haptics
// npm install expo-linear-gradient
// npm install react-native-safe-area-context


// ============================================================
// USAGE IN App.js
// ============================================================

// <LoginScreen globalError={error} onClearError={() => setError('')} />
//
// Props:
//   globalError  - auth-level error string from parent
//   onClearError - callback to clear the error state