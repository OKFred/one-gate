import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, Typography, Link, Paper, Divider } from '@mui/material';

interface MarkdownProps {
  content: string;
}

const Markdown = ({ content }: MarkdownProps) => {
  return (
    <Box
      sx={{
        '& p': { mb: 1, lastChild: { mb: 0 } },
        '& ul, & ol': { mb: 1, pl: 2 },
        '& code': {
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
          bgcolor: 'action.hover',
          p: '2px 4px',
          borderRadius: 1,
          fontSize: '0.9em',
        },
        '& pre': { mb: 1 },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          mb: 1,
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          p: 1,
          textAlign: 'left',
        },
        '& th': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({
            inline,
            className,
            children,
            ...props
          }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => (
            <Typography variant="body1" sx={{ mb: 1 }}>
              {children}
            </Typography>
          ),
          h1: ({ children }) => (
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              {children}
            </Typography>
          ),
          a: ({ href, children }) => (
            <Link href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </Link>
          ),
          hr: () => <Divider sx={{ my: 2 }} />,
          blockquote: ({ children }) => (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                pl: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                my: 1,
              }}
            >
              {children}
            </Paper>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default Markdown;
