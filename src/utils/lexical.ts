import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { Payload } from 'payload'

import { convertLexicalToMarkdown, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

/**
 * Parses Lexical editor content into multiple formats (HTML, Markdown, Plain Text)
 * @param content - The serialized Lexical editor state
 * @param payloadConfig - The Payload CMS configuration
 * @returns Parsed content in HTML, Markdown, and Plain Text formats
 */
export async function parseLexicalContent(
  content: SerializedEditorState,
  payloadConfig: Payload['config'],
): Promise<{
  html: string
  markdown: string
  plainText: string
}> {
  const editorConfig = await editorConfigFactory.default({ config: payloadConfig })

  return {
    html: convertLexicalToHTML({ data: content }),
    markdown: convertLexicalToMarkdown({ data: content, editorConfig }),
    plainText: convertLexicalToPlaintext({ data: content }),
  }
}
