import Head from "next/head";

const SITE_NAME = "OKOAHELA";
// Canonical site origin for absolute og:url / og:image values.
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ela-mu.vercel.app").replace(/\/+$/, "");

interface SeoProps {
  title: string;
  description: string;
  /** Path or absolute URL of the social preview image (default: branded OG image). */
  image?: string;
  /** Route used for og:url + canonical, e.g. "/login". */
  path?: string;
}

export default function Seo({
  title,
  description,
  image = "/og-image.png",
  path = "/",
}: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const imageUri = image.startsWith("http") ? image : `${BASE_URL}${image}`;
  const url = `${BASE_URL}${path}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUri} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE_NAME} — savings and loans`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUri} />
    </Head>
  );
}
