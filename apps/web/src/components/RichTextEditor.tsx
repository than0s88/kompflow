import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

function absoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/')) return API_BASE + url;
  return url;
}

async function uploadFile(
  file: File,
): Promise<{ url: string; name: string; size: number; mimeType: string }> {
  const fd = new FormData();
  fd.append('file', file, file.name);
  const { data } = await api.post('/uploads', fd);
  return {
    url: absoluteUrl(data.url),
    name: data.name,
    size: data.size,
    mimeType: data.mimeType,
  };
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Tiptap-based rich-text editor with the same surface as the Atlassian editor:
 * Headings/Text styles, Bold, Italic, More (Underline/Strike/Code/Quote), Lists,
 * Link, Image. Stores content as sanitized HTML.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a more detailed description…',
  autoFocus = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Keep editor synced if `value` changes externally (e.g. when switching cards)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return <div className="rte rte--loading" />;
  }

  return (
    <div className="rte">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rte__content" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="rte__toolbar" role="toolbar" aria-label="Editor">
      <BlockTypeMenu editor={editor} />
      <Sep />
      <BtnIcon
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 2.125C3 1.504 3.504 1 4.125 1H8.75C11.004 1 13 2.626 13 5.063a3.93 3.93 0 0 1-.855 2.492A3.92 3.92 0 0 1 14 10.938C14 13.374 12.004 15 9.75 15H4.125A1.125 1.125 0 0 1 3 13.875zm5.75 4.75c1.198 0 2-.798 2-1.812s-.802-1.813-2-1.813h-3.5v3.625zm-3.5 2.25h4.5c1.198 0 2 .798 2 1.813s-.802 1.812-2 1.812h-4.5z"
          />
        </svg>
      </BtnIcon>
      <BtnIcon
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6 1h6.5v1.5h-2.409l-2.64 11H10V15H3.5v-1.5h2.409l2.64-11H6z"
          />
        </svg>
      </BtnIcon>
      <MoreFormatMenu editor={editor} />
      <Sep />
      <ListsMenu editor={editor} />
      <Sep />
      <BtnIcon
        label="Link"
        active={editor.isActive('link')}
        onClick={() => {
          const prev = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('Enter URL', prev ?? 'https://');
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="m5.22 8.47 4.5-4.5 1.06 1.06-4.5 4.5a.664.664 0 0 0 .94.94l4.5-4.5a2.079 2.079 0 0 0-2.94-2.94l-4.5 4.5a3.492 3.492 0 0 0 4.94 4.94l2.5-2.5 1.06 1.06-2.5 2.5a4.993 4.993 0 0 1-7.06-7.06l4.5-4.5a3.578 3.578 0 0 1 5.06 5.06l-4.5 4.5a2.165 2.165 0 0 1-3.06-3.06"
          />
        </svg>
      </BtnIcon>
      <ImagePicker editor={editor} />
      <AttachmentPicker editor={editor} />
    </div>
  );
}

function BtnIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={'rte__btn' + (active ? ' is-active' : '')}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="rte__sep" aria-hidden />;
}

function BlockTypeMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = editor.isActive('heading', { level: 1 })
    ? 'Heading 1'
    : editor.isActive('heading', { level: 2 })
      ? 'Heading 2'
      : editor.isActive('heading', { level: 3 })
        ? 'Heading 3'
        : 'Normal text';

  const choose = (kind: 'p' | 'h1' | 'h2' | 'h3') => {
    if (kind === 'p') editor.chain().focus().setParagraph().run();
    else
      editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(kind.slice(1)) as 1 | 2 | 3 })
        .run();
    setOpen(false);
  };

  return (
    <div className="rte__menu" ref={ref}>
      <button
        type="button"
        className="rte__btn rte__btn--text"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current}
        <span className="rte__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="rte__dropdown" role="menu">
          <button type="button" onClick={() => choose('p')} role="menuitem">
            Normal text
          </button>
          <button type="button" onClick={() => choose('h1')} role="menuitem">
            <strong style={{ fontSize: 17 }}>Heading 1</strong>
          </button>
          <button type="button" onClick={() => choose('h2')} role="menuitem">
            <strong style={{ fontSize: 15 }}>Heading 2</strong>
          </button>
          <button type="button" onClick={() => choose('h3')} role="menuitem">
            <strong style={{ fontSize: 14 }}>Heading 3</strong>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MoreFormatMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="rte__menu" ref={ref}>
      <button
        type="button"
        className="rte__btn"
        aria-label="More formatting"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((s) => !s)}
        title="More formatting"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="2.5" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13.5" cy="8" r="1.4" />
        </svg>
      </button>
      {open ? (
        <div className="rte__dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('underline') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleUnderline().run();
              setOpen(false);
            }}
          >
            <u>Underline</u>
          </button>
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('strike') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleStrike().run();
              setOpen(false);
            }}
          >
            <s>Strikethrough</s>
          </button>
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('code') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleCode().run();
              setOpen(false);
            }}
          >
            <code>Code</code>
          </button>
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleBlockquote().run();
              setOpen(false);
            }}
          >
            ❝ Blockquote
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              editor.chain().focus().setHorizontalRule().run();
              setOpen(false);
            }}
          >
            ─ Divider
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ListsMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="rte__menu" ref={ref}>
      <button
        type="button"
        className="rte__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Lists"
        title="Lists"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((s) => !s)}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="2" cy="4.25" r="1.4" />
          <circle cx="2" cy="11.75" r="1.4" />
          <rect x="6" y="3.5" width="10" height="1.5" />
          <rect x="6" y="11" width="10" height="1.5" />
        </svg>
        <span className="rte__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="rte__dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
              setOpen(false);
            }}
          >
            • Bulleted list
          </button>
          <button
            type="button"
            role="menuitem"
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            onClick={() => {
              editor.chain().focus().toggleOrderedList().run();
              setOpen(false);
            }}
          >
            1. Numbered list
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ImagePicker({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const result = await uploadFile(file);
      editor
        .chain()
        .focus()
        .setImage({ src: result.url, alt: result.name, title: result.name })
        .run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      window.alert(`Image upload failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="rte__btn"
        aria-label="Image"
        title={busy ? 'Uploading…' : 'Insert image'}
        disabled={busy}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.75 4a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5" />
          <path
            fillRule="evenodd"
            d="M13 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zM3 2.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h.644l6.274-7.723.053-.058a.75.75 0 0 1 1.06 0L13.5 8.19V3a.5.5 0 0 0-.5-.5zm2.575 11H13a.5.5 0 0 0 .5-.5v-2.69l-2.943-2.943z"
          />
        </svg>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </>
  );
}

function AttachmentPicker({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const result = await uploadFile(file);
      // Insert a download link at the cursor: name (size)
      const linkText = `📎 ${result.name} (${humanSize(result.size)})`;
      editor
        .chain()
        .focus()
        .insertContent(' ')
        .setLink({ href: result.url })
        .insertContent(linkText)
        .unsetLink()
        .insertContent(' ')
        .run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      window.alert(`Upload failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="rte__btn"
        aria-label="Attach file"
        title={busy ? 'Uploading…' : 'Attach file'}
        disabled={busy}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="m5.22 8.47 4.5-4.5 1.06 1.06-4.5 4.5a.664.664 0 0 0 .94.94l4.5-4.5a2.079 2.079 0 0 0-2.94-2.94l-4.5 4.5a3.492 3.492 0 0 0 4.94 4.94l2.5-2.5 1.06 1.06-2.5 2.5a4.993 4.993 0 0 1-7.06-7.06l4.5-4.5a3.578 3.578 0 0 1 5.06 5.06l-4.5 4.5a2.165 2.165 0 0 1-3.06-3.06" />
        </svg>
      </button>
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </>
  );
}
