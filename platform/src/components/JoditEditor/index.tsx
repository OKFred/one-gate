import { useRef, useMemo } from 'react';
import JoditEditor from 'jodit-react';

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
  placeholder = '请输入内容...',
  height = 400,
  readonly = false,
}: JoditEditorComponentProps) {
  const editor = useRef(null);

  const config = useMemo(
    () => ({
      readonly,
      placeholder,
      height,
      language: 'zh_cn',
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
    [readonly, placeholder, height],
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
