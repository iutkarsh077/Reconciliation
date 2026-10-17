export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
