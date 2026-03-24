import { useRef, useMemo } from 'react';
import { useTheme } from '@mui/material';
import JoditEditor from 'jodit-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserInfo } from '@/hooks/useUserInfo';

interface JoditEditorComponentProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number | string;
  readonly?: boolean;
}

export default function JoditEditorComponent({
  value,
  onChange,
  placeholder,
  height = 400,
  readonly = false,
}: JoditEditorComponentProps) {
  const editor = useRef(null);
  const theme = useTheme();
  const t = useTranslation();
  const { userInfo } = useUserInfo();
  const isDarkMode = theme.palette.mode === 'dark';

  const finalPlaceholder = useMemo(() => {
    return placeholder || t('form.pleaseEnter');
  }, [placeholder, t]);
  const config = useMemo(
    () => ({
      theme: isDarkMode ? 'dark' : 'light',
      readonly,
      placeholder: finalPlaceholder,
      height,
      language: userInfo?.langCode?.replace('-', '_')?.toLowerCase() || 'en_us',
      toolbarAdaptive: false,
      toolbarSticky: false,
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      buttons: [
        'source',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'ul',
        'ol',
        '|',
        'outdent',
        'indent',
        '|',
        'font',
        'fontsize',
        'brush',
        'paragraph',
        '|',
        'image',
        'table',
        'link',
        '|',
        'align',
        'undo',
        'redo',
        '|',
        'hr',
        'eraser',
        'copyformat',
        '|',
        'symbol',
        'fullsize',
        'preview',
      ],
      uploader: {
        insertImageAsBase64URI: true,
      },
      removeButtons: ['about'],
      disablePlugins: 'powered-by-jodit',
      style: {
        font: '14px Arial, sans-serif',
      },
    }),
    [isDarkMode, readonly, finalPlaceholder, height, userInfo?.langCode],
  );

  return (
    <div style={{ width: '100%' }}>
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={(newContent) => onChange(newContent)}
        onChange={() => {}} // 使用 onBlur 而不是 onChange 以提升性能
      />
    </div>
  );
}
