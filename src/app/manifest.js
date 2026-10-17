export default function manifest() {
  return {
    name: 'AI Code Review - Automated GitHub PR Reviewer',
    short_name: 'AI Code Review',
    description: 'Automated AI-powered Pull Request code reviews directly on GitHub.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
