import { useRef } from 'react';
import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import FroalaEditorComponent from 'react-froala-wysiwyg';

// 导入 Froala Editor 插件
import 'froala-editor/js/plugins.pkgd.min.js';

interface FroalaEditorConfig {
  [key: string]: unknown;
}

interface FroalaEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  config?: FroalaEditorConfig;
}

export default function FroalaEditor({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  height = 300,
  disabled = false,
  config = {}
}: FroalaEditorProps) {
  const editorRef = useRef<FroalaEditorComponent>(null);

  const defaultConfig = {
    placeholderText: placeholder,
    height: height,
    charCounterCount: true,
    toolbarButtons: {
      'moreText': {
        'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
      },
      'moreParagraph': {
        'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
      },
      'moreRich': {
        'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
      },
      'moreMisc': {
        'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
        'align': 'right',
        'buttonsVisible': 2
      }
    },
    quickInsertButtons: ['image', 'video', 'embedly', 'table', 'ul', 'ol', 'hr'],
    imageEditButtons: ['imageReplace', 'imageAlign', 'imageCaption', 'imageRemove', '|', 'imageLink', 'linkOpen', 'linkEdit', 'linkRemove', '-', 'imageDisplay', 'imageStyle', 'imageAlt', 'imageSize'],
    ...config
  };

  const handleModelChange = (model: string) => {
    if (onChange) {
      onChange(model);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <FroalaEditorComponent
        ref={editorRef}
        tag="textarea"
        config={{
          ...defaultConfig,
          disabled: disabled
        }}
        model={value}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
