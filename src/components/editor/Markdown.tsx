import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '@/store'

// Render markdown, resolving inline ![alt](image-id) references to the actual
// stored image source. Unknown refs fall through untouched.
export function Markdown({ body }: { body: string }) {
  const images = useStore((s) => s.images)
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img({ src = '', alt }) {
            const resolved = images[src.trim()]?.src ?? src
            return <img src={resolved} alt={alt ?? ''} />
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {body || '*Nothing written yet.*'}
      </ReactMarkdown>
    </div>
  )
}
