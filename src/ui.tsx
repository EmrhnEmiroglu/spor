import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { addDays, fmtDate, fmtNum, parseNum, todayStr } from './logic';

// ---------- Metin ----------

type TVariant = 'h1' | 'h2' | 'body' | 'small' | 'tiny' | 'label';

const tStyles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '700', color: C.text },
  h2: { fontSize: 17, fontWeight: '600', color: C.text },
  body: { fontSize: 15, color: C.text },
  small: { fontSize: 13, color: C.text2 },
  tiny: { fontSize: 12, color: C.muted },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
});

export function T({
  children,
  v = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  v?: TVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[tStyles[v], color ? { color } : null, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------- İkon ----------

const circ = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ICONS = {
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  'chevron-up': ['M18 15l-6-6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  edit: ['M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'],
  trend: ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  search: [circ(11, 11, 8), 'M21 21l-4.35-4.35'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  clock: [circ(12, 12, 10), 'M12 6v6l4 2'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', circ(12, 7, 4)],
  award: [circ(12, 8, 7), 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  dumbbell: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3 9v6', 'M21 9v6', 'M6.5 12h11'],
  play: ['M6 4l14 8-14 8V4z'],
  info: [circ(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'arrow-down': ['M12 5v14', 'M19 12l-7 7-7-7'],
  repeat: ['M17 1l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 23l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
  target: [circ(12, 12, 10), circ(12, 12, 6), circ(12, 12, 2)],
  disc: [circ(12, 12, 10), circ(12, 12, 3)],
  heart: [
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  ],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = C.text, width = 2 }: { name: IconName; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </Svg>
  );
}

// ---------- Düğmeler ----------

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';

const noSelect = Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'pointer' } as any) : null;

export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.accent : kind === 'secondary' ? C.surface2 : kind === 'danger' ? C.criticalDim : 'transparent';
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.critical : kind === 'ghost' ? C.accent : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 12,
          minHeight: small ? 36 : 48,
          paddingHorizontal: small ? 12 : 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: C.borderStrong,
        },
        noSelect,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({
  name,
  onPress,
  color = C.text2,
  size = 20,
  label,
  disabled,
  bg,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
  disabled?: boolean;
  bg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          opacity: disabled ? 0.3 : pressed ? 0.5 : 1,
        },
        noSelect,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base: ViewStyle = {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.75 : 1 }, noSelect, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          paddingHorizontal: 12,
          minHeight: 34,
          justifyContent: 'center',
          borderRadius: 17,
          backgroundColor: selected ? C.accent : C.surface2,
          borderWidth: 1,
          borderColor: selected ? C.accent : C.borderStrong,
        },
        noSelect,
      ]}
    >
      <Text style={{ color: selected ? C.onAccent : C.text2, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, color = C.text2, bg = C.surface2 }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: bg, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: on ? C.surface3 : 'transparent' },
              on ? { borderWidth: 1, borderColor: C.borderStrong } : null,
              noSelect,
            ]}
          >
            <Text style={{ color: on ? C.text : C.muted, fontSize: 14, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  const b = (dir: 1 | -1, name: IconName) => {
    const next = Math.round((value + dir * step) * 100) / 100;
    const off = next < min || next > max;
    return (
      <Pressable
        onPress={() => onChange(next)}
        disabled={off}
        hitSlop={4}
        style={[{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.3 : 1 }, noSelect]}
      >
        <Icon name={name} size={16} color={C.text2} />
      </Pressable>
    );
  };
  return (
    <View style={{ alignItems: 'center' }}>
      {label ? <T v="tiny" style={{ marginBottom: 4 }}>{label}</T> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.borderStrong }}>
        {b(-1, 'minus')}
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', minWidth: 26, textAlign: 'center' }}>{fmtNum(value)}</Text>
        {b(1, 'plus')}
      </View>
    </View>
  );
}

/** Aç/kapa anahtarı olan ayar satırı. */
export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, noSelect]}
    >
      <View style={{ flex: 1 }}>
        <T v="body">{label}</T>
        {hint ? <T v="tiny" style={{ marginTop: 2, lineHeight: 16 }}>{hint}</T> : null}
      </View>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: value ? C.accent : C.surface3,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff' }} />
      </View>
    </Pressable>
  );
}

/** Gün seçici: bugünden ileri gidilemez. */
export function DatePicker({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconBtn name="chevron-left" label="Önceki gün" onPress={() => onChange(addDays(date, -1))} />
      <T v="body" style={{ fontWeight: '600' }}>{date === todayStr() ? 'Bugün' : fmtDate(date, 'long')}</T>
      <IconBtn name="chevron-right" label="Sonraki gün" disabled={date >= todayStr()} onPress={() => onChange(addDays(date, 1))} />
    </View>
  );
}

// ---------- Girdi ----------

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export const inputStyle: TextStyle = {
  backgroundColor: C.surface2,
  borderWidth: 1,
  borderColor: C.borderStrong,
  borderRadius: 10,
  color: C.text,
  // iPhone 16 pikselden küçük girdilerde sayfayı yakınlaştırır.
  fontSize: 16,
  minHeight: 44,
  paddingHorizontal: 12,
};

export function Field({
  value,
  onChangeText,
  placeholder,
  style,
  multiline,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      multiline={multiline}
      autoFocus={autoFocus}
      autoCorrect={false}
      style={[inputStyle, multiline ? { minHeight: 96, paddingVertical: 10, textAlignVertical: 'top' } : null, webInput, style]}
    />
  );
}

/** Sayı girişi. Virgül ve noktayı ondalık olarak kabul eder. */
export function NumInput({
  value,
  onChange,
  placeholder,
  decimal = true,
  style,
  done,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  style?: StyleProp<TextStyle>;
  done?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value == null ? '' : fmtNum(value));
    }
  }, [value]);
  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const clean = decimal ? t.replace(/[^0-9.,]/g, '') : t.replace(/[^0-9]/g, '');
        setText(clean);
        const n = parseNum(clean);
        last.current = n;
        onChange(n);
      }}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      inputMode={decimal ? 'decimal' : 'numeric'}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      style={[
        inputStyle,
        { textAlign: 'center', paddingHorizontal: 4, fontWeight: '600', minWidth: 0 },
        done ? { backgroundColor: 'transparent', borderColor: 'transparent' } : null,
        webInput,
        style,
      ]}
    />
  );
}

// ---------- Ekran iskeleti ----------

export function Screen({
  title,
  onBack,
  right,
  children,
  scroll = true,
  footer,
  overlay,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  /** Sekme çubuğunun üstünde açılan tam ekran sayfa. */
  overlay?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: onBack ? 4 : 16, paddingRight: 8, gap: 4 }}>
        {onBack ? <IconBtn name="chevron-left" onPress={onBack} label="Geri" color={C.text} size={24} /> : null}
        <Text style={{ flex: 1, color: C.text, fontSize: onBack ? 18 : 26, fontWeight: '700' }} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32 + (overlay && !footer ? insets.bottom : 0), gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer ? (
        <View style={{ padding: 12, paddingBottom: 12 + (overlay ? insets.bottom : 0), borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, minHeight: 32 }}>
      <T v="label">{children}</T>
      {right}
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Icon name={icon} size={26} color={C.muted} />
      </View>
      <T v="h2" style={{ textAlign: 'center' }}>{title}</T>
      {text ? <T v="small" style={{ textAlign: 'center', lineHeight: 19 }}>{text}</T> : null}
      {children}
    </View>
  );
}

export function StatTile({ label, value, unit, sub, subColor }: { label: string; value: string; unit?: string; sub?: string; subColor?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, minWidth: 0 }}>
      <T v="tiny" numberOfLines={1}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '600' }} numberOfLines={1}>{value}</Text>
        {unit ? <T v="tiny">{unit}</T> : null}
      </View>
      {sub ? <T v="tiny" color={subColor ?? C.muted} style={{ marginTop: 2 }} numberOfLines={1}>{sub}</T> : null}
    </View>
  );
}

// ---------- Onay penceresi ve kısa bildirim ----------

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogCtx {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  toast: (msg: string) => void;
}

const DialogContext = createContext<DialogCtx | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (b: boolean) => void }) | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  const close = (b: boolean) => {
    dlg?.resolve(b);
    setDlg(null);
  };
  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 84, alignItems: 'center' }}>
          <View style={{ backgroundColor: C.surface3, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: C.borderStrong, maxWidth: 420 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{msg}</Text>
          </View>
        </View>
      ) : null}
      {dlg ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 28 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          <View style={{ backgroundColor: C.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.borderStrong, gap: 8, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <T v="h2">{dlg.title}</T>
            {dlg.message ? <T v="small" style={{ lineHeight: 19 }}>{dlg.message}</T> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Btn label={dlg.cancelLabel ?? 'Vazgeç'} kind="secondary" onPress={() => close(false)} style={{ flex: 1 }} />
              <Btn label={dlg.confirmLabel ?? 'Tamam'} kind={dlg.danger ? 'danger' : 'primary'} onPress={() => close(true)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogCtx {
  const c = useContext(DialogContext);
  if (!c) throw new Error('DialogProvider eksik');
  return c;
}

/** Belirli aralıkla yeniden çizim tetikler (süre sayacı için). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
