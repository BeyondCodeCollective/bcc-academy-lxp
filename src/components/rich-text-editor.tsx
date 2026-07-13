"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  TextB,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quotes,
  Minus,
  ArrowClockwise,
} from "@phosphor-icons/react/dist/ssr";

type Props = {
  content: string;
  onChange: (html: string) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  /** Min height in pixels. Default 200. */
  minHeight?: number;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-ink text-paper"
          : "text-ink-soft hover:bg-paper-tint hover:text-ink"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  content,
  onChange,
  onBlur,
  placeholder = "Write something…",
  minHeight = 200,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none text-ink leading-relaxed",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("URL:");
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-rule px-2 py-1.5 bg-paper-tint-soft">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <TextB size={16} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <TextItalic size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <TextUnderline size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-rule mx-1" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Heading 3"
        >
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>

        <div className="w-px h-5 bg-rule mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <ListBullets size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListNumbers size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-rule mx-1" />

        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quotes size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-rule mx-1" />

        <ToolbarButton
          active={editor.isActive("link")}
          onClick={addLink}
          title="Add link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Add image">
          <ImageIcon size={16} />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <ArrowClockwise size={16} className="scale-x-[-1]" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
